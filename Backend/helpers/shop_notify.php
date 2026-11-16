<?php
/**
 * AIMsisters - Shop order notifications (in-app bell + email together).
 *
 * The in-app `notifications` table (Notification::create()) and the
 * email system (send_email()) are two separate, previously-unconnected
 * mechanisms in this codebase. Every Shop order event needs both — spec:
 * "Reuse the existing notification/email infrastructure" — so this is
 * the one place that fires both consistently instead of every call site
 * in Order.php/PayLater.php/CronController.php remembering to do so
 * separately (and risking one firing without the other, or firing
 * twice). "Avoid sending duplicate notifications" is enforced by the
 * SAME dedup guards already in place at each call site (e.g.
 * pay_later_details.reminder_sent_at) — this helper only ever fires once
 * per call, same as Notification::create() always has.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/../emails/order_notification_template.php';

/**
 * @param int $userId
 * @param string $title Short in-app notification title / email heading.
 * @param string $message Longer body — shown in-app and in the email.
 * @param string $type Notification::create()'s `type` column (drives the bell icon on the frontend).
 * @param string $eyebrow Small all-caps email label (e.g. "Pay Later", "Payment Received").
 * @param string $linkPath Relative frontend path (e.g. "/orders") — becomes both the in-app link_url and the email's CTA button target.
 * @param string $buttonLabel Email CTA button text.
 */
function notify_shop_event(
    int $userId,
    string $title,
    string $message,
    string $type,
    string $eyebrow,
    string $linkPath = '/orders',
    string $buttonLabel = 'View Order'
): void {
    try {
        (new Notification())->create($userId, $title, $message, $type, $linkPath, 'user', 'store');
    } catch (Throwable $e) {
        error_log("Shop in-app notification failed for user {$userId}: " . $e->getMessage());
    }

    try {
        $stmt = Database::getConnection()->prepare('SELECT email, name FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();
        if (!$user || !$user['email']) {
            return;
        }

        $url = rtrim(FRONTEND_URL, '/') . $linkPath;
        $html = order_notification_email_html($eyebrow, $title, $message, $buttonLabel, $url);
        send_email($user['email'], $title, $html);
    } catch (Throwable $e) {
        error_log("Shop email notification failed for user {$userId}: " . $e->getMessage());
    }
}

/**
 * In-app-only alert to every Shop admin (superadmin, or anyone whose role
 * grants orders.manage) — e.g. "new order placed" / "payment awaiting
 * verification". Deliberately no email: this is an operational queue
 * admins already check (Manage Orders / Payment Verification), not a
 * customer-facing transactional event, so a bell notification per admin
 * is enough without risking an email flood on a busy day.
 */
function notify_shop_admins_event(string $title, string $message, string $type, string $linkPath): void
{
    try {
        $stmt = Database::getConnection()->prepare(
            "SELECT DISTINCT u.id
             FROM users u
             LEFT JOIN role_permissions rp ON rp.role_id = u.role_id
             LEFT JOIN permissions p ON p.id = rp.permission_id AND p.slug = 'orders.manage'
             WHERE u.role = 'superadmin' OR p.id IS NOT NULL"
        );
        $stmt->execute();
        $adminIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $notification = new Notification();
        foreach ($adminIds as $adminId) {
            $notification->create((int) $adminId, $title, $message, $type, $linkPath, 'admin', 'store');
        }
    } catch (Throwable $e) {
        error_log('Shop admin alert failed: ' . $e->getMessage());
    }
}
