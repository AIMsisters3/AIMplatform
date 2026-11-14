-- =========================================================
-- Migration 020: Add Prophecy back as a fourth content category
--
-- HOW TO RUN: after migration 019. Safe to run more than once (INSERT
-- IGNORE is a no-op if it already exists).
--
-- Migration 019 narrowed the system to exactly the three Reforms
-- categories. Per explicit follow-up request, the homepage's four
-- category cards (Dress Reform, Health Reform, Spiritual Reform,
-- Prophecy) need a real fourth category - Prophecy existed as a
-- category before 019 removed it, so this just re-adds that one row
-- rather than reintroducing anything else 019 removed.
-- =========================================================

USE aimsisters_db;

INSERT IGNORE INTO categories (name, slug, type) VALUES
  ('Prophecy', 'prophecy', 'content');
