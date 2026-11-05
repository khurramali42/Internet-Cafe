#!/usr/bin/env bash
set -euo pipefail
base="http://127.0.0.1:8080/api.php"
cookie="$(mktemp)"
trap 'rm -f "$cookie"' EXIT

code="$(curl -sS -o /tmp/anon.json -w '%{http_code}' "$base?action=init")"
test "$code" = 401 || { echo "FAIL anonymous init: $code"; exit 1; }
code="$(curl -sS -o /tmp/session.json -w '%{http_code}' "$base?action=auth_status")"
test "$code" = 200
grep -q '"user":null' /tmp/session.json

code="$(curl -sS -o /tmp/wrong.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  --data '{"username":"admin","password":"wrong"}' "$base?action=login")"
test "$code" = 401 || { echo "FAIL wrong password: $code"; exit 1; }

code="$(curl -sS -c "$cookie" -b "$cookie" -o /tmp/login.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  --data '{"username":"admin","password":"StrongTestPass_2026!xyz"}' "$base?action=login")"
test "$code" = 200 || { echo "FAIL admin login: $code"; cat /tmp/login.json; exit 1; }
csrf="$(php -r 'echo json_decode(file_get_contents("/tmp/login.json"), true)["csrf"];')"
test "${#csrf}" -eq 64 || { echo "FAIL missing CSRF"; exit 1; }
code="$(curl -sS -b "$cookie" -o /tmp/init.json -w '%{http_code}' "$base?action=init")"
test "$code" = 200
if grep -qi 'passwordHash' /tmp/init.json; then echo "FAIL leaked password hashes"; exit 1; fi

code="$(curl -sS -b "$cookie" -o /tmp/nocsrf.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  --data '{"id":"test","name":"TEST"}' "$base?action=sync_customer")"
test "$code" = 403 || { echo "FAIL CSRF: $code"; exit 1; }

code="$(curl -sS -b "$cookie" -o /tmp/invalidorigin.json -w '%{http_code}' -X POST -H 'Origin: https://evil.example' \
  -H "X-CSRF-Token: $csrf" -H 'Content-Type: application/json' --data '{}' "$base?action=sync_customer")"
test "$code" = 403 || { echo "FAIL origin check: $code"; exit 1; }

code="$(curl -sS -b "$cookie" -o /tmp/adduser.json -w '%{http_code}' -X POST -H "X-CSRF-Token: $csrf" \
  -H 'Content-Type: application/json' \
  --data '{"id":"u-sec-test","username":"operator_test","passwordHash":"StrongStaffPassword_123!","fullName":"Test Operator","role":"USER","isActive":true}' "$base?action=sync_user")"
test "$code" = 200 || { echo "FAIL admin create staff: $code"; cat /tmp/adduser.json; exit 1; }

code="$(curl -sS -o /tmp/operator.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -c "$cookie.staff" -b "$cookie.staff" \
  --data '{"username":"operator_test","password":"StrongStaffPassword_123!"}' "$base?action=login")"
test "$code" = 200 || { echo "FAIL staff login: $code"; exit 1; }
staff_csrf="$(php -r 'echo json_decode(file_get_contents("/tmp/operator.json"), true)["csrf"];')"
code="$(curl -sS -b "$cookie.staff" -o /tmp/forbidden.json -w '%{http_code}' -X POST \
  -H "X-CSRF-Token: $staff_csrf" -H 'Content-Type: application/json' \
  --data '{"id":"u-admin"}' "$base?action=delete_user")"
test "$code" = 403 || { echo "FAIL staff authorization: $code"; exit 1; }
rm -f "$cookie.staff"


# Exercise a real authenticated database mutation to catch obsolete PHP helpers.
code="$(curl -sS -b "$cookie" -o /tmp/customer-write.json -w '%{http_code}' -X POST \
  -H "X-CSRF-Token: $csrf" -H 'Content-Type: application/json' \
  --data '{"id":"ci-customer","name":"Fictional CI Customer","contact":"000","totalSpent":0,"outstandingBalance":0}' \
  "$base?action=sync_customer")"
test "$code" = 200 || { echo "FAIL customer sync: $code"; cat /tmp/customer-write.json; exit 1; }


# Verify finance and stock routes use the new JSON parser as well.
code="$(curl -sS -b "$cookie" -o /tmp/finance-write.json -w '%{http_code}' -X POST \
  -H "X-CSRF-Token: $csrf" -H 'Content-Type: application/json' \
  --data '{"id":"ci-sale","type":"SALE","amount":1,"date":1783500000000,"description":"Test sale","category":"Test","isManual":false}' \
  "$base?action=sync_transaction")"
test "$code" = 200 || { echo "FAIL transaction sync: $code"; cat /tmp/finance-write.json; exit 1; }
code="$(curl -sS -b "$cookie" -o /tmp/stock-write.json -w '%{http_code}' -X POST \
  -H "X-CSRF-Token: $csrf" -H 'Content-Type: application/json' \
  --data '{"id":"ci-stock","name":"CI Item","category":"Test","quantity":1,"status":"IN_USE","purchaseDate":0,"cost":1}' \
  "$base?action=sync_inventory")"
test "$code" = 200 || { echo "FAIL inventory sync: $code"; cat /tmp/stock-write.json; exit 1; }


# Reject tampered client-side financial values.
bad_finance_code="$(curl -sS -b "$cookie" -o /tmp/invalid-finance.json -w '%{http_code}' \
  -X POST -H "X-CSRF-Token: $csrf" -H 'Content-Type: application/json' \
  --data '{"id":"bad-finance","type":"SALE","amount":-999,"date":1783500000000,"description":"Invalid total"}' \
  "$base?action=sync_transaction")"
test "$bad_finance_code" = 422 || { echo "FAIL negative sale rejected: $bad_finance_code"; exit 1; }

bad_stock_code="$(curl -sS -b "$cookie" -o /tmp/invalid-stock.json -w '%{http_code}' \
  -X POST -H "X-CSRF-Token: $csrf" -H 'Content-Type: application/json' \
  --data '{"id":"bad-stock","name":"Invalid","quantity":-5,"cost":1}' \
  "$base?action=sync_inventory")"
test "$bad_stock_code" = 422 || { echo "FAIL negative stock rejected: $bad_stock_code"; exit 1; }

# Rate limiter must not be bypassable by opening a fresh session each attempt.
for i in 1 2 3 4 5; do
  code="$(curl -sS -o /tmp/throttle.json -w '%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    --data '{"username":"unregistered_rate_limit","password":"badpass"}' "$base?action=login")"
  test "$code" = 401 || { echo "FAIL initial rate-limit attempt $i: $code"; exit 1; }
done
code="$(curl -sS -o /tmp/throttled.json -w '%{http_code}' -X POST \
  -H 'Content-Type: application/json' \
  --data '{"username":"unregistered_rate_limit","password":"badpass"}' "$base?action=login")"
test "$code" = 429 || { echo "FAIL persistent login throttling: $code"; exit 1; }

echo 'PASS: anonymous access, login, password verification, CSRF, origin, admin creation and role permissions'
