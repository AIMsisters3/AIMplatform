-- =========================================================
-- Migration 039: Prophecy series + Bible Studies Audio/PDF only
--
-- HOW TO RUN: after migration 038. Safe to run once; re-running errors
-- on the ALTER/INSERT statements (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- is_locked marks a series an admin can't rename or delete via the API
-- (SeriesController enforces this itself, not just a hidden UI control)
-- - episodes can still be added to or removed from it normally, only
-- the series record itself (title/slug/description/cover) is frozen.
-- is_prophecy marks a series as belonging to the Bible Studies page's
-- fixed "Prophecy" row. Neither flag has any API path to set it (Series::
-- create()/update() don't accept either field) - the only way a series
-- is ever locked or flagged prophecy is being seeded here directly, which
-- is what actually makes "constant, unchangeable" true rather than just
-- a UI suggestion.
--
-- Per explicit request, Daniel/Revelation/Matthew 24 are the Prophecy
-- row's three permanent books - seeded once, locked, with nothing in
-- the admin that can add a fourth.
--
-- Poster is also removed from Bible Studies here (narrowing further
-- from migration 038's Audio/PDF/Poster down to just Audio/PDF) - same
-- dev-mode treatment as that migration's Video/Article removal: every
-- Bible Study still stored as 'image' (Poster) format is deleted
-- outright, content row and all (every content_id foreign key in this
-- schema is ON DELETE CASCADE, so its bible_study_progress/notes/
-- comments/likes/views go with it).
-- =========================================================

ALTER TABLE series
  ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN is_prophecy TINYINT(1) NOT NULL DEFAULT 0 AFTER is_locked;

INSERT INTO series (title, slug, description, section, language, status, is_locked, is_prophecy)
VALUES
  ('Daniel', 'daniel', 'A prophetic study through the book of Daniel.', 'bible_study', 'English', 'published', 1, 1),
  ('Revelation', 'revelation', 'A prophetic study through the book of Revelation.', 'bible_study', 'English', 'published', 1, 1),
  ('Matthew 24', 'matthew-24', 'Christ''s own prophecy of the last days.', 'bible_study', 'English', 'published', 1, 1);

ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM('audio','pdf','image') NOT NULL DEFAULT 'audio';

DELETE c FROM content c
  JOIN bible_studies bs ON bs.content_id = c.id
  WHERE bs.format = 'image';

ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM('audio','pdf') NOT NULL DEFAULT 'audio';
