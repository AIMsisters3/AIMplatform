<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/media_url.php';

/**
 * Backs reading_plans / reading_plan_days / reading_plan_progress
 * (migration 043). A reading plan is a standalone daily-reading
 * schedule - deliberately NOT tied to the content/series tables, since
 * the redesign spec is explicit that this is "a separate learning
 * feature", not dependent on any audio/PDF upload.
 */
class ReadingPlan
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    private static function normalizeCover(array $row): array
    {
        if (array_key_exists('cover_image', $row)) {
            $row['cover_image'] = normalize_media_url($row['cover_image']);
        }
        return $row;
    }

    /** @param array $filters status */
    public function all(array $filters = [], int $limit = 50, int $offset = 0): array
    {
        $where = ['p.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $where[] = 'p.status = :status';
            $params['status'] = $filters['status'];
        } elseif (empty($filters['status'])) {
            $where[] = "p.status = 'published'";
        }

        $sql = "SELECT p.*,
                    (SELECT COUNT(*) FROM reading_plan_days d WHERE d.reading_plan_id = p.id) AS day_count
                FROM reading_plans p
                WHERE " . implode(' AND ', $where) . '
                ORDER BY p.order_index ASC, p.created_at ASC
                LIMIT :limit OFFSET :offset';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return array_map(fn ($row) => self::normalizeCover($row), $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM reading_plans WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::normalizeCover($row) : null;
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM reading_plans WHERE slug = :slug AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        return $row ? self::normalizeCover($row) : null;
    }

    public function days(int $planId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM reading_plan_days WHERE reading_plan_id = :id ORDER BY day_number ASC');
        $stmt->execute(['id' => $planId]);
        return $stmt->fetchAll();
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO reading_plans (title, slug, description, cover_image, duration_days, status, order_index)
             VALUES (:title, :slug, :description, :cover_image, :duration_days, :status, :order_index)'
        );
        $stmt->execute([
            'title'         => $data['title'],
            'slug'          => $data['slug'],
            'description'   => $data['description'] ?? null,
            'cover_image'   => $data['cover_image'] ?? null,
            'duration_days' => max(1, (int) ($data['duration_days'] ?? 1)),
            'status'        => $data['status'] ?? 'draft',
            'order_index'   => (int) ($data['order_index'] ?? 0),
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];
        $map = [
            'title' => 'title', 'slug' => 'slug', 'description' => 'description',
            'cover_image' => 'cover_image', 'status' => 'status', 'order_index' => 'order_index',
        ];
        foreach ($map as $field => $column) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$column = :$column";
                $params[$column] = $data[$field];
            }
        }
        if (array_key_exists('duration_days', $data)) {
            $fields[] = 'duration_days = :duration_days';
            $params['duration_days'] = max(1, (int) $data['duration_days']);
        }
        if (empty($fields)) return false;
        $stmt = $this->db->prepare('UPDATE reading_plans SET ' . implode(', ', $fields) . ' WHERE id = :id');
        return $stmt->execute($params);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE reading_plans SET deleted_at = NOW() WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    /**
     * Replaces every day of this plan with $days in one go (delete + bulk
     * insert) - same "whole set, one form" pattern as Activity's question
     * builder, rather than incremental per-day CRUD endpoints. Also
     * updates duration_days to match the day count actually saved, so the
     * two never drift apart.
     *
     * @param array $days each: {day_number?, title?, bible_references?, body?}
     */
    public function saveDays(int $planId, array $days): void
    {
        $this->db->beginTransaction();
        try {
            $del = $this->db->prepare('DELETE FROM reading_plan_days WHERE reading_plan_id = :id');
            $del->execute(['id' => $planId]);

            $insert = $this->db->prepare(
                'INSERT INTO reading_plan_days (reading_plan_id, day_number, title, bible_references, body)
                 VALUES (:plan_id, :day_number, :title, :bible_references, :body)'
            );
            $dayNumber = 0;
            foreach ($days as $day) {
                $dayNumber++;
                $insert->execute([
                    'plan_id'          => $planId,
                    'day_number'       => (int) ($day['day_number'] ?? $dayNumber),
                    'title'            => $day['title'] ?? null,
                    'bible_references' => $day['bible_references'] ?? null,
                    'body'             => $day['body'] ?? null,
                ]);
            }

            $upd = $this->db->prepare('UPDATE reading_plans SET duration_days = :n WHERE id = :id');
            $upd->execute(['n' => max(1, count($days)), 'id' => $planId]);

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    // ---------------------------------------------------------
    // Progress (per-user)
    // ---------------------------------------------------------

    public function getProgress(int $userId, int $planId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM reading_plan_progress WHERE user_id = :u AND reading_plan_id = :p LIMIT 1');
        $stmt->execute(['u' => $userId, 'p' => $planId]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Marks $dayNumber complete and advances current_day - only accepts
     * the viewer's actual next day (never lets a stale/out-of-order
     * request skip ahead), auto-starting the plan on first call. Setting
     * completed_at once the final day is passed is idempotent - calling
     * this again after completion with the same (now out-of-range) day
     * number simply has no effect, since $dayNumber will never match a
     * current_day that's already past duration_days.
     */
    public function completeDay(int $userId, int $planId, int $durationDays, int $dayNumber): array
    {
        $progress = $this->getProgress($userId, $planId);
        $currentDay = $progress ? (int) $progress['current_day'] : 1;

        if ($dayNumber !== $currentDay || $currentDay > $durationDays) {
            return $this->normalizeProgress($progress) ?? ['current_day' => $currentDay, 'completed_at' => null];
        }

        $nextDay = $currentDay + 1;
        $completedAt = $nextDay > $durationDays ? date('Y-m-d H:i:s') : null;

        $stmt = $this->db->prepare(
            'INSERT INTO reading_plan_progress (user_id, reading_plan_id, current_day, completed_at)
             VALUES (:u, :p, :day, :completed_at)
             ON DUPLICATE KEY UPDATE current_day = VALUES(current_day), completed_at = VALUES(completed_at)'
        );
        $stmt->execute(['u' => $userId, 'p' => $planId, 'day' => $nextDay, 'completed_at' => $completedAt]);

        return $this->normalizeProgress($this->getProgress($userId, $planId));
    }

    private function normalizeProgress(?array $progress): ?array
    {
        if (!$progress) return null;
        $progress['current_day'] = (int) $progress['current_day'];
        return $progress;
    }
}
