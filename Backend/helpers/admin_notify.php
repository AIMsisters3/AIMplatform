<?php
/**
 * AIMsisters - generic admin operational alerts (in-app bell only, no
 * email - these are queues admins already check, same reasoning as
 * shop_notify.php's notify_shop_admins_event(), which this mirrors for
 * every non-Shop source: Contact form messages, new newsletter
 * subscribers, new testimony submissions. Kept separate from
 * shop_notify.php rather than folding Store into this file, so the
 * already-working Store alert path stays untouched.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Notification.php';

/**
 * Fans an admin-only notification out to every admin/superadmin account.
 * @param string $source Category label ('contact', 'subscriptions', 'testimonies', ...) - drives the bell's source tag.
 */
function notify_admins_event(string $title, string $message, string $source, ?string $linkPath = null): void
{
    try {
        $adminIds = Database::getConnection()
            ->query("SELECT id FROM users WHERE role IN ('admin', 'superadmin') AND status = 'active'")
            ->fetchAll(PDO::FETCH_COLUMN);

        $notification = new Notification();
        foreach ($adminIds as $adminId) {
            $notification->create((int) $adminId, $title, $message, $source, $linkPath, 'admin', $source);
        }
    } catch (Throwable $e) {
        error_log("Admin alert ('{$source}') failed: " . $e->getMessage());
    }
}
