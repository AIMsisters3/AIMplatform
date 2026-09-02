<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/upload_validation.php';
require_once __DIR__ . '/../middleware/auth.php';

/**
 * Chunked/resumable upload for large media (multi-GB video). Each HTTP
 * request only ever carries one small chunk (CHUNK_SIZE_MB), so ordinary
 * PHP upload_max_filesize/post_max_size defaults are enough - this exists
 * specifically so a single giant POST (and the exotic php.ini values that
 * would require) is never needed.
 *
 * Chunks are staged outside the public uploads/ webroot
 * (Backend/storage/chunk_uploads/{user_id}/{upload_id}/, blocked by its
 * own .htaccess) until finalize() has assembled and verified the real
 * content of the complete file, at which point it's moved into the same
 * public uploads/{folder}/ location the single-shot endpoint uses, with
 * the same server-generated filename scheme.
 */
class ChunkUploadController
{
    private const ABANDONED_SESSION_MAX_AGE_SECONDS = 86400; // 24h

    /** POST /api/upload/chunk (admin only)
     *  multipart/form-data: chunk (blob), upload_id, chunk_index, total_chunks, filename, folder */
    public function receiveChunk(): void
    {
        $payload = require_role(['admin', 'superadmin']);
        $userId = (int) $payload['sub'];

        $uploadId = $this->validUploadId($_POST['upload_id'] ?? '');
        $chunkIndex = filter_var($_POST['chunk_index'] ?? null, FILTER_VALIDATE_INT);
        $totalChunks = filter_var($_POST['total_chunks'] ?? null, FILTER_VALIDATE_INT);

        if (!$uploadId || $chunkIndex === false || $chunkIndex < 0 || $totalChunks === false || $totalChunks < 1 || $chunkIndex >= $totalChunks) {
            json_error('Invalid chunk upload request.', 422);
        }

        if (!isset($_FILES['chunk'])) {
            if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
                json_error(
                    'That chunk is larger than this server currently allows. This should not normally happen '
                    . 'with the configured chunk size - ask whoever manages the server to check upload_max_filesize/post_max_size in php.ini.',
                    413
                );
            }
            json_error('No chunk uploaded.', 422);
        }

        $chunk = $_FILES['chunk'];
        if ($chunk['error'] === UPLOAD_ERR_INI_SIZE || $chunk['error'] === UPLOAD_ERR_FORM_SIZE) {
            json_error('That chunk is larger than this server currently allows.', 413);
        }
        if ($chunk['error'] !== UPLOAD_ERR_OK) {
            json_error('Chunk upload failed, please retry.', 422);
        }

        $sessionDir = $this->sessionDir($userId, $uploadId);
        if (!is_dir($sessionDir) && !mkdir($sessionDir, 0755, true)) {
            json_error('Could not create upload session.', 500);
        }

        // The first chunk received for a session establishes its metadata
        // (extension, destination folder, expected chunk count). Every
        // later chunk - including retries - must match it, so a client
        // can't smuggle a different file/extension into an existing
        // session mid-upload.
        $metaPath = $sessionDir . '/meta.json';
        if (!is_file($metaPath)) {
            $originalName = (string) ($_POST['filename'] ?? 'upload');
            $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            if (!upload_extension_allowed($ext)) {
                json_error('File type not allowed.', 422);
            }
            $folder = preg_replace('/[^a-z0-9\-]/', '', strtolower($_POST['folder'] ?? 'general'));
            file_put_contents($metaPath, json_encode([
                'ext'          => $ext,
                'folder'       => $folder,
                'total_chunks' => $totalChunks,
                'created_at'   => time(),
            ]));
        } else {
            $meta = json_decode((string) file_get_contents($metaPath), true);
            if (!$meta || (int) $meta['total_chunks'] !== $totalChunks) {
                json_error('Chunk count does not match this upload session.', 422);
            }
        }

        if (!move_uploaded_file($chunk['tmp_name'], $sessionDir . '/chunk.' . $chunkIndex)) {
            json_error('Failed to save chunk.', 500);
        }

        $this->sweepAbandonedSessions($userId, $uploadId);

        json_ok(['received' => $chunkIndex], 'Chunk received.');
    }

    /** GET /api/upload/chunk?upload_id=... - which chunk indices are already on disk, so the client can resume instead of restarting. */
    public function status(): void
    {
        $payload = require_role(['admin', 'superadmin']);
        $userId = (int) $payload['sub'];

        $uploadId = $this->validUploadId($_GET['upload_id'] ?? '');
        if (!$uploadId) {
            json_error('Invalid upload id.', 422);
        }

        $received = [];
        $sessionDir = $this->sessionDir($userId, $uploadId);
        if (is_dir($sessionDir)) {
            foreach (glob($sessionDir . '/chunk.*') ?: [] as $path) {
                if (preg_match('/chunk\.(\d+)$/', $path, $m)) {
                    $received[] = (int) $m[1];
                }
            }
            sort($received);
        }

        json_ok(['received_chunks' => $received]);
    }

    /** DELETE /api/upload/chunk?upload_id=... - cancel an in-progress session (e.g. the admin clicked Remove/Replace mid-upload). */
    public function cancel(): void
    {
        $payload = require_role(['admin', 'superadmin']);
        $userId = (int) $payload['sub'];

        $uploadId = $this->validUploadId($_GET['upload_id'] ?? '');
        if ($uploadId) {
            $this->deleteSession($this->sessionDir($userId, $uploadId));
        }
        json_ok(null, 'Upload session cancelled.');
    }

    /** POST /api/upload/finalize (admin only) body: {upload_id} - assembles the chunks, validates the real file, and publishes it. */
    public function finalize(): void
    {
        $payload = require_role(['admin', 'superadmin']);
        $userId = (int) $payload['sub'];
        $body = get_json_body();

        $uploadId = $this->validUploadId($body['upload_id'] ?? '');
        if (!$uploadId) {
            json_error('Invalid upload id.', 422);
        }

        $sessionDir = $this->sessionDir($userId, $uploadId);
        $metaPath = $sessionDir . '/meta.json';
        if (!is_file($metaPath)) {
            json_error('Upload session not found or already finalized.', 404);
        }

        $meta = json_decode((string) file_get_contents($metaPath), true);
        $totalChunks = (int) ($meta['total_chunks'] ?? 0);
        $ext = (string) ($meta['ext'] ?? '');
        $folder = (string) ($meta['folder'] ?? 'general');

        for ($i = 0; $i < $totalChunks; $i++) {
            if (!is_file($sessionDir . '/chunk.' . $i)) {
                json_error("Upload incomplete - missing chunk $i of $totalChunks. Resume the upload and try again.", 409);
            }
        }

        // Assembling a multi-GB file from disk-backed chunks can take
        // longer than the default execution limit even though each
        // individual chunk upload was fast - raise it just for this
        // request rather than needing a large global php.ini value.
        @set_time_limit(300);

        $assembled = $this->assembleChunks($sessionDir, $totalChunks, $ext);
        if ($assembled === null) {
            $this->deleteSession($sessionDir);
            json_error('Assembled file exceeds the maximum allowed size of ' . MAX_UPLOAD_SIZE_MB . 'MB.', 422);
        }

        if (!upload_content_matches_extension($assembled, $ext)) {
            $this->deleteSession($sessionDir);
            json_error('File content does not match its extension.', 422);
        }

        $targetDir = UPLOAD_DIR . $folder . '/';
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }
        $filename = uniqid('aim_', true) . '.' . $ext;
        $destination = $targetDir . $filename;

        // rename() is an atomic move when both paths are on the same
        // filesystem (the common case here); copy+unlink is the fallback
        // for a storage/ and uploads/ split across filesystems.
        if (!@rename($assembled, $destination)) {
            if (!copy($assembled, $destination)) {
                $this->deleteSession($sessionDir);
                json_error('Failed to save uploaded file.', 500);
            }
        }

        $this->deleteSession($sessionDir);

        json_created([
            'url'      => UPLOAD_URL . $folder . '/' . $filename,
            'filename' => $filename,
            'type'     => upload_type_for_extension($ext),
            'folder'   => $folder,
        ], 'File uploaded successfully.');
    }

    /**
     * Streams each chunk into the assembled file with a small fixed-size
     * read buffer - memory use stays flat (a few MB) no matter how large
     * the final file is, unlike file_get_contents() which would hold each
     * chunk fully in memory. Returns the assembled file path, or null if
     * the running total exceeds MAX_UPLOAD_SIZE_MB (aborting immediately
     * rather than finishing a write that will only be discarded).
     */
    private function assembleChunks(string $sessionDir, int $totalChunks, string $ext): ?string
    {
        $maxBytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
        $assembledPath = $sessionDir . '/assembled.' . $ext;
        $out = fopen($assembledPath, 'wb');
        if (!$out) {
            return null;
        }

        $totalBytes = 0;
        for ($i = 0; $i < $totalChunks; $i++) {
            $in = fopen($sessionDir . '/chunk.' . $i, 'rb');
            while (!feof($in)) {
                $buf = fread($in, 1024 * 1024); // 1MB read buffer
                if ($buf === false) {
                    break;
                }
                $totalBytes += strlen($buf);
                if ($totalBytes > $maxBytes) {
                    fclose($in);
                    fclose($out);
                    return null;
                }
                fwrite($out, $buf);
            }
            fclose($in);
        }
        fclose($out);

        return $assembledPath;
    }

    /** Strict format check doubles as the only defense needed against path traversal - this value becomes a directory name. */
    private function validUploadId(?string $raw): ?string
    {
        return $raw && preg_match('/^[a-f0-9-]{16,64}$/i', $raw) ? $raw : null;
    }

    private function sessionDir(int $userId, string $uploadId): string
    {
        return CHUNK_UPLOAD_DIR . $userId . '/' . $uploadId;
    }

    private function deleteSession(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        foreach (glob($dir . '/*') ?: [] as $f) {
            @unlink($f);
        }
        @rmdir($dir);
    }

    /**
     * Best-effort cleanup of this user's OTHER stale sessions (e.g. a tab
     * closed mid-upload and never resumed) - runs opportunistically on
     * every chunk received rather than needing a cron job.
     */
    private function sweepAbandonedSessions(int $userId, string $exceptUploadId): void
    {
        $userDir = CHUNK_UPLOAD_DIR . $userId;
        if (!is_dir($userDir)) {
            return;
        }
        foreach (glob($userDir . '/*', GLOB_ONLYDIR) ?: [] as $dir) {
            if (basename($dir) === $exceptUploadId) {
                continue;
            }
            $metaPath = $dir . '/meta.json';
            $createdAt = 0;
            if (is_file($metaPath)) {
                $meta = json_decode((string) file_get_contents($metaPath), true);
                $createdAt = (int) ($meta['created_at'] ?? 0);
            }
            if ($createdAt && (time() - $createdAt) > self::ABANDONED_SESSION_MAX_AGE_SECONDS) {
                $this->deleteSession($dir);
            }
        }
    }
}
