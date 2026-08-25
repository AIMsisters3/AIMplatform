-- =========================================================
-- Migration 004: Bible Study as a first-class entity
--
-- HOW TO RUN: after migrations 001-003.
--
-- WHAT THIS DOES
-- Spec §13-15: Bible Study is its own major section, separate from the
-- Content/Media Library, with its own formats (Short Film, Video, Sermon,
-- Panel, Audio, Animated, Documentary, PDF/Notes), and per-user progress
-- tracking, notes, and bookmarking.
--
-- Bible studies still live in the `content` table (content_type =
-- 'bible_study') — that keeps title/slug/description/thumbnail/media_url/
-- language/status/comments/soft-delete all working exactly as they do for
-- every other content type, with zero duplication. This migration adds
-- what's specific to a Bible study on top:
--   - bible_studies       1:1 extension of a content row — format +
--                         study guide URL, same pattern as `videos` or
--                         `articles` in schema.sql.
--   - bible_study_progress per-user completion state for one study.
--   - bible_study_notes   a user's personal notes on one study (private —
--                         only the author can read their own notes).
-- =========================================================

USE aimsisters_db;

CREATE TABLE IF NOT EXISTS bible_studies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id INT UNSIGNED NOT NULL,
  format ENUM('short_film','video','sermon','panel','audio','animated','documentary','pdf_notes') NOT NULL DEFAULT 'video',
  study_guide_url VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bible_studies_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_bible_studies_content (content_id),
  INDEX idx_bible_studies_format (format)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bible_study_progress (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  content_id INT UNSIGNED NOT NULL,
  status ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'in_progress',
  progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_position_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  completed_at DATETIME DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bsp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bsp_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_bsp_user_content (user_id, content_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bible_study_notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  content_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bsn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bsn_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  INDEX idx_bsn_user_content (user_id, content_id)
) ENGINE=InnoDB;
