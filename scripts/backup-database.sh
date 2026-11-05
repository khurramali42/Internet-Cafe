#!/usr/bin/env bash
set -euo pipefail
mode="${1:-}"
if [[ "$mode" != "local" && "$mode" != "hosted" ]]; then
  echo "Usage: bash scripts/backup-database.sh local|hosted" >&2
  exit 2
fi
cd "$(dirname "$0")/.."
if [[ ! -f .env ]]; then
  echo "Missing private .env at repository root." >&2
  exit 1
fi
umask 077
mkdir -p backups
stamp="$(date -u +'%Y%m%dT%H%M%SZ')"
target="backups/speedy-${mode}-${stamp}.sql.gz"
tmp="${target}.partial"
trap 'rm -f "$tmp"' EXIT
docker compose --env-file .env -f "deploy/${mode}.compose.yml" exec -T database \
  sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --routines --events speedy_cafe' \
  | gzip -c > "$tmp"
gzip -t "$tmp"
mv "$tmp" "$target"
trap - EXIT
echo "Backup created: $target"
echo "Keep an encrypted copy on separate storage and test a restore."
