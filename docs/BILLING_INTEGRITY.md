# Billing integrity: authenticated server mode

> Applies to PHP/MySQL server mode (`VITE_API_URL=/api.php`) in both isolated Docker local and hosted installs. The fictional browser-only demo remains intentionally client-side and must never hold real customer records.

## Authoritative operations

| Operation | Endpoint | Atomic effects |
| --- | --- | --- |
| Start a session | `start_session` | Lock cabin, validate customer and approved rate, create open session, occupy cabin |
| Pause/resume | `toggle_session_hold` | Write server timestamps under a session lock and update cabin state |
| Move cabin | `move_session` | Lock session and both cabins, ensure target empty, transfer occupancy |
| Checkout | `checkout_session` | Lock session/customer/cabin, compute charges on server, update balances, save payment, release cabin, audit |
| Settle a previous balance | `settle_balance` | Lock customer, lower outstanding balance, insert one payment, audit |
| Historical manual bill | `manual_session` | ADMIN-only, validates dates/amounts, changes session/customer/payment together, audit |
| Expense | `sync_transaction` with `EXPENSE` | Insert immutable expense, reject duplicate ID with different details |

The frontend waits for a server response before reporting success, and reloads from the database to reconcile React views. If a network request has an uncertain outcome, **check the saved records before retrying**.

## Rate and charge policy

- The rate is frozen into the session when it begins. A staff operator may select only an amount listed in `SPEEDY_ALLOWED_HOURLY_RATES` (comma-separated, default `100,150,200,250,300`); an ADMIN can approve a custom rate.
- `checkout_session` uses the server clock and server-recorded hold timestamps. Billable minutes = `ceil((elapsed milliseconds - hold milliseconds) / 60000)`.
- Gross bill = `ceil(billable minutes / 60 * stored hourly rate)`. Authorized admin discount is subtracted, never below zero.
- Customer outstanding balance changes by **charge minus actual payment received**. The same DB transaction also creates a unique payment record if a positive payment was received.
- The server rejects overpayment: cash change must be returned before recording the **net accepted** payment. There is no cash-tendered / change-given feature yet.
- Manual historical bills accept a user-entered amount only when authenticated as ADMIN; these are deliberate administrative adjustments and appear in the audit log.

## Integrity and duplicate protection

- Completed sessions cannot be charged a second time by repeating checkout.
- Settlement, manual entry and session-start requests use stable operation IDs so network retries cannot create extra records.
- Direct `sync_session` updates, `sync_transaction` PAYMENT entries, and client-controlled customer balance changes are blocked in server mode.
- Transactions use MySQL `BEGIN` / `COMMIT` / `ROLLBACK` and `SELECT ... FOR UPDATE` row locks where needed. A failure cannot save only a subset of checkout effects.
- Server-side status and rate validation guards prevent invalid negative amounts and unauthorized cabin occupancy changes.
- Run `bash scripts/billing-smoke.sh` against the disposable MySQL HTTP test environment or use the GitHub Actions `authentication-integration` job.

## Upgrade an existing installation safely

1. **Back up and test restoring** the existing SQL database before deployment.
2. Stop new check-ins, finish or manually reconcile open sessions and customer balances using a trusted backup.
3. Deploy PHP and compiled frontend together. The old browser/DB synchronization protocol is intentionally incompatible with the new protected billing operations.
4. Configure hourly rates on each cafe deployment in its private `.env` file, then restart the app.
5. Verify with **fictional records**: check-in, hold/resume, transfer cabin, checkout, partial payment, unpaid customer balance, settlement, admin discount, manual entry and expense.
6. Simulate a rejected payment, duplicate request and network disconnect; verify the database's authoritative records and audit history before processing live money.

**Important:** Previously stored sessions, financial totals and rates from older client-authoritative versions are not automatically recalculated or certified by this update. Those records need operator reconciliation.

## Remaining limitations

This fixes major double-entry and partial-write risks in supported operations, but is **not a full independent financial audit or penetration test**. Existing free-form SALE and EXPENSE inputs are not linked to itemized inventory invoices; refunds, reversals, paid cash change, journal balancing, formal accounting exports, multi-user load tests and backup-restore drills still require implementation and verification. Multiple cafes must continue using separate databases and application deployments.
