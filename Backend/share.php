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
$image       = $item['thumbnail'] ?? (FRONTEND_URL . '/src/assets/bg.png');
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