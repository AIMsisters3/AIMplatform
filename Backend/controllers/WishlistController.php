<?php

require_once __DIR__ . '/../models/Wishlist.php';
require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class WishlistController
{
    private Wishlist $model;

    public function __construct()
    {
        $this->model = new Wishlist();
    }

    /** GET /api/wishlist — the signed-in user's own wishlist. */
    public function index(): void
    {
        $payload = require_auth();
        $items = $this->model->forUser((int) $payload['sub']);
        foreach ($items as &$item) {
            $item['availability'] = Product::availabilityFor($item);
            $item['effective_price'] = Product::effectivePriceFor($item);
        }
        unset($item);
        json_ok(['items' => $items]);
    }

    /** POST /api/wishlist/{productId} — toggles on/off, returns the new state. */
    public function toggle(int $productId): void
    {
        $payload = require_auth();
        $wishlisted = $this->model->toggle((int) $payload['sub'], $productId);
        json_ok(['wishlisted' => $wishlisted]);
    }
}
