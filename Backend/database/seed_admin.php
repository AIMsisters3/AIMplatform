<?php
/**
 * AIMsisters - Admin bootstrap / password reset script.
 *
 * Run this once after importing schema.sql (and again any time you want to
 * reset the admin password). It hashes the password properly with PHP's
 * password_hash() so you never have to paste a hash into phpMyAdmin by hand.
 *
 * CLI (recommended):
 *   cd Backend/database
 *   php seed_admin.php
 *   php seed_admin.php you@example.com "SomeOtherPassword!" "Your Name"
 *
 * Browser (if you don't have CLI PHP handy):
 *   http://localhost/AIMTech/Backend/database/seed_admin.php
 *   http://localhost/AIMTech/Backend/database/seed_admin.php?email=you@example.com&password=SomeOtherPassword!&name=Your+Name
 *
 * Delete this file (or move it out of the web root) once you're done setting
 * up — it's a convenience tool, not something that should stay reachable on
 * a public production server.
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

$isCli = (php_sapi_name() === 'cli');

if ($isCli) {
    $email    = $argv[1] ?? 'admin@aimsisters.org';
    $password = $argv[2] ?? 'ChangeMe123!';
    $name     = $argv[3] ?? 'AIMsisters Admin';
} else {
    $email    = $_GET['email'] ?? 'admin@aimsisters.org';
    $password = $_GET['password'] ?? 'ChangeMe123!';
    $name     = $_GET['name'] ?? 'AIMsisters Admin';
    header('Content-Type: text/plain; charset=utf-8');
}

if (strlen($password) < 8) {
    echo "Password must be at least 8 characters.\n";
    exit(1);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$db = Database::getConnection();

$stmt = $db->prepare(
    'INSERT INTO users (name, email, password_hash, role, status)
     VALUES (:name, :email, :hash, :role, :status)
     ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        role = VALUES(role),
        status = VALUES(status)'
);
$stmt->execute([
    'name'   => $name,
    'email'  => $email,
    'hash'   => $hash,
    'role'   => 'superadmin',
    'status' => 'active',
]);

echo "Admin account ready.\n";
echo "  Email:    $email\n";
echo "  Password: $password\n";
echo "Sign in at " . FRONTEND_URL . "/admin/login and change this password if you shared it anywhere.\n";
