<?php

require_once __DIR__ . '/../models/Content.php';
require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

class FeaturedController
{
    /**
     * GET /api/featured?limit= - the homepage's single blended "Featured"
     * section: content (video/article/etc, Content::featuredRanked()) and
     * Shop products (Product::popularityRanked()) on one shared scale,
     * per spec ("mix content and products together... ranked on a shared
     * scale"). Raw popularity_score isn't directly comparable between the
     * two - a content item's score is views+likes*5, a product's is
     * views+unitsSold*5, and view/engagement volume for a video has no
     * reason to sit in the same numeric range as a shop's sale count. So
     * each side is independently normalized to a 0-100 scale relative to
     * its OWN top scorer first (that item becomes 100, everything else in
     * that list scaled proportionally), THEN the two normalized lists are
     * merged and sorted together - that's what makes this a fair
     * "shared scale" instead of just favoring whichever domain happens to
     * have bigger raw numbers. An admin's own is_featured pin (on either
     * side) carries a flat +1,000,000 baked into the raw score before
     * normalization, so a pinned item normalizes to ~100 and reliably
     * surfaces near the top either way.
     */
    public function index(): void
    {
        $limit = min(20, max(1, (int) ($_GET['limit'] ?? 6)));

        // Fetch up to $limit from each side - worst case (one domain has
        // nothing, or is entirely outranked), the other domain alone fills
        // every slot, so $limit from each is always enough headroom.
        $content = (new Content())->featuredRanked($limit);
        $products = (new Product())->popularityRanked($limit);

        $contentMax = array_reduce($content, fn ($max, $row) => max($max, (float) $row['popularity_score']), 0.0);
        $productMax = array_reduce($products, fn ($max, $row) => max($max, (float) $row['popularity_score']), 0.0);

        $merged = [];
        foreach ($content as $row) {
            $row['item_type'] = 'content';
            $row['_rank'] = $contentMax > 0 ? ((float) $row['popularity_score'] / $contentMax) * 100 : 0;
            unset($row['popularity_score']);
            $merged[] = $row;
        }
        foreach ($products as $row) {
            $row['item_type'] = 'product';
            $row['_rank'] = $productMax > 0 ? ((float) $row['popularity_score'] / $productMax) * 100 : 0;
            unset($row['popularity_score']);
            $merged[] = $row;
        }

        usort($merged, fn ($a, $b) => $b['_rank'] <=> $a['_rank']);
        $merged = array_slice($merged, 0, $limit);
        foreach ($merged as &$row) {
            unset($row['_rank']);
        }
        unset($row);

        // Same cost_price redaction ProductController::featured() applies -
        // duplicated rather than shared, since it's a few lines and the
        // original is a private method on a different controller.
        $viewer = optional_auth();
        if (!$viewer || !user_has_permission($viewer, 'products.manage')) {
            foreach ($merged as &$row) {
                if ($row['item_type'] === 'product') {
                    unset($row['cost_price']);
                }
            }
            unset($row);
        }

        json_ok(['items' => $merged]);
    }
}
