<?php

require_once __DIR__ . '/layout.php';

/**
 * Sent when AuthController::forgotPassword() issues a reset link for an
 * account that actually exists — see that method's own comment for why
 * the caller always responds the same way regardless, so receiving (or
 * not receiving) this email is the only signal either way.
 */
function password_reset_email_html(string $name, string $url): string
{
    $safeName = htmlspecialchars($name, ENT_QUOTES);
    $button = email_cta_button('Reset Password', $url);

    $body = <<<HTML
    <p style="margin:0 0 10px; font-size:13px; font-weight:700; letter-spacing:1.2px; color:#7A2CF3; text-transform:uppercase;">PASSWORD RESET</p>
    <h1 class="email-heading" style="margin:0 0 16px; font-size:24px; line-height:1.35; color:#2D2A4A;">Reset your password</h1>
    <p style="margin:0 0 24px; font-size:16px; line-height:1.8; color:#4A4664;">Hi {$safeName}, we received a request to reset the password on your AIMsisters account. Click the button below to choose a new one. This link expires in 1 hour.</p>
    {$button}
    <p style="margin:24px 0 0; font-size:13px; line-height:1.7; color:#8B879E;">If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
    HTML;

    return email_layout('Reset your AIMsisters password', $body, null, 'AIMsisters — Growing Together in Faith');
}
