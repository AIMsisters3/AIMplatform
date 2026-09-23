<?php

require_once __DIR__ . '/../models/ContactMessage.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/rate_limit_v2.php';
require_once __DIR__ . '/../helpers/admin_notify.php';

class ContactController
{
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

        json_created(['id' => $id], "Thank you! Your message has been sent — we'll get back to you soon.");
    }
}
