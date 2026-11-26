<?php

require_once __DIR__ . '/../config/database.php';

/**
 * A customer asking to be notified when an out-of-stock product/variant
 * is back — spec Part A §6. Never auto-promises stock or auto-charges;
 * this only captures interest for the admin to act on (restock, then
 * mark 'customer_notified', or convert into a real order once available).
 */
class StockRequest
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO stock_requests
                (product_id, variant_id, requested_attributes, quantity, customer_name, customer_phone, user_id, notes)
             VALUES
                (:product_id, :variant_id, :requested_attributes, :quantity, :customer_name, :customer_phone, :user_id, :notes)'
        );
        $stmt->execute([
            'product_id' => $data['product_id'],
            'variant_id' => $data['variant_id'] ?? null,
            'requested_attributes' => isset($data['requested_attributes']) ? json_encode($data['requested_attributes']) : null,
            'quantity' => $data['quantity'] ?? 1,
            'customer_name' => $data['customer_name'],
            'customer_phone' => $data['customer_phone'],
            'user_id' => $data['user_id'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);
        return (int) $this->db->lastInsertId();
    }

    /** @param array $filters status */
    public function all(array $filters = [], int $limit = 50, int $offset = 0): array
    {
        $where = [];
        $params = [];
        if (!empty($filters['status'])) {
            $where[] = 'sr.status = :status';
            $params['status'] = $filters['status'];
        }
        $sql = "SELECT sr.*, p.name AS product_name, p.slug AS product_slug
                FROM stock_requests sr
                LEFT JOIN products p ON p.id = sr.product_id"
                . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
                . ' ORDER BY sr.created_at DESC LIMIT :limit OFFSET :offset';
        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return array_map(function ($row) {
            $row['requested_attributes'] = json_decode($row['requested_attributes'] ?? 'null', true) ?: null;
            return $row;
        }, $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM stock_requests WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        $row['requested_attributes'] = json_decode($row['requested_attributes'] ?? 'null', true) ?: null;
        return $row;
    }

    public function updateStatus(int $id, string $status): bool
    {
        if (!in_array($status, ['new', 'waiting_for_stock', 'customer_notified', 'converted', 'closed'], true)) {
            return false;
        }
        $stmt = $this->db->prepare('UPDATE stock_requests SET status = :status WHERE id = :id');
        return $stmt->execute(['status' => $status, 'id' => $id]);
    }

    public function countOpen(): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM stock_requests WHERE status NOT IN ('converted', 'closed')");
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }
}
