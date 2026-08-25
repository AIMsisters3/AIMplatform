<?php
/**
 * AIMsisters - Permission resolution.
 *
 * The JWT payload carries role_id + role (slug) at issue time (see
 * AuthController::issueToken). Permission checks always re-read the
 * role's current grants from role_permissions on every request rather
 * than trusting anything about permissions baked into the token — so
 * revoking a permission from a role takes effect immediately for every
 * already-logged-in user of that role, not just on their next login.
 */

require_once __DIR__ . '/../models/Role.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/../middleware/auth.php';

/** @return string[] permission slugs, or ['*'] to mean "everything" (superadmin). */
function user_permissions(array $payload): array
{
    static $cache = [];

    if (($payload['role'] ?? null) === 'superadmin') {
        return ['*'];
    }

    $roleId = $payload['role_id'] ?? null;
    if (!$roleId) {
        return [];
    }

    if (array_key_exists($roleId, $cache)) {
        return $cache[$roleId];
    }

    $perms = (new Role())->permissionSlugsForRole((int) $roleId);
    $cache[$roleId] = $perms;
    return $perms;
}

function user_has_permission(array $payload, string $permission): bool
{
    $perms = user_permissions($payload);
    return in_array('*', $perms, true) || in_array($permission, $perms, true);
}

/**
 * Requires auth AND that the signed-in account's role currently grants
 * $permission. e.g. require_permission('content.publish');
 */
function require_permission(string $permission): array
{
    $payload = require_auth();

    if (!user_has_permission($payload, $permission)) {
        json_error('You do not have permission to perform this action.', 403);
    }

    return $payload;
}
