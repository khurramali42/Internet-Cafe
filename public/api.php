<?php
declare(strict_types=1);

// Production API: configure SPEEDY_DB_HOST / NAME / USER / PASS on the PHP host.
// This endpoint MUST be served on HTTPS and ideally the same origin as the frontend.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

function respond(int $code, array $body): never {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}
function input(): array {
    $body = file_get_contents('php://input');
    if ($body === false || strlen($body) > 1048576) respond(413, ['error' => 'Request too large']);
    $data = json_decode($body, true);
    if (!is_array($data)) respond(400, ['error' => 'Invalid JSON']);
    return $data;
}
function clean_user(array $u): array {
    unset($u['passwordHash']);
    $u['isActive'] = (bool) $u['isActive'];
    return $u;
}
function role_required(string $role, string $required): void {
    if ($role !== $required) respond(403, ['error' => 'Insufficient permissions']);
}
function required_text(array $d, string $field, int $limit = 255): string {
    $value = $d[$field] ?? null;
    if (!is_string($value) || trim($value) === '' || strlen($value) > $limit) respond(422, ['error' => 'Invalid ' . $field]);
    return trim($value);
}
function validate_password(string $password): void {
    if (strlen($password) < 12 || strlen($password) > 200) respond(422, ['error' => 'Password must be 12-200 characters']);
}
function ensure_origin(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') return;
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $self = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '');
    $allowed = rtrim((string) getenv('SPEEDY_ALLOWED_ORIGIN'), '/');
    if (!hash_equals($self, $origin) && ($allowed === '' || !hash_equals($allowed, $origin))) {
        respond(403, ['error' => 'Origin not allowed']);
    }
}
$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'; // Proxy must set trusted server HTTPS; client-controlled headers are not trusted.
if (!$https && !in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) {
    respond(400, ['error' => 'HTTPS is required']);
}
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_name('speedy_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') respond(405, ['error' => 'Cross-origin preflight not supported. Serve frontend and API on the same origin.']);
ensure_origin();

$host = getenv('SPEEDY_DB_HOST') ?: '127.0.0.1';
$db = getenv('SPEEDY_DB_NAME') ?: 'speedy_cafe';
$user = getenv('SPEEDY_DB_USER');
$pass = getenv('SPEEDY_DB_PASS');
if (!$user || $pass === false) respond(503, ['error' => 'Database not configured']);
try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=utf8mb4",
        $user, $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
         PDO::ATTR_EMULATE_PREPARES => false]
    );
} catch (Throwable $e) {
    error_log('Speedy Cafe DB error: ' . $e->getMessage());
    respond(503, ['error' => 'Service temporarily unavailable']);
}
$action = $_GET['action'] ?? '';
if (!is_string($action)) respond(400, ['error' => 'Invalid action']);

if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'POST required']);
    $d = input();
    $username = required_text($d, 'username', 50);
    $password = required_text($d, 'password', 200);
    $identity = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '|' . strtolower($username));
    $now = time();
    $pdo->prepare('INSERT IGNORE INTO login_attempts (identityHash, failures, updatedAt) VALUES (?, 0, ?)')->execute([$identity, $now]);
    $pdo->prepare('UPDATE login_attempts SET failures=0, updatedAt=? WHERE identityHash=? AND updatedAt < ?')
        ->execute([$now, $identity, $now - 900]);
    $attempt = $pdo->prepare('SELECT failures FROM login_attempts WHERE identityHash=?');
    $attempt->execute([$identity]);
    if ((int) $attempt->fetchColumn() >= 5) respond(429, ['error' => 'Too many attempts. Try again later']);
    $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $found = $stmt->fetch();
    if (!$found || !(bool) $found['isActive'] || !password_verify($password, (string) $found['passwordHash'])) {
        $pdo->prepare('UPDATE login_attempts SET failures = failures + 1, updatedAt=? WHERE identityHash=?')
            ->execute([$now, $identity]);
        respond(401, ['error' => 'Invalid credentials']);
    }
    $pdo->prepare('DELETE FROM login_attempts WHERE identityHash=?')->execute([$identity]);
    session_regenerate_id(true);
    $_SESSION = ['user_id' => $found['id'], 'csrf' => bin2hex(random_bytes(32))];
    $pdo->prepare('UPDATE users SET lastLoginAt = ? WHERE id = ?')->execute([(int) (microtime(true) * 1000), $found['id']]);
    respond(200, ['user' => clean_user($found), 'csrf' => $_SESSION['csrf']]);
}

if ($action === 'logout') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'POST required']);
    // A valid token is still required for authenticated logout.
    if (!isset($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) {
        respond(403, ['error' => 'CSRF check failed']);
    }
    $_SESSION = [];
    session_destroy();
    respond(200, ['status' => 'ok']);
}

$authUser = null;
if (isset($_SESSION['user_id'])) {
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? AND isActive = 1 LIMIT 1');
    $stmt->execute([$_SESSION['user_id']]);
    $authUser = $stmt->fetch() ?: null;
}
if ($action === 'auth_status') {
    respond(200, $authUser
        ? ['user' => clean_user($authUser), 'csrf' => $_SESSION['csrf'] ?? '']
        : ['user' => null]);
}
if (!$authUser) respond(401, ['error' => 'Authentication required']);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) {
        respond(403, ['error' => 'CSRF check failed']);
    }
}
$role = $authUser['role'];
if ($action === 'change_password') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'POST required']);
    $d = input();
    $old = required_text($d, 'oldPassword', 200);
    $new = required_text($d, 'newPassword', 200);
    validate_password($new);
    if (!password_verify($old, $authUser['passwordHash'])) respond(403, ['error' => 'Incorrect current password']);
    $pdo->prepare('UPDATE users SET passwordHash=? WHERE id=?')->execute([password_hash($new, PASSWORD_DEFAULT), $authUser['id']]);
    session_regenerate_id(true);
    respond(200, ['status' => 'ok']);
}
if ($action === 'admin_reset_password') {
    role_required($role, 'ADMIN');
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'POST required']);
    $d = input();
    $id = required_text($d, 'id', 50);
    $new = required_text($d, 'newPassword', 200);
    validate_password($new);
    $pdo->prepare('UPDATE users SET passwordHash=? WHERE id=?')->execute([password_hash($new, PASSWORD_DEFAULT), $id]);
    respond(200, ['status' => 'ok']);
}
if ($action === 'sync_user') {
    role_required($role, 'ADMIN');
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'POST required']);
    $d = input();
    $id = required_text($d, 'id', 50);
    $username = required_text($d, 'username', 50);
    $fullName = required_text($d, 'fullName', 100);
    $targetRole = $d['role'] ?? 'USER';
    if (!in_array($targetRole, ['ADMIN', 'USER'], true)) respond(422, ['error' => 'Invalid role']);
    $active = !empty($d['isActive']) ? 1 : 0;
    if ($id === $authUser['id'] && (!$active || $targetRole !== 'ADMIN')) respond(403, ['error' => 'Cannot disable or demote your own admin account']);
    $stmt = $pdo->prepare('SELECT id FROM users WHERE id=?');
    $stmt->execute([$id]);
    $exists = (bool) $stmt->fetch();
    if ($exists) {
        $pdo->prepare('UPDATE users SET username=?, fullName=?, email=?, phone=?, role=?, isActive=? WHERE id=?')
            ->execute([$username, $fullName, $d['email'] ?? null, $d['phone'] ?? null, $targetRole, $active, $id]);
    } else {
        $password = required_text($d, 'passwordHash', 200); // Legacy UI form field: treated as a raw NEW password only.
        validate_password($password);
        $pdo->prepare('INSERT INTO users (id,username,passwordHash,fullName,role,isActive,email,phone) VALUES (?,?,?,?,?,?,?,?)')
            ->execute([$id, $username, password_hash($password, PASSWORD_DEFAULT), $fullName, $targetRole, $active, $d['email'] ?? null, $d['phone'] ?? null]);
    }
    respond(200, ['status' => 'ok']);
}
if ($action === 'delete_user') {
    role_required($role, 'ADMIN');
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'POST required']);
    $d = input();
    if (($d['id'] ?? '') === $authUser['id']) respond(403, ['error' => 'Cannot delete your own admin account']);
    $pdo->prepare('DELETE FROM users WHERE id=?')->execute([required_text($d, 'id', 50)]);
    respond(200, ['status' => 'ok']);
}
if ($action === 'update_profile') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'POST required']);
    $d = input();
    $name = required_text($d, 'fullName', 100);
    $pdo->prepare('UPDATE users SET fullName=?, email=?, phone=? WHERE id=?')
        ->execute([$name, $d['email'] ?? null, $d['phone'] ?? null, $authUser['id']]);
    respond(200, ['status' => 'ok']);
}
if ($action === 'init' && $_SERVER['REQUEST_METHOD'] !== 'GET') respond(405, ['error' => 'GET required']);
if ($action !== 'init' && $_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'POST required']);
try {
    switch ($action) {
        case 'init':
            $data = [
                'cabins' => $pdo->query("SELECT * FROM cabins")->fetchAll(),
                'customers' => $pdo->query("SELECT * FROM customers")->fetchAll(),
                'sessions' => [],
                'transactions' => $pdo->query("SELECT * FROM transactions")->fetchAll(),
                'inventory' => $pdo->query("SELECT * FROM inventory")->fetchAll(),
                'repairs' => $pdo->query("SELECT * FROM repairs")->fetchAll(),
                'users' => [],
                'auditLogs' => $role === 'ADMIN' ? $pdo->query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100")->fetchAll() : [],
            ];

            // Handle JSON columns for sessions
            $sessions = $pdo->query("SELECT * FROM sessions")->fetchAll();
            foreach($sessions as $s) {
                $s['holds'] = json_decode($s['holdsJson'] ?? '[]');
                unset($s['holdsJson']);
                $data['sessions'][] = $s;
            }

            if ($role === 'ADMIN') {
                $data['users'] = array_map('clean_user', $pdo->query('SELECT * FROM users')->fetchAll());
            } else {
                $data['users'] = [clean_user($authUser)];
            }
            echo json_encode($data);
            break;

        case 'sync_cabin':
            $d = input();
            $stmt = $pdo->prepare("INSERT INTO cabins (id, name, status, currentSessionId, statusReason, expectedFix) VALUES (?, ?, ?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE status=?, currentSessionId=?, statusReason=?, expectedFix=?");
            $stmt->execute([
                $d['id'], $d['name'], $d['status'], $d['currentSessionId'] ?? null, $d['statusReason'] ?? null, $d['expectedFix'] ?? null,
                $d['status'], $d['currentSessionId'] ?? null, $d['statusReason'] ?? null, $d['expectedFix'] ?? null
            ]);
            echo json_encode(['status'=>'ok']);
            break;

        case 'sync_session':
            $d = getJsonInput();
            $holdsJson = json_encode($d['holds'] ?? []);
            $stmt = $pdo->prepare("INSERT INTO sessions (id, cabinId, customerId, inTime, outTime, ratePerHour, totalHoldMinutes, effectiveMinutes, amountDue, amountPaid, status, createdBy, isManual, manualReason, holdsJson) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE outTime=?, totalHoldMinutes=?, effectiveMinutes=?, amountDue=?, amountPaid=?, status=?, holdsJson=?");
            $stmt->execute([
                $d['id'], $d['cabinId'], $d['customerId'], $d['inTime'], $d['outTime'] ?? null, $d['ratePerHour'], $d['totalHoldMinutes'], $d['effectiveMinutes'], $d['amountDue'], $d['amountPaid'], $d['status'], $d['createdBy'], $d['isManual']?1:0, $d['manualReason']??null, $holdsJson,
                $d['outTime'] ?? null, $d['totalHoldMinutes'], $d['effectiveMinutes'], $d['amountDue'], $d['amountPaid'], $d['status'], $holdsJson
            ]);
            echo json_encode(['status'=>'ok']);
            break;

        case 'sync_customer':
            $d = getJsonInput();
            $stmt = $pdo->prepare("INSERT INTO customers (id, name, contact, remarks, totalSpent, outstandingBalance) VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE name=?, contact=?, remarks=?, totalSpent=?, outstandingBalance=?");
            $stmt->execute([
                $d['id'], $d['name'], $d['contact'], $d['remarks']??'', $d['totalSpent'], $d['outstandingBalance'],
                $d['name'], $d['contact'], $d['remarks']??'', $d['totalSpent'], $d['outstandingBalance']
            ]);
            echo json_encode(['status'=>'ok']);
            break;

        case 'sync_transaction':
            $d = getJsonInput();
            $stmt = $pdo->prepare("INSERT INTO transactions (id, type, amount, date, description, category, relatedId, customerId, isManual) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE type=?, amount=?, date=?, description=?, category=?, relatedId=?, customerId=?");
            $stmt->execute([
                $d['id'], $d['type'], $d['amount'], $d['date'], $d['description'], $d['category']??'', $d['relatedId']??null, $d['customerId']??null, $d['isManual']?1:0,
                $d['type'], $d['amount'], $d['date'], $d['description'], $d['category']??'', $d['relatedId']??null, $d['customerId']??null
            ]);
            echo json_encode(['status'=>'ok']);
            break;

        case 'sync_inventory':
            $d = getJsonInput();
            $stmt = $pdo->prepare("INSERT INTO inventory (id, name, category, quantity, status, purchaseDate, cost, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE name=?, category=?, quantity=?, status=?, cost=?, remarks=?");
            $stmt->execute([
                $d['id'], $d['name'], $d['category'], $d['quantity'], $d['status'], $d['purchaseDate'], $d['cost'], $d['remarks']??'',
                $d['name'], $d['category'], $d['quantity'], $d['status'], $d['cost'], $d['remarks']??''
            ]);
            echo json_encode(['status'=>'ok']);
            break;

        case 'delete_inventory':
            $d = getJsonInput();
            $pdo->prepare("DELETE FROM inventory WHERE id=?")->execute([$d['id']]);
            echo json_encode(['status'=>'ok']);
            break;

        case 'sync_repair':
            $d = getJsonInput();
            $stmt = $pdo->prepare("INSERT INTO repairs (id, cabinId, reason, reportedBy, startTime, expectedFix, status, closedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE status=?, closedAt=?, expectedFix=?");
            $stmt->execute([
                $d['id'], $d['cabinId'], $d['reason'], $d['reportedBy'], $d['startTime'], $d['expectedFix']??null, $d['status'], $d['closedAt']??null,
                $d['status'], $d['closedAt']??null, $d['expectedFix']??null
            ]);
            echo json_encode(['status'=>'ok']);
            break;

        case 'log_audit':
            $d = input();
            $pdo->prepare("INSERT INTO audit_logs (id, userId, username, action, details, timestamp, ipAddress) VALUES (?, ?, ?, ?, ?, ?, ?)")
                ->execute([
                    bin2hex(random_bytes(16)), $authUser['id'], $authUser['username'],
                    substr(required_text($d, 'action', 50), 0, 50),
                    substr((string) ($d['details'] ?? ''), 0, 2000),
                    (int) (microtime(true) * 1000),
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                ]);
            echo json_encode(['status'=>'ok']);
            break;

        default:
            respond(404, ['error' => 'Unknown action']);
    }
} catch (Throwable $e) {
    error_log('Speedy Cafe API exception: ' . $e->getMessage());
    respond(500, ['error' => 'Request failed']);
}
