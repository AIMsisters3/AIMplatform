-- =========================================================
-- Migration 047: defer delivery/pickup choice to post-"arrived" time
--
-- HOW TO RUN: after migration 046. Safe to run once; re-running errors
-- on the MODIFY/ADD COLUMN statements (expected - means it ran).
--
-- WHY: the customer-facing bug report is explicit - "Dont ask for
-- delivery/ pickup lacation at placing order please.... do that after
-- the admin sends the notificatuion that the order is ready", i.e. once
-- the order's status becomes 'arrived' (spec Part G). Checkout now only
-- collects contact name/phone and payment; fulfillment_type/area/
-- coordinates are no longer known at order-creation time, so they must
-- become optional, and a manual free-text address fallback is needed
-- for when the map pin doesn't work for the customer.
-- =========================================================

ALTER TABLE orders
  MODIFY COLUMN fulfillment_type ENUM('delivery', 'pickup') NULL DEFAULT NULL;

ALTER TABLE orders
  ADD COLUMN delivery_manual_address VARCHAR(255) NULL AFTER delivery_longitude,
  ADD COLUMN fulfillment_chosen_at DATETIME NULL AFTER delivery_manual_address;
