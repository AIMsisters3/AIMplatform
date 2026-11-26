-- =========================================================
-- Migration 025: Children Zone type simplification
--
-- HOW TO RUN: any time after migration 014 (which created the Kids
-- section). Safe to run once; re-running is a no-op (the UPDATEs only
-- match rows still carrying the old values, and none will after the
-- first run).
--
-- Per explicit request, the Children Zone's content types are
-- simplified: "Other"/"Fun"/"Cartoon" are removed as choices, Bible
-- Lessons become PDF-or-Poster only (no more written-article format),
-- and Songs can now be either Video or Audio (previously audio-only).
-- content.media_type is a free-text column (VARCHAR(30), migration 007),
-- not a DB ENUM, so none of this needs a column ALTER — only existing
-- rows need remapping so nothing already published becomes orphaned
-- under a value the admin UI/public site no longer recognizes:
--
--   cartoon, other  ->  activity   (the remaining format-flexible bucket -
--                                    neither of the removed types maps
--                                    cleanly onto Bible Story/Bible
--                                    Lesson/Song, so re-labeling as
--                                    Activity keeps the item visible and
--                                    playable rather than guessing a
--                                    closer-but-still-wrong category)
--   song (kids only, i.e. section='kids') -> kids_song
--     Kids' own song media_type is renamed to avoid colliding with the
--     separate, always-audio Songs section's own 'song' media_type
--     (migration 018) - Kids songs can now be Video OR Audio, so they
--     need a distinct value the frontend won't force-classify as audio
--     regardless of the actual uploaded file. General Songs-section
--     rows (section='songs') keep media_type='song' untouched.
--
-- No file, thumbnail, or body content is touched or deleted - only the
-- media_type label on existing Kids rows changes.
-- =========================================================

USE aimsisters_db;

UPDATE content SET media_type = 'activity' WHERE section = 'kids' AND media_type IN ('cartoon', 'other');
UPDATE content SET media_type = 'kids_song' WHERE section = 'kids' AND media_type = 'song';
