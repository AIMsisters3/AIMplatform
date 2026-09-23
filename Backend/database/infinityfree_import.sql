-- =========================================================
-- AIMsisters — combined production import for hosts where you cannot
-- CREATE DATABASE and the database already exists under a fixed name
-- (e.g. InfinityFree's if0_XXXXXXXX_aimsisters).
--
-- GENERATED FILE — do not hand-edit. Regenerate after adding a new
-- migration by concatenating schema.sql + every migrations/*.sql file
-- in numeric order (001, 002, 003, ...) and removing two things from
-- the result: the `CREATE DATABASE IF NOT EXISTS aimsisters_db ...;`
-- statement (only in schema.sql) and every standalone
-- `USE aimsisters_db;` line (in most migration files) — every other
-- line carries over unchanged.
--
-- HOW TO USE (InfinityFree / phpMyAdmin):
--   1. Log into InfinityFree's phpMyAdmin for your account.
--   2. Click your existing database (if0_XXXXXXXX_aimsisters) in the left
--      sidebar FIRST, so it's the selected/active database.
--   3. Import tab -> choose this file -> Go.
-- This file never issues CREATE DATABASE or USE — every statement runs
-- against whichever database you had selected in step 2, which is
-- exactly why step 2 matters.
--
-- This is the exact same schema as schema.sql + migrations/*.sql, just
-- reordered into one file for hosts that only offer a single-file
-- phpMyAdmin import and can't run multiple files / a mysql CLI import.
-- Nothing here is a duplicate table definition — every statement here
-- originates from those source files.
-- =========================================================

-- ---- from database/schema.sql ----
-- =========================================================
-- AIMsisters Ministry Platform - Database Schema
-- Database: aimsisters_db
-- Engine: MySQL 8+ (InnoDB, utf8mb4)
-- =========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------
-- users
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('visitor','admin','superadmin') NOT NULL DEFAULT 'visitor',
  avatar VARCHAR(255) DEFAULT NULL,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  last_login_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- categories (shared across content types)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  type ENUM('content','product') NOT NULL DEFAULT 'content',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- content (generic ministry content: bible studies, videos, articles base)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS content (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  description TEXT,
  body LONGTEXT,
  content_type ENUM('bible_study','video','article','devotion','news','gallery') NOT NULL,
  category_id INT UNSIGNED DEFAULT NULL,
  author_id INT UNSIGNED DEFAULT NULL,
  speaker VARCHAR(150) DEFAULT NULL,
  bible_references VARCHAR(255) DEFAULT NULL,
  tags VARCHAR(255) DEFAULT NULL,
  language VARCHAR(50) DEFAULT 'English',
  thumbnail VARCHAR(255) DEFAULT NULL,
  media_url VARCHAR(255) DEFAULT NULL,
  visibility ENUM('public','private','unlisted') NOT NULL DEFAULT 'public',
  status ENUM('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  allow_comments TINYINT(1) NOT NULL DEFAULT 1,
  seo_keywords VARCHAR(255) DEFAULT NULL,
  publish_date DATETIME DEFAULT NULL,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_content_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_content_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_content_type (content_type),
  INDEX idx_content_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- videos (extends content with video-specific metadata)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS videos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id INT UNSIGNED NOT NULL,
  youtube_id VARCHAR(50) DEFAULT NULL,
  duration_seconds INT UNSIGNED DEFAULT NULL,
  resolution VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_videos_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- articles (extends content with article-specific metadata)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id INT UNSIGNED NOT NULL,
  reading_time_minutes INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_articles_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- devotions (extends content with devotion-specific metadata)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS devotions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id INT UNSIGNED NOT NULL,
  devotion_date DATE DEFAULT NULL,
  verse_of_day VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_devotions_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- gallery (photo/media gallery items)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  album VARCHAR(150) DEFAULT NULL,
  uploaded_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gallery_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- news
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS news (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id INT UNSIGNED NOT NULL,
  location VARCHAR(150) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_news_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- products (Christian bookstore)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  description TEXT,
  category_id INT UNSIGNED DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  sale_price DECIMAL(10,2) DEFAULT NULL,
  sku VARCHAR(100) DEFAULT NULL,
  stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  product_type ENUM('physical','digital') NOT NULL DEFAULT 'physical',
  thumbnail VARCHAR(255) DEFAULT NULL,
  gallery_images TEXT,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('draft','active','out_of_stock','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- coupons
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(60) NOT NULL UNIQUE,
  discount_type ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INT UNSIGNED DEFAULT NULL,
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- orders
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED DEFAULT NULL,
  order_number VARCHAR(40) NOT NULL UNIQUE,
  status ENUM('pending','paid','processing','shipped','completed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shipping_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  coupon_id INT UNSIGNED DEFAULT NULL,
  shipping_address TEXT,
  payment_method VARCHAR(50) DEFAULT NULL,
  payment_reference VARCHAR(150) DEFAULT NULL,
  tracking_number VARCHAR(150) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- order_items
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- wishlists
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlists (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_wishlist (user_id, product_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- product_reviews
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_reviews (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  review TEXT,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- comments (on content items; one level of threaded replies via parent_id)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id INT UNSIGNED NOT NULL,
  parent_id INT UNSIGNED DEFAULT NULL,
  user_id INT UNSIGNED DEFAULT NULL,
  body TEXT NOT NULL,
  status ENUM('pending','approved','spam') NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_comments_content (content_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- comment_likes (one like per user per comment)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS comment_likes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comment_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comment_likes_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_comment_like (comment_id, user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- notifications
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED DEFAULT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'general',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- analytics
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  metric_key VARCHAR(100) NOT NULL,
  metric_value BIGINT NOT NULL DEFAULT 0,
  recorded_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_metric_date (metric_key, recorded_date)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- settings (key/value site configuration)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------
-- Seed: default super admin row (placeholder hash — cannot be logged into).
-- Run `php Backend/database/seed_admin.php` after importing this file to set
-- a real, working password for admin@aimsisters.org. See README section 1.
-- ---------------------------------------------------------
INSERT INTO users (name, email, password_hash, role)
VALUES ('AIMsisters Admin', 'admin@aimsisters.org', '*', 'superadmin')
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO categories (name, slug, type) VALUES
('Bible Studies','bible-studies','content'),
('Children','children','content'),
('Devotions','devotions','content'),
('Health','health','content'),
('Music','music','content'),
('News','news','content'),
('Prophecy','prophecy','content'),
('Sabbath School','sabbath-school','content'),
('Testimonies','testimonies','content'),
('Youth','youth','content')
ON DUPLICATE KEY UPDATE slug = VALUES(slug);

-- ---- from database/migrations/001_roles_permissions.sql ----
-- =========================================================
-- Migration 001: Role-based access control (roles / permissions)
--
-- HOW TO RUN: import this file in phpMyAdmin (or `mysql aimsisters_db <
-- 001_roles_permissions.sql`) against a database that already has
-- schema.sql applied. Safe to run once; re-running is harmless for the
-- CREATE TABLE / INSERT IGNORE / ON DUPLICATE KEY statements, but the
-- ALTER TABLE ADD COLUMN statements will error on a second run (that's
-- expected — it means this migration already applied).
--
-- WHAT THIS DOES
-- Spec section 28 calls for configurable role permissions enforced by the
-- backend, not just hidden buttons. Previously `users.role` was a fixed
-- ENUM('visitor','admin','superadmin') checked with in_array() in PHP —
-- adding a role meant a code change + ALTER TABLE. This migration adds:
--   - roles              the assignable account roles
--   - permissions        each distinct capability the API can gate
--   - role_permissions   which roles have which permissions (editable via
--                        SQL or a future admin UI — no code change needed
--                        to regrant/revoke a permission from a role)
--   - users.role_id      FK to roles, replacing the enum going forward
--
-- "Visitor" from the spec's role list is intentionally NOT a row in
-- `roles` — it's any unauthenticated request (no JWT), which the API
-- already models as `optional_auth() === null`. Every *account* gets one
-- of the five roles below; visitors are simply everyone else.
--
-- DATA SAFETY: the old `users.role` ENUM column is left in place
-- (unused by new code, kept for rollback/audit) rather than dropped.
-- Existing rows are backfilled into role_id automatically below — no
-- existing user, session, or password is touched.
-- =========================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Seed the five assignable roles.
-- ---------------------------------------------------------
INSERT INTO roles (slug, name, description) VALUES
  ('user',       'User',        'Registered member: can comment, save/bookmark content, and manage their own orders.'),
  ('moderator',  'Moderator',   'Trusted community member who can moderate comments.'),
  ('editor',     'Editor',      'Ministry staff who can create, edit, and publish content.'),
  ('admin',      'Admin',       'Full content and store management, including users and settings review.'),
  ('superadmin', 'Super Admin', 'Unrestricted access, including user role management and site settings.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ---------------------------------------------------------
-- Seed permissions. Grouped by the resource they gate; add more here as
-- new controllers are built (e.g. series.manage, quizzes.manage) —
-- INSERT ... ON DUPLICATE KEY UPDATE makes re-seeding safe.
-- ---------------------------------------------------------
INSERT INTO permissions (slug, name, description) VALUES
  ('content.create',        'Create content',            'Create draft ministry content (videos, articles, devotions, etc.).'),
  ('content.edit',          'Edit content',               'Edit any content item, including items authored by others.'),
  ('content.publish',       'Publish content',            'Change content status to published/scheduled/archived.'),
  ('content.delete',        'Delete content',             'Permanently remove content.'),
  ('content.feature',       'Feature content',            'Toggle homepage/library featured placement.'),
  ('categories.manage',     'Manage categories',          'Create, rename, or remove content/product categories.'),
  ('comments.moderate',     'Moderate comments',          'Approve, mark spam, or restore comments from any user.'),
  ('comments.delete_any',   'Delete any comment',         'Delete a comment authored by someone else.'),
  ('products.manage',       'Manage shop products',       'Create, edit, delete, and publish shop products.'),
  ('orders.manage',         'Manage all orders',          'View and update the status of any customer order.'),
  ('orders.view_own',       'View own orders',            'View order history for the signed-in account.'),
  ('uploads.create',        'Upload media',               'Upload images, video, audio, or PDF files.'),
  ('users.view',            'View user accounts',         'List and view other user accounts.'),
  ('users.manage',          'Manage user accounts',       'Suspend accounts and change account roles.'),
  ('testimonials.manage',   'Manage testimonials',        'Approve, edit, or remove testimonials.'),
  ('newsletter.manage',     'Manage newsletter',          'View and export the subscriber list.'),
  ('notifications.manage_own', 'Manage own notifications','Read/mark-read the signed-in account''s notifications.'),
  ('settings.manage',       'Manage site settings',       'Edit global site configuration key/value settings.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ---------------------------------------------------------
-- Default role -> permission grants. Each role includes everything the
-- role "below" it has (moderator gets user's grants too, etc.) except
-- superadmin, whose middleware check always passes regardless of this
-- table (see Backend/helpers/permissions.php) — its rows here exist only
-- so it also reads correctly in an admin "role permissions" screen later.
-- ---------------------------------------------------------
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.slug IN (
  'orders.view_own', 'notifications.manage_own'
) WHERE r.slug = 'user';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.slug IN (
  'orders.view_own', 'notifications.manage_own',
  'comments.moderate', 'comments.delete_any'
) WHERE r.slug = 'moderator';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.slug IN (
  'orders.view_own', 'notifications.manage_own',
  'comments.moderate', 'comments.delete_any',
  'content.create', 'content.edit', 'content.publish', 'content.feature',
  'categories.manage', 'uploads.create'
) WHERE r.slug = 'editor';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.slug IN (
  'orders.view_own', 'notifications.manage_own',
  'comments.moderate', 'comments.delete_any',
  'content.create', 'content.edit', 'content.publish', 'content.feature', 'content.delete',
  'categories.manage', 'uploads.create',
  'products.manage', 'orders.manage', 'users.view', 'testimonials.manage', 'newsletter.manage'
) WHERE r.slug = 'admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON 1=1
WHERE r.slug = 'superadmin';

-- ---------------------------------------------------------
-- users.role_id: add the FK column and backfill it from the existing
-- `role` enum. The enum column is left in place, unused, for rollback.
-- ---------------------------------------------------------
ALTER TABLE users
  ADD COLUMN role_id INT UNSIGNED DEFAULT NULL AFTER role,
  ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

UPDATE users u JOIN roles r ON r.slug = 'user'       SET u.role_id = r.id WHERE u.role = 'visitor'   AND u.role_id IS NULL;
UPDATE users u JOIN roles r ON r.slug = 'admin'      SET u.role_id = r.id WHERE u.role = 'admin'     AND u.role_id IS NULL;
UPDATE users u JOIN roles r ON r.slug = 'superadmin' SET u.role_id = r.id WHERE u.role = 'superadmin' AND u.role_id IS NULL;

CREATE INDEX idx_users_role_id ON users (role_id);

SET FOREIGN_KEY_CHECKS = 1;

-- ---- from database/migrations/002_soft_deletes_and_indexes.sql ----
-- =========================================================
-- Migration 002: Soft deletes + query indexes
--
-- HOW TO RUN: after migration 001. Safe to run once; re-running errors on
-- the ADD COLUMN/ADD INDEX statements (expected — means it already ran).
--
-- WHAT THIS DOES
-- - `content` and `products` get `deleted_at`. These are the two tables an
--   admin routinely deletes from (Manage Content, Manage Products) where
--   an accidental delete previously meant re-creating the item from
--   scratch (or a restore from a DB backup). Content/Content model now
--   filters `deleted_at IS NULL` everywhere public/admin listings read
--   from it, and DELETE sets deleted_at instead of removing the row.
--   Users already have a soft-disable via `status` ('active'/'suspended')
--   so they don't need a second mechanism here.
-- - Indexes for the query patterns the app actually runs: filtering the
--   content library by category+status, filtering products by
--   category+status, an admin's unread-notification count, and comment
--   moderation by status.
-- =========================================================

ALTER TABLE content
  ADD COLUMN deleted_at DATETIME DEFAULT NULL AFTER updated_at;

ALTER TABLE products
  ADD COLUMN deleted_at DATETIME DEFAULT NULL AFTER updated_at;

-- content
CREATE INDEX idx_content_category_status ON content (category_id, status);
CREATE INDEX idx_content_language ON content (language);
CREATE INDEX idx_content_deleted_at ON content (deleted_at);
CREATE INDEX idx_content_publish_date ON content (publish_date);

-- products
CREATE INDEX idx_products_category_status ON products (category_id, status);
CREATE INDEX idx_products_deleted_at ON products (deleted_at);

-- comments (content_id and user_id already have an index from their FK
-- constraints — only the moderation-queue status filter is new)
CREATE INDEX idx_comments_status ON comments (status);

-- notifications: user_id already has an FK index, but the moderation/badge
-- query filters on (user_id, is_read) together, which a composite serves
-- better than the single-column FK index alone.
CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read);

-- orders: user_id already has an FK index; status is the new admin filter.
CREATE INDEX idx_orders_status ON orders (status);

-- ---- from database/migrations/003_newsletter_subscribers.sql ----
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

-- ---- from database/migrations/004_bible_studies.sql ----
-- =========================================================
-- Migration 004: Bible Study as a first-class entity
--
-- HOW TO RUN: after migrations 001-003.
--
-- WHAT THIS DOES
-- Spec §13-15: Bible Study is its own major section, separate from the
-- Content/Media Library, with its own formats (Short Film, Video, Sermon,
-- Panel, Audio, Animated, Documentary, PDF/Notes), and per-user progress
-- tracking, notes, and bookmarking.
--
-- Bible studies still live in the `content` table (content_type =
-- 'bible_study') — that keeps title/slug/description/thumbnail/media_url/
-- language/status/comments/soft-delete all working exactly as they do for
-- every other content type, with zero duplication. This migration adds
-- what's specific to a Bible study on top:
--   - bible_studies       1:1 extension of a content row — format +
--                         study guide URL, same pattern as `videos` or
--                         `articles` in schema.sql.
--   - bible_study_progress per-user completion state for one study.
--   - bible_study_notes   a user's personal notes on one study (private —
--                         only the author can read their own notes).
-- =========================================================

CREATE TABLE IF NOT EXISTS bible_studies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id INT UNSIGNED NOT NULL,
  format ENUM('short_film','video','sermon','panel','audio','animated','documentary','pdf_notes') NOT NULL DEFAULT 'video',
  study_guide_url VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bible_studies_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_bible_studies_content (content_id),
  INDEX idx_bible_studies_format (format)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bible_study_progress (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  content_id INT UNSIGNED NOT NULL,
  status ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'in_progress',
  progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_position_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  completed_at DATETIME DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bsp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bsp_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_bsp_user_content (user_id, content_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bible_study_notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  content_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bsn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bsn_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  INDEX idx_bsn_user_content (user_id, content_id)
) ENGINE=InnoDB;

-- ---- from database/migrations/005_series_episodes.sql ----
-- =========================================================
-- Migration 005: Series -> Season -> Episode
--
-- HOW TO RUN: after migration 004.
--
-- WHAT THIS DOES (spec §12, §58 — explicitly called out for future
-- AIMsisters animation projects, e.g. "The Story of Redemption")
-- An episode is still a normal `content` row (content_type = 'video',
-- typically) — it reuses the video player, comments, bookmarks, watch
-- history, and soft-delete that already exist for every content item.
-- `series_id`/`season_number`/`episode_number` are added directly to
-- `content` rather than a separate join table, because an episode has
-- exactly one series/season/episode position, never many — a plain
-- nullable FK is the simplest correct model and keeps every existing
-- Content query (find/findBySlug/all) working unchanged for non-episode
-- content, which just has series_id = NULL.
-- =========================================================

CREATE TABLE IF NOT EXISTS series (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  description TEXT,
  cover_image VARCHAR(255) DEFAULT NULL,
  category_id INT UNSIGNED DEFAULT NULL,
  language VARCHAR(50) NOT NULL DEFAULT 'English',
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  CONSTRAINT fk_series_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE content
  ADD COLUMN series_id INT UNSIGNED DEFAULT NULL AFTER category_id,
  ADD COLUMN season_number SMALLINT UNSIGNED DEFAULT NULL AFTER series_id,
  ADD COLUMN episode_number SMALLINT UNSIGNED DEFAULT NULL AFTER season_number,
  ADD CONSTRAINT fk_content_series FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL;

CREATE INDEX idx_content_series ON content (series_id, season_number, episode_number);

-- ---- from database/migrations/006_bookmarks_watch_history.sql ----
-- =========================================================
-- Migration 006: Bookmarks + Watch History
--
-- HOW TO RUN: after migration 005.
--
-- WHAT THIS DOES (spec §17 "Content Discovery" / §27 / §33 "Bookmarks":
-- a centralized saved-content system, separate from per-item watch
-- progress)
-- - bookmarks: a user "saving" any content item (video, sermon, bible
--   study, devotion, article...) for later — a simple boolean-ish
--   relationship, one row per user+item.
-- - watch_history: per-user, per-item playback position — powers
--   "Continue Watching" and "% watched" on the Media Library / Bible
--   Study pages. Distinct from bookmarks: you can bookmark something you
--   haven't started, and watch something you never bookmarked.
-- =========================================================

CREATE TABLE IF NOT EXISTS bookmarks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  content_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmarks_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_bookmark_user_content (user_id, content_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS watch_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  content_id INT UNSIGNED NOT NULL,
  progress_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  duration_seconds INT UNSIGNED DEFAULT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_watch_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_watch_history_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_watch_history_user_content (user_id, content_id),
  INDEX idx_watch_history_user_recent (user_id, last_watched_at)
) ENGINE=InnoDB;

-- ---- from database/migrations/007_section_media_language.sql ----
-- =========================================================
-- Migration 007: separate Section / Media Type / Language from content_type
--
-- Until now `content_type` conflated three different questions at once:
-- WHERE an item belongs on the site (Section), WHAT KIND of media it is
-- (Media Type), and which of a fixed 6-value list the admin had to pick
-- from. This migration adds two explicit columns:
--
--   section     - website destination: media_library, news, gallery,
--                 bible_study, devotions
--   media_type  - what kind of media it is (video, article, sermon,
--                 photo_gallery, ...); the allowed vocabulary depends on
--                 `section` and is validated in ContentController, not
--                 as a DB enum, so new media types can be added later
--                 with no schema change
--
-- plus a `transcript` column (optional written notes for media-first
-- content, distinct from `body`), and a `languages` lookup table so
-- Language becomes a controlled, extensible dropdown (code + name)
-- instead of free text.
--
-- `content_type` itself is NOT removed or repurposed. Public routes
-- (routes/api.php's news/devotions/videos/articles/gallery aliases),
-- Content::all()'s `type` filter, and the bible_studies extension-table
-- sync all key off content_type today. ContentController now derives
-- content_type automatically from (section, media_type) on every
-- create/update, so those existing consumers keep working unchanged
-- while section/media_type become the source of truth going forward.
-- =========================================================

ALTER TABLE content
  ADD COLUMN section ENUM('media_library','news','gallery','bible_study','devotions') NOT NULL DEFAULT 'media_library' AFTER content_type,
  ADD COLUMN media_type VARCHAR(30) NOT NULL DEFAULT 'video' AFTER section,
  ADD COLUMN transcript LONGTEXT NULL AFTER body,
  ADD INDEX idx_content_section (section),
  ADD INDEX idx_content_section_media_type (section, media_type);

-- Backfill section from the existing content_type.
UPDATE content SET section = CASE content_type
  WHEN 'bible_study' THEN 'bible_study'
  WHEN 'news'         THEN 'news'
  WHEN 'gallery'       THEN 'gallery'
  WHEN 'devotion'      THEN 'devotions'
  ELSE 'media_library'
END;

-- Backfill media_type for everything except bible_study (its media_type
-- comes from the bible_studies extension row's `format`, handled next).
UPDATE content SET media_type = CASE content_type
  WHEN 'video'    THEN 'video'
  WHEN 'article'  THEN 'article'
  WHEN 'devotion' THEN 'devotional'
  WHEN 'news'     THEN 'news_article'
  WHEN 'gallery'  THEN 'photo_gallery'
  ELSE media_type
END
WHERE content_type <> 'bible_study';

UPDATE content c
JOIN bible_studies bs ON bs.content_id = c.id
SET c.media_type = bs.format
WHERE c.content_type = 'bible_study';

-- ---------------------------------------------------------
-- languages: code + display name, so Language is a controlled dropdown.
-- Adding a language later (e.g. Afrikaans) is a single INSERT here - no
-- ALTER TABLE, no frontend redeploy beyond re-fetching the list.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS languages (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO languages (code, name, sort_order) VALUES
  ('en', 'English', 1),
  ('ng', 'Oshiwambo', 2)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Normalize existing free-text language values down to a code before we
-- constrain the column with a foreign key.
UPDATE content SET language = 'en'
  WHERE language IS NULL OR language IN ('', 'English', 'english', 'EN', 'en');
UPDATE content SET language = 'ng'
  WHERE language IN ('Oshiwambo', 'oshiwambo', 'Ndonga', 'ndonga', 'NG', 'ng');
-- Anything else unrecognized also falls back to English rather than being
-- left orphaned once the FK constraint below is added.
UPDATE content SET language = 'en' WHERE language NOT IN (SELECT code FROM languages);

ALTER TABLE content
  MODIFY COLUMN language VARCHAR(10) NULL DEFAULT 'en',
  ADD CONSTRAINT fk_content_language FOREIGN KEY (language) REFERENCES languages(code) ON DELETE SET NULL;

-- ---- from database/migrations/008_comments_updated_at.sql ----
-- =========================================================
-- Migration 008: comments.updated_at
--
-- The comments table (schema.sql) already has id, content_id, parent_id,
-- user_id, body, status, and created_at, with correct foreign keys
-- (content_id -> content, parent_id -> comments, user_id -> users) and an
-- index on content_id — all already in place from earlier work, nothing
-- duplicated here. The one gap: no updated_at, even though a comment's
-- `status` does change after creation (moderation: approve/spam/pending -
-- CommentController::updateStatus()). Adding it so that kind of change is
-- timestamped like every other mutable row in this schema.
-- =========================================================

ALTER TABLE comments
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- ---- from database/migrations/009_newsletter_notifications.sql ----
-- =========================================================
-- Migration 009: free single-step newsletter subscriptions + publish
-- notifications
--
-- newsletter_subscribers (migration 003) already had everything needed:
-- id, email (unique), token, status, language, subscribed_at,
-- confirmed_at. That table isn't touched structurally here except for
-- one addition (unsubscribed_at, for admin visibility - see §12 of the
-- request this implements). What actually changes is behavior, in code:
-- subscribing now sets status='subscribed' immediately instead of
-- 'pending' pending a confirmation-email click (which left a subscriber
-- stuck forever if SMTP wasn't configured - a real bug, not a design
-- choice). The same `token` column is reused for its new job: an
-- unsubscribe link instead of a confirm link.
--
-- content.newsletter_notified_at is new: it's how ContentController
-- avoids emailing subscribers again every time an admin edits an
-- already-published devotion/Bible study/news item - a notification
-- fires once, the first time an item becomes published, and this column
-- remembers that it already happened.
-- =========================================================

ALTER TABLE newsletter_subscribers
  ADD COLUMN unsubscribed_at DATETIME NULL AFTER confirmed_at;

ALTER TABLE content
  ADD COLUMN newsletter_notified_at DATETIME NULL AFTER allow_comments;

-- Backfill: every devotion/Bible study/news item that is ALREADY
-- published as of this migration must be marked as already-notified.
-- Without this, the very next time an admin edits any existing
-- published devotion/study/news item, ContentController would see
-- newsletter_notified_at IS NULL and (incorrectly) email every
-- subscriber about "new" content that isn't new at all.
UPDATE content
SET newsletter_notified_at = COALESCE(publish_date, created_at)
WHERE status = 'published'
  AND section IN ('devotions', 'bible_study', 'news')
  AND newsletter_notified_at IS NULL;

-- ---- from database/migrations/010_testimonials.sql ----
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

CREATE TABLE IF NOT EXISTS testimonials (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_testimonials_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_testimonials_status (status)
) ENGINE=InnoDB;

-- ---- from database/migrations/011_content_view_dedup.sql ----
-- =========================================================
-- Migration 011: Content View Deduplication
--
-- WHAT THIS DOES:
-- content.views used to be incremented on every single GET of an item's
-- detail page, so refreshing the page (or a bot re-fetching it) inflated
-- the count with no relation to real reach. This adds a log table
-- recording one row per (content item, visitor, day) — a "visitor" is
-- either a logged-in user_id or an anonymous long-lived cookie value
-- (see Backend/helpers/visitor.php) — so a repeat view from the same
-- visitor on the same day is a no-op, while a genuinely new visitor,
-- registered or not, still counts. content.views is now only
-- incremented when a new row is actually inserted here (see
-- Content::recordView()).
-- =========================================================

CREATE TABLE IF NOT EXISTS content_views (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id INT UNSIGNED NOT NULL,
  visitor_key VARCHAR(64) NOT NULL,
  user_id INT UNSIGNED DEFAULT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  viewed_date DATE GENERATED ALWAYS AS (DATE(viewed_at)) STORED,
  CONSTRAINT fk_content_views_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uniq_content_view_per_day (content_id, visitor_key, viewed_date)
) ENGINE=InnoDB;

-- ---- from database/migrations/012_bible_study_podcast_format.sql ----
-- =========================================================
-- Migration 012: Add "podcast" as a Bible Study format
--
-- WHAT THIS DOES
-- bible_studies.format is a strict ENUM (migration 004) that
-- ContentController::SECTION_MEDIA_TYPES['bible_study'] mirrors exactly -
-- an admin can now also upload a podcast episode under the Bible Study
-- section (previously only Media Library's podcast type existed), so the
-- ENUM needs "podcast" added or every such save would fail with a
-- truncation error.
-- =========================================================

ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM('short_film','video','sermon','panel','audio','animated','documentary','pdf_notes','podcast') NOT NULL DEFAULT 'video';

-- ---- from database/migrations/013_bible_study_interview_format.sql ----
-- =========================================================
-- Migration 013: Add "interview" as a Bible Study format
--
-- WHAT THIS DOES
-- bible_studies.format is a strict ENUM (migration 004, extended by
-- migration 012 for 'podcast') that ContentController::SECTION_MEDIA_TYPES
-- ['bible_study'] mirrors exactly. Interviews should be publishable under
-- both Content/Media Library and Bible Study, so the ENUM needs "interview"
-- added or every such save under Bible Study would fail with a truncation
-- error.
-- =========================================================

ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM('short_film','video','sermon','panel','audio','animated','documentary','pdf_notes','podcast','interview') NOT NULL DEFAULT 'video';

-- ---- from database/migrations/014_kids_live_notifications.sql ----
-- =========================================================
-- Migration 014: Kids section, Live content flag, notification links
--
-- WHAT THIS DOES
-- Kids becomes a first-class `section` value alongside media_library/
-- news/gallery/bible_study/devotions - it reuses the exact same `content`
-- table (title/slug/thumbnail/media_url/category/language/status all
-- keep working unchanged). is_live marks a content row (Content/Media
-- Library OR Bible Study) as a live stream - the stream URL itself
-- reuses the existing media_url column. notifications.link_url lets an
-- in-app notification deep-link straight to the content it's about.
-- =========================================================

ALTER TABLE content
  MODIFY COLUMN section ENUM('media_library','news','gallery','bible_study','devotions','kids') NOT NULL DEFAULT 'media_library',
  ADD COLUMN is_live TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured;

ALTER TABLE notifications
  ADD COLUMN link_url VARCHAR(255) NULL AFTER type;

-- ---- from database/migrations/015_shop_foundation.sql ----
-- =========================================================
-- Migration 015: Shop foundation — subcategories, flexible product
-- attributes, variants, multiple images, stock movements, delivery areas
--
-- WHAT THIS DOES
-- Extends the existing products table (sourcing_type, brand, barcode,
-- scheduled sale window, flexible attributes JSON, reserved_quantity)
-- rather than replacing it, adds categories.parent_id for subcategories,
-- and adds product_images / product_variants / stock_movements /
-- delivery_areas as new tables. See migration 015's own header comment
-- for full rationale.
-- =========================================================

ALTER TABLE categories
  ADD COLUMN parent_id INT UNSIGNED DEFAULT NULL AFTER type,
  ADD CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  ADD INDEX idx_categories_parent (parent_id);

ALTER TABLE products
  ADD COLUMN brand VARCHAR(150) DEFAULT NULL AFTER category_id,
  ADD COLUMN sourcing_type ENUM('in_stock','on_order') NOT NULL DEFAULT 'in_stock' AFTER product_type,
  ADD COLUMN barcode VARCHAR(64) DEFAULT NULL AFTER sku,
  ADD COLUMN is_new TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured,
  ADD COLUMN sale_starts_at DATETIME DEFAULT NULL AFTER sale_price,
  ADD COLUMN sale_ends_at DATETIME DEFAULT NULL AFTER sale_starts_at,
  ADD COLUMN seo_keywords VARCHAR(255) DEFAULT NULL AFTER description,
  ADD COLUMN weight_kg DECIMAL(8,3) DEFAULT NULL AFTER stock_quantity,
  ADD COLUMN reserved_quantity INT UNSIGNED NOT NULL DEFAULT 0 AFTER stock_quantity,
  ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'NAD' AFTER price,
  ADD COLUMN attributes JSON DEFAULT NULL AFTER gallery_images,
  ADD INDEX idx_products_sourcing_type (sourcing_type),
  ADD INDEX idx_products_is_new (is_new);

CREATE TABLE IF NOT EXISTS product_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  url VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255) DEFAULT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_images_product (product_id, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_variants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  sku VARCHAR(100) DEFAULT NULL,
  barcode VARCHAR(64) DEFAULT NULL,
  attributes JSON NOT NULL,
  price_override DECIMAL(10,2) DEFAULT NULL,
  stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  reserved_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  image_id INT UNSIGNED DEFAULT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_variants_image FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE SET NULL,
  INDEX idx_product_variants_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED DEFAULT NULL,
  quantity_change INT NOT NULL,
  reason ENUM(
    'restock', 'sale', 'pay_later_reserve', 'pay_later_release',
    'adjustment', 'return', 'on_order_receive'
  ) NOT NULL,
  reference_type VARCHAR(30) DEFAULT NULL,
  reference_id INT UNSIGNED DEFAULT NULL,
  note VARCHAR(255) DEFAULT NULL,
  created_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_movements_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  CONSTRAINT fk_stock_movements_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_stock_movements_product (product_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS delivery_areas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_pickup TINYINT(1) NOT NULL DEFAULT 0,
  instructions TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO permissions (slug, name, description) VALUES
  ('shop.settings_manage', 'Manage shop settings', 'Manage delivery areas/fees, payment instructions, and other Shop-wide configuration.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.slug = 'shop.settings_manage'
WHERE r.slug = 'admin';

INSERT INTO categories (name, slug, type) VALUES
  ('Clothing', 'clothing', 'product'),
  ('Accessories', 'accessories', 'product'),
  ('Home & Lifestyle', 'home_lifestyle', 'product'),
  ('Food', 'food', 'product'),
  ('Natural & Wellness', 'natural_wellness', 'product'),
  ('Books', 'books', 'product')
ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type);

-- ---- from database/migrations/016_shop_orders_payments.sql ----
-- =========================================================
-- Migration 016: Order splitting, Pay Later, on-order deposits, payments
--
-- HOW TO RUN: after migration 015. Safe to run once; re-running errors on
-- the ADD COLUMN/CREATE TABLE statements (expected — means it already ran).
--
-- WHAT THIS DOES (Stage 4-5 of the Shop rebuild)
--
-- orders.status used to conflate payment and fulfillment ("paid" sat in
-- the same enum as "shipped"). The spec requires these tracked
-- separately, so:
--   - orders.status becomes a PURE FULFILLMENT state (awaiting_approval,
--     awaiting_payment, processing, supplier_ordered, arrived,
--     ready_for_pickup, shipped, delivered, cancelled).
--   - orders.payment_state is NEW and pure payment state (pending,
--     awaiting_verification, partially_paid, paid, failed, expired,
--     cancelled, refunded, partially_refunded).
-- Every existing order row is migrated (not reset) — see the UPDATE
-- statements below, run BEFORE the enum is narrowed, so no row is ever
-- left holding a value the new enum doesn't have.
--
-- Other order columns: order_kind distinguishes the three workflows this
-- schema now supports (standard/pay_later/on_order) that all still share
-- one orders/order_items pair rather than three parallel tables.
-- split_group_id links the sibling orders produced when a mixed cart
-- (in-stock + on-order items) is split at checkout. fulfillment_type +
-- delivery_area_id + delivery_area_name_snapshot capture the customer's
-- delivery/pickup choice — the fee itself is already snapshotted in the
-- existing shipping_total column, so a later delivery_areas.fee edit
-- never changes an existing order's total. amount_paid is the running
-- total of *verified* payments (supports partial/deposit payments).
--
-- pay_later_details is a 1:1 extension table (same pattern as
-- bible_studies extending content) — keeps the one-active-Pay-Later-
-- order-per-customer rule enforceable with a simple query and keeps the
-- base orders table from growing a dozen mostly-null columns.
--
-- order_items gains variant_id (a real gap: variants didn't exist when
-- order_items was first designed, so a variant purchase had nowhere to
-- record which variant), snapshots of what was actually bought (name,
-- variant attributes) so a later product edit/rename never rewrites
-- history, and per-item procurement tracking for on-order products
-- (spec: "clear item-level deposit calculations and procurement
-- tracking" for orders with multiple on-order products).
--
-- payment_records is the audited payment ledger — every manual proof
-- submission, verification/rejection, and (Stage 5) gateway callback
-- goes through one table, supporting partial payments and preventing
-- duplicate processing via idempotency_key.
--
-- refunds is a separate, explicitly audited workflow (spec: "Do not mark
-- a refund completed merely because an admin changes an order status").
-- =========================================================

-- ---- orders.status: migrate existing data BEFORE narrowing the enum ----
-- (payment_state defaults to 'pending' below; these UPDATEs set the real
-- value for every existing row based on its old conflated status.)
ALTER TABLE orders
  ADD COLUMN payment_state ENUM(
    'pending', 'awaiting_verification', 'partially_paid', 'paid', 'failed',
    'expired', 'cancelled', 'refunded', 'partially_refunded'
  ) NOT NULL DEFAULT 'pending' AFTER status;

UPDATE orders SET payment_state = 'pending'   WHERE status = 'pending';
UPDATE orders SET payment_state = 'paid'      WHERE status IN ('paid', 'processing', 'shipped', 'completed');
UPDATE orders SET payment_state = 'cancelled' WHERE status = 'cancelled';
UPDATE orders SET payment_state = 'refunded'  WHERE status = 'refunded';

ALTER TABLE orders
  ADD COLUMN amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER grand_total;
UPDATE orders SET amount_paid = grand_total WHERE payment_state = 'paid';

-- Now narrow status to pure fulfillment values, remapping each old value.
UPDATE orders SET status = 'awaiting_payment' WHERE status = 'pending';
UPDATE orders SET status = 'processing'       WHERE status = 'paid';
UPDATE orders SET status = 'delivered'        WHERE status = 'completed';
UPDATE orders SET status = 'cancelled'        WHERE status = 'refunded';
-- 'processing', 'shipped', 'cancelled' already match the new enum's spelling.

ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'awaiting_approval', 'awaiting_payment', 'processing', 'supplier_ordered',
    'arrived', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled'
  ) NOT NULL DEFAULT 'awaiting_payment';

ALTER TABLE orders
  ADD COLUMN order_kind ENUM('standard', 'pay_later', 'on_order') NOT NULL DEFAULT 'standard' AFTER order_number,
  ADD COLUMN split_group_id CHAR(20) DEFAULT NULL AFTER order_kind,
  ADD COLUMN fulfillment_type ENUM('delivery', 'pickup') NOT NULL DEFAULT 'delivery' AFTER shipping_address,
  ADD COLUMN delivery_area_id INT UNSIGNED DEFAULT NULL AFTER fulfillment_type,
  ADD COLUMN delivery_area_name_snapshot VARCHAR(150) DEFAULT NULL AFTER delivery_area_id,
  ADD COLUMN deposit_percent TINYINT UNSIGNED DEFAULT NULL AFTER amount_paid,
  ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT NULL AFTER deposit_percent,
  ADD COLUMN deposit_deadline_at DATETIME DEFAULT NULL AFTER deposit_amount,
  ADD COLUMN deposit_paid_at DATETIME DEFAULT NULL AFTER deposit_deadline_at,
  ADD COLUMN deposit_reminder_sent_at DATETIME DEFAULT NULL AFTER deposit_paid_at,
  ADD COLUMN cancelled_at DATETIME DEFAULT NULL AFTER updated_at,
  ADD COLUMN cancellation_reason VARCHAR(255) DEFAULT NULL AFTER cancelled_at,
  ADD CONSTRAINT fk_orders_delivery_area FOREIGN KEY (delivery_area_id) REFERENCES delivery_areas(id) ON DELETE SET NULL,
  ADD INDEX idx_orders_split_group (split_group_id),
  ADD INDEX idx_orders_order_kind (order_kind),
  ADD INDEX idx_orders_payment_state (payment_state);

CREATE TABLE IF NOT EXISTS pay_later_details (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  requested_days TINYINT UNSIGNED NOT NULL,
  due_at DATETIME NOT NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME DEFAULT NULL,
  approved_by INT UNSIGNED DEFAULT NULL,
  declined_at DATETIME DEFAULT NULL,
  declined_by INT UNSIGNED DEFAULT NULL,
  decline_reason VARCHAR(255) DEFAULT NULL,
  reminder_sent_at DATETIME DEFAULT NULL,
  expired_at DATETIME DEFAULT NULL,
  cancelled_at DATETIME DEFAULT NULL,
  cancellation_reason VARCHAR(255) DEFAULT NULL,
  CONSTRAINT fk_pay_later_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_later_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pay_later_declined_by FOREIGN KEY (declined_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uniq_pay_later_order (order_id)
) ENGINE=InnoDB;

ALTER TABLE order_items
  ADD COLUMN variant_id INT UNSIGNED DEFAULT NULL AFTER product_id,
  ADD COLUMN product_name_snapshot VARCHAR(255) DEFAULT NULL AFTER variant_id,
  ADD COLUMN variant_attributes_snapshot JSON DEFAULT NULL AFTER product_name_snapshot,
  ADD COLUMN sourcing_type_snapshot ENUM('in_stock', 'on_order') DEFAULT NULL AFTER unit_price,
  ADD COLUMN procurement_status ENUM('pending', 'ordered_from_supplier', 'arrived', 'unavailable') DEFAULT NULL AFTER sourcing_type_snapshot,
  ADD COLUMN expected_arrival_date DATE DEFAULT NULL AFTER procurement_status,
  ADD COLUMN supplier_notes TEXT AFTER expected_arrival_date,
  ADD CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS payment_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  method ENUM('manual_bank', 'manual_mobile_wallet', 'gateway_dpo', 'gateway_paytoday', 'other') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NAD',
  reference VARCHAR(150) DEFAULT NULL,
  -- Server-side storage path (under Backend/storage/, never web-accessible
  -- directly) — served only through an auth-checked download endpoint.
  proof_file_path VARCHAR(255) DEFAULT NULL,
  status ENUM('awaiting_verification', 'verified', 'rejected') NOT NULL DEFAULT 'awaiting_verification',
  submitted_by INT UNSIGNED DEFAULT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_by INT UNSIGNED DEFAULT NULL,
  verified_at DATETIME DEFAULT NULL,
  rejection_reason VARCHAR(255) DEFAULT NULL,
  gateway_payload JSON DEFAULT NULL,
  -- Prevents double-processing the same gateway callback/webhook (Stage 5).
  idempotency_key VARCHAR(191) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_records_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_records_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_payment_records_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uniq_payment_idempotency (idempotency_key),
  INDEX idx_payment_records_order (order_id),
  INDEX idx_payment_records_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refunds (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255) DEFAULT NULL,
  status ENUM('requested', 'approved', 'rejected', 'processed') NOT NULL DEFAULT 'requested',
  requested_by INT UNSIGNED DEFAULT NULL,
  processed_by INT UNSIGNED DEFAULT NULL,
  processed_at DATETIME DEFAULT NULL,
  method VARCHAR(50) DEFAULT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_refunds_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_refunds_requested_by FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_refunds_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_refunds_order (order_id)
) ENGINE=InnoDB;

-- Auditable record of every automated sweep run (Pay Later reminders/
-- expiry, deposit-deadline reminders) — there's no server cron on the
-- shared host this project deploys to, so a scheduled GitHub Actions
-- workflow calls a protected endpoint instead; this table is that
-- endpoint's audit trail; see Backend/controllers/CronController.php.
CREATE TABLE IF NOT EXISTS scheduled_task_runs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task VARCHAR(60) NOT NULL,
  items_processed INT UNSIGNED NOT NULL DEFAULT 0,
  details JSON DEFAULT NULL,
  ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Migration 017: Verified-purchaser product reviews
-- ============================================================
-- =========================================================
-- Migration 017: Verified-purchaser product reviews
--
-- HOW TO RUN: after migration 016. Safe to run once; re-running errors on
-- the ADD COLUMN statements (expected — means it already ran).
--
-- product_reviews already existed in schema.sql (rating/review/status
-- moderation queue, same shape as `comments`) but had no way to enforce
-- "only verified purchasers may review" or prevent duplicate reviews.
-- order_item_id links a review to the specific purchased line item that
-- makes the reviewer eligible: a "verified purchaser" is defined here as
-- someone whose order_item belongs to an order they own where
-- orders.payment_state = 'paid' (checked in application code, not a FK
-- constraint, since payment_state changes over time and a review earned
-- at time of purchase should not vanish if a later partial refund drops
-- the state to partially_refunded).
--
-- UNIQUE(product_id, user_id) prevents a customer leaving multiple
-- reviews for the same product even across separate qualifying orders.
-- admin_response/admin_response_at let a Shop admin publicly reply to a
-- review (spec: "rating, text, date, moderation, and admin response").
-- =========================================================

ALTER TABLE product_reviews
  ADD COLUMN order_item_id INT UNSIGNED DEFAULT NULL AFTER user_id,
  ADD COLUMN admin_response TEXT DEFAULT NULL AFTER review,
  ADD COLUMN admin_response_at DATETIME DEFAULT NULL AFTER admin_response,
  ADD COLUMN admin_response_by INT UNSIGNED DEFAULT NULL AFTER admin_response_at,
  ADD CONSTRAINT fk_review_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_review_admin_response_by FOREIGN KEY (admin_response_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD UNIQUE KEY uniq_review_product_user (product_id, user_id),
  ADD INDEX idx_review_status (status);

-- ============================================================
-- Migration 018: navbar/reforms/songs/series-bible-study/note titles
-- ============================================================
-- =========================================================
-- Migration 018: Navbar/Explore rebuild, Reforms categories, Songs
-- destination, Bible-Study-discoverable series, titled notes
--
-- HOW TO RUN: after migration 017. Safe to run once; re-running errors on
-- the ADD COLUMN statements (expected — means it already ran). The two
-- MODIFY COLUMN statements (widening existing ENUMs) and the INSERT
-- IGNORE are themselves safely re-runnable.
--
-- Every change here is additive: new ENUM values (existing rows keep
-- their existing value unchanged), new nullable/defaulted columns, and
-- new category rows inserted with INSERT IGNORE (keyed on the existing
-- UNIQUE slug, so re-running is a no-op, not a duplicate-row error).
-- Nothing is dropped, narrowed, or reset.
-- =========================================================

USE aimsisters_db;

-- ---- 1. Songs becomes its own top-level destination, alongside the
-- existing media_library/news/gallery/bible_study/devotions/kids
-- sections (same pattern as Kids did in migration 014). Deliberately
-- separate from Kids' existing embedded `media_type = 'song'` items —
-- those are children's songs inside Kids Zone; this is a general
-- worship-music destination for everyone else. ----
ALTER TABLE content
  MODIFY COLUMN section ENUM('media_library','news','gallery','bible_study','devotions','kids','songs') NOT NULL DEFAULT 'media_library';

-- ---- 2. Bible Studies gains "article" as a supported format — the
-- spec explicitly lists "Articles, where supported" for Bible Studies,
-- but the format ENUM never had it (only media_library/news/devotions
-- could be articles). Same widen-in-place pattern already used by
-- migrations 012 and 013 for this exact column. ----
ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM('short_film','video','sermon','panel','audio','animated','documentary','pdf_notes','podcast','interview','article') NOT NULL DEFAULT 'video';

-- ---- 3. Exactly three Reforms categories. These are ordinary rows in
-- the existing shared `categories` table (type='content') — Reforms are
-- categories, not a new destination/table. No existing category is
-- renamed or removed; nothing pre-existing needs remapping since no
-- "Reform"-like category has ever existed in this database (verified
-- against the full migration history before writing this). ----
INSERT IGNORE INTO categories (name, slug, type) VALUES
  ('Health Reform', 'health-reform', 'content'),
  ('Spiritual Reform', 'spiritual-reform', 'content'),
  ('Dress Reform', 'dress-reform', 'content');

-- ---- 4. A series can now be flagged as belonging to Bible Studies, so
-- it's discoverable both on the main Series page (unchanged) and inside
-- the Bible Studies page. Mirrors `content.section`'s naming so the
-- concept is familiar; defaults every existing series to its current
-- de-facto behavior (general/media_library) so nothing already published
-- changes destination on its own. ----
ALTER TABLE series
  ADD COLUMN section ENUM('media_library','bible_study') NOT NULL DEFAULT 'media_library' AFTER category_id,
  ADD INDEX idx_series_section (section);

-- ---- 5. Notes gain an optional title, for the new notebook-style
-- detail/print view. Existing notes are untouched (title starts NULL —
-- the UI falls back to "Untitled Note" for those, never invents one). ----
ALTER TABLE bible_study_notes
  ADD COLUMN title VARCHAR(200) DEFAULT NULL AFTER content_id;

-- =========================================================
-- Migration 019: Reforms-only content categories
--
-- Per explicit request: the entire system should only offer these three
-- content categories going forward - Health Reform, Spiritual Reform,
-- Dress Reform (all three already exist as of migration 018). Every
-- other type='content' category row is removed. type='product'
-- categories (Shop) are untouched. No content is deleted -
-- content.category_id has ON DELETE SET NULL (schema.sql), so a content
-- item tagged with a removed category simply loses that label.
-- =========================================================

DELETE FROM categories
WHERE type = 'content'
  AND slug NOT IN ('health-reform', 'spiritual-reform', 'dress-reform');

-- =========================================================
-- Migration 020: Add Prophecy back as a fourth content category
--
-- Migration 019 narrowed the system to exactly the three Reforms
-- categories; this re-adds Prophecy as a fourth, per explicit request
-- (used by the homepage's four category cards).
-- =========================================================

INSERT IGNORE INTO categories (name, slug, type) VALUES
  ('Prophecy', 'prophecy', 'content');

-- =========================================================
-- Migration 021: Real video duration on content
--
-- Adds duration_seconds to content - captured client-side from the
-- actual video file at upload time (see UploadContent.jsx), never
-- estimated/faked. Existing rows stay NULL until re-uploaded.
-- =========================================================

ALTER TABLE content
  ADD COLUMN duration_seconds INT UNSIGNED DEFAULT NULL AFTER views;

-- =========================================================
-- Migration 022: Simplify Bible Study formats to Video/PDF/Article/Poster
--
-- Bible Study content types are simplified from 11 finer-grained formats
-- down to exactly 4 - Video, PDF, Article, Poster. No content is deleted.
-- Every existing row keeps its file/body/thumbnail exactly as uploaded;
-- only the `format`/`media_type` classification label is remapped:
--   short_film, sermon, panel, animated, documentary, interview, podcast,
--     audio  ->  video   (the actual file's real extension still drives
--                          which player/badge is shown on the public
--                          site - see mediaKind.js's getItemKind())
--   pdf_notes  ->  pdf       (same upload-or-type-text behavior, renamed)
--   article    ->  article   (unchanged)
--   (new)      ->  image     (labeled "Poster" in the UI)
-- =========================================================

ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM(
    'short_film','video','sermon','panel','audio','animated','documentary',
    'pdf_notes','podcast','interview','article','pdf','image'
  ) NOT NULL DEFAULT 'video';

UPDATE bible_studies
  SET format = 'video'
  WHERE format IN ('short_film','sermon','panel','animated','documentary','interview','podcast','audio');

UPDATE bible_studies
  SET format = 'pdf'
  WHERE format = 'pdf_notes';

UPDATE content c
JOIN bible_studies bs ON bs.content_id = c.id
SET c.media_type = bs.format
WHERE c.content_type = 'bible_study';

ALTER TABLE bible_studies
  MODIFY COLUMN format ENUM('video','pdf','article','image') NOT NULL DEFAULT 'video';

-- =========================================================
-- Migration 023: Testimonial rejection reason + archive status
--
-- Rejecting a testimony now requires a stored reason (rejection_reason,
-- a new nullable TEXT column - NULL for existing rejected rows, nothing
-- backfilled). An approved testimony can now be Archived instead of
-- only Approved/Rejected/Deleted - a status, not a delete, so it stays
-- recoverable and simply drops out of the public homepage feed.
-- =========================================================

ALTER TABLE testimonials
  ADD COLUMN rejection_reason TEXT NULL AFTER body,
  MODIFY COLUMN status ENUM('pending','approved','rejected','archived') NOT NULL DEFAULT 'pending';

-- =========================================================
-- Migration 024: Separate admin notifications, add Contact messages
--
-- notifications.audience decides which bell a row shows in (public
-- site's bell vs a new admin-only bell); notifications.source is the
-- human-facing category label ('store', 'contact', 'subscriptions',
-- 'testimonies', 'content', ...). contact_messages is new - the site's
-- Contact page never actually submitted anywhere before this migration's
-- matching code change.
-- =========================================================

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
