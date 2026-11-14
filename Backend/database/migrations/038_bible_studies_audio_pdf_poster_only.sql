-- =========================================================
-- Migration 038: Bible Studies — Audio/PDF/Poster only
--
-- HOW TO RUN: after migration 037. Safe to run once; re-running errors
-- on the ALTER COLUMN statements (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- Per explicit request: Bible Studies only ever supports Audio, PDF, or
-- Poster going forward — Video and Article are no longer valid formats
-- here at all. (Video/Article content elsewhere in the app — the
-- Content page, Devotions, News — is completely untouched; this is
-- scoped to the bible_studies table only.)
--
-- Confirmed development-stage data, not production content to
-- preserve — every bible_studies row currently stored as 'video' or
-- 'article' is deleted outright, its content row and all, rather than
-- just hidden ("remove them completely as they never existed"). This
-- cascades to that row's bible_study_progress/bible_study_notes/
-- comments/content_likes/content_views automatically — every content_id
-- foreign key referencing content(id) in this schema is ON DELETE
-- CASCADE.
--
-- 'audio' is added to the enum fresh here — migration 022 had folded it
-- into 'video' when formats were first simplified down to Video/PDF/
-- Article/Poster, so it hasn't been a legal value since.
-- =========================================================

ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM('video','pdf','article','image','audio') NOT NULL DEFAULT 'audio';

DELETE c FROM content c
  JOIN bible_studies bs ON bs.content_id = c.id
  WHERE bs.format IN ('video', 'article');

ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM('audio','pdf','image') NOT NULL DEFAULT 'audio';
