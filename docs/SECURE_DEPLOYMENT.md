# Secure PHP/MySQL backend setup

> **Review and test before exposing to real customers.** This branch introduces server authentication and permission controls, but is not a complete independent security audit. Keep the project private/local until deployment is validated.

## Architecture and modes

- **Isolated demo (default):** `VITE_API_URL` is unset. Fictional customer data and demo credentials are stored in browser LocalStorage. Nothing syncs to a server. Do not mistake this for production authentication.
- **Authenticated server mode:** Build the frontend with `VITE_API_URL=/api.php` and serve the PHP API on **the same HTTPS origin** as the compiled frontend. Local demo credentials never authorize API access.
- Do not expose a separate cross-origin PHP API. Use a same-origin reverse proxy if PHP runs on a different internal host.
- The API requires a secure PHP session cookie and CSRF token for state-changing requests.

## Initial deployment

1. Install PHP 8.1+, the PDO MySQL extension, and MySQL 8+ on a protected host.
2. Import `database.sql` into a **new database**. This intentionally creates no default admin user or password.
3. Set secrets through the web server's protected environment, *not* in files under the document root:
   - `SPEEDY_DB_HOST` (e.g. `127.0.0.1`)
   - `SPEEDY_DB_NAME` (e.g. `speedy_cafe`)
   - `SPEEDY_DB_USER` and `SPEEDY_DB_PASS`: dedicated limited-privilege DB account, not MySQL root
   - `SPEEDY_ALLOWED_ORIGIN` only if your hosting proxy requires it; otherwise same-origin access is enforced
4. Create the first admin from the PHP **CLI** (never via HTTP):
   ```bash
   # Set variables securely in your shell/deployment environment first.
   php scripts/bootstrap-admin.php
   ```
   The script requires a `SPEEDY_ADMIN_PASSWORD` environment variable of at least 12 characters and supports optional `SPEEDY_ADMIN_USERNAME`. Remove the password from the environment afterwards.
5. Copy `public/api.php` to the PHP document root and serve it at `https://your-domain.example/api.php`. **Never serve the entire repository as the web document root.**
6. Build and deploy the frontend:
   ```bash
   VITE_API_URL=/api.php npm run build
   ```
   Serve `dist/` on the same HTTPS origin.
7. Confirm login, session expiration, logout, permissions, data synchronization, backup recovery and staff functionality using **fictional test records** before entering live data.

## Migrating an existing database

1. Back up the database before making any changes.
2. The previous demo schema inserted `admin/123` as plaintext. The new API **rejects plaintext passwords**. Run the bootstrap script to replace the admin hash with a strong password.
3. Existing staff plaintext credentials will no longer work. Have an authenticated administrator reset every staff account to a new strong password. Do **not** publish the old credentials or attempt to carry plaintext passwords forward.
4. Verify the `users.passwordHash` field stores a hash rather than the original password.
5. Deploy the backend and frontend version together. Old frontend code is incompatible with the protected API.

## Local development with PHP

- The Vite development server proxies `/api.php` to `http://127.0.0.1:8012/speedy_cafe/api.php` by default.
- Run Apache/PHP locally on that endpoint and set `VITE_API_URL=/api.php` in a local `.env.local` file.
- Your PHP server must receive the required database environment variables.
- When using a proxy, same-origin cookies and CSRF requests must be tested through the Vite URL.

## Current security limitations

- Login throttling is currently tied to a session cookie and is **not sufficient** against distributed credential stuffing. Add a shared-store (DB/Redis) rate limiter or a properly configured web application firewall.
- The app currently uses client-side optimistic data updates. The UI may temporarily display an uncommitted change if the API rejects a request. Add authenticated persistence acknowledgments, reconciliation and multi-user conflict handling before relying on it for financial operations.
- Additional work is needed for detailed input/schema validation, least-privilege database grants, automatic backups, session retention policy, monitoring, and independent penetration testing.
- User provisioning and the default offline demonstration remain development features. Keep the local demo away from real data.

## Basic security smoke tests

GitHub Actions runs `npm run build`, `php -l` and a disposable MySQL-based HTTP integration test for authentication, CSRF, origin checks and staff/admin permissions. Passing these tests is **not** evidence of production security certification.
