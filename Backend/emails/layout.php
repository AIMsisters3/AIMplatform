<?php

/**
 * Shared branded chrome for every AIMsisters transactional email — the
 * AIMsisters logo on a brand-gradient header, a soft light background,
 * a rounded white card, and a consistent footer (site link + required
 * unsubscribe link). Every template in this folder builds its own inner
 * content and passes it through email_layout() rather than duplicating
 * this markup, so the whole subscription system has exactly one place
 * that defines what an AIMsisters email looks like.
 *
 * Table-based layout + inline styles (not flex/grid, not a <link>
 * stylesheet) because that is what actually renders consistently across
 * real-world email clients (Outlook desktop's Word engine in
 * particular) — the same reason there is no JavaScript anywhere here.
 * Colors/gradient match Frontend/tailwind.config.js's brand tokens
 * (primary #2DA8FF, secondary #7A2CF3, accent #E548B9, surface #F8F7FD,
 * ink #2D2A4A) so the emails look like the same product as the website.
 */
function email_layout(string $preheader, string $bodyHtml, string $unsubscribeUrl, string $footerTagline = 'AIMsisters — Growing Together in Faith'): string
{
    $safePreheader = htmlspecialchars($preheader, ENT_QUOTES);
    $logoUrl       = htmlspecialchars(MAIL_LOGO_URL, ENT_QUOTES);
    $siteUrl       = htmlspecialchars(rtrim(FRONTEND_URL, '/'), ENT_QUOTES);
    $safeTagline   = htmlspecialchars($footerTagline, ENT_QUOTES);
    $safeUnsub     = htmlspecialchars($unsubscribeUrl, ENT_QUOTES);

    return <<<HTML
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>AIMsisters</title>
    <style>
      body, table, td, a { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; }
      body { margin: 0; padding: 0; background-color: #F8F7FD; -webkit-text-size-adjust: 100%; }
      img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
      a { text-decoration: none; }
      @media only screen and (max-width: 600px) {
        .email-wrapper { width: 100% !important; }
        .email-card { border-radius: 0 !important; }
        .email-padding { padding-left: 24px !important; padding-right: 24px !important; }
        .email-heading { font-size: 22px !important; }
      }
    </style>
    </head>
    <body style="margin:0; padding:0; background-color:#F8F7FD;">
      <div style="display:none; max-height:0; max-width:0; overflow:hidden; opacity:0; mso-hide:all;">{$safePreheader}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F7FD;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" class="email-wrapper" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px;">
              <tr>
                <td class="email-card" style="background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 8px 30px rgba(45,42,74,0.08);">

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="background:linear-gradient(135deg,#2DA8FF 0%,#7A2CF3 55%,#E548B9 100%); padding:32px 24px;">
                        <img src="{$logoUrl}" width="200" alt="AIMsisters" style="display:block; width:200px; max-width:200px; height:auto; margin:0 auto;">
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td class="email-padding" style="padding:36px 40px; color:#2D2A4A;">
                        {$bodyHtml}
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td class="email-padding" align="center" style="padding:24px 40px 32px; background:#F8F7FD; color:#8B879E; font-size:12px; line-height:1.7;">
                        <p style="margin:0 0 8px; font-weight:600; color:#7A2CF3;">{$safeTagline}</p>
                        <p style="margin:0 0 12px;">
                          <a href="{$siteUrl}" style="color:#2DA8FF; font-weight:600;">Visit AIMsisters</a>
                        </p>
                        <p style="margin:0 0 6px;">You are receiving this email because you subscribed to AIMsisters.</p>
                        <p style="margin:0;"><a href="{$safeUnsub}" style="color:#8B879E; text-decoration:underline;">Unsubscribe</a></p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    HTML;
}

/** A pill-shaped, brand-gradient call-to-action button — used by every template below. */
function email_cta_button(string $label, string $url): string
{
    $safeLabel = htmlspecialchars($label, ENT_QUOTES);
    $safeUrl   = htmlspecialchars($url, ENT_QUOTES);

    return <<<HTML
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:999px; background:linear-gradient(135deg,#2DA8FF,#7A2CF3,#E548B9);">
          <a href="{$safeUrl}" style="display:inline-block; padding:14px 34px; color:#ffffff; font-weight:700; font-size:15px; font-family:'Segoe UI',Arial,sans-serif;">{$safeLabel}</a>
        </td>
      </tr>
    </table>
    HTML;
}
