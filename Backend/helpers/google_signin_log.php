<?php

/**
 * Writes one diagnostic line to both PHP's normal error_log AND a
 * dedicated Backend/storage/logs/google_signin.log file — same
 * two-destination reasoning as Backend/helpers/mailer.php's mailer_log():
 * XAMPP's error_log path varies by install, this one is always in a fixed,
 * predictable place inside the project itself.
 *
 * AuthController::verifyGoogleIdToken() has four different ways to end up
 * returning null, all of which surface to the user as the exact same
 * "Could not verify Google sign-in" message — this is what actually tells
 * them (or whoever reads the log) which one it was. Never pass anything
 * secret to this: a Google OAuth Client ID (GOOGLE_CLIENT_ID, and a
 * token's own `aud` claim) is a public value by Google's own design, not a
 * credential — already established when it was first set up — and
 * everything else logged here (curl_error()'s message, Google's tokeninfo
 * HTTP status/response body) only ever describes the request, never
 * anything from inside this app.
 */
function google_signin_log(string $line): void
{
    error_log($line);
    $dir = __DIR__ . '/../storage/logs';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    @file_put_contents($dir . '/google_signin.log', '[' . date('Y-m-d H:i:s') . '] ' . $line . "\n", FILE_APPEND);
}
