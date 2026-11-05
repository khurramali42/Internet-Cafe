#!/usr/bin/env bash
set -euo pipefail
base="http://127.0.0.1:8080/api.php"
cookie="$(mktemp)"
trap 'rm -f "$cookie"' EXIT
login_file="$(mktemp)"
trap 'rm -f "$cookie" "$login_file"' EXIT
code="$(curl -sS -c "$cookie" -b "$cookie" -o "$login_file" -w '%{http_code}' \
  -X POST -H 'Content-Type: application/json' \
  --data '{"username":"admin","password":"StrongTestPass_2026!xyz"}' "$base?action=login")"
test "$code" = 200 || { echo "FAIL admin login: $code"; cat "$login_file"; exit 1; }
csrf="$(php -r 'echo json_decode(file_get_contents($argv[1]), true)["csrf"];' "$login_file")"
post() {
  local action="$1" payload="$2" output="$3"
  curl -sS -b "$cookie" -o "$output" -w '%{http_code}' -X POST \
    -H "X-CSRF-Token: $csrf" -H 'Content-Type: application/json' \
    --data "$payload" "$base?action=$action"
}
field() {
  php -r 'echo json_decode(file_get_contents($argv[1]), true)[$argv[2]];' "$1" "$2"
}
sessionId="sess-ci-billing-atomic"
key="ci-billing-atomic"
code="$(post start_session '{"requestId":"ci-billing-atomic","cabinId":"cab-1","customerId":"new","newCustomer":{"name":"Atomic Test Customer","contact":"000"},"ratePerHour":100}' /tmp/start-billing.json)"
test "$code" = 200 || { echo "FAIL start_session: $code"; cat /tmp/start-billing.json; exit 1; }
test "$(php -r 'echo json_decode(file_get_contents("/tmp/start-billing.json"),true)["session"]["id"];')" = "$sessionId"

# Replayed start cannot create another customer or session.
code="$(post start_session '{"requestId":"ci-billing-atomic","cabinId":"cab-1","customerId":"new","newCustomer":{"name":"Atomic Test Customer","contact":"000"},"ratePerHour":100}' /tmp/restart-billing.json)"
test "$code" = 200
grep -q '"replayed":true' /tmp/restart-billing.json

# Legacy direct writes must never close sessions or forge payments.
code="$(post sync_session '{"id":"sess-ci-billing-atomic","status":"CLOSED","amountDue":0,"amountPaid":9999}' /tmp/legacy-session.json)"
test "$code" = 403 || { echo "FAIL legacy sync_session: $code"; exit 1; }
code="$(post sync_transaction '{"id":"forged-payment","type":"PAYMENT","amount":999,"date":1783500000000,"description":"forged"}' /tmp/legacy-payment.json)"
test "$code" = 403 || { echo "FAIL legacy payment: $code"; exit 1; }

# A client may edit customer contact data, not cash balance totals.
code="$(post sync_customer '{"id":"cust-ci-billing-atomic","name":"Atomic Test Customer","contact":"000","totalSpent":9000000,"outstandingBalance":-9000000}' /tmp/balance-forge.json)"
test "$code" = 200 || { echo "FAIL metadata edit: $code"; exit 1; }
code="$(curl -sS -b "$cookie" -o /tmp/init-before-checkout.json -w '%{http_code}' "$base?action=init")"
test "$code" = 200
php -r '
 $d=json_decode(file_get_contents("/tmp/init-before-checkout.json"),true);
 foreach($d["customers"] as $c) if($c["id"]==="cust-ci-billing-atomic") {
   if((float)$c["totalSpent"]!==0.0 || (float)$c["outstandingBalance"]!==0.0) exit(1);
   exit(0);
 }
 exit(1);
' || { echo "FAIL client forged balance stored"; exit 1; }

# Server measures elapsed time and posts session, customer, cabin and payment in one transaction.
code="$(post checkout_session '{"sessionId":"sess-ci-billing-atomic","paymentAmount":1,"discount":0}' /tmp/checkout-billing.json)"
test "$code" = 200 || { echo "FAIL checkout: $code"; cat /tmp/checkout-billing.json; exit 1; }
due="$(php -r 'echo json_decode(file_get_contents("/tmp/checkout-billing.json"),true)["session"]["amountDue"];')"
balance="$(field /tmp/checkout-billing.json balance)"
php -r 'if((float)$argv[1] < 1 || abs(((float)$argv[1] - 1) - (float)$argv[2]) > 0.01) exit(1);' "$due" "$balance" || { echo "FAIL server bill calculation"; exit 1; }

code="$(post checkout_session '{"sessionId":"sess-ci-billing-atomic","paymentAmount":1,"discount":0}' /tmp/checkout-replay.json)"
test "$code" = 200
grep -q '"replayed":true' /tmp/checkout-replay.json

code="$(curl -sS -b "$cookie" -o /tmp/init-after-checkout.json -w '%{http_code}' "$base?action=init")"
test "$code" = 200
php -r '
 $d=json_decode(file_get_contents("/tmp/init-after-checkout.json"),true);
 $tx=array_filter($d["transactions"],fn($x)=>$x["id"]==="tx-chk-sess-ci-billing-atomic");
 $cab=array_values(array_filter($d["cabins"],fn($x)=>$x["id"]==="cab-1"))[0];
 if(count($tx)!==1 || $cab["status"]!=="AVAILABLE" || $cab["currentSessionId"]!==null) exit(1);
' || { echo "FAIL duplicate checkout ledger or cabin release"; exit 1; }

# Pay the remaining balance and repeat the identical settlement idempotently.
code="$(post settle_balance "{\"requestId\":\"ci-settle-atomic\",\"customerId\":\"cust-ci-billing-atomic\",\"paymentAmount\":$balance}" /tmp/settle-billing.json)"
if php -r 'exit((float)$argv[1] > 0 ? 0 : 1);' "$balance"; then
  test "$code" = 200 || { echo "FAIL settlement: $code"; cat /tmp/settle-billing.json; exit 1; }
  test "$(field /tmp/settle-billing.json balance)" = 0
  code="$(post settle_balance "{\"requestId\":\"ci-settle-atomic\",\"customerId\":\"cust-ci-billing-atomic\",\"paymentAmount\":$balance}" /tmp/settle-replay.json)"
  test "$code" = 200
  grep -q '"replayed":true' /tmp/settle-replay.json
fi
code="$(curl -sS -b "$cookie" -o /tmp/init-after-settle.json -w '%{http_code}' "$base?action=init")"
test "$code" = 200
php -r '
 $d=json_decode(file_get_contents("/tmp/init-after-settle.json"),true);
 $tx=array_filter($d["transactions"],fn($x)=>$x["id"]==="tx-chk-sess-ci-billing-atomic");
 $settle=array_filter($d["transactions"],fn($x)=>$x["id"]==="tx-settle-ci-settle-atomic");
 if(count($tx)!==1 || count($settle)>1) exit(1);
 foreach($d["customers"] as $c) if($c["id"]==="cust-ci-billing-atomic") {
    if((float)$c["outstandingBalance"]!==0.0) exit(1);
    exit(0);
 }
 exit(1);
' || { echo "FAIL final ledger balance or duplicate settlement"; exit 1; }
echo "PASS: atomic session billing, idempotent checkout and settlement, no forged client balances"
