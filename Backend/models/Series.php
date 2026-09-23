<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/media_url.php';

/** Backs `series` + the series_id/season_number/episode_number columns on `content` (migration 005). */
class Series
{
    private static function normalizeCover(array $row): array
    {
        if (array_key_exists('cover_image', $row)) {
            $row['cover_image'] = normalize_media_url($row['cover_image']);
        }
        return $row;
    }

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function all(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $where = ['s.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $where[] = 's.status = :status';
            $params['status'] = $filters['status'];
        } elseif (empty($filters['status'])) {
            $where[] = "s.status = 'published'";
        }
        if (!empty($filters['category_id'])) {
            $where[] = 's.category_id = :category_id';
            $params['category_id'] = $filters['category_id'];
        }
        if (!empty($filters['section'])) {
            $where[] = 's.section = :section';
            $params['section'] = $filters['section'];
        }
        if (!empty($filters['search'])) {
            $where[] = 's.title LIKE :search';
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $sql = "SELECT s.*, cat.name AS category_name,
                    (SELECT COUNT(*) FROM content c WHERE c.series_id = s.id AND c.deleted_at IS NULL AND c.status = 'published') AS episode_count
                FROM series s
                LEFT JOIN categories cat ON cat.id = s.category_id
                WHERE " . implode(' AND ', $where) . '
                ORDER BY s.created_at DESC
                LIMIT :limit OFFSET :offset';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return array_map([self::class, 'normalizeCover'], $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM series WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::normalizeCover($row) : null;
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM series WHERE slug = :slug AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        return $row ? self::normalizeCover($row) : null;
    }

    /** Episodes for a series, grouped for the frontend by season (frontend groups the flat list — see SeriesDetail.jsx). */
    public function episodes(int $seriesId): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM content
             WHERE series_id = :series_id AND deleted_at IS NULL AND status = 'published'
             ORDER BY season_number ASC, episode_number ASC"
        );
        $stmt->execute(['series_id' => $seriesId]);
        return array_map('normalize_media_row', $stmt->fetchAll());
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO series (title, slug, description, cover_image, category_id, section, language, status)
             VALUES (:title, :slug, :description, :cover_image, :category_id, :section, :language, :status)'
        );
        $stmt->execute([
            'title'       => $data['title'],
            'slug'        => $data['slug'],
            'description' => $data['description'] ?? null,
            'cover_image' => $data['cover_image'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'section'     => $data['section'] ?? 'media_library',
            'language'    => $data['language'] ?? 'English',
            'status'      => $data['status'] ?? 'draft',
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];
        foreach (['title', 'slug', 'description', 'cover_image', 'category_id', 'section', 'language', 'status'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
            }
        }
        if (empty($fields)) return false;
        $stmt = $this->db->prepare('UPDATE series SET ' . implode(', ', $fields) . ' WHERE id = :id');
        return $stmt->execute($params);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE series SET deleted_at = NOW() WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    /** Assigns/removes an episode's series position. Pass seriesId=null to detach. */
    public function setEpisodePosition(int $contentId, ?int $seriesId, ?int $season, ?int $episode): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE content SET series_id = :series_id, season_number = :season, episode_number = :episode WHERE id = :id'
        );
        return $stmt->execute(['series_id' => $seriesId, 'season' => $season, 'episode' => $episode, 'id' => $contentId]);
    }
}
