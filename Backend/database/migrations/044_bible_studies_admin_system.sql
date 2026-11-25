-- =========================================================
-- Migration 044: Bible Studies admin system - catch-up + new columns
--
-- HOW TO RUN: paste this whole file into phpMyAdmin's SQL tab (inside
-- aimsisters_db) and run it once. SAFE TO RUN ON ANY DATABASE, REGARDLESS
-- OF WHICH OF MIGRATIONS 039-043 IT HAS OR HASN'T ALREADY SEEN - every
-- ADD COLUMN below checks information_schema first and only runs if the
-- column is actually missing, so this never errors out partway through
-- the way running 039/040/041/043 individually did on a database that
-- had some but not all of them applied. Safe to run more than once too.
--
-- WHAT THIS DOES
--
-- Brings any database fully up to date with everything 039-043 needed
-- (is_locked/is_prophecy/is_reading_plan/bible_references on series,
-- is_downloadable on content, the audio/pdf-only format narrowing, the
-- Prophecy seed, the reading_plans tables), THEN adds what the full
-- Bible Studies admin system (this round) needs on top:
--
--   series.intro         - a longer write-up shown on the collection's
--                           own page, separate from its short card-grid
--                           description (spec: "short description" vs
--                           "detailed introduction" are two different
--                           fields at the collection level).
--   series.order_index   - admin-settable display order within Explore
--                           Bible Topics / Prophecy, instead of the
--                           previous hardcoded PROPHECY_ORDER array.
--   bible_studies.featured_excluded      - admin can pull one study out
--                           of Featured Studies regardless of its score.
--   bible_studies.featured_pinned_until  - admin can temporarily force a
--                           study into Featured until this timestamp,
--                           after which it reverts to pure ranking.
-- =========================================================

-- --- helper pattern used throughout: only ADD COLUMN if it's missing ---

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'series' AND COLUMN_NAME = 'is_locked');
SET @sql := IF(@col = 0, 'ALTER TABLE series ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'series' AND COLUMN_NAME = 'is_prophecy');
SET @sql := IF(@col = 0, 'ALTER TABLE series ADD COLUMN is_prophecy TINYINT(1) NOT NULL DEFAULT 0 AFTER is_locked', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'series' AND COLUMN_NAME = 'is_reading_plan');
SET @sql := IF(@col = 0, 'ALTER TABLE series ADD COLUMN is_reading_plan TINYINT(1) NOT NULL DEFAULT 0 AFTER is_prophecy', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'series' AND COLUMN_NAME = 'bible_references');
SET @sql := IF(@col = 0, 'ALTER TABLE series ADD COLUMN bible_references VARCHAR(255) DEFAULT NULL AFTER description', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'series' AND COLUMN_NAME = 'intro');
SET @sql := IF(@col = 0, 'ALTER TABLE series ADD COLUMN intro TEXT DEFAULT NULL AFTER bible_references', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'series' AND COLUMN_NAME = 'order_index');
SET @sql := IF(@col = 0, 'ALTER TABLE series ADD COLUMN order_index INT UNSIGNED NOT NULL DEFAULT 0 AFTER is_reading_plan', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'content' AND COLUMN_NAME = 'is_downloadable');
SET @sql := IF(@col = 0, 'ALTER TABLE content ADD COLUMN is_downloadable TINYINT(1) NOT NULL DEFAULT 1 AFTER allow_comments', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bible_studies' AND COLUMN_NAME = 'featured_excluded');
SET @sql := IF(@col = 0, 'ALTER TABLE bible_studies ADD COLUMN featured_excluded TINYINT(1) NOT NULL DEFAULT 0 AFTER study_guide_url', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bible_studies' AND COLUMN_NAME = 'featured_pinned_until');
SET @sql := IF(@col = 0, 'ALTER TABLE bible_studies ADD COLUMN featured_pinned_until DATETIME DEFAULT NULL AFTER featured_excluded', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- --- bible_studies.format narrowing (migration 039) - MODIFY COLUMN is
-- always safe to re-run regardless of current state, unlike ADD COLUMN ---

ALTER TABLE bible_studies MODIFY COLUMN format ENUM('audio','pdf','image') NOT NULL DEFAULT 'audio';
DELETE c FROM content c JOIN bible_studies bs ON bs.content_id = c.id WHERE bs.format = 'image';
ALTER TABLE bible_studies MODIFY COLUMN format ENUM('audio','pdf') NOT NULL DEFAULT 'audio';

-- --- seeds - INSERT IGNORE relies on series.slug's existing UNIQUE key,
-- so these silently no-op if the row already exists from an earlier,
-- partially-applied migration ---

INSERT IGNORE INTO series (title, slug, description, section, language, status, is_locked, is_prophecy)
VALUES
  ('Daniel', 'daniel', 'A prophetic study through the book of Daniel.', 'bible_study', 'English', 'published', 0, 1),
  ('Revelation', 'revelation', 'A prophetic study through the book of Revelation.', 'bible_study', 'English', 'published', 0, 1),
  ('Matthew 24', 'matthew-24', 'Christ''s own prophecy of the last days.', 'bible_study', 'English', 'published', 0, 1);

UPDATE series SET bible_references = 'Daniel 1-12' WHERE slug = 'daniel' AND bible_references IS NULL;
UPDATE series SET bible_references = 'Revelation 1-22' WHERE slug = 'revelation' AND bible_references IS NULL;
UPDATE series SET bible_references = 'Matthew 24:1-51' WHERE slug = 'matthew-24' AND bible_references IS NULL;

-- Bible Quiz / Family Bible Study seeded directly as ordinary, unlocked
-- Explore Bible Topics collections (the redesign's end state) rather
-- than as locked reading-plan placeholders first and repurposed after -
-- the real Bible Reading Plan feature below replaces that whole concept.
INSERT IGNORE INTO series (title, slug, description, section, language, status, is_locked, is_reading_plan)
VALUES
  ('Bible Quiz', 'bible-quiz', 'Test yourself on what you''ve been learning.', 'bible_study', 'English', 'published', 0, 0),
  ('Family Bible Study', 'family-bible-study', 'Guides for studying the Bible together as a family.', 'bible_study', 'English', 'published', 0, 0);

-- Explicitly unlock these two even if they already existed from a
-- prior, partial run of migration 040 (which seeded them locked).
UPDATE series SET is_locked = 0, is_reading_plan = 0
  WHERE slug IN ('bible-quiz', 'family-bible-study');

-- Retire the old locked "Bible Reading Plan" placeholder if it exists
-- (it never had episodes attached, so nothing real is lost).
UPDATE series SET deleted_at = NOW()
  WHERE slug = 'bible-reading-plan' AND deleted_at IS NULL;

-- --- the real Bible Reading Plan feature (already idempotent) ---

CREATE TABLE IF NOT EXISTS reading_plans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  description TEXT,
  cover_image VARCHAR(255) DEFAULT NULL,
  duration_days SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  order_index INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_reading_plans_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reading_plan_days (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reading_plan_id INT UNSIGNED NOT NULL,
  day_number SMALLINT UNSIGNED NOT NULL,
  title VARCHAR(255) DEFAULT NULL,
  bible_references VARCHAR(255) DEFAULT NULL,
  body TEXT,
  CONSTRAINT fk_reading_plan_days_plan FOREIGN KEY (reading_plan_id) REFERENCES reading_plans(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_reading_plan_day (reading_plan_id, day_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reading_plan_progress (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  reading_plan_id INT UNSIGNED NOT NULL,
  current_day SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reading_plan_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reading_plan_progress_plan FOREIGN KEY (reading_plan_id) REFERENCES reading_plans(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_reading_plan_progress (user_id, reading_plan_id)
) ENGINE=InnoDB;

-- --- migration 042 (Children's Ministry) - every statement in that file
-- is already idempotent (CREATE TABLE IF NOT EXISTS / ON DUPLICATE KEY /
-- INSERT IGNORE), so if it was never applied on this database, run
-- 042_childrens_ministry.sql by itself via phpMyAdmin's Import tab after
-- this file - it's always safe to run regardless of this file.
