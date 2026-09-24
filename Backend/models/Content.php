<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/media_url.php';
require_once __DIR__ . '/../helpers/live_status.php';

class Content
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function all(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $where  = ['c.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['content_type'])) {
            $where[] = 'c.content_type = :content_type';
            $params['content_type'] = $filters['content_type'];
        }
        if (!empty($filters['section'])) {
            $where[] = 'c.section = :section';
            $params['section'] = $filters['section'];
        }
        if (!empty($filters['media_type'])) {
            // Accepts either a single value or a comma-separated list, so the
            // frontend can offer grouped filters (e.g. "Animations & Cartoons"
            // = animation,cartoon) without the backend needing to know about
            // the grouping itself.
            $types = array_values(array_filter(array_map('trim', explode(',', $filters['media_type']))));
            if (count($types) === 1) {
                $where[] = 'c.media_type = :media_type';
                $params['media_type'] = $types[0];
            } elseif (count($types) > 1) {
                $placeholders = [];
                foreach ($types as $i => $type) {
                    $key = "media_type_$i";
                    $placeholders[] = ':' . $key;
                    $params[$key] = $type;
                }
                $where[] = 'c.media_type IN (' . implode(', ', $placeholders) . ')';
            }
        }
        if (!empty($filters['category_id'])) {
            $where[] = 'c.category_id = :category_id';
            $params['category_id'] = $filters['category_id'];
        }
        if (!empty($filters['author_id'])) {
            $where[] = 'c.author_id = :author_id';
            $params['author_id'] = $filters['author_id'];
        }
        if (!empty($filters['language'])) {
            $where[] = 'c.language = :language';
            $params['language'] = $filters['language'];
        }
        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $where[] = 'c.status = :status';
            $params['status'] = $filters['status'];
        } elseif (empty($filters['status'])) {
            // no status requested at all (public routes) -> published only
            $where[] = "c.status = 'published'";
        }
        // filters['status'] === 'all' -> no status restriction (admin "manage content" view)
        if (!empty($filters['search'])) {
            $where[] = '(c.title LIKE :search OR c.tags LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }
        if (!empty($filters['is_featured'])) {
            $where[] = 'c.is_featured = 1';
        }
        if (!empty($filters['is_live'])) {
            // Not just "c.is_live = 1" - that alone never expires (see
            // live_window_sql()'s own docblock). Genuinely restricts to
            // items currently inside their computed live window.
            $where[] = live_window_sql('c');
        }

        $sql = 'SELECT c.*, cat.name AS category_name,
                    (SELECT COUNT(*) FROM comments cm WHERE cm.content_id = c.id AND cm.status = \'approved\') AS comments_count
                FROM content c
                LEFT JOIN categories cat ON cat.id = c.category_id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY COALESCE(c.publish_date, c.created_at) DESC
                LIMIT :limit OFFSET :offset';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return array_map([self::class, 'decorateRow'], $stmt->fetchAll());
    }

    /** normalize_media_url() for URLs + decorate_live_status() for the real, time-bounded is_live - applied identically everywhere a content row leaves this model. */
    private static function decorateRow(array $row): array
    {
        return decorate_live_status(normalize_media_row($row));
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM content WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::decorateRow($row) : null;
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM content WHERE slug = :slug AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        return $row ? self::decorateRow($row) : null;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO content
                (title, slug, description, body, transcript, content_type, section, media_type, category_id, author_id, speaker,
                 bible_references, tags, language, thumbnail, media_url, visibility, status,
                 is_featured, is_live, allow_comments, seo_keywords, publish_date, duration_seconds)
                VALUES
                (:title, :slug, :description, :body, :transcript, :content_type, :section, :media_type, :category_id, :author_id, :speaker,
                 :bible_references, :tags, :language, :thumbnail, :media_url, :visibility, :status,
                 :is_featured, :is_live, :allow_comments, :seo_keywords, :publish_date, :duration_seconds)';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'title'            => $data['title'],
            'slug'             => $data['slug'],
            'description'      => $data['description'] ?? null,
            'body'             => $data['body'] ?? null,
            'transcript'       => $data['transcript'] ?? null,
            'content_type'     => $data['content_type'],
            'section'          => $data['section'] ?? 'media_library',
            'media_type'       => $data['media_type'] ?? 'video',
            'category_id'      => $data['category_id'] ?? null,
            'author_id'        => $data['author_id'] ?? null,
            'speaker'          => $data['speaker'] ?? null,
            'bible_references' => $data['bible_references'] ?? null,
            'tags'             => $data['tags'] ?? null,
            // Explicit null (Gallery: language is "not applicable") must
            // store NULL, not fall back to 'en' — ?? treats null and an
            // absent key the same, so array_key_exists is needed here.
            'language'         => array_key_exists('language', $data) ? $data['language'] : 'en',
            'thumbnail'        => $data['thumbnail'] ?? null,
            'media_url'        => $data['media_url'] ?? null,
            'visibility'       => $data['visibility'] ?? 'public',
            'status'           => $data['status'] ?? 'draft',
            'is_featured'      => !empty($data['is_featured']) ? 1 : 0,
            'is_live'          => !empty($data['is_live']) ? 1 : 0,
            'allow_comments'   => array_key_exists('allow_comments', $data) ? (int) (bool) $data['allow_comments'] : 1,
            'seo_keywords'     => $data['seo_keywords'] ?? null,
            'publish_date'     => $data['publish_date'] ?? null,
            // Real duration read client-side from the actual video file at
            // upload time (see UploadContent.jsx) - never estimated. Null
            // for anything that isn't a video, or an older upload from
            // before this existed.
            'duration_seconds' => isset($data['duration_seconds']) ? (int) $data['duration_seconds'] : null,
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];

        $allowed = [
            'title', 'slug', 'description', 'body', 'transcript', 'content_type', 'section', 'media_type', 'category_id', 'speaker',
            'bible_references', 'tags', 'language', 'thumbnail', 'media_url', 'visibility',
            'status', 'is_featured', 'is_live', 'allow_comments', 'seo_keywords', 'publish_date', 'duration_seconds',
        ];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
            }
        }

        if (empty($fields)) {
            return false;
        }

        $sql = 'UPDATE content SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    /** Soft delete — sets deleted_at rather than removing the row, so it can be restored. */
    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE content SET deleted_at = NOW() WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    public function restore(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE content SET deleted_at = NULL WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    /** Permanently removes a soft-deleted item — for a future admin "Trash" screen only. */
    public function forceDelete(int $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM content WHERE id = :id AND deleted_at IS NOT NULL');
        return $stmt->execute(['id' => $id]);
    }

    public function bulkDelete(array $ids): bool
    {
        if (empty($ids)) return false;
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare("UPDATE content SET deleted_at = NOW() WHERE id IN ($placeholders)");
        return $stmt->execute($ids);
    }

    public function bulkUpdateStatus(array $ids, string $status): bool
    {
        if (empty($ids)) return false;
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare("UPDATE content SET status = ? WHERE id IN ($placeholders)");
        return $stmt->execute(array_merge([$status], $ids));
    }

    /**
     * Of the given ids, which currently have no thumbnail at all (NULL or
     * empty string). UploadContent.jsx's own validate() already blocks
     * publishing without one on create, but nothing enforced that
     * server-side, so a draft saved with no thumbnail could reach
     * status='published' entirely through Manage Content's row-level
     * Publish toggle or a bulk publish - neither of which ever sends a
     * thumbnail field - leaving a permanently thumbnail-less item live
     * with no way to add one afterward. Used by both
     * ContentController::update() and ::bulk() to close that gap.
     */
    public function idsWithoutThumbnail(array $ids): array
    {
        if (empty($ids)) return [];
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            "SELECT id FROM content WHERE id IN ($placeholders) AND (thumbnail IS NULL OR thumbnail = '')"
        );
        $stmt->execute($ids);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /**
     * Flips every 'scheduled' item whose publish_date has already arrived
     * to 'published', and returns their ids. Nothing in this codebase
     * ever did this automatically before - picking "Schedule for later"
     * in the admin upload form set publish_date and status='scheduled',
     * but with no sweep to act on it, that item would sit in 'scheduled'
     * forever (the public site's own query is a strict
     * `status = 'published'`, so a scheduled item never appears on its
     * own, no matter how far in the past its publish_date is) until an
     * admin noticed and manually re-published it. Called from
     * CronController's existing scheduled-task sweep (see
     * routes/api.php's /cron/run-due-tasks), the same mechanism this
     * project already uses for Pay Later/deposit reminders on a host
     * with no server-side cron of its own.
     */
    public function publishDueScheduled(): array
    {
        $ids = $this->db->query(
            "SELECT id FROM content WHERE status = 'scheduled' AND publish_date IS NOT NULL
             AND publish_date <= NOW() AND deleted_at IS NULL"
        )->fetchAll(PDO::FETCH_COLUMN);

        if (empty($ids)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $this->db->prepare("UPDATE content SET status = 'published' WHERE id IN ($placeholders)")->execute($ids);

        return array_map('intval', $ids);
    }

    public function duplicate(int $id): ?int
    {
        $original = $this->find($id);
        if (!$original) return null;

        unset($original['id']);
        $original['title'] .= ' (Copy)';
        $original['slug']  .= '-copy-' . time();
        $original['status'] = 'draft';

        return $this->create($original);
    }

    public function incrementViews(int $id): void
    {
        $stmt = $this->db->prepare('UPDATE content SET views = views + 1 WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    /**
     * Records a single visitor's view of a content item, deduplicated per
     * (content, visitor, day) via content_views' unique key — a repeat
     * view from the same visitor the same day is a silent no-op. Only
     * increments the public views counter when this is a genuinely new
     * row, so the count reflects reach (unique visitors/day) rather than
     * raw page loads. $visitorKey identifies the viewer regardless of
     * login status — see Backend/helpers/visitor.php for guests, or
     * "user:<id>" for a signed-in one.
     */
    public function recordView(int $id, string $visitorKey, ?int $userId): void
    {
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO content_views (content_id, visitor_key, user_id)
             VALUES (:content_id, :visitor_key, :user_id)'
        );
        $stmt->execute([
            'content_id'  => $id,
            'visitor_key' => $visitorKey,
            'user_id'     => $userId,
        ]);

        if ($stmt->rowCount() > 0) {
            $this->incrementViews($id);
        }
    }

    /** Marks a devotion/Bible study/news item as having already triggered its one newsletter notification — see helpers/publish_notify.php. */
    /**
     * Atomically claims the right to send this item's one-time publish
     * notification (email + in-app bell) - only succeeds for whichever
     * caller actually flips newsletter_notified_at from NULL first.
     * Closes a real race window that a plain unconditional "mark as
     * notified after sending" would leave open: two near-simultaneous
     * requests for the same item (a double-clicked Publish button, a
     * retried request, two admins publishing at once) could otherwise
     * both read "not yet notified" before either had written the flag,
     * and both send a full batch of subscriber emails. Returns true only
     * for the caller that should actually proceed to send.
     */
    public function claimNewsletterNotification(int $id): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE content SET newsletter_notified_at = NOW() WHERE id = :id AND newsletter_notified_at IS NULL'
        );
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }

    public function countByType(string $type): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM content WHERE content_type = :type AND deleted_at IS NULL");
        $stmt->execute(['type' => $type]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * "Popular This Week": published items with at least $minViews
     * genuinely deduplicated views (content_views - one row per visitor
     * per day, see migration 011) in the last $days days, ordered by
     * that week's view count descending. An item with plenty of
     * lifetime views but nothing recent does NOT qualify - this counts
     * views from content_views directly rather than the lifetime
     * content.views counter, so it reflects actual recent activity.
     */
    public function popularThisWeek(?string $section, int $minViews, int $days, int $limit): array
    {
        $where = ["c.deleted_at IS NULL", "c.status = 'published'", 'cv.viewed_at >= (NOW() - INTERVAL :days DAY)'];
        $params = ['days' => $days, 'min_views' => $minViews];

        if ($section) {
            $where[] = 'c.section = :section';
            $params['section'] = $section;
        }

        $sql = 'SELECT c.*, cat.name AS category_name, COUNT(*) AS week_views
                FROM content_views cv
                JOIN content c ON c.id = cv.content_id
                LEFT JOIN categories cat ON cat.id = c.category_id
                WHERE ' . implode(' AND ', $where) . '
                GROUP BY c.id
                HAVING week_views >= :min_views
                ORDER BY week_views DESC
                LIMIT :limit';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_INT);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return array_map([self::class, 'decorateRow'], $stmt->fetchAll());
    }
}
