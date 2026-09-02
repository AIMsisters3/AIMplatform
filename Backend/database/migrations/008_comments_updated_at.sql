-- =========================================================
-- Migration 008: comments.updated_at
--
-- The comments table (schema.sql) already has id, content_id, parent_id,
-- user_id, body, status, and created_at, with correct foreign keys
-- (content_id -> content, parent_id -> comments, user_id -> users) and an
-- index on content_id — all already in place from earlier work, nothing
-- duplicated here. The one gap: no updated_at, even though a comment's
-- `status` does change after creation (moderation: approve/spam/pending -
-- CommentController::updateStatus()). Adding it so that kind of change is
-- timestamped like every other mutable row in this schema.
-- =========================================================

ALTER TABLE comments
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
