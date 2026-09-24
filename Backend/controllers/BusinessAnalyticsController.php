<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/permissions.php';

/**
 * Real, database-backed Shop business analytics — revenue, profit, tithe,
 * best/fastest-selling, most-viewed, lowest-stock, and sales trends.
 *
 * Gated on 'orders.manage' throughout (not split per-endpoint by
 * 'products.manage' vs 'orders.manage'): every figure here ultimately
 * reads order/payment data, and in this codebase's actual role grants
 * (migration 001) the 'admin' role always holds both permissions together
 * — a single gate keeps the "who sees the business dashboard" question
 * simple without being more restrictive in practice.
 *
 * ACCOUNTING BASIS — read this before changing any query here:
 *
 *   Revenue = money actually verified as received (payment_records rows
 *   with status = 'verified', summed by their verified_at date). This is
 *   the one ledger that is true across every order kind (standard,
 *   pay_later, on_order) and every payment method — see
 *   Order::applyVerifiedPayment(), which is the single place a payment
 *   is ever marked verified. Order totals/creation dates are NOT used for
 *   revenue: an order can be created long before (or never) actually
 *   paid, and counting it as revenue at creation would fabricate money
 *   that was never received.
 *
 *   Profit = revenue − cost of goods, computed ONLY from order lines
 *   where unit_cost_snapshot is known (migration 026). A line with no
 *   recorded cost contributes NEITHER revenue NOR cost to the profit
 *   figure — it is excluded entirely rather than assumed to cost NAD 0,
 *   per that migration's own instruction that NULL cost must be treated
 *   as "unknown," never zero. Every profit figure is returned alongside
 *   its "cost coverage" (% of that period's paid revenue that actually
 *   had a recorded cost) so an admin can see how much of the number is
 *   real vs. still missing data — this is disclosed to the frontend, not
 *   silently hidden. Profit is attributed to the month of an order's
 *   LAST verified payment (the payment that completed it), only once the
 *   order's payment_state is 'paid' — a partially-paid order's profit is
 *   not yet counted (nothing is prorated/guessed).
 *
 *   Tithe = 10% of PROFIT, never revenue (explicit spec requirement).
 *   Floored at 0 — a loss period owes no tithe.
 *
 *   Units sold (best-selling / fastest-selling / trend quantities) come
 *   from stock_movements WHERE reason = 'sale' — the single, already-
 *   audited write path for every real stock-reducing sale across all
 *   order kinds (Order::createInStockOrder / Order::applyVerifiedPayment).
 *
 *   Expenses: not implemented (no expense-tracking table exists anywhere
 *   in this schema). The spec explicitly permits this: "If expenses are
 *   not yet implemented: Allow: Profit = Revenue - Product Cost." A
 *   negative profit figure IS how a loss period is represented — no
 *   separate "loss" number is fabricated.
 */
class BusinessAnalyticsController
{
    /** GET /api/business-analytics/summary?month=YYYY-MM — revenue/profit/tithe for one month (default: current), plus the prior month for comparison. */
    public function summary(): void
    {
        require_permission('orders.manage');
        $db = Database::getConnection();

        $month = $_GET['month'] ?? date('Y-m');
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
            json_error('month must be in YYYY-MM format.', 422);
        }

        $current  = self::monthFigures($db, $month);
        $previous = self::monthFigures($db, date('Y-m', strtotime($month . '-01 -1 month')));

        json_ok([
            'current'  => $current,
            'previous' => $previous,
        ]);
    }

    /** GET /api/business-analytics/trends?period=daily|weekly|monthly|yearly — revenue + units sold per bucket. */
    public function trends(): void
    {
        require_permission('orders.manage');
        $db = Database::getConnection();

        $period = in_array($_GET['period'] ?? 'monthly', ['daily', 'weekly', 'monthly', 'yearly'], true)
            ? $_GET['period']
            : 'monthly';

        [$start, $buckets] = self::bucketPlan($period);

        $paymentRows = $db->prepare('SELECT amount, verified_at FROM payment_records WHERE status = "verified" AND verified_at >= :start');
        $paymentRows->execute(['start' => $start->format('Y-m-d H:i:s')]);
        $paymentRows = $paymentRows->fetchAll();

        $saleRows = $db->prepare("SELECT quantity_change, created_at FROM stock_movements WHERE reason = 'sale' AND created_at >= :start");
        $saleRows->execute(['start' => $start->format('Y-m-d H:i:s')]);
        $saleRows = $saleRows->fetchAll();

        $points = [];
        foreach ($buckets as $bucket) {
            $from = $bucket['from']->getTimestamp();
            $to   = $bucket['to']->getTimestamp();

            $revenue = 0.0;
            foreach ($paymentRows as $p) {
                $t = strtotime($p['verified_at']);
                if ($t >= $from && $t < $to) {
                    $revenue += (float) $p['amount'];
                }
            }

            $units = 0;
            foreach ($saleRows as $s) {
                $t = strtotime($s['created_at']);
                if ($t >= $from && $t < $to) {
                    $units += -(int) $s['quantity_change'];
                }
            }

            $points[] = [
                'label'      => $bucket['label'],
                'from'       => $bucket['from']->format('Y-m-d'),
                'to'         => $bucket['to']->format('Y-m-d'),
                'revenue'    => round($revenue, 2),
                'units_sold' => $units,
            ];
        }

        json_ok(['period' => $period, 'points' => $points]);
    }

    /** GET /api/business-analytics/products?metric=best_selling|fastest_selling|most_viewed|lowest_stock&limit=10 */
    public function products(): void
    {
        require_permission('orders.manage');
        $db = Database::getConnection();

        $metric = $_GET['metric'] ?? 'best_selling';
        $limit  = max(1, min(50, (int) ($_GET['limit'] ?? 10)));

        switch ($metric) {
            case 'best_selling':
                $stmt = $db->prepare(
                    "SELECT p.id, p.name, p.slug, SUM(-sm.quantity_change) AS units_sold
                     FROM stock_movements sm
                     JOIN products p ON p.id = sm.product_id
                     WHERE sm.reason = 'sale'
                     GROUP BY p.id, p.name, p.slug
                     ORDER BY units_sold DESC
                     LIMIT " . $limit
                );
                $stmt->execute();
                $items = array_map(static function (array $r): array {
                    return ['id' => (int) $r['id'], 'name' => $r['name'], 'slug' => $r['slug'], 'units_sold' => (int) $r['units_sold']];
                }, $stmt->fetchAll());
                break;

            case 'fastest_selling':
                // "Fastest-selling" = recent velocity (last 30 days), not
                // all-time volume — a product that just started flying off
                // the shelf should outrank an old, slow, high-volume one.
                $stmt = $db->prepare(
                    "SELECT p.id, p.name, p.slug, SUM(-sm.quantity_change) AS units_sold_30d
                     FROM stock_movements sm
                     JOIN products p ON p.id = sm.product_id
                     WHERE sm.reason = 'sale' AND sm.created_at >= NOW() - INTERVAL 30 DAY
                     GROUP BY p.id, p.name, p.slug
                     ORDER BY units_sold_30d DESC
                     LIMIT " . $limit
                );
                $stmt->execute();
                $items = array_map(static function (array $r): array {
                    return ['id' => (int) $r['id'], 'name' => $r['name'], 'slug' => $r['slug'], 'units_sold_30d' => (int) $r['units_sold_30d']];
                }, $stmt->fetchAll());
                break;

            case 'most_viewed':
                $stmt = $db->prepare(
                    'SELECT id, name, slug, views FROM products WHERE deleted_at IS NULL ORDER BY views DESC LIMIT ' . $limit
                );
                $stmt->execute();
                $items = array_map(static function (array $r): array {
                    return ['id' => (int) $r['id'], 'name' => $r['name'], 'slug' => $r['slug'], 'views' => (int) $r['views']];
                }, $stmt->fetchAll());
                break;

            case 'lowest_stock':
                $stmt = $db->prepare(
                    "SELECT id, name, slug, stock_quantity, reserved_quantity, (stock_quantity - reserved_quantity) AS available
                     FROM products
                     WHERE deleted_at IS NULL AND status != 'archived' AND product_type = 'physical' AND sourcing_type = 'in_stock'
                     ORDER BY available ASC
                     LIMIT " . $limit
                );
                $stmt->execute();
                $items = array_map(static function (array $r): array {
                    return [
                        'id' => (int) $r['id'], 'name' => $r['name'], 'slug' => $r['slug'],
                        'stock_quantity' => (int) $r['stock_quantity'], 'reserved_quantity' => (int) $r['reserved_quantity'],
                        'available' => (int) $r['available'],
                    ];
                }, $stmt->fetchAll());
                break;

            default:
                json_error('Invalid metric. Use best_selling, fastest_selling, most_viewed, or lowest_stock.', 422);
                return;
        }

        json_ok(['metric' => $metric, 'items' => $items]);
    }

    /** Revenue/profit/tithe for one calendar month — see class docblock for the accounting basis. */
    private static function monthFigures(PDO $db, string $month): array
    {
        $start = $month . '-01 00:00:00';
        $end   = date('Y-m-01 00:00:00', strtotime($start . ' +1 month'));

        $revenueStmt = $db->prepare(
            'SELECT COALESCE(SUM(amount), 0) AS revenue, COUNT(*) AS payment_count
             FROM payment_records
             WHERE status = "verified" AND verified_at >= :start AND verified_at < :end'
        );
        $revenueStmt->execute(['start' => $start, 'end' => $end]);
        $revenueRow = $revenueStmt->fetch();

        $profitStmt = $db->prepare(
            "SELECT
                COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS paid_item_revenue,
                COALESCE(SUM(CASE WHEN oi.unit_cost_snapshot IS NOT NULL THEN oi.unit_price * oi.quantity ELSE 0 END), 0) AS revenue_with_known_cost,
                COALESCE(SUM(CASE WHEN oi.unit_cost_snapshot IS NOT NULL THEN oi.unit_cost_snapshot * oi.quantity ELSE 0 END), 0) AS known_cost,
                COUNT(DISTINCT o.id) AS paid_orders
             FROM orders o
             JOIN order_items oi ON oi.order_id = o.id
             JOIN (
                 SELECT order_id, MAX(verified_at) AS completed_at
                 FROM payment_records
                 WHERE status = 'verified'
                 GROUP BY order_id
             ) pay ON pay.order_id = o.id
             WHERE o.payment_state = 'paid' AND pay.completed_at >= :start AND pay.completed_at < :end"
        );
        $profitStmt->execute(['start' => $start, 'end' => $end]);
        $profitRow = $profitStmt->fetch();

        $revenueWithKnownCost = (float) $profitRow['revenue_with_known_cost'];
        $knownCost            = (float) $profitRow['known_cost'];
        $profit               = round($revenueWithKnownCost - $knownCost, 2);
        $tithe                = $profit > 0 ? round($profit * 0.10, 2) : 0.0;
        $paidItemRevenue      = (float) $profitRow['paid_item_revenue'];
        $costCoveragePct      = $paidItemRevenue > 0 ? round($revenueWithKnownCost / $paidItemRevenue * 100, 1) : null;

        return [
            'month'                  => $month,
            'revenue'                => round((float) $revenueRow['revenue'], 2),
            'payment_count'          => (int) $revenueRow['payment_count'],
            'profit'                 => $profit,
            'tithe'                  => $tithe,
            'paid_orders_counted'    => (int) $profitRow['paid_orders'],
            'cost_coverage_percent'  => $costCoveragePct,
            'cost_coverage_note'     => $costCoveragePct === null
                ? 'No fully-paid orders this month yet.'
                : ($costCoveragePct < 100
                    ? 'Profit only reflects the ' . $costCoveragePct . '% of paid-order revenue whose products have a recorded cost price. Set cost prices on more products for a complete figure.'
                    : 'All paid-order revenue this month has a recorded cost price.'),
        ];
    }

    /** @return array{0: DateTime, 1: array<int, array{label: string, from: DateTime, to: DateTime}>} */
    private static function bucketPlan(string $period): array
    {
        $now = new DateTime('now');
        $buckets = [];

        switch ($period) {
            case 'daily':
                $count = 30;
                $start = (clone $now)->setTime(0, 0, 0)->modify('-' . ($count - 1) . ' days');
                for ($i = 0; $i < $count; $i++) {
                    $from = (clone $start)->modify("+{$i} days");
                    $to = (clone $from)->modify('+1 day');
                    $buckets[] = ['label' => $from->format('M j'), 'from' => $from, 'to' => $to];
                }
                break;

            case 'weekly':
                $count = 12;
                $thisWeekStart = (clone $now)->setTime(0, 0, 0)->modify('monday this week');
                $start = (clone $thisWeekStart)->modify('-' . ($count - 1) . ' weeks');
                for ($i = 0; $i < $count; $i++) {
                    $from = (clone $start)->modify("+{$i} weeks");
                    $to = (clone $from)->modify('+1 week');
                    $buckets[] = ['label' => 'Wk of ' . $from->format('M j'), 'from' => $from, 'to' => $to];
                }
                break;

            case 'yearly':
                $count = 5;
                $startYear = (int) $now->format('Y') - ($count - 1);
                $start = new DateTime("{$startYear}-01-01");
                for ($i = 0; $i < $count; $i++) {
                    $from = (clone $start)->modify("+{$i} years");
                    $to = (clone $from)->modify('+1 year');
                    $buckets[] = ['label' => $from->format('Y'), 'from' => $from, 'to' => $to];
                }
                break;

            case 'monthly':
            default:
                $count = 12;
                $thisMonthStart = new DateTime($now->format('Y-m-01'));
                $start = (clone $thisMonthStart)->modify('-' . ($count - 1) . ' months');
                for ($i = 0; $i < $count; $i++) {
                    $from = (clone $start)->modify("+{$i} months");
                    $to = (clone $from)->modify('+1 month');
                    $buckets[] = ['label' => $from->format('M Y'), 'from' => $from, 'to' => $to];
                }
                break;
        }

        return [$start, $buckets];
    }
}
