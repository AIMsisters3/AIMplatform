<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/upload_validation.php';
require_once __DIR__ . '/../middleware/auth.php';

class UploadController
{
    /** GET /api/upload/limits - lets the frontend read the real server-configured
     *  upload ceiling/chunk size/allowed types instead of hardcoding them, so they can never drift out of sync. */
    public function limits(): void
    {
        json_ok([
            'max_size_mb'         => MAX_UPLOAD_SIZE_MB,
            'chunk_size_mb'       => CHUNK_SIZE_MB,
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

        if (!upload_extension_allowed($ext)) {
            json_error('File type not allowed.', 422);
        }

        $maxBytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
        if ($file['size'] > $maxBytes) {
            json_error(
                'File exceeds the maximum allowed size of ' . MAX_UPLOAD_SIZE_MB . 'MB. '
                . 'For very large video/audio files, use the chunked upload (this happens automatically from the Upload Content page).',
                422
            );
        }

        // Sniff the actual file content, not just the claimed extension —
        // a file called photo.jpg that is really a PHP script should still
        // be rejected. Uploads are also renamed below and uploads/.htaccess
        // refuses to execute scripts in that directory, so this is a second
        // independent layer rather than the only one.
        if (!upload_content_matches_extension($file['tmp_name'], $ext)) {
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

        json_created([
            'url'      => UPLOAD_URL . $folder . '/' . $filename,
            'filename' => $filename,
            'type'     => upload_type_for_extension($ext),
            'folder'   => $folder,
        ], 'File uploaded successfully.');
    }
}
