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

    /** GET /api/notifications/admin — the signed-in admin's operational alerts (Store, Contact, Subscriptions, Testimonies, ...) + unread_count. Separate from index()'s general-user feed. */
    public function adminIndex(): void
    {
        $payload = require_role(['admin', 'superadmin']);
        $userId = (int) $payload['sub'];
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 20));

        json_ok([
            'items'         => $this->model->forAdmin($userId, $limit, ($page - 1) * $limit),
            'unread_count'  => $this->model->unreadCountAdmin($userId),
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

    /** POST /api/notifications/read-all — only clears the general user feed; admin alerts are untouched (use markAllReadAdmin). */
    public function markAllRead(): void
    {
        $payload = require_auth();
        $this->model->markAllRead((int) $payload['sub'], 'user');
        json_ok(null, 'All notifications marked as read.');
    }

    /** POST /api/notifications/admin/read-all — only clears the admin operational feed. */
    public function markAllReadAdmin(): void
    {
        $payload = require_role(['admin', 'superadmin']);
        $this->model->markAllRead((int) $payload['sub'], 'admin');
        json_ok(null, 'All notifications marked as read.');
    }
}
