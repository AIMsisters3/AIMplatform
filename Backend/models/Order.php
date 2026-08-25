<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Product.php';
require_once __DIR__ . '/Notification.php';
require_once __DIR__ . '/../lib/Payments/PaymentGatewayFactory.php';

use AIMsisters\Payments\PaymentGatewayFactory;
use AIMsisters\Payments\UnsupportedPaymentMethodException;

class OrderException extends RuntimeException
{
}

class Order
{
    // Flat shipping rate for any order containing at least one physical
    // product; free when every item is digital. A real store will want
    // this configurable (by weight/region/etc.) — tracked as a follow-up;
    // for now it lives in one place and reads clearly as a placeholder.
    private const FLAT_SHIPPING_RATE = 5.00;

    private PDO $db;
    private Product $productModel;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->productModel = new Product();
    }

    /**
     * Creates an order from a cart payload. Every price is re-read from
     * the products table server-side — the client only ever sends
     * product_id + quantity, never a price, so a tampered request can't
     * check out for less than the real total.
     *
     * @param array $items [['product_id' => int, 'quantity' => int], ...]
     * @throws OrderException on any validation failure (empty cart,
     *         unknown/inactive product, insufficient stock, bad coupon,
     *         unsupported payment method, or a declined charge) — the
     *         message is safe to show the customer directly.
     */
    public function create(
        int $userId,
        array $items,
        string $shippingAddress,
        ?string $couponCode,
        string $paymentMethod,
        array $paymentDetails = []
    ): array {
        if (empty($items)) {
            throw new OrderException('Your cart is empty.');
        }
        if (!in_array($paymentMethod, PaymentGatewayFactory::availableMethods(), true)) {
            throw new OrderException('That payment method is not available.');
        }

        // ---- 1. Validate items & compute totals against live product data ----
        $lineItems = [];
        $subtotal = 0.0;
        $hasPhysical = false;

        foreach ($items as $item) {
            $productId = (int) ($item['product_id'] ?? 0);
            $quantity = max(1, (int) ($item['quantity'] ?? 1));

            $product = $this->productModel->find($productId);
            if (!$product || $product['status'] !== 'active') {
                throw new OrderException("One of the items in your cart is no longer available.");
            }
            if ($product['product_type'] === 'physical' && $product['stock_quantity'] < $quantity) {
                throw new OrderException("\"{$product['name']}\" only has {$product['stock_quantity']} left in stock.");
            }
            if ($product['product_type'] === 'physical') {
                $hasPhysical = true;
            }

            $unitPrice = $product['sale_price'] !== null && $product['sale_price'] < $product['price']
                ? (float) $product['sale_price']
                : (float) $product['price'];

            $subtotal += $unitPrice * $quantity;
            $lineItems[] = ['product' => $product, 'quantity' => $quantity, 'unit_price' => $unitPrice];
        }

        // ---- 2. Coupon ----
        $discountTotal = 0.0;
        $coupon = null;
        if ($couponCode) {
            $coupon = $this->findValidCoupon($couponCode);
            if (!$coupon) {
                throw new OrderException('This coupon code is invalid or has expired.');
            }
            $discountTotal = $coupon['discount_type'] === 'percent'
                ? round($subtotal * ((float) $coupon['discount_value'] / 100), 2)
                : min($subtotal, (float) $coupon['discount_value']);
        }

        $shippingTotal = $hasPhysical ? self::FLAT_SHIPPING_RATE : 0.0;
        $grandTotal = max(0, $subtotal - $discountTotal + $shippingTotal);
        $orderNumber = $this->generateOrderNumber();

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                "INSERT INTO orders
                    (user_id, order_number, status, subtotal, discount_total, shipping_total, grand_total,
                     coupon_id, shipping_address, payment_method)
                 VALUES
                    (:user_id, :order_number, 'pending', :subtotal, :discount_total, :shipping_total, :grand_total,
                     :coupon_id, :shipping_address, :payment_method)"
            );
            $stmt->execute([
                'user_id'          => $userId,
                'order_number'     => $orderNumber,
                'subtotal'         => $subtotal,
                'discount_total'   => $discountTotal,
                'shipping_total'   => $shippingTotal,
                'grand_total'      => $grandTotal,
                'coupon_id'        => $coupon['id'] ?? null,
                'shipping_address' => $shippingAddress,
                'payment_method'   => $paymentMethod,
            ]);
            $orderId = (int) $this->db->lastInsertId();

            $itemStmt = $this->db->prepare(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (:order_id, :product_id, :quantity, :unit_price)'
            );
            foreach ($lineItems as $line) {
                $itemStmt->execute([
                    'order_id'   => $orderId,
                    'product_id' => $line['product']['id'],
                    'quantity'   => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                ]);
            }

            // ---- 3. Attempt payment. A decline rolls back the whole order —
            // nothing is persisted and no stock is touched. ----
            $order = ['id' => $orderId, 'order_number' => $orderNumber, 'grand_total' => $grandTotal];
            $gateway = PaymentGatewayFactory::resolve($paymentMethod);
            $result = $gateway->charge($order, $paymentDetails);

            if (!$result->success) {
                $this->db->rollBack();
                throw new OrderException($result->message ?: 'Payment could not be processed.');
            }

            $updateStmt = $this->db->prepare(
                'UPDATE orders SET status = :status, payment_reference = :ref WHERE id = :id'
            );
            $updateStmt->execute(['status' => $result->status, 'ref' => $result->reference, 'id' => $orderId]);

            foreach ($lineItems as $line) {
                if ($line['product']['product_type'] === 'physical') {
                    $this->productModel->decrementStock((int) $line['product']['id'], $line['quantity']);
                }
            }

            if ($coupon) {
                $this->db->prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = :id')
                    ->execute(['id' => $coupon['id']]);
            }

            $this->db->commit();
        } catch (OrderException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        } catch (UnsupportedPaymentMethodException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw new OrderException('That payment method is not available.');
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }

        (new Notification())->create(
            $userId,
            'Order received',
            "Your order {$orderNumber} has been received and is being processed.",
            'order'
        );

        return $this->find($orderId);
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM orders WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $order = $stmt->fetch();
        if (!$order) {
            return null;
        }
        $order['items'] = $this->itemsForOrder($id);
        return $order;
    }

    public function itemsForOrder(int $orderId): array
    {
        $stmt = $this->db->prepare(
            'SELECT oi.*, p.name AS product_name, p.thumbnail AS product_thumbnail, p.slug AS product_slug
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = :order_id'
        );
        $stmt->execute(['order_id' => $orderId]);
        return $stmt->fetchAll();
    }

    public function forUser(int $userId, int $limit = 20, int $offset = 0): array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM orders WHERE user_id = :user_id ORDER BY created_at DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function all(?string $status = null, int $limit = 20, int $offset = 0): array
    {
        $where = $status ? 'WHERE status = :status' : '';
        $stmt = $this->db->prepare(
            "SELECT o.*, u.name AS customer_name, u.email AS customer_email
             FROM orders o LEFT JOIN users u ON u.id = o.user_id
             $where ORDER BY o.created_at DESC LIMIT :limit OFFSET :offset"
        );
        if ($status) {
            $stmt->bindValue('status', $status);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function updateStatus(int $id, string $status, ?string $trackingNumber = null): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE orders SET status = :status, tracking_number = COALESCE(:tracking, tracking_number) WHERE id = :id'
        );
        $ok = $stmt->execute(['status' => $status, 'tracking' => $trackingNumber, 'id' => $id]);

        $order = $this->find($id);
        if ($ok && $order && $order['user_id']) {
            (new Notification())->create(
                (int) $order['user_id'],
                'Order update',
                "Your order {$order['order_number']} is now: " . ucfirst($status) . '.',
                'order'
            );
        }

        return $ok;
    }

    private function findValidCoupon(string $code): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM coupons WHERE code = :code LIMIT 1');
        $stmt->execute(['code' => $code]);
        $coupon = $stmt->fetch();
        if (!$coupon) {
            return null;
        }
        if ($coupon['expires_at'] && strtotime($coupon['expires_at']) < time()) {
            return null;
        }
        if ($coupon['max_uses'] !== null && (int) $coupon['used_count'] >= (int) $coupon['max_uses']) {
            return null;
        }
        return $coupon;
    }

    private function generateOrderNumber(): string
    {
        return 'AIM-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
    }
}
