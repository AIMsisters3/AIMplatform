-- =========================================================
-- Migration 046: Shop complete admin/customer experience - schema
--
-- HOW TO RUN: after migration 045. Safe to run once; re-running errors
-- on the ADD COLUMN/CREATE TABLE statements (expected - means it ran).
--
-- WHAT THIS DOES
--
-- 1) orders.status / payment_state gain the handful of genuinely
--    missing distinct states the new spec calls for: 'waiting_for_stock'
--    and 'terminated' (status), 'rejected' and 'refund_pending'
--    (payment_state) - 'completed' already existed as 'status'. Every
--    other spec status (new order, awaiting payment, order approved,
--    ready for pickup/delivery, delivery arranged) already maps onto an
--    existing value; only admin-facing labels need updating (Frontend).
--
-- 2) pay_later_details: a strict, admin-configurable Day1/3/6/7
--    reminder schedule needs its own per-threshold "already sent"
--    column - one shared reminder_sent_at (kept, unused going forward)
--    can't track four independent reminders.
--
-- 3) orders gain pickup_location/pickup_at (admin-set, customer-visible)
--    and delivery_distance_km/delivery_fee_breakdown (what a Mapbox
--    quote actually calculated, kept on the order as a snapshot so a
--    later pricing-rule change never silently changes a past order's
--    total).
--
-- 4) order_items gains unavailable-after-ordering resolution tracking
--    (Part D of the spec) - a product can go out of stock AFTER an
--    order is placed; the customer then picks wait/replace/refund.
--
-- 5) stock_requests - entirely new: a customer asking to be notified
--    when an out-of-stock variant is back (Part A §6).
-- =========================================================

ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'awaiting_approval', 'awaiting_payment', 'processing', 'supplier_ordered',
    'waiting_for_stock', 'arrived', 'ready_for_pickup', 'shipped', 'delivered',
    'completed', 'cancelled', 'terminated'
  ) NOT NULL DEFAULT 'awaiting_payment';

ALTER TABLE orders
  MODIFY COLUMN payment_state ENUM(
    'pending', 'awaiting_verification', 'partially_paid', 'paid', 'failed',
    'rejected', 'expired', 'cancelled', 'refund_pending', 'refunded', 'partially_refunded'
  ) NOT NULL DEFAULT 'pending';

ALTER TABLE orders
  ADD COLUMN pickup_location VARCHAR(255) NULL AFTER delivery_area_name_snapshot,
  ADD COLUMN pickup_at DATETIME NULL AFTER pickup_location,
  ADD COLUMN pickup_notified_at DATETIME NULL AFTER pickup_at,
  ADD COLUMN delivery_distance_km DECIMAL(6,2) NULL AFTER delivery_longitude,
  ADD COLUMN delivery_fee_quote_source VARCHAR(30) NULL AFTER delivery_distance_km;

ALTER TABLE pay_later_details
  ADD COLUMN reminder_day3_sent_at DATETIME DEFAULT NULL AFTER reminder_sent_at,
  ADD COLUMN reminder_day6_sent_at DATETIME DEFAULT NULL AFTER reminder_day3_sent_at,
  ADD COLUMN reminder_day7_sent_at DATETIME DEFAULT NULL AFTER reminder_day6_sent_at,
  ADD COLUMN terminated_at DATETIME DEFAULT NULL AFTER expired_at;

-- A product/variant that was in stock when ordered can go out of stock
-- before it ships. resolution_status starts 'none' (nothing wrong);
-- 'unavailable' once flagged, then exactly one of
-- wait/replace/refund once the customer (or admin on their behalf)
-- decides. replacement_product_id/replacement_variant_id are only
-- meaningful once resolution_choice = 'replace'.
ALTER TABLE order_items
  ADD COLUMN resolution_status ENUM('none','unavailable','resolved') NOT NULL DEFAULT 'none' AFTER procurement_status,
  ADD COLUMN resolution_choice ENUM('wait','replace','refund') NULL AFTER resolution_status,
  ADD COLUMN resolution_notes VARCHAR(255) NULL AFTER resolution_choice,
  ADD COLUMN replacement_product_id INT UNSIGNED NULL AFTER resolution_notes,
  ADD COLUMN replacement_variant_id INT UNSIGNED NULL AFTER replacement_product_id,
  ADD COLUMN flagged_unavailable_at DATETIME NULL AFTER replacement_variant_id,
  ADD COLUMN resolved_at DATETIME NULL AFTER flagged_unavailable_at,
  ADD CONSTRAINT fk_order_items_replacement_product FOREIGN KEY (replacement_product_id) REFERENCES products(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_order_items_replacement_variant FOREIGN KEY (replacement_variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS stock_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED NULL,
  requested_attributes JSON NULL,
  quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(30) NOT NULL,
  user_id INT UNSIGNED NULL,
  notes VARCHAR(500) NULL,
  status ENUM('new','waiting_for_stock','customer_notified','converted','closed') NOT NULL DEFAULT 'new',
  converted_order_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_requests_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_requests_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  CONSTRAINT fk_stock_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_stock_requests_order FOREIGN KEY (converted_order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_stock_requests_status (status)
) ENGINE=InnoDB;

-- Atomic per-day sequence counter for AIM-YYYYMMDD-NNN order numbers
-- (Order::generateOrderNumber()) - the classic MySQL
-- INSERT...ON DUPLICATE KEY UPDATE next_seq = LAST_INSERT_ID(next_seq+1)
-- trick gives a safe, race-free increment under concurrent checkouts
-- without needing its own transaction or row lock.
CREATE TABLE IF NOT EXISTS order_number_counters (
  date_key CHAR(8) NOT NULL PRIMARY KEY,
  next_seq INT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB;
