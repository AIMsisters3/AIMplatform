-- =========================================================
-- Migration 031: Content likes
--
-- HOW TO RUN: after migration 030. Safe to run once; re-running errors
-- on the CREATE TABLE statement (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- Until now, the only thing on this platform that could be "liked" was
-- a comment (comment_likes, in schema.sql). There was no way to like a
-- video/article/content item itself — needed so "Featured Content" can
-- rank by real engagement signals (views + likes), not just an admin's
-- manual is_featured toggle. Mirrors comment_likes' own shape exactly:
-- one row per (content, user), so a user can only like a given item
-- once, and unliking is just deleting their row.
-- =========================================================

CREATE TABLE IF NOT EXISTS content_likes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_content_likes_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_content_like (content_id, user_id)
) ENGINE=InnoDB;
