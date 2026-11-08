<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Backs the "forgot password" flow (migration 037). Only ever stores/
 * looks up the SHA-256 hash of a reset token, never the raw value — the
 * raw token exists only in the emailed link and the caller's memory for
 * the single request that issues or consumes it.
 */
class PasswordReset
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * Issues a fresh reset token for $userId and returns the raw
     * (unhashed) value to email — this is the only moment it ever exists
     * outside the recipient's inbox. Any earlier unused token for the
     * same account is deleted first, so requesting a new link always
     * invalidates an older one still sitting in a previous email.
     */
    public function issue(int $userId, int $ttlSeconds = 3600): string
    {
        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token);
        $expiresAt = date('Y-m-d H:i:s', time() + $ttlSeconds);

        $this->db->prepare('DELETE FROM password_reset_tokens WHERE user_id = :user_id')
            ->execute(['user_id' => $userId]);

        $stmt = $this->db->prepare(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (:user_id, :hash, :expires_at)'
        );
        $stmt->execute(['user_id' => $userId, 'hash' => $hash, 'expires_at' => $expiresAt]);

        return $token;
    }

    /** Looks up a raw token from a reset link; only matches one that's unexpired and not already used. */
    public function findValid(string $rawToken): ?array
    {
        $hash = hash('sha256', $rawToken);
        $stmt = $this->db->prepare(
            'SELECT * FROM password_reset_tokens WHERE token_hash = :hash AND used_at IS NULL AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute(['hash' => $hash]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** Marks a token consumed so the same emailed link can't reset the password a second time. */
    public function markUsed(int $id): void
    {
        $stmt = $this->db->prepare('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }
}
