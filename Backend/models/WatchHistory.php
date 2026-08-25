<?php

require_once __DIR__ . '/../config/database.php';

/** Backs `watch_history` (migration 006) — powers Continue Watching + "% watched". */
class WatchHistory
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function recordProgress(int $userId, int $contentId, int $progressSeconds, ?int $durationSeconds): array
    {
        $completed = $durationSeconds && $progressSeconds >= (int) ($durationSeconds * 0.95) ? 1 : 0;

        $stmt = $this->db->prepare(
            'INSERT INTO watch_history (user_id, content_id, progress_seconds, duration_seconds, completed)
             VALUES (:u, :c, :progress, :duration, :completed)
             ON DUPLICATE KEY UPDATE
                progress_seconds = VALUES(progress_seconds),
                duration_seconds = COALESCE(VALUES(duration_seconds), duration_seconds),
                completed = VALUES(completed)'
        );
        $stmt->execute([
            'u' => $userId, 'c' => $contentId, 'progress' => $progressSeconds,
            'duration' => $durationSeconds, 'completed' => $completed,
        ]);

        return $this->find($userId, $contentId);
    }

    public function find(int $userId, int $contentId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM watch_history WHERE user_id = :u AND content_id = :c LIMIT 1');
        $stmt->execute(['u' => $userId, 'c' => $contentId]);
        return $stmt->fetch() ?: null;
    }

    /** "Continue Watching" — started but not finished, most recent first. */
    public function continueWatching(int $userId, int $limit = 12): array
    {
        $stmt = $this->db->prepare(
            "SELECT c.*, cat.name AS category_name, wh.progress_seconds, wh.duration_seconds, wh.last_watched_at
             FROM watch_history wh
             JOIN content c ON c.id = wh.content_id AND c.deleted_at IS NULL
             LEFT JOIN categories cat ON cat.id = c.category_id
             WHERE wh.user_id = :u AND wh.completed = 0 AND wh.progress_seconds > 0
             ORDER BY wh.last_watched_at DESC
             LIMIT :limit"
        );
        $stmt->bindValue('u', $userId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
