-- =========================================================
-- Migration 010: testimonials table
--
-- HOW TO RUN: any time after schema.sql. Safe to run once (CREATE TABLE
-- IF NOT EXISTS is idempotent).
--
-- WHY THIS IS NEEDED (not just "nice to have")
-- Backend/models/Testimonial.php and Backend/controllers/TestimonialController.php
-- are fully wired to a `testimonials` table (submit a testimony, admin
-- approve/reject/delete, homepage shows approved ones) — but no such
-- table exists anywhere in schema.sql or any earlier migration. Every
-- call to GET/POST /api/testimonials currently throws a fatal "table
-- doesn't exist" SQL error, so the testimonials feature is completely
-- broken as shipped, not just unfinished. This migration adds the
-- missing table with the exact columns the existing model code already
-- queries (user_id, body, status, created_at).
-- =========================================================

USE aimsisters_db;

CREATE TABLE IF NOT EXISTS testimonials (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_testimonials_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_testimonials_status (status)
) ENGINE=InnoDB;
