<?php

require_once __DIR__ . '/../models/StockRequest.php';
require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../helpers/shop_notify.php';

/**
 * "Notify me when back in stock" — spec Part A §6. Capturing interest
 * only, never a promise or a charge; see StockRequest::create()'s own
 * docblock.
 */
class StockRequestController
{
    private StockRequest $model;
    private Product $productModel;

    public function __construct()
    {
        $this->model = new StockRequest();
        $this->productModel = new Product();
    }

    /**
     * POST /api/stock-requests — a logged-in customer (guest checkout
     * doesn't exist in this app, so auth is required, same as checkout
     * itself) asking to be notified when a specific product/variant is
     * back in stock.
     * body: {product_id, variant_id?, quantity?, customer_name, customer_phone, notes?}
     */
    public function store(): void
    {
        $payload = require_auth();
        $body = get_json_body();

        $productId = (int) ($body['product_id'] ?? 0);
        $product = $this->productModel->find($productId);
        if (!$product) {
            json_error('Product not found.', 404);
        }

        $variantId = !empty($body['variant_id']) ? (int) $body['variant_id'] : null;
        $variant = null;
        if ($variantId) {
            $variant = $this->productModel->findVariant($variantId);
            if (!$variant || (int) $variant['product_id'] !== $productId) {
                json_error('That option was not found for this product.', 404);
            }
        }

        $customerName = trim($body['customer_name'] ?? '');
        $customerPhone = trim($body['customer_phone'] ?? '');
        if ($customerName === '' || $customerPhone === '') {
            json_error('Please provide a name and phone number so we can reach you.', 422);
        }

        // Prefer the matched variant's real attributes; fall back to
        // whatever the customer had selected on the page when no exact
        // variant exists for that combination (still useful context for
        // the admin, even though nothing was actually matched/reserved).
        $requestedAttributes = $variant['attributes'] ?? (is_array($body['requested_attributes'] ?? null) ? $body['requested_attributes'] : null);

        $id = $this->model->create([
            'product_id' => $productId,
            'variant_id' => $variantId,
            'requested_attributes' => $requestedAttributes,
            'quantity' => max(1, (int) ($body['quantity'] ?? 1)),
            'customer_name' => $customerName,
            'customer_phone' => $customerPhone,
            'user_id' => (int) $payload['sub'],
            'notes' => !empty($body['notes']) ? trim($body['notes']) : null,
        ]);

        notify_shop_admins_event(
            'Stock request received',
            "{$customerName} wants to know when \"{$product['name']}\"" . ($variant ? ' (' . implode(', ', array_values($variant['attributes'] ?? [])) . ')' : '') . ' is back in stock.',
            'order', '/admin/stock-requests'
        );

        json_created(['id' => $id], "We'll let you know as soon as it's back in stock.");
    }

    /** GET /api/stock-requests (requires products.manage) ?status= */
    public function index(): void
    {
        require_permission('products.manage');
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(100, (int) ($_GET['limit'] ?? 50));
        $filters = ['status' => $_GET['status'] ?? null];
        json_ok(['items' => $this->model->all($filters, $limit, ($page - 1) * $limit)]);
    }

    /** POST /api/stock-requests/{id}/status (requires products.manage) body: {status} */
    public function updateStatus(int $id): void
    {
        require_permission('products.manage');
        $body = get_json_body();
        $status = $body['status'] ?? '';

        $request = $this->model->find($id);
        if (!$request) {
            json_error('Stock request not found.', 404);
        }

        if (!$this->model->updateStatus($id, $status)) {
            json_error('Invalid status.', 422);
            return;
        }

        if ($status === 'customer_notified' && $request['user_id']) {
            $product = $this->productModel->find((int) $request['product_id']);
            notify_shop_event(
                (int) $request['user_id'], 'Back in stock!',
                "\"{$product['name']}\" is back in stock — grab it before it runs out again.",
                'order', 'Back In Stock',
                '/shop/' . ($product['slug'] ?? ''), 'Shop Now', $request['customer_phone'], null, 'stock_request_notified'
            );
        }

        json_ok(null, 'Stock request updated.');
    }
}
