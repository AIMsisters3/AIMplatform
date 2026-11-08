-- =========================================================
-- Migration 034: Track who a reply-to-a-reply was actually directed at
--
-- HOW TO RUN: after migration 033. Safe to run once; re-running errors
-- on the ADD COLUMN statement (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- Per explicit request, replying to a reply should work like TikTok/
-- Instagram: still a flat two-level thread under the original top-level
-- comment (no infinite nesting), but the reply shows who it was actually
-- directed at ("Replying to @name"). Comment::create() already flattened
-- a reply-to-a-reply onto the top-level comment's thread, but threw away
-- which specific reply/person was being addressed - there was no way to
-- show that context back to a viewer. reply_to_user_id records it;
-- NULL for a comment that's either top-level or a direct reply to a
-- top-level comment (replying to the main comment reads as "replying to
-- the thread" on its own, no label needed - exactly matching when
-- TikTok/Instagram omit a "Replying to" line of their own).
-- =========================================================

ALTER TABLE comments
  ADD COLUMN reply_to_user_id INT UNSIGNED DEFAULT NULL AFTER parent_id,
  ADD CONSTRAINT fk_comments_reply_to_user FOREIGN KEY (reply_to_user_id) REFERENCES users(id) ON DELETE SET NULL;
