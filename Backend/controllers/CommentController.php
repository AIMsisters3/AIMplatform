<?php

require_once __DIR__ . '/../models/Comment.php';
require_once __DIR__ . '/../models/Content.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

class CommentController
{
    private Comment $model;
    private Content $contentModel;

    public function __construct()
    {
        $this->model = new Comment();
        $this->contentModel = new Content();
    }

    /** GET /api/content/{id}/comments - public; shows liked_by_me if signed in */
    public function index(int $contentId): void
    {
        $payload = optional_auth();
        $userId = $payload['sub'] ?? null;
        json_ok(['items' => $this->model->forContent($contentId, $userId ? (int) $userId : null)]);
    }

    /** POST /api/content/{id}/comments (auth required) body: {body, parent_id?} */
    public function store(int $contentId): void
    {
        $payload = require_auth();
        $body = get_json_body();

        $text = trim($body['body'] ?? '');
        if ($text === '') {
            json_error('Comment text is required.', 422);
        }
        if (mb_strlen($text) > 2000) {
            json_error('Comment is too long (max 2000 characters).', 422);
        }

        $content = $this->contentModel->find($contentId);
        if (!$content) {
            json_error('Content not found.', 404);
        }
        if (!$content['allow_comments']) {
            json_error('Comments are disabled for this content.', 403);
        }

        $parentId = isset($body['parent_id']) ? (int) $body['parent_id'] : null;
        if ($parentId) {
            $parent = $this->model->find($parentId);
            if (!$parent || (int) $parent['content_id'] !== $contentId) {
                json_error('Invalid parent comment.', 422);
            }
        }

        $id = $this->model->create($contentId, (int) $payload['sub'], $text, $parentId);
        json_created(['id' => $id], 'Comment posted.');
    }

    /** GET /api/comments/moderation?status=pending|spam|approved (requires comments.moderate) */
    public function moderationQueue(): void
    {
        require_permission('comments.moderate');
        $requestedStatus = $_GET['status'] ?? 'pending';
        $status = in_array($requestedStatus, ['pending', 'spam', 'approved'], true)
            ? $requestedStatus
            : 'pending';
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 25));

        json_ok(['items' => $this->model->forModeration($status, $limit, ($page - 1) * $limit)]);
    }

    /** POST /api/comments/{id}/status (requires comments.moderate) body: {status: approved|spam|pending} */
    public function updateStatus(int $id): void
    {
        require_permission('comments.moderate');
        $body = get_json_body();
        $status = $body['status'] ?? '';

        if (!in_array($status, ['approved', 'spam', 'pending'], true)) {
            json_error('status must be approved, spam, or pending.', 422);
        }
        if (!$this->model->find($id)) {
            json_error('Comment not found.', 404);
        }

        $this->model->updateStatus($id, $status);
        json_ok(null, 'Comment status updated.');
    }

    /** POST /api/comments/{id}/like (auth required) */
    public function like(int $id): void
    {
        $payload = require_auth();
        if (!$this->model->find($id)) {
            json_error('Comment not found.', 404);
        }
        json_ok($this->model->toggleLike($id, (int) $payload['sub']));
    }

    /** DELETE /api/comments/{id} (owner or admin) */
    public function destroy(int $id): void
    {
        $payload = require_auth();
        $comment = $this->model->find($id);

        if (!$comment) {
            json_error('Comment not found.', 404);
        }
        $isOwner = (int) $comment['user_id'] === (int) $payload['sub'];
        $canModerate = user_has_permission($payload, 'comments.delete_any');

        if (!$isOwner && !$canModerate) {
            json_error('You cannot delete this comment.', 403);
        }

        $this->model->delete($id);
        json_ok(null, 'Comment deleted.');
    }
}