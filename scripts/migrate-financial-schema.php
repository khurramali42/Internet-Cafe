<?php
declare(strict_types=1);
/**
 * Idempotent additive financial integrity migration for an EXISTING single-cafe database.
 * Never drops tables or rewrites customer balances. Requires an independently verified backup.
 * MySQL DDL implicitly commits; verify the preflight before running any ALTER TABLE.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if (getenv('SPEEDY_MIGRATION_BACKUP_CONFIRMED') !== '1') {
    fwrite(STDERR, "Refusing migration: first back up and test restore, then set SPEEDY_MIGRATION_BACKUP_CONFIRMED=1.\n");
    exit(2);
}
$host = getenv('SPEEDY_DB_HOST') ?: '127.0.0.1';
$name = getenv('SPEEDY_DB_NAME') ?: 'speedy_cafe';
$user = getenv('SPEEDY_DB_USER');
$pass = getenv('SPEEDY_DB_PASS');
if (!$user || $pass === false || !preg_match('/^[a-zA-Z0-9_]+$/', $name)) {
    fwrite(STDERR, "Valid database credentials and name required.\n");
    exit(2);
}
$pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false
]);
$checks = [
  'customers' => [
    'chk_customers_totalspent' => 'totalSpent >= 0',
    'preflight' => 'SELECT COUNT(*) FROM customers WHERE totalSpent < 0'
  ],
  'sessions' => [
    'chk_sessions_money' => 'ratePerHour >= 0 AND amountDue >= 0 AND amountPaid >= 0',
    'chk_sessions_times' => 'inTime > 0 AND (outTime IS NULL OR outTime >= inTime)',
    'chk_sessions_duration' => 'totalHoldMinutes >= 0 AND effectiveMinutes >= 0',
    'preflight' => 'SELECT COUNT(*) FROM sessions WHERE ratePerHour < 0 OR amountDue < 0 OR amountPaid < 0 OR inTime <= 0 OR (outTime IS NOT NULL AND outTime < inTime) OR totalHoldMinutes < 0 OR effectiveMinutes < 0'
  ],
  'transactions' => [
    'chk_transactions_amount' => 'amount >= 0',
    'preflight' => 'SELECT COUNT(*) FROM transactions WHERE amount < 0'
  ],
  'inventory' => [
    'chk_inventory_nonnegative' => 'quantity >= 0 AND cost >= 0',
    'preflight' => 'SELECT COUNT(*) FROM inventory WHERE quantity < 0 OR cost < 0'
  ]
];
$indexes = [
  'sessions' => [
    'idx_sessions_customer_time' => '(customerId, inTime)',
    'idx_sessions_cabin_state' => '(cabinId, status)'
  ],
  'transactions' => [
    'idx_transactions_customer_date' => '(customerId, date)',
    'idx_transactions_related' => '(relatedId)'
  ]
];
try {
    // Validate ALL tables before modifying ANY schema object.
    foreach ($checks as $table => $items) {
        $invalid = (int)$pdo->query($items['preflight'])->fetchColumn();
        if ($invalid !== 0) throw new RuntimeException("$table contains $invalid invalid existing rows; reconcile manually first.");
        $engine = $pdo->prepare('SELECT ENGINE FROM information_schema.tables WHERE table_schema=? AND table_name=?');
        $engine->execute([$name,$table]);
        if (strtoupper((string)$engine->fetchColumn()) !== 'INNODB') {
            throw new RuntimeException("$table must be InnoDB before this migration. Review and convert it separately.");
        }
    }
    foreach ($checks as $table => $items) {
        foreach ($items as $constraint => $expression) {
            if ($constraint === 'preflight') continue;
            $present = $pdo->prepare('SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema=? AND table_name=? AND constraint_name=?');
            $present->execute([$name,$table,$constraint]);
            if (!$present->fetchColumn()) {
                $pdo->exec("ALTER TABLE `$table` ADD CONSTRAINT `$constraint` CHECK ($expression)");
                echo "Added $constraint on $table\n";
            }
        }
    }
    foreach ($indexes as $table => $items) {
        foreach ($items as $index => $columns) {
            $present = $pdo->prepare('SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=? AND table_name=? AND index_name=?');
            $present->execute([$name,$table,$index]);
            if (!$present->fetchColumn()) {
                $pdo->exec("CREATE INDEX `$index` ON `$table` $columns");
                echo "Added $index on $table\n";
            }
        }
    }
    echo "Financial schema migration complete. No business rows changed.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Migration aborted: ".$e->getMessage()."\n");
    exit(1);
}
