<?php

require_once __DIR__ . '/../config/database.php';

/** Backs `bookmarks` (migration 006) — spec §33 centralized saved-content system. */
class Bookmark
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function isBookmarked(int $userId, int $contentId): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM bookmarks WHERE user_id = :u AND content_id = :c LIMIT 1');
        $stmt->execute(['u' => $userId, 'c' => $contentId]);
        return (bool) $stmt->fetchColumn();
    }

    /** @return array{bookmarked: bool} the new state, for a simple toggle button. */
    public function toggle(int $userId, int $contentId): array
    {
        if ($this->isBookmarked($userId, $contentId)) {
            $stmt = $this->db->prepare('DELETE FROM bookmarks WHERE user_id = :u AND content_id = :c');
            $stmt->execute(['u' => $userId, 'c' => $contentId]);
            return ['bookmarked' => false];
        }
        $stmt = $this->db->prepare('INSERT INTO bookmarks (user_id, content_id) VALUES (:u, :c)');
        $stmt->execute(['u' => $userId, 'c' => $contentId]);
        return ['bookmarked' => true];
    }

    /** A user's saved content, newest first — optionally filtered by content_type. */
    public function forUser(int $userId, ?string $contentType = null, int $limit = 24, int $offset = 0): array
    {
        $where = ['b.user_id = :user_id', 'c.deleted_at IS NULL'];
        $params = ['user_id' => $userId];
        if ($contentType) {
            $where[] = 'c.content_type = :content_type';
            $params['content_type'] = $contentType;
        }

        $sql = 'SELECT c.*, cat.name AS category_name, b.created_at AS bookmarked_at
                FROM bookmarks b
                JOIN content c ON c.id = b.content_id
                LEFT JOIN categories cat ON cat.id = c.category_id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY b.created_at DESC
                LIMIT :limit OFFSET :offset';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /** Bookmark status for a batch of content IDs — one query for a whole listing page instead of N. */
    public function statusForContentIds(int $userId, array $contentIds): array
    {
        if (empty($contentIds)) return [];
        $placeholders = implode(',', array_fill(0, count($contentIds), '?'));
        $stmt = $this->db->prepare("SELECT content_id FROM bookmarks WHERE user_id = ? AND content_id IN ($placeholders)");
        $stmt->execute(array_merge([$userId], $contentIds));
        return array_map('intval', array_column($stmt->fetchAll(), 'content_id'));
    }
}
