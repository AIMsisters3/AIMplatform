<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/media_url.php';
require_once __DIR__ . '/../helpers/live_status.php';

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
            // Three distinct placeholders, not :search reused three times
            // - see Content::all()'s matching comment: real (non-emulated)
            // prepared statements give each occurrence its own bind slot.
            $where[] = '(c.title LIKE :search1 OR c.tags LIKE :search2 OR c.bible_references LIKE :search3)';
            $needle = '%' . $filters['search'] . '%';
            $params['search1'] = $needle;
            $params['search2'] = $needle;
            $params['search3'] = $needle;
        }
        if (!empty($filters['is_live'])) {
            $where[] = live_window_sql('c');
        }

        $sql = 'SELECT c.*, bs.format, bs.study_guide_url, cat.name AS category_name,
                    s.title AS series_title, s.slug AS series_slug
                FROM content c
                JOIN bible_studies bs ON bs.content_id = c.id
                LEFT JOIN categories cat ON cat.id = c.category_id
                LEFT JOIN series s ON s.id = c.series_id
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
        return array_map(fn ($row) => decorate_live_status(normalize_media_row($row)), $stmt->fetchAll());
    }

    /** $currentVisitorKey powers liked_by_me (content_likes) - same pattern as Content::find()/findBySlug(). */
    public function findByContentId(int $contentId, string $currentVisitorKey = ''): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT c.*, bs.format, bs.study_guide_url,
                (SELECT COUNT(*) FROM content_likes cl WHERE cl.content_id = c.id) AS likes_count,
                EXISTS(SELECT 1 FROM content_likes cl2 WHERE cl2.content_id = c.id AND cl2.visitor_key = :current_visitor) AS liked_by_me
             FROM content c JOIN bible_studies bs ON bs.content_id = c.id
             WHERE c.id = :id AND c.deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['id' => $contentId, 'current_visitor' => $currentVisitorKey]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        $row = decorate_live_status(normalize_media_row($row));
        $row['likes_count'] = (int) $row['likes_count'];
        $row['liked_by_me'] = (bool) $row['liked_by_me'];
        return $row;
    }

    /**
     * The Bible Studies page's own "Featured Studies" row - purely
     * views + likes (score = views + likes*5, same weighting
     * Content::featuredRanked() uses), no admin-pinned is_featured bonus.
     * Deliberately not the same ranking Content::featuredRanked() feeds
     * the Home page's blended Featured section with - that one folds in
     * an admin pin; this one is explicitly "the most liked, viewed
     * studies" and nothing else, so a visitor only ever sees what's
     * genuinely popular here.
     */
    public function featuredRanked(int $limit): array
    {
        $stmt = $this->db->prepare(
            "SELECT c.*, bs.format, bs.study_guide_url, cat.name AS category_name,
                    (SELECT COUNT(*) FROM content_likes cl WHERE cl.content_id = c.id) AS likes_count,
                    (c.views + (SELECT COUNT(*) FROM content_likes cl3 WHERE cl3.content_id = c.id) * 5) AS popularity_score
             FROM content c
             JOIN bible_studies bs ON bs.content_id = c.id
             LEFT JOIN categories cat ON cat.id = c.category_id
             WHERE c.content_type = 'bible_study' AND c.deleted_at IS NULL AND c.status = 'published'
             ORDER BY popularity_score DESC, COALESCE(c.publish_date, c.created_at) DESC
             LIMIT :limit"
        );
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return array_map(function (array $row): array {
            $row = decorate_live_status(normalize_media_row($row));
            $row['likes_count'] = (int) $row['likes_count'];
            unset($row['popularity_score']);
            return $row;
        }, $stmt->fetchAll());
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
        return array_map(fn ($row) => decorate_live_status(normalize_media_row($row)), $stmt->fetchAll());
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

    /** Every note belonging to one user, across every study - backs the "My Notes" notebook list. */
    public function notesForUser(int $userId): array
    {
        $stmt = $this->db->prepare(
            'SELECT n.*, c.title AS study_title, c.slug AS study_slug
             FROM bible_study_notes n
             LEFT JOIN content c ON c.id = n.content_id
             WHERE n.user_id = :u
             ORDER BY n.updated_at DESC'
        );
        $stmt->execute(['u' => $userId]);
        return $stmt->fetchAll();
    }

    public function createNote(int $userId, int $contentId, string $body, ?string $title = null): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO bible_study_notes (user_id, content_id, title, body) VALUES (:u, :c, :title, :body)'
        );
        $stmt->execute(['u' => $userId, 'c' => $contentId, 'title' => $title, 'body' => $body]);
        return (int) $this->db->lastInsertId();
    }

    public function findNote(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM bible_study_notes WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    /** A single note plus its associated study's title/slug, for the notebook detail/print page. */
    public function findNoteWithStudy(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT n.*, c.title AS study_title, c.slug AS study_slug
             FROM bible_study_notes n
             LEFT JOIN content c ON c.id = n.content_id
             WHERE n.id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    /** $title: pass null to leave the existing title untouched (vs. clearing it), '' to explicitly clear it. */
    public function updateNote(int $id, string $body, ?string $title = null, bool $titleProvided = false): bool
    {
        if ($titleProvided) {
            $stmt = $this->db->prepare('UPDATE bible_study_notes SET body = :body, title = :title WHERE id = :id');
            return $stmt->execute(['body' => $body, 'title' => $title, 'id' => $id]);
        }
        $stmt = $this->db->prepare('UPDATE bible_study_notes SET body = :body WHERE id = :id');
        return $stmt->execute(['body' => $body, 'id' => $id]);
    }

    public function deleteNote(int $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM bible_study_notes WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }
}
