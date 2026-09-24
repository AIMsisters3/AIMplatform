-- =========================================================
-- Migration 027: Delivery location coordinates on orders
--
-- HOW TO RUN: after migration 026. Safe to run once; re-running errors
-- on the ADD COLUMN statements (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- Per explicit request: the customer should not have to hand-type a
-- street address for delivery — they pin their real location on a map
-- at checkout instead, and the ministry's delivery person gets a
-- ready-to-follow map link, not a written description to interpret.
--
-- orders.delivery_latitude / delivery_longitude: the exact point the
-- customer pinned (or their device's real GPS location, if they chose
-- "Use my current location"). Nullable — a pickup order never has one
-- (there's nowhere to deliver to), and any order placed before this
-- migration simply has none; nothing is guessed or backfilled. Only
-- ever set for fulfillment_type = 'delivery'; checkout still also
-- collects a free-text shipping_address for the customer's name and
-- phone number, which a coordinate pair alone can't provide.
-- =========================================================

ALTER TABLE orders
  ADD COLUMN delivery_latitude DECIMAL(10,7) NULL AFTER shipping_address,
  ADD COLUMN delivery_longitude DECIMAL(10,7) NULL AFTER delivery_latitude;
