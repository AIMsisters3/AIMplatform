<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/media_url.php';

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
            $where[] = 'c.is_live = 1';
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

        return array_map('normalize_media_row', $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM content WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? normalize_media_row($row) : null;
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM content WHERE slug = :slug AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        return $row ? normalize_media_row($row) : null;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO content
                (title, slug, description, body, transcript, content_type, section, media_type, category_id, author_id, speaker,
                 bible_references, tags, language, thumbnail, media_url, visibility, status,
                 is_featured, is_live, allow_comments, seo_keywords, publish_date)
                VALUES
                (:title, :slug, :description, :body, :transcript, :content_type, :section, :media_type, :category_id, :author_id, :speaker,
                 :bible_references, :tags, :language, :thumbnail, :media_url, :visibility, :status,
                 :is_featured, :is_live, :allow_comments, :seo_keywords, :publish_date)';

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
            'status', 'is_featured', 'is_live', 'allow_comments', 'seo_keywords', 'publish_date',
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
    public function markNewsletterNotified(int $id): void
    {
        $stmt = $this->db->prepare('UPDATE content SET newsletter_notified_at = NOW() WHERE id = :id');
        $stmt->execute(['id' => $id]);
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

        return array_map('normalize_media_row', $stmt->fetchAll());
    }
}
