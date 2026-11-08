-- =========================================================
-- Migration 033: Let guests (not just signed-in users) like comments
--
-- HOW TO RUN: after migration 032. Safe to run once; re-running errors
-- on the ADD COLUMN/DROP INDEX statements (expected — means it already
-- ran).
--
-- WHAT THIS DOES
--
-- Same fix migration 032 already made for content_likes, applied to
-- comment_likes - per explicit request, a comment like shouldn't need an
-- account either. Identity moves from user_id to a single visitor_key
-- column ("user:<id>" signed-in, "guest:<cookie>" anonymous - the same
-- scheme content_views/content_likes already use), with the UNIQUE key
-- moving from (comment_id, user_id) to (comment_id, visitor_key) so a
-- guest still only gets one like per comment. user_id stays, now
-- nullable, kept purely for reference on a signed-in like.
-- =========================================================

ALTER TABLE comment_likes
  MODIFY user_id INT UNSIGNED DEFAULT NULL,
  ADD COLUMN visitor_key VARCHAR(64) DEFAULT NULL AFTER user_id;

-- Backfill: every like row from before this migration was necessarily
-- signed-in (comment_likes.user_id was NOT NULL until the line above),
-- so its identity becomes "user:<id>" - the exact scheme
-- Comment::toggleLike() uses for a signed-in like going forward.
UPDATE comment_likes SET visitor_key = CONCAT('user:', user_id) WHERE visitor_key IS NULL AND user_id IS NOT NULL;

ALTER TABLE comment_likes
  MODIFY visitor_key VARCHAR(64) NOT NULL,
  DROP INDEX uniq_comment_like,
  ADD UNIQUE KEY uniq_comment_like (comment_id, visitor_key);
