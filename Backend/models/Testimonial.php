<?php

require_once __DIR__ . '/../config/database.php';

class Testimonial
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** Approved testimonials for the public homepage. */
    public function approved(int $limit = 3): array
    {
        $stmt = $this->db->prepare(
            'SELECT t.id, t.body, t.created_at, u.name AS user_name
             FROM testimonials t
             JOIN users u ON u.id = t.user_id
             WHERE t.status = \'approved\'
             ORDER BY t.created_at DESC
             LIMIT :limit'
        );
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /** All testimonials for the admin moderation screen. */
    public function all(?string $status = null): array
    {
        $sql = 'SELECT t.id, t.body, t.status, t.rejection_reason, t.created_at, u.name AS user_name, u.email AS user_email
                FROM testimonials t
                JOIN users u ON u.id = t.user_id';
        $params = [];
        if ($status) {
            $sql .= ' WHERE t.status = :status';
            $params['status'] = $status;
        }
        $sql .= ' ORDER BY t.created_at DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function create(int $userId, string $body): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO testimonials (user_id, body) VALUES (:user_id, :body)'
        );
        $stmt->execute(['user_id' => $userId, 'body' => $body]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Sets status and clears any prior rejection_reason - used for every
     * transition except reject() below, which is the only one that ever
     * needs to set a reason. Archive/restore both go through here:
     * restoring an archived testimony puts it back to 'approved' (the
     * only status it could have been archived from).
     */
    public function updateStatus(int $id, string $status): void
    {
        $stmt = $this->db->prepare('UPDATE testimonials SET status = :status, rejection_reason = NULL WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);
    }

    /** Rejecting always carries a reason (spec: "rejection requires a stored reason"). */
    public function reject(int $id, string $reason): void
    {
        $stmt = $this->db->prepare("UPDATE testimonials SET status = 'rejected', rejection_reason = :reason WHERE id = :id");
        $stmt->execute(['reason' => $reason, 'id' => $id]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM testimonials WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }
}