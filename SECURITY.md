# Security policy — development preview

**Do not treat this repository as production security certified.** Use fictional data for the demo and test new server installations before handling any real customer or financial records.

## Implemented on main

- PHP server-side login and session cookies.
- Password hashing with `password_hash` / `password_verify`, replacing weak production seed credentials.
- CSRF tokens, origin validation, HTTPS requirements, and server-enforced role checks for user management.
- No anonymous access to customer, inventory or finance endpoints.
- Server-side login failure throttling backed by MySQL.
- Basic CI tests against a disposable MySQL database covering login, staff/admin checks, CSRF, origin blocking, customer/stock/transaction sync.
- A CLI administrator bootstrap script; see [secure deployment instructions](docs/SECURE_DEPLOYMENT.md).

## Known limitations requiring review

- The **fictional local browser demo** intentionally uses client-side logins with sample credentials; **this is not production authentication**.
- Checkout, holds, cabin moves, balance settlements and historical manual billing now have transactional server routes, and the frontend waits for server confirmation. **Some other operational UI state remains optimistic**; end-to-end failure handling, refund/reversal flows and reconciliation still require review.
- Manual billing is an administrator override; authenticated operators should reconcile such entries, discounts and business-specific tax rules. Formal invoice and journal balancing are not implemented.
- The checkout/settlement integration tests use disposable data. Independent load/concurrency testing and real data migration remain outstanding.
- The new database schema includes check constraints and customer foreign keys. Existing installations require the backup-gated CLI migration, after orphan/invalid record reconciliation. Secure backup scheduling, independent restore drills, least-privilege DB grants, monitoring and live hosting review remain installation requirements.
- The password recovery interface is demo-only and does not send a real reset email.
- Passing the repository's automated CI tests does not prove real-world deployment security.

See [financial billing guidance](docs/BILLING_INTEGRITY.md) and the [public release checklist](docs/PUBLIC_RELEASE_CHECKLIST.md) for precise limitations.

## Secure deployment precautions

1. Serve PHP and the frontend on the **same HTTPS origin**, keeping database credentials outside the web root.
2. Configure a dedicated restricted MySQL user (never the root account).
3. Run the [database migration and account bootstrap](docs/SECURE_DEPLOYMENT.md) before switching any existing installation.
4. Test admin/staff permissions, billing, inventory, concurrent sessions, backup restore and network failures using fictional data.
5. Obtain an independent security review before inviting live businesses to process customer or payment information.

## Report a security issue privately

Do not publish exploits, credentials or real customer data in GitHub issues. Contact the repository owner privately through GitHub until a dedicated vulnerability-reporting channel is set up.
