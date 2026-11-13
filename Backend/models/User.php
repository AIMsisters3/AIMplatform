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

    public function findByUsername(string $username): ?array
    {
        $stmt = $this->db->prepare(self::SELECT_WITH_ROLE . ' WHERE u.username = :username LIMIT 1');
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    /**
     * Login accepts either - one lookup against both columns rather than
     * guessing which the input looks like. Two distinct placeholders
     * (not :id reused twice) - PDO::ATTR_EMULATE_PREPARES is false (see
     * Database.php), so these become real server-side prepared
     * statements, and MySQL's native protocol gives each `:id` occurrence
     * its own bind slot; passing a single 'id' value for both throws
     * "SQLSTATE[HY093]: Invalid parameter number" instead of matching
     * both. Emulated prepares (the default elsewhere) would have masked
     * this by rewriting the query before sending it, which is exactly why
     * it passed standalone testing but broke on a real login attempt.
     */
    public function findByEmailOrUsername(string $identifier): ?array
    {
        $stmt = $this->db->prepare(self::SELECT_WITH_ROLE . ' WHERE u.email = :email OR u.username = :username LIMIT 1');
        $stmt->execute(['email' => $identifier, 'username' => $identifier]);
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
    public function create(string $name, string $username, string $email, string $password, string $roleSlug = 'user'): int
    {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $role = (new Role())->findBySlug($roleSlug) ?? (new Role())->findBySlug('user');

        $stmt = $this->db->prepare(
            'INSERT INTO users (name, username, email, password_hash, role_id) VALUES (:name, :username, :email, :hash, :role_id)'
        );
        $stmt->execute([
            'name'     => $name,
            'username' => $username,
            'email'    => $email,
            'hash'     => $hash,
            'role_id'  => $role['id'] ?? null,
        ]);

        return (int) $this->db->lastInsertId();
    }

    /** Sets a new password on an account — used by the "forgot password" reset flow (AuthController::resetPassword()). */
    public function updatePassword(int $id, string $newPassword): void
    {
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
        $stmt->execute(['hash' => $hash, 'id' => $id]);
    }

    public function verifyPassword(array $user, string $password): bool
    {
        // A Google-only account has no password_hash at all (NULL) -
        // password_verify() would throw a TypeError on null rather than
        // just returning false, so this is checked explicitly first.
        if (!$user['password_hash']) {
            return false;
        }
        return password_verify($password, $user['password_hash']);
    }

    public function findByGoogleId(string $googleId): ?array
    {
        $stmt = $this->db->prepare(self::SELECT_WITH_ROLE . ' WHERE u.google_id = :google_id LIMIT 1');
        $stmt->execute(['google_id' => $googleId]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    /**
     * Finds-or-creates a user for a verified Google sign-in (the caller
     * - AuthController::google() - has already confirmed this email via
     * Google's own id token before calling this). An existing
     * password-based account under the same email gets google_id
     * attached rather than a duplicate account being created, since
     * Google only ever reports an email after verifying it belongs to
     * the person signing in. A brand-new account gets role 'user'
     * (same as a normal self-registration) and no password_hash at all.
     */
    public function findOrCreateByGoogle(string $googleId, string $email, string $name, ?string $avatar): int
    {
        $byGoogle = $this->findByGoogleId($googleId);
        if ($byGoogle) {
            return (int) $byGoogle['id'];
        }

        $byEmail = $this->findByEmail($email);
        if ($byEmail) {
            $stmt = $this->db->prepare('UPDATE users SET google_id = :google_id WHERE id = :id');
            $stmt->execute(['google_id' => $googleId, 'id' => $byEmail['id']]);
            return (int) $byEmail['id'];
        }

        $role = (new Role())->findBySlug('user');
        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email, password_hash, google_id, role_id, avatar)
             VALUES (:name, :email, NULL, :google_id, :role_id, :avatar)'
        );
        $stmt->execute([
            'name'      => $name,
            'email'     => $email,
            'google_id' => $googleId,
            'role_id'   => $role['id'] ?? null,
            'avatar'    => $avatar,
        ]);

        return (int) $this->db->lastInsertId();
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
