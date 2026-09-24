<?php

require_once __DIR__ . '/../models/Order.php';
require_once __DIR__ . '/../models/PayLater.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../helpers/rate_limit_v2.php';
require_once __DIR__ . '/../lib/Payments/PaymentGatewayFactory.php';

use AIMsisters\Payments\PaymentGatewayFactory;

class OrderController
{
    private Order $model;
    private PayLater $payLaterModel;

    public function __construct()
    {
        $this->model = new Order();
        $this->payLaterModel = new PayLater();
    }

    /** GET /api/orders — the signed-in user's own orders. Admins/managers can pass ?all=1 to see every order, optionally &status=&payment_state=&order_kind=. */
    public function index(): void
    {
        $payload = require_auth();
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 20));

        if (!empty($_GET['all']) && user_has_permission($payload, 'orders.manage')) {
            $filters = [
                'status'        => $_GET['status'] ?? null,
                'payment_state' => $_GET['payment_state'] ?? null,
                'order_kind'    => $_GET['order_kind'] ?? null,
            ];
            json_ok(['items' => $this->model->all($filters, $limit, ($page - 1) * $limit)]);
            return;
        }

        json_ok(['items' => $this->model->forUser((int) $payload['sub'], $limit, ($page - 1) * $limit)]);
    }

    /**
     * GET /api/orders/export — every order matching the filters (up to
     * 5000), for the admin's CSV export (spec item 22: "sales export, CSV
     * reports"). Returns JSON, not a CSV file directly: this API is
     * header-token auth only (no query-string token support — see
     * Backend/middleware/auth.php), so a plain browser-navigated download
     * link can't authenticate. The frontend fetches this via the normal
     * authenticated axios client and builds the CSV file client-side from
     * real data, the same "fetch via API, render client-side" pattern
     * OrderDocument.jsx already uses for invoices/receipts.
     */
    public function export(): void
    {
        require_permission('orders.manage');
        $filters = [
            'status'        => $_GET['status'] ?? null,
            'payment_state' => $_GET['payment_state'] ?? null,
            'order_kind'    => $_GET['order_kind'] ?? null,
            'date_from'     => $_GET['date_from'] ?? null,
            'date_to'       => $_GET['date_to'] ?? null,
        ];
        json_ok(['items' => $this->model->all($filters, 5000, 0)]);
    }

    /**
     * POST /api/orders/check-availability — read-only cart-time stock
     * check, no auth required (the cart itself is guest-accessible).
     * Body: { items: [{product_id, variant_id?, quantity}] }. See
     * Order::checkAvailability() — this never reserves or locks anything;
     * checkout still re-validates for real.
     */
    public function checkAvailability(): void
    {
        $body = get_json_body();
        $items = is_array($body['items'] ?? null) ? $body['items'] : [];
        if (empty($items)) {
            json_error('items[] is required.', 422);
        }
        json_ok(['items' => $this->model->checkAvailability($items)]);
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
     * body: {items: [{product_id, variant_id?, quantity}], fulfillment_type, delivery_area_id?,
     *        shipping_address, delivery_latitude?, delivery_longitude? (required iff fulfillment_type
     *        === 'delivery'), coupon_code?, payment_method, pay_later_days?}
     */
    public function store(): void
    {
        $payload = require_auth();
        // A tight per-user limit — checkout is a state-changing, stock-
        // touching action; this isn't about throttling normal shopping,
        // just runaway/scripted repeat submissions.
        rate_limit_check('checkout:' . $payload['sub'], 10, 300);

        $body = get_json_body();

        $items = is_array($body['items'] ?? null) ? $body['items'] : [];
        $shippingAddress = trim($body['shipping_address'] ?? '');
        $fulfillmentType = $body['fulfillment_type'] ?? 'delivery';
        $deliveryAreaId = !empty($body['delivery_area_id']) ? (int) $body['delivery_area_id'] : null;
        $paymentMethod = $body['payment_method'] ?? 'manual_bank';
        $couponCode = !empty($body['coupon_code']) ? trim($body['coupon_code']) : null;
        $payLaterDays = isset($body['pay_later_days']) ? (int) $body['pay_later_days'] : null;

        // Delivery location pinned on the checkout map (migration 027) —
        // real GPS/map coordinates, never a hand-typed address. Only
        // required for fulfillment_type === 'delivery'; a pickup order
        // has nowhere to deliver to, so it's simply never collected there.
        $deliveryLatitude = null;
        $deliveryLongitude = null;
        if ($fulfillmentType === 'delivery') {
            if (!isset($body['delivery_latitude'], $body['delivery_longitude'])
                || !is_numeric($body['delivery_latitude']) || !is_numeric($body['delivery_longitude'])) {
                json_error('Please pin your delivery location on the map.', 422);
            }
            $deliveryLatitude = (float) $body['delivery_latitude'];
            $deliveryLongitude = (float) $body['delivery_longitude'];
            if ($deliveryLatitude < -90 || $deliveryLatitude > 90 || $deliveryLongitude < -180 || $deliveryLongitude > 180) {
                json_error('That delivery location looks invalid — please re-pin it on the map.', 422);
            }
        }

        if (empty($items)) {
            json_error('Your cart is empty.', 422);
        }
        if ($shippingAddress === '') {
            json_error('A contact name and phone number are required.', 422);
        }

        try {
            $result = $this->model->createFromCart(
                (int) $payload['sub'],
                $items,
                $fulfillmentType,
                $deliveryAreaId,
                $shippingAddress,
                $couponCode,
                $paymentMethod,
                $body['payment_details'] ?? [],
                $payLaterDays,
                $deliveryLatitude,
                $deliveryLongitude
            );
        } catch (OrderException $e) {
            json_error($e->getMessage(), 422);
            return;
        }

        json_created($result, count($result['orders']) > 1 ? 'Your cart was split into two orders — see details below.' : 'Order placed successfully.');
    }

    /** GET /api/orders/payment-methods — public: which payment methods checkout can offer right now. */
    public function paymentMethods(): void
    {
        json_ok(['methods' => array_merge(PaymentGatewayFactory::availableMethods(), ['pay_later'])]);
    }

    /** POST /api/orders/{id}/status (requires orders.manage) body: {status, tracking_number?} — fulfillment status only; payment state changes via payment verification. */
    public function updateStatus(int $id): void
    {
        require_permission('orders.manage');
        $body = get_json_body();
        $status = $body['status'] ?? '';

        if (!$this->model->find($id)) {
            json_error('Order not found.', 404);
        }

        try {
            $ok = $this->model->updateFulfillmentStatus($id, $status, $body['tracking_number'] ?? null);
        } catch (OrderException $e) {
            json_error($e->getMessage(), 422);
            return;
        }
        if (!$ok) {
            json_error('Invalid status.', 422);
            return;
        }
        json_ok(null, 'Order status updated.');
    }

    /** POST /api/orders/{id}/cancel (requires orders.manage) body: {reason} */
    public function cancel(int $id): void
    {
        require_permission('orders.manage');
        $body = get_json_body();
        if (!$this->model->find($id)) {
            json_error('Order not found.', 404);
        }
        $this->model->cancel($id, trim($body['reason'] ?? 'Cancelled by admin.'));
        json_ok(null, 'Order cancelled.');
    }

    // -----------------------------------------------------------------
    // Pay Later
    // -----------------------------------------------------------------

    /** POST /api/orders/{id}/pay-later/approve (requires orders.manage) */
    public function approvePayLater(int $id): void
    {
        $payload = require_permission('orders.manage');
        if (!$this->model->find($id)) {
            json_error('Order not found.', 404);
        }
        try {
            $this->payLaterModel->approve($id, (int) $payload['sub']);
        } catch (PayLaterException $e) {
            json_error($e->getMessage(), $e->stockUnavailable ? 409 : 422);
            return;
        }
        json_ok(null, 'Pay Later request approved.');
    }

    /** POST /api/orders/{id}/pay-later/decline (requires orders.manage) body: {reason?} */
    public function declinePayLater(int $id): void
    {
        $payload = require_permission('orders.manage');
        $body = get_json_body();
        if (!$this->model->find($id)) {
            json_error('Order not found.', 404);
        }
        try {
            $this->payLaterModel->decline($id, (int) $payload['sub'], $body['reason'] ?? null);
        } catch (PayLaterException $e) {
            json_error($e->getMessage(), 422);
            return;
        }
        json_ok(null, 'Pay Later request declined.');
    }

    // -----------------------------------------------------------------
    // On-order deposits + procurement
    // -----------------------------------------------------------------

    /** POST /api/orders/{id}/deposit (requires orders.manage) body: {percent: 30|50, deadline_at} */
    public function setDeposit(int $id): void
    {
        require_permission('orders.manage');
        $body = get_json_body();
        if (!$this->model->find($id)) {
            json_error('Order not found.', 404);
        }
        if (empty($body['deadline_at'])) {
            json_error('A deposit deadline is required.', 422);
        }
        try {
            $this->model->setDeposit($id, (int) ($body['percent'] ?? 0), $body['deadline_at']);
        } catch (OrderException $e) {
            json_error($e->getMessage(), 422);
            return;
        }
        json_ok(null, 'Deposit requirement set.');
    }

    /** POST /api/orders/{id}/item-procurement/{itemId} (requires orders.manage) body: {status, expected_arrival_date?, notes?} */
    public function updateItemProcurement(int $id, int $itemId): void
    {
        require_permission('orders.manage');
        $body = get_json_body();
        if (!$this->model->find($id)) {
            json_error('Order not found.', 404);
        }
        try {
            $this->model->updateItemProcurement($itemId, $id, $body['status'] ?? '', $body['expected_arrival_date'] ?? null, $body['notes'] ?? null);
        } catch (OrderException $e) {
            json_error($e->getMessage(), 422);
            return;
        }
        json_ok(null, 'Procurement status updated.');
    }
}
