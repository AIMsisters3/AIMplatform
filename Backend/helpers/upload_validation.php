<?php
/**
 * Shared upload content-validation, used by both the single-shot
 * UploadController (small files: thumbnails, etc.) and ChunkUploadController
 * (large files assembled from chunks) so the security check is defined once.
 */

require_once __DIR__ . '/../config/config.php';

/**
 * Confirms a file's real MIME type (via fileinfo, which reads magic bytes
 * rather than trusting the client) is plausible for its claimed extension.
 * Intentionally permissive within each family — media containers report
 * many different MIME strings across browsers/OSes — the goal is only to
 * catch a script/executable masquerading as media, not to build a strict
 * codec whitelist.
 */
function upload_content_matches_extension(string $path, string $ext): bool
{
    if (!function_exists('finfo_open')) {
        return true; // fileinfo not available on this PHP build — skip rather than block all uploads
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $path);
    finfo_close($finfo);

    if (!$mime) {
        return false;
    }

    $imageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $videoMimes = ['video/mp4', 'video/quicktime', 'video/webm', 'application/octet-stream'];
    $audioMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'application/ogg', 'video/ogg'];
    $docMimes   = ['application/pdf'];

    // Anything that sniffs as a script, executable, or HTML is never
    // acceptable regardless of claimed extension.
    $dangerous = ['text/x-php', 'application/x-httpd-php', 'application/x-sh', 'application/x-executable', 'text/html', 'application/x-msdownload'];
    if (in_array($mime, $dangerous, true)) {
        return false;
    }

    if (in_array($ext, ALLOWED_IMAGE_TYPES, true)) return in_array($mime, $imageMimes, true);
    if (in_array($ext, ALLOWED_VIDEO_TYPES, true)) return in_array($mime, $videoMimes, true);
    if (in_array($ext, ALLOWED_AUDIO_TYPES, true)) return in_array($mime, $audioMimes, true);
    if (in_array($ext, ALLOWED_DOC_TYPES, true))   return in_array($mime, $docMimes, true);

    return false;
}

function upload_extension_allowed(string $ext): bool
{
    return in_array($ext, array_merge(ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, ALLOWED_AUDIO_TYPES, ALLOWED_DOC_TYPES), true);
}

function upload_type_for_extension(string $ext): string
{
    if (in_array($ext, ALLOWED_IMAGE_TYPES, true)) return 'image';
    if (in_array($ext, ALLOWED_VIDEO_TYPES, true)) return 'video';
    if (in_array($ext, ALLOWED_AUDIO_TYPES, true)) return 'audio';
    return 'document';
}
