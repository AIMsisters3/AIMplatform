-- =========================================================
-- Migration 037: Forgot Password
--
-- HOW TO RUN: after migration 036. Safe to run once; re-running errors
-- on the CREATE TABLE statement (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- A standard "forgot password" flow needs somewhere to keep the one-time
-- reset link each request issues. Only the SHA-256 hash of the token is
-- stored (never the raw token itself) — same reasoning as password_hash
-- itself: a leaked database row alone should never be enough to reset
-- anyone's password, only the raw token mailed to the account's real
-- inbox is. expires_at lets AuthController::resetPassword() reject a
-- stale link outright; used_at lets it reject a link that already did
-- its job, so the same emailed link can't be replayed twice.
-- =========================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_password_reset_token_hash (token_hash),
  KEY idx_password_reset_tokens_user (user_id)
) ENGINE=InnoDB;
