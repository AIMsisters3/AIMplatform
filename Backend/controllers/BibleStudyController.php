<?php

require_once __DIR__ . '/../models/BibleStudy.php';
require_once __DIR__ . '/../models/Setting.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../helpers/visitor.php';

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
            'is_live'     => $_GET['live'] ?? null,
        ];

        if (!empty($_GET['status'])) {
            $payload = optional_auth();
            if ($payload && (user_has_permission($payload, 'content.create') || user_has_permission($payload, 'content.edit'))) {
                $filters['status'] = $_GET['status'];
            }
        }

        json_ok(['items' => $this->model->all($filters, $limit, ($page - 1) * $limit), 'page' => $page]);
    }

    /** GET /api/bible-studies/featured?limit= — the Bible Studies page's own "Featured Studies" row (most liked/viewed). */
    public function featured(): void
    {
        $settings = (new Setting())->bibleStudyFeaturedSettings();
        $limit = min(20, max(1, (int) ($_GET['limit'] ?? $settings['limit'])));
        json_ok(['items' => $this->model->featuredRanked($limit, $settings['min_views'], $settings['min_likes'])]);
    }

    /** GET /api/bible-studies/featured-admin (requires content.edit) — every published study's engagement, for the Featured Studies management screen. */
    public function featuredAdmin(): void
    {
        require_permission('content.edit');
        json_ok(['items' => $this->model->featuredAdmin()]);
    }

    /** POST /api/bible-studies/{id}/featured-exclude (requires content.edit) body: {excluded: bool} */
    public function setFeaturedExcluded(int $contentId): void
    {
        require_permission('content.edit');
        $body = get_json_body();
        $this->model->setFeaturedExcluded($contentId, !empty($body['excluded']));
        json_ok(null, 'Updated.');
    }

    /** POST /api/bible-studies/{id}/featured-pin (requires content.edit) body: {hours: int|null} — null/omitted clears the pin. */
    public function setFeaturedPin(int $contentId): void
    {
        require_permission('content.edit');
        $body = get_json_body();
        $hours = isset($body['hours']) ? (int) $body['hours'] : null;
        $until = $hours && $hours > 0 ? date('Y-m-d H:i:s', time() + $hours * 3600) : null;
        $this->model->setFeaturedPin($contentId, $until);
        json_ok(['pinned_until' => $until], $until ? 'Pinned.' : 'Pin cleared.');
    }

    /**
     * GET /api/bible-studies/latest?limit=&exclude=1,2,3 — the Bible
     * Studies page's "Latest Studies" row: newest standalone uploads (no
     * series, so they have no collection card to be found through),
     * minus whatever the page already rendered in Featured ($exclude),
     * so a study never shows up twice on the same page.
     */
    public function latest(): void
    {
        $limit = min(20, max(1, (int) ($_GET['limit'] ?? 8)));
        $exclude = array_filter(array_map('intval', explode(',', (string) ($_GET['exclude'] ?? ''))));
        json_ok(['items' => $this->model->latestStandalone($limit, $exclude)]);
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

        $payload = optional_auth();
        $userId = $payload['sub'] ?? null;
        $visitorKey = $userId ? 'user:' . $userId : 'guest:' . get_visitor_key();

        $item = ctype_digit($slugOrId)
            ? $contentModel->find((int) $slugOrId, $visitorKey)
            : $contentModel->findBySlug($slugOrId, $visitorKey);

        if (!$item || $item['content_type'] !== 'bible_study') {
            json_error('Bible study not found.', 404);
        }

        $study = $this->model->findByContentId((int) $item['id'], $visitorKey);

        $contentModel->recordView((int) $item['id'], $visitorKey, $userId ? (int) $userId : null);

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

    /** POST /api/bible-studies/{id}/notes (auth) body: {body, title?} */
    public function createNote(int $contentId): void
    {
        $payload = require_auth();
        $requestBody = get_json_body();
        $body = trim($requestBody['body'] ?? '');

        if ($body === '') {
            json_error('Note text is required.', 422);
        }
        if (mb_strlen($body) > 20000) {
            json_error('Note is too long (max 20,000 characters).', 422);
        }

        $title = trim((string) ($requestBody['title'] ?? '')) ?: null;

        $id = $this->model->createNote((int) $payload['sub'], $contentId, $body, $title);
        json_created(['id' => $id], 'Note saved.');
    }
}
