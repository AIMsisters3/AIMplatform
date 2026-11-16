-- =========================================================
-- Migration 035: Sign in with Google
--
-- HOW TO RUN: after migration 034. Safe to run once; re-running errors
-- on the ADD COLUMN statements (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- Adds google_id (the stable "sub" claim from a verified Google ID
-- token, not the user's email - an email can change, this never does)
-- so a Google sign-in can be matched back to the right account on every
-- future login. password_hash becomes nullable: a brand-new
-- Google-only account never gets a password at all (there's nothing to
-- hash), it can only ever sign in via Google unless a future "set a
-- password" flow is added. An existing password-based account that
-- signs in with Google under the same (already Google-verified) email
-- gets google_id attached to its existing row instead of creating a
-- duplicate - see User::findOrCreateByGoogle().
-- =========================================================

ALTER TABLE users
  MODIFY password_hash VARCHAR(255) DEFAULT NULL,
  ADD COLUMN google_id VARCHAR(255) DEFAULT NULL AFTER password_hash,
  ADD UNIQUE KEY uniq_users_google_id (google_id);
