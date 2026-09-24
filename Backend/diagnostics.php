<?php
/**
 * Read-only, no-auth diagnostic page for tracing the exact bug class
 * that has caused "thumbnails/media not displaying" repeatedly on this
 * deployment. Reveals nothing sensitive — APP_URL is not a secret (it's
 * embedded in every public media URL already), uploads/ filenames are
 * server-generated uniqid() values, and DB thumbnail paths are the same
 * thing every visitor's browser already requests. Safe to leave on the
 * server, but fine to delete once deployment is confirmed working.
 *
 * Unlike the previous version of this page (which only showed you a
 * link to click yourself), this one has the SERVER fetch its own
 * uploads/ URLs live and report back the real HTTP status/content-type
 * it got — the same "does an actual thumbnail URl load" test item 18
 * of the request asks for, just automated instead of manual.
 *
 * Visit this file directly in a browser: https://yoursite.com/server/diagnostics.php
 */
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/media_url.php';

function scan_uploads_folder(string $dir, int $limit = 3): array
{
    if (!is_dir($dir)) {
        return ['exists' => false, 'count' => 0, 'sample' => []];
    }
    $files = array_values(array_diff(scandir($dir), ['.', '..', '.htaccess']));
    return [
        'exists' => true,
        'count'  => count($files),
        'sample' => array_slice($files, 0, $limit),
    ];
}

/**
 * Has the server fetch a URL itself and report back what it actually
 * got — the same thing a browser would do, just automated. Prefers
 * cURL (handles redirects/SSL cleanly); falls back to get_headers()
 * (only needs allow_url_fopen, no extension) if cURL isn't available.
 */
function live_fetch_check(string $url): array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
            CURLOPT_TIMEOUT        => 8,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body = curl_exec($ch);
        $err = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $effectiveUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        curl_close($ch);

        if ($err) {
            return ['method' => 'curl', 'ok' => false, 'error' => $err, 'status' => null, 'content_type' => null, 'effective_url' => null, 'body_preview' => null];
        }
        $isImage = $contentType && str_starts_with($contentType, 'image/');
        return [
            'method'        => 'curl',
            'ok'            => $status >= 200 && $status < 300 && $isImage,
            'status'        => $status,
            'content_type'  => $contentType,
            'effective_url' => $effectiveUrl,
            'body_preview'  => $isImage ? null : substr(preg_replace('/\s+/', ' ', strip_tags((string) $body)), 0, 200),
            'error'         => null,
        ];
    }

    $headers = @get_headers($url, true);
    if ($headers === false) {
        return ['method' => 'get_headers', 'ok' => false, 'error' => 'Could not connect at all (allow_url_fopen may be disabled on this host, or the URL is unreachable).', 'status' => null, 'content_type' => null, 'effective_url' => null, 'body_preview' => null];
    }
    $statusLine = is_array($headers[0] ?? null) ? end($headers[0]) : ($headers[0] ?? '');
    preg_match('/\s(\d{3})\s/', $statusLine, $m);
    $status = isset($m[1]) ? (int) $m[1] : null;
    $contentType = $headers['Content-Type'] ?? null;
    if (is_array($contentType)) {
        $contentType = end($contentType);
    }
    $isImage = $contentType && str_starts_with($contentType, 'image/');
    return [
        'method'        => 'get_headers',
        'ok'            => $status !== null && $status >= 200 && $status < 300 && $isImage,
        'status'        => $status,
        'content_type'  => $contentType,
        'effective_url' => null,
        'body_preview'  => null,
        'error'         => null,
    ];
}

$folders = ['thumbnails', 'videos', 'audio', 'documents', 'general'];
$scans = [];
foreach ($folders as $f) {
    $scans[$f] = scan_uploads_folder(UPLOAD_DIR . $f);
}

// Real DB rows — this is what item 18 of the request actually asks for
// ("take one existing uploaded thumbnail FROM THE DATABASE"), not just
// whatever happens to be sitting in the folder.
$dbRows = [];
$dbError = null;
try {
    $db = Database::getConnection();
    $stmt = $db->query(
        "SELECT id, title, thumbnail FROM content WHERE thumbnail IS NOT NULL AND thumbnail <> '' ORDER BY id DESC LIMIT 5"
    );
    foreach ($stmt->fetchAll() as $row) {
        $dbRows[] = [
            'id'             => $row['id'],
            'title'          => $row['title'],
            'stored_raw'     => $row['thumbnail'],
            'normalized_url' => normalize_media_url($row['thumbnail']),
        ];
    }
} catch (Throwable $e) {
    $dbError = $e->getMessage();
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>AIMsisters — Deployment Diagnostics</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; background:#f8f7fd; color:#2d2a4a; max-width:900px; margin:40px auto; padding:0 20px; line-height:1.6; }
  h1 { font-size: 22px; }
  h2 { font-size: 16px; margin-top: 32px; border-bottom: 2px solid #7a2cf3; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  td, th { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e2f0; font-size: 14px; vertical-align: top; }
  th { color: #7a2cf3; }
  code { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 13px; word-break: break-all; }
  .ok { color: #059669; font-weight: bold; }
  .bad { color: #dc2626; font-weight: bold; }
  .example { background: #fff; border: 1px solid #e5e2f0; border-radius: 10px; padding: 16px; margin-top: 8px; }
  .row-card { background: #fff; border: 1px solid #e5e2f0; border-radius: 10px; padding: 16px; margin-top: 12px; }
</style>
</head>
<body>
<h1>AIMsisters Deployment Diagnostics</h1>
<p>This page checks the exact configuration that has caused thumbnail/media display problems, and has the server fetch a few real thumbnail URLs itself to show you exactly what happens — no guessing, no manual clicking required.</p>

<h2>1. Current configuration</h2>
<table>
<tr><th>Setting</th><th>Value</th></tr>
<tr><td>APP_ENV</td><td><code><?= htmlspecialchars(APP_ENV) ?></code></td></tr>
<tr><td>APP_URL</td><td><code><?= htmlspecialchars(APP_URL) ?></code></td></tr>
<tr><td>FRONTEND_URL</td><td><code><?= htmlspecialchars(FRONTEND_URL) ?></code></td></tr>
<tr><td>UPLOAD_URL (derived)</td><td><code><?= htmlspecialchars(UPLOAD_URL) ?></code></td></tr>
</table>
<p>
<strong>Check this:</strong> APP_URL should be the exact public URL where your Backend folder is reachable
(e.g. <code>https://aimsisters.unaux.com/server</code>) — no trailing slash, and <strong>no <code>/index.php</code> or <code>/api</code> suffix</strong>
(that suffix is only correct for API calls — see <code>Frontend/src/api/axios.js</code> — and is a very easy mistake to
make here since it's what you'll see in your browser's network tab for every API request). It must match where you
actually uploaded the Backend folder on the server. If it says <code>http://localhost/...</code>, your live
<code>.env</code> file is missing or not being read.
</p>

<h2>2. Do uploaded files actually exist on disk?</h2>
<table>
<tr><th>Folder</th><th>Exists</th><th>File count</th><th>Sample filenames</th></tr>
<?php foreach ($scans as $folder => $info): ?>
<tr>
  <td><code>uploads/<?= htmlspecialchars($folder) ?>/</code></td>
  <td class="<?= $info['exists'] ? 'ok' : 'bad' ?>"><?= $info['exists'] ? 'Yes' : 'MISSING' ?></td>
  <td><?= $info['count'] ?></td>
  <td><?= $info['sample'] ? htmlspecialchars(implode(', ', $info['sample'])) : '(none)' ?></td>
</tr>
<?php endforeach; ?>
</table>

<h2>3. Live test: real thumbnail URLs from the database</h2>
<?php if ($dbError): ?>
  <p class="bad">Could not query the database: <?= htmlspecialchars($dbError) ?></p>
<?php elseif (!$dbRows): ?>
  <p>No content rows with a thumbnail exist yet — nothing to test here. Upload and publish something with a thumbnail, then reload this page.</p>
<?php else: ?>
  <p>The server just fetched each of these URLs itself, live, the same way a visitor's browser would — this tells you definitively whether the problem is server-side or not.</p>
  <?php foreach ($dbRows as $row):
        $check = live_fetch_check($row['normalized_url']);
  ?>
  <div class="row-card">
    <p><strong>content.id = <?= (int) $row['id'] ?></strong> — <?= htmlspecialchars($row['title']) ?></p>
    <p>Stored in DB as: <code><?= htmlspecialchars($row['stored_raw']) ?></code></p>
    <p>Resolved (current APP_URL) to: <code><?= htmlspecialchars($row['normalized_url']) ?></code></p>
    <p>
      Live fetch result (via <?= htmlspecialchars($check['method']) ?>):
      <?php if ($check['error']): ?>
        <span class="bad">FAILED — <?= htmlspecialchars($check['error']) ?></span>
      <?php elseif ($check['ok']): ?>
        <span class="ok">OK — HTTP <?= (int) $check['status'] ?>, Content-Type: <?= htmlspecialchars($check['content_type']) ?></span>
      <?php else: ?>
        <span class="bad">BROKEN — HTTP <?= $check['status'] !== null ? (int) $check['status'] : '(no response)' ?>, Content-Type: <?= htmlspecialchars($check['content_type'] ?? '(none)') ?></span>
        <?php if ($check['body_preview']): ?>
          <br>Response body started with: <code><?= htmlspecialchars($check['body_preview']) ?></code>
          <?php if (str_contains($check['body_preview'], 'Route not found') || str_contains($check['body_preview'], 'route not found')): ?>
            <br><strong>This is the "routed through index.php" bug</strong> — the image URL is being intercepted by the API router instead of being served as a static file. Check that APP_URL does not include <code>/index.php</code> (see section 1 above).
          <?php elseif (str_starts_with(trim($check['body_preview']), '<!doctype') || str_starts_with(trim($check['body_preview']), '<html')): ?>
            <br><strong>This looks like the frontend's <code>index.html</code></strong> being returned instead of the image — check that this URL isn't accidentally being served from the Frontend's docroot/SPA-fallback instead of the Backend's <code>uploads/</code> folder.
          <?php endif; ?>
        <?php endif; ?>
      <?php endif; ?>
    </p>
  </div>
  <?php endforeach; ?>
<?php endif; ?>

<h2>4. Example from the filesystem scan</h2>
<?php
$exampleFolder = null;
$exampleFile = null;
foreach ($scans as $folder => $info) {
    if ($info['exists'] && $info['sample']) {
        $exampleFolder = $folder;
        $exampleFile = $info['sample'][0];
        break;
    }
}
?>
<?php if ($exampleFile):
    $exampleUrl = UPLOAD_URL . $exampleFolder . '/' . $exampleFile;
    $exampleCheck = live_fetch_check($exampleUrl);
?>
<div class="example">
  <p>A real file found on disk: <code>uploads/<?= htmlspecialchars($exampleFolder) ?>/<?= htmlspecialchars($exampleFile) ?></code></p>
  <p>Using the CURRENT APP_URL above, this file's public URL is:</p>
  <p><code><?= htmlspecialchars($exampleUrl) ?></code></p>
  <p>Live fetch result:
    <?php if ($exampleCheck['ok']): ?>
      <span class="ok">OK — HTTP <?= (int) $exampleCheck['status'] ?>, Content-Type: <?= htmlspecialchars($exampleCheck['content_type']) ?></span>
    <?php else: ?>
      <span class="bad">BROKEN — HTTP <?= $exampleCheck['status'] !== null ? (int) $exampleCheck['status'] : '(no response)' ?>, Content-Type: <?= htmlspecialchars($exampleCheck['content_type'] ?? '(none)') ?></span>
    <?php endif; ?>
  </p>
  <p><a href="<?= htmlspecialchars($exampleUrl) ?>" target="_blank">→ Open it directly yourself too</a>, to double-check with your own eyes/browser.</p>
</div>
<?php else: ?>
<p class="bad">No uploaded files were found in any uploads/ subfolder at all. Either nothing has been uploaded yet,
or this script is looking in the wrong place (UPLOAD_DIR = <code><?= htmlspecialchars(UPLOAD_DIR) ?></code>) —
confirm that path actually matches where your uploads/ folder lives on the server.</p>
<?php endif; ?>

<p style="margin-top:40px; font-size:12px; color:#8b879e;">Delete this file (Backend/diagnostics.php) once you've finished checking — it's safe to leave, but no longer needed after deployment is confirmed working.</p>
</body>
</html>
