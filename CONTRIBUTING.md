# Contributing to Speedy Cafe

Speedy Cafe is an MIT-licensed community codebase for internet cafe and gaming venue management. Review [SECURITY.md](SECURITY.md) and [public release requirements](docs/PUBLIC_RELEASE_CHECKLIST.md) before working on any feature involving customers, accounts, payments or sessions.

## Quick development environment

1. Fork and clone the repository.
2. Install Node.js 22 and run `npm ci`, then `npm run dev` for the **fictional browser-only demo**.
3. For authenticated features, use the [isolated Docker local setup](docs/DUAL_DEPLOYMENT.md); never use genuine customer records in tests.
4. Keep database passwords in `.env` (ignored by Git). Do not commit `backups/`, SQL exports, session cookies, API secrets or real personal data.

## Submitting a change

- Open an issue describing the bug and its reproduction with synthetic data.
- Branch from `main`, keep PRs focused, document new API/database changes and include migration instructions if schema changes.
- Add tests for changed permissions, persistence, billing, role checks, retries and concurrent user behavior.
- Run `npm ci && npm run build` and check the GitHub Actions CI jobs before requesting review.
- Any change to billing, session authorization or customer balances must use transactional backend operations and must not quietly modify amounts from the browser.
- Do not bypass the protected main branch or remove CI checks to merge.

## Security and privacy

**Never post credentials, customer data, financial records, backup archives or exploit details in public issues/PRs.** Report security concerns privately to the repository owner, following [SECURITY.md](SECURITY.md). Reviewers may close contributions that expose real data.

## Scope limits

This software supports fictional demo, local single-cafe Docker and separate hosted single-cafe stacks. A central multi-tenant SaaS, payment gateway, refund processor and tax-compliant accounting are not currently implemented. Proposals for those should include explicit data-isolation, legal, migration and testing requirements.
