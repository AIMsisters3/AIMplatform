<?php

require_once __DIR__ . '/../config/database.php';

class Comment
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * Top-level comments with nested replies (one level deep, TikTok/
     * Instagram-style - a reply-to-a-reply still flattens into this same
     * one level, see create()'s reply_to_user_id handling below).
     * $currentVisitorKey powers liked_by_me - "user:<id>"/"guest:<cookie>",
     * same scheme content_likes uses.
     */
    public function forContent(int $contentId, string $currentVisitorKey = ''): array
    {
        $stmt = $this->db->prepare(
            'SELECT c.id, c.parent_id, c.body, c.created_at, c.user_id, u.name AS user_name,
                    c.reply_to_user_id, ru.name AS reply_to_user_name,
                    (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS likes_count,
                    EXISTS(
                      SELECT 1 FROM comment_likes cl2
                      WHERE cl2.comment_id = c.id AND cl2.visitor_key = :current_visitor
                    ) AS liked_by_me
             FROM comments c
             JOIN users u ON u.id = c.user_id
             LEFT JOIN users ru ON ru.id = c.reply_to_user_id
             WHERE c.content_id = :content_id AND c.status = \'approved\'
             ORDER BY c.created_at ASC'
        );
        $stmt->execute(['content_id' => $contentId, 'current_visitor' => $currentVisitorKey]);
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
        // Flatten a reply-to-a-reply onto the original top-level comment -
        // still one level deep in storage, no infinite nesting - but
        // remember whose reply it was actually directed at so the UI can
        // show "Replying to @name", TikTok/Instagram-style, instead of
        // silently losing that context the way a plain flatten would.
        // Replying directly to a top-level comment leaves this null - no
        // "Replying to" label needed there either, same as those apps.
        $replyToUserId = null;
        if ($parentId) {
            $parent = $this->find($parentId);
            if ($parent && $parent['parent_id']) {
                $replyToUserId = (int) $parent['user_id'];
                $parentId = (int) $parent['parent_id'];
            }
        }

        $stmt = $this->db->prepare(
            'INSERT INTO comments (content_id, user_id, parent_id, reply_to_user_id, body)
             VALUES (:content_id, :user_id, :parent_id, :reply_to_user_id, :body)'
        );
        $stmt->execute([
            'content_id'       => $contentId,
            'user_id'          => $userId,
            'parent_id'        => $parentId,
            'reply_to_user_id' => $replyToUserId,
            'body'             => $body,
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

    /** Toggles a like identified by $visitorKey - anyone can like, signed in or not, same as Content::toggleLike(). */
    public function toggleLike(int $commentId, string $visitorKey, ?int $userId = null): array
    {
        $check = $this->db->prepare('SELECT id FROM comment_likes WHERE comment_id = :c AND visitor_key = :v');
        $check->execute(['c' => $commentId, 'v' => $visitorKey]);
        $existing = $check->fetch();

        if ($existing) {
            $del = $this->db->prepare('DELETE FROM comment_likes WHERE id = :id');
            $del->execute(['id' => $existing['id']]);
            $liked = false;
        } else {
            $ins = $this->db->prepare('INSERT INTO comment_likes (comment_id, visitor_key, user_id) VALUES (:c, :v, :u)');
            $ins->execute(['c' => $commentId, 'v' => $visitorKey, 'u' => $userId]);
            $liked = true;
        }

        $count = $this->db->prepare('SELECT COUNT(*) FROM comment_likes WHERE comment_id = :c');
        $count->execute(['c' => $commentId]);

        return ['liked' => $liked, 'likes_count' => (int) $count->fetchColumn()];
    }
}