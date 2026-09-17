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
