-- =========================================================
-- Migration 009: free single-step newsletter subscriptions + publish
-- notifications
--
-- newsletter_subscribers (migration 003) already had everything needed:
-- id, email (unique), token, status, language, subscribed_at,
-- confirmed_at. That table isn't touched structurally here except for
-- one addition (unsubscribed_at, for admin visibility - see §12 of the
-- request this implements). What actually changes is behavior, in code:
-- subscribing now sets status='subscribed' immediately instead of
-- 'pending' pending a confirmation-email click (which left a subscriber
-- stuck forever if SMTP wasn't configured - a real bug, not a design
-- choice). The same `token` column is reused for its new job: an
-- unsubscribe link instead of a confirm link.
--
-- content.newsletter_notified_at is new: it's how ContentController
-- avoids emailing subscribers again every time an admin edits an
-- already-published devotion/Bible study/news item - a notification
-- fires once, the first time an item becomes published, and this column
-- remembers that it already happened.
-- =========================================================

ALTER TABLE newsletter_subscribers
  ADD COLUMN unsubscribed_at DATETIME NULL AFTER confirmed_at;

ALTER TABLE content
  ADD COLUMN newsletter_notified_at DATETIME NULL AFTER allow_comments;

-- Backfill: every devotion/Bible study/news item that is ALREADY
-- published as of this migration must be marked as already-notified.
-- Without this, the very next time an admin edits any existing
-- published devotion/study/news item, ContentController would see
-- newsletter_notified_at IS NULL and (incorrectly) email every
-- subscriber about "new" content that isn't new at all.
UPDATE content
SET newsletter_notified_at = COALESCE(publish_date, created_at)
WHERE status = 'published'
  AND section IN ('devotions', 'bible_study', 'news')
  AND newsletter_notified_at IS NULL;
