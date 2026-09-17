<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../models/PayLater.php';
require_once __DIR__ . '/../models/Order.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../config/database.php';

/**
 * Runs time-based Shop tasks (Pay Later reminders/expiry, deposit-
 * deadline reminders) that would normally be driven by a server cron
 * job. This host has none (see README §7), so a scheduled GitHub
 * Actions workflow calls this endpoint instead, authenticated by a
 * shared secret (CRON_SECRET) rather than a user session — there is no
 * "logged-in admin" behind a cron trigger.
 */
class CronController
{
    /** POST /api/cron/run-due-tasks — header: X-Cron-Secret */
    public function runDueTasks(): void
    {
        if (empty(CRON_SECRET)) {
            json_error('Cron endpoint is not configured.', 403);
        }

        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $provided = $headers['X-Cron-Secret'] ?? $headers['x-cron-secret'] ?? $_SERVER['HTTP_X_CRON_SECRET'] ?? '';

        if (!hash_equals(CRON_SECRET, (string) $provided)) {
            json_error('Invalid cron secret.', 403);
        }

        $payLaterResult = (new PayLater())->sweep();
        $depositResult = $this->sweepDepositReminders();

        $this->logRun('pay_later_sweep', $payLaterResult['reminders_sent'] + $payLaterResult['expired'], $payLaterResult);
        $this->logRun('deposit_reminder_sweep', $depositResult['reminders_sent'], $depositResult);

        json_ok([
            'pay_later' => $payLaterResult,
            'deposits'  => $depositResult,
        ], 'Scheduled tasks completed.');
    }

    /**
     * Deposit deadlines get a reminder, not an automatic cancellation —
     * unlike Pay Later, the spec frames a missed on-order deposit as
     * something the admin follows up on directly with the customer
     * ("admin contacts the customer to agree on a resolution"), not a
     * clean auto-expiry, since a supplier commitment may already be
     * partway underway.
     */
    private function sweepDepositReminders(): array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT id, order_number, user_id, deposit_amount, deposit_deadline_at
             FROM orders
             WHERE order_kind = 'on_order' AND deposit_deadline_at IS NOT NULL
               AND deposit_paid_at IS NULL AND deposit_reminder_sent_at IS NULL
               AND payment_state NOT IN ('paid', 'cancelled', 'refunded')
               AND deposit_deadline_at <= DATE_ADD(NOW(), INTERVAL 1 DAY)"
        );
        $stmt->execute();
        $due = $stmt->fetchAll();

        require_once __DIR__ . '/../models/Notification.php';
        foreach ($due as $row) {
            $db->prepare('UPDATE orders SET deposit_reminder_sent_at = NOW() WHERE id = :id')->execute(['id' => $row['id']]);
            if ($row['user_id']) {
                (new Notification())->create(
                    (int) $row['user_id'], 'Deposit due soon',
                    "Order {$row['order_number']}: your deposit of N$" . number_format((float) $row['deposit_amount'], 2)
                        . ' is due by ' . date('j F Y, H:i', strtotime($row['deposit_deadline_at'])) . '.',
                    'order', '/orders'
                );
            }
        }
        return ['reminders_sent' => count($due)];
    }

    private function logRun(string $task, int $itemsProcessed, array $details): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare('INSERT INTO scheduled_task_runs (task, items_processed, details) VALUES (:task, :count, :details)');
        $stmt->execute(['task' => $task, 'count' => $itemsProcessed, 'details' => json_encode($details)]);
    }
}
