<?php
/**
 * AIMsisters - Global configuration
 *
 * Real secrets (DB password, JWT secret, SMTP credentials) live in
 * Backend/.env, which is git-ignored and never committed — see
 * .env.example for the full list of variables and config/env.php for
 * how it's loaded. On a fresh local checkout, .env is auto-generated
 * with a random JWT secret so nothing here needs hand-editing to run.
 * In production, set real environment variables or a real .env on the
 * server instead of relying on the auto-generated local one.
 */

require_once __DIR__ . '/env.php';

// --- App (read first: some defaults below depend on APP_ENV) ---
define('APP_ENV', env('APP_ENV', 'local')); // local | production

// --- Database ---
define('DB_HOST', env('DB_HOST', 'localhost'));
define('DB_NAME', env('DB_NAME', 'aimsisters_db'));
define('DB_USER', env('DB_USER', 'root'));
define('DB_PASS', env('DB_PASS', ''));
define('DB_CHARSET', 'utf8mb4');

// --- JWT ---
$jwtSecret = env('JWT_SECRET');
if (!$jwtSecret) {
    if (APP_ENV === 'production') {
        // Refuse to boot with no signing secret in production rather than
        // silently using a guessable default — every issued token would be
        // forgeable.
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Server misconfigured: JWT_SECRET is not set.',
        ]);
        exit;
    }
    // Local fallback only (shouldn't normally be reached — env.php
    // auto-generates .env with a JWT_SECRET on first run).
    $jwtSecret = 'local-dev-only-insecure-secret-change-me';
}
define('JWT_SECRET', $jwtSecret);
define('JWT_ALGO', 'HS256');
define('JWT_EXPIRY_SECONDS', 60 * 60 * 24 * 7); // 7 days

// --- App URLs ---
define('APP_URL', env('APP_URL', 'http://localhost/AIMTech/Backend'));
define('FRONTEND_URL', env('FRONTEND_URL', 'http://localhost:5173'));
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('UPLOAD_URL', APP_URL . '/uploads/');

// Allowed frontend origins (Vite dev server + production domain).
// Add production domains via ALLOWED_ORIGINS_EXTRA="https://aimsisters.org,https://www.aimsisters.org"
$extraOrigins = array_filter(array_map('trim', explode(',', env('ALLOWED_ORIGINS_EXTRA', ''))));
define('ALLOWED_ORIGINS', array_merge([
    'http://localhost:5173',
    'http://localhost:3000',
], $extraOrigins));

// --- Uploads ---
// Default is generous enough for a full-length (~2 hour) HD video. This is
// the application-level cap; PHP's own upload_max_filesize/post_max_size
// (see Backend/.user.ini) must also allow it, or the file never reaches
// this check at all - UploadController distinguishes the two failure
// modes so an admin sees which limit actually blocked them.
define('MAX_UPLOAD_SIZE_MB', (int) env('MAX_UPLOAD_SIZE_MB', 8000));
define('ALLOWED_IMAGE_TYPES', ['jpg','jpeg','png','gif','webp']);
define('ALLOWED_VIDEO_TYPES', ['mp4','mov','webm']);
define('ALLOWED_AUDIO_TYPES', ['mp3','wav','ogg']);
define('ALLOWED_DOC_TYPES', ['pdf']);

date_default_timezone_set('UTC');
error_reporting(APP_ENV === 'local' ? E_ALL : 0);
ini_set('display_errors', APP_ENV === 'local' ? '1' : '0');

// --- Mail (SMTP) ---
// Left blank locally by default — send_email() already fails gracefully
// (logs and returns false) when these aren't set, so newsletter/auth
// flows still work end-to-end without a real mail account configured.
define('SMTP_HOST', env('SMTP_HOST', 'smtp.gmail.com'));
define('SMTP_USER', env('SMTP_USER', ''));
define('SMTP_PASS', env('SMTP_PASS', ''));
define('SMTP_PORT', (int) env('SMTP_PORT', 587));
define('SMTP_FROM_EMAIL', env('SMTP_FROM_EMAIL', 'no-reply@aimsisters.org'));
define('SMTP_FROM_NAME', env('SMTP_FROM_NAME', 'AIMsisters'));
