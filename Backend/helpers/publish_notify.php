<?php
/**
 * Emails subscribers when a devotion, Bible study, or news item is newly
 * published — called from ContentController::store()/update() after the
 * content row is already persisted.
 *
 * "Newly" is the whole point here: this must fire once per item, the
 * first time it becomes published, never again on a later edit while it
 * stays published. content.newsletter_notified_at (migration 009) is
 * what makes that safe to call on every single save without re-checking
 * caller-side state — the guard lives here, not scattered across every
 * call site.
 */

require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/../models/Content.php';
require_once __DIR__ . '/../models/Subscriber.php';
require_once __DIR__ . '/../emails/content_notification_template.php';

const NEWSLETTER_NOTIFY_SECTIONS = [
    'devotions'   => ['eyebrow' => 'New Devotion', 'button' => 'Read the Devotion'],
    'bible_study' => ['eyebrow' => 'New Bible Study', 'button' => 'Start the Bible Study'],
    'news'        => ['eyebrow' => 'Ministry News', 'button' => 'Read the Full Story'],
];

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
    if (!isset(NEWSLETTER_NOTIFY_SECTIONS[$item['section']])) {
        return; // only devotions/bible_study/news trigger a notification
    }

    $meta = NEWSLETTER_NOTIFY_SECTIONS[$item['section']];

    $url = $item['section'] === 'bible_study'
        ? rtrim(FRONTEND_URL, '/') . '/bible-studies/' . $item['slug']
        : rtrim(FRONTEND_URL, '/') . '/content?item=' . $item['slug'];

    $recipients = (new Subscriber())->allSubscribedForNotification();

    $subject = $meta['eyebrow'] . ': ' . $item['title'];

    foreach ($recipients as $recipient) {
        $unsubscribeUrl = APP_URL . '/newsletter_unsubscribe.php?token=' . urlencode($recipient['token']);
        $html = content_notification_email_html(
            $meta['eyebrow'],
            $meta['button'],
            $item['title'],
            $item['description'] ?? '',
            $url,
            $unsubscribeUrl
        );
        // One failed send (bad address, transient SMTP error) must not
        // stop the rest of the batch — send_email() already returns
        // false rather than throwing, so nothing extra is needed here.
        send_email($recipient['email'], $subject, $html);
    }

    $contentModel->markNewsletterNotified($contentId);
}
