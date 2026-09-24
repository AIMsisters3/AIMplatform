<?php

namespace AIMsisters\Payments;

// No Composer autoloader in this project (everything else uses manual
// require_once too — see Backend/README) — every class this factory can
// return has to be required explicitly here.
require_once __DIR__ . '/PaymentGatewayInterface.php';
require_once __DIR__ . '/PaymentResult.php';
require_once __DIR__ . '/ManualPaymentGateway.php';

class UnsupportedPaymentMethodException extends \RuntimeException
{
}

/**
 * Resolves a `payment_method` string (from the client / orders.payment_method)
 * to a PaymentGatewayInterface implementation. This is the one place that
 * needs to change to add a new provider — see PaymentGatewayInterface's
 * docblock.
 */
class PaymentGatewayFactory
{
    public static function resolve(string $method): PaymentGatewayInterface
    {
        switch ($method) {
            // Bank transfer and mobile wallet are both "pay outside the
            // app, tell us the reference, we verify it" — the same
            // ManualPaymentGateway behavior at checkout time (order
            // created as pending). They're kept as distinct method
            // strings (matching payment_records.method) purely so the
            // customer picks the right one and sees the right
            // instructions/reference format at checkout and in admin's
            // verification queue — see PaymentController (Stage 5).
            case 'manual_bank':
            case 'manual_mobile_wallet':
            case 'manual': // back-compat alias for pre-Shop-rebuild orders
                return new ManualPaymentGateway();

            // Uncomment once a real DPO merchant account + credentials
            // exist (see DpoPayGateway.php's docblock for the full setup
            // checklist) AND 'gateway_dpo' is added to
            // availableMethods() below:
            // case 'gateway_dpo':
            //     require_once __DIR__ . '/DpoPayGateway.php';
            //     return new DpoPayGateway(env('DPO_COMPANY_TOKEN'), env('DPO_SERVICE_TYPE'));

            default:
                throw new UnsupportedPaymentMethodException("Unsupported payment method: {$method}");
        }
    }

    /** Payment methods currently available to customers — surfaced at checkout. Real online-gateway entries land here once real merchant credentials exist (see Stage 5 docs) — never faked. */
    public static function availableMethods(): array
    {
        return ['manual_bank', 'manual_mobile_wallet'];
    }
}
