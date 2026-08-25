<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Role.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

/**
 * Backs the admin "Manage Roles" screen (spec §9/§56 RBAC administration):
 * listing accounts, changing a user's role, and suspending/reactivating an
 * account. Every action here is gated behind users.view/users.manage —
 * see database/migrations/001_roles_permissions.sql for what each role is
 * granted by default.
 */
class UserController
{
    private User $userModel;
    private Role $roleModel;

    public function __construct()
    {
        $this->userModel = new User();
        $this->roleModel = new Role();
    }

    /** GET /api/users (requires users.view) */
    public function index(): void
    {
        require_permission('users.view');
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(100, (int) ($_GET['limit'] ?? 50));
        json_ok(['items' => $this->userModel->all($limit, ($page - 1) * $limit)]);
    }

    /** GET /api/users/roles (requires users.view) — every role with its granted permissions, for the role picker. */
    public function roles(): void
    {
        require_permission('users.view');
        json_ok(['items' => $this->roleModel->allWithPermissions()]);
    }

    /** POST /api/users/{id}/role (requires users.manage) body: {role: <slug>} */
    public function updateRole(int $id): void
    {
        $payload = require_permission('users.manage');
        $body = get_json_body();
        $roleSlug = $body['role'] ?? '';

        if ($roleSlug === '') {
            json_error('A role is required.', 422);
        }
        // A manager can't demote/lock themselves out of the only account
        // that can undo the change — require a *different* superadmin.
        if ((int) $payload['sub'] === $id && $roleSlug !== 'superadmin' && ($payload['role'] ?? '') === 'superadmin') {
            json_error('You cannot change your own Super Admin role.', 422);
        }

        $ok = $this->userModel->updateRole($id, $roleSlug);
        if (!$ok) {
            json_error('Unknown role.', 422);
        }
        json_ok(null, 'Role updated.');
    }

    /** POST /api/users/{id}/status (requires users.manage) body: {status: active|suspended} */
    public function updateStatus(int $id): void
    {
        $payload = require_permission('users.manage');
        $body = get_json_body();
        $status = $body['status'] ?? '';

        if (!in_array($status, ['active', 'suspended'], true)) {
            json_error('Invalid status.', 422);
        }
        if ((int) $payload['sub'] === $id) {
            json_error('You cannot change your own account status.', 422);
        }

        $this->userModel->updateStatus($id, $status);
        json_ok(null, 'Account status updated.');
    }
}
