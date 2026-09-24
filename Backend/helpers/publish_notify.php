<?php
/**
 * Notifies every signed-in account (in-app bell) when a devotion, Bible
 * study, news, Kids, or new series episode item is newly published, and
 * additionally emails newsletter subscribers for devotions/news only
 * (see NEWSLETTER_NOTIFY_SECTIONS' `email` flag) — called from
 * ContentController::store()/update() (and SeriesController::
 * attachEpisode()) after the content row is already persisted.
 *
 * "Newly" is the whole point here: this must fire once per item, the
 * first time it becomes published, never again on a later edit while it
 * stays published. content.newsletter_notified_at (migration 009) is
 * what makes that safe to call on every single save without re-checking
 * caller-side state — the guard lives here, not scattered across every
 * call site. The same flag now gates BOTH notification channels, so an
 * item is never announced twice even though it can reach that state two
 * ways: publishing directly, or being attached to a series after already
 * being published (see maybe_notify_new_episode() below).
 */

require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/../models/Content.php';
require_once __DIR__ . '/../models/Subscriber.php';
require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../models/Series.php';
require_once __DIR__ . '/../emails/content_notification_template.php';

// Every section here still gets the in-app bell notification (an
// unrelated, unrestricted feature that already worked and was never
// asked to change), but `email` controls the SEPARATE subscriber-email
// channel: only true for devotions/news. This used to also email
// subscribers for bible_study/kids, which was a real bug against the
// explicit requirement "Subscribers should receive only: News,
// Devotions... unless the subscriber preferences explicitly support
// them in the future" (no such preference system exists yet, so the
// restriction is unconditional for now). Fixed here without touching
// the in-app notification behavior for those sections.
const NEWSLETTER_NOTIFY_SECTIONS = [
    'devotions'   => ['eyebrow' => 'New Devotion', 'button' => 'Read the Devotion', 'type' => 'devotion', 'email' => true],
    'bible_study' => ['eyebrow' => 'New Bible Study', 'button' => 'Start the Bible Study', 'type' => 'bible_study', 'email' => false],
    'news'        => ['eyebrow' => 'Ministry News', 'button' => 'Read the Full Story', 'type' => 'news', 'email' => true],
    'kids'        => ['eyebrow' => 'New for Children', 'button' => 'Check It Out', 'type' => 'kids', 'email' => false],
];
// A series episode's own section is always media_library or bible_study
// (series.section, migration 018) — never news/devotions — so its
// announcement is always in-app only, same as a plain bible_study item.
const SERIES_EPISODE_EMAIL = false;

/** Path only (no origin) — used for the in-app notification's link_url, which the frontend router resolves client-side. */
function notify_content_path(array $item): string
{
    return match ($item['section']) {
        'bible_study' => '/bible-studies/' . $item['slug'],
        'kids'        => '/kids?item=' . $item['slug'],
        default       => '/content?item=' . $item['slug'],
    };
}

/** Full URL (with origin) — used in the notification email, which is read outside the app. */
function notify_content_url(array $item): string
{
    return rtrim(FRONTEND_URL, '/') . notify_content_path($item);
}

/**
 * Sends the in-app fan-out (always) and the subscriber email (only when
 * $email is true) for one content item, then marks it notified. Shared
 * by both trigger paths below so there is exactly one place that
 * actually sends anything.
 */
function send_content_notification(Content $contentModel, array $item, string $eyebrow, string $button, string $type, bool $email): void
{
    // Atomically claim this item's one-time notification before doing
    // anything else - see Content::claimNewsletterNotification()'s own
    // comment for the exact race (double-click Publish, a retried
    // request, two admins acting on the same item at once) this closes.
    // A losing caller returns immediately having sent nothing at all.
    if (!$contentModel->claimNewsletterNotification((int) $item['id'])) {
        return;
    }

    $subject = $eyebrow . ': ' . $item['title'];

    if ($email) {
        $url = notify_content_url($item);
        $recipients = (new Subscriber())->allSubscribedForNotification();
        $sent = 0;

        foreach ($recipients as $recipient) {
            $unsubscribeUrl = APP_URL . '/newsletter_unsubscribe.php?token=' . urlencode($recipient['token']);
            $html = content_notification_email_html(
                $eyebrow,
                $button,
                $item['title'],
                $item['description'] ?? '',
                $url,
                $unsubscribeUrl,
                $item['publish_date'] ?? $item['created_at'] ?? null,
                $item['thumbnail'] ?? null
            );
            // One failed send (bad address, transient SMTP error) must not
            // stop the rest of the batch — send_email() already returns
            // false rather than throwing, so nothing extra is needed here.
            if (send_email($recipient['email'], $subject, $html)) {
                $sent++;
            }
        }

        error_log("Newsletter: content #{$item['id']} ('{$item['title']}') notified {$sent}/" . count($recipients) . ' subscribers');
    }

    try {
        (new Notification())->broadcastToAllUsers($subject, $item['description'] ?? null, $type, notify_content_path($item));
    } catch (Throwable $e) {
        error_log('In-app notification broadcast failed for content ' . $item['id'] . ': ' . $e->getMessage());
    }
}

function maybe_notify_subscribers_of_new_content(Content $contentModel, int $contentId): void
{
    $item = $contentModel->find($contentId);
    if (!$item) {
        return;
    }
    if ($item['status'] !== 'published') {
        return;
    }
    if (!empty($item['newsletter_notified_at'])) {
        return; // already notified once for this item — never re-send on edit
    }

    // A published item that's also an episode of a series is announced as
    // a new episode instead of a generic section notification, even if its
    // own section (e.g. media_library) wouldn't otherwise trigger one.
    // In-app only (see SERIES_EPISODE_EMAIL's own comment above).
    if (!empty($item['series_id'])) {
        $series = (new Series())->find((int) $item['series_id']);
        $seriesTitle = $series['title'] ?? null;
        send_content_notification(
            $contentModel,
            $item,
            $seriesTitle ? "New Episode: {$seriesTitle}" : 'New Episode',
            'Watch Now',
            'series_episode',
            SERIES_EPISODE_EMAIL
        );
        return;
    }

    if (!isset(NEWSLETTER_NOTIFY_SECTIONS[$item['section']])) {
        return; // only devotions/bible_study/news/kids trigger any notification at all
    }

    $meta = NEWSLETTER_NOTIFY_SECTIONS[$item['section']];
    send_content_notification($contentModel, $item, $meta['eyebrow'], $meta['button'], $meta['type'], $meta['email']);
}

/**
 * Called after SeriesController::attachEpisode() assigns an existing
 * content item to a series. Covers the case where an item was published
 * BEFORE being attached to a series (so the section-based check above
 * already ran and found no series_id yet) — without this, such an item
 * would never get its "New Episode" announcement at all. Attaching a
 * DRAFT item is a no-op here; it's picked up automatically once the item
 * is later published, via the series_id check above.
 */
function maybe_notify_new_episode(Content $contentModel, int $contentId): void
{
    maybe_notify_subscribers_of_new_content($contentModel, $contentId);
}
