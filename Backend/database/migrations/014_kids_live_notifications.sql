-- =========================================================
-- Migration 014: Kids section, Live content flag, notification links
--
-- Kids becomes a first-class `section` value alongside media_library/
-- news/gallery/bible_study/devotions - it reuses the exact same `content`
-- table (title/slug/thumbnail/media_url/category/language/status all
-- keep working unchanged), the same pattern already used for every other
-- section. Its media_type vocabulary (bible_story, cartoon, song,
-- activity, ...) is validated in ContentController, not as a DB enum -
-- same reasoning as migration 007.
--
-- is_live marks a content row (Content/Media Library OR Bible Study -
-- both already live in this same table) as a live stream. The stream URL
-- itself reuses the existing media_url column - no new column needed for
-- that - is_live is only the flag that turns on the "LIVE" badge and
-- swaps the admin's upload control from a file Dropzone to a URL field.
--
-- notifications.link_url lets an in-app notification (e.g. "New
-- Devotion") deep-link straight to the content instead of only showing a
-- title/message with nowhere to go.
-- =========================================================

ALTER TABLE content
  MODIFY COLUMN section ENUM('media_library','news','gallery','bible_study','devotions','kids') NOT NULL DEFAULT 'media_library',
  ADD COLUMN is_live TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured;

ALTER TABLE notifications
  ADD COLUMN link_url VARCHAR(255) NULL AFTER type;
