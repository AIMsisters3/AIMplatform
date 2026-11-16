-- =========================================================
-- Migration 041: content.is_downloadable
--
-- HOW TO RUN: after migration 040. Safe to run once; re-running errors
-- on the ALTER TABLE statement (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- DownloadButton.jsx currently shows a download button on any content
-- row that simply has a media_url — there was never an admin-facing
-- "allow download" toggle anywhere in the schema. The Children's
-- Ministry spec explicitly requires "downloads should only be available
-- when the content has been made downloadable by the administrator"
-- for Bible Stories, so this adds that switch.
--
-- Defaults to 1 (downloadable) on every existing and future row, which
-- is exactly today's sitewide behavior (any media_url shows a download
-- button) — so this is purely additive for every content type except
-- Bible Stories, which is the only place the new admin UI will actually
-- expose the toggle and default new stories to 0 (see
-- Backend/controllers/ContentController.php's create() handling).
-- =========================================================

ALTER TABLE content
  ADD COLUMN is_downloadable TINYINT(1) NOT NULL DEFAULT 1 AFTER allow_comments;
