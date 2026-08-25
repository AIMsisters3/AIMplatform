<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Role.php';

class User
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** SELECT list shared by lookups below — joins the RBAC role slug in as `role_slug`. */
    private const SELECT_WITH_ROLE = "SELECT u.*, r.slug AS role_slug
        FROM users u LEFT JOIN roles r ON r.id = u.role_id";

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare(self::SELECT_WITH_ROLE . ' WHERE u.email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(self::SELECT_WITH_ROLE . ' WHERE u.id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    /**
     * Creates a new account. $roleSlug defaults to the plain "user" role
     * (see roles table, migration 001) — every self-registered visitor
     * becomes a User, never Moderator/Editor/Admin/Super Admin, regardless
     * of anything the client sends; only an existing Admin/Super Admin
     * (via a future users.manage-gated endpoint) can promote an account.
     */
    public function create(string $name, string $email, string $password, string $roleSlug = 'user'): int
    {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $role = (new Role())->findBySlug($roleSlug) ?? (new Role())->findBySlug('user');

        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email, password_hash, role_id) VALUES (:name, :email, :hash, :role_id)'
        );
        $stmt->execute([
            'name'    => $name,
            'email'   => $email,
            'hash'    => $hash,
            'role_id' => $role['id'] ?? null,
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function verifyPassword(array $user, string $password): bool
    {
        return password_verify($password, $user['password_hash']);
    }

    public function updateLastLogin(int $id): void
    {
        $stmt = $this->db->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    public function all(int $limit = 50, int $offset = 0): array
    {
        $stmt = $this->db->prepare(
            'SELECT u.id, u.name, u.email, r.slug AS role, u.status, u.created_at
             FROM users u LEFT JOIN roles r ON r.id = u.role_id
             ORDER BY u.created_at DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Changes an account's role. Only ever call this behind a
     * users.manage permission check — see UserController.
     */
    public function updateRole(int $id, string $roleSlug): bool
    {
        $role = (new Role())->findBySlug($roleSlug);
        if (!$role) {
            return false;
        }
        $stmt = $this->db->prepare('UPDATE users SET role_id = :role_id WHERE id = :id');
        return $stmt->execute(['role_id' => $role['id'], 'id' => $id]);
    }

    public function updateStatus(int $id, string $status): bool
    {
        $stmt = $this->db->prepare('UPDATE users SET status = :status WHERE id = :id');
        return $stmt->execute(['status' => $status, 'id' => $id]);
    }
}
