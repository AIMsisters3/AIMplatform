<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/models/Content.php';

$slug  = $_GET['slug'] ?? '';
$model = new Content();
$item  = $slug ? $model->findBySlug($slug) : null;

$target = $item
    ? FRONTEND_URL . '/content?item=' . urlencode($item['slug'])
    : FRONTEND_URL . '/content';

$title       = $item['title'] ?? 'AIMsisters';
$description = $item['description'] ?? 'Sharing the Everlasting Gospel through Modern Technology';
// '/src/assets/bg.png' used to be here - a source-code path that only
// exists before Vite builds the frontend (the deployed site only ever
// serves a content-hashed '/assets/bg-xxxxx.png', never this literal
// path), so it 404'd for every share of an item with no thumbnail.
// Backend/assets/logo.png is a real, stable, never-hashed file already
// served at this exact URL (see MAIL_LOGO_URL in config.php, the same
// asset emails already use for the same "needs a fixed URL" reason).
$image       = $item['thumbnail'] ?? (APP_URL . '/assets/logo.png');
?>
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title><?= htmlspecialchars($title) ?></title>
  <meta property="og:title" content="<?= htmlspecialchars($title) ?>">
  <meta property="og:description" content="<?= htmlspecialchars($description) ?>">
  <meta property="og:image" content="<?= htmlspecialchars($image) ?>">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta http-equiv="refresh" content="0; url=<?= htmlspecialchars($target) ?>">
  <script>window.location.replace(<?= json_encode($target) ?>);</script>
</head>
<body>
  <p>Redirecting to <?= htmlspecialchars($title) ?>...
     <a href="<?= htmlspecialchars($target) ?>">Click here if not redirected.</a></p>
</body>
</html>