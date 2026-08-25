<?php

require_once __DIR__ . '/../models/Testimonial.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

class TestimonialController
{
    private Testimonial $model;

    public function __construct()
    {
        $this->model = new Testimonial();
    }

    /** GET /api/testimonials - public, approved only */
    public function index(): void
    {
        $limit = min(12, (int) ($_GET['limit'] ?? 3));
        json_ok(['items' => $this->model->approved($limit)]);
    }

    /** POST /api/testimonials (auth required) body: {body} */
    public function store(): void
    {
        $payload = require_auth();
        $body = get_json_body();
        $text = trim($body['body'] ?? '');

        if ($text === '') {
            json_error('Please write your testimony before submitting.', 422);
        }
        if (strlen($text) > 2000) {
            json_error('Testimony is too long (max 2000 characters).', 422);
        }

        $id = $this->model->create((int) $payload['sub'], $text);
        json_created(['id' => $id], 'Thank you! Your testimony has been submitted for review.');
    }

    /** GET /api/testimonials/admin?status= (admin only) */
    public function adminIndex(): void
    {
        require_permission('testimonials.manage');
        $status = $_GET['status'] ?? null;
        json_ok(['items' => $this->model->all($status)]);
    }

    /** POST /api/testimonials/{id}/approve (admin only) */
    public function approve(int $id): void
    {
        require_permission('testimonials.manage');
        $this->model->updateStatus($id, 'approved');
        json_ok(null, 'Testimony approved.');
    }

    /** POST /api/testimonials/{id}/reject (admin only) */
    public function reject(int $id): void
    {
        require_permission('testimonials.manage');
        $this->model->updateStatus($id, 'rejected');
        json_ok(null, 'Testimony rejected.');
    }

    /** DELETE /api/testimonials/{id} (admin only) */
    public function destroy(int $id): void
    {
        require_permission('testimonials.manage');
        $this->model->delete($id);
        json_ok(null, 'Testimony deleted.');
    }
}