# Public release checklist (2026-11)

**Release classification:** Public source code / fictional demo / technical preview. Do **not** advertise as audited financial software, a PCI-compliant payment processor, or a shared multi-tenant SaaS.

## Public repository readiness

- [x] Public repository, MIT license and documented source installation
- [x] Fictional screenshots and offline browser demo with clear warning
- [x] No default administrator inserted into the production database schema
- [x] Session authentication, CSRF, role checks and server-side billing operations
- [x] Single-cafe local Docker install and HTTPS isolated hosted Compose template
- [x] Automated frontend, PHP, database security, billing and container tests
- [x] Private `.env` and `backups/` excluded from Git tracking
- [x] Repeatable financial integrity migration with orphan-record and negative-balance preflight
- [x] Disposable backup/restore verification within CI
- [x] Least-privilege Docker app DB account on fresh volumes (SELECT/INSERT/UPDATE/DELETE only), validated in CI
- [ ] Independent security and accounting review of deployment and business rules
- [ ] Formal UX/accessibility testing across current browsers/devices
- [ ] Sanitized public walkthrough video
- [ ] GitHub repo topics, issue templates, vulnerability reporting and tagged release notes

## Preflight for EACH real cafe installation

- [ ] Collect operator's own VPS/domain (hosted) or Docker Desktop (local).
- [ ] Generate **two different strong, unique** database secrets in private `.env`.
- [ ] Install with a NEW isolated MySQL database and no customer data.
- [ ] Provision the first administrator with a strong password via CLI; rotate all legacy credentials.
- [ ] Verify only HTTPS is externally exposed; never expose MySQL or raw PHP service ports.
- [ ] Confirm backup schedule and encrypted off-site storage; keep restored copies away from production.
- [ ] Run a restore test in an isolated environment using the latest backup.
- [ ] If upgrading, freeze writes, validate a backup, reconcile legacy transactions and run `scripts/migrate-financial-schema.php`.
- [ ] Set and document approved hourly rates per cafe.
- [ ] Test with fake records: create customer, check in, pause, transfer, full/partial payment, outstanding settlement, expense, admin discount, manual record.
- [ ] Test concurrent operators, aborted requests, internet outages and retry without duplicate ledger entries.
- [ ] Set HTTPS certificate renewal monitoring, software patching and database backup alerts.
- [ ] Review local privacy/accounting/tax obligations and retention needs with the operator.
- [ ] Obtain a security sign-off before storing actual personal/financial data.

## Existing database upgrades: important distinction

`database.sql` is a **new installation schema**. `CREATE TABLE IF NOT EXISTS` does not retrofit existing tables. To upgrade old databases, after backups and a maintenance window:

1. Verify backup exists and its restore works in a separate test environment.
2. Confirm legacy customer balances and existing sessions have been reconciled.
3. From the repository, with dedicated **migration-privileged** MySQL credentials in protected environment and `SPEEDY_MIGRATION_BACKUP_CONFIRMED=1`, run `php scripts/migrate-financial-schema.php`. The migration refuses orphan customer relationships and invalid monetary values. It never silently deletes or changes business rows.
4. Run it a second time to verify idempotency, then revoke extra `ALTER`/schema privileges. Fresh Docker volumes run `deploy/restrict-db-user.sql` during first database creation. **Existing volumes do not re-run init SQL**, so inspect their grants and manually restrict the application user after running any schema migration.
5. Upgrade frontend and backend together, change admin credentials, and verify functionality with fake records before resuming operations.

**No software can honestly be declared fully production-ready simply because tests pass in GitHub Actions.** The repository provides the software and reference deployment, but a cafe's real hosting, secret setup, backups, legal compliance and risk review are installation-specific.

## Rollback

Do not roll back application code alone after changing the financial data model. Stop writes, take an additional backup, inspect the last known good build and verified restore, and use a documented maintenance window. Never execute `docker compose down -v` on a real cafe deployment because that destroys its MySQL volume.
