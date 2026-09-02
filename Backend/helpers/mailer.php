<?php

require_once __DIR__ . '/../lib/PHPMailer/src/Exception.php';
require_once __DIR__ . '/../lib/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/../lib/PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Sends one HTML email via SMTP (PHPMailer) and returns whether it was
 * actually handed to the mail server — never throws, so a mail failure
 * never breaks the caller's own request (subscribing, publishing
 * content, etc.). Every outcome is logged so a failure is diagnosable
 * from the PHP error log alone: which stage it reached, and why it
 * stopped, without ever writing SMTP_PASS or any other secret to the
 * log (PHPMailer's own ErrorInfo describes the failure, e.g. "SMTP
 * connect() failed" or "authentication failed" — it does not include
 * the password).
 */
function send_email(string $toEmail, string $subject, string $htmlBody): bool
{
    if (SMTP_USER === '' || SMTP_PASS === '') {
        // No mail account configured (e.g. fresh local checkout). Skip
        // instantly instead of letting PHPMailer time out trying to
        // authenticate with blank credentials — callers already treat a
        // false return as "queued but not delivered" and don't fail the
        // user-facing request over it.
        error_log("Mailer: SEND SKIPPED to {$toEmail} — SMTP_USER/SMTP_PASS not configured. Set both in Backend/.env to enable real delivery.");
        return false;
    }

    error_log("Mailer: sending to {$toEmail} via " . SMTP_HOST . ':' . SMTP_PORT . " (subject: \"{$subject}\")");

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = SMTP_PORT;

        $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
        $mail->addAddress($toEmail);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;

        $mail->send();
        error_log("Mailer: SEND SUCCEEDED to {$toEmail}");
        return true;
    } catch (Exception $e) {
        error_log("Mailer: SEND FAILED to {$toEmail} — " . $mail->ErrorInfo);
        return false;
    }
}
