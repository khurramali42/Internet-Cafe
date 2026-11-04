# Security policy (development preview)

**Do not use this project in production or expose its current PHP API to the public internet.**

## Known risks

- Demo credentials are documented, and the seed database contains a weak admin password.
- Client-side login compares plaintext password values in browser state; password fields named `passwordHash` are **not** necessarily hashed.
- `public/api.php` currently permits cross-origin requests broadly and has no server-side authentication or per-operation authorization; its endpoints may expose users, customers and financial data if hosted publicly.
- Demo/local browser data is not a substitute for secure access control, encrypted backups, or a production database.
- The password recovery UI simulates an email response, not a verified reset process.

## Before any real deployment

1. Implement server-side sessions or signed authentication and **server-side role-based authorization** on every endpoint, including read, sync, delete, and administration operations.
2. Store passwords using a proper password hashing algorithm (e.g. PHP `password_hash` and `password_verify`); remove seeded/default production credentials.
3. Restrict CORS to approved origins, validate/sanitize all inputs, use least-privilege DB credentials, enable HTTPS, and configure rate limits.
4. Stop returning raw DB errors and sensitive fields to unauthenticated users.
5. Implement database backup/restore tests, audit controls, and tests covering access by unauthenticated/staff/admin accounts.
6. Conduct a security review before any public launch.

## Reporting security concerns

Please **do not post exploit details or real customer records in public issues**. Contact the repository maintainer privately through their GitHub profile until a dedicated vulnerability reporting channel is configured.
