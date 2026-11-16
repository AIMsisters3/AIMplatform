<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/media_url.php';

/**
 * Backs bible_lessons / lesson_sections / lesson_story_links (migration
 * 042). A lesson is its own dedicated row (not a `content` row like
 * Bible Studies/Stories) because it needs real structure a single
 * title+body+media_url can't express: an ordered list of sections, a
 * JSON list of key points, a JSON list of reflection questions, and
 * links to related Bible Stories (`content` rows) and Bible Activities.
 */
class BibleLesson
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** @param array $filters topic,search,status */
    public function all(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $where = ['l.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $where[] = 'l.status = :status';
            $params['status'] = $filters['status'];
        } elseif (empty($filters['status'])) {
            $where[] = "l.status = 'published'";
        }
        if (!empty($filters['topic'])) {
            $where[] = 'l.topic = :topic';
            $params['topic'] = $filters['topic'];
        }
        if (!empty($filters['search'])) {
            // Distinct placeholders per occurrence - PDO::ATTR_EMULATE_PREPARES
            // is false, so a real prepared statement needs one bind slot per
            // appearance of a named placeholder, not one shared slot.
            $where[] = '(l.title LIKE :search1 OR l.topic LIKE :search2)';
            $needle = '%' . $filters['search'] . '%';
            $params['search1'] = $needle;
            $params['search2'] = $needle;
        }

        $sql = 'SELECT l.*,
                    (SELECT COUNT(*) FROM activities a WHERE a.lesson_id = l.id AND a.deleted_at IS NULL AND a.status = \'published\') AS activities_count
                FROM bible_lessons l
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY l.topic ASC, l.order_index ASC, COALESCE(l.publish_date, l.created_at) DESC
                LIMIT :limit OFFSET :offset';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return array_map([self::class, 'decorate'], $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM bible_lessons WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::decorate($row) : null;
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM bible_lessons WHERE slug = :slug AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        return $row ? self::decorate($row) : null;
    }

    /** Ordered section list for one lesson - the lesson's actual reading content. */
    public function sectionsFor(int $lessonId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM lesson_sections WHERE lesson_id = :id ORDER BY order_index ASC');
        $stmt->execute(['id' => $lessonId]);
        return array_map(function (array $row): array {
            $row['image_url'] = normalize_media_url($row['image_url']);
            $row['video_url'] = normalize_media_url($row['video_url']);
            return $row;
        }, $stmt->fetchAll());
    }

    /** Related Bible Stories (`content` rows) a lesson links to. */
    public function storiesFor(int $lessonId): array
    {
        require_once __DIR__ . '/Content.php';
        $stmt = $this->db->prepare(
            'SELECT c.* FROM content c
             JOIN lesson_story_links lsl ON lsl.content_id = c.id
             WHERE lsl.lesson_id = :id AND c.deleted_at IS NULL AND c.status = \'published\'
             ORDER BY c.title ASC'
        );
        $stmt->execute(['id' => $lessonId]);
        return array_map(fn ($row) => normalize_media_row($row), $stmt->fetchAll());
    }

    /** Activities connected to this lesson (the lesson -> activity direction is a plain FK, not a junction table). */
    public function activitiesFor(int $lessonId, bool $publishedOnly = true): array
    {
        $where = 'a.lesson_id = :id AND a.deleted_at IS NULL';
        if ($publishedOnly) {
            $where .= " AND a.status = 'published'";
        }
        $stmt = $this->db->prepare(
            "SELECT a.*, (SELECT COUNT(*) FROM activity_questions q WHERE q.activity_id = a.id) AS question_count
             FROM activities a WHERE $where ORDER BY a.created_at ASC"
        );
        $stmt->execute(['id' => $lessonId]);
        return array_map(function (array $row): array {
            $row['cover_image'] = normalize_media_url($row['cover_image']);
            return $row;
        }, $stmt->fetchAll());
    }

    /** All distinct topics currently in use, for a topic filter/chip list. */
    public function topics(): array
    {
        $stmt = $this->db->query(
            "SELECT topic, COUNT(*) AS lesson_count FROM bible_lessons
             WHERE deleted_at IS NULL AND status = 'published' AND topic IS NOT NULL AND topic <> ''
             GROUP BY topic ORDER BY MIN(order_index) ASC, topic ASC"
        );
        return $stmt->fetchAll();
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO bible_lessons
                (title, slug, cover_image, intro, bible_references, key_verse_text, key_verse_reference,
                 key_points, reflection_questions, topic, order_index, status, publish_date, created_by)
             VALUES
                (:title, :slug, :cover_image, :intro, :bible_references, :key_verse_text, :key_verse_reference,
                 :key_points, :reflection_questions, :topic, :order_index, :status, :publish_date, :created_by)'
        );
        $stmt->execute(self::paramsFrom($data) + ['created_by' => $data['created_by'] ?? null]);
        $id = (int) $this->db->lastInsertId();

        if (isset($data['sections'])) {
            $this->replaceSections($id, $data['sections']);
        }
        if (isset($data['story_ids'])) {
            $this->linkStories($id, $data['story_ids']);
        }

        return $id;
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];
        $allowed = [
            'title', 'slug', 'cover_image', 'intro', 'bible_references', 'key_verse_text', 'key_verse_reference',
            'key_points', 'reflection_questions', 'topic', 'order_index', 'status', 'publish_date',
        ];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $value = in_array($field, ['key_points', 'reflection_questions'], true) && is_array($data[$field])
                    ? json_encode(array_values($data[$field]))
                    : $data[$field];
                $fields[] = "$field = :$field";
                $params[$field] = $value;
            }
        }

        if ($fields !== []) {
            $stmt = $this->db->prepare('UPDATE bible_lessons SET ' . implode(', ', $fields) . ' WHERE id = :id');
            $stmt->execute($params);
        }

        if (isset($data['sections'])) {
            $this->replaceSections($id, $data['sections']);
        }
        if (isset($data['story_ids'])) {
            $this->linkStories($id, $data['story_ids']);
        }

        return true;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE bible_lessons SET deleted_at = NOW() WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    /** Wholesale replace - the admin builder always sends the complete ordered list, so a diff isn't worth the complexity. */
    private function replaceSections(int $lessonId, array $sections): void
    {
        $this->db->prepare('DELETE FROM lesson_sections WHERE lesson_id = :id')->execute(['id' => $lessonId]);

        $stmt = $this->db->prepare(
            'INSERT INTO lesson_sections (lesson_id, order_index, heading, body, image_url, video_url)
             VALUES (:lesson_id, :order_index, :heading, :body, :image_url, :video_url)'
        );
        foreach (array_values($sections) as $i => $section) {
            $stmt->execute([
                'lesson_id'  => $lessonId,
                'order_index' => $i,
                'heading'    => $section['heading'] ?? null,
                'body'       => $section['body'] ?? null,
                'image_url'  => $section['image_url'] ?? null,
                'video_url'  => $section['video_url'] ?? null,
            ]);
        }
    }

    private function linkStories(int $lessonId, array $storyContentIds): void
    {
        $this->db->prepare('DELETE FROM lesson_story_links WHERE lesson_id = :id')->execute(['id' => $lessonId]);
        $stmt = $this->db->prepare('INSERT INTO lesson_story_links (lesson_id, content_id) VALUES (:lesson_id, :content_id)');
        foreach (array_unique(array_map('intval', $storyContentIds)) as $contentId) {
            if ($contentId > 0) {
                $stmt->execute(['lesson_id' => $lessonId, 'content_id' => $contentId]);
            }
        }
    }

    private static function paramsFrom(array $data): array
    {
        return [
            'title'                => $data['title'],
            'slug'                 => $data['slug'],
            'cover_image'          => $data['cover_image'] ?? null,
            'intro'                => $data['intro'] ?? null,
            'bible_references'     => $data['bible_references'] ?? null,
            'key_verse_text'       => $data['key_verse_text'] ?? null,
            'key_verse_reference'  => $data['key_verse_reference'] ?? null,
            'key_points'           => isset($data['key_points']) ? json_encode(array_values($data['key_points'])) : null,
            'reflection_questions' => isset($data['reflection_questions']) ? json_encode(array_values($data['reflection_questions'])) : null,
            'topic'                => $data['topic'] ?? null,
            'order_index'          => (int) ($data['order_index'] ?? 0),
            'status'               => $data['status'] ?? 'draft',
            'publish_date'         => $data['publish_date'] ?? null,
        ];
    }

    private static function decorate(array $row): array
    {
        $row['cover_image'] = normalize_media_url($row['cover_image']);
        $row['key_points'] = $row['key_points'] ? json_decode($row['key_points'], true) : [];
        $row['reflection_questions'] = $row['reflection_questions'] ? json_decode($row['reflection_questions'], true) : [];
        if (array_key_exists('activities_count', $row)) {
            $row['activities_count'] = (int) $row['activities_count'];
        }
        return $row;
    }
}
