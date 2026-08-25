<?php

require_once __DIR__ . '/../models/Subscriber.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/rate_limit.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../emails/confirm_template.php';

class NewsletterController
{
    private Subscriber $model;

    public function __construct()
    {
        $this->model = new Subscriber();
    }

    /** POST /api/newsletter/subscribe body: {email} */
    public function subscribe(): void
    {
        rate_limit_check('newsletter:' . client_ip(), 15, 3600);

        $body  = get_json_body();
        $email = trim($body['email'] ?? '');
        $language = in_array($body['language'] ?? 'English', ['English', 'Oshiwambo'], true)
            ? $body['language']
            : 'English';

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_error('Please enter a valid email address.', 422);
        }

        $existing = $this->model->findByEmail($email);

        if ($existing && $existing['status'] === 'subscribed') {
            json_error('This email is already subscribed.', 409);
        }

        $token = bin2hex(random_bytes(32));

        if ($existing) {
            $this->model->updateToken((int) $existing['id'], $token);
        } else {
            $this->model->create($email, $token, $language);
        }

        $confirmUrl = APP_URL . '/newsletter_confirm.php?token=' . urlencode($token);
        send_email($email, 'Confirm your AIMsisters subscription', confirm_email_html($confirmUrl));

        json_created(null, 'Almost done! Check your inbox to confirm your subscription.');
    }

    /** GET /api/newsletter/subscribers?status= (requires newsletter.manage) */
    public function adminList(): void
    {
        require_permission('newsletter.manage');
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(100, (int) ($_GET['limit'] ?? 50));
        $status = $_GET['status'] ?? null;

        json_ok([
            'items' => $this->model->all($status, $limit, ($page - 1) * $limit),
            'subscribed_count' => $this->model->count(),
        ]);
    }
}