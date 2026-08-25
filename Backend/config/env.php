<?php
/**
 * AIMsisters - Minimal .env loader (no Composer dependency).
 *
 * Loads Backend/.env (git-ignored — never commit real secrets) into
 * getenv()/$_ENV so config.php can read secrets out of tracked code.
 *
 * If no .env file exists yet (fresh local checkout), one is generated
 * automatically with a random JWT secret and the standard XAMPP-friendly
 * DB defaults, so `git clone` -> `php seed_admin.php` still "just works"
 * for local development without anyone hand-editing PHP to add a secret.
 * Nothing generated here is ever written back into a tracked file.
 */

function env(string $key, $default = null)
{
    $value = getenv($key);
    if ($value === false) {
        $value = $_ENV[$key] ?? $default;
    }
    if (is_string($value)) {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return $default;
        }
        return $trimmed;
    }
    return $value;
}

function load_env_file(string $path): void
{
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        // Strip matching surrounding quotes.
        if (strlen($value) >= 2 && (
            ($value[0] === '"' && $value[-1] === '"') ||
            ($value[0] === "'" && $value[-1] === "'")
        )) {
            $value = substr($value, 1, -1);
        }
        if ($key !== '' && getenv($key) === false) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

function bootstrap_local_env_if_missing(string $envPath): void
{
    if (is_file($envPath)) {
        return;
    }

    // Only auto-generate for local development. In production the
    // deployment process must provide a real .env (or real environment
    // variables) — we never want to silently invent a JWT secret that
    // could change on every deploy and invalidate everyone's session.
    $isLikelyLocal = (php_sapi_name() === 'cli')
        || in_array($_SERVER['SERVER_NAME'] ?? 'localhost', ['localhost', '127.0.0.1'], true)
        || !isset($_SERVER['SERVER_NAME']);

    if (!$isLikelyLocal) {
        return;
    }

    $secret = bin2hex(random_bytes(32));
    $serverName = $_SERVER['SERVER_NAME'] ?? 'localhost (CLI)';
    $contents = <<<ENV
        # Auto-generated for local development on {$serverName}.
        # This file is git-ignored. Never commit it. Copy .env.example for
        # a template of every variable this app reads.
        APP_ENV=local
        DB_HOST=localhost
        DB_NAME=aimsisters_db
        DB_USER=root
        DB_PASS=
        JWT_SECRET={$secret}
        # Leave SMTP_* blank locally to skip sending real email (subscribe /
        # register / etc. still succeed, they just won't deliver mail).
        SMTP_HOST=smtp.gmail.com
        SMTP_USER=
        SMTP_PASS=
        SMTP_PORT=587
        SMTP_FROM_EMAIL=no-reply@aimsisters.org
        SMTP_FROM_NAME=AIMsisters

        ENV;

    // Best-effort: if we can't write it (read-only filesystem, permissions),
    // fall back silently to config.php's own safe defaults.
    @file_put_contents($envPath, $contents);
}

$envPath = __DIR__ . '/../.env';
bootstrap_local_env_if_missing($envPath);
load_env_file($envPath);
