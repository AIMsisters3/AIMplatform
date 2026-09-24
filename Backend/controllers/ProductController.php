<?php

require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/../models/Wishlist.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

class ProductController
{
    private Product $model;

    public function __construct()
    {
        $this->model = new Product();
    }

    /** GET /api/products?category_id=&search=&min_price=&max_price=&sourcing_type=&is_featured=&is_new=&on_sale=&sort=&page= */
    public function index(): void
    {
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 12));

        $filters = [
            'category_id'    => $_GET['category_id'] ?? null,
            'search'         => $_GET['search'] ?? null,
            'min_price'      => $_GET['min_price'] ?? null,
            'max_price'      => $_GET['max_price'] ?? null,
            'sourcing_type'  => $_GET['sourcing_type'] ?? null,
            'is_featured'    => $_GET['is_featured'] ?? null,
            'is_new'         => $_GET['is_new'] ?? null,
            'on_sale'        => $_GET['on_sale'] ?? null,
            'sort'           => $_GET['sort'] ?? null,
        ];

        // "status" (including "all"/"draft"/"archived") and "deleted" (the
        // admin's Deleted/restore view) are only honored for an account
        // that can manage products — everyone else always gets the
        // model's default active-only, non-deleted filter.
        if (!empty($_GET['status']) || !empty($_GET['deleted'])) {
            $payload = optional_auth();
            if ($payload && user_has_permission($payload, 'products.manage')) {
                if (!empty($_GET['status'])) {
                    $filters['status'] = $_GET['status'];
                }
                $filters['deleted'] = !empty($_GET['deleted']);
            }
        }

        $items = $this->model->all($filters, $limit, ($page - 1) * $limit);
        $total = $this->model->count($filters);

        // Mark which of these items the signed-in visitor has wishlisted,
        // in one extra query instead of N — never fires for a guest.
        $viewer = optional_auth();
        if ($viewer) {
            $wishlisted = (new Wishlist())->wishlistedIdsAmong((int) $viewer['sub'], array_column($items, 'id'));
            foreach ($items as &$item) {
                $item['is_wishlisted'] = in_array((int) $item['id'], $wishlisted, true);
            }
            unset($item);
        }

        json_ok(['items' => $items, 'page' => $page, 'limit' => $limit, 'total' => $total]);
    }

    /** GET /api/products/{idOrSlug} */
    public function show(string $idOrSlug): void
    {
        $product = ctype_digit($idOrSlug) ? $this->model->find((int) $idOrSlug) : $this->model->findBySlug($idOrSlug);
        if (!$product) {
            json_error('Product not found.', 404);
        }

        $related = $product['category_id']
            ? $this->model->related((int) $product['id'], (int) $product['category_id'])
            : [];

        $viewer = optional_auth();
        if ($viewer) {
            $product['is_wishlisted'] = (new Wishlist())->contains((int) $viewer['sub'], (int) $product['id']);
        }

        json_ok(['item' => $product, 'related' => $related]);
    }

    /** POST /api/products (requires products.manage) */
    public function store(): void
    {
        require_permission('products.manage');
        $body = get_json_body();

        if (empty($body['name']) || !isset($body['price'])) {
            json_error('Name and price are required.', 422);
        }
        if (isset($body['sourcing_type']) && !in_array($body['sourcing_type'], ['in_stock', 'on_order'], true)) {
            json_error('Invalid sourcing type.', 422);
        }

        $body['slug'] = $body['slug'] ?? strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $body['name']), '-')) . '-' . substr(uniqid(), -5);

        $id = $this->model->create($body);

        // Images can be submitted inline on create (an array of {url, alt_text}) as a convenience —
        // the admin form uploads files first via /api/upload, then sends the resulting URLs here.
        if (!empty($body['images']) && is_array($body['images'])) {
            foreach (array_values($body['images']) as $index => $image) {
                if (!empty($image['url'])) {
                    $this->model->addImage($id, $image['url'], $image['alt_text'] ?? null, $index);
                }
            }
        }
        if (!empty($body['variants']) && is_array($body['variants'])) {
            foreach ($body['variants'] as $variant) {
                if (!empty($variant['attributes'])) {
                    $this->model->addVariant($id, $variant);
                }
            }
        }

        json_created(['id' => $id], 'Product created successfully.');
    }

    /** PUT /api/products/{id} (requires products.manage) */
    public function update(int $id): void
    {
        require_permission('products.manage');
        $body = get_json_body();

        $existing = $this->model->find($id);
        if (!$existing) {
            json_error('Product not found.', 404);
        }
        if (isset($body['sourcing_type']) && !in_array($body['sourcing_type'], ['in_stock', 'on_order'], true)) {
            json_error('Invalid sourcing type.', 422);
        }

        $this->model->update($id, $body);
        json_ok(null, 'Product updated successfully.');
    }

    /** DELETE /api/products/{id} (requires products.manage) — soft delete, see Product::delete(). */
    public function destroy(int $id): void
    {
        require_permission('products.manage');

        if (!$this->model->find($id)) {
            json_error('Product not found.', 404);
        }

        $this->model->delete($id);
        json_ok(null, 'Product removed from the catalogue.');
    }

    /** POST /api/products/{id}/restore (requires products.manage) — brings a soft-deleted product back. */
    public function restore(int $id): void
    {
        require_permission('products.manage');
        $this->model->restore($id);
        json_ok(null, 'Product restored.');
    }

    // -----------------------------------------------------------------
    // Images
    // -----------------------------------------------------------------

    /** POST /api/products/{id}/images (requires products.manage) body: {url, alt_text?, sort_order?} */
    public function addImage(int $productId): void
    {
        require_permission('products.manage');
        $body = get_json_body();

        if (!$this->model->find($productId)) {
            json_error('Product not found.', 404);
        }
        if (empty($body['url'])) {
            json_error('An image URL is required.', 422);
        }

        $sortOrder = isset($body['sort_order']) ? (int) $body['sort_order'] : count($this->model->imagesFor($productId));
        $imageId = $this->model->addImage($productId, $body['url'], $body['alt_text'] ?? null, $sortOrder);
        json_created(['id' => $imageId], 'Image added.');
    }

    /** DELETE /api/products/{id}/images/{imageId} (requires products.manage) */
    public function deleteImage(int $productId, int $imageId): void
    {
        require_permission('products.manage');
        $this->model->deleteImage($imageId, $productId);
        json_ok(null, 'Image removed.');
    }

    /** POST /api/products/{id}/images/reorder (requires products.manage) body: {image_ids: [...]} */
    public function reorderImages(int $productId): void
    {
        require_permission('products.manage');
        $body = get_json_body();
        $ids = array_map('intval', $body['image_ids'] ?? []);
        if (empty($ids)) {
            json_error('image_ids[] is required.', 422);
        }
        $this->model->reorderImages($productId, $ids);
        json_ok(null, 'Image order updated.');
    }

    // -----------------------------------------------------------------
    // Variants
    // -----------------------------------------------------------------

    /** POST /api/products/{id}/variants (requires products.manage) body: {sku?, barcode?, attributes, price_override?, stock_quantity?, image_id?} */
    public function addVariant(int $productId): void
    {
        require_permission('products.manage');
        $body = get_json_body();

        if (!$this->model->find($productId)) {
            json_error('Product not found.', 404);
        }
        if (empty($body['attributes']) || !is_array($body['attributes'])) {
            json_error('Variant attributes (e.g. {"size":"M","color":"Red"}) are required.', 422);
        }

        $id = $this->model->addVariant($productId, $body);
        json_created(['id' => $id], 'Variant added.');
    }

    /** PUT /api/products/{id}/variants/{variantId} (requires products.manage) */
    public function updateVariant(int $productId, int $variantId): void
    {
        require_permission('products.manage');
        $body = get_json_body();
        $this->model->updateVariant($variantId, $productId, $body);
        json_ok(null, 'Variant updated.');
    }

    /** DELETE /api/products/{id}/variants/{variantId} (requires products.manage) */
    public function deleteVariant(int $productId, int $variantId): void
    {
        require_permission('products.manage');
        $this->model->deleteVariant($variantId, $productId);
        json_ok(null, 'Variant removed.');
    }

    // -----------------------------------------------------------------
    // Stock
    // -----------------------------------------------------------------

    /** POST /api/products/{id}/stock (requires products.manage) body: {quantity_change, reason?, note?, variant_id?} — manual restock/adjustment, always audited. */
    public function adjustStock(int $productId): void
    {
        $payload = require_permission('products.manage');
        $body = get_json_body();

        if (!$this->model->find($productId)) {
            json_error('Product not found.', 404);
        }
        $change = (int) ($body['quantity_change'] ?? 0);
        if ($change === 0) {
            json_error('quantity_change must be a non-zero integer.', 422);
        }
        $reason = in_array($body['reason'] ?? 'adjustment', ['restock', 'adjustment', 'return', 'on_order_receive'], true)
            ? $body['reason']
            : 'adjustment';

        $this->model->recordStockMovement(
            $productId,
            isset($body['variant_id']) ? (int) $body['variant_id'] : null,
            $change,
            $reason,
            'manual',
            null,
            (int) $payload['sub'],
            $body['note'] ?? null
        );

        json_ok(null, 'Stock updated.');
    }

    /** GET /api/products/{id}/stock-movements (requires products.manage) */
    public function stockMovements(int $productId): void
    {
        require_permission('products.manage');
        json_ok(['items' => $this->model->stockMovementsFor($productId)]);
    }
}
