<?php

require_once __DIR__ . '/../config/database.php';

class Notification
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * @param string $audience 'user' (shown in the public site's bell) or
     *   'admin' (shown only in the admin panel's own bell) — same table,
     *   same per-recipient row, just which feed it surfaces in.
     * @param string|null $source Human-facing category label ('store',
     *   'contact', 'subscriptions', 'testimonies', 'content', ...) shown
     *   as a small tag next to the notification.
     */
    public function create(
        int $userId,
        string $title,
        ?string $message = null,
        string $type = 'general',
        ?string $linkUrl = null,
        string $audience = 'user',
        ?string $source = null
    ): int {
        $stmt = $this->db->prepare(
            'INSERT INTO notifications (user_id, title, message, type, link_url, audience, source)
             VALUES (:user_id, :title, :message, :type, :link_url, :audience, :source)'
        );
        $stmt->execute([
            'user_id' => $userId, 'title' => $title, 'message' => $message, 'type' => $type,
            'link_url' => $linkUrl, 'audience' => $audience, 'source' => $source,
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Fans a single notification out to every active account — used for
     * platform-wide content announcements (new devotion/Bible study/news/
     * kids item/series episode) where there's no per-user subscription
     * list to target, unlike the email newsletter which has its own opt-in
     * subscriber table. Suspended accounts are skipped since they can't
     * sign in to see it anyway. Always audience='user', source='content' -
     * this is general site content, never an admin operational alert.
     */
    public function broadcastToAllUsers(string $title, ?string $message, string $type, ?string $linkUrl = null): void
    {
        $userIds = $this->db->query("SELECT id FROM users WHERE status = 'active'")->fetchAll(PDO::FETCH_COLUMN);
        if (empty($userIds)) {
            return;
        }

        $stmt = $this->db->prepare(
            "INSERT INTO notifications (user_id, title, message, type, link_url, audience, source)
             VALUES (:user_id, :title, :message, :type, :link_url, 'user', 'content')"
        );
        foreach ($userIds as $userId) {
            $stmt->execute(['user_id' => $userId, 'title' => $title, 'message' => $message, 'type' => $type, 'link_url' => $linkUrl]);
        }
    }

    public function forUser(int $userId, int $limit = 20, int $offset = 0): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM notifications WHERE user_id = :user_id AND audience = 'user' ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue('user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function unreadCount(int $userId): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND audience = 'user' AND is_read = 0");
        $stmt->execute(['user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    /** Same shape as forUser(), but the admin-only operational feed (new order, contact message, subscriber, testimony, ...). */
    public function forAdmin(int $userId, int $limit = 20, int $offset = 0): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM notifications WHERE user_id = :user_id AND audience = 'admin' ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue('user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function unreadCountAdmin(int $userId): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND audience = 'admin' AND is_read = 0");
        $stmt->execute(['user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    /** Returns true only if the notification exists and belongs to $userId — callers must check this before treating the update as authorized. */
    public function markRead(int $id, int $userId): bool
    {
        $stmt = $this->db->prepare('UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :user_id');
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Scoped to one $audience ('user' or 'admin') so "mark all read" from
     * one bell never silently clears the other bell's unread count too -
     * the whole point of separating them (spec).
     */
    public function markAllRead(int $userId, string $audience = 'user'): void
    {
        $stmt = $this->db->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = :user_id AND audience = :audience AND is_read = 0');
        $stmt->execute(['user_id' => $userId, 'audience' => $audience]);
    }
}
