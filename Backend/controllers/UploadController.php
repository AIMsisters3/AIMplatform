<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class UploadController
{
    /** GET /api/upload/limits - lets the frontend read the real server-configured
     *  upload ceiling/allowed types instead of hardcoding them, so they can never drift out of sync. */
    public function limits(): void
    {
        json_ok([
            'max_size_mb'         => MAX_UPLOAD_SIZE_MB,
            'allowed_image_types' => ALLOWED_IMAGE_TYPES,
            'allowed_video_types' => ALLOWED_VIDEO_TYPES,
            'allowed_audio_types' => ALLOWED_AUDIO_TYPES,
            'allowed_doc_types'   => ALLOWED_DOC_TYPES,
        ]);
    }

    /** POST /api/upload (admin only) multipart/form-data field: "file", "folder" optional */
    public function store(): void
    {
        require_role(['admin', 'superadmin']);

        if (!isset($_FILES['file'])) {
            // If the whole request body exceeded PHP's post_max_size, PHP
            // silently drops $_FILES (and $_POST) entirely instead of
            // reporting an error code on it - Content-Length is still
            // present on the request, so that's the only way to tell this
            // apart from "no file was actually selected".
            if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
                json_error(
                    'That file is larger than this server currently allows (post_max_size in php.ini / Backend/.user.ini). '
                    . 'Ask whoever manages the server to raise it.',
                    413
                );
            }
            json_error('No file uploaded.', 422);
        }

        $file = $_FILES['file'];

        if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) {
            json_error(
                'That file is larger than this server currently allows (upload_max_filesize in php.ini / Backend/.user.ini). '
                . 'Ask whoever manages the server to raise it.',
                413
            );
        }
        if ($file['error'] !== UPLOAD_ERR_OK) {
            json_error('No file uploaded or upload error occurred.', 422);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        $allExtensions = array_merge(ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, ALLOWED_AUDIO_TYPES, ALLOWED_DOC_TYPES);
        if (!in_array($ext, $allExtensions, true)) {
            json_error('File type not allowed.', 422);
        }

        $maxBytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
        if ($file['size'] > $maxBytes) {
            json_error('File exceeds maximum size of ' . MAX_UPLOAD_SIZE_MB . 'MB.', 422);
        }

        // Sniff the actual file content, not just the claimed extension —
        // a file called photo.jpg that is really a PHP script should still
        // be rejected. Uploads are also renamed below and uploads/.htaccess
        // refuses to execute scripts in that directory, so this is a second
        // independent layer rather than the only one.
        if (!$this->contentMatchesExtension($file['tmp_name'], $ext)) {
            json_error('File content does not match its extension.', 422);
        }

        $folder = preg_replace('/[^a-z0-9\-]/', '', strtolower($_POST['folder'] ?? 'general'));
        $targetDir = UPLOAD_DIR . $folder . '/';

        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $filename = uniqid('aim_', true) . '.' . $ext;
        $destination = $targetDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            json_error('Failed to save uploaded file.', 500);
        }

        $type = in_array($ext, ALLOWED_IMAGE_TYPES, true) ? 'image'
            : (in_array($ext, ALLOWED_VIDEO_TYPES, true) ? 'video'
            : (in_array($ext, ALLOWED_AUDIO_TYPES, true) ? 'audio' : 'document'));

        json_created([
            'url'      => UPLOAD_URL . $folder . '/' . $filename,
            'filename' => $filename,
            'type'     => $type,
            'folder'   => $folder,
        ], 'File uploaded successfully.');
    }

    /**
     * Confirms the uploaded file's real MIME type (via fileinfo, which
     * reads magic bytes rather than trusting the client) is plausible for
     * its extension. Intentionally permissive within each family — media
     * containers report many different MIME strings across browsers/OSes —
     * the goal is only to catch a script/executable masquerading as media,
     * not to build a strict codec whitelist.
     */
    private function contentMatchesExtension(string $tmpPath, string $ext): bool
    {
        if (!function_exists('finfo_open')) {
            return true; // fileinfo not available on this PHP build — skip rather than block all uploads
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $tmpPath);
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
}
