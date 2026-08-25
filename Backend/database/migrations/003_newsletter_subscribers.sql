-- =========================================================
-- Migration 003: newsletter_subscribers table
--
-- HOW TO RUN: any time after schema.sql. Safe to run once (CREATE TABLE
-- IF NOT EXISTS is idempotent).
--
-- WHY THIS IS NEEDED (not just "nice to have")
-- Backend/models/Subscriber.php and Backend/newsletter_confirm.php were
-- already fully wired to a `subscribers` table — but no such table (or
-- any table matching spec §36/§43's `newsletter_subscribers`) exists in
-- schema.sql. Every call to POST /api/newsletter/subscribe currently
-- throws a fatal "table doesn't exist" SQL error, so the newsletter
-- signup on the homepage/footer is completely broken as shipped, not
-- just unfinished. This migration adds the missing table with the exact
-- columns the existing model code already queries
-- (email, token, status, confirmed_at) plus `language` and
-- `subscribed_at`, called for by spec §36 ("store: email, status,
-- subscription date, language preference").
--
-- Backend/models/Subscriber.php has been updated in this same change to
-- query `newsletter_subscribers` (matching the spec's naming) instead of
-- the never-existent `subscribers`.
-- =========================================================

USE aimsisters_db;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  token VARCHAR(64) DEFAULT NULL,
  status ENUM('pending','subscribed','unsubscribed') NOT NULL DEFAULT 'pending',
  language VARCHAR(50) NOT NULL DEFAULT 'English',
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME DEFAULT NULL,
  INDEX idx_newsletter_status (status)
) ENGINE=InnoDB;
