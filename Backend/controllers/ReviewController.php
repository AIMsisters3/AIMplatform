<?php

require_once __DIR__ . '/../models/Review.php';
require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

class ReviewController
{
    private Review $model;
    private Product $productModel;

    public function __construct()
    {
        $this->model = new Review();
        $this->productModel = new Product();
    }

    /** GET /api/products/{id}/reviews — public; approved reviews + rating summary. */
    public function forProduct(int $productId): void
    {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 20));
        json_ok([
            'items'   => $this->model->forProduct($productId, $limit, ($page - 1) * $limit),
            'summary' => $this->model->summaryForProduct($productId),
        ]);
    }

    /** GET /api/products/{id}/reviews/eligibility — auth required; can the signed-in user review this product? */
    public function eligibility(int $productId): void
    {
        $payload = require_auth();
        $userId = (int) $payload['sub'];

        $existing = $this->model->findByProductAndUser($productId, $userId);
        if ($existing) {
            json_ok(['eligible' => false, 'reason' => 'already_reviewed', 'existing_review' => $existing]);
            return;
        }

        $eligible = $this->model->findEligibleOrderItem($userId, $productId);
        json_ok(['eligible' => (bool) $eligible, 'reason' => $eligible ? null : 'no_verified_purchase']);
    }

    /** POST /api/products/{id}/reviews (auth required) body: {rating, review?} */
    public function store(int $productId): void
    {
        $payload = require_auth();
        if (!$this->productModel->find($productId)) {
            json_error('Product not found.', 404);
        }

        $body = get_json_body();
        $rating = (int) ($body['rating'] ?? 0);
        $reviewText = isset($body['review']) ? trim((string) $body['review']) : null;
        if ($reviewText !== null && mb_strlen($reviewText) > 2000) {
            json_error('Review is too long (max 2000 characters).', 422);
        }

        try {
            $id = $this->model->create($productId, (int) $payload['sub'], $rating, $reviewText ?: null);
        } catch (ReviewException $e) {
            json_error($e->getMessage(), 422);
            return;
        }

        json_created(['id' => $id], 'Review submitted and awaiting moderation.');
    }

    /** GET /api/reviews/moderation?status=pending|approved|rejected (requires products.manage) */
    public function moderationQueue(): void
    {
        require_permission('products.manage');
        $requestedStatus = $_GET['status'] ?? 'pending';
        $status = in_array($requestedStatus, ['pending', 'approved', 'rejected'], true) ? $requestedStatus : 'pending';
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 25));

        json_ok(['items' => $this->model->forModeration($status, $limit, ($page - 1) * $limit)]);
    }

    /** POST /api/reviews/{id}/status (requires products.manage) body: {status: approved|rejected|pending} */
    public function updateStatus(int $id): void
    {
        require_permission('products.manage');
        $body = get_json_body();
        $status = $body['status'] ?? '';

        if (!$this->model->find($id)) {
            json_error('Review not found.', 404);
        }
        if (!$this->model->updateStatus($id, $status)) {
            json_error('status must be approved, rejected, or pending.', 422);
            return;
        }

        json_ok(null, 'Review status updated.');
    }

    /** POST /api/reviews/{id}/respond (requires products.manage) body: {response} */
    public function respond(int $id): void
    {
        $payload = require_permission('products.manage');
        $body = get_json_body();
        $response = trim($body['response'] ?? '');

        if ($response === '') {
            json_error('A response is required.', 422);
        }
        if (!$this->model->find($id)) {
            json_error('Review not found.', 404);
        }

        $this->model->respond($id, (int) $payload['sub'], $response);
        json_ok(null, 'Response posted.');
    }

    /** DELETE /api/reviews/{id} (owner or products.manage) */
    public function destroy(int $id): void
    {
        $payload = require_auth();
        $review = $this->model->find($id);
        if (!$review) {
            json_error('Review not found.', 404);
        }
        $isOwner = (int) $review['user_id'] === (int) $payload['sub'];
        if (!$isOwner && !user_has_permission($payload, 'products.manage')) {
            json_error('You cannot delete this review.', 403);
        }

        $this->model->delete($id);
        json_ok(null, 'Review deleted.');
    }
}
