<?php
/**
 * Read-only, no-auth diagnostic page for tracing the exact bug class
 * that has caused "thumbnails/media not displaying" repeatedly on this
 * deployment: APP_URL misconfiguration. Reveals nothing sensitive —
 * APP_URL is not a secret (it's embedded in every public media URL
 * already), and uploads/ filenames are server-generated uniqid()
 * values, not meaningful on their own. Safe to leave on the server, but
 * fine to delete once deployment is confirmed working.
 *
 * Visit this file directly in a browser: https://yoursite.com/server/diagnostics.php
 */
require_once __DIR__ . '/config/config.php';

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

$folders = ['thumbnails', 'videos', 'audio', 'documents', 'general'];
$scans = [];
foreach ($folders as $f) {
    $scans[$f] = scan_uploads_folder(UPLOAD_DIR . $f);
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>AIMsisters — Deployment Diagnostics</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; background:#f8f7fd; color:#2d2a4a; max-width:800px; margin:40px auto; padding:0 20px; line-height:1.6; }
  h1 { font-size: 22px; }
  h2 { font-size: 16px; margin-top: 32px; border-bottom: 2px solid #7a2cf3; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  td, th { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e2f0; font-size: 14px; }
  th { color: #7a2cf3; }
  code { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 13px; word-break: break-all; }
  .ok { color: #059669; font-weight: bold; }
  .bad { color: #dc2626; font-weight: bold; }
  .example { background: #fff; border: 1px solid #e5e2f0; border-radius: 10px; padding: 16px; margin-top: 8px; }
</style>
</head>
<body>
<h1>AIMsisters Deployment Diagnostics</h1>
<p>This page checks the exact configuration that has caused thumbnail/media display problems. Read the values below carefully.</p>

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
(e.g. <code>https://aimsisters.unaux.com/server</code>) — no trailing slash, and it must match where you actually
uploaded the Backend folder on the server. If it says <code>http://localhost/...</code>, your live <code>.env</code>
file is missing or not being read.
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

<h2>3. Example: what a real thumbnail URL looks like right now</h2>
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
<?php if ($exampleFile): ?>
<div class="example">
  <p>A real file found on disk: <code>uploads/<?= htmlspecialchars($exampleFolder) ?>/<?= htmlspecialchars($exampleFile) ?></code></p>
  <p>Using the CURRENT APP_URL above, this file's public URL is:</p>
  <p><code><?= htmlspecialchars(UPLOAD_URL . $exampleFolder . '/' . $exampleFile) ?></code></p>
  <p><a href="<?= htmlspecialchars(UPLOAD_URL . $exampleFolder . '/' . $exampleFile) ?>" target="_blank">→ Click here to open it directly</a>.
  If it loads (an image, video, or audio file plays), your server configuration is correct and any remaining display
  problem is in the DATABASE ROW for a specific piece of content (its stored URL is being self-healed to this same
  APP_URL automatically at read time — see Backend/helpers/media_url.php — so if this link works, every content
  item's thumbnail/media should now display correctly on the public site too, once the latest code is uploaded).
  If it does NOT load, the problem is server-side (permissions, .htaccess, or the file didn't really upload).</p>
</div>
<?php else: ?>
<p class="bad">No uploaded files were found in any uploads/ subfolder at all. Either nothing has been uploaded yet,
or this script is looking in the wrong place (UPLOAD_DIR = <code><?= htmlspecialchars(UPLOAD_DIR) ?></code>) —
confirm that path actually matches where your uploads/ folder lives on the server.</p>
<?php endif; ?>

<p style="margin-top:40px; font-size:12px; color:#8b879e;">Delete this file (Backend/diagnostics.php) once you've finished checking — it's safe to leave, but no longer needed after deployment is confirmed working.</p>
</body>
</html>
