<?php

require_once __DIR__ . '/../models/BibleStudy.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

class BibleStudyController
{
    private BibleStudy $model;

    public function __construct()
    {
        $this->model = new BibleStudy();
    }

    /** GET /api/bible-studies?format=&category_id=&language=&search=&status= */
    public function index(): void
    {
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 12));

        $filters = [
            'format'      => $_GET['format'] ?? null,
            'category_id' => $_GET['category_id'] ?? null,
            'language'    => $_GET['language'] ?? null,
            'search'      => $_GET['search'] ?? null,
        ];

        if (!empty($_GET['status'])) {
            $payload = optional_auth();
            if ($payload && (user_has_permission($payload, 'content.create') || user_has_permission($payload, 'content.edit'))) {
                $filters['status'] = $_GET['status'];
            }
        }

        json_ok(['items' => $this->model->all($filters, $limit, ($page - 1) * $limit), 'page' => $page]);
    }

    /** GET /api/bible-studies/continue (auth) — "Continue Studying" for the signed-in user. */
    public function continueStudying(): void
    {
        $payload = require_auth();
        json_ok(['items' => $this->model->continueStudying((int) $payload['sub'])]);
    }

    /** GET /api/bible-studies/{slugOrId} — includes the signed-in user's progress, if any. */
    public function show(string $slugOrId): void
    {
        require_once __DIR__ . '/../models/Content.php';
        $contentModel = new Content();
        $item = ctype_digit($slugOrId) ? $contentModel->find((int) $slugOrId) : $contentModel->findBySlug($slugOrId);

        if (!$item || $item['content_type'] !== 'bible_study') {
            json_error('Bible study not found.', 404);
        }

        $study = $this->model->findByContentId((int) $item['id']);
        $contentModel->incrementViews((int) $item['id']);

        $payload = optional_auth();
        $progress = $payload ? $this->model->getProgress((int) $payload['sub'], (int) $item['id']) : null;

        json_ok(['item' => $study, 'progress' => $progress]);
    }

    /** GET /api/bible-studies/{id}/progress (auth, own) */
    public function getProgress(int $contentId): void
    {
        $payload = require_auth();
        json_ok(['progress' => $this->model->getProgress((int) $payload['sub'], $contentId)]);
    }

    /** POST /api/bible-studies/{id}/progress (auth) body: {status, progress_percent, last_position_seconds} */
    public function updateProgress(int $contentId): void
    {
        $payload = require_auth();
        $body = get_json_body();

        $status = in_array($body['status'] ?? '', ['not_started', 'in_progress', 'completed'], true)
            ? $body['status']
            : 'in_progress';

        $progress = $this->model->upsertProgress(
            (int) $payload['sub'],
            $contentId,
            $status,
            (int) ($body['progress_percent'] ?? 0),
            (int) ($body['last_position_seconds'] ?? 0)
        );

        json_ok(['progress' => $progress], 'Progress saved.');
    }

    /** GET /api/bible-studies/{id}/notes (auth, own only) */
    public function listNotes(int $contentId): void
    {
        $payload = require_auth();
        json_ok(['items' => $this->model->notesFor((int) $payload['sub'], $contentId)]);
    }

    /** POST /api/bible-studies/{id}/notes (auth) body: {body} */
    public function createNote(int $contentId): void
    {
        $payload = require_auth();
        $body = trim((get_json_body())['body'] ?? '');

        if ($body === '') {
            json_error('Note text is required.', 422);
        }
        if (mb_strlen($body) > 5000) {
            json_error('Note is too long (max 5000 characters).', 422);
        }

        $id = $this->model->createNote((int) $payload['sub'], $contentId, $body);
        json_created(['id' => $id], 'Note saved.');
    }
}
