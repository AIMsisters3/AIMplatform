<?php

require_once __DIR__ . '/../models/Series.php';
require_once __DIR__ . '/../models/Content.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../helpers/publish_notify.php';
require_once __DIR__ . '/../middleware/auth.php';

class SeriesController
{
    private Series $model;

    public function __construct()
    {
        $this->model = new Series();
    }

    /** GET /api/series?category_id=&search=&status=&section= */
    public function index(): void
    {
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 12));
        $filters = [
            'category_id' => $_GET['category_id'] ?? null,
            'search'      => $_GET['search'] ?? null,
            // e.g. ?section=bible_study - lets Bible Studies surface only
            // series flagged as belonging there, while the main Series
            // page (no filter) keeps showing every series as before.
            'section'     => $_GET['section'] ?? null,
        ];

        if (!empty($_GET['status'])) {
            $payload = optional_auth();
            if ($payload && user_has_permission($payload, 'content.create')) {
                $filters['status'] = $_GET['status'];
            }
        }

        json_ok(['items' => $this->model->all($filters, $limit, ($page - 1) * $limit)]);
    }

    /** GET /api/series/{slugOrId} — includes its episode list. */
    public function show(string $slugOrId): void
    {
        $series = ctype_digit($slugOrId) ? $this->model->find((int) $slugOrId) : $this->model->findBySlug($slugOrId);
        if (!$series) {
            json_error('Series not found.', 404);
        }
        json_ok(['item' => $series, 'episodes' => $this->model->episodes((int) $series['id'])]);
    }

    /** POST /api/series (requires content.create) */
    public function store(): void
    {
        require_permission('content.create');
        $body = get_json_body();

        if (empty($body['title'])) {
            json_error('Title is required.', 422);
        }
        $body['slug'] = $body['slug'] ?? (strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $body['title']), '-')) . '-' . substr(uniqid(), -5));

        $id = $this->model->create($body);
        json_created(['id' => $id], 'Series created.');
    }

    /** PUT /api/series/{id} (requires content.edit) */
    public function update(int $id): void
    {
        require_permission('content.edit');
        if (!$this->model->find($id)) {
            json_error('Series not found.', 404);
        }
        $this->model->update($id, get_json_body());
        json_ok(null, 'Series updated.');
    }

    /** DELETE /api/series/{id} (requires content.delete) */
    public function destroy(int $id): void
    {
        require_permission('content.delete');
        if (!$this->model->find($id)) {
            json_error('Series not found.', 404);
        }
        $this->model->delete($id);
        json_ok(null, 'Series deleted.');
    }

    /** POST /api/series/{id}/episodes (requires content.edit) body: {content_id, season_number, episode_number} — assigns an existing content item as an episode of this series. */
    public function attachEpisode(int $seriesId): void
    {
        require_permission('content.edit');
        $body = get_json_body();
        $contentId = (int) ($body['content_id'] ?? 0);

        if (!$contentId || !$this->model->find($seriesId)) {
            json_error('A valid content_id and series are required.', 422);
        }

        $this->model->setEpisodePosition(
            $contentId,
            $seriesId,
            isset($body['season_number']) ? (int) $body['season_number'] : 1,
            isset($body['episode_number']) ? (int) $body['episode_number'] : 1
        );

        // Covers the "already published, then attached to a series" order
        // of operations — see maybe_notify_new_episode()'s docblock. Must
        // never break the attach itself if notifying fails.
        try {
            maybe_notify_new_episode(new Content(), $contentId);
        } catch (Throwable $e) {
            error_log('Episode notify failed for content ' . $contentId . ': ' . $e->getMessage());
        }

        json_ok(null, 'Episode attached to series.');
    }

    /** DELETE /api/series/{id}/episodes/{contentId} (requires content.edit) — detaches an episode without deleting the underlying content item. */
    public function detachEpisode(int $seriesId, int $contentId): void
    {
        require_permission('content.edit');
        if (!$this->model->find($seriesId)) {
            json_error('Series not found.', 404);
        }
        $this->model->setEpisodePosition($contentId, null, null, null);
        json_ok(null, 'Episode removed from series.');
    }
}
