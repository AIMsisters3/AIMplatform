<?php

require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

class ProductController
{
    private Product $model;

    public function __construct()
    {
        $this->model = new Product();
    }

    /** GET /api/products?category_id=&search=&min_price=&max_price=&page= */
    public function index(): void
    {
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 12));

        $filters = [
            'category_id' => $_GET['category_id'] ?? null,
            'search'      => $_GET['search'] ?? null,
            'min_price'   => $_GET['min_price'] ?? null,
            'max_price'   => $_GET['max_price'] ?? null,
        ];

        $items = $this->model->all($filters, $limit, ($page - 1) * $limit);
        json_ok(['items' => $items, 'page' => $page, 'limit' => $limit]);
    }

    /** GET /api/products/{id} */
    public function show(int $id): void
    {
        $product = $this->model->find($id);
        if (!$product) {
            json_error('Product not found.', 404);
        }

        $related = $product['category_id']
            ? $this->model->related($id, (int) $product['category_id'])
            : [];

        json_ok(['item' => $product, 'related' => $related]);
    }

    /** POST /api/products (admin only) */
    public function store(): void
    {
        require_permission('products.manage');
        $body = get_json_body();

        if (empty($body['name']) || !isset($body['price'])) {
            json_error('Name and price are required.', 422);
        }

        $body['slug'] = $body['slug'] ?? strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $body['name']), '-')) . '-' . substr(uniqid(), -5);

        $id = $this->model->create($body);
        json_created(['id' => $id], 'Product created successfully.');
    }

    /** PUT /api/products/{id} (admin only) */
    public function update(int $id): void
    {
        require_permission('products.manage');
        $body = get_json_body();

        if (!$this->model->find($id)) {
            json_error('Product not found.', 404);
        }

        $this->model->update($id, $body);
        json_ok(null, 'Product updated successfully.');
    }

    /** DELETE /api/products/{id} (admin only) */
    public function destroy(int $id): void
    {
        require_permission('products.manage');

        if (!$this->model->find($id)) {
            json_error('Product not found.', 404);
        }

        $this->model->delete($id);
        json_ok(null, 'Product deleted successfully.');
    }
}
