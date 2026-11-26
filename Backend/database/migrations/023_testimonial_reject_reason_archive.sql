-- =========================================================
-- Migration 023: Testimonial rejection reason + archive status
--
-- HOW TO RUN: any time after migration 010. Safe to run once - both
-- changes are purely additive (a new nullable column, and a widened
-- ENUM that keeps every existing value) and re-running is a no-op error
-- on the ADD COLUMN (expected).
--
-- Per explicit request:
--   1. Rejecting a testimony now requires a stored reason, so the
--      submitter/admin can see why later - rejection_reason is a new
--      nullable TEXT column (NULL for every existing rejected row,
--      since none of them have a reason on file yet; nothing is
--      backfilled or guessed).
--   2. An approved testimony can now be Archived instead of only
--      Approved/Rejected/Deleted - a status, not a delete, so it stays
--      recoverable/restorable and simply drops out of the public
--      homepage feed (Testimonial::approved() already filters
--      WHERE status = 'approved', so no query change is needed there).
-- =========================================================

USE aimsisters_db;

ALTER TABLE testimonials
  ADD COLUMN rejection_reason TEXT NULL AFTER body,
  MODIFY COLUMN status ENUM('pending','approved','rejected','archived') NOT NULL DEFAULT 'pending';
