<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Backs bible_studies / bible_study_progress / bible_study_notes
 * (migration 004). A "bible study" is a `content` row (content_type =
 * 'bible_study') plus this 1:1 extension row for its format + study
 * guide — see that migration's header for why.
 */
class BibleStudy
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // ---------------------------------------------------------
    // Listing (public)
    // ---------------------------------------------------------

    /** @param array $filters format,category_id,language,search,status */
    public function all(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $where = ["c.content_type = 'bible_study'", 'c.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $where[] = 'c.status = :status';
            $params['status'] = $filters['status'];
        } elseif (empty($filters['status'])) {
            $where[] = "c.status = 'published'";
        }
        if (!empty($filters['format'])) {
            $where[] = 'bs.format = :format';
            $params['format'] = $filters['format'];
        }
        if (!empty($filters['category_id'])) {
            $where[] = 'c.category_id = :category_id';
            $params['category_id'] = $filters['category_id'];
        }
        if (!empty($filters['language'])) {
            $where[] = 'c.language = :language';
            $params['language'] = $filters['language'];
        }
        if (!empty($filters['search'])) {
            $where[] = '(c.title LIKE :search OR c.tags LIKE :search OR c.bible_references LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $sql = 'SELECT c.*, bs.format, bs.study_guide_url, cat.name AS category_name
                FROM content c
                JOIN bible_studies bs ON bs.content_id = c.id
                LEFT JOIN categories cat ON cat.id = c.category_id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY COALESCE(c.publish_date, c.created_at) DESC
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

    public function findByContentId(int $contentId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT c.*, bs.format, bs.study_guide_url
             FROM content c JOIN bible_studies bs ON bs.content_id = c.id
             WHERE c.id = :id AND c.deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['id' => $contentId]);
        return $stmt->fetch() ?: null;
    }

    /** Called right after Content::create() for a content_type='bible_study' row. */
    public function createExtension(int $contentId, string $format, ?string $studyGuideUrl): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO bible_studies (content_id, format, study_guide_url) VALUES (:content_id, :format, :url)
             ON DUPLICATE KEY UPDATE format = VALUES(format), study_guide_url = VALUES(study_guide_url)'
        );
        $stmt->execute(['content_id' => $contentId, 'format' => $format, 'url' => $studyGuideUrl]);
    }

    // ---------------------------------------------------------
    // Progress (per-user)
    // ---------------------------------------------------------

    public function getProgress(int $userId, int $contentId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM bible_study_progress WHERE user_id = :u AND content_id = :c LIMIT 1'
        );
        $stmt->execute(['u' => $userId, 'c' => $contentId]);
        return $stmt->fetch() ?: null;
    }

    public function upsertProgress(int $userId, int $contentId, string $status, int $percent, int $lastPositionSeconds): array
    {
        $percent = max(0, min(100, $percent));
        $completedAt = $status === 'completed' ? date('Y-m-d H:i:s') : null;

        $stmt = $this->db->prepare(
            'INSERT INTO bible_study_progress (user_id, content_id, status, progress_percent, last_position_seconds, completed_at)
             VALUES (:u, :c, :status, :percent, :pos, :completed_at)
             ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                progress_percent = VALUES(progress_percent),
                last_position_seconds = VALUES(last_position_seconds),
                completed_at = COALESCE(VALUES(completed_at), bible_study_progress.completed_at)'
        );
        $stmt->execute([
            'u' => $userId, 'c' => $contentId, 'status' => $status,
            'percent' => $percent, 'pos' => $lastPositionSeconds, 'completed_at' => $completedAt,
        ]);

        return $this->getProgress($userId, $contentId);
    }

    /** Studies this user has started but not finished — "Continue Studying". */
    public function continueStudying(int $userId, int $limit = 10): array
    {
        $stmt = $this->db->prepare(
            "SELECT c.*, bs.format, p.progress_percent, p.last_position_seconds, p.updated_at AS progress_updated_at
             FROM bible_study_progress p
             JOIN content c ON c.id = p.content_id AND c.deleted_at IS NULL
             JOIN bible_studies bs ON bs.content_id = c.id
             WHERE p.user_id = :u AND p.status = 'in_progress'
             ORDER BY p.updated_at DESC
             LIMIT :limit"
        );
        $stmt->bindValue('u', $userId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    // ---------------------------------------------------------
    // Notes (private to the author)
    // ---------------------------------------------------------

    public function notesFor(int $userId, int $contentId): array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM bible_study_notes WHERE user_id = :u AND content_id = :c ORDER BY created_at DESC'
        );
        $stmt->execute(['u' => $userId, 'c' => $contentId]);
        return $stmt->fetchAll();
    }

    public function createNote(int $userId, int $contentId, string $body): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO bible_study_notes (user_id, content_id, body) VALUES (:u, :c, :body)'
        );
        $stmt->execute(['u' => $userId, 'c' => $contentId, 'body' => $body]);
        return (int) $this->db->lastInsertId();
    }

    public function findNote(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM bible_study_notes WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function updateNote(int $id, string $body): bool
    {
        $stmt = $this->db->prepare('UPDATE bible_study_notes SET body = :body WHERE id = :id');
        return $stmt->execute(['body' => $body, 'id' => $id]);
    }

    public function deleteNote(int $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM bible_study_notes WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }
}
