<?php

function confirm_email_html(string $confirmUrl): string
{
    return <<<HTML
    <div style="margin:0; padding:0; background-color:#f8f7fd; font-family:Arial, Helvetica, sans-serif; color:#2d2a4a;">
        <div style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 8px 30px rgba(45,42,74,0.08);">

            <div style="padding:36px 30px; text-align:center; background:linear-gradient(135deg,#7a2cf3,#2da8ff,#e548b9); color:#ffffff;">
                <h1 style="margin:0; font-size:28px;">Confirm Your Subscription</h1>
            </div>

            <div style="padding:36px 35px; text-align:center;">
                <p style="font-size:16px; line-height:1.7;">
                    You're one step away from receiving AIMsisters devotions,
                    Bible studies, and ministry news.
                </p>

                <p style="margin:30px 0;">
                    <a href="{$confirmUrl}"
                       style="display:inline-block; padding:14px 32px; background:#7a2cf3; color:#ffffff;
                              text-decoration:none; border-radius:999px; font-weight:bold; font-size:15px;">
                        Confirm My Subscription
                    </a>
                </p>

                <p style="font-size:13px; color:#777; line-height:1.6;">
                    If you didn't request this, you can safely ignore this email.
                </p>
            </div>

        </div>
    </div>
    HTML;
}