<?php

/**
 * Sent to subscribers when a devotion, Bible study, or news item is
 * newly published (see Backend/helpers/publish_notify.php for when this
 * actually fires). $title and $excerpt are the real, published content's
 * own title/description — never invented — passed in by the caller.
 */
function content_notification_email_html(
    string $label,
    string $buttonLabel,
    string $title,
    string $excerpt,
    string $url,
    string $unsubscribeUrl
): string {
    $safeTitle = htmlspecialchars($title, ENT_QUOTES);
    $safeExcerpt = htmlspecialchars($excerpt, ENT_QUOTES);

    $excerptHtml = $safeExcerpt !== ''
        ? "<p style=\"font-size:16px; line-height:1.8; color:#444;\">{$safeExcerpt}</p>"
        : '';

    return <<<HTML
    <div style="margin:0; padding:0; background-color:#f8f7fd; font-family:Arial, Helvetica, sans-serif; color:#2d2a4a;">
        <div style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 8px 30px rgba(45,42,74,0.08);">

            <div style="padding:32px 30px; text-align:center; background:linear-gradient(135deg,#7a2cf3,#2da8ff,#e548b9); color:#ffffff;">
                <h1 style="margin:0 0 6px; font-size:24px;">AIMsisters</h1>
                <p style="margin:0; font-size:15px; opacity:0.95; text-transform:uppercase; letter-spacing:0.5px;">{$label}</p>
            </div>

            <div style="padding:36px 35px;">
                <h2 style="margin:0 0 16px; font-size:22px; line-height:1.4;">{$safeTitle}</h2>
                {$excerptHtml}

                <p style="margin:30px 0 10px;">
                    <a href="{$url}"
                       style="display:inline-block; padding:14px 32px; background:#7a2cf3; color:#ffffff;
                              text-decoration:none; border-radius:999px; font-weight:bold; font-size:15px;">
                        {$buttonLabel}
                    </a>
                </p>
            </div>

            <div style="padding:22px 30px; text-align:center; background:#f8f7fd; color:#777; font-size:13px;">
                <p style="margin:0 0 8px;">You are receiving this because you subscribed to AIMsisters email updates.</p>
                <p style="margin:0;"><a href="{$unsubscribeUrl}" style="color:#7a2cf3;">Unsubscribe</a></p>
            </div>

        </div>
    </div>
    HTML;
}
