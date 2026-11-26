-- =========================================================
-- Migration 012: Add "podcast" as a Bible Study format
--
-- HOW TO RUN: after migration 011. On shared hosting where the real
-- database isn't named "aimsisters_db" (see README §7 Step 4), select
-- your database in phpMyAdmin first and DELETE the "USE aimsisters_db;"
-- line below before running — it isn't needed once the right database
-- is already selected, and would otherwise try to switch to a database
-- that doesn't exist on that account.
--
-- WHAT THIS DOES
-- bible_studies.format is a strict ENUM (migration 004) that
-- ContentController::SECTION_MEDIA_TYPES['bible_study'] mirrors exactly -
-- an admin can now also upload a podcast episode under the Bible Study
-- section (previously only Media Library's podcast type existed), so the
-- ENUM needs "podcast" added or every such save would fail with a
-- truncation error.
-- =========================================================

USE aimsisters_db;

ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM('short_film','video','sermon','panel','audio','animated','documentary','pdf_notes','podcast') NOT NULL DEFAULT 'video';
