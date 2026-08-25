-- =========================================================
-- Migration 005: Series -> Season -> Episode
--
-- HOW TO RUN: after migration 004.
--
-- WHAT THIS DOES (spec §12, §58 — explicitly called out for future
-- AIMsisters animation projects, e.g. "The Story of Redemption")
-- An episode is still a normal `content` row (content_type = 'video',
-- typically) — it reuses the video player, comments, bookmarks, watch
-- history, and soft-delete that already exist for every content item.
-- `series_id`/`season_number`/`episode_number` are added directly to
-- `content` rather than a separate join table, because an episode has
-- exactly one series/season/episode position, never many — a plain
-- nullable FK is the simplest correct model and keeps every existing
-- Content query (find/findBySlug/all) working unchanged for non-episode
-- content, which just has series_id = NULL.
-- =========================================================

USE aimsisters_db;

CREATE TABLE IF NOT EXISTS series (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  description TEXT,
  cover_image VARCHAR(255) DEFAULT NULL,
  category_id INT UNSIGNED DEFAULT NULL,
  language VARCHAR(50) NOT NULL DEFAULT 'English',
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  CONSTRAINT fk_series_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE content
  ADD COLUMN series_id INT UNSIGNED DEFAULT NULL AFTER category_id,
  ADD COLUMN season_number SMALLINT UNSIGNED DEFAULT NULL AFTER series_id,
  ADD COLUMN episode_number SMALLINT UNSIGNED DEFAULT NULL AFTER season_number,
  ADD CONSTRAINT fk_content_series FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL;

CREATE INDEX idx_content_series ON content (series_id, season_number, episode_number);
