-- =========================================================
-- Migration 022: Simplify Bible Study formats to Video/PDF/Article/Poster
--
-- HOW TO RUN: after migration 021. Safe to run once; the widen/narrow
-- ALTER TABLE pair below use the same "widen the ENUM, remap old rows,
-- narrow the ENUM" sequence already used by migrations 012/013/018 for
-- this exact column - re-running after it has already completed is a
-- no-op (the narrower ENUM in step 3 simply accepts itself again on
-- step 1's widen, and no rows match step 2's WHERE clauses any more).
--
-- Per explicit request: Bible Study content types are simplified from
-- 11 finer-grained formats down to exactly 4 - Video, PDF, Article,
-- Poster. No content is deleted. Every existing row keeps its file/body/
-- thumbnail exactly as uploaded; only the `format`/`media_type`
-- classification label is remapped:
--   short_film, sermon, panel, animated, documentary, interview, podcast,
--     audio  ->  video   (all played back the same way to a visitor;
--                          the actual file's real extension still drives
--                          which player/badge is shown - see
--                          Frontend/src/utils/mediaKind.js getItemKind(),
--                          which sniffs the file extension as a fallback,
--                          so an audio file relabeled 'video' here still
--                          displays/plays as audio on the public site)
--   pdf_notes                            ->  pdf     (same upload-or-type
--                                                       -text behavior,
--                                                       just renamed)
--   article                              ->  article (unchanged)
--   (new, no prior value maps to it)     ->  image   (labeled "Poster" in
--                                                       the UI, same
--                                                       convention as
--                                                       media_library's
--                                                       existing Poster
--                                                       type)
-- =========================================================

USE aimsisters_db;

-- ---- 1. Widen the ENUM first so the remaps below have somewhere valid
-- to land ('pdf' and 'image' don't exist in the column yet). ----
ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM(
    'short_film','video','sermon','panel','audio','animated','documentary',
    'pdf_notes','podcast','interview','article','pdf','image'
  ) NOT NULL DEFAULT 'video';

-- ---- 2. Remap every existing row to one of the 4 final values. ----
UPDATE bible_studies
  SET format = 'video'
  WHERE format IN ('short_film','sermon','panel','animated','documentary','interview','podcast','audio');

UPDATE bible_studies
  SET format = 'pdf'
  WHERE format = 'pdf_notes';

-- content.media_type mirrors bible_studies.format for content_type =
-- 'bible_study' rows (see ContentController::SECTION_MEDIA_TYPES's
-- comment on that column) - resync it now that format has changed,
-- exactly like migration 007's original backfill did.
UPDATE content c
JOIN bible_studies bs ON bs.content_id = c.id
SET c.media_type = bs.format
WHERE c.content_type = 'bible_study';

-- ---- 3. Narrow the ENUM to the final 4 values - safe now, since no row
-- can still hold one of the old finer-grained values after step 2. ----
ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM('video','pdf','article','image') NOT NULL DEFAULT 'video';
