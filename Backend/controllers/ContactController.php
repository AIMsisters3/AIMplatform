<?php

require_once __DIR__ . '/../models/ContactMessage.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/rate_limit_v2.php';
require_once __DIR__ . '/../helpers/admin_notify.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../emails/order_notification_template.php';

class ContactController
{
    // Every contact form submission's real destination - the in-app
    // notification below is a secondary channel for whoever happens to
    // be logged into the admin panel, not a substitute for this: an
    // actual inbox someone checks even when nobody's signed in.
    private const CONTACT_INBOX = 'aimsisters3@gmail.com';

    private ContactMessage $model;

    public function __construct()
    {
        $this->model = new ContactMessage();
    }

    /** POST /api/contact (public, no auth) body: {name, email, message} */
    public function store(): void
    {
        rate_limit_check('contact:' . client_ip(), 10, 3600);

        $body = get_json_body();
        $name = trim($body['name'] ?? '');
        $email = strtolower(trim($body['email'] ?? ''));
        $message = trim($body['message'] ?? '');

        if ($name === '') {
            json_error('Please enter your name.', 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_error('Please enter a valid email address.', 422);
        }
        if ($message === '') {
            json_error('Please write a message before sending.', 422);
        }
        if (mb_strlen($message) > 4000) {
            json_error('Message is too long (max 4000 characters).', 422);
        }

        $id = $this->model->create($name, $email, $message);

        notify_admins_event(
            'New contact message',
            "From {$name} <{$email}>: \"" . mb_substr($message, 0, 140) . (mb_strlen($message) > 140 ? '...' : '') . '"',
            'contact'
        );

        // A logged-out visitor's message must reach a real inbox, not just
        // the in-app bell above (which only whoever happens to be signed
        // into the admin panel right now would ever see). Never let a mail
        // failure fail the submission itself - send_email() already
        // returns false rather than throwing and logs the real reason
        // (see mailer_log()) if this doesn't go through.
        try {
            $html = order_notification_email_html(
                'New Contact Message',
                "Message from {$name}",
                "From: {$name} <{$email}>\n\n{$message}",
                'Reply by Email',
                'mailto:' . $email
            );
            send_email(self::CONTACT_INBOX, "New contact message from {$name}", $html);
        } catch (Throwable $e) {
            error_log('Contact message email failed for #' . $id . ': ' . $e->getMessage());
        }

        json_created(['id' => $id], "Thank you! Your message has been sent — we'll get back to you soon.");
    }
}
