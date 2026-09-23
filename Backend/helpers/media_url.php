<?php
/**
 * Self-healing media URL normalization.
 *
 * UploadController/ChunkUploadController bake a full absolute URL into
 * content.thumbnail/content.media_url (and equivalents elsewhere) at the
 * moment a file is uploaded, built from APP_URL as it was configured
 * THAT DAY. If APP_URL was ever wrong at upload time - unset .env,
 * localhost's default, a typo'd domain, moving hosts - that row's URL
 * is wrong forever, even after APP_URL is later fixed, since nothing
 * re-derives it. This rewrites any stored URL to always point at the
 * CURRENT APP_URL/uploads/ at read time, so a config fix instantly
 * repairs every existing row with no data migration needed, and a
 * future host move never breaks old content again.
 *
 * Anything that isn't one of our own /uploads/... URLs (a YouTube
 * embed link, an external live-stream URL, null) passes through
 * unchanged.
 */
function normalize_media_url(?string $url): ?string
{
    if (!$url) {
        return $url;
    }

    $marker = 'uploads/';
    $pos = strpos($url, $marker);
    if ($pos === false) {
        return $url;
    }

    return rtrim(APP_URL, '/') . '/' . $marker . substr($url, $pos + strlen($marker));
}

/** Applies normalize_media_url() to a content-like row's thumbnail/media_url fields, if present. */
function normalize_media_row(array $row): array
{
    if (array_key_exists('thumbnail', $row)) {
        $row['thumbnail'] = normalize_media_url($row['thumbnail']);
    }
    if (array_key_exists('media_url', $row)) {
        $row['media_url'] = normalize_media_url($row['media_url']);
    }
    return $row;
}
