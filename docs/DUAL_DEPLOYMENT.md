# Local installation and isolated online hosting

## Deployment architecture

One codebase and one container image; two ways to run it:

| Mode | Access | Database isolation | TLS |
| --- | --- | --- | --- |
| Demo | Vite / browser | Fictional browser LocalStorage | Not for real data |
| Local installed | `http://localhost:8080` on **the same PC only** | One private Docker MySQL volume per installation | Loopback-only HTTP, not reachable from other devices |
| Hosted single cafe | `https://your-cafe.example` | One unique Docker Compose project / MySQL volume **per cafe** | Caddy automatic HTTPS |

**This does not provide a shared multi-tenant SaaS platform or public account self-registration.** To host three cafes, deploy three independent stacks with three independent subdomains, databases, credentials, volumes and backups. The schema has no `tenant_id`; sharing one database between cafes would expose one cafe's records to another. Never do it.

### Prerequisites

Docker Engine / Docker Desktop and Docker Compose v2. For online: a Linux VPS with ports 80 and 443 available, DNS A/AAAA record for your domain, and a reliable off-site backup destination.

### 1. Create private .env file

From project root, copy `deploy/.env.template` to `.env`. Set long, independent random passwords. Never commit `.env`.

- `SPEEDY_DB_PASSWORD`: database application's password
- `SPEEDY_DB_ROOT_PASSWORD`: separate database root password
- Hosted only: `SPEEDY_DOMAIN` (DNS hostname, no `https://`), `COMPOSE_PROJECT_NAME` (unique to the cafe)

### 2. Local single-PC installation

In the repo root:

```bash
docker compose --env-file .env -f deploy/local.compose.yml up -d --build
```

Open **http://localhost:8080** only from the same PC. Docker binds port 8080 to `127.0.0.1`, not the LAN or Internet. A second PC must not access the local HTTP instance. To make LAN access available, install a properly configured HTTPS reverse proxy and change to hosted mode rather than exposing HTTP directly.

The database schema loads on first boot only for a **new empty volume**. It does not overwrite existing data on restart.

### 3. Hosted single-cafe installation

Point your DNS to your server. From the repo root on that server:

```bash
docker compose --env-file .env -f deploy/hosted.compose.yml up -d --build
```

Open `https://${SPEEDY_DOMAIN}` in a browser. DNS and ports 80/443 must work for Caddy to obtain a valid TLS certificate. The application and MySQL have **no published ports** in hosted mode: only Caddy is publicly accessible. Do not add direct `ports:` to the PHP application or database. The proxy overwrites the forwarded HTTPS header.

For each cafe use its **own server or separately isolated stack**, distinct `COMPOSE_PROJECT_NAME`, subdomain, database secrets, backups and deployment environment. Caddy's standard ports are shared per server; multiple hosted stacks on one server require a **single shared edge proxy** and separate private app networks instead of starting one proxy per cafe.

### 4. Provision administrator (both modes)

After the DB is healthy, run from a terminal **without putting the secret in shell command history**:

```bash
read -r -s -p "Choose administrator password (12+ characters): " SPEEDY_ADMIN_PASSWORD
echo
export SPEEDY_ADMIN_PASSWORD
docker compose --env-file .env -f deploy/local.compose.yml exec -T -e SPEEDY_ADMIN_PASSWORD app php /opt/speedy/scripts/bootstrap-admin.php
unset SPEEDY_ADMIN_PASSWORD
```

For hosting, replace `deploy/local.compose.yml` with `deploy/hosted.compose.yml`. Login with `admin` and **your own password**. Old browser demo `admin/123` is never a valid server account.

When upgrading an existing SQL database, **back it up and apply the documented additive migration before enabling the new server code**. Existing plaintext staff credentials must be rotated.

### 5. Backups

Create a backup while running the stack:

```bash
bash scripts/backup-database.sh local
# or
bash scripts/backup-database.sh hosted
```

Backups are stored under `backups/` with restrictive filesystem permissions. **Move encrypted copies off the machine** on a schedule; a local disk backup alone will not survive device failure. Test the restore procedure on an isolated non-production stack before relying on it. Do not run a database restore on a production database without a verified backup and a maintenance window.

### Security and remaining release gates

- Demo mode is client-side and **not** authenticated for production.
- Both deployments use the same server-authenticated PHP API; the backend must be configured via env vars and never with a default admin password.
- The user interface currently makes optimistic financial and operational updates, and the API still trusts several client-calculated amounts. Do not process live payments or customer balances until financial invariants, idempotency, failure reconciliation and multi-user concurrency have been implemented and independently tested.
- There is **no** cafe signup/tenant switching, SaaS billing, central administration, or cross-cafe identity management yet.
- The online compose example is an isolated single-cafe reference deployment, not a fully managed SaaS production service.
- Docker on Windows may reserve resources; stop the local stack with `docker compose --env-file .env -f deploy/local.compose.yml down` (without `-v`, which deletes data volumes).
