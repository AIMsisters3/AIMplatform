<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Refund workflow (migration 016's `refunds` table) — deliberately
 * separate from payment_records: a refund is its own audited decision
 * (requested -> approved/rejected -> processed), not just a negative
 * payment row, per spec: "Do not mark a refund completed merely because
 * an admin changes an order status."
 */
class Refund
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function create(int $orderId, float $amount, ?string $reason, ?int $requestedBy): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO refunds (order_id, amount, reason, requested_by) VALUES (:order_id, :amount, :reason, :requested_by)'
        );
        $stmt->execute(['order_id' => $orderId, 'amount' => $amount, 'reason' => $reason, 'requested_by' => $requestedBy]);
        return (int) $this->db->lastInsertId();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM refunds WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function forOrder(int $orderId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM refunds WHERE order_id = :order_id ORDER BY created_at DESC');
        $stmt->execute(['order_id' => $orderId]);
        return $stmt->fetchAll();
    }

    public function all(?string $status = null, int $limit = 50, int $offset = 0): array
    {
        $where = $status ? 'WHERE r.status = :status' : '';
        $stmt = $this->db->prepare(
            "SELECT r.*, o.order_number, o.grand_total, u.name AS customer_name, u.email AS customer_email
             FROM refunds r
             JOIN orders o ON o.id = r.order_id
             LEFT JOIN users u ON u.id = o.user_id
             $where ORDER BY r.created_at DESC LIMIT :limit OFFSET :offset"
        );
        if ($status) {
            $stmt->bindValue('status', $status);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /** @return bool false if not in a decidable state (already decided) */
    public function decide(int $id, string $decision, int $adminId): bool
    {
        if (!in_array($decision, ['approved', 'rejected'], true)) {
            return false;
        }
        $stmt = $this->db->prepare(
            "UPDATE refunds SET status = :status WHERE id = :id AND status = 'requested'"
        );
        $stmt->execute(['status' => $decision, 'id' => $id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Marks a refund as actually processed — this is the ONLY method
     * that also updates the order's payment_state, and only once a human
     * confirms the money has genuinely been sent back (bank transfer
     * done, gateway refund API called, etc.) — never automatically.
     */
    public function markProcessed(int $id, int $adminId, string $method, ?string $notes): bool
    {
        $refund = $this->find($id);
        if (!$refund || $refund['status'] !== 'approved') {
            return false;
        }

        $this->db->beginTransaction();
        try {
            $this->db->prepare(
                "UPDATE refunds SET status = 'processed', processed_by = :admin_id, processed_at = NOW(), method = :method, notes = :notes WHERE id = :id"
            )->execute(['admin_id' => $adminId, 'method' => $method, 'notes' => $notes, 'id' => $id]);

            $order = $this->db->prepare('SELECT grand_total, amount_paid FROM orders WHERE id = :id FOR UPDATE');
            $order->execute(['id' => $refund['order_id']]);
            $orderRow = $order->fetch();

            $fullyRefunded = $orderRow && (float) $refund['amount'] >= (float) $orderRow['amount_paid'];
            $newState = $fullyRefunded ? 'refunded' : 'partially_refunded';

            $this->db->prepare('UPDATE orders SET payment_state = :state WHERE id = :id')
                ->execute(['state' => $newState, 'id' => $refund['order_id']]);

            $this->db->commit();
            return true;
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }
}
