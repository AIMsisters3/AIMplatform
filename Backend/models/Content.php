<?php

require_once __DIR__ . '/../config/database.php';

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
            $where[] = 'c.media_type = :media_type';
            $params['media_type'] = $filters['media_type'];
        }
        if (!empty($filters['category_id'])) {
            $where[] = 'c.category_id = :category_id';
            $params['category_id'] = $filters['category_id'];
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

        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM content WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM content WHERE slug = :slug AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO content
                (title, slug, description, body, transcript, content_type, section, media_type, category_id, author_id, speaker,
                 bible_references, tags, language, thumbnail, media_url, visibility, status,
                 is_featured, allow_comments, seo_keywords, publish_date)
                VALUES
                (:title, :slug, :description, :body, :transcript, :content_type, :section, :media_type, :category_id, :author_id, :speaker,
                 :bible_references, :tags, :language, :thumbnail, :media_url, :visibility, :status,
                 :is_featured, :allow_comments, :seo_keywords, :publish_date)';

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
            'status', 'is_featured', 'allow_comments', 'seo_keywords', 'publish_date',
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
}
