<?php

require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class NotificationController
{
    private Notification $model;

    public function __construct()
    {
        $this->model = new Notification();
    }

    /** GET /api/notifications — the signed-in user's own notifications + unread_count. */
    public function index(): void
    {
        $payload = require_auth();
        $userId = (int) $payload['sub'];
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 20));

        json_ok([
            'items'         => $this->model->forUser($userId, $limit, ($page - 1) * $limit),
            'unread_count'  => $this->model->unreadCount($userId),
        ]);
    }

    /** POST /api/notifications/{id}/read */
    public function markRead(int $id): void
    {
        $payload = require_auth();
        $ok = $this->model->markRead($id, (int) $payload['sub']);

        if (!$ok) {
            json_error('Notification not found.', 404);
        }
        json_ok(null, 'Marked as read.');
    }

    /** POST /api/notifications/read-all */
    public function markAllRead(): void
    {
        $payload = require_auth();
        $this->model->markAllRead((int) $payload['sub']);
        json_ok(null, 'All notifications marked as read.');
    }
}
