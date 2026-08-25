<?php
/**
 * AIMsisters - Backend entry point
 * Point your Apache vhost / .htaccess to this file for all /api/* requests.
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/routes/api.php';

// ---------------- CORS ----------------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------------- Dispatch ----------------
$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalize multiple leading slashes.
// This prevents //api/... from being passed to the router.
$path = '/' . ltrim($path, '/');

// Strip the folder prefix if the app isn't served from web root,
// e.g. http://localhost/AIMTech/Backend/api/content
$path = preg_replace('#^.*?(/api/.*)#', '$1', $path);

try {
    route($method, $path);
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Server error.',
        'error'   => APP_ENV === 'local' ? $e->getMessage() : null,
    ]);
}
