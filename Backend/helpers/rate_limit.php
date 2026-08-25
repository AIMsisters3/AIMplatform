<?php
/**
 * AIMsisters - Minimal fixed-window rate limiter.
 *
 * No external service (Redis/Memcached) required — safe for a single-server
 * XAMPP/shared-hosting deployment. Counters live in the OS temp dir (never
 * web-accessible) and use flock() for atomic increments across requests.
 * If storage is unavailable for any reason this fails OPEN (allows the
 * request) rather than taking the whole API down over a filesystem hiccup.
 */

require_once __DIR__ . '/response.php';

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

/**
 * Sends a 429 and exits if $key has been hit more than $maxAttempts times
 * within the last $windowSeconds. Otherwise records this attempt and
 * returns normally.
 */
function rate_limit_check(string $key, int $maxAttempts, int $windowSeconds): void
{
    $dir = sys_get_temp_dir() . '/aimsisters_ratelimit';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return; // can't create storage — fail open
    }

    $safeKey = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $key);
    $file = $dir . '/' . $safeKey . '.json';

    $fp = @fopen($file, 'c+');
    if (!$fp) {
        return; // fail open
    }

    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $data = json_decode((string) $raw, true);
    if (!is_array($data) || !isset($data['count'], $data['window_start'])) {
        $data = ['count' => 0, 'window_start' => time()];
    }

    $now = time();
    if ($now - (int) $data['window_start'] >= $windowSeconds) {
        $data = ['count' => 0, 'window_start' => $now];
    }
    $data['count']++;

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    if ($data['count'] > $maxAttempts) {
        json_error('Too many attempts. Please wait a few minutes and try again.', 429);
    }
}
