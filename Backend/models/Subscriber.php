<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Backs the `newsletter_subscribers` table (see
 * database/migrations/003_newsletter_subscribers.sql for why this table
 * had to be added — it didn't exist before, despite this model already
 * expecting it).
 */
class Subscriber
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM newsletter_subscribers WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findByToken(string $token): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM newsletter_subscribers WHERE token = :token LIMIT 1');
        $stmt->execute(['token' => $token]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(string $email, string $token, string $language = 'English'): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO newsletter_subscribers (email, token, status, language) VALUES (:email, :token, 'pending', :language)"
        );
        $stmt->execute(['email' => $email, 'token' => $token, 'language' => $language]);
        return (int) $this->db->lastInsertId();
    }

    public function updateToken(int $id, string $token): void
    {
        $stmt = $this->db->prepare(
            "UPDATE newsletter_subscribers SET token = :token, status = 'pending' WHERE id = :id"
        );
        $stmt->execute(['token' => $token, 'id' => $id]);
    }

    public function confirm(int $id): void
    {
        $stmt = $this->db->prepare(
            "UPDATE newsletter_subscribers SET status = 'subscribed', confirmed_at = NOW(), token = NULL WHERE id = :id"
        );
        $stmt->execute(['id' => $id]);
    }

    /** For a future admin subscriber list / export. */
    public function all(?string $status = null, int $limit = 50, int $offset = 0): array
    {
        $where = $status ? 'WHERE status = :status' : '';
        $stmt = $this->db->prepare(
            "SELECT id, email, status, language, subscribed_at, confirmed_at FROM newsletter_subscribers
             $where ORDER BY subscribed_at DESC LIMIT :limit OFFSET :offset"
        );
        if ($status) {
            $stmt->bindValue('status', $status);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function count(): int
    {
        return (int) $this->db->query("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'subscribed'")->fetchColumn();
    }
}
