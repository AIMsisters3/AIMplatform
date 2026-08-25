<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../helpers/rate_limit.php';
require_once __DIR__ . '/../middleware/auth.php';

class AuthController
{
    private User $userModel;

    public function __construct()
    {
        $this->userModel = new User();
    }

    public function register(): void
    {
        // 10 account creations per IP per hour — generous for real users,
        // enough friction to slow down automated account-farming.
        rate_limit_check('register:' . client_ip(), 10, 3600);

        $body = get_json_body();

        $name     = trim($body['name'] ?? '');
        $email    = trim(strtolower($body['email'] ?? ''));
        $password = $body['password'] ?? '';

        if (!$name || !$email || !$password) {
            json_error('Name, email, and password are required.', 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_error('Invalid email address.', 422);
        }
        if (strlen($password) < 8) {
            json_error('Password must be at least 8 characters.', 422);
        }
        if ($this->userModel->findByEmail($email)) {
            json_error('An account with this email already exists.', 409);
        }

        $id = $this->userModel->create($name, $email, $password);
        $user = $this->userModel->findById($id);

        json_created([
            'token' => $this->issueToken($user),
            'user'  => $this->publicUser($user),
        ], 'Account created successfully.');
    }

    public function login(): void
    {
        $body = get_json_body();

        $email    = trim(strtolower($body['email'] ?? ''));
        $password = $body['password'] ?? '';

        if (!$email || !$password) {
            json_error('Email and password are required.', 422);
        }

        // Rate-limit by IP+email so a brute-force attempt against one
        // account can't be spread across attempts and still slip through,
        // while a shared office IP trying different accounts isn't
        // penalized for someone else's typos.
        rate_limit_check('login:' . client_ip() . ':' . $email, 8, 300);

        $user = $this->userModel->findByEmail($email);

        if (!$user || !$this->userModel->verifyPassword($user, $password)) {
            json_error('Invalid email or password.', 401);
        }

        if ($user['status'] !== 'active') {
            json_error('This account has been suspended.', 403);
        }

        $this->userModel->updateLastLogin((int) $user['id']);

        json_ok([
            'token' => $this->issueToken($user),
            'user'  => $this->publicUser($user),
        ], 'Login successful.');
    }

    public function me(): void
    {
        $payload = require_auth();
        $user = $this->userModel->findById((int) $payload['sub']);

        if (!$user) {
            json_error('User not found.', 404);
        }

        json_ok(['user' => $this->publicUser($user)]);
    }

    private function issueToken(array $user): string
    {
        return JWT::encode([
            'sub'     => $user['id'],
            'email'   => $user['email'],
            'role'    => $user['role_slug'] ?? 'user',
            'role_id' => $user['role_id'] !== null ? (int) $user['role_id'] : null,
            'name'    => $user['name'],
        ]);
    }

    private function publicUser(array $user): array
    {
        return [
            'id'    => (int) $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role_slug'] ?? 'user',
            'avatar'=> $user['avatar'],
        ];
    }
}
