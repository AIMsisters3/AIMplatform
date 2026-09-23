<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/media_url.php';

/**
 * Shop product model (migration 015 extends the original schema.sql
 * table — see that migration's header for the full rationale). A product
 * row is always the sellable "base" unit; if it has variant rows
 * (product_variants), each variant is a specific purchasable combination
 * (e.g. size + color) with its own optional price/stock. A product with
 * no variants is sold directly off its own price/stock_quantity.
 */
class Product
{
    private PDO $db;

    /** Attribute keys the admin form knows about per top-level product
     *  category — purely a UI/validation hint, not a DB constraint (the
     *  `attributes` column is a flexible JSON blob so a category that
     *  isn't listed here still just stores whatever's sent). Keeping this
     *  list in one place (mirrored in Frontend/src/Admin/Pages/ManageProducts.jsx)
     *  is what makes the form show only the fields relevant to what's
     *  being sold instead of one giant one-size-fits-all form. */
    public const CATEGORY_ATTRIBUTE_HINTS = [
        'clothing' => ['size', 'color', 'fit', 'material'],
        'books'    => ['author', 'isbn', 'format', 'pages'],
        'food'     => ['ingredients', 'allergens', 'weight_volume', 'best_before', 'storage_instructions', 'batch_number'],
        'natural_wellness' => ['ingredients', 'size', 'usage_instructions', 'warnings', 'expiry_date', 'batch_number'],
        'accessories' => ['color', 'material'],
        'home_lifestyle' => ['material', 'dimensions'],
    ];

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * @param array $filters category_id (includes subcategories when the
     *   given id has children), search, min_price, max_price,
     *   sourcing_type, is_featured, is_new, on_sale, sort (one of
     *   'newest'|'price_asc'|'price_desc'|'name'), status
     */
    public function all(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $where  = ['p.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['category_id'])) {
            // A category with children means "browse this whole group" —
            // include every descendant's products, not just items filed
            // directly under the parent. Only one level deep (subcategory,
            // not sub-sub-category) matches the spec's "category and
            // subcategory" scope.
            $catId = (int) $filters['category_id'];
            $where[] = '(p.category_id = :category_id OR p.category_id IN (SELECT id FROM categories WHERE parent_id = :category_id2))';
            $params['category_id'] = $catId;
            $params['category_id2'] = $catId;
        }
        if (!empty($filters['search'])) {
            $where[] = '(p.name LIKE :search OR p.description LIKE :search OR p.brand LIKE :search OR p.seo_keywords LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }
        if (!empty($filters['status'])) {
            $where[] = 'p.status = :status';
            $params['status'] = $filters['status'];
        } else {
            $where[] = "p.status = 'active'";
        }
        if (!empty($filters['min_price'])) {
            $where[] = 'COALESCE(p.sale_price, p.price) >= :min_price';
            $params['min_price'] = $filters['min_price'];
        }
        if (!empty($filters['max_price'])) {
            $where[] = 'COALESCE(p.sale_price, p.price) <= :max_price';
            $params['max_price'] = $filters['max_price'];
        }
        if (!empty($filters['sourcing_type'])) {
            $where[] = 'p.sourcing_type = :sourcing_type';
            $params['sourcing_type'] = $filters['sourcing_type'];
        }
        if (!empty($filters['is_featured'])) {
            $where[] = 'p.is_featured = 1';
        }
        if (!empty($filters['is_new'])) {
            $where[] = 'p.is_new = 1';
        }
        if (!empty($filters['on_sale'])) {
            $where[] = "p.sale_price IS NOT NULL AND p.sale_price < p.price
                AND (p.sale_starts_at IS NULL OR p.sale_starts_at <= NOW())
                AND (p.sale_ends_at IS NULL OR p.sale_ends_at >= NOW())";
        }

        $orderBy = match ($filters['sort'] ?? 'newest') {
            'price_asc'  => 'COALESCE(p.sale_price, p.price) ASC',
            'price_desc' => 'COALESCE(p.sale_price, p.price) DESC',
            'name'       => 'p.name ASC',
            default      => 'p.created_at DESC',
        };

        $sql = "SELECT p.*, cat.name AS category_name, cat.slug AS category_slug,
                    (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS image_count,
                    (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.status = 'active') AS variant_count
                FROM products p
                LEFT JOIN categories cat ON cat.id = p.category_id
                WHERE " . implode(' AND ', $where) . "
                ORDER BY $orderBy
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return array_map([$this, 'decorate'], $stmt->fetchAll());
    }

    public function count(array $filters = []): int
    {
        // Mirrors all()'s WHERE-building so pagination totals match the
        // listing exactly — kept small/duplicated rather than sharing a
        // query builder, since the two diverge only in SELECT/ORDER BY.
        $where  = ['p.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['category_id'])) {
            $catId = (int) $filters['category_id'];
            $where[] = '(p.category_id = :category_id OR p.category_id IN (SELECT id FROM categories WHERE parent_id = :category_id2))';
            $params['category_id'] = $catId;
            $params['category_id2'] = $catId;
        }
        if (!empty($filters['search'])) {
            $where[] = '(p.name LIKE :search OR p.description LIKE :search OR p.brand LIKE :search OR p.seo_keywords LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }
        if (!empty($filters['status'])) {
            $where[] = 'p.status = :status';
            $params['status'] = $filters['status'];
        } else {
            $where[] = "p.status = 'active'";
        }
        if (!empty($filters['sourcing_type'])) {
            $where[] = 'p.sourcing_type = :sourcing_type';
            $params['sourcing_type'] = $filters['sourcing_type'];
        }

        $stmt = $this->db->prepare('SELECT COUNT(*) FROM products p WHERE ' . implode(' AND ', $where));
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT p.*, cat.name AS category_name, cat.slug AS category_slug FROM products p LEFT JOIN categories cat ON cat.id = p.category_id WHERE p.id = :id AND p.deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        return $this->hydrate($row);
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT p.*, cat.name AS category_name, cat.slug AS category_slug FROM products p LEFT JOIN categories cat ON cat.id = p.category_id WHERE p.slug = :slug AND p.deleted_at IS NULL LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        return $this->hydrate($row);
    }

    /** Like find(), but also returns a soft-deleted/inactive row — for internal use only (e.g. rendering an old order's line items), never expose directly to a public endpoint. */
    public function findAny(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM products WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? $this->decorate($row) : null;
    }

    /** find() + its images and active variants, for the product detail page. */
    private function hydrate(array $row): array
    {
        $product = $this->decorate($row);
        $product['images'] = $this->imagesFor((int) $row['id']);
        $product['variants'] = $this->variantsFor((int) $row['id']);
        return $product;
    }

    public function imagesFor(int $productId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM product_images WHERE product_id = :id ORDER BY sort_order ASC, id ASC');
        $stmt->execute(['id' => $productId]);
        return array_map(function ($row) {
            $row['url'] = normalize_media_url($row['url']);
            return $row;
        }, $stmt->fetchAll());
    }

    public function variantsFor(int $productId): array
    {
        $stmt = $this->db->prepare("SELECT * FROM product_variants WHERE product_id = :id AND status = 'active' ORDER BY id ASC");
        $stmt->execute(['id' => $productId]);
        return array_map(function ($v) {
            $v['attributes'] = json_decode($v['attributes'] ?? '{}', true) ?: [];
            return $v;
        }, $stmt->fetchAll());
    }

    /** Adds computed fields the frontend needs (availability, effective price) without a schema change. */
    private function decorate(array $row): array
    {
        $row['attributes'] = json_decode($row['attributes'] ?? 'null', true) ?: null;
        $row['availability'] = self::availabilityFor($row);
        $row['effective_price'] = self::effectivePriceFor($row);
        $row['thumbnail'] = normalize_media_url($row['thumbnail'] ?? null);
        return $row;
    }

    /** IN_STOCK vs ON_ORDER vs OUT_OF_STOCK — the spec's core availability distinction, computed rather than duplicated across callers. */
    public static function availabilityFor(array $product): string
    {
        if (($product['status'] ?? 'active') !== 'active') {
            return 'out_of_stock';
        }
        if (($product['sourcing_type'] ?? 'in_stock') === 'on_order') {
            return 'on_order';
        }
        $available = (int) ($product['stock_quantity'] ?? 0) - (int) ($product['reserved_quantity'] ?? 0);
        return $available > 0 ? 'in_stock' : 'out_of_stock';
    }

    /** Sale price only applies within its scheduled window (both bounds optional/open-ended). */
    public static function effectivePriceFor(array $product): float
    {
        $price = (float) $product['price'];
        $sale = $product['sale_price'] ?? null;
        if ($sale === null || (float) $sale >= $price) {
            return $price;
        }
        $now = time();
        $starts = $product['sale_starts_at'] ?? null;
        $ends = $product['sale_ends_at'] ?? null;
        if ($starts && strtotime($starts) > $now) {
            return $price;
        }
        if ($ends && strtotime($ends) < $now) {
            return $price;
        }
        return (float) $sale;
    }

    public function related(int $id, int $categoryId, int $limit = 4): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM products WHERE category_id = :cat AND id != :id AND status = 'active' AND deleted_at IS NULL LIMIT :limit"
        );
        $stmt->bindValue('cat', $categoryId, PDO::PARAM_INT);
        $stmt->bindValue('id', $id, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return array_map([$this, 'decorate'], $stmt->fetchAll());
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO products
                (name, slug, description, seo_keywords, category_id, brand, price, currency, sale_price, sale_starts_at, sale_ends_at,
                 sku, barcode, stock_quantity, weight_kg, product_type, sourcing_type, thumbnail, gallery_images, attributes,
                 is_featured, is_new, status)
                VALUES
                (:name, :slug, :description, :seo_keywords, :category_id, :brand, :price, :currency, :sale_price, :sale_starts_at, :sale_ends_at,
                 :sku, :barcode, :stock_quantity, :weight_kg, :product_type, :sourcing_type, :thumbnail, :gallery_images, :attributes,
                 :is_featured, :is_new, :status)';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($this->bindParams($data));

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $allowed = [
            'name', 'slug', 'description', 'seo_keywords', 'category_id', 'brand', 'price', 'currency',
            'sale_price', 'sale_starts_at', 'sale_ends_at', 'sku', 'barcode', 'stock_quantity', 'weight_kg',
            'product_type', 'sourcing_type', 'thumbnail', 'gallery_images', 'attributes', 'is_featured', 'is_new', 'status',
        ];

        $fields = [];
        $params = ['id' => $id];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[$field] = $field === 'attributes' && $data[$field] !== null
                    ? json_encode($data[$field])
                    : $data[$field];
            }
        }

        if (empty($fields)) return false;

        $sql = 'UPDATE products SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    private function bindParams(array $data): array
    {
        return [
            'name'            => $data['name'],
            'slug'            => $data['slug'],
            'description'     => $data['description'] ?? null,
            'seo_keywords'    => $data['seo_keywords'] ?? null,
            'category_id'     => $data['category_id'] ?? null,
            'brand'           => $data['brand'] ?? null,
            'price'           => $data['price'] ?? 0,
            'currency'        => $data['currency'] ?? 'NAD',
            'sale_price'      => $data['sale_price'] ?? null,
            'sale_starts_at'  => $data['sale_starts_at'] ?? null,
            'sale_ends_at'    => $data['sale_ends_at'] ?? null,
            'sku'             => $data['sku'] ?? null,
            'barcode'         => $data['barcode'] ?? null,
            'stock_quantity'  => $data['stock_quantity'] ?? 0,
            'weight_kg'       => $data['weight_kg'] ?? null,
            'product_type'    => $data['product_type'] ?? 'physical',
            'sourcing_type'   => $data['sourcing_type'] ?? 'in_stock',
            'thumbnail'       => $data['thumbnail'] ?? null,
            'gallery_images'  => $data['gallery_images'] ?? null,
            'attributes'      => isset($data['attributes']) && $data['attributes'] !== null ? json_encode($data['attributes']) : null,
            'is_featured'     => !empty($data['is_featured']) ? 1 : 0,
            'is_new'          => !empty($data['is_new']) ? 1 : 0,
            'status'          => $data['status'] ?? 'draft',
        ];
    }

    /** Soft delete — sets deleted_at rather than removing the row, so past orders still resolve their line items. */
    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE products SET deleted_at = NOW() WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    public function restore(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE products SET deleted_at = NULL WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    // -----------------------------------------------------------------
    // Images
    // -----------------------------------------------------------------

    public function addImage(int $productId, string $url, ?string $altText, int $sortOrder): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES (:product_id, :url, :alt_text, :sort_order)'
        );
        $stmt->execute(['product_id' => $productId, 'url' => $url, 'alt_text' => $altText, 'sort_order' => $sortOrder]);
        return (int) $this->db->lastInsertId();
    }

    public function deleteImage(int $imageId, int $productId): bool
    {
        // Scoped to product_id too, so one admin can't delete another
        // product's image by guessing/tampering with an id.
        $stmt = $this->db->prepare('DELETE FROM product_images WHERE id = :id AND product_id = :product_id');
        return $stmt->execute(['id' => $imageId, 'product_id' => $productId]);
    }

    public function reorderImages(int $productId, array $orderedImageIds): void
    {
        $stmt = $this->db->prepare('UPDATE product_images SET sort_order = :sort_order WHERE id = :id AND product_id = :product_id');
        foreach ($orderedImageIds as $index => $imageId) {
            $stmt->execute(['sort_order' => $index, 'id' => (int) $imageId, 'product_id' => $productId]);
        }
    }

    // -----------------------------------------------------------------
    // Variants
    // -----------------------------------------------------------------

    public function addVariant(int $productId, array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO product_variants (product_id, sku, barcode, attributes, price_override, stock_quantity, image_id, status)
             VALUES (:product_id, :sku, :barcode, :attributes, :price_override, :stock_quantity, :image_id, :status)'
        );
        $stmt->execute([
            'product_id'     => $productId,
            'sku'            => $data['sku'] ?? null,
            'barcode'        => $data['barcode'] ?? null,
            'attributes'     => json_encode($data['attributes'] ?? []),
            'price_override' => $data['price_override'] ?? null,
            'stock_quantity' => $data['stock_quantity'] ?? 0,
            'image_id'       => $data['image_id'] ?? null,
            'status'         => $data['status'] ?? 'active',
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function updateVariant(int $variantId, int $productId, array $data): bool
    {
        $allowed = ['sku', 'barcode', 'price_override', 'stock_quantity', 'image_id', 'status'];
        $fields = [];
        $params = ['id' => $variantId, 'product_id' => $productId];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
            }
        }
        if (array_key_exists('attributes', $data)) {
            $fields[] = 'attributes = :attributes';
            $params['attributes'] = json_encode($data['attributes']);
        }
        if (empty($fields)) return false;

        $sql = 'UPDATE product_variants SET ' . implode(', ', $fields) . ' WHERE id = :id AND product_id = :product_id';
        return $this->db->prepare($sql)->execute($params);
    }

    public function deleteVariant(int $variantId, int $productId): bool
    {
        $stmt = $this->db->prepare('DELETE FROM product_variants WHERE id = :id AND product_id = :product_id');
        return $stmt->execute(['id' => $variantId, 'product_id' => $productId]);
    }

    public function findVariant(int $variantId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM product_variants WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $variantId]);
        $row = $stmt->fetch();
        if (!$row) return null;
        $row['attributes'] = json_decode($row['attributes'] ?? '{}', true) ?: [];
        return $row;
    }

    // -----------------------------------------------------------------
    // Stock (audited — every change goes through stock_movements)
    // -----------------------------------------------------------------

    /**
     * Adjusts a product's (or variant's) stock_quantity and logs the
     * movement in one call. $quantityChange is signed: positive adds
     * stock, negative removes it. Does not itself open a transaction —
     * callers that need atomicity with other writes (e.g. order
     * creation) wrap this in their own transaction.
     */
    public function recordStockMovement(
        int $productId,
        ?int $variantId,
        int $quantityChange,
        string $reason,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?int $createdBy = null,
        ?string $note = null
    ): void {
        $table = $variantId ? 'product_variants' : 'products';
        $stmt = $this->db->prepare("UPDATE $table SET stock_quantity = GREATEST(0, stock_quantity + :change) WHERE id = :id");
        $stmt->execute(['change' => $quantityChange, 'id' => $variantId ?? $productId]);

        $log = $this->db->prepare(
            'INSERT INTO stock_movements (product_id, variant_id, quantity_change, reason, reference_type, reference_id, note, created_by)
             VALUES (:product_id, :variant_id, :quantity_change, :reason, :reference_type, :reference_id, :note, :created_by)'
        );
        $log->execute([
            'product_id'      => $productId,
            'variant_id'      => $variantId,
            'quantity_change' => $quantityChange,
            'reason'          => $reason,
            'reference_type'  => $referenceType,
            'reference_id'    => $referenceId,
            'note'            => $note,
            'created_by'      => $createdBy,
        ]);
    }

    /** Adjusts reserved_quantity (Pay Later hold) without touching stock_quantity itself. $change is signed. */
    public function adjustReservedQuantity(int $productId, ?int $variantId, int $change): void
    {
        $table = $variantId ? 'product_variants' : 'products';
        $stmt = $this->db->prepare("UPDATE $table SET reserved_quantity = GREATEST(0, reserved_quantity + :change) WHERE id = :id");
        $stmt->execute(['change' => $change, 'id' => $variantId ?? $productId]);
    }

    public function stockMovementsFor(int $productId, int $limit = 50): array
    {
        $stmt = $this->db->prepare('SELECT sm.*, u.name AS created_by_name FROM stock_movements sm LEFT JOIN users u ON u.id = sm.created_by WHERE sm.product_id = :id ORDER BY sm.created_at DESC LIMIT :limit');
        $stmt->bindValue('id', $productId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Back-compat thin wrapper around recordStockMovement() for the
     * existing Order::create() call site — kept so nothing currently
     * working breaks while Order.php's own rewrite (mixed-cart split,
     * Pay Later, deposits) is still in progress. New code should call
     * recordStockMovement() directly with a real reason/reference so the
     * audit trail is meaningful.
     */
    public function decrementStock(int $id, int $quantity): bool
    {
        $this->recordStockMovement($id, null, -$quantity, 'sale');
        return true;
    }

    public function countActive(): int
    {
        return (int) $this->db->query("SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND status = 'active'")->fetchColumn();
    }
}
