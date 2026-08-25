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
            case 'manual':
                return new ManualPaymentGateway();

            // case 'stripe':
            //     return new StripePaymentGateway(env('STRIPE_SECRET_KEY'));
            // case 'paypal':
            //     return new PayPalPaymentGateway(env('PAYPAL_CLIENT_ID'), env('PAYPAL_SECRET'));

            default:
                throw new UnsupportedPaymentMethodException("Unsupported payment method: {$method}");
        }
    }

    /** Payment methods currently available to customers — surfaced at checkout. */
    public static function availableMethods(): array
    {
        return ['manual'];
    }
}
