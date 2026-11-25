<?php
/**
 * AIMsisters - SMS/WhatsApp sending via Twilio's REST API (plain HTTPS
 * POST, no SDK needed), mirroring helpers/mailer.php's own contract
 * exactly: never throws, always logs, returns false (never simulates
 * success) when unconfigured or when the provider rejects the send.
 *
 * Every attempt is also written to notification_messages (migration 045)
 * so admins can see sent/delivered/failed/skipped history - see
 * Admin/Pages/Shop/NotificationsTab.jsx for where that surfaces.
 */

require_once __DIR__ . '/../config/database.php';

/** Same two-destination logging pattern as mailer_log() - never pass anything containing TWILIO_AUTH_TOKEN to this. */
function sms_log(string $line): void
{
    error_log($line);
    $dir = __DIR__ . '/../storage/logs';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    @file_put_contents($dir . '/sms.log', '[' . date('Y-m-d H:i:s') . '] ' . $line . "\n", FILE_APPEND);
}

/**
 * Records one send attempt in notification_messages. Called from
 * send_order_sms() regardless of outcome, so "skipped (not configured)"
 * is just as visible to admins as a real failure - the spec's "do not
 * pretend a message was delivered" applies equally to pretending nothing
 * was even attempted.
 */
function log_notification_message(?int $userId, ?int $orderId, string $phone, string $channel, ?string $eventType, string $message, string $status, ?string $sid, ?string $error): void
{
    try {
        $stmt = Database::getConnection()->prepare(
            'INSERT INTO notification_messages (user_id, order_id, phone, channel, event_type, message, status, provider_message_sid, error)
             VALUES (:user_id, :order_id, :phone, :channel, :event_type, :message, :status, :sid, :error)'
        );
        $stmt->execute([
            'user_id' => $userId, 'order_id' => $orderId, 'phone' => $phone, 'channel' => $channel,
            'event_type' => $eventType, 'message' => $message, 'status' => $status, 'sid' => $sid, 'error' => $error,
        ]);
    } catch (Throwable $e) {
        error_log('Failed to log notification_messages row: ' . $e->getMessage());
    }
}

/**
 * Sends one message via Twilio's Messages API. $from must already carry
 * the "whatsapp:" prefix for a WhatsApp send (Twilio's own convention) -
 * callers never build that prefix themselves, see send_order_sms() below.
 * Returns ['sid' => string] on success or ['error' => string] on failure;
 * never throws.
 */
function send_twilio_message(string $from, string $to, string $body): array
{
    if (TWILIO_ACCOUNT_SID === '' || TWILIO_AUTH_TOKEN === '') {
        return ['error' => 'Twilio not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN empty in Backend/.env).'];
    }
    if (!function_exists('curl_init')) {
        return ['error' => 'The curl PHP extension is not available on this server.'];
    }

    $url = 'https://api.twilio.com/2010-04-01/Accounts/' . TWILIO_ACCOUNT_SID . '/Messages.json';
    $payload = http_build_query(['From' => $from, 'To' => $to, 'Body' => $body]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_USERPWD        => TWILIO_ACCOUNT_SID . ':' . TWILIO_AUTH_TOKEN,
        CURLOPT_TIMEOUT        => 15,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        $data = json_decode((string) $response, true);
        return ['sid' => $data['sid'] ?? null];
    }

    // Twilio's error responses only ever describe the request (bad
    // number, unverified sandbox recipient, insufficient balance) -
    // never anything secret - safe to log/store as-is.
    return ['error' => "HTTP {$httpCode}: " . ($curlError ?: $response)];
}

/**
 * The one entry point shop_notify.php calls. Tries WhatsApp first if a
 * WhatsApp sender is configured (richer, usually preferred by
 * customers), falling back to plain SMS if only that's configured.
 * Logs + records a 'skipped' row and returns false if neither is set up
 * - this is the expected state until AIMsisters provides real Twilio
 * credentials, and callers must never treat that as an error worth
 * surfacing to the customer.
 */
function send_order_sms(string $toPhone, string $message, ?int $userId = null, ?int $orderId = null, ?string $eventType = null): bool
{
    $toPhone = trim($toPhone);
    if ($toPhone === '') {
        return false;
    }

    $useWhatsApp = TWILIO_WHATSAPP_FROM !== '';
    $channel = $useWhatsApp ? 'whatsapp' : 'sms';

    if (!$useWhatsApp && TWILIO_FROM_NUMBER === '') {
        sms_log("SEND SKIPPED to {$toPhone} - Twilio not configured (set TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER, and TWILIO_WHATSAPP_FROM for WhatsApp, in Backend/.env).");
        log_notification_message($userId, $orderId, $toPhone, $channel, $eventType, $message, 'skipped', null, 'Twilio not configured.');
        return false;
    }

    $from = $useWhatsApp ? TWILIO_WHATSAPP_FROM : TWILIO_FROM_NUMBER;
    $to = $useWhatsApp ? 'whatsapp:' . $toPhone : $toPhone;
    $fromFormatted = $useWhatsApp && !str_starts_with($from, 'whatsapp:') ? 'whatsapp:' . $from : $from;

    $result = send_twilio_message($fromFormatted, $to, $message);

    if (isset($result['sid'])) {
        sms_log("SEND SUCCEEDED to {$toPhone} via {$channel} (sid={$result['sid']})");
        log_notification_message($userId, $orderId, $toPhone, $channel, $eventType, $message, 'sent', $result['sid'], null);
        return true;
    }

    sms_log("SEND FAILED to {$toPhone} via {$channel} - " . $result['error']);
    log_notification_message($userId, $orderId, $toPhone, $channel, $eventType, $message, 'failed', null, $result['error']);
    return false;
}
