<?php

require_once __DIR__ . '/../models/Order.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../lib/Payments/PaymentGatewayFactory.php';

use AIMsisters\Payments\PaymentGatewayFactory;

class OrderController
{
    private Order $model;

    public function __construct()
    {
        $this->model = new Order();
    }

    /** GET /api/orders — the signed-in user's own orders. Admins/managers can pass ?all=1 to see every order, optionally &status=. */
    public function index(): void
    {
        $payload = require_auth();
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 20));

        if (!empty($_GET['all']) && user_has_permission($payload, 'orders.manage')) {
            $status = $_GET['status'] ?? null;
            json_ok(['items' => $this->model->all($status, $limit, ($page - 1) * $limit)]);
            return;
        }

        json_ok(['items' => $this->model->forUser((int) $payload['sub'], $limit, ($page - 1) * $limit)]);
    }

    /** GET /api/orders/{id} — the order's own customer, or anyone with orders.manage. */
    public function show(int $id): void
    {
        $payload = require_auth();
        $order = $this->model->find($id);

        if (!$order) {
            json_error('Order not found.', 404);
        }
        if ((int) $order['user_id'] !== (int) $payload['sub'] && !user_has_permission($payload, 'orders.manage')) {
            json_error('You do not have permission to view this order.', 403);
        }

        json_ok(['item' => $order]);
    }

    /**
     * POST /api/orders — place an order from a cart payload.
     * body: {items: [{product_id, quantity}], shipping_address, coupon_code?, payment_method}
     */
    public function store(): void
    {
        $payload = require_auth();
        $body = get_json_body();

        $items = is_array($body['items'] ?? null) ? $body['items'] : [];
        $shippingAddress = trim($body['shipping_address'] ?? '');
        $paymentMethod = $body['payment_method'] ?? 'manual';
        $couponCode = !empty($body['coupon_code']) ? trim($body['coupon_code']) : null;

        if (empty($items)) {
            json_error('Your cart is empty.', 422);
        }
        if ($shippingAddress === '') {
            json_error('A shipping/contact address is required.', 422);
        }

        try {
            $order = $this->model->create(
                (int) $payload['sub'],
                $items,
                $shippingAddress,
                $couponCode,
                $paymentMethod,
                $body['payment_details'] ?? []
            );
        } catch (OrderException $e) {
            json_error($e->getMessage(), 422);
            return;
        }

        json_created(['item' => $order], 'Order placed successfully.');
    }

    /** GET /api/orders/payment-methods — public: which payment methods checkout can offer right now. */
    public function paymentMethods(): void
    {
        json_ok(['methods' => PaymentGatewayFactory::availableMethods()]);
    }

    /** POST /api/orders/{id}/status (requires orders.manage) body: {status, tracking_number?} */
    public function updateStatus(int $id): void
    {
        require_permission('orders.manage');
        $body = get_json_body();
        $status = $body['status'] ?? '';

        $validStatuses = ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded'];
        if (!in_array($status, $validStatuses, true)) {
            json_error('Invalid order status.', 422);
        }
        if (!$this->model->find($id)) {
            json_error('Order not found.', 404);
        }

        $this->model->updateStatus($id, $status, $body['tracking_number'] ?? null);
        json_ok(null, 'Order status updated.');
    }
}
