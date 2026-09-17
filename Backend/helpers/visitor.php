<?php
/**
 * AIMsisters - Anonymous visitor identification
 *
 * A long-lived, unguessable cookie identifies a browser across visits
 * without requiring login, purely so content view counts (see migration
 * 011) can tell repeat views from the same guest apart from a genuinely
 * new one. Not used for anything security-sensitive — if it's missing or
 * cleared, a new one is just issued and that guest is counted as new.
 */

function get_visitor_key(): string
{
    $existing = $_COOKIE['aim_visitor'] ?? '';
    if (preg_match('/^[a-f0-9]{32}$/', $existing)) {
        return $existing;
    }

    $key = bin2hex(random_bytes(16));
    setcookie('aim_visitor', $key, [
        'expires'  => time() + 60 * 60 * 24 * 365 * 2, // 2 years
        'path'     => '/',
        'secure'   => !empty($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    $_COOKIE['aim_visitor'] = $key; // available to the rest of this request too

    return $key;
}
