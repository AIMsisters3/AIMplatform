-- =========================================================
-- Migration 029: Delivery area geo-matching (center point + radius)
--
-- HOW TO RUN: after migration 028. Safe to run once; re-running errors
-- on the ADD COLUMN statements (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- Per explicit request: once a customer pins their delivery location on
-- the checkout map (migration 027), the system should auto-select the
-- matching delivery area/fee instead of making them separately pick one
-- from a dropdown. delivery_areas previously had no geography at all —
-- just a name and a flat fee — so there was nothing to match against.
--
-- center_latitude/center_longitude/radius_km: an admin-set point + radius
-- per delivery area (Manage Delivery Areas — set once via the same map
-- picker used at checkout). All three nullable: an area with none of
-- these configured simply can't be auto-matched and falls back to the
-- existing manual dropdown — never guessed. Pickup locations don't use
-- this at all (a pickup point isn't matched against the customer's own
-- location).
-- =========================================================

ALTER TABLE delivery_areas
  ADD COLUMN center_latitude DECIMAL(10,7) NULL AFTER fee,
  ADD COLUMN center_longitude DECIMAL(10,7) NULL AFTER center_latitude,
  ADD COLUMN radius_km DECIMAL(6,2) NULL AFTER center_longitude;
