<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/sms_notify.php';

/**
 * Receives Twilio's status-callback POSTs (configure this endpoint's
 * full URL as the StatusCallback on the Twilio Messages API, or as the
 * account-wide default in the Twilio Console) so notification_messages.
 * status ever advances past 'sent' to 'delivered' - the spec is explicit
 * that delivery must never be assumed, only recorded when the provider
 * actually confirms it.
 */
class NotificationWebhookController
{
    /** POST /api/webhooks/twilio-status - public (Twilio can't hold our auth token), validated via Twilio's own request-signature scheme instead. */
    public function twilioStatus(): void
    {
        if (TWILIO_AUTH_TOKEN === '' || !$this->isValidTwilioSignature()) {
            // Never 200 an unverified request — Twilio retries on non-2xx,
            // and silently accepting unverified data here would let anyone
            // forge "delivered" statuses into the admin's notification log.
            http_response_code(403);
            exit;
        }

        $sid = $_POST['MessageSid'] ?? $_POST['SmsSid'] ?? null;
        $status = $_POST['MessageStatus'] ?? $_POST['SmsStatus'] ?? null;
        if (!$sid || !$status) {
            http_response_code(400);
            exit;
        }

        try {
            $db = Database::getConnection();
            if ($status === 'delivered') {
                $db->prepare("UPDATE notification_messages SET status = 'delivered', delivered_at = NOW() WHERE provider_message_sid = :sid")
                    ->execute(['sid' => $sid]);
            } elseif (in_array($status, ['failed', 'undelivered'], true)) {
                $db->prepare("UPDATE notification_messages SET status = 'failed', error = CONCAT(COALESCE(error, ''), ' | provider reported: ', :status) WHERE provider_message_sid = :sid")
                    ->execute(['sid' => $sid, 'status' => $status]);
            }
        } catch (Throwable $e) {
            error_log('Twilio status webhook update failed: ' . $e->getMessage());
        }

        http_response_code(200);
        exit;
    }

    /**
     * Twilio's documented request-validation scheme: HMAC-SHA1 of the
     * full callback URL with every POST param (sorted by key, key+value
     * concatenated with no separator) appended, base64-encoded, compared
     * to the X-Twilio-Signature header. https://www.twilio.com/docs/usage/security
     */
    private function isValidTwilioSignature(): bool
    {
        $signature = $_SERVER['HTTP_X_TWILIO_SIGNATURE'] ?? '';
        if ($signature === '') {
            return false;
        }

        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $url = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '') . ($_SERVER['REQUEST_URI'] ?? '');

        $data = $url;
        $params = $_POST;
        ksort($params);
        foreach ($params as $key => $value) {
            $data .= $key . $value;
        }

        $expected = base64_encode(hash_hmac('sha1', $data, TWILIO_AUTH_TOKEN, true));
        return hash_equals($expected, $signature);
    }
}
