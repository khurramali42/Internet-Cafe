#!/usr/bin/env bash
# Disposable GitHub Actions ONLY: backup source and restore to a separate throwaway DB.
set -euo pipefail
if [[ "${GITHUB_ACTIONS:-}" != "true" || "${SPEEDY_DISPOSABLE_RESTORE_DRILL:-}" != "1" ||
      "${SPEEDY_DB_NAME:-}" != "speedy_cafe" || "${SPEEDY_DB_HOST:-}" != "127.0.0.1" ]]; then
  echo "Refusing restore drill outside the explicitly authorized disposable CI database." >&2
  exit 2
fi
: "${SPEEDY_DB_PASS:?Required disposable CI database password}"
umask 077
backup="$(mktemp)"
trap 'rm -f "$backup"' EXIT
export MYSQL_PWD="$SPEEDY_DB_PASS"
mysql_cmd=(mysql -h 127.0.0.1 -u root --batch --skip-column-names)
dump_cmd=(mysqldump -h 127.0.0.1 -u root --single-transaction --routines --events --no-tablespaces speedy_cafe)
"${dump_cmd[@]}" > "$backup"
test -s "$backup" || { echo "Backup is empty" >&2; exit 1; }

# Only the _restore_ci suffix database is ever destroyed.
"${mysql_cmd[@]}" -e 'DROP DATABASE IF EXISTS speedy_cafe_restore_ci; CREATE DATABASE speedy_cafe_restore_ci CHARACTER SET utf8mb4;'
trap '"${mysql_cmd[@]}" -e "DROP DATABASE IF EXISTS speedy_cafe_restore_ci" || true; rm -f "$backup"' EXIT
"${mysql_cmd[@]}" speedy_cafe_restore_ci < "$backup"
for table in users customers cabins sessions transactions inventory repairs audit_logs login_attempts; do
  source_count="$("${mysql_cmd[@]}" -e "SELECT COUNT(*) FROM speedy_cafe.${table}")"
  restored_count="$("${mysql_cmd[@]}" -e "SELECT COUNT(*) FROM speedy_cafe_restore_ci.${table}")"
  test "$source_count" = "$restored_count" || {
    echo "FAIL ${table} recovery: source=${source_count} restored=${restored_count}" >&2
    exit 1
  }
done
source_money="$("${mysql_cmd[@]}" -e 'SELECT CONCAT(COALESCE(SUM(totalSpent),0),":",COALESCE(SUM(outstandingBalance),0)) FROM speedy_cafe.customers')"
restored_money="$("${mysql_cmd[@]}" -e 'SELECT CONCAT(COALESCE(SUM(totalSpent),0),":",COALESCE(SUM(outstandingBalance),0)) FROM speedy_cafe_restore_ci.customers')"
test "$source_money" = "$restored_money" || { echo "FAIL restored customer totals differ" >&2; exit 1; }
echo "PASS: disposable database backup and restore match all table counts and customer financial totals"
