<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../helpers/rate_limit_v2.php';
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
        $username = trim(strtolower($body['username'] ?? ''));
        $email    = trim(strtolower($body['email'] ?? ''));
        $password = $body['password'] ?? '';

        if (!$name || !$username || !$email || !$password) {
            json_error('Name, username, email, and password are required.', 422);
        }
        // Letters/digits/underscore only, must start with a letter - a
        // username is also how someone logs in going forward (alongside
        // email), so it can't be ambiguous with an email address or
        // contain characters that would be awkward to type/share.
        if (!preg_match('/^[a-z][a-z0-9_]{2,29}$/', $username)) {
            json_error('Username must be 3-30 characters, start with a letter, and contain only letters, numbers, and underscores.', 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_error('Invalid email address.', 422);
        }
        if (strlen($password) < 8) {
            json_error('Password must be at least 8 characters.', 422);
        }
        if ($this->userModel->findByUsername($username)) {
            json_error('This username is already taken.', 409);
        }
        if ($this->userModel->findByEmail($email)) {
            json_error('An account with this email already exists.', 409);
        }

        $id = $this->userModel->create($name, $username, $email, $password);
        $user = $this->userModel->findById($id);

        json_created([
            'token' => $this->issueToken($user),
            'user'  => $this->publicUser($user),
        ], 'Account created successfully.');
    }

    /**
     * POST /api/auth/login  body: {email, password} - "email" is really
     * "email or username" (the field name is kept as-is on the wire so
     * nothing else calling this - AdminLogin.jsx included - needs to
     * change; findByEmailOrUsername() resolves either).
     */
    public function login(): void
    {
        $body = get_json_body();

        $identifier = trim(strtolower($body['email'] ?? ''));
        $password   = $body['password'] ?? '';

        if (!$identifier || !$password) {
            json_error('Email/username and password are required.', 422);
        }

        // Rate-limit by IP+identifier so a brute-force attempt against one
        // account can't be spread across attempts and still slip through,
        // while a shared office IP trying different accounts isn't
        // penalized for someone else's typos.
        rate_limit_check('login:' . client_ip() . ':' . $identifier, 8, 300);

        $user = $this->userModel->findByEmailOrUsername($identifier);

        if (!$user || !$this->userModel->verifyPassword($user, $password)) {
            json_error('Invalid email/username or password.', 401);
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

    /**
     * POST /api/auth/google  body: {credential} - the ID token Google's
     * Sign in with Google button hands back after the user picks an
     * account. Same response shape as login()/register() (token + user),
     * so the frontend's existing session-setting logic works unchanged.
     */
    public function google(): void
    {
        // Same shape as login()'s own rate limit, by IP only (no email to
        // key on yet at this point - the token hasn't been verified).
        rate_limit_check('google_login:' . client_ip(), 20, 300);

        $body = get_json_body();
        $credential = $body['credential'] ?? '';
        if (!$credential) {
            json_error('Missing Google credential.', 422);
        }

        $claims = $this->verifyGoogleIdToken($credential);
        if (!$claims) {
            json_error('Could not verify Google sign-in. Please try again.', 401);
        }
        if (($claims['email_verified'] ?? 'false') !== 'true') {
            json_error('Your Google account email is not verified.', 403);
        }

        $email = trim(strtolower($claims['email'] ?? ''));
        $name = trim($claims['name'] ?? '') ?: $email;
        $avatar = $claims['picture'] ?? null;
        $googleId = $claims['sub'] ?? '';
        if (!$email || !$googleId) {
            json_error('Could not verify Google sign-in. Please try again.', 401);
        }

        $userId = $this->userModel->findOrCreateByGoogle($googleId, $email, $name, $avatar);
        $user = $this->userModel->findById($userId);

        if ($user['status'] !== 'active') {
            json_error('This account has been suspended.', 403);
        }

        $this->userModel->updateLastLogin($userId);

        json_ok([
            'token' => $this->issueToken($user),
            'user'  => $this->publicUser($user),
        ], 'Signed in with Google.');
    }

    /**
     * Verifies a Google ID token server-side via Google's own tokeninfo
     * endpoint, which validates the token's signature/expiry itself and
     * hands back its decoded claims - no JWT/crypto library needed on
     * this end (this codebase has no Composer dependency at all; see
     * config/env.php's own hand-rolled .env loader for the same
     * reasoning). Still has to separately confirm `aud` (the client id
     * the token was actually issued for) matches GOOGLE_CLIENT_ID
     * ourselves - tokeninfo only proves a token is a genuine, unexpired
     * Google token, not that it was meant for THIS app specifically;
     * without that check, a token meant for a completely different
     * Google-sign-in-using app would still pass as "genuinely from
     * Google."
     */
    private function verifyGoogleIdToken(string $credential): ?array
    {
        if (!function_exists('curl_init') || GOOGLE_CLIENT_ID === '') {
            return null;
        }

        $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 8,
        ]);
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $status !== 200) {
            return null;
        }

        $claims = json_decode($response, true);
        if (!is_array($claims) || ($claims['aud'] ?? null) !== GOOGLE_CLIENT_ID) {
            return null;
        }

        return $claims;
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
            'id'       => (int) $user['id'],
            'name'     => $user['name'],
            'username' => $user['username'] ?? null,
            'email'    => $user['email'],
            'role'     => $user['role_slug'] ?? 'user',
            'avatar'   => $user['avatar'],
        ];
    }
}
