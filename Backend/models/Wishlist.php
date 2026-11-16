<?php

require_once __DIR__ . '/../config/database.php';

/** Backs the `wishlists` table (schema.sql) — existed with zero backend code until now. */
class Wishlist
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function forUser(int $userId): array
    {
        $stmt = $this->db->prepare(
            "SELECT p.*, w.created_at AS wishlisted_at
             FROM wishlists w
             JOIN products p ON p.id = w.product_id
             WHERE w.user_id = :user_id AND p.deleted_at IS NULL
             ORDER BY w.created_at DESC"
        );
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll();
    }

    public function contains(int $userId, int $productId): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM wishlists WHERE user_id = :user_id AND product_id = :product_id LIMIT 1');
        $stmt->execute(['user_id' => $userId, 'product_id' => $productId]);
        return (bool) $stmt->fetchColumn();
    }

    /** Returns the new state (true = now wishlisted, false = now removed). */
    public function toggle(int $userId, int $productId): bool
    {
        if ($this->contains($userId, $productId)) {
            $stmt = $this->db->prepare('DELETE FROM wishlists WHERE user_id = :user_id AND product_id = :product_id');
            $stmt->execute(['user_id' => $userId, 'product_id' => $productId]);
            return false;
        }

        $stmt = $this->db->prepare('INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (:user_id, :product_id)');
        $stmt->execute(['user_id' => $userId, 'product_id' => $productId]);
        return true;
    }

    /** Product ids from $productIds that $userId has wishlisted — used to mark a whole product grid at once without N queries. */
    public function wishlistedIdsAmong(int $userId, array $productIds): array
    {
        if (empty($productIds)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        $stmt = $this->db->prepare("SELECT product_id FROM wishlists WHERE user_id = ? AND product_id IN ($placeholders)");
        $stmt->execute([$userId, ...$productIds]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }
}
