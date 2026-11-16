-- =========================================================
-- Migration 036: Username, as a real field separate from the display name
--
-- HOW TO RUN: after migration 035. Safe to run once; re-running errors
-- on the ADD COLUMN statement (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- Per explicit request: a real, unique username (separate from the
-- freeform display `name`), so a person can log in with either their
-- email or their username. Nullable - every account created before
-- this migration simply has none yet and keeps logging in by email
-- exactly as before (NULL never collides with the UNIQUE constraint,
-- MySQL allows any number of NULLs under a unique index). New
-- registrations require picking one going forward (enforced in
-- AuthController::register(), not here - this column alone can't
-- express "required for new rows only").
-- =========================================================

ALTER TABLE users
  ADD COLUMN username VARCHAR(50) DEFAULT NULL AFTER name,
  ADD UNIQUE KEY uniq_users_username (username);
