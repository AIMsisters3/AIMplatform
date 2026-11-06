-- =========================================================
-- Migration 024: Separate admin notifications, add Contact messages
--
-- HOW TO RUN: any time after migration 014 (which added notifications.
-- link_url). Safe to run once; every change here is additive (new
-- nullable/defaulted columns, a new table) — nothing existing is
-- dropped, narrowed, or reset. Every existing notification row defaults
-- to audience='user', source=NULL, which is exactly how it already
-- behaved (shown only in the general bell, no source label).
--
-- Per explicit request: "Separate admin notifications from general user
-- notifications, with source/category labels (Store, Contact,
-- Subscriptions, Testimonies, etc.)."
--
-- notifications.audience decides which bell a row shows in - the public
-- site's bell (Navbar) only ever shows audience='user' rows; a new
-- admin-only bell (Admin Header) only shows audience='admin' rows. Both
-- kinds are still rows for a real user_id (an admin's operational alert
-- is still "their" notification, same table, same mark-read mechanics -
-- audience is just which feed it appears in).
--
-- notifications.source is the human-facing category label ('store',
-- 'contact', 'subscriptions', 'testimonies', 'content', ...).
--
-- contact_messages is new: the site's Contact page has never actually
-- submitted anywhere (it only flipped local UI state to "sent" with no
-- backend call - see Frontend/src/Pages/Contact.jsx before this
-- migration's matching code change) - this table is what makes a
-- submitted message real and gives admins something to act on when they
-- get notified about one.
-- =========================================================

USE aimsisters_db;

ALTER TABLE notifications
  ADD COLUMN audience ENUM('user','admin') NOT NULL DEFAULT 'user' AFTER user_id,
  ADD COLUMN source VARCHAR(30) NULL AFTER type,
  ADD INDEX idx_notifications_user_audience (user_id, audience);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
