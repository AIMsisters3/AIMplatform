<?php

require_once __DIR__ . '/../models/WatchHistory.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class WatchHistoryController
{
    private WatchHistory $model;

    public function __construct()
    {
        $this->model = new WatchHistory();
    }

    /** GET /api/watch-history (auth) — "Continue Watching". */
    public function index(): void
    {
        $payload = require_auth();
        json_ok(['items' => $this->model->continueWatching((int) $payload['sub'])]);
    }

    /** POST /api/watch-history/{contentId} (auth) body: {progress_seconds, duration_seconds?} — called periodically by the player. */
    public function record(int $contentId): void
    {
        $payload = require_auth();
        $body = get_json_body();

        $progress = max(0, (int) ($body['progress_seconds'] ?? 0));
        $duration = isset($body['duration_seconds']) ? max(0, (int) $body['duration_seconds']) : null;

        $entry = $this->model->recordProgress((int) $payload['sub'], $contentId, $progress, $duration);
        json_ok(['entry' => $entry]);
    }
}
