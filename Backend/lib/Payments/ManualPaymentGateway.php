<?php

namespace AIMsisters\Payments;

require_once __DIR__ . '/PaymentGatewayInterface.php';
require_once __DIR__ . '/PaymentResult.php';

/**
 * Default payment gateway: no external processor required. The order is
 * created as 'pending' and an admin confirms payment manually (bank
 * transfer, cash/EFT at church, mobile money screenshot, etc.) via
 * OrderController::updateStatus — this is a real, working checkout path
 * for a ministry that doesn't have a merchant account yet, not a stub.
 *
 * When a real processor is wired in later (Stripe, PayPal, ...), it
 * becomes another class implementing PaymentGatewayInterface and a new
 * case in PaymentGatewayFactory — this class keeps working unchanged for
 * "pay offline" as an option alongside it.
 */
class ManualPaymentGateway implements PaymentGatewayInterface
{
    public function charge(array $order, array $details): PaymentResult
    {
        return new PaymentResult(
            true,
            'pending',
            'MANUAL-' . $order['order_number'],
            'Order received. Payment will be confirmed manually by our team.'
        );
    }
}
