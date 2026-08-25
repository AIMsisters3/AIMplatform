<?php

require_once __DIR__ . '/../models/Bookmark.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class BookmarkController
{
    private Bookmark $model;

    public function __construct()
    {
        $this->model = new Bookmark();
    }

    /** GET /api/bookmarks?type= (auth) — the signed-in user's saved content. */
    public function index(): void
    {
        $payload = require_auth();
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 24));
        json_ok(['items' => $this->model->forUser((int) $payload['sub'], $_GET['type'] ?? null, $limit, ($page - 1) * $limit)]);
    }

    /** POST /api/bookmarks/{contentId} (auth) — toggles the bookmark. */
    public function toggle(int $contentId): void
    {
        $payload = require_auth();
        json_ok($this->model->toggle((int) $payload['sub'], $contentId));
    }
}
