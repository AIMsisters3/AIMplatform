<?php

/**
 * Computes a content item's REAL current live state from its existing
 * fields, rather than trusting the raw is_live column alone.
 *
 * Before this, is_live (migration 014) was a plain manual admin toggle
 * with no time component at all - once turned on, an item stayed
 * "live" forever until someone remembered to turn it back off (see
 * LiveNowStrip.jsx's own docblock, which describes polling as the only
 * way visitors ever found out a broadcast had actually ended). This
 * computes the real window instead, using fields that already exist:
 *
 *   live_start_time = COALESCE(publish_date, created_at) - the exact
 *   "effective date" convention Content::all() already sorts by, reused
 *   here rather than inventing a second start-time column. An item
 *   published immediately (the common case) never gets a publish_date
 *   at all (UploadContent.jsx only sends one for status='scheduled'),
 *   so created_at is the correct fallback: the moment it went live IS
 *   the moment it was created.
 *
 *   live_end_time = live_start_time + duration_seconds - the same
 *   column every video/audio upload already carries for its duration
 *   chip (see Frontend/src/utils/formatters.js's formatDuration()).
 *
 * A missing duration_seconds means the live period never auto-expires -
 * matches the exact pre-existing behavior (every is_live row created
 * before this feature existed has no meaningful duration), so nothing
 * that already relied on the old manual-only behavior changes: the
 * admin still has to turn is_live off by hand in that case.
 *
 * Called on every row Content::all()/find()/findBySlug() returns, right
 * alongside normalize_media_row() - same "decorate every row the same
 * way, once, in the model" pattern, not duplicated per caller. The
 * is_live key in the returned row is overwritten with the computed
 * value, so every existing consumer (ContentCard.jsx, the admin table,
 * LiveNowStrip, isLive() in mediaKind.js) that already just reads
 * item.is_live starts reflecting real time-bounded state with no
 * changes needed on their end - one source of truth, computed once,
 * here.
 */
function decorate_live_status(array $row): array
{
    $adminFlag = !empty($row['is_live']);

    if (!$adminFlag) {
        $row['is_live'] = 0;
        $row['live_start_time'] = null;
        $row['live_end_time'] = null;
        return $row;
    }

    $start = $row['publish_date'] ?? $row['created_at'] ?? null;
    $startTs = $start ? strtotime($start) : false;

    $duration = isset($row['duration_seconds']) && $row['duration_seconds'] !== null
        ? (int) $row['duration_seconds']
        : null;
    $endTs = ($startTs !== false && $duration !== null) ? $startTs + $duration : null;

    $now = time();
    $currentlyLive = $startTs !== false && $now >= $startTs && ($endTs === null || $now < $endTs);

    $row['is_live'] = $currentlyLive ? 1 : 0;
    $row['live_start_time'] = $startTs !== false ? date('Y-m-d H:i:s', $startTs) : null;
    $row['live_end_time'] = $endTs !== null ? date('Y-m-d H:i:s', $endTs) : null;

    return $row;
}

/**
 * The same live-window condition as decorate_live_status(), as raw SQL -
 * used wherever a query needs to filter down to items that are ACTUALLY
 * currently live (not just is_live=1 forever), e.g. Content::all()'s
 * is_live filter (LiveNowStrip.jsx, the navbar). $alias is the table
 * alias the query uses for content (e.g. 'c').
 */
function live_window_sql(string $alias): string
{
    return "$alias.is_live = 1"
        . " AND COALESCE($alias.publish_date, $alias.created_at) <= NOW()"
        . " AND ($alias.duration_seconds IS NULL"
        . " OR DATE_ADD(COALESCE($alias.publish_date, $alias.created_at), INTERVAL $alias.duration_seconds SECOND) > NOW())";
}
