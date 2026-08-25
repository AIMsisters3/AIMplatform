<?php

function welcome_email_html(): string
{
    return <<<HTML
    <div style="margin:0; padding:0; background-color:#f8f7fd; font-family:Arial, Helvetica, sans-serif; color:#2d2a4a;">
        <div style="max-width:650px; margin:40px auto; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 8px 30px rgba(45,42,74,0.08);">

            <div style="padding:40px 30px; text-align:center; background:linear-gradient(135deg,#7a2cf3,#2da8ff,#e548b9); color:#ffffff;">
                <h1 style="margin:0 0 10px; font-size:32px;">Welcome to AIMsisters</h1>
                <p style="margin:0; font-size:16px; opacity:0.95;">A place to grow, discover, and walk closer with God.</p>
            </div>

            <div style="padding:40px 35px;">
                <p style="font-size:17px; line-height:1.7; margin-top:0;">Dear Friend,</p>

                <p style="font-size:16px; line-height:1.8;">
                    Thank you for joining the <strong>AIMsisters community</strong>.
                    We are truly happy to have you with us.
                </p>

                <p style="font-size:16px; line-height:1.8;">
                    AIMsisters exists to share the love of Christ through
                    <strong>Bible studies, devotions, encouragement, and ministry resources</strong>.
                    Our prayer is that every message you receive will point you
                    closer to Jesus and strengthen your walk with Him.
                </p>

                <div style="margin:30px 0; padding:25px; background:#f8f7fd; border-left:4px solid #7a2cf3; border-radius:10px;">
                    <p style="margin:0; font-size:16px; line-height:1.7; font-style:italic;">
                        "Draw near to God, and He will draw near to you."
                    </p>
                    <p style="margin:10px 0 0; font-size:14px; color:#777;">James 4:8</p>
                </div>

                <p style="font-size:16px; line-height:1.8;">
                    From time to time, we'll share new Bible studies, devotions,
                    ministry news, and other resources designed to encourage you
                    in your journey of faith.
                </p>

                <p style="font-size:16px; line-height:1.8;">
                    We're grateful that you've chosen to be part of this community.
                    May your time with AIMsisters be a blessing, and may every step
                    lead you closer to Christ.
                </p>

                <p style="font-size:16px; line-height:1.8; margin-bottom:5px;">With love and prayers,</p>
                <p style="font-size:18px; font-weight:bold; margin-top:0; color:#7a2cf3;">The AIMsisters Team</p>
            </div>

            <div style="padding:25px 30px; text-align:center; background:#f8f7fd; color:#777; font-size:13px;">
                <p style="margin:0 0 8px;">AIMsisters — Growing Together in Faith</p>
                <p style="margin:0;">Thank you for being part of our community.</p>
            </div>

        </div>
    </div>
    HTML;
}