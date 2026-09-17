<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../models/Payment.php';
require_once __DIR__ . '/../models/Order.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/upload_validation.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../helpers/rate_limit.php';

/**
 * Manual payment submission + admin verification queue (spec §"Payment
 * Methods": bank transfer/mobile wallet). A submitted proof/reference
 * NEVER by itself marks an order paid — it only creates an
 * awaiting_verification payment_records row; Order::applyVerifiedPayment()
 * is only ever called from verify(), after a human admin decision.
 */
class PaymentController
{
    private Payment $model;
    private Order $orderModel;

    // Proof files are a customer document, not general media — keep the
    // allowed set intentionally narrow regardless of what UploadController
    // otherwise permits site-wide.
    private const ALLOWED_PROOF_EXT = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    private const MAX_PROOF_SIZE_MB = 10;

    public function __construct()
    {
        $this->model = new Payment();
        $this->orderModel = new Order();
    }

    /** POST /api/orders/{id}/payments (order's own customer) multipart/form-data: method, amount, reference?, proof(file)? */
    public function submit(int $orderId): void
    {
        $payload = require_auth();
        $order = $this->orderModel->find($orderId);
        if (!$order) {
            json_error('Order not found.', 404);
        }
        if ((int) $order['user_id'] !== (int) $payload['sub']) {
            json_error('You do not have permission to submit payment for this order.', 403);
        }

        rate_limit_check('payment-submit:' . $payload['sub'], 20, 600);

        $method = $_POST['method'] ?? '';
        if (!in_array($method, ['manual_bank', 'manual_mobile_wallet'], true)) {
            json_error('Invalid payment method.', 422);
        }
        $amount = (float) ($_POST['amount'] ?? 0);
        if ($amount <= 0) {
            json_error('Please enter the amount you paid.', 422);
        }
        $reference = trim($_POST['reference'] ?? '');
        $hasFile = isset($_FILES['proof']) && $_FILES['proof']['error'] !== UPLOAD_ERR_NO_FILE;

        if ($reference === '' && !$hasFile) {
            json_error('Please provide a payment reference and/or upload proof of payment.', 422);
        }

        $proofPath = null;
        if ($hasFile) {
            $proofPath = $this->storeProofFile($_FILES['proof'], $orderId);
        }

        $paymentId = $this->model->create([
            'order_id'     => $orderId,
            'method'       => $method,
            'amount'       => $amount,
            'reference'    => $reference ?: null,
            'proof_file_path' => $proofPath,
            'submitted_by' => (int) $payload['sub'],
        ]);

        // Signals "a human needs to look at this" without claiming any
        // money has actually been verified yet.
        if ($order['payment_state'] === 'pending') {
            $this->setAwaitingVerification($orderId);
        }

        json_created(['id' => $paymentId], 'Payment submitted — we will verify it shortly.');
    }

    /** GET /api/orders/{id}/payments (order's own customer, or orders.manage) */
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

    /** GET /api/payments/queue (requires orders.manage) */
    public function queue(): void
    {
        require_permission('orders.manage');
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 20));
        json_ok(['items' => $this->model->queue($limit, ($page - 1) * $limit)]);
    }

    /** POST /api/payments/{id}/verify (requires orders.manage) */
    public function verify(int $id): void
    {
        $payload = require_permission('orders.manage');
        $record = $this->model->find($id);
        if (!$record) {
            json_error('Payment record not found.', 404);
        }

        $ok = $this->model->markVerified($id, (int) $payload['sub']);
        if (!$ok) {
            json_error('This payment has already been decided.', 409);
            return;
        }

        $this->orderModel->applyVerifiedPayment((int) $record['order_id'], (float) $record['amount']);
        json_ok(null, 'Payment verified.');
    }

    /** POST /api/payments/{id}/reject (requires orders.manage) body: {reason} */
    public function reject(int $id): void
    {
        $payload = require_permission('orders.manage');
        $body = get_json_body();
        $reason = trim($body['reason'] ?? '');
        if ($reason === '') {
            json_error('Please provide a reason for rejecting this payment.', 422);
        }

        $record = $this->model->find($id);
        if (!$record) {
            json_error('Payment record not found.', 404);
        }

        $ok = $this->model->markRejected($id, (int) $payload['sub'], $reason);
        if (!$ok) {
            json_error('This payment has already been decided.', 409);
            return;
        }
        json_ok(null, 'Payment rejected.');
    }

    /** GET /api/payments/{id}/proof (order's own customer, or orders.manage) — streams the file; it is never a public URL. */
    public function downloadProof(int $id): void
    {
        $payload = require_auth();
        $record = $this->model->find($id);
        if (!$record || !$record['proof_file_path']) {
            json_error('Proof file not found.', 404);
        }

        $order = $this->orderModel->find((int) $record['order_id']);
        if (!$order || ((int) $order['user_id'] !== (int) $payload['sub'] && !user_has_permission($payload, 'orders.manage'))) {
            json_error('You do not have permission to view this file.', 403);
        }

        $fullPath = PROOF_OF_PAYMENT_DIR . $record['proof_file_path'];
        $realBase = realpath(PROOF_OF_PAYMENT_DIR);
        $realPath = realpath($fullPath);
        // Defends against a stored path ever containing ../ segments —
        // resolved path must still live under the proof directory.
        if (!$realPath || !$realBase || strncmp($realPath, $realBase, strlen($realBase)) !== 0 || !is_file($realPath)) {
            json_error('Proof file not found.', 404);
        }

        $ext = strtolower(pathinfo($realPath, PATHINFO_EXTENSION));
        $mime = $ext === 'pdf' ? 'application/pdf' : (getimagesize($realPath)['mime'] ?? 'application/octet-stream');

        header('Content-Type: ' . $mime);
        header('Content-Disposition: inline; filename="proof-' . $id . '.' . $ext . '"');
        header('Content-Length: ' . filesize($realPath));
        header('X-Content-Type-Options: nosniff');
        readfile($realPath);
        exit;
    }

    private function setAwaitingVerification(int $orderId): void
    {
        require_once __DIR__ . '/../config/database.php';
        Database::getConnection()
            ->prepare("UPDATE orders SET payment_state = 'awaiting_verification' WHERE id = :id AND payment_state = 'pending'")
            ->execute(['id' => $orderId]);
    }

    private function storeProofFile(array $file, int $orderId): string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            json_error('Proof file upload failed.', 422);
        }
        if ($file['size'] > self::MAX_PROOF_SIZE_MB * 1024 * 1024) {
            json_error('Proof file exceeds ' . self::MAX_PROOF_SIZE_MB . 'MB.', 422);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, self::ALLOWED_PROOF_EXT, true)) {
            json_error('Proof file must be an image (JPG/PNG/WEBP) or a PDF.', 422);
        }
        if (!upload_content_matches_extension($file['tmp_name'], $ext)) {
            json_error('File content does not match its extension.', 422);
        }

        $dir = PROOF_OF_PAYMENT_DIR . $orderId . '/';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            json_error('Could not save proof file.', 500);
        }

        $filename = uniqid('proof_', true) . '.' . $ext;
        if (!move_uploaded_file($file['tmp_name'], $dir . $filename)) {
            json_error('Could not save proof file.', 500);
        }

        // Stored relative to PROOF_OF_PAYMENT_DIR, not an absolute/public path.
        return $orderId . '/' . $filename;
    }
}
