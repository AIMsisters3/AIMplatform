<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Product.php';
require_once __DIR__ . '/PayLater.php';
require_once __DIR__ . '/DeliveryArea.php';
require_once __DIR__ . '/../helpers/shop_notify.php';
require_once __DIR__ . '/../lib/Payments/PaymentGatewayFactory.php';

use AIMsisters\Payments\PaymentGatewayFactory;
use AIMsisters\Payments\UnsupportedPaymentMethodException;

class OrderException extends RuntimeException
{
}

class Order
{
    private PDO $db;
    private Product $productModel;
    private PayLater $payLaterModel;
    private DeliveryArea $deliveryAreaModel;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->productModel = new Product();
        $this->payLaterModel = new PayLater();
        $this->deliveryAreaModel = new DeliveryArea();
    }

    /**
     * Places an order from a cart payload. Every price/stock/availability
     * fact is re-read from the database inside this one transaction — the
     * client only ever sends product_id/variant_id/quantity, never a
     * price or a delivery fee, so a tampered request can't check out for
     * less or claim a fee that was never configured.
     *
     * A cart mixing in-stock and on-order items is split into up to TWO
     * sibling orders sharing a split_group_id, per spec: each sourcing
     * type has different payment rules, so they can't be one order.
     *
     * @param array $items [['product_id' => int, 'variant_id' => ?int, 'quantity' => int], ...]
     * @param string $paymentMethod one of PaymentGatewayFactory::availableMethods(), or the literal 'pay_later'.
     * @param int|null $payLaterDays required (1-14) iff $paymentMethod === 'pay_later'.
     * @param float|null $deliveryLatitude,$deliveryLongitude the customer's pinned/GPS delivery location
     *   (migration 027) — a real coordinate pair they placed on the checkout map, never a hand-typed
     *   address the delivery person has to interpret. Only meaningful when $fulfillmentType === 'delivery';
     *   ignored for pickup.
     * @param string $shippingAddress the composed display string (migration 030's contact_name/contact_phone
     *   formatted together) — kept so every existing admin/document screen that already reads
     *   shipping_address keeps working unchanged; $contactName/$contactPhone below are the structured source.
     * @param string|null $contactName,$contactPhone the two separate checkout fields (migration 030) — name is
     *   optional, phone is required (enforced in OrderController::store(), not here).
     * @return array ['orders' => [order, ...], 'split' => bool]
     * @throws OrderException on any validation failure — message is safe to show the customer directly.
     */
    public function createFromCart(
        int $userId,
        array $items,
        string $fulfillmentType,
        ?int $deliveryAreaId,
        string $shippingAddress,
        ?string $couponCode,
        string $paymentMethod,
        array $paymentDetails = [],
        ?int $payLaterDays = null,
        ?float $deliveryLatitude = null,
        ?float $deliveryLongitude = null,
        ?string $contactName = null,
        ?string $contactPhone = null
    ): array {
        if (empty($items)) {
            throw new OrderException('Your cart is empty.');
        }
        if (!in_array($fulfillmentType, ['delivery', 'pickup'], true)) {
            throw new OrderException('Please choose delivery or pickup.');
        }
        $isPayLater = $paymentMethod === 'pay_later';
        if ($isPayLater) {
            if ($payLaterDays === null || $payLaterDays < 1 || $payLaterDays > 14) {
                throw new OrderException('Please choose a Pay Later period between 1 and 14 days.');
            }
            if ($this->payLaterModel->hasActiveForUser($userId)) {
                throw new OrderException('You already have an active Pay Later order. Please settle it before requesting another.');
            }
        } elseif (!in_array($paymentMethod, PaymentGatewayFactory::availableMethods(), true)) {
            throw new OrderException('That payment method is not available.');
        }

        // Lock rows in a fixed order (ascending product_id, then
        // variant_id) across every checkout, so two concurrent checkouts
        // sharing products can never deadlock waiting on each other's
        // locks taken in opposite orders.
        usort($items, fn ($a, $b) => [(int) ($a['product_id'] ?? 0), (int) ($a['variant_id'] ?? 0)] <=> [(int) ($b['product_id'] ?? 0), (int) ($b['variant_id'] ?? 0)]);

        $this->db->beginTransaction();
        try {
            // ---- 1. Lock and validate every line against live data ----
            $lines = [];
            foreach ($items as $item) {
                $lines[] = $this->lockAndValidateLine($item);
            }

            $inStockLines = array_values(array_filter($lines, fn ($l) => $l['sourcing_type'] === 'in_stock'));
            $onOrderLines = array_values(array_filter($lines, fn ($l) => $l['sourcing_type'] === 'on_order'));

            if ($isPayLater && !empty($onOrderLines)) {
                throw new OrderException('Pay Later is only available for in-stock items. Please check out on-order items separately.');
            }

            // ---- 2. Delivery fee — server-resolved only, never client-trusted ----
            $deliveryFee = 0.0;
            $deliveryAreaName = null;
            if ($fulfillmentType === 'delivery') {
                if (!$deliveryAreaId) {
                    throw new OrderException('Please choose your delivery area.');
                }
                $area = $this->deliveryAreaModel->find($deliveryAreaId);
                if (!$area || !$area['is_active'] || $area['is_pickup']) {
                    throw new OrderException('That delivery area is no longer available. Please choose another.');
                }
                $deliveryFee = (float) $area['fee'];
                $deliveryAreaName = $area['name'];
            } else {
                $area = $deliveryAreaId ? $this->deliveryAreaModel->find($deliveryAreaId) : null;
                if ($area && $area['is_pickup']) {
                    $deliveryAreaName = $area['name'];
                }
            }

            // ---- 3. Coupon — validated once, discount split proportionally across the resulting orders ----
            $coupon = null;
            $totalSubtotal = array_sum(array_map(fn ($l) => $l['line_total'], $lines));
            $totalDiscount = 0.0;
            if ($couponCode) {
                $coupon = $this->findValidCoupon($couponCode);
                if (!$coupon) {
                    throw new OrderException('This coupon code is invalid or has expired.');
                }
                $totalDiscount = $coupon['discount_type'] === 'percent'
                    ? round($totalSubtotal * ((float) $coupon['discount_value'] / 100), 2)
                    : min($totalSubtotal, (float) $coupon['discount_value']);
            }

            $splitGroupId = (count($inStockLines) > 0 && count($onOrderLines) > 0) ? $this->generateSplitGroupId() : null;

            $createdOrders = [];

            if (!empty($inStockLines)) {
                $createdOrders[] = $this->createInStockOrder(
                    $userId, $inStockLines, $totalSubtotal, $totalDiscount, $deliveryFee,
                    $fulfillmentType, $deliveryAreaId, $deliveryAreaName, $shippingAddress,
                    $coupon, $paymentMethod, $paymentDetails, $isPayLater, $payLaterDays, $splitGroupId,
                    $deliveryLatitude, $deliveryLongitude, $contactName, $contactPhone
                );
            }
            if (!empty($onOrderLines)) {
                $createdOrders[] = $this->createOnOrderOrder(
                    $userId, $onOrderLines, $totalSubtotal, $totalDiscount, $deliveryFee,
                    $fulfillmentType, $deliveryAreaId, $deliveryAreaName, $shippingAddress,
                    $coupon, $splitGroupId, $deliveryLatitude, $deliveryLongitude, $contactName, $contactPhone
                );
            }

            if ($coupon) {
                $this->db->prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = :id')->execute(['id' => $coupon['id']]);
            }

            $this->db->commit();
        } catch (OrderException $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        } catch (UnsupportedPaymentMethodException $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw new OrderException('That payment method is not available.');
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }

        $fullOrders = array_map(fn ($o) => $this->find($o['id']), $createdOrders);

        foreach ($fullOrders as $o) {
            notify_shop_admins_event(
                'New order placed',
                "Order {$o['order_number']} was just placed (N$" . number_format((float) $o['grand_total'], 2) . ").",
                'order', '/admin/orders'
            );
        }

        return ['orders' => $fullOrders, 'split' => $splitGroupId !== null];
    }

    /**
     * Read-only cart-time stock check (spec: "validate stock at cart
     * time... do NOT wait until checkout"). No row locking, no
     * transaction, nothing reserved — this only gives the shopper early,
     * honest feedback while they're still on the cart page. The real,
     * authoritative, row-locked check still happens in
     * lockAndValidateLine() inside the actual checkout transaction; this
     * method can never be the thing that prevents overselling by itself.
     *
     * @param array $items [{product_id, variant_id?, quantity}, ...]
     * @return array one result per input line, same order, each:
     *   {product_id, variant_id, product_name, requested_quantity,
     *    available_quantity (null for on-order items — not stock-limited
     *    the same way), ok, reason}
     */
    public function checkAvailability(array $items): array
    {
        $results = [];
        foreach ($items as $line) {
            $productId = (int) ($line['product_id'] ?? 0);
            $variantId = !empty($line['variant_id']) ? (int) $line['variant_id'] : null;
            $requestedQty = max(1, (int) ($line['quantity'] ?? 1));

            $product = $this->productModel->find($productId);
            if (!$product || $product['status'] !== 'active') {
                $results[] = [
                    'product_id' => $productId, 'variant_id' => $variantId, 'product_name' => $product['name'] ?? null,
                    'requested_quantity' => $requestedQty, 'available_quantity' => 0, 'ok' => false,
                    'reason' => 'This product is no longer available.',
                ];
                continue;
            }

            $variant = null;
            if ($variantId) {
                $variant = $this->productModel->findVariant($variantId);
                if (!$variant || (int) $variant['product_id'] !== $productId || $variant['status'] !== 'active') {
                    $results[] = [
                        'product_id' => $productId, 'variant_id' => $variantId, 'product_name' => $product['name'],
                        'requested_quantity' => $requestedQty, 'available_quantity' => 0, 'ok' => false,
                        'reason' => 'The selected option is no longer available.',
                    ];
                    continue;
                }
            }

            if (($product['sourcing_type'] ?? 'in_stock') !== 'in_stock') {
                // On-order items are procured per-order, not stock-limited the same way.
                $results[] = [
                    'product_id' => $productId, 'variant_id' => $variantId, 'product_name' => $product['name'],
                    'requested_quantity' => $requestedQty, 'available_quantity' => null, 'ok' => true, 'reason' => null,
                ];
                continue;
            }

            $stockQty = (int) ($variant['stock_quantity'] ?? $product['stock_quantity']);
            $reservedQty = (int) ($variant['reserved_quantity'] ?? $product['reserved_quantity']);
            $available = max(0, $stockQty - $reservedQty);
            $ok = $available >= $requestedQty;

            $results[] = [
                'product_id' => $productId, 'variant_id' => $variantId, 'product_name' => $product['name'],
                'requested_quantity' => $requestedQty, 'available_quantity' => $available, 'ok' => $ok,
                'reason' => $ok
                    ? null
                    : ($available === 0 ? "\"{$product['name']}\" is out of stock." : "Only {$available} left of \"{$product['name']}\"."),
            ];
        }
        return $results;
    }

    /** Locks the product (and variant, if any) row and returns validated line data — throws if unavailable. */
    private function lockAndValidateLine(array $item): array
    {
        $productId = (int) ($item['product_id'] ?? 0);
        $variantId = !empty($item['variant_id']) ? (int) $item['variant_id'] : null;
        $quantity = max(1, (int) ($item['quantity'] ?? 1));

        $stmt = $this->db->prepare('SELECT * FROM products WHERE id = :id AND deleted_at IS NULL FOR UPDATE');
        $stmt->execute(['id' => $productId]);
        $product = $stmt->fetch();
        if (!$product || $product['status'] !== 'active') {
            throw new OrderException('One of the items in your cart is no longer available.');
        }

        $variant = null;
        if ($variantId) {
            $vStmt = $this->db->prepare("SELECT * FROM product_variants WHERE id = :id AND product_id = :product_id AND status = 'active' FOR UPDATE");
            $vStmt->execute(['id' => $variantId, 'product_id' => $productId]);
            $variant = $vStmt->fetch();
            if (!$variant) {
                throw new OrderException("The selected option for \"{$product['name']}\" is no longer available.");
            }
        }

        $sourcingType = $product['sourcing_type'] ?? 'in_stock';
        if ($sourcingType === 'in_stock') {
            $stockQty = (int) ($variant['stock_quantity'] ?? $product['stock_quantity']);
            $reservedQty = (int) ($variant['reserved_quantity'] ?? $product['reserved_quantity']);
            $available = $stockQty - $reservedQty;
            if ($available < $quantity) {
                throw new OrderException("\"{$product['name']}\" only has {$available} left in stock.");
            }
        }

        $unitPrice = $variant && $variant['price_override'] !== null
            ? (float) $variant['price_override']
            : Product::effectivePriceFor($product);

        return [
            'product' => $product,
            'variant' => $variant,
            'product_id' => $productId,
            'variant_id' => $variantId,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'line_total' => round($unitPrice * $quantity, 2),
            'sourcing_type' => $sourcingType,
        ];
    }

    private function createInStockOrder(
        int $userId, array $lines, float $totalSubtotal, float $totalDiscount, float $deliveryFee,
        string $fulfillmentType, ?int $deliveryAreaId, ?string $deliveryAreaName, string $shippingAddress,
        ?array $coupon, string $paymentMethod, array $paymentDetails, bool $isPayLater, ?int $payLaterDays, ?string $splitGroupId,
        ?float $deliveryLatitude = null, ?float $deliveryLongitude = null,
        ?string $contactName = null, ?string $contactPhone = null
    ): array {
        $subtotal = array_sum(array_map(fn ($l) => $l['line_total'], $lines));
        $discount = $totalDiscount > 0 ? round($subtotal / $totalSubtotal * $totalDiscount, 2) : 0.0;
        $grandTotal = max(0, $subtotal - $discount + $deliveryFee);
        $orderNumber = $this->generateOrderNumber();
        $orderKind = $isPayLater ? 'pay_later' : 'standard';

        $orderId = $this->insertOrder([
            'user_id' => $userId, 'order_number' => $orderNumber, 'order_kind' => $orderKind,
            'split_group_id' => $splitGroupId, 'status' => $isPayLater ? 'awaiting_approval' : 'awaiting_payment',
            'payment_state' => 'pending', 'subtotal' => $subtotal, 'discount_total' => $discount,
            'shipping_total' => $deliveryFee, 'grand_total' => $grandTotal, 'coupon_id' => $coupon['id'] ?? null,
            'shipping_address' => $shippingAddress, 'contact_name' => $contactName, 'contact_phone' => $contactPhone,
            'delivery_latitude' => $fulfillmentType === 'delivery' ? $deliveryLatitude : null,
            'delivery_longitude' => $fulfillmentType === 'delivery' ? $deliveryLongitude : null,
            'fulfillment_type' => $fulfillmentType,
            'delivery_area_id' => $deliveryAreaId, 'delivery_area_name_snapshot' => $deliveryAreaName,
            'payment_method' => $isPayLater ? 'pay_later' : $paymentMethod,
        ]);

        $this->insertLineItems($orderId, $lines);

        if ($isPayLater) {
            $this->payLaterModel->create($orderId, $payLaterDays);
            // Stock is intentionally NOT touched here — spec: "While
            // awaiting approval, stock remains available to everyone and
            // is NOT reserved." Reservation happens in PayLater::approve().
        } else {
            $gateway = PaymentGatewayFactory::resolve($paymentMethod);
            $result = $gateway->charge(['id' => $orderId, 'order_number' => $orderNumber, 'grand_total' => $grandTotal], $paymentDetails);
            if (!$result->success) {
                throw new OrderException($result->message ?: 'Payment could not be processed.');
            }

            $paymentState = $result->status === 'paid' ? 'paid' : 'pending';
            $status = $paymentState === 'paid' ? 'processing' : 'awaiting_payment';
            $this->db->prepare('UPDATE orders SET payment_state = :ps, status = :status, payment_reference = :ref, amount_paid = :paid WHERE id = :id')
                ->execute([
                    'ps' => $paymentState, 'status' => $status, 'ref' => $result->reference,
                    'paid' => $paymentState === 'paid' ? $grandTotal : 0, 'id' => $orderId,
                ]);

            foreach ($lines as $line) {
                $this->productModel->recordStockMovement(
                    $line['product_id'], $line['variant_id'], -$line['quantity'], 'sale', 'order', $orderId, $userId
                );
            }
        }

        notify_shop_event(
            $userId, 'Order received',
            $isPayLater
                ? "Your Pay Later request {$orderNumber} has been submitted and is awaiting approval."
                : "Your order {$orderNumber} has been received and is being processed.",
            $isPayLater ? 'pay_later' : 'order',
            $isPayLater ? 'Pay Later' : 'Order Placed'
        );

        return ['id' => $orderId];
    }

    private function createOnOrderOrder(
        int $userId, array $lines, float $totalSubtotal, float $totalDiscount, float $deliveryFee,
        string $fulfillmentType, ?int $deliveryAreaId, ?string $deliveryAreaName, string $shippingAddress,
        ?array $coupon, ?string $splitGroupId,
        ?float $deliveryLatitude = null, ?float $deliveryLongitude = null,
        ?string $contactName = null, ?string $contactPhone = null
    ): array {
        $subtotal = array_sum(array_map(fn ($l) => $l['line_total'], $lines));
        $discount = $totalDiscount > 0 ? round($subtotal / $totalSubtotal * $totalDiscount, 2) : 0.0;
        $grandTotal = max(0, $subtotal - $discount + $deliveryFee);
        $orderNumber = $this->generateOrderNumber();

        // No deposit % yet — spec: "Admin chooses either 30% or 50%
        // deposit for each order" after seeing it, not the customer at
        // checkout. status stays awaiting_approval until setDeposit().
        $orderId = $this->insertOrder([
            'user_id' => $userId, 'order_number' => $orderNumber, 'order_kind' => 'on_order',
            'split_group_id' => $splitGroupId, 'status' => 'awaiting_approval', 'payment_state' => 'pending',
            'subtotal' => $subtotal, 'discount_total' => $discount, 'shipping_total' => $deliveryFee,
            'grand_total' => $grandTotal, 'coupon_id' => $coupon['id'] ?? null, 'shipping_address' => $shippingAddress,
            'contact_name' => $contactName, 'contact_phone' => $contactPhone,
            'delivery_latitude' => $fulfillmentType === 'delivery' ? $deliveryLatitude : null,
            'delivery_longitude' => $fulfillmentType === 'delivery' ? $deliveryLongitude : null,
            'fulfillment_type' => $fulfillmentType, 'delivery_area_id' => $deliveryAreaId,
            'delivery_area_name_snapshot' => $deliveryAreaName, 'payment_method' => 'deposit',
        ]);

        $this->insertLineItems($orderId, $lines, 'pending');

        notify_shop_event(
            $userId, 'On-order request received',
            "Your order {$orderNumber} for on-order item(s) has been received. We'll confirm a deposit amount and supplier timeline shortly.",
            'order', 'On-Order Item'
        );

        return ['id' => $orderId];
    }

    private function insertOrder(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO orders
                (user_id, order_number, order_kind, split_group_id, status, payment_state, subtotal, discount_total,
                 shipping_total, grand_total, coupon_id, shipping_address, contact_name, contact_phone,
                 delivery_latitude, delivery_longitude,
                 fulfillment_type, delivery_area_id, delivery_area_name_snapshot, payment_method)
             VALUES
                (:user_id, :order_number, :order_kind, :split_group_id, :status, :payment_state, :subtotal, :discount_total,
                 :shipping_total, :grand_total, :coupon_id, :shipping_address, :contact_name, :contact_phone,
                 :delivery_latitude, :delivery_longitude,
                 :fulfillment_type, :delivery_area_id, :delivery_area_name_snapshot, :payment_method)'
        );
        $stmt->execute($data);
        return (int) $this->db->lastInsertId();
    }

    private function insertLineItems(int $orderId, array $lines, ?string $procurementStatus = null): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO order_items
                (order_id, product_id, variant_id, product_name_snapshot, variant_attributes_snapshot, quantity,
                 unit_price, unit_cost_snapshot, sourcing_type_snapshot, procurement_status)
             VALUES
                (:order_id, :product_id, :variant_id, :name_snapshot, :variant_snapshot, :quantity,
                 :unit_price, :unit_cost_snapshot, :sourcing_type, :procurement_status)'
        );
        foreach ($lines as $line) {
            $stmt->execute([
                'order_id'            => $orderId,
                'product_id'          => $line['product_id'],
                'variant_id'          => $line['variant_id'],
                'name_snapshot'       => $line['product']['name'],
                'variant_snapshot'    => $line['variant'] ? $line['variant']['attributes'] : null,
                'quantity'            => $line['quantity'],
                'unit_price'          => $line['unit_price'],
                // Captured now, not read back from products.cost_price
                // later - see migration 026's own comment: a cost-price
                // correction next month must never rewrite this order's
                // historical profit. Null when the admin hasn't entered a
                // cost for this product yet - never a guessed value.
                'unit_cost_snapshot'  => $line['product']['cost_price'] ?? null,
                'sourcing_type'       => $line['sourcing_type'],
                'procurement_status'  => $procurementStatus,
            ]);
        }
    }

    // -----------------------------------------------------------------
    // Reads
    // -----------------------------------------------------------------

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT o.*, u.name AS customer_name, u.email AS customer_email
             FROM orders o LEFT JOIN users u ON u.id = o.user_id
             WHERE o.id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $order = $stmt->fetch();
        if (!$order) {
            return null;
        }
        $order['items'] = $this->itemsForOrder($id);
        if ($order['order_kind'] === 'pay_later') {
            $order['pay_later'] = $this->payLaterModel->detailsFor($id);
        }
        if ($order['split_group_id']) {
            $stmt = $this->db->prepare('SELECT id, order_number, order_kind, status FROM orders WHERE split_group_id = :sg AND id != :id');
            $stmt->execute(['sg' => $order['split_group_id'], 'id' => $id]);
            $order['sibling_orders'] = $stmt->fetchAll();
        }
        return $order;
    }

    public function itemsForOrder(int $orderId): array
    {
        $stmt = $this->db->prepare(
            'SELECT oi.*, p.slug AS product_slug, p.thumbnail AS product_thumbnail
             FROM order_items oi
             LEFT JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = :order_id'
        );
        $stmt->execute(['order_id' => $orderId]);
        return array_map(function ($row) {
            $row['variant_attributes_snapshot'] = json_decode($row['variant_attributes_snapshot'] ?? 'null', true) ?: null;
            // product_name_snapshot is what's actually shown — falls back
            // to the live product name only for pre-migration order rows
            // that predate the snapshot column.
            $row['product_name'] = $row['product_name_snapshot'] ?: ($row['product_slug'] ? $row['product_slug'] : 'Item');
            return $row;
        }, $stmt->fetchAll());
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

    /** @param array $filters status, payment_state, order_kind */
    public function all(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $where = [];
        $params = [];
        if (!empty($filters['status'])) {
            $where[] = 'o.status = :status';
            $params['status'] = $filters['status'];
        }
        if (!empty($filters['payment_state'])) {
            $where[] = 'o.payment_state = :payment_state';
            $params['payment_state'] = $filters['payment_state'];
        }
        if (!empty($filters['order_kind'])) {
            $where[] = 'o.order_kind = :order_kind';
            $params['order_kind'] = $filters['order_kind'];
        }
        if (!empty($filters['date_from'])) {
            $where[] = 'o.created_at >= :date_from';
            $params['date_from'] = $filters['date_from'] . ' 00:00:00';
        }
        if (!empty($filters['date_to'])) {
            $where[] = 'o.created_at <= :date_to';
            $params['date_to'] = $filters['date_to'] . ' 23:59:59';
        }
        $sql = 'SELECT o.*, u.name AS customer_name, u.email AS customer_email
                FROM orders o LEFT JOIN users u ON u.id = o.user_id'
                . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
                . ' ORDER BY o.created_at DESC LIMIT :limit OFFSET :offset';
        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    // -----------------------------------------------------------------
    // Fulfillment status (admin) — purely the fulfillment axis; payment
    // state changes go through PaymentRecord verification (Stage 5), never here.
    // -----------------------------------------------------------------

    public function updateFulfillmentStatus(int $id, string $status, ?string $trackingNumber = null): bool
    {
        $valid = ['awaiting_approval', 'awaiting_payment', 'processing', 'supplier_ordered', 'arrived', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled'];
        if (!in_array($status, $valid, true)) {
            return false;
        }
        // Dispatch/pickup completion must never happen with an outstanding
        // balance (spec) — the one narrow exception is an explicit admin
        // override, which isn't implemented, so this is a hard block.
        if (in_array($status, ['shipped', 'delivered', 'ready_for_pickup'], true)) {
            $order = $this->find($id);
            if ($order && (float) $order['amount_paid'] < (float) $order['grand_total']) {
                throw new OrderException('This order still has an outstanding balance — it cannot be marked ' . str_replace('_', ' ', $status) . ' yet.');
            }
        }

        $stmt = $this->db->prepare('UPDATE orders SET status = :status, tracking_number = COALESCE(:tracking, tracking_number) WHERE id = :id');
        $ok = $stmt->execute(['status' => $status, 'tracking' => $trackingNumber, 'id' => $id]);

        $order = $this->find($id);
        if ($ok && $order && $order['user_id']) {
            notify_shop_event(
                (int) $order['user_id'], 'Order update',
                "Your order {$order['order_number']} is now: " . ucwords(str_replace('_', ' ', $status)) . '.',
                'order', 'Order Update'
            );
        }
        return $ok;
    }

    // -----------------------------------------------------------------
    // On-order deposits
    // -----------------------------------------------------------------

    /**
     * Admin sets the deposit percentage (30 or 50, per spec — not a free
     * value) and a specific deadline for an on_order order. Deposit
     * applies to the product price only (subtotal - discount), never the
     * delivery fee, per spec.
     */
    public function setDeposit(int $id, int $percent, string $deadlineAt): void
    {
        if (!in_array($percent, [30, 50], true)) {
            throw new OrderException('Deposit must be 30% or 50%.');
        }
        $order = $this->find($id);
        if (!$order || $order['order_kind'] !== 'on_order') {
            throw new OrderException('This is not an on-order order.');
        }

        $productOnlyBase = (float) $order['subtotal'] - (float) $order['discount_total'];
        $depositAmount = round($productOnlyBase * $percent / 100, 2);

        $this->db->prepare(
            "UPDATE orders SET deposit_percent = :percent, deposit_amount = :amount, deposit_deadline_at = :deadline,
                status = 'awaiting_payment' WHERE id = :id"
        )->execute(['percent' => $percent, 'amount' => $depositAmount, 'deadline' => $deadlineAt, 'id' => $id]);

        if ($order['user_id']) {
            notify_shop_event(
                (int) $order['user_id'], 'Deposit required to proceed',
                "Order {$order['order_number']}: a {$percent}% deposit of N$" . number_format($depositAmount, 2)
                    . ' is due by ' . date('j F Y, H:i', strtotime($deadlineAt)) . ' to confirm your order with our supplier.',
                'order', 'Deposit Required'
            );
        }
    }

    /** Updates one order_item's procurement tracking; auto-advances the parent order to 'arrived' once every item has arrived. */
    public function updateItemProcurement(int $orderItemId, int $orderId, string $status, ?string $expectedArrivalDate, ?string $notes): void
    {
        $valid = ['pending', 'ordered_from_supplier', 'arrived', 'unavailable'];
        if (!in_array($status, $valid, true)) {
            throw new OrderException('Invalid procurement status.');
        }

        $stmt = $this->db->prepare(
            'UPDATE order_items SET procurement_status = :status, expected_arrival_date = :arrival, supplier_notes = :notes
             WHERE id = :id AND order_id = :order_id'
        );
        $stmt->execute(['status' => $status, 'arrival' => $expectedArrivalDate, 'notes' => $notes, 'id' => $orderItemId, 'order_id' => $orderId]);

        $items = $this->itemsForOrder($orderId);
        $allArrived = count($items) > 0 && !array_filter($items, fn ($i) => $i['procurement_status'] !== 'arrived');

        if ($allArrived) {
            $order = $this->find($orderId);
            if ($order && !in_array($order['status'], ['arrived', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled'], true)) {
                $this->db->prepare("UPDATE orders SET status = 'arrived' WHERE id = :id")->execute(['id' => $orderId]);
                if ($order['user_id']) {
                    notify_shop_event(
                        (int) $order['user_id'], 'Your order has arrived',
                        "All items for order {$order['order_number']} have arrived from our supplier. "
                            . ($order['fulfillment_type'] === 'pickup' ? 'It will be ready for pickup once any remaining balance is paid.' : 'It will be prepared for delivery once any remaining balance is paid.'),
                        'order', 'Order Arrived'
                    );
                }
            }
        }
    }

    /**
     * Applies a VERIFIED payment amount to an order (called by the
     * payment verification flow — Backend/controllers/PaymentController.php
     * — never by a raw customer-facing endpoint; a submitted proof/
     * reference must be verified by an admin, or a gateway callback
     * independently confirmed, before this runs). Transactional because
     * a Pay Later order reaching "paid" here also converts its stock
     * hold into an actual sale in the same operation.
     */
    public function applyVerifiedPayment(int $orderId, float $amount): array
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT * FROM orders WHERE id = :id FOR UPDATE');
            $stmt->execute(['id' => $orderId]);
            $order = $stmt->fetch();
            if (!$order) {
                throw new OrderException('Order not found.');
            }

            $newAmountPaid = round((float) $order['amount_paid'] + $amount, 2);
            $due = (float) $order['grand_total'];
            $paymentState = $newAmountPaid >= $due ? 'paid' : 'partially_paid';

            $fields = ['amount_paid = :paid', 'payment_state = :state'];
            $params = ['paid' => $newAmountPaid, 'state' => $paymentState, 'id' => $orderId];

            if ($order['order_kind'] === 'on_order' && $order['deposit_amount'] !== null && $order['deposit_paid_at'] === null
                && $newAmountPaid >= (float) $order['deposit_amount']) {
                $fields[] = 'deposit_paid_at = NOW()';
                $fields[] = "status = IF(status = 'awaiting_payment', 'processing', status)";
            }

            if ($order['order_kind'] === 'pay_later' && $paymentState === 'paid') {
                foreach ($this->itemsForOrder($orderId) as $item) {
                    $this->productModel->recordStockMovement(
                        (int) $item['product_id'], $item['variant_id'] ? (int) $item['variant_id'] : null,
                        -(int) $item['quantity'], 'sale', 'order', $orderId
                    );
                    $this->productModel->adjustReservedQuantity(
                        (int) $item['product_id'], $item['variant_id'] ? (int) $item['variant_id'] : null, -(int) $item['quantity']
                    );
                }
                $fields[] = "status = 'processing'";
            }

            if ($order['order_kind'] === 'standard' && $paymentState === 'paid' && $order['status'] === 'awaiting_payment') {
                $fields[] = "status = 'processing'";
            }

            $this->db->prepare('UPDATE orders SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }

        $order = $this->find($orderId);
        if ($order['user_id']) {
            notify_shop_event(
                (int) $order['user_id'],
                $paymentState === 'paid' ? 'Payment confirmed' : 'Payment received',
                $paymentState === 'paid'
                    ? "Payment for order {$order['order_number']} has been fully verified. Thank you!"
                    : "A payment of N$" . number_format($amount, 2) . " for order {$order['order_number']} has been verified. Remaining balance: N$" . number_format($due - $newAmountPaid, 2) . '.',
                'order', 'Payment Verified'
            );
        }
        return $order;
    }

    public function cancel(int $id, string $reason): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE orders SET status = 'cancelled', payment_state = IF(payment_state = 'paid', 'refunded', 'cancelled'), cancelled_at = NOW(), cancellation_reason = :reason WHERE id = :id"
        );
        return $stmt->execute(['reason' => $reason, 'id' => $id]);
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

    private function generateSplitGroupId(): string
    {
        return 'SPLIT-' . strtoupper(bin2hex(random_bytes(6)));
    }
}
