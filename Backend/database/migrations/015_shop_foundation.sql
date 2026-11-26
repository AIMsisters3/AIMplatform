-- =========================================================
-- Migration 015: Shop foundation — subcategories, flexible product
-- attributes, variants, multiple images, stock movements, delivery areas
--
-- HOW TO RUN: after migration 014. Safe to run once; re-running errors on
-- the ADD COLUMN/CREATE TABLE statements (expected — means it already ran).
--
-- WHAT THIS DOES (Stage 2 of the Shop rebuild)
-- The existing `products` table (schema.sql) was a flat, single-image,
-- no-variant bookstore listing. This migration extends it rather than
-- replacing it — every existing product row, and every existing order's
-- line items (which reference product_id), keep working unchanged.
--
-- - categories.parent_id: subcategories, reusing the SAME shared
--   categories table already used by both content and products (its
--   `type` column already distinguishes the two domains) rather than a
--   parallel category system. A subcategory just sets parent_id and
--   inherits its type from context — not DB-enforced, validated in
--   CategoryController.
-- - products gains: brand, sourcing_type (in_stock vs on_order — the
--   spec's core availability distinction), barcode (ISBN/UPC/EAN),
--   is_new, scheduled sale window, seo_keywords, weight_kg, a flexible
--   `attributes` JSON column (category-specific fields — ingredients,
--   allergens, author, ISBN-as-text, pages, format, fit, material, usage
--   instructions, warnings, storage instructions, expiry/batch — rather
--   than dozens of nullable columns most products would never use), and
--   reserved_quantity (stock held for an approved-but-unpaid Pay Later
--   order, tracked separately from stock_quantity so "available to buy
--   right now" = stock_quantity - reserved_quantity without mutating the
--   real on-hand count).
-- - product_images: ordered, multi-image gallery with alt text.
--   products.thumbnail/gallery_images (existing columns) are left in
--   place for backward compatibility with the current storefront cards;
--   product_images becomes the source of truth for the product detail
--   page's gallery going forward.
-- - product_variants: size/color/flavor/etc. combinations, each with its
--   own optional price override, stock, and reservation count. A
--   product with no variant rows is sold as its own single sellable
--   unit (existing behavior, unchanged).
-- - stock_movements: append-only audit trail for every stock change
--   (restock, sale, Pay Later reserve/release, manual adjustment,
--   return, on-order receipt) — spec requires inventory changes to be
--   auditable.
-- - delivery_areas: admin-configurable town/area -> fee (+ pickup
--   locations), replacing Order.php's hardcoded flat shipping rate.
--   Starts empty; nothing is invented here for the admin to fill in.
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
  -- e.g. {"size":"M","color":"Red"} — the set of attribute names is
  -- whatever the admin chooses per product (size/color/flavor/weight/...),
  -- not a fixed DB-level list.
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
  -- Signed: positive = stock added, negative = stock removed. The
  -- running total is never stored here — stock_movements is a log, the
  -- current quantity always lives on products/product_variants.
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

-- New permission for the delivery-areas/settings screens introduced in
-- this stage — distinct from products.manage since a Shop admin who
-- manages catalog listings isn't automatically who should be changing
-- delivery fees or payment instructions.
INSERT INTO permissions (slug, name, description) VALUES
  ('shop.settings_manage', 'Manage shop settings', 'Manage delivery areas/fees, payment instructions, and other Shop-wide configuration.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- superadmin doesn't need an explicit row here — permissions.php's
-- user_has_permission() already treats role 'superadmin' as "everything"
-- unconditionally (see the early return in user_permissions()).
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.slug = 'shop.settings_manage'
WHERE r.slug = 'admin';

-- Seed the top-level Shop categories from the product catalog the user
-- described (Clothing, Accessories, Home & Lifestyle, Food, Natural &
-- Wellness, Books) — their slugs are exactly what
-- Product::CATEGORY_ATTRIBUTE_HINTS keys off to decide which
-- category-specific fields the admin product form shows. Safe to
-- re-run; existing rows with the same slug are left as the admin has
-- since edited them (ON DUPLICATE KEY UPDATE only touches name/type,
-- and only when the slug already matches exactly).
INSERT INTO categories (name, slug, type) VALUES
  ('Clothing', 'clothing', 'product'),
  ('Accessories', 'accessories', 'product'),
  ('Home & Lifestyle', 'home_lifestyle', 'product'),
  ('Food', 'food', 'product'),
  ('Natural & Wellness', 'natural_wellness', 'product'),
  ('Books', 'books', 'product')
ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type);
