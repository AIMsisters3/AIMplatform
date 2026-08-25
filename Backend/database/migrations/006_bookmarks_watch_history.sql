-- =========================================================
-- Migration 006: Bookmarks + Watch History
--
-- HOW TO RUN: after migration 005.
--
-- WHAT THIS DOES (spec §17 "Content Discovery" / §27 / §33 "Bookmarks":
-- a centralized saved-content system, separate from per-item watch
-- progress)
-- - bookmarks: a user "saving" any content item (video, sermon, bible
--   study, devotion, article...) for later — a simple boolean-ish
--   relationship, one row per user+item.
-- - watch_history: per-user, per-item playback position — powers
--   "Continue Watching" and "% watched" on the Media Library / Bible
--   Study pages. Distinct from bookmarks: you can bookmark something you
--   haven't started, and watch something you never bookmarked.
-- =========================================================

USE aimsisters_db;

CREATE TABLE IF NOT EXISTS bookmarks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  content_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmarks_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_bookmark_user_content (user_id, content_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS watch_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  content_id INT UNSIGNED NOT NULL,
  progress_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  duration_seconds INT UNSIGNED DEFAULT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_watch_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_watch_history_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_watch_history_user_content (user_id, content_id),
  INDEX idx_watch_history_user_recent (user_id, last_watched_at)
) ENGINE=InnoDB;
