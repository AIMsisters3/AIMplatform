<?php

require_once __DIR__ . '/layout.php';

/**
 * Shared template for every Shop/order transactional email (order
 * placed, Pay Later approved/declined/reminder/expired, deposit
 * required, payment verified, procurement/arrival updates, ...).
 * Unlike content_notification_template.php's newsletter emails, these
 * pass no unsubscribe URL to email_layout() — an order update isn't a
 * subscription a customer can opt out of.
 */
function order_notification_email_html(string $eyebrow, string $title, string $message, ?string $buttonLabel = null, ?string $url = null): string
{
    $safeEyebrow = htmlspecialchars(strtoupper($eyebrow), ENT_QUOTES);
    $safeTitle   = htmlspecialchars($title, ENT_QUOTES);
    $safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES));

    $button = ($buttonLabel && $url) ? email_cta_button($buttonLabel, $url) : '';

    $body = <<<HTML
    <p style="margin:0 0 10px; font-size:13px; font-weight:700; letter-spacing:1.2px; color:#7A2CF3; text-transform:uppercase;">{$safeEyebrow}</p>
    <h1 class="email-heading" style="margin:0 0 18px; font-size:24px; line-height:1.35; color:#2D2A4A;">{$safeTitle}</h1>
    <p style="margin:0 0 28px; font-size:16px; line-height:1.8; color:#4A4664;">{$safeMessage}</p>
    {$button}
    HTML;

    return email_layout($title, $body, null, 'AIMsisters Shop');
}
