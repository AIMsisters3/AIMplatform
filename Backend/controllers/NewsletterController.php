<?php

require_once __DIR__ . '/../models/Subscriber.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/rate_limit.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';
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

        // A failed send here (e.g. SMTP not configured locally) never
        // blocks the subscription itself — send_email() already fails
        // gracefully (logs, returns false) and the row is subscribed
        // either way, matching how every other mailer call in this app
        // behaves (see NewsletterController's own history, register, etc.).
        $unsubscribeUrl = APP_URL . '/newsletter_unsubscribe.php?token=' . urlencode($token);
        send_email($email, "You're subscribed to AIMsisters!", welcome_email_html($unsubscribeUrl));

        json_created(null, "You're subscribed! You'll receive new AIMsisters devotions, studies, and ministry news in your inbox.");
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
}
