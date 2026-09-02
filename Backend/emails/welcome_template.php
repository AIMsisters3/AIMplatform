<?php

require_once __DIR__ . '/layout.php';

/** Sent immediately when someone subscribes — see NewsletterController::subscribe(). */
function welcome_email_html(string $unsubscribeUrl): string
{
    $siteUrl = htmlspecialchars(rtrim(FRONTEND_URL, '/'), ENT_QUOTES);
    $button  = email_cta_button('Visit AIMsisters', $siteUrl);

    $body = <<<HTML
    <h1 class="email-heading" style="margin:0 0 6px; font-size:26px; line-height:1.3; color:#2D2A4A;">Welcome to AIMsisters</h1>
    <p style="margin:0 0 26px; font-size:16px; font-weight:600; color:#7A2CF3;">Thank you for subscribing!</p>

    <p style="margin:0 0 14px; font-size:16px; line-height:1.7; color:#4A4664;">You are now subscribed to receive new:</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="padding:5px 0; font-size:16px; line-height:1.6; color:#2D2A4A;"><span style="color:#7A2CF3; font-weight:700;">&bull;</span>&nbsp; Devotions</td></tr>
      <tr><td style="padding:5px 0; font-size:16px; line-height:1.6; color:#2D2A4A;"><span style="color:#7A2CF3; font-weight:700;">&bull;</span>&nbsp; Bible Studies</td></tr>
      <tr><td style="padding:5px 0; font-size:16px; line-height:1.6; color:#2D2A4A;"><span style="color:#7A2CF3; font-weight:700;">&bull;</span>&nbsp; Ministry News</td></tr>
    </table>

    <p style="margin:0 0 6px; font-size:16px; line-height:1.7; color:#4A4664;">directly in your inbox.</p>
    <p style="margin:0 0 30px; font-size:16px; line-height:1.7; color:#4A4664;">We are grateful to have you with us.</p>

    {$button}
    HTML;

    return email_layout(
        "Welcome to AIMsisters — you're subscribed!",
        $body,
        $unsubscribeUrl,
        'AIMsisters — Growing Together in Faith'
    );
}
