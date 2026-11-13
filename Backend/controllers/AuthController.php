<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/PasswordReset.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../helpers/rate_limit_v2.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/google_signin_log.php';
require_once __DIR__ . '/../emails/password_reset_template.php';
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
        if (!function_exists('curl_init')) {
            google_signin_log('VERIFY FAILED — the curl PHP extension is not available on this server.');
            return null;
        }
        if (GOOGLE_CLIENT_ID === '') {
            google_signin_log('VERIFY FAILED — GOOGLE_CLIENT_ID is empty. Set it in Backend/.env to enable Google sign-in.');
            return null;
        }

        $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 8,
        ]);
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            google_signin_log("VERIFY FAILED — curl request to Google's tokeninfo endpoint failed: {$curlError}");
            return null;
        }
        if ($status !== 200) {
            google_signin_log("VERIFY FAILED — Google's tokeninfo endpoint returned HTTP {$status}: {$response}");
            return null;
        }

        $claims = json_decode($response, true);
        if (!is_array($claims)) {
            google_signin_log('VERIFY FAILED — could not parse JSON from Google tokeninfo response: ' . $response);
            return null;
        }
        $aud = $claims['aud'] ?? null;
        if ($aud !== GOOGLE_CLIENT_ID) {
            // Not a secret on either side — see this file's require for
            // google_signin_log()'s own comment on why. This is almost
            // always Backend/.env's GOOGLE_CLIENT_ID not matching
            // Frontend/.env's VITE_GOOGLE_CLIENT_ID (different value,
            // stale value, typo, trailing whitespace).
            google_signin_log("VERIFY FAILED — token audience mismatch. Token's aud=\"{$aud}\", configured GOOGLE_CLIENT_ID=\"" . GOOGLE_CLIENT_ID . '". These must be the EXACT same value as Frontend/.env\'s VITE_GOOGLE_CLIENT_ID.');
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

    /**
     * POST /api/auth/forgot-password  body: {email} — always responds the
     * same way whether or not that email has an account (same reasoning
     * Google/GitHub/etc. use for this exact endpoint): confirming an
     * address's existence here would let anyone probe who has an account
     * just by submitting emails and watching which ones differ. Receiving
     * (or not receiving) the email itself is the only real signal.
     */
    public function forgotPassword(): void
    {
        rate_limit_check('forgot_password:' . client_ip(), 5, 3600);

        $body = get_json_body();
        $email = trim(strtolower($body['email'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_error('A valid email address is required.', 422);
        }

        // Also rate-limited by the submitted address itself, so repeated
        // requests for one inbox can't be used to spam it even from
        // different/rotating IPs.
        rate_limit_check('forgot_password_email:' . $email, 5, 3600);

        $user = $this->userModel->findByEmail($email);

        // A Google-only account (no password_hash — see migration 035)
        // has no password to reset; silently skipped same as "no account
        // at all" rather than telling the submitter which case it was.
        if ($user && $user['password_hash']) {
            $token = (new PasswordReset())->issue((int) $user['id']);
            $url = rtrim(FRONTEND_URL, '/') . '/reset-password?token=' . urlencode($token);
            $html = password_reset_email_html($user['name'], $url);
            send_email($user['email'], 'Reset your AIMsisters password', $html);
        }

        json_ok([], "If an account exists for that email, we've sent a password reset link.");
    }

    /** POST /api/auth/reset-password  body: {token, password} — consumes a link forgotPassword() emailed out. */
    public function resetPassword(): void
    {
        rate_limit_check('reset_password:' . client_ip(), 10, 3600);

        $body = get_json_body();
        $token = $body['token'] ?? '';
        $password = $body['password'] ?? '';

        if (!$token) {
            json_error('Missing reset token.', 422);
        }
        if (strlen($password) < 8) {
            json_error('Password must be at least 8 characters.', 422);
        }

        $reset = (new PasswordReset())->findValid($token);
        if (!$reset) {
            json_error('This reset link is invalid or has expired. Please request a new one.', 400);
        }

        $this->userModel->updatePassword((int) $reset['user_id'], $password);
        (new PasswordReset())->markUsed((int) $reset['id']);

        json_ok([], 'Your password has been reset. You can now sign in.');
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
