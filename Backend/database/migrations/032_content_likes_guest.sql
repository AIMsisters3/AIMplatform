-- =========================================================
-- Migration 032: Let guests (not just signed-in users) like content
--
-- HOW TO RUN: after migration 031. Safe to run once; re-running errors
-- on the ADD COLUMN/DROP INDEX statements (expected — means it already
-- ran).
--
-- WHAT THIS DOES
--
-- Migration 031's content_likes required a real user_id - liking was
-- sign-in-only. Per explicit request, anyone can like content whether
-- logged in or not, same as content_views (migration 011) already does
-- for view-count deduplication: identity is a single visitor_key column
-- (either "user:<id>" for a signed-in like, or "guest:<cookie>" for an
-- anonymous one — Backend/helpers/visitor.php's existing long-lived
-- cookie, reused as-is rather than inventing a second mechanism), and
-- the UNIQUE key moves from (content_id, user_id) to
-- (content_id, visitor_key) so a guest can't just click repeatedly to
-- stack up likes. user_id itself stays, now nullable — a guest's like
-- row simply has no user_id, but a signed-in user's still does, kept
-- for anything that wants "who liked this" later.
-- =========================================================

ALTER TABLE content_likes
  MODIFY user_id INT UNSIGNED DEFAULT NULL,
  ADD COLUMN visitor_key VARCHAR(64) DEFAULT NULL AFTER user_id;

-- Backfill: any like rows from before this migration were necessarily
-- signed-in (migration 031 required auth), so their identity becomes
-- "user:<id>" - the exact same scheme Content::toggleLike() uses for a
-- signed-in like going forward, so a user who already liked something
-- still shows as having liked it afterward.
UPDATE content_likes SET visitor_key = CONCAT('user:', user_id) WHERE visitor_key IS NULL AND user_id IS NOT NULL;

ALTER TABLE content_likes
  MODIFY visitor_key VARCHAR(64) NOT NULL,
  DROP INDEX uniq_content_like,
  ADD UNIQUE KEY uniq_content_like (content_id, visitor_key);
