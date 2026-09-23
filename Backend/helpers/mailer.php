<?php

require_once __DIR__ . '/../lib/PHPMailer/src/Exception.php';
require_once __DIR__ . '/../lib/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/../lib/PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

/**
 * Writes one diagnostic line to both PHP's normal error_log AND a
 * dedicated Backend/storage/logs/mailer.log file. Two destinations
 * because XAMPP's error_log path varies by install and is easy to lose
 * track of — mailer.log is always in a fixed, predictable place inside
 * the project itself so a failure is easy to find without hunting
 * through Apache/PHP config. Never pass anything containing SMTP_PASS
 * or any other secret to this — every call site below only logs the
 * recipient, host/port, subject, and PHPMailer's own ErrorInfo/exception
 * message, none of which include the password.
 */
function mailer_log(string $line): void
{
    error_log($line);
    $dir = __DIR__ . '/../storage/logs';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    @file_put_contents($dir . '/mailer.log', '[' . date('Y-m-d H:i:s') . '] ' . $line . "\n", FILE_APPEND);
}

/**
 * Sends one HTML email via Brevo's REST API (a plain HTTPS POST, no SMTP
 * connection at all) instead of PHPMailer/SMTP — see MAIL_DRIVER's own
 * comment in config.php for why this exists. Returns whether Brevo
 * accepted the send request (HTTP 201), same contract as send_email().
 */
function send_email_via_brevo_api(string $toEmail, string $subject, string $htmlBody): bool
{
    if (BREVO_API_KEY === '') {
        mailer_log("SEND SKIPPED to {$toEmail} — MAIL_DRIVER=brevo_api but BREVO_API_KEY is empty. Set it in Backend/.env to enable delivery.");
        return false;
    }
    if (!function_exists('curl_init')) {
        mailer_log("SEND FAILED to {$toEmail} — the curl PHP extension is not available on this server, required for MAIL_DRIVER=brevo_api.");
        return false;
    }

    $payload = json_encode([
        'sender'      => ['name' => SMTP_FROM_NAME, 'email' => SMTP_FROM_EMAIL],
        'to'          => [['email' => $toEmail]],
        'subject'     => $subject,
        'htmlContent' => $htmlBody,
    ]);

    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'api-key: ' . BREVO_API_KEY,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_TIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    // Brevo returns 201 Created on a successful send — never log
    // $response's body as-is without checking first, since a real error
    // response only ever describes the request (bad recipient, invalid
    // key format), never echoes the key itself back.
    if ($httpCode === 201) {
        mailer_log("SEND SUCCEEDED to {$toEmail} (via Brevo API)");
        return true;
    }

    mailer_log("SEND FAILED to {$toEmail} (via Brevo API) — HTTP {$httpCode}: " . ($curlError ?: $response));
    return false;
}

/**
 * Sends one HTML email via SMTP (PHPMailer) and returns whether it was
 * actually handed to the mail server — never throws, so a mail failure
 * never breaks the caller's own request (subscribing, publishing
 * content, etc.). Every outcome is logged via mailer_log() so a failure
 * is diagnosable without ever writing SMTP_PASS or any other secret to
 * a log (PHPMailer's own ErrorInfo describes the failure, e.g. "SMTP
 * connect() failed" or "authentication failed" — it does not include
 * the password).
 */
function send_email(string $toEmail, string $subject, string $htmlBody): bool
{
    if (MAIL_DRIVER === 'brevo_api') {
        return send_email_via_brevo_api($toEmail, $subject, $htmlBody);
    }

    if (SMTP_USER === '' || SMTP_PASS === '') {
        // No mail account configured (e.g. fresh local checkout). Skip
        // instantly instead of letting PHPMailer time out trying to
        // authenticate with blank credentials — callers already treat a
        // false return as "queued but not delivered" and don't fail the
        // user-facing request over it.
        mailer_log("SEND SKIPPED to {$toEmail} — SMTP_USER/SMTP_PASS not configured (both are empty). Set both in Backend/.env to enable real delivery.");
        return false;
    }

    // SMTP_USER itself is not a secret (it's a visible "from" identity, not
    // the password) — logging it here answers "are the env vars actually
    // being loaded?" without exposing anything sensitive.
    mailer_log("SEND ATTEMPT to {$toEmail} — host=" . SMTP_HOST . ':' . SMTP_PORT . ", user=" . SMTP_USER . ', openssl=' . (extension_loaded('openssl') ? 'yes' : 'NO (PHPMailer cannot do STARTTLS without it)') . ", subject=\"{$subject}\"");

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = SMTP_PORT;

        if (APP_ENV === 'local') {
            // Common on XAMPP/Windows local dev: PHP's bundled CA root list
            // is stale or missing, so the STARTTLS handshake to a real
            // provider (Gmail, etc.) fails purely on certificate
            // verification — not on the credentials — with an error like
            // "stream_socket_enable_crypto(): SSL operation failed" or
            // "Peer certificate CN=... did not match". This relaxes only
            // that verification, and ONLY when APP_ENV=local; production
            // must set a real APP_ENV so this never applies there.
            $mail->SMTPOptions = [
                'ssl' => [
                    'verify_peer'       => false,
                    'verify_peer_name'  => false,
                    'allow_self_signed' => true,
                ],
            ];
        }

        $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
        $mail->addAddress($toEmail);

        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;

        $mail->send();
        mailer_log("SEND SUCCEEDED to {$toEmail}");
        return true;
    } catch (PHPMailerException $e) {
        mailer_log("SEND FAILED to {$toEmail} — " . $mail->ErrorInfo);
        return false;
    } catch (Throwable $e) {
        // Anything that isn't PHPMailer's own exception (a misconfigured
        // extension, a TypeError, etc.) — caught separately so it's never
        // mistaken for a normal SMTP rejection, and never allowed to bubble
        // up and break the caller's request either way.
        mailer_log("SEND FAILED to {$toEmail} — unexpected " . get_class($e) . ': ' . $e->getMessage());
        return false;
    }
}
