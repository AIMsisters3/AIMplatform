<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/permissions.php';

class DashboardController
{
    /** GET /api/dashboard/summary — real counts + recent activity for the admin CMS dashboard. */
    public function summary(): void
    {
        require_permission('content.create');

        $db = Database::getConnection();

        $stats = $db->query(
            "SELECT
                (SELECT COUNT(*) FROM content WHERE content_type = 'video' AND deleted_at IS NULL) AS videos,
                (SELECT COUNT(*) FROM content WHERE content_type = 'article' AND deleted_at IS NULL) AS articles,
                (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) AS products,
                (SELECT COUNT(*) FROM orders) AS orders,
                (SELECT COUNT(*) FROM content WHERE status = 'draft' AND deleted_at IS NULL) AS drafts,
                (SELECT COUNT(*) FROM comments WHERE status = 'pending') AS pending_comments,
                (SELECT COUNT(*) FROM orders WHERE status IN ('awaiting_approval','awaiting_payment','processing','supplier_ordered')) AS orders_awaiting_fulfillment,
                (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND product_type = 'physical' AND sourcing_type = 'in_stock' AND status != 'archived' AND stock_quantity <= 5) AS low_stock_products,
                (SELECT COUNT(*) FROM payment_records WHERE status = 'awaiting_verification') AS payments_awaiting_verification,
                (SELECT COUNT(*) FROM refunds WHERE status = 'requested') AS refunds_requested,
                (SELECT COUNT(*) FROM product_reviews WHERE status = 'pending') AS pending_reviews"
        )->fetch();

        // Separate, best-effort query: content_views (migration 011) may not
        // exist yet on a site that hasn't run that migration - the rest of
        // the dashboard shouldn't break just because this one number can't
        // be computed yet.
        $visitors30d = 0;
        try {
            $visitors30d = (int) $db->query(
                "SELECT COUNT(DISTINCT visitor_key) FROM content_views WHERE viewed_at >= NOW() - INTERVAL 30 DAY"
            )->fetchColumn();
        } catch (PDOException $e) {
            // table not migrated yet - leave at 0 rather than 500ing the page
        }

        $activity = $db->query(
            "SELECT title, content_type, status, created_at
             FROM content
             WHERE deleted_at IS NULL
             ORDER BY created_at DESC
             LIMIT 5"
        )->fetchAll();

        json_ok([
            'stats' => [
                'visitors_30d' => $visitors30d,
                'videos'       => (int) $stats['videos'],
                'articles'     => (int) $stats['articles'],
                'products'     => (int) $stats['products'],
                'orders'       => (int) $stats['orders'],
            ],
            'recent_activity' => array_map(static function (array $row): array {
                return [
                    'text'       => sprintf('New %s "%s" %s', str_replace('_', ' ', $row['content_type']), $row['title'], $row['status']),
                    'created_at' => $row['created_at'],
                ];
            }, $activity),
            'notifications_summary' => [
                'pending_comments'               => (int) $stats['pending_comments'],
                'orders_awaiting_fulfillment'    => (int) $stats['orders_awaiting_fulfillment'],
                'low_stock_products'             => (int) $stats['low_stock_products'],
                'payments_awaiting_verification' => (int) $stats['payments_awaiting_verification'],
                'refunds_requested'              => (int) $stats['refunds_requested'],
                'pending_reviews'                => (int) $stats['pending_reviews'],
            ],
            'drafts_count' => (int) $stats['drafts'],
        ]);
    }
}
