<?php

namespace AIMsisters\Payments;

require_once __DIR__ . '/PaymentGatewayInterface.php';
require_once __DIR__ . '/PaymentResult.php';

/**
 * DPO Pay (by Network) online gateway adapter — SKELETON ONLY.
 *
 * Researched as the strongest fit for a Namibian merchant: confirmed
 * Namibia merchant support, NAD settlement, card + regional mobile money
 * acceptance, and a local Windhoek support team
 * (https://dpogroup.com/online-payments/namibia/). PayToday Namibia
 * (https://site.paytoday.com.na/) is a real alternative worth comparing
 * on fees/settlement terms before committing.
 *
 * This class deliberately does NOT call any real API. Wiring it up for
 * real requires, in order:
 *
 *   1. A DPO merchant account for AIMsisters (apply via dpogroup.com or
 *      their Windhoek team) — approval, fees, and settlement schedule
 *      are DPO's to confirm, not something this code can assume.
 *   2. From the merchant dashboard: a Company Token and a Service Type
 *      ID (DPO's API groups "services" per product/pricing type — a
 *      general e-commerce service type is normally created for you).
 *   3. DPO's Direct/Hosted Pay Page API docs (Create Token -> redirect
 *      customer to their hosted page -> Verify Token on return) — their
 *      current REST/XML API reference, requested from your account rep
 *      or the merchant portal, since integration specifics do change.
 *   4. A webhook/return-URL endpoint on this backend that calls DPO's
 *      "Verify Token" endpoint SERVER-SIDE to confirm payment status —
 *      per spec, a browser redirect alone is never trusted as proof of
 *      payment. That verification call is what would replace the
 *      exception below.
 *   5. Sandbox credentials from DPO to test the full flow before going
 *      live — do not point this at production until that passes.
 *
 * Once configured, PaymentGatewayFactory::resolve('gateway_dpo') should
 * return a real instance of this class constructed with env('DPO_COMPANY_TOKEN')
 * and env('DPO_SERVICE_TYPE'), and 'gateway_dpo' should be added to
 * PaymentGatewayFactory::availableMethods() — until then, deliberately
 * left out of both so checkout can never silently "succeed" through here.
 */
class DpoPayGateway implements PaymentGatewayInterface
{
    private ?string $companyToken;
    private ?string $serviceType;

    public function __construct(?string $companyToken, ?string $serviceType)
    {
        $this->companyToken = $companyToken;
        $this->serviceType = $serviceType;
    }

    public function charge(array $order, array $details): PaymentResult
    {
        if (!$this->companyToken || !$this->serviceType) {
            // Fails safely/loudly rather than pretending to charge —
            // see this class's docblock for what's still needed.
            return new PaymentResult(
                false,
                'failed',
                null,
                'Online card payment is not yet configured. Please choose Bank Transfer or Mobile Wallet instead.'
            );
        }

        // Real implementation (once credentials exist): POST to DPO's
        // Create Token endpoint with $order['grand_total'], NAD currency,
        // and a return URL; return a PaymentResult with status='pending'
        // and the gateway's own transaction token as $reference, and
        // redirect the customer to DPO's hosted pay page from the
        // frontend. The order must stay 'pending' until this backend's
        // own webhook/return handler independently verifies the token
        // server-side — never on the strength of the redirect alone.
        return new PaymentResult(false, 'failed', null, 'Online card payment integration is not yet implemented.');
    }
}
