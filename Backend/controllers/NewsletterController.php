<?php

require_once __DIR__ . '/../models/Subscriber.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/rate_limit_v2.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../helpers/admin_notify.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../emails/welcome_template.php';

class NewsletterController
{
    private Subscriber $model;

    public function __construct()
    {
        $this->model = new Subscriber();
    }

    /**
     * POST /api/newsletter/subscribe (public, no auth) body: {email, language?}
     * Free, single-step: no account required, subscribed immediately —
     * no email-confirmation loop to get stuck in if SMTP isn't configured.
     */
    public function subscribe(): void
    {
        rate_limit_check('newsletter:' . client_ip(), 15, 3600);

        $body  = get_json_body();
        $email = strtolower(trim($body['email'] ?? ''));
        $requestedLanguage = $body['language'] ?? 'English';
        $language = in_array($requestedLanguage, ['English', 'Oshiwambo'], true)
            ? $requestedLanguage
            : 'English';

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_error('Please enter a valid email address.', 422);
        }

        $existing = $this->model->findByEmail($email);

        if ($existing && $existing['status'] === 'subscribed') {
            json_error("You're already subscribed to AIMsisters.", 409);
        }

        $token = bin2hex(random_bytes(32));

        if ($existing) {
            // Previously unsubscribed (or a leftover 'pending' row from an
            // earlier build of this feature) — reactivate rather than
            // inserting a second row for the same email.
            $this->model->reactivate((int) $existing['id'], $token);
        } else {
            $this->model->create($email, $token, $language);
        }
        error_log("Newsletter: subscribed {$email} (db row saved, status=subscribed)");

        notify_admins_event(
            'New newsletter subscriber',
            "{$email} subscribed to the AIMsisters newsletter.",
            'subscriptions',
            '/admin/newsletter'
        );

        // A failed send here (e.g. SMTP not configured locally) never
        // blocks the subscription itself — the row above is already
        // committed either way. $emailSent tells the caller (and, via
        // the response below, the frontend) whether the welcome email
        // was actually handed to the mail server, distinct from whether
        // the subscription itself succeeded — see send_email()'s own
        // logging in helpers/mailer.php for exactly why it did or didn't.
        $unsubscribeUrl = APP_URL . '/newsletter_unsubscribe.php?token=' . urlencode($token);
        $emailSent = send_email($email, "You're subscribed to AIMsisters!", welcome_email_html($unsubscribeUrl));

        json_created(
            ['email_sent' => $emailSent],
            "You're subscribed! You'll receive new AIMsisters devotions, studies, and ministry news in your inbox."
        );
    }

    /** GET /api/newsletter/subscribers?status=&search= (requires newsletter.manage) */
    public function adminList(): void
    {
        require_permission('newsletter.manage');
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(100, (int) ($_GET['limit'] ?? 50));
        $status = $_GET['status'] ?? null;
        $search = trim($_GET['search'] ?? '') ?: null;

        json_ok([
            'items' => $this->model->all($status, $search, $limit, ($page - 1) * $limit),
            'subscribed_count' => $this->model->count(),
        ]);
    }

    /** POST /api/newsletter/{id}/deactivate (requires newsletter.manage) — admin-initiated unsubscribe. */
    public function adminDeactivate(int $id): void
    {
        require_permission('newsletter.manage');
        if (!$this->model->find($id)) {
            json_error('Subscriber not found.', 404);
        }
        $this->model->unsubscribe($id);
        json_ok(null, 'Subscriber deactivated.');
    }

    /**
     * POST /api/newsletter/test-email (requires newsletter.manage) — sends
     * a real test email to the CALLING admin's own account address, using
     * the exact same send_email() path every subscriber/News/Devotion
     * email goes through. Exists so an admin can check "is email delivery
     * actually working right now" from inside the CMS itself, without
     * needing FTP/SSH access to read Backend/storage/logs/mailer.log -
     * the real underlying failure reason (e.g. "SMTP connect() failed",
     * "authentication failed") is read back from that same log line and
     * returned directly in the response, never hidden or replaced with a
     * generic message.
     */
    public function sendTestEmail(): void
    {
        $payload = require_permission('newsletter.manage');
        $admin = (new User())->findById((int) $payload['sub']);
        if (!$admin || empty($admin['email'])) {
            json_error('Could not find your own account email to send the test to.', 404);
        }

        $logFile = __DIR__ . '/../storage/logs/mailer.log';
        $sizeBefore = is_file($logFile) ? filesize($logFile) : 0;

        $sent = send_email(
            $admin['email'],
            'AIMsisters — test email',
            '<p>This is a test email sent from the AIMsisters admin panel to confirm outgoing email delivery is currently working.</p>'
            . '<p>Driver in use: <strong>' . htmlspecialchars(MAIL_DRIVER) . '</strong></p>'
            . '<p>Sent at: ' . htmlspecialchars(date('Y-m-d H:i:s')) . ' (Africa/Windhoek)</p>'
        );

        // Pull back just the line(s) mailer_log() wrote for this specific
        // attempt (the file only ever grows, so anything past the
        // pre-send size is from this call), so the real reason is visible
        // in the admin panel itself.
        $detail = null;
        if (is_file($logFile)) {
            $content = file_get_contents($logFile);
            $newContent = $sizeBefore > 0 && $sizeBefore <= strlen($content) ? substr($content, $sizeBefore) : $content;
            $lines = array_values(array_filter(array_map('trim', explode("\n", trim($newContent)))));
            $detail = $lines ? end($lines) : null;
        }

        json_ok([
            'sent'        => $sent,
            'to'          => $admin['email'],
            'mail_driver' => MAIL_DRIVER,
            'detail'      => $detail,
        ], $sent ? 'Test email sent — check your inbox (and spam folder).' : 'Test email failed — see the detail below for the real reason.');
    }
}
