<?php

require_once __DIR__ . '/../models/ReadingPlan.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../middleware/auth.php';

class ReadingPlanController
{
    private ReadingPlan $model;

    public function __construct()
    {
        $this->model = new ReadingPlan();
    }

    /** GET /api/reading-plans?status= */
    public function index(): void
    {
        $filters = [];
        if (!empty($_GET['status'])) {
            $payload = optional_auth();
            if ($payload && user_has_permission($payload, 'content.create')) {
                $filters['status'] = $_GET['status'];
            }
        }
        json_ok(['items' => $this->model->all($filters, 50, 0)]);
    }

    /** GET /api/reading-plans/{slugOrId} — plan + days, + the signed-in viewer's own progress if any. */
    public function show(string $slugOrId): void
    {
        $plan = ctype_digit($slugOrId) ? $this->model->find((int) $slugOrId) : $this->model->findBySlug($slugOrId);
        if (!$plan) {
            json_error('Reading plan not found.', 404);
        }

        $progress = null;
        $payload = optional_auth();
        if ($payload) {
            $progress = $this->model->getProgress((int) $payload['sub'], (int) $plan['id']);
            if ($progress) {
                $progress['current_day'] = (int) $progress['current_day'];
            }
        }

        json_ok(['item' => $plan, 'days' => $this->model->days((int) $plan['id']), 'progress' => $progress]);
    }

    /** POST /api/reading-plans (requires content.create) body: {title, description?, cover_image?, status?, days: [...]} */
    public function store(): void
    {
        require_permission('content.create');
        $body = get_json_body();

        if (empty($body['title'])) {
            json_error('Title is required.', 422);
        }
        $body['slug'] = $body['slug'] ?? (strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $body['title']), '-')) . '-' . substr(uniqid(), -5));

        $id = $this->model->create($body);
        if (!empty($body['days']) && is_array($body['days'])) {
            $this->model->saveDays($id, $body['days']);
        }
        json_created(['id' => $id], 'Reading plan created.');
    }

    /** PUT /api/reading-plans/{id} (requires content.edit) — body may include a `days` array, which replaces the whole schedule. */
    public function update(int $id): void
    {
        require_permission('content.edit');
        if (!$this->model->find($id)) {
            json_error('Reading plan not found.', 404);
        }
        $body = get_json_body();
        $this->model->update($id, $body);
        if (isset($body['days']) && is_array($body['days'])) {
            $this->model->saveDays($id, $body['days']);
        }
        json_ok(null, 'Reading plan updated.');
    }

    /** DELETE /api/reading-plans/{id} (requires content.delete) */
    public function destroy(int $id): void
    {
        require_permission('content.delete');
        if (!$this->model->find($id)) {
            json_error('Reading plan not found.', 404);
        }
        $this->model->delete($id);
        json_ok(null, 'Reading plan deleted.');
    }

    /** POST /api/reading-plans/{id}/progress (signed-in) body: {day_number} — marks that day complete, advancing the viewer's own progress. Auto-starts the plan on its first call. */
    public function completeDay(int $id): void
    {
        $payload = require_auth();
        $plan = $this->model->find($id);
        if (!$plan) {
            json_error('Reading plan not found.', 404);
        }
        $body = get_json_body();
        $dayNumber = (int) ($body['day_number'] ?? 0);
        if ($dayNumber < 1) {
            json_error('A valid day_number is required.', 422);
        }

        $progress = $this->model->completeDay((int) $payload['sub'], $id, (int) $plan['duration_days'], $dayNumber);
        json_ok(['progress' => $progress]);
    }
}
