-- =========================================================
-- Migration 040: Bible Reading Plan series
--
-- HOW TO RUN: after migration 039. Safe to run once; re-running errors
-- on the ALTER/INSERT statements (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- Same pattern as migration 039's Prophecy row: is_reading_plan marks a
-- series as belonging to the Bible Studies page's fixed "Bible Reading
-- Plan" row (Bible Reading Plan / Bible Quiz / Family Bible Study).
-- Seeded locked (is_locked=1) so the three can't be renamed or deleted,
-- same as Daniel/Revelation/Matthew 24 — but, like Prophecy, episodes
-- (whatever the admin posts under each card — a monthly reading plan
-- PDF, a quiz, a family study guide) can still be added/removed
-- normally through the existing series-episode upload flow.
--
-- Neither is_reading_plan nor is_locked has any API write path
-- (Series::create()/update() don't accept either field), so this seed
-- is the only way these three rows ever come to exist or be locked.
-- =========================================================

ALTER TABLE series
  ADD COLUMN is_reading_plan TINYINT(1) NOT NULL DEFAULT 0 AFTER is_prophecy;

INSERT INTO series (title, slug, description, section, language, status, is_locked, is_reading_plan)
VALUES
  ('Bible Reading Plan', 'bible-reading-plan', 'A simple daily plan to read through Scripture.', 'bible_study', 'English', 'published', 1, 1),
  ('Bible Quiz', 'bible-quiz', 'Test yourself on what you''ve been learning.', 'bible_study', 'English', 'published', 1, 1),
  ('Family Bible Study', 'family-bible-study', 'Guides for studying the Bible together as a family.', 'bible_study', 'English', 'published', 1, 1);
