-- =========================================================
-- Migration 028: Contact message subject
--
-- HOW TO RUN: after migration 027. Safe to run once; re-running errors
-- on the ADD COLUMN statement (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- The redesigned Contact page (spec: match a supplied reference design)
-- asks the visitor to pick a subject (General Inquiry, Prayer Request,
-- Testimony, Partnership/Support, Technical Issue, Other) so admins can
-- triage incoming messages at a glance instead of reading every one to
-- find out what it's about. Nullable — every contact_messages row from
-- before this migration simply has none, never a guessed value.
-- =========================================================

ALTER TABLE contact_messages
  ADD COLUMN subject VARCHAR(100) NULL AFTER email;
