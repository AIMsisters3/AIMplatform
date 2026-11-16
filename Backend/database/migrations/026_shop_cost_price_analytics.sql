-- =========================================================
-- Migration 026: Product cost price, view tracking, order-line cost
-- snapshot — the foundation for real Shop business analytics/tithe
--
-- HOW TO RUN: after migration 018. Safe to run once; re-running errors
-- on the ADD COLUMN statements (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- Nothing in the existing schema could answer "what did we actually
-- profit this month" or "which products get looked at" at all — this
-- adds exactly the three columns needed for that, nothing more:
--
--   products.cost_price: what the item actually cost the ministry
--   (admin-entered, NEVER exposed on any public endpoint/page — every
--   public-facing product read in ProductController strips it before
--   responding). Nullable: an existing product with no cost entered
--   yet simply can't contribute to profit/tithe until an admin sets
--   one — it does not report a fabricated cost.
--
--   products.views: the product-level analog of content.views
--   (schema.sql:66), which already exists for ministry content but was
--   never added for Shop products. Real counter, incremented once per
--   product-detail view (ProductController::show()) — never backfilled
--   or estimated for existing rows, so an old product simply starts at
--   its true value (0) and grows from here.
--
--   order_items.unit_cost_snapshot: the product's cost_price AT THE
--   MOMENT the order was placed, captured the same way
--   product_name_snapshot/variant_attributes_snapshot already protect
--   order history from a later product edit (migration 016's own
--   reasoning, reused here) — profit/tithe on a September order must
--   stay whatever it actually was in September even if the product's
--   cost_price changes in October. Without this snapshot, historical
--   reports would silently drift every time a cost price is corrected.
--   NULL for every line item that existed before this migration (their
--   real historical cost was never recorded and must not be guessed at)
--   and for any line whose product had no cost_price set at order time
--   — reporting queries must treat NULL as "unknown", never as zero.
-- =========================================================

ALTER TABLE products
  ADD COLUMN cost_price DECIMAL(10,2) NULL AFTER price,
  ADD COLUMN views INT UNSIGNED NOT NULL DEFAULT 0 AFTER stock_quantity;

ALTER TABLE order_items
  ADD COLUMN unit_cost_snapshot DECIMAL(10,2) NULL AFTER unit_price;
