-- =========================================================
-- Migration 018: Navbar/Explore rebuild, Reforms categories, Songs
-- destination, Bible-Study-discoverable series, titled notes
--
-- HOW TO RUN: after migration 017. Safe to run once; re-running errors on
-- the ADD COLUMN statements (expected — means it already ran). The two
-- MODIFY COLUMN statements (widening existing ENUMs) and the INSERT
-- IGNORE are themselves safely re-runnable.
--
-- Every change here is additive: new ENUM values (existing rows keep
-- their existing value unchanged), new nullable/defaulted columns, and
-- new category rows inserted with INSERT IGNORE (keyed on the existing
-- UNIQUE slug, so re-running is a no-op, not a duplicate-row error).
-- Nothing is dropped, narrowed, or reset.
-- =========================================================

USE aimsisters_db;

-- ---- 1. Songs becomes its own top-level destination, alongside the
-- existing media_library/news/gallery/bible_study/devotions/kids
-- sections (same pattern as Kids did in migration 014). Deliberately
-- separate from Kids' existing embedded `media_type = 'song'` items —
-- those are children's songs inside Kids Zone; this is a general
-- worship-music destination for everyone else. ----
ALTER TABLE content
  MODIFY COLUMN section ENUM('media_library','news','gallery','bible_study','devotions','kids','songs') NOT NULL DEFAULT 'media_library';

-- ---- 2. Bible Studies gains "article" as a supported format — the
-- spec explicitly lists "Articles, where supported" for Bible Studies,
-- but the format ENUM never had it (only media_library/news/devotions
-- could be articles). Same widen-in-place pattern already used by
-- migrations 012 and 013 for this exact column. ----
ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM('short_film','video','sermon','panel','audio','animated','documentary','pdf_notes','podcast','interview','article') NOT NULL DEFAULT 'video';

-- ---- 3. Exactly three Reforms categories. These are ordinary rows in
-- the existing shared `categories` table (type='content') — Reforms are
-- categories, not a new destination/table. No existing category is
-- renamed or removed; nothing pre-existing needs remapping since no
-- "Reform"-like category has ever existed in this database (verified
-- against the full migration history before writing this). ----
INSERT IGNORE INTO categories (name, slug, type) VALUES
  ('Health Reform', 'health-reform', 'content'),
  ('Spiritual Reform', 'spiritual-reform', 'content'),
  ('Dress Reform', 'dress-reform', 'content');

-- ---- 4. A series can now be flagged as belonging to Bible Studies, so
-- it's discoverable both on the main Series page (unchanged) and inside
-- the Bible Studies page. Mirrors `content.section`'s naming so the
-- concept is familiar; defaults every existing series to its current
-- de-facto behavior (general/media_library) so nothing already published
-- changes destination on its own. ----
ALTER TABLE series
  ADD COLUMN section ENUM('media_library','bible_study') NOT NULL DEFAULT 'media_library' AFTER category_id,
  ADD INDEX idx_series_section (section);

-- ---- 5. Notes gain an optional title, for the new notebook-style
-- detail/print view. Existing notes are untouched (title starts NULL —
-- the UI falls back to "Untitled Note" for those, never invents one). ----
ALTER TABLE bible_study_notes
  ADD COLUMN title VARCHAR(200) DEFAULT NULL AFTER content_id;
