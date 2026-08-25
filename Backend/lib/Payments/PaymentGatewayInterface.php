<?php

namespace AIMsisters\Payments;

/**
 * Payment gateway abstraction (spec §26: "Prepare architecture for payment
 * gateways... do not hard-code one payment provider").
 *
 * OrderController talks only to this interface, never to a specific
 * provider's SDK. To add Stripe or PayPal later: create
 * StripePaymentGateway/PayPalPaymentGateway implementing this interface,
 * add its case to PaymentGatewayFactory::resolve(), and add its API keys
 * to .env / config.php — no change needed to OrderController, Order model,
 * routes, or the database schema (orders.payment_method already stores
 * whichever gateway slug was used, and payment_reference stores whatever
 * ID that gateway returns).
 */
interface PaymentGatewayInterface
{
    /**
     * Attempt to collect payment for an order. Implementations must never
     * throw for an expected decline — return a PaymentResult with
     * success=false instead, so the caller can show the customer a normal
     * error rather than a 500.
     *
     * @param array $order   The order row (id, order_number, grand_total, ...).
     * @param array $details Gateway-specific payment details from the
     *                       client (e.g. a Stripe PaymentMethod ID). May
     *                       be empty for gateways that don't need any
     *                       (e.g. "pay on collection").
     */
    public function charge(array $order, array $details): PaymentResult;
}
