<?php

require_once __DIR__ . '/../config/database.php';

class ReviewException extends RuntimeException
{
}

/**
 * Product reviews — gated to "verified purchasers" only (migration 017).
 * A verified purchase is an order_item the reviewing user actually owns,
 * on an order whose payment_state is 'paid' (a deposit or partial payment
 * doesn't yet count — the spec's "verified purchaser" implies the
 * purchase is complete, not just started).
 */
class Review
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * Finds an order_item the user can review this product against, or
     * null if they have no qualifying (paid) purchase of it.
     */
    public function findEligibleOrderItem(int $userId, int $productId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT oi.id AS order_item_id, oi.order_id
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE o.user_id = :user_id AND oi.product_id = :product_id AND o.payment_state = 'paid'
             ORDER BY o.created_at DESC LIMIT 1"
        );
        $stmt->execute(['user_id' => $userId, 'product_id' => $productId]);
        return $stmt->fetch() ?: null;
    }

    public function findByProductAndUser(int $productId, int $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM product_reviews WHERE product_id = :p AND user_id = :u LIMIT 1');
        $stmt->execute(['p' => $productId, 'u' => $userId]);
        return $stmt->fetch() ?: null;
    }

    /**
     * @throws ReviewException if the user has no qualifying purchase, or
     *         has already reviewed this product.
     */
    public function create(int $productId, int $userId, int $rating, ?string $reviewText): int
    {
        if ($rating < 1 || $rating > 5) {
            throw new ReviewException('Rating must be between 1 and 5.');
        }
        if ($this->findByProductAndUser($productId, $userId)) {
            throw new ReviewException('You have already reviewed this product.');
        }
        $eligible = $this->findEligibleOrderItem($userId, $productId);
        if (!$eligible) {
            throw new ReviewException('Only customers who have completed a paid purchase of this product can review it.');
        }

        $stmt = $this->db->prepare(
            'INSERT INTO product_reviews (product_id, user_id, order_item_id, rating, review, status)
             VALUES (:product_id, :user_id, :order_item_id, :rating, :review, \'pending\')'
        );
        $stmt->execute([
            'product_id'    => $productId,
            'user_id'       => $userId,
            'order_item_id' => $eligible['order_item_id'],
            'rating'        => $rating,
            'review'        => $reviewText,
        ]);
        return (int) $this->db->lastInsertId();
    }

    /** Approved reviews for a product's public page. */
    public function forProduct(int $productId, int $limit = 20, int $offset = 0): array
    {
        $stmt = $this->db->prepare(
            "SELECT r.*, u.name AS user_name
             FROM product_reviews r JOIN users u ON u.id = r.user_id
             WHERE r.product_id = :product_id AND r.status = 'approved'
             ORDER BY r.created_at DESC LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue('product_id', $productId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function summaryForProduct(int $productId): array
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) AS count, COALESCE(AVG(rating), 0) AS average
             FROM product_reviews WHERE product_id = :product_id AND status = 'approved'"
        );
        $stmt->execute(['product_id' => $productId]);
        $row = $stmt->fetch();
        return ['count' => (int) $row['count'], 'average' => round((float) $row['average'], 2)];
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM product_reviews WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    /** Moderation queue. */
    public function forModeration(string $status = 'pending', int $limit = 50, int $offset = 0): array
    {
        $stmt = $this->db->prepare(
            'SELECT r.*, u.name AS user_name, p.name AS product_name, p.slug AS product_slug
             FROM product_reviews r
             JOIN users u ON u.id = r.user_id
             JOIN products p ON p.id = r.product_id
             WHERE r.status = :status
             ORDER BY r.created_at DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('status', $status);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function updateStatus(int $id, string $status): bool
    {
        if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
            return false;
        }
        $stmt = $this->db->prepare('UPDATE product_reviews SET status = :status WHERE id = :id');
        return $stmt->execute(['status' => $status, 'id' => $id]);
    }

    public function respond(int $id, int $adminId, string $response): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE product_reviews SET admin_response = :response, admin_response_at = NOW(), admin_response_by = :admin_id WHERE id = :id'
        );
        return $stmt->execute(['response' => $response, 'admin_id' => $adminId, 'id' => $id]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM product_reviews WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }
}
