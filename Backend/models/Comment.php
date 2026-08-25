<?php

require_once __DIR__ . '/../config/database.php';

class Comment
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** Top-level comments with nested replies (one level deep, YouTube-style). */
    public function forContent(int $contentId, ?int $currentUserId = null): array
    {
        $stmt = $this->db->prepare(
            'SELECT c.id, c.parent_id, c.body, c.created_at, c.user_id, u.name AS user_name,
                    (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS likes_count,
                    EXISTS(
                      SELECT 1 FROM comment_likes cl2
                      WHERE cl2.comment_id = c.id AND cl2.user_id = :current_user
                    ) AS liked_by_me
             FROM comments c
             JOIN users u ON u.id = c.user_id
             WHERE c.content_id = :content_id AND c.status = \'approved\'
             ORDER BY c.created_at ASC'
        );
        $stmt->execute(['content_id' => $contentId, 'current_user' => $currentUserId ?? 0]);
        $rows = $stmt->fetchAll();

        $byId = [];
        foreach ($rows as $row) {
            $row['likes_count'] = (int) $row['likes_count'];
            $row['liked_by_me'] = (bool) $row['liked_by_me'];
            $row['replies'] = [];
            $byId[$row['id']] = $row;
        }

        $topLevel = [];
        foreach ($byId as $id => $row) {
            if ($row['parent_id'] && isset($byId[$row['parent_id']])) {
                $byId[$row['parent_id']]['replies'][] = $row;
            } else {
                $topLevel[] = $id;
            }
        }

        $result = [];
        foreach ($topLevel as $id) {
            $result[] = $byId[$id];
        }
        return $result;
    }

    public function create(int $contentId, int $userId, string $body, ?int $parentId = null): int
    {
        // flatten a reply-to-a-reply onto the original top-level comment,
        // same behavior YouTube uses instead of infinite nesting
        if ($parentId) {
            $parent = $this->find($parentId);
            if ($parent && $parent['parent_id']) {
                $parentId = (int) $parent['parent_id'];
            }
        }

        $stmt = $this->db->prepare(
            'INSERT INTO comments (content_id, user_id, parent_id, body) VALUES (:content_id, :user_id, :parent_id, :body)'
        );
        $stmt->execute([
            'content_id' => $contentId,
            'user_id'    => $userId,
            'parent_id'  => $parentId,
            'body'       => $body,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM comments WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM comments WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    /** For the moderation queue: comments awaiting review or flagged as spam. */
    public function forModeration(string $status = 'pending', int $limit = 50, int $offset = 0): array
    {
        $stmt = $this->db->prepare(
            'SELECT c.*, u.name AS user_name, ct.title AS content_title, ct.slug AS content_slug
             FROM comments c
             JOIN users u ON u.id = c.user_id
             JOIN content ct ON ct.id = c.content_id
             WHERE c.status = :status
             ORDER BY c.created_at DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('status', $status);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function updateStatus(int $id, string $status): bool
    {
        $stmt = $this->db->prepare('UPDATE comments SET status = :status WHERE id = :id');
        return $stmt->execute(['status' => $status, 'id' => $id]);
    }

    public function toggleLike(int $commentId, int $userId): array
    {
        $check = $this->db->prepare('SELECT id FROM comment_likes WHERE comment_id = :c AND user_id = :u');
        $check->execute(['c' => $commentId, 'u' => $userId]);
        $existing = $check->fetch();

        if ($existing) {
            $del = $this->db->prepare('DELETE FROM comment_likes WHERE id = :id');
            $del->execute(['id' => $existing['id']]);
            $liked = false;
        } else {
            $ins = $this->db->prepare('INSERT INTO comment_likes (comment_id, user_id) VALUES (:c, :u)');
            $ins->execute(['c' => $commentId, 'u' => $userId]);
            $liked = true;
        }

        $count = $this->db->prepare('SELECT COUNT(*) FROM comment_likes WHERE comment_id = :c');
        $count->execute(['c' => $commentId]);

        return ['liked' => $liked, 'likes_count' => (int) $count->fetchColumn()];
    }
}