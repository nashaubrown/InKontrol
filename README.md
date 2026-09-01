# InKontrol

Work management and social media marketing for agencies, in one workspace. Phase 1.1 (foundation) is implemented: multi-tenant organizations, roles, invites, and the Workspace → Space → Folder → List hierarchy with a navigation shell.

## Stack

Next.js (App Router) + TypeScript · PostgreSQL + Prisma · Auth.js (credentials, JWT sessions) · Tailwind CSS 4

## Getting started

1. `cp .env.example .env` and fill in `DATABASE_URL` and `AUTH_SECRET` (`openssl rand -base64 32`).
2. `npm install`
3. `npx prisma migrate dev` — creates the schema.
4. `psql "$DATABASE_URL" -f prisma/rls/001_rls.sql` — applies Row-Level Security policies (second tenant-isolation layer beneath the app's repository layer).
   In production also run `prisma/rls/002_app_role.sql` and point `DATABASE_URL` at the non-superuser `app_user` role — superusers bypass RLS. Migrations still run with the admin connection.
5. `npm run dev` and open http://localhost:3000.

## Tenant isolation

- Every tenant-scoped table carries `organizationId`.
- All hierarchy queries go through `src/lib/repos/*`, which take a server-derived `OrgContext` (from the session + membership check, never client input) and run inside `withOrg()` — a transaction that sets `app.current_org_id` so Postgres RLS enforces isolation even if application code has a bug.
- Invites are single-use, 48-hour tokens; only the SHA-256 hash is stored.
- Login attempts are rate-limited (5 failures / 15 min per email).

## Feature flags (env-gated integrations)

The core app works with just `DATABASE_URL` + `AUTH_SECRET`. Each integration
activates when its env vars are set (see `.env.example`): email (Resend),
Telegram, WhatsApp (Meta Cloud API), Google Drive/Dropbox import
(`SECRETS_KEY` + OAuth app credentials), and Stripe billing.

## Roadmap status

All five phases of the build brief are implemented:

1. **ClickUp-core** — hierarchy, tasks + List/Board/Calendar views, comments,
   Docs, attachments, notifications + automations, templates, client portal,
   billing.
2. **Metricool-core** — social accounts (demo adapters until platform approvals
   land), composer with approval workflow, scheduling via cron, unified content
   calendar, analytics, competitor tracking, client reports.
3. **ClickUp-advanced** — time tracking, workload, goals/OKRs, intake forms,
   dashboard. (Whiteboards/chat deferred per the brief's priority guidance.)
4. **Metricool-advanced** — AI content assistance (brand voice), keyword rank
   tracking; ads/website analytics models ready behind platform approvals.
5. **Platform maturity** — outbound webhooks (HMAC-signed), public REST API
   with scoped keys, PWA manifest, task AI assistant (subtasks + summaries).

Real social publishing, WhatsApp, ads reporting, and SERP data each activate
when their platform approval or vendor contract is added — the env vars are
documented in `.env.example`.
