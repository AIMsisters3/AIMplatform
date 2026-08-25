<?php

namespace AIMsisters\Payments;

/**
 * Value object returned by every PaymentGatewayInterface::charge() call.
 * Plain properties (not constructor-promoted readonly ones) to stay
 * compatible with PHP 8.0 shared hosting, matching the rest of this
 * codebase.
 */
final class PaymentResult
{
    public bool $success;
    public string $status;      // e.g. 'paid', 'pending', 'failed'
    public ?string $reference;  // gateway transaction/reference ID, if any
    public string $message;     // human-readable, safe to show the customer

    public function __construct(bool $success, string $status, ?string $reference, string $message)
    {
        $this->success = $success;
        $this->status = $status;
        $this->reference = $reference;
        $this->message = $message;
    }
}
