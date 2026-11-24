-- =========================================================
-- Migration 043: Bible Studies page v2
--
-- HOW TO RUN: after migration 042. Safe to run once; re-running errors
-- on the ALTER/INSERT/CREATE statements (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- 1) series.bible_references — a collection-level field (Daniel,
--    Revelation, Matthew 24, and any admin-created "Explore Bible
--    Topics" collection) shown above its chapter list, same idea as
--    content.bible_references (migration 004) but for the series itself
--    rather than one episode.
--
-- 2) Repurposes migration 040's three locked placeholder rows per the
--    redesign: "Bible Reading Plan" becomes a real, separate feature
--    (see the new reading_plans tables below) so its placeholder series
--    row is retired (soft-deleted, not hard-deleted — it never had any
--    episodes attached, so nothing real is lost). "Bible Quiz" and
--    "Family Bible Study" had no reading-plan-shaped content either and
--    become ordinary, admin-manageable Explore Bible Topics collections
--    instead (unlocked, is_reading_plan cleared) — an admin can now
--    rename them, add chapters, or delete them like any other topic.
--
-- 3) reading_plans / reading_plan_days / reading_plan_progress — the
--    real Bible Reading Plan feature: one or more admin-created plans,
--    each with a daily schedule of Bible references, independent of any
--    audio/PDF upload. Mirrors bible_study_progress/lesson_progress's
--    own per-user upsert-row pattern.
-- =========================================================

ALTER TABLE series
  ADD COLUMN bible_references VARCHAR(255) DEFAULT NULL AFTER description;

-- The three Prophecy collections (migration 039) are locked, so there is
-- no admin UI path to ever set this on them - seeded here instead, the
-- same way their rows themselves were seeded.
UPDATE series SET bible_references = 'Daniel 1-12' WHERE slug = 'daniel';
UPDATE series SET bible_references = 'Revelation 1-22' WHERE slug = 'revelation';
UPDATE series SET bible_references = 'Matthew 24:1-51' WHERE slug = 'matthew-24';

UPDATE series SET is_locked = 0, is_reading_plan = 0
  WHERE slug IN ('bible-quiz', 'family-bible-study');

UPDATE series SET deleted_at = NOW()
  WHERE slug = 'bible-reading-plan' AND is_reading_plan = 1 AND deleted_at IS NULL;

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

-- One upsert row per (user, plan). current_day is the next unread day
-- (1-based) - the plan is complete once current_day exceeds the plan's
-- duration_days, at which point completed_at is set once and left alone.
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
