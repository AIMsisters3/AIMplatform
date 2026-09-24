<?php

require_once __DIR__ . '/layout.php';

/**
 * Sent to subscribers when a devotion, Bible study, or news item is
 * newly published (see Backend/helpers/publish_notify.php for when this
 * actually fires — once per item, never on a later edit). $title and
 * $excerpt are the real, published content's own title/description —
 * never invented — passed in by the caller.
 */
function content_notification_email_html(
    string $eyebrow,
    string $buttonLabel,
    string $title,
    string $excerpt,
    string $url,
    string $unsubscribeUrl,
    ?string $publishDate = null,
    ?string $thumbnailUrl = null
): string {
    $safeEyebrow = htmlspecialchars(strtoupper($eyebrow), ENT_QUOTES);
    $safeTitle   = htmlspecialchars($title, ENT_QUOTES);
    $safeExcerpt = htmlspecialchars($excerpt, ENT_QUOTES);

    $dateHtml = '';
    if ($publishDate) {
        $formatted = htmlspecialchars(date('j F Y', strtotime($publishDate)), ENT_QUOTES);
        $dateHtml = "<p style=\"margin:0 0 14px; font-size:13px; color:#8B879E;\">{$formatted}</p>";
    }

    // Real uploaded thumbnail only — never a placeholder/stock image when
    // one isn't set (spec: an appropriate image "where available").
    $imageHtml = '';
    if ($thumbnailUrl) {
        $safeThumb = htmlspecialchars($thumbnailUrl, ENT_QUOTES);
        $imageHtml = <<<HTML
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
          <tr><td>
            <img src="{$safeThumb}" alt="{$safeTitle}" width="520" style="display:block; width:100%; max-width:520px; height:auto; border-radius:14px;">
          </td></tr>
        </table>
        HTML;
    }

    $excerptHtml = $safeExcerpt !== ''
        ? "<p style=\"margin:0 0 28px; font-size:16px; line-height:1.8; color:#4A4664;\">{$safeExcerpt}</p>"
        : '<div style="margin:0 0 20px;"></div>';

    $button = email_cta_button($buttonLabel, $url);

    $body = <<<HTML
    <p style="margin:0 0 10px; font-size:13px; font-weight:700; letter-spacing:1.2px; color:#7A2CF3; text-transform:uppercase;">{$safeEyebrow}</p>
    <h1 class="email-heading" style="margin:0 0 8px; font-size:24px; line-height:1.35; color:#2D2A4A;">{$safeTitle}</h1>
    {$dateHtml}
    {$imageHtml}
    {$excerptHtml}
    {$button}
    HTML;

    return email_layout(
        "{$eyebrow}: {$title}",
        $body,
        $unsubscribeUrl,
        'AIMsisters — Sharing Christ • Sharing Hope • Sharing Truth'
    );
}
