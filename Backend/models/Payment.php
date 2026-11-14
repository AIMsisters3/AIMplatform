<?php

require_once __DIR__ . '/../config/database.php';

/**
 * The audited payment ledger (migration 016). Every manual bank/mobile-
 * wallet proof submission and (Stage 5+) gateway callback goes through
 * one payment_records row — nothing here ever marks an order "paid" by
 * itself; that only happens via Order::applyVerifiedPayment(), called
 * from PaymentController after an admin verifies (or a gateway
 * signature is independently confirmed).
 */
class Payment
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO payment_records (order_id, method, amount, currency, reference, proof_file_path, status, submitted_by, idempotency_key, gateway_payload)
             VALUES (:order_id, :method, :amount, :currency, :reference, :proof_file_path, :status, :submitted_by, :idempotency_key, :gateway_payload)'
        );
        $stmt->execute([
            'order_id'         => $data['order_id'],
            'method'           => $data['method'],
            'amount'           => $data['amount'],
            'currency'         => $data['currency'] ?? 'NAD',
            'reference'        => $data['reference'] ?? null,
            'proof_file_path'  => $data['proof_file_path'] ?? null,
            'status'           => $data['status'] ?? 'awaiting_verification',
            'submitted_by'     => $data['submitted_by'] ?? null,
            'idempotency_key'  => $data['idempotency_key'] ?? null,
            'gateway_payload'  => isset($data['gateway_payload']) ? json_encode($data['gateway_payload']) : null,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM payment_records WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findByIdempotencyKey(string $key): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM payment_records WHERE idempotency_key = :key LIMIT 1');
        $stmt->execute(['key' => $key]);
        return $stmt->fetch() ?: null;
    }

    public function forOrder(int $orderId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM payment_records WHERE order_id = :order_id ORDER BY submitted_at DESC');
        $stmt->execute(['order_id' => $orderId]);
        return $stmt->fetchAll();
    }

    /** The admin verification queue — everything still awaiting a human decision, oldest first so nothing sits forgotten. */
    public function queue(int $limit = 50, int $offset = 0): array
    {
        $stmt = $this->db->prepare(
            "SELECT pr.*, o.order_number, o.grand_total, o.amount_paid, u.name AS customer_name, u.email AS customer_email
             FROM payment_records pr
             JOIN orders o ON o.id = pr.order_id
             LEFT JOIN users u ON u.id = pr.submitted_by
             WHERE pr.status = 'awaiting_verification'
             ORDER BY pr.submitted_at ASC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /** @return bool false if the record wasn't in a verifiable state (already decided) — caller should treat as a no-op, not an error, for idempotency. */
    public function markVerified(int $id, int $verifiedBy): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE payment_records SET status = 'verified', verified_by = :verified_by, verified_at = NOW()
             WHERE id = :id AND status = 'awaiting_verification'"
        );
        $stmt->execute(['verified_by' => $verifiedBy, 'id' => $id]);
        return $stmt->rowCount() > 0;
    }

    public function markRejected(int $id, int $verifiedBy, string $reason): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE payment_records SET status = 'rejected', verified_by = :verified_by, verified_at = NOW(), rejection_reason = :reason
             WHERE id = :id AND status = 'awaiting_verification'"
        );
        $stmt->execute(['verified_by' => $verifiedBy, 'reason' => $reason, 'id' => $id]);
        return $stmt->rowCount() > 0;
    }
}
