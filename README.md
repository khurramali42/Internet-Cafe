# Speedy Cafe
### Internet Cafe & Gaming Center Management Dashboard

A browser-based management project for internet cafes, gaming lounges, PC cabin businesses, and shared-workstation venues. Built with **React, TypeScript, Vite, PHP, and MySQL**.

> **Development preview, not production-ready.** The browser-only demo uses fictional data and intentionally weak demo credentials. The optional PHP backend now includes server-side sessions, password hashing, CSRF, role checks, and login throttling, but full production deployment and business-data integrity have not been independently validated. **Do not put real customer or financial data in an unreviewed deployment.** See [SECURITY.md](SECURITY.md).

## What you can explore

- **PC/cabin dashboard:** Availability, occupied/on-hold/maintenance status, and session controls.
- **Sessions and billing:** Start, pause, close, and calculate time-based charges.
- **Customers:** Records and outstanding-balance tracking.
- **Operations:** Inventory, repair tickets, expenses, and transactions.
- **Reporting:** Financial visualizations and audit-log UI.
- **Local demo mode:** Browser-based storage lets you explore without a server.
- **Optional authenticated backend:** PHP/MySQL synchronization includes server-side login and session protection. Basic input limits are enforced, but server-authoritative pricing, transactional consistency and multi-user integrity still require production validation.

## Who it's for

Cafe owners and operators who want to evaluate a management dashboard; developers interested in contributing to an internet cafe software project. This is an early-stage community project, not a tested point-of-sale or access-control solution.

## Authenticated backend (main branch)

The default build is an **isolated fictional demo**. To connect to a real PHP/MySQL backend, configure `VITE_API_URL=/api.php`, provision a strong administrator using the CLI bootstrap script, and serve PHP and the frontend on the same HTTPS origin. The protected API uses server-side sessions, CSRF validation and role authorization.

**Do not copy demo credentials into a real deployment.** Before upgrading an existing install, back up the database and review the [secure deployment and credential migration guide](docs/SECURE_DEPLOYMENT.md). The older database schema used plaintext seeded passwords; these no longer work against the protected API.

## Public release status and deployment requirements

This is a public, MIT-licensed **technical preview**, not a turnkey certified point-of-sale system. The repository can be cloned and tried with fictional data. **Real cafe use requires per-installation HTTPS, backups, administrator credentials, tested recovery and financial reconciliation.**

See the [public release acceptance checklist](docs/PUBLIC_RELEASE_CHECKLIST.md). For an **existing database**, use the backup-gated additive migration `scripts/migrate-financial-schema.php` after reconciling old balances; importing `database.sql` will not migrate existing tables. Never upload any customer backups to GitHub.

## Server-authoritative billing (local and hosted)

Authenticated PHP/MySQL deployments use atomic check-in, session holds, checkout and outstanding-balance settlement. Payment writes wait for database confirmation, replayed checkouts cannot charge twice, and cash balance totals cannot be directly overwritten from the browser. See the [billing integrity and safe-upgrade guide](docs/BILLING_INTEGRITY.md).

This improvement does **not** certify the software as an accounting/POS system. Existing records created by older insecure versions should be reconciled before an upgrade, and hosted deployments require real-world validation.

## Quick start on Windows (local cafe)

With Docker Desktop running, open PowerShell in the cloned project folder:

```powershell
.\\scripts\\install-local.ps1
```

The installer generates private database credentials, builds the local app, and prompts for a new administrator password. Open `http://localhost:8080` on the same PC. This is not a LAN or public installation.

## Install locally or host one cafe online

The same frontend and authenticated PHP/MySQL backend now have two reproducible Docker configurations:

- **Local installation:** one cafe on one PC at `http://localhost:8080` (loopback only).
- **Hosted installation:** one cafe per isolated Docker stack and database, using HTTPS via Caddy and your own domain.

See the [local + hosted deployment guide](docs/DUAL_DEPLOYMENT.md) for setup, secrets, initial admin login, and database backups.

**Online mode currently means a hosted instance for one cafe, not a central multi-tenant SaaS.** To operate multiple cafes, use fully separate database installations; there is no tenant-scoped schema or public signup yet. Never use the local HTTP setup over a LAN or the public Internet. Production financial-data and concurrent-user testing are still required.

## Try the local demo

Requirements: Node.js 18+ and npm.

```bash
git clone https://github.com/khurramali42/Internet-Cafe.git
cd Internet-Cafe
npm install
npm run dev
```

Open the URL Vite prints in the terminal. To explore the local demo UI, use `admin` / `123` (demonstration only; **never use this on a public deployment**).

## Optional PHP/MySQL server setup

Use the [Secure Deployment Guide](docs/SECURE_DEPLOYMENT.md) for a **new database** or migration from the historical insecure demo database. Configuration includes server-side environment variables, CLI admin provisioning with a 12+ character password, HTTPS and same-origin API hosting. Set `VITE_API_URL=/api.php` at frontend build time.

The **demo** and **authenticated server mode** are different operating modes. Merely enabling a setting in the demo does not turn it into a secure server deployment. The frontend build alone does not host PHP or MySQL.

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| UI | Lucide icons, Recharts |
| Prototype backend | PHP, PDO |
| Data store | MySQL and browser LocalStorage (demo) |

## Screenshots (local fictional demo data)

The screenshots below were automatically captured from the running React application in a clean browser using built-in fictional demo data. They do **not** imply production security or a hosted live demo.

### Dashboard
![Speedy Cafe cabin dashboard](docs/screenshots/02-dashboard.png)

### Customer management
![Speedy Cafe customers screen](docs/screenshots/03-customers.png)

### Inventory / stock
![Speedy Cafe inventory screen](docs/screenshots/04-inventory.png)

### Reports
![Speedy Cafe financial reports](docs/screenshots/05-reports.png)

### Login
![Speedy Cafe demo login](docs/screenshots/01-login.png)

Screenshots are reproducible via the [GitHub Actions capture workflow](.github/workflows/demo-screenshots.yml). A safe public hosted demo has not yet been verified.

## Project status and contributing

- **Status:** Early-stage / development preview.
- **Known critical issues:** [Security guidance](SECURITY.md).
- **Roadmap:** See the repository's GitHub Issues.
- **Feedback:** Open an issue describing your venue type, number of PCs, desired features, and any bugs (without personal or financial data).
- **Reuse/licensing:** Released under the [MIT License](LICENSE). You may use, modify, and redistribute the code under its terms. The software is provided without warranty.

If you run a gaming center or internet cafe, I'd like to hear what workflow would make this product useful for you.
