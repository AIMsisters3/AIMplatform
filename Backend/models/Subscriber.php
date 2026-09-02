<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Backs the `newsletter_subscribers` table (migration 003, extended by
 * 009 with `unsubscribed_at`). Subscribing is single-step and free — no
 * account required, no email confirmation loop: a new row is created
 * (or a previously-unsubscribed one reactivated) with status
 * 'subscribed' immediately. `token` is a standing, unguessable value
 * used only to build that subscriber's unsubscribe link — it is never
 * exposed anywhere except that one URL.
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

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM newsletter_subscribers WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** New subscriber, subscribed immediately (free, single-step - no confirmation email loop). */
    public function create(string $email, string $token, string $language = 'English'): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO newsletter_subscribers (email, token, status, language, confirmed_at)
             VALUES (:email, :token, 'subscribed', :language, NOW())"
        );
        $stmt->execute(['email' => $email, 'token' => $token, 'language' => $language]);
        return (int) $this->db->lastInsertId();
    }

    /** A previously-unsubscribed (or legacy 'pending') row subscribing again. */
    public function reactivate(int $id, string $token): void
    {
        $stmt = $this->db->prepare(
            "UPDATE newsletter_subscribers
             SET status = 'subscribed', token = :token, confirmed_at = NOW(), unsubscribed_at = NULL
             WHERE id = :id"
        );
        $stmt->execute(['token' => $token, 'id' => $id]);
    }

    public function unsubscribe(int $id): void
    {
        $stmt = $this->db->prepare(
            "UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = NOW() WHERE id = :id"
        );
        $stmt->execute(['id' => $id]);
    }

    /** Admin subscriber list: optional status filter + email search. */
    public function all(?string $status = null, ?string $search = null, int $limit = 50, int $offset = 0): array
    {
        $where = [];
        $params = [];
        if ($status) {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }
        if ($search) {
            $where[] = 'email LIKE :search';
            $params['search'] = '%' . $search . '%';
        }
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $stmt = $this->db->prepare(
            "SELECT id, email, status, language, subscribed_at, confirmed_at, unsubscribed_at
             FROM newsletter_subscribers
             $whereSql ORDER BY subscribed_at DESC LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
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

    /** Every active subscriber + the token needed to build their unsubscribe link — used only when emailing a new-content notification. */
    public function allSubscribedForNotification(): array
    {
        $stmt = $this->db->query("SELECT email, token FROM newsletter_subscribers WHERE status = 'subscribed'");
        return $stmt->fetchAll();
    }
}
