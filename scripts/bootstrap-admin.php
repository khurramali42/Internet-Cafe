<?php
declare(strict_types=1);
// Run from CLI, never through the web server:
// SPEEDY_DB_USER=... SPEEDY_DB_PASS=... SPEEDY_ADMIN_PASSWORD=... php scripts/bootstrap-admin.php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$pass = getenv('SPEEDY_ADMIN_PASSWORD');
if (!$pass || strlen($pass) < 12 || strlen($pass) > 200) {
    fwrite(STDERR, "SPEEDY_ADMIN_PASSWORD must contain 12–200 characters.\n");
    exit(1);
}
$dbUser = getenv('SPEEDY_DB_USER');
$dbPass = getenv('SPEEDY_DB_PASS');
if (!$dbUser || $dbPass === false) {
    fwrite(STDERR, "Set SPEEDY_DB_USER and SPEEDY_DB_PASS.\n");
    exit(1);
}
$host = getenv('SPEEDY_DB_HOST') ?: '127.0.0.1';
$name = getenv('SPEEDY_DB_NAME') ?: 'speedy_cafe';
$pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $dbUser, $dbPass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => false,
]);
$username = getenv('SPEEDY_ADMIN_USERNAME') ?: 'admin';
if (!preg_match('/^[a-zA-Z0-9._-]{3,50}$/', $username)) {
    fwrite(STDERR, "Invalid SPEEDY_ADMIN_USERNAME.\n"); exit(1);
}
$hash = password_hash($pass, PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT INTO users (id, username, passwordHash, fullName, role, isActive)
    VALUES (?, ?, ?, ?, 'ADMIN', 1)
    ON DUPLICATE KEY UPDATE passwordHash=VALUES(passwordHash), role='ADMIN', isActive=1");
$stmt->execute(['u-admin', $username, $hash, 'System Admin']);
fwrite(STDOUT, "Admin account configured. Remove the password from your shell environment.\n");
