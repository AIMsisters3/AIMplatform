-- =========================================================
-- Migration 021: Real video duration on content
--
-- HOW TO RUN: after migration 020. Safe to run more than once (the
-- ADD COLUMN errors on a second run - expected, means it already ran).
--
-- The Content page must show each video's actual duration (spec: "Do
-- not display fake or estimated durations"), but nothing in this
-- codebase has ever captured it - the schema's own `videos` table has a
-- duration_seconds column, but nothing writes to that table at all (it
-- is dead code). Rather than wire up that unused extension table, this
-- adds duration_seconds directly to `content` (same pattern as every
-- other per-item field) - the browser reads a selected video file's
-- real duration client-side (HTML5 <video>.duration, no server-side
-- ffmpeg/ffprobe dependency, which this shared host almost certainly
-- doesn't have) at upload time and sends it along. Existing videos,
-- uploaded before this existed, simply have NULL here - the frontend
-- omits the duration badge entirely for those rather than guessing.
-- =========================================================

USE aimsisters_db;

ALTER TABLE content
  ADD COLUMN duration_seconds INT UNSIGNED DEFAULT NULL AFTER views;
