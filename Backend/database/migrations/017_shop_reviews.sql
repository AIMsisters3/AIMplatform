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
