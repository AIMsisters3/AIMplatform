<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/models/Subscriber.php';

$token = $_GET['token'] ?? '';
$model = new Subscriber();
$subscriber = $token ? $model->findByToken($token) : null;

if ($subscriber) {
    $model->confirm((int) $subscriber['id']);
    $heading = "You're subscribed!";
    $message = "Thank you for confirming — you'll now receive AIMsisters devotions, Bible studies, and ministry news.";
} else {
    $heading = 'Link expired or invalid';
    $message = 'This confirmation link is no longer valid. Please subscribe again from the website.';
}
?>
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title><?= htmlspecialchars($heading) ?></title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; background:#f8f7fd; color:#2d2a4a;
           display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
    .card { max-width:480px; background:#fff; border-radius:18px; padding:40px; text-align:center;
            box-shadow:0 8px 30px rgba(45,42,74,0.08); }
    a.button { display:inline-block; margin-top:20px; padding:12px 28px; background:#7a2cf3; color:#fff;
               text-decoration:none; border-radius:999px; font-weight:bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1><?= htmlspecialchars($heading) ?></h1>
    <p><?= htmlspecialchars($message) ?></p>
    <a class="button" href="<?= htmlspecialchars(FRONTEND_URL) ?>">Return to AIMsisters</a>
  </div>
</body>
</html>