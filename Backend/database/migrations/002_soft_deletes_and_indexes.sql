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

USE aimsisters_db;

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
