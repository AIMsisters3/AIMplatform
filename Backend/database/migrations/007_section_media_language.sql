-- =========================================================
-- Migration 007: separate Section / Media Type / Language from content_type
--
-- Until now `content_type` conflated three different questions at once:
-- WHERE an item belongs on the site (Section), WHAT KIND of media it is
-- (Media Type), and which of a fixed 6-value list the admin had to pick
-- from. This migration adds two explicit columns:
--
--   section     - website destination: media_library, news, gallery,
--                 bible_study, devotions
--   media_type  - what kind of media it is (video, article, sermon,
--                 photo_gallery, ...); the allowed vocabulary depends on
--                 `section` and is validated in ContentController, not
--                 as a DB enum, so new media types can be added later
--                 with no schema change
--
-- plus a `transcript` column (optional written notes for media-first
-- content, distinct from `body`), and a `languages` lookup table so
-- Language becomes a controlled, extensible dropdown (code + name)
-- instead of free text.
--
-- `content_type` itself is NOT removed or repurposed. Public routes
-- (routes/api.php's news/devotions/videos/articles/gallery aliases),
-- Content::all()'s `type` filter, and the bible_studies extension-table
-- sync all key off content_type today. ContentController now derives
-- content_type automatically from (section, media_type) on every
-- create/update, so those existing consumers keep working unchanged
-- while section/media_type become the source of truth going forward.
-- =========================================================

ALTER TABLE content
  ADD COLUMN section ENUM('media_library','news','gallery','bible_study','devotions') NOT NULL DEFAULT 'media_library' AFTER content_type,
  ADD COLUMN media_type VARCHAR(30) NOT NULL DEFAULT 'video' AFTER section,
  ADD COLUMN transcript LONGTEXT NULL AFTER body,
  ADD INDEX idx_content_section (section),
  ADD INDEX idx_content_section_media_type (section, media_type);

-- Backfill section from the existing content_type.
UPDATE content SET section = CASE content_type
  WHEN 'bible_study' THEN 'bible_study'
  WHEN 'news'         THEN 'news'
  WHEN 'gallery'       THEN 'gallery'
  WHEN 'devotion'      THEN 'devotions'
  ELSE 'media_library'
END;

-- Backfill media_type for everything except bible_study (its media_type
-- comes from the bible_studies extension row's `format`, handled next).
UPDATE content SET media_type = CASE content_type
  WHEN 'video'    THEN 'video'
  WHEN 'article'  THEN 'article'
  WHEN 'devotion' THEN 'devotional'
  WHEN 'news'     THEN 'news_article'
  WHEN 'gallery'  THEN 'photo_gallery'
  ELSE media_type
END
WHERE content_type <> 'bible_study';

UPDATE content c
JOIN bible_studies bs ON bs.content_id = c.id
SET c.media_type = bs.format
WHERE c.content_type = 'bible_study';

-- ---------------------------------------------------------
-- languages: code + display name, so Language is a controlled dropdown.
-- Adding a language later (e.g. Afrikaans) is a single INSERT here - no
-- ALTER TABLE, no frontend redeploy beyond re-fetching the list.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS languages (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO languages (code, name, sort_order) VALUES
  ('en', 'English', 1),
  ('ng', 'Oshiwambo', 2)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Normalize existing free-text language values down to a code before we
-- constrain the column with a foreign key.
UPDATE content SET language = 'en'
  WHERE language IS NULL OR language IN ('', 'English', 'english', 'EN', 'en');
UPDATE content SET language = 'ng'
  WHERE language IN ('Oshiwambo', 'oshiwambo', 'Ndonga', 'ndonga', 'NG', 'ng');
-- Anything else unrecognized also falls back to English rather than being
-- left orphaned once the FK constraint below is added.
UPDATE content SET language = 'en' WHERE language NOT IN (SELECT code FROM languages);

ALTER TABLE content
  MODIFY COLUMN language VARCHAR(10) NULL DEFAULT 'en',
  ADD CONSTRAINT fk_content_language FOREIGN KEY (language) REFERENCES languages(code) ON DELETE SET NULL;
