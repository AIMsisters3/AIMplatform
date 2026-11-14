-- =========================================================
-- Migration 011: Content View Deduplication
--
-- HOW TO RUN: after migration 010. On shared hosting where the real
-- database isn't named "aimsisters_db" (see README §7 Step 4), select
-- your database in phpMyAdmin first and DELETE the "USE aimsisters_db;"
-- line below before running — it isn't needed once the right database
-- is already selected, and would otherwise try to switch to a database
-- that doesn't exist on that account.
--
-- WHAT THIS DOES:
-- content.views used to be incremented on every single GET of an item's
-- detail page, so refreshing the page (or a bot re-fetching it) inflated
-- the count with no relation to real reach. This adds a log table
-- recording one row per (content item, visitor, day) — a "visitor" is
-- either a logged-in user_id or an anonymous long-lived cookie value
-- (see Backend/helpers/visitor.php) — so a repeat view from the same
-- visitor on the same day is a no-op, while a genuinely new visitor,
-- registered or not, still counts. content.views is now only
-- incremented when a new row is actually inserted here (see
-- Content::recordView()).
-- =========================================================

USE aimsisters_db;

CREATE TABLE IF NOT EXISTS content_views (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id INT UNSIGNED NOT NULL,
  visitor_key VARCHAR(64) NOT NULL,
  user_id INT UNSIGNED DEFAULT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  viewed_date DATE GENERATED ALWAYS AS (DATE(viewed_at)) STORED,
  CONSTRAINT fk_content_views_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uniq_content_view_per_day (content_id, visitor_key, viewed_date)
) ENGINE=InnoDB;
