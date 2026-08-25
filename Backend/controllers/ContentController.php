<?php

require_once __DIR__ . '/../models/Content.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

class ContentController
{
    private Content $model;

    public function __construct()
    {
        $this->model = new Content();
    }

    /** GET /api/content?type=&category_id=&search=&featured=&page=&status= */
    public function index(): void
    {
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 12));

        $filters = [
            'content_type' => $_GET['type'] ?? null,
            'category_id'  => $_GET['category_id'] ?? null,
            'search'       => $_GET['search'] ?? null,
            'is_featured'  => $_GET['featured'] ?? null,
        ];

        // "status" (including the special "all" value used by the admin's Manage
        // Content screen) is only honored for signed-in accounts that can
        // create/edit/publish content. Anyone else always gets the model's
        // default published-only filter, regardless of what they pass.
        if (!empty($_GET['status'])) {
            $payload = optional_auth();
            if ($payload && (
                user_has_permission($payload, 'content.create')
                || user_has_permission($payload, 'content.edit')
                || user_has_permission($payload, 'content.publish')
            )) {
                $filters['status'] = $_GET['status'];
            }
        }

        $items = $this->model->all($filters, $limit, ($page - 1) * $limit);
        json_ok(['items' => $items, 'page' => $page, 'limit' => $limit]);
    }

    /** GET /api/content/{slug} */
    public function show(string $slugOrId): void
    {
        $item = ctype_digit($slugOrId)
            ? $this->model->find((int) $slugOrId)
            : $this->model->findBySlug($slugOrId);

        if (!$item) {
            json_error('Content not found.', 404);
        }

        $this->model->incrementViews((int) $item['id']);
        json_ok(['item' => $item]);
    }

    /** POST /api/content (requires content.create) */
    public function store(): void
    {
        $payload = require_permission('content.create');
        $body = get_json_body();

        // Only someone who can also publish content is allowed to create it
        // already published/scheduled — an Editor without content.publish
        // is limited to draft/review, matching the workflow in spec §56.
        if (!empty($body['status']) && $body['status'] !== 'draft' && !user_has_permission($payload, 'content.publish')) {
            json_error('You can save this as a draft, but you do not have permission to publish content.', 403);
        }

        if (empty($body['title']) || empty($body['content_type'])) {
            json_error('Title and content_type are required.', 422);
        }

        $body['slug'] = $body['slug'] ?? $this->slugify($body['title']);
        $body['author_id'] = $payload['sub'];

        $id = $this->model->create($body);
        json_created(['id' => $id], 'Content created successfully.');
    }

    /** PUT /api/content/{id} (requires content.edit; publishing/status changes also require content.publish) */
    public function update(int $id): void
    {
        $payload = require_permission('content.edit');
        $body = get_json_body();

        $existing = $this->model->find($id);
        if (!$existing) {
            json_error('Content not found.', 404);
        }

        if (
            array_key_exists('status', $body)
            && $body['status'] !== $existing['status']
            && !user_has_permission($payload, 'content.publish')
        ) {
            json_error('You do not have permission to change content status.', 403);
        }
        if (
            array_key_exists('is_featured', $body)
            && !user_has_permission($payload, 'content.feature')
        ) {
            json_error('You do not have permission to feature content.', 403);
        }

        $this->model->update($id, $body);
        json_ok(null, 'Content updated successfully.');
    }

    /** DELETE /api/content/{id} (requires content.delete) */
    public function destroy(int $id): void
    {
        require_permission('content.delete');

        if (!$this->model->find($id)) {
            json_error('Content not found.', 404);
        }

        $this->model->delete($id);
        json_ok(null, 'Content deleted successfully.');
    }

    /** POST /api/content/{id}/duplicate (requires content.create) */
    public function duplicate(int $id): void
    {
        require_permission('content.create');
        $newId = $this->model->duplicate($id);

        if (!$newId) {
            json_error('Content not found.', 404);
        }

        json_created(['id' => $newId], 'Content duplicated successfully.');
    }

    /** POST /api/content/bulk body: {action: delete|publish|archive, ids:[]} */
    public function bulk(): void
    {
        $body = get_json_body();
        $ids = array_map('intval', $body['ids'] ?? []);
        $action = $body['action'] ?? '';

        if (empty($ids) || empty($action)) {
            json_error('action and ids[] are required.', 422);
        }

        // Deleting and publishing/archiving are different capabilities —
        // an Editor can bulk-publish without being able to bulk-delete.
        $requiredPermission = $action === 'delete' ? 'content.delete' : 'content.publish';
        require_permission($requiredPermission);

        match ($action) {
            'delete'  => $this->model->bulkDelete($ids),
            'publish' => $this->model->bulkUpdateStatus($ids, 'published'),
            'archive' => $this->model->bulkUpdateStatus($ids, 'archived'),
            default   => json_error('Unknown bulk action.', 422),
        };

        json_ok(null, 'Bulk action completed.');
    }

    private function slugify(string $text): string
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $text), '-'));
        return $slug . '-' . substr(uniqid(), -5);
    }
}
