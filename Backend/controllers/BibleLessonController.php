<?php

require_once __DIR__ . '/../models/BibleLesson.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

/**
 * Bible Lessons - part of the Children's Ministry build, kept in its own
 * controller/model (not ContentController/Content) since a lesson's
 * shape (ordered sections, key points, reflection questions, related
 * stories/activities) doesn't fit a single content row. Managed by
 * children.manage (separate from content.* - see migration 042).
 */
class BibleLessonController
{
    private BibleLesson $model;

    public function __construct()
    {
        $this->model = new BibleLesson();
    }

    /** GET /api/lessons?topic=&search=&status= */
    public function index(): void
    {
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 20));

        $filters = [
            'topic'  => $_GET['topic'] ?? null,
            'search' => $_GET['search'] ?? null,
        ];

        if (!empty($_GET['status'])) {
            $payload = optional_auth();
            if ($payload && user_has_permission($payload, 'children.manage')) {
                $filters['status'] = $_GET['status'];
            }
        }

        json_ok(['items' => $this->model->all($filters, $limit, ($page - 1) * $limit), 'page' => $page]);
    }

    /** GET /api/lessons/topics */
    public function topics(): void
    {
        json_ok(['items' => $this->model->topics()]);
    }

    /** GET /api/lessons/{slugOrId} - includes sections, related stories, connected activities. */
    public function show(string $slugOrId): void
    {
        $lesson = ctype_digit($slugOrId) ? $this->model->find((int) $slugOrId) : $this->model->findBySlug($slugOrId);
        if (!$lesson) {
            json_error('Lesson not found.', 404);
        }

        $lesson['sections'] = $this->model->sectionsFor((int) $lesson['id']);
        $lesson['related_stories'] = $this->model->storiesFor((int) $lesson['id']);
        $lesson['activities'] = $this->model->activitiesFor((int) $lesson['id']);

        json_ok(['item' => $lesson]);
    }

    /** POST /api/lessons/{id}/progress (auth) - upsert, mirrors BibleStudy::upsertProgress()'s shape. */
    public function updateProgress(int $id): void
    {
        $payload = require_auth();
        $body = get_json_body();
        $status = in_array($body['status'] ?? '', ['not_started', 'in_progress', 'completed'], true) ? $body['status'] : 'in_progress';
        $percent = max(0, min(100, (int) ($body['progress_percent'] ?? 0)));

        require_once __DIR__ . '/../config/database.php';
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'INSERT INTO lesson_progress (user_id, lesson_id, status, progress_percent, completed_at)
             VALUES (:u, :l, :status, :percent, :completed_at)
             ON DUPLICATE KEY UPDATE
                status = VALUES(status), progress_percent = VALUES(progress_percent),
                completed_at = COALESCE(VALUES(completed_at), lesson_progress.completed_at)'
        );
        $stmt->execute([
            'u' => $payload['sub'], 'l' => $id, 'status' => $status, 'percent' => $percent,
            'completed_at' => $status === 'completed' ? date('Y-m-d H:i:s') : null,
        ]);

        json_ok(['status' => $status, 'progress_percent' => $percent]);
    }

    /** POST /api/lessons (requires children.manage) */
    public function store(): void
    {
        $payload = require_permission('children.manage');
        $body = get_json_body();
        if (empty($body['title'])) {
            json_error('Title is required.', 422);
        }
        $body['slug'] = $body['slug'] ?? $this->slugify($body['title']);
        $body['created_by'] = $payload['sub'];

        $id = $this->model->create($body);
        json_created(['id' => $id], 'Lesson created successfully.');
    }

    /** PUT /api/lessons/{id} (requires children.manage) */
    public function update(int $id): void
    {
        require_permission('children.manage');
        if (!$this->model->find($id)) {
            json_error('Lesson not found.', 404);
        }
        $body = get_json_body();
        $this->model->update($id, $body);
        json_ok(null, 'Lesson updated successfully.');
    }

    /** DELETE /api/lessons/{id} (requires children.manage) */
    public function destroy(int $id): void
    {
        require_permission('children.manage');
        if (!$this->model->find($id)) {
            json_error('Lesson not found.', 404);
        }
        $this->model->delete($id);
        json_ok(null, 'Lesson deleted successfully.');
    }

    private function slugify(string $text): string
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $text), '-'));
        return $slug . '-' . substr(uniqid(), -5);
    }
}
