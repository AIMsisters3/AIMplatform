<?php

require_once __DIR__ . '/../models/Refund.php';
require_once __DIR__ . '/../models/Order.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../helpers/shop_notify.php';

class RefundController
{
    private Refund $model;
    private Order $orderModel;

    public function __construct()
    {
        $this->model = new Refund();
        $this->orderModel = new Order();
    }

    /** POST /api/orders/{id}/refunds (requires orders.manage) body: {amount, reason?} — admin-initiated refund request. */
    public function request(int $orderId): void
    {
        $payload = require_permission('orders.manage');
        $body = get_json_body();
        $order = $this->orderModel->find($orderId);
        if (!$order) {
            json_error('Order not found.', 404);
        }
        $amount = (float) ($body['amount'] ?? 0);
        if ($amount <= 0 || $amount > (float) $order['amount_paid']) {
            json_error('Refund amount must be more than zero and no more than the amount actually paid.', 422);
        }

        $id = $this->model->create($orderId, $amount, $body['reason'] ?? null, (int) $payload['sub']);
        json_created(['id' => $id], 'Refund requested.');
    }

    /** GET /api/orders/{id}/refunds (order's own customer, or orders.manage) */
    public function forOrder(int $orderId): void
    {
        $payload = require_auth();
        $order = $this->orderModel->find($orderId);
        if (!$order) {
            json_error('Order not found.', 404);
        }
        if ((int) $order['user_id'] !== (int) $payload['sub'] && !user_has_permission($payload, 'orders.manage')) {
            json_error('You do not have permission to view this.', 403);
        }
        json_ok(['items' => $this->model->forOrder($orderId)]);
    }

    /** GET /api/refunds?status= (requires orders.manage) */
    public function index(): void
    {
        require_permission('orders.manage');
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 20));
        json_ok(['items' => $this->model->all($_GET['status'] ?? null, $limit, ($page - 1) * $limit)]);
    }

    /** POST /api/refunds/{id}/decide (requires orders.manage) body: {decision: "approved"|"rejected"} */
    public function decide(int $id): void
    {
        $payload = require_permission('orders.manage');
        $body = get_json_body();
        $refund = $this->model->find($id);
        if (!$refund) {
            json_error('Refund not found.', 404);
        }
        $ok = $this->model->decide($id, $body['decision'] ?? '', (int) $payload['sub']);
        if (!$ok) {
            json_error('Invalid decision, or this refund has already been decided.', 422);
            return;
        }
        json_ok(null, 'Refund decision recorded.');
    }

    /** POST /api/refunds/{id}/process (requires orders.manage) body: {method, notes?} — confirms the money has actually been sent back. */
    public function process(int $id): void
    {
        $payload = require_permission('orders.manage');
        $body = get_json_body();
        $refund = $this->model->find($id);
        if (!$refund) {
            json_error('Refund not found.', 404);
        }
        if (empty($body['method'])) {
            json_error('Please specify how the refund was sent (e.g. bank transfer, mobile wallet).', 422);
        }

        $ok = $this->model->markProcessed($id, (int) $payload['sub'], $body['method'], $body['notes'] ?? null);
        if (!$ok) {
            json_error('This refund must be approved before it can be processed.', 422);
            return;
        }

        $order = $this->orderModel->find((int) $refund['order_id']);
        if ($order && $order['user_id']) {
            notify_shop_event(
                (int) $order['user_id'], 'Refund processed',
                "A refund of N$" . number_format((float) $refund['amount'], 2) . " for order {$order['order_number']} has been processed via {$body['method']}.",
                'order', 'Refund Processed'
            );
        }

        json_ok(null, 'Refund marked as processed.');
    }
}
