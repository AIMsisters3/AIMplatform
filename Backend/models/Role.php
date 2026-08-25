<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Role/permission lookups backing the RBAC system added in
 * database/migrations/001_roles_permissions.sql. See that file's header
 * for the full design rationale.
 */
class Role
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM roles WHERE slug = :slug LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        return $stmt->fetch() ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM roles WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    /** All roles with their permission slugs — used by the future admin "roles" screen. */
    public function allWithPermissions(): array
    {
        $roles = $this->db->query('SELECT * FROM roles ORDER BY id')->fetchAll();
        foreach ($roles as &$role) {
            $role['permissions'] = $this->permissionSlugsForRole((int) $role['id']);
        }
        return $roles;
    }

    /** @return string[] permission slugs granted to this role */
    public function permissionSlugsForRole(int $roleId): array
    {
        $stmt = $this->db->prepare(
            'SELECT p.slug FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = :role_id'
        );
        $stmt->execute(['role_id' => $roleId]);
        return array_column($stmt->fetchAll(), 'slug');
    }

    public function allPermissions(): array
    {
        return $this->db->query('SELECT * FROM permissions ORDER BY slug')->fetchAll();
    }
}
