<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Product.php';
require_once __DIR__ . '/Notification.php';

/**
 * Pay Later lifecycle (migration 016's pay_later_details table extends a
 * single `orders` row, same pattern as bible_studies extending content).
 *
 * State machine (order.status / pay_later_details columns):
 *   awaiting_approval  -> request just placed, stock NOT reserved yet
 *     -> approve()  -> awaiting_payment, stock reserved (reserved_quantity++)
 *     -> decline()  -> cancelled, nothing was ever reserved
 *   awaiting_payment (approved, unpaid)
 *     -> paid via payment verification (Stage 5) -> processing, stock
 *        actually consumed (stock_quantity--, reserved_quantity--)
 *     -> sweep() finds it past due_at -> expire(): cancelled, reservation
 *        released (reserved_quantity--)
 */
class PayLater
{
    private PDO $db;
    private Product $productModel;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->productModel = new Product();
    }

    /** Spec: "A customer may have only ONE active Pay Later order at a time." Active = awaiting_approval or awaiting_payment (approved, not yet paid/expired/cancelled). */
    public function hasActiveForUser(int $userId): bool
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM orders
             WHERE user_id = :user_id AND order_kind = 'pay_later'
               AND status IN ('awaiting_approval', 'awaiting_payment')
               AND payment_state NOT IN ('paid', 'cancelled', 'expired', 'refunded')
             LIMIT 1"
        );
        $stmt->execute(['user_id' => $userId]);
        return (bool) $stmt->fetchColumn();
    }

    public function detailsFor(int $orderId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM pay_later_details WHERE order_id = :order_id LIMIT 1');
        $stmt->execute(['order_id' => $orderId]);
        return $stmt->fetch() ?: null;
    }

    public function create(int $orderId, int $requestedDays): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO pay_later_details (order_id, requested_days, due_at) VALUES (:order_id, :days, :due_at)'
        );
        // due_at is a placeholder until approve() sets the real one (the
        // clock starts at approval, not at request — see approve()'s
        // docblock) — set far enough out that it can never accidentally
        // read as "already overdue" before an admin acts on it.
        $stmt->execute([
            'order_id' => $orderId,
            'days'     => $requestedDays,
            'due_at'   => date('Y-m-d H:i:s', strtotime('+30 days')),
        ]);
    }

    /**
     * Approves the request: re-checks stock transactionally (this is the
     * whole point of doing it here rather than trusting the state at
     * request time — stock may have sold out in the meantime), reserves
     * it if available, and starts the payment-period clock from NOW
     * (not from when the customer originally asked) since that's the
     * first moment the ministry has actually committed to holding stock.
     *
     * @throws PayLaterException if the order isn't in a state that can be
     *   approved, or if any item no longer has enough available stock —
     *   the caller (OrderController) should offer the on-order path when
     *   this specific reason is given.
     */
    public function approve(int $orderId, int $adminUserId): void
    {
        $this->db->beginTransaction();
        try {
            $order = $this->lockOrder($orderId);
            if (!$order || $order['order_kind'] !== 'pay_later' || $order['status'] !== 'awaiting_approval') {
                throw new PayLaterException('This request is not awaiting approval (it may already have been decided).');
            }

            $items = $this->lockOrderItems($orderId);
            foreach ($items as $item) {
                $productId = (int) $item['product_id'];
                $variantId = $item['variant_id'] ? (int) $item['variant_id'] : null;
                $table = $variantId ? 'product_variants' : 'products';
                $stmt = $this->db->prepare("SELECT stock_quantity, reserved_quantity FROM $table WHERE id = :id FOR UPDATE");
                $stmt->execute(['id' => $variantId ?? $productId]);
                $row = $stmt->fetch();
                $available = $row ? ((int) $row['stock_quantity'] - (int) $row['reserved_quantity']) : 0;

                if ($available < (int) $item['quantity']) {
                    throw new PayLaterException(
                        "\"{$item['product_name_snapshot']}\" no longer has enough stock to approve this Pay Later request.",
                        true
                    );
                }
            }

            // All good — reserve every line. quantity_change is 0 because
            // this moves reserved_quantity, not stock_quantity itself
            // (see recordStockMovement's docblock) — the log row still
            // exists so the reservation is auditable.
            foreach ($items as $item) {
                $productId = (int) $item['product_id'];
                $variantId = $item['variant_id'] ? (int) $item['variant_id'] : null;
                $this->productModel->adjustReservedQuantity($productId, $variantId, (int) $item['quantity']);
                $this->productModel->recordStockMovement(
                    $productId, $variantId, 0, 'pay_later_reserve', 'order', $orderId, $adminUserId,
                    "Reserved {$item['quantity']} for Pay Later order #{$orderId}."
                );
            }

            $details = $this->detailsFor($orderId);
            $dueAt = date('Y-m-d H:i:s', strtotime("+{$details['requested_days']} days"));

            $this->db->prepare(
                'UPDATE pay_later_details SET approved_at = NOW(), approved_by = :admin_id, due_at = :due_at WHERE order_id = :order_id'
            )->execute(['admin_id' => $adminUserId, 'due_at' => $dueAt, 'order_id' => $orderId]);

            $this->db->prepare("UPDATE orders SET status = 'awaiting_payment' WHERE id = :id")->execute(['id' => $orderId]);

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }

        if ($order['user_id']) {
            (new Notification())->create(
                (int) $order['user_id'],
                'Pay Later request approved',
                "Your Pay Later order {$order['order_number']} is approved. Payment is due by " . date('j F Y, H:i', strtotime($dueAt)) . '.',
                'pay_later',
                '/orders'
            );
        }
    }

    public function decline(int $orderId, int $adminUserId, ?string $reason): void
    {
        $order = $this->lockOrderNoTx($orderId);
        if (!$order || $order['order_kind'] !== 'pay_later' || $order['status'] !== 'awaiting_approval') {
            throw new PayLaterException('This request is not awaiting approval.');
        }

        $this->db->prepare(
            'UPDATE pay_later_details SET declined_at = NOW(), declined_by = :admin_id, decline_reason = :reason WHERE order_id = :order_id'
        )->execute(['admin_id' => $adminUserId, 'reason' => $reason, 'order_id' => $orderId]);

        $this->db->prepare(
            "UPDATE orders SET status = 'cancelled', payment_state = 'cancelled', cancelled_at = NOW(), cancellation_reason = :reason WHERE id = :id"
        )->execute(['reason' => $reason ?: 'Pay Later request declined.', 'id' => $orderId]);

        if ($order['user_id']) {
            (new Notification())->create(
                (int) $order['user_id'],
                'Pay Later request declined',
                "Your Pay Later request for order {$order['order_number']} was declined." . ($reason ? " Reason: $reason" : ''),
                'pay_later',
                '/orders'
            );
        }
    }

    /**
     * Reminders (due within 24h, not yet sent) + expiry (past due_at,
     * still unpaid — releases the stock hold and cancels the order).
     * Called from CronController, which has no live "current admin" to
     * attribute actions to — that's fine, these are system actions.
     *
     * @return array{reminders_sent:int, expired:int}
     */
    public function sweep(): array
    {
        $remindersSent = $this->sendDueReminders();
        $expired = $this->expireOverdue();
        return ['reminders_sent' => $remindersSent, 'expired' => $expired];
    }

    private function sendDueReminders(): int
    {
        $stmt = $this->db->prepare(
            "SELECT pld.*, o.order_number, o.user_id
             FROM pay_later_details pld
             JOIN orders o ON o.id = pld.order_id
             WHERE o.status = 'awaiting_payment' AND o.payment_state NOT IN ('paid', 'partially_paid')
               AND pld.reminder_sent_at IS NULL
               AND pld.due_at <= DATE_ADD(NOW(), INTERVAL 1 DAY)"
        );
        $stmt->execute();
        $due = $stmt->fetchAll();

        foreach ($due as $row) {
            $this->db->prepare('UPDATE pay_later_details SET reminder_sent_at = NOW() WHERE order_id = :id')->execute(['id' => $row['order_id']]);
            if ($row['user_id']) {
                (new Notification())->create(
                    (int) $row['user_id'],
                    'Pay Later payment due soon',
                    "Your Pay Later order {$row['order_number']} is due by " . date('j F Y, H:i', strtotime($row['due_at'])) . '. Please complete payment to avoid cancellation.',
                    'pay_later',
                    '/orders'
                );
            }
        }
        return count($due);
    }

    private function expireOverdue(): int
    {
        $stmt = $this->db->prepare(
            "SELECT pld.*, o.order_number, o.user_id
             FROM pay_later_details pld
             JOIN orders o ON o.id = pld.order_id
             WHERE o.status = 'awaiting_payment' AND o.payment_state NOT IN ('paid', 'partially_paid')
               AND pld.due_at < NOW()"
        );
        $stmt->execute();
        $overdue = $stmt->fetchAll();

        foreach ($overdue as $row) {
            $orderId = (int) $row['order_id'];
            $this->db->beginTransaction();
            try {
                $items = $this->lockOrderItems($orderId);
                foreach ($items as $item) {
                    $this->productModel->adjustReservedQuantity(
                        (int) $item['product_id'],
                        $item['variant_id'] ? (int) $item['variant_id'] : null,
                        -(int) $item['quantity']
                    );
                    $this->productModel->recordStockMovement(
                        (int) $item['product_id'],
                        $item['variant_id'] ? (int) $item['variant_id'] : null,
                        0, // reserved-only release — stock_quantity itself was never touched at approval time
                        'pay_later_release',
                        'order',
                        $orderId,
                        null,
                        "Pay Later order #{$orderId} expired unpaid — reservation released."
                    );
                }

                $this->db->prepare('UPDATE pay_later_details SET expired_at = NOW() WHERE order_id = :id')->execute(['id' => $orderId]);
                $this->db->prepare(
                    "UPDATE orders SET status = 'cancelled', payment_state = 'expired', cancelled_at = NOW(), cancellation_reason = 'Pay Later deadline passed unpaid.' WHERE id = :id"
                )->execute(['id' => $orderId]);

                $this->db->commit();
            } catch (Throwable $e) {
                if ($this->db->inTransaction()) {
                    $this->db->rollBack();
                }
                throw $e;
            }

            if ($row['user_id']) {
                (new Notification())->create(
                    (int) $row['user_id'],
                    'Pay Later order cancelled',
                    "Your Pay Later order {$row['order_number']} was cancelled because payment wasn't received by the deadline.",
                    'pay_later',
                    '/orders'
                );
            }
        }
        return count($overdue);
    }

    private function lockOrder(int $orderId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM orders WHERE id = :id FOR UPDATE');
        $stmt->execute(['id' => $orderId]);
        return $stmt->fetch() ?: null;
    }

    private function lockOrderNoTx(int $orderId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM orders WHERE id = :id');
        $stmt->execute(['id' => $orderId]);
        return $stmt->fetch() ?: null;
    }

    private function lockOrderItems(int $orderId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM order_items WHERE order_id = :order_id');
        $stmt->execute(['order_id' => $orderId]);
        return $stmt->fetchAll();
    }
}

class PayLaterException extends RuntimeException
{
    /** True when the failure reason is specifically "not enough stock" — lets the caller offer the on-order path. */
    public bool $stockUnavailable;

    public function __construct(string $message, bool $stockUnavailable = false)
    {
        parent::__construct($message);
        $this->stockUnavailable = $stockUnavailable;
    }
}
