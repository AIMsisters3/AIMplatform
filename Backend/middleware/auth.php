<?php
/**
 * AIMsisters - Auth middleware
 * Include this at the top of any route that requires authentication.
 */

require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * Reads the Authorization: Bearer <token> header and returns the decoded payload.
 * Sends a 401 JSON response and exits if missing/invalid.
 */
function require_auth(): array
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (!$authHeader || stripos($authHeader, 'Bearer ') !== 0) {
        json_error('Authentication required.', 401);
    }

    $token = trim(substr($authHeader, 7));
    $payload = JWT::decode($token);

    if (!$payload) {
        json_error('Invalid or expired token.', 401);
    }

    return $payload; // contains user id, email, role
}

/**
 * Requires auth AND that the user's role is in $allowedRoles.
 * e.g. require_role(['admin', 'superadmin']);
 */
function require_role(array $allowedRoles): array
{
    $payload = require_auth();

    if (!in_array($payload['role'] ?? '', $allowedRoles, true)) {
        json_error('You do not have permission to perform this action.', 403);
    }

    return $payload;
}

/**
 * Like require_auth, but never errors — returns the payload if a valid
 * token is present, or null if not logged in. Used for endpoints that are
 * public but behave differently for a logged-in visitor (e.g. "did I like this?").
 */
function optional_auth(): ?array
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (!$authHeader || stripos($authHeader, 'Bearer ') !== 0) {
        return null;
    }

    return JWT::decode(trim(substr($authHeader, 7)));
}
