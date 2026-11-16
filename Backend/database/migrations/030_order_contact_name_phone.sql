-- =========================================================
-- Migration 030: Structured order contact name/phone
--
-- HOW TO RUN: after migration 029. Safe to run once; re-running errors
-- on the ADD COLUMN statements (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- Per explicit request: name and phone number become two separate
-- checkout inputs (name optional, phone required) instead of one
-- free-text "contact" blob — so the delivery person has a real,
-- structured phone number to call, not something to hunt for inside a
-- paragraph of typed text.
--
-- orders.contact_name / contact_phone: nullable at the schema level
-- (every pre-migration order has neither, and nothing is backfilled or
-- guessed for them), even though the checkout form itself requires a
-- phone number going forward — that requirement lives in application
-- code (OrderController::store()), not the column definition, the same
-- pattern already used for every other checkout-required field here.
--
-- orders.shipping_address is kept, unchanged in shape, and still the
-- one field every existing admin screen/printed document already reads
-- (ManageOrders.jsx, OrderDocument.jsx) — OrderController::store() now
-- composes it server-side from contact_name + contact_phone rather than
-- accepting free text from the client, so every existing display site
-- keeps working with no further changes there.
-- =========================================================

ALTER TABLE orders
  ADD COLUMN contact_name VARCHAR(150) NULL AFTER shipping_address,
  ADD COLUMN contact_phone VARCHAR(30) NULL AFTER contact_name;
