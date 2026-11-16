<?php

require_once __DIR__ . '/../models/Activity.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

/**
 * Bible Activities - quizzes/interactive exercises, optionally tied to a
 * Bible Lesson. See Backend/models/Activity.php for the grading engine;
 * this controller's job is purely request handling + making sure a
 * public request never sees activity_options.is_correct/correct_order/
 * match_value before submission.
 */
class ActivityController
{
    private Activity $model;

    public function __construct()
    {
        $this->model = new Activity();
    }

    /** GET /api/activities?lesson_id=&status= */
    public function index(): void
    {
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 20));

        $filters = ['lesson_id' => $_GET['lesson_id'] ?? null];

        if (!empty($_GET['status'])) {
            $payload = optional_auth();
            if ($payload && user_has_permission($payload, 'children.manage')) {
                $filters['status'] = $_GET['status'];
            }
        }

        json_ok(['items' => $this->model->all($filters, $limit, ($page - 1) * $limit), 'page' => $page]);
    }

    /**
     * GET /api/activities/{slugOrId} - the player's "open this activity"
     * fetch. Public (no auth required to browse/preview an activity),
     * but the question/option payload has every answer-revealing field
     * stripped (Activity::questionsForPlayer()) and a fresh
     * submission_token the client must echo back unchanged on submit.
     */
    public function show(string $slugOrId): void
    {
        $activity = ctype_digit($slugOrId) ? $this->model->find((int) $slugOrId) : $this->model->findBySlug($slugOrId);
        if (!$activity) {
            json_error('Activity not found.', 404);
        }

        $activity['questions'] = $this->model->questionsForPlayer((int) $activity['id']);
        $activity['submission_token'] = bin2hex(random_bytes(24));

        json_ok(['item' => $activity]);
    }

    /** GET /api/activities/{id}/preview (requires children.manage) - full detail with correct answers, for the admin builder. */
    public function preview(int $id): void
    {
        require_permission('children.manage');
        $activity = $this->model->find($id);
        if (!$activity) {
            json_error('Activity not found.', 404);
        }
        $activity['questions'] = $this->model->questionsWithAnswers($id);
        json_ok(['item' => $activity]);
    }

    /**
     * POST /api/activities/{id}/submit (auth required - an attempt is
     * always tied to a real account, there is no anonymous attempt
     * table). Body: {submission_token, answers: {question_id: ...}}.
     */
    public function submit(int $id): void
    {
        $payload = require_auth();
        $activity = $this->model->find($id);
        if (!$activity) {
            json_error('Activity not found.', 404);
        }

        $body = get_json_body();
        $token = trim((string) ($body['submission_token'] ?? ''));
        if ($token === '') {
            json_error('Missing submission token.', 422);
        }
        $answers = is_array($body['answers'] ?? null) ? $body['answers'] : [];

        try {
            $result = $this->model->submit($id, (int) $payload['sub'], $token, $answers);
        } catch (RuntimeException $e) {
            json_error($e->getMessage(), 422);
        }

        json_ok($result);
    }

    /** GET /api/activities/{id}/attempts (auth) - this user's latest/best attempt for one activity. */
    public function myAttempts(int $id): void
    {
        $payload = require_auth();
        json_ok($this->model->attemptsFor((int) $payload['sub'], $id));
    }

    /** GET /api/children/progress (auth) - the child's own simple progress summary across lessons + activities. */
    public function progress(): void
    {
        $payload = require_auth();
        json_ok($this->model->progressSummaryFor((int) $payload['sub']));
    }

    /** POST /api/activities (requires children.manage) */
    public function store(): void
    {
        $payload = require_permission('children.manage');
        $body = get_json_body();
        if (empty($body['title'])) {
            json_error('Title is required.', 422);
        }
        if (empty($body['questions'])) {
            json_error('Add at least one question before saving.', 422);
        }
        $body['slug'] = $body['slug'] ?? $this->slugify($body['title']);
        $body['created_by'] = $payload['sub'];

        $id = $this->model->create($body);
        json_created(['id' => $id], 'Activity created successfully.');
    }

    /** PUT /api/activities/{id} (requires children.manage) */
    public function update(int $id): void
    {
        require_permission('children.manage');
        if (!$this->model->find($id)) {
            json_error('Activity not found.', 404);
        }
        $body = get_json_body();
        $this->model->update($id, $body);
        json_ok(null, 'Activity updated successfully.');
    }

    /** DELETE /api/activities/{id} (requires children.manage) */
    public function destroy(int $id): void
    {
        require_permission('children.manage');
        if (!$this->model->find($id)) {
            json_error('Activity not found.', 404);
        }
        $this->model->delete($id);
        json_ok(null, 'Activity deleted successfully.');
    }

    private function slugify(string $text): string
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $text), '-'));
        return $slug . '-' . substr(uniqid(), -5);
    }
}
