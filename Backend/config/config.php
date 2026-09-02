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
// Chunk staging area for large uploads (ChunkUploadController) - deliberately
// OUTSIDE the public uploads/ tree so an in-progress or not-yet-validated
// chunk is never web-accessible even by guessing a path. Blocked further by
// its own .htaccess (Backend/storage/chunk_uploads/.htaccess).
define('CHUNK_UPLOAD_DIR', __DIR__ . '/../storage/chunk_uploads/');

// Allowed frontend origins (Vite dev server + production domain).
// Add production domains via ALLOWED_ORIGINS_EXTRA="https://aimsisters.org,https://www.aimsisters.org"
$extraOrigins = array_filter(array_map('trim', explode(',', env('ALLOWED_ORIGINS_EXTRA', ''))));
define('ALLOWED_ORIGINS', array_merge([
    'http://localhost:5173',
    'http://localhost:3000',
], $extraOrigins));

// --- Uploads ---
// Large media (video/audio/PDF) uploads through the admin Upload Content
// page go through ChunkUploadController, split into CHUNK_SIZE_MB pieces -
// each HTTP request only ever carries one small chunk, so this is a disk-
// usage safety ceiling on the ASSEMBLED file, not a technical wall imposed
// by any single request's size. Raise it freely; it no longer requires
// raising PHP's own upload_max_filesize/post_max_size to match (those only
// need to comfortably fit one chunk - see Backend/.user.ini). The single-
// shot /api/upload endpoint (thumbnails, small files, Media Library) still
// checks this same ceiling directly against $_FILES, since those uploads
// are never chunked.
define('MAX_UPLOAD_SIZE_MB', (int) env('MAX_UPLOAD_SIZE_MB', 20000));
define('CHUNK_SIZE_MB', (int) env('CHUNK_SIZE_MB', 8));
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
