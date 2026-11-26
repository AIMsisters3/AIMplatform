-- =========================================================
-- Migration 019: Reforms-only content categories
--
-- HOW TO RUN: after migration 018. Safe to run more than once (the
-- DELETE simply matches zero rows on a second run).
--
-- Per explicit request: the entire system should only offer these three
-- content categories going forward - Health Reform, Spiritual Reform,
-- Dress Reform (all three already exist as of migration 018). Every
-- other type='content' category row (Bible Studies, Children, Devotions,
-- Health, Music, News, Prophecy, Sabbath School, Testimonies, Youth, and
-- any admin-added ones) is removed.
--
-- type='product' categories (Shop) are NOT touched by this migration -
-- they are a separate catalog, out of scope for this request.
--
-- No content is deleted. content.category_id has
-- `ON DELETE SET NULL` (schema.sql) - any content item that was tagged
-- with a removed category simply loses that category label and keeps
-- everything else (title, body, media, status, etc.) exactly as-is.
-- =========================================================

USE aimsisters_db;

DELETE FROM categories
WHERE type = 'content'
  AND slug NOT IN ('health-reform', 'spiritual-reform', 'dress-reform');
