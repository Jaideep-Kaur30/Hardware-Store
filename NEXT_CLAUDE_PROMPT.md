# Prompt for the next Claude session (Phase 2 kick-off)

> **SUPERSEDED (2026-10-20):** the client chose **Shopify (Basic, billed yearly)** for the live store. See [SHOPIFY_SETUP.md](./SHOPIFY_SETUP.md). This document is kept for reference only.

> **For the human:** only use this **after the client has approved Stage 1**. Before pasting, fill in the two `<<…>>` placeholders: the approval date, and the revisions (or "none"). Copy everything between the lines below into a new Claude Code session on this repository.
>
> **Note:** this file was written at the end of Stage 1 (2026-09-28). The instructions inside it were **not** carried out then.

---

You are continuing work on **Northline Building Supply**, a hardware and building-materials e-commerce website. It is built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Zod, Vitest and Playwright. The repository is `saumyaagelani/Hardware-Store`, and the working branch that deploys the live demo is `claude/intelligent-edison-536z5s` (Render auto-deploys it to https://northline-prototype.onrender.com).

## Where the project stands

**Stage 1 (client-facing prototype) is complete, audited and approved by the client on <<APPROVAL DATE>>.**
Approved revisions to apply first: <<LIST OF REVISIONS, OR "NONE">>.

Stage 1 already includes, and works end to end with demo data:

- **Storefront:** 11 categories, filters, search, deals, product pages with variations, sale pricing, stock states and a square-footage calculator; mini cart and cart; delivery postal-code checker
- **Checkout:** guest checkout with pickup or delivery (postal-code zones, fees, oversized "fee to be confirmed", preferred date), HST, demo payments (test cards, Apple Pay and Google Pay simulation, Interac e-Transfer)
- **Quotes:** general form, from a product, and from the cart, with validated file uploads (extension, size, file signature); `Q-YYYY-NNNN` references
- **Customer accounts:** register, sign in, dashboard (profile, addresses, orders, quotes, files, settings)
- **Contractor program:** application, then pending / approved / rejected. **Contractor prices are only ever sent to approved contractors** and are resolved on the server
- **Admin:** products, categories, variations, media, pricing, inventory, orders, quotes, customers, contractor approvals, messages, delivery and pickup settings, promotions, content, email log, staff permissions, integrations page
- **Simulated services:** email log, demo payment provider, JSON-file data store, local-disk uploads
- **Demo tooling:** accounts (password `Demo1234`), a presenter toolbar for switching persona and resetting data, sample data
- **Tests:** 51 unit tests and 44 Playwright e2e tests, including a contractor-price leak matrix and responsive checks at 375–1440 px

## Read these first (in this order)

1. `CLAUDE.md` and `AGENTS.md`: project rules. Every commit must update the README change log and **Last updated**. Next.js 16 differs from older versions, so read `node_modules/next/dist/docs/` before using unfamiliar APIs.
2. `HANDOFF.md`: how everything works today (commands, env vars, key files, routes, demo accounts, data model, limitations).
3. `PHASE_2_PLAN.md`: the target architecture, recommended order, migration risks and how to preserve functionality.
4. `PRODUCTION_TODO.md` and `CLIENT_INFORMATION_REQUIRED.md`: what is outstanding and what the client has or hasn't supplied.

## What NOT to do

- **Do not introduce any mandatory monthly subscription** (Shopify/Wix-style platforms, paid Render/Vercel, managed databases, auth or email SaaS on monthly plans). The client wants a custom site with annual billing where practical. Use the stack in `HOSTING_AND_COSTS.md`, and **get client approval before purchasing or signing up for any paid service**. Never purchase anything yourself.
- **Do not rebuild or redesign** the storefront, account or admin UI. Do not change routes, established user journeys or the approved colour tokens in `src/app/globals.css` unless an approved revision says so.
- **Do not bypass `resolvePrice` / `toProductView`.** Never pass raw product rows or pricing objects to client components.
- **Do not remove demo mode.** Keep it working on staging (`NEXT_PUBLIC_DEMO_MODE=true`, seeded demo data) until launch. Production turns it off with the env var.
- **Do not commit secrets.** All credentials go in environment variables. Use sandbox or test keys until the client approves going live.
- **Do not skip, weaken or delete existing tests** to get a green build.
- **Do not push experimental work to `claude/intelligent-edison-536z5s`**, because it redeploys the client's demo. Use feature branches and PRs, and merge only when everything is green.

## Safe start (do these before any Phase 2 code)

1. `git fetch origin && git checkout claude/intelligent-edison-536z5s && git pull`
2. `npm ci`, then run the baseline: `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`. **All must pass before you change anything.** If something fails, fix that first and report it.
3. Tag the approved baseline if it isn't tagged yet: `git tag stage1-approved && git push origin stage1-approved`.
4. Apply the approved revisions (above) as small commits on the demo branch, with tests green and a README entry for each.
5. Create a working branch for Phase 2, e.g. `phase2/staging-ci`, and open PRs from feature branches.

## Phase 2 sequence (follow `PHASE_2_PLAN.md` §4)

1. **Staging and CI:** GitHub Actions running lint, typecheck, unit, build and e2e on every PR; a staging deployment with its own env vars.
2. **Database layer:** Postgres + Drizzle (or Prisma). Schema from `src/lib/types.ts`; money as integer cents or `numeric(10,2)`; `timestamptz`; transactions for checkout (order + stock + payment) and for reference counters; a staging-only seed script with the demo data.
3. **Migrate one domain at a time** behind the existing `getDb` / `mutate` callers: catalogue → users/auth → cart pricing → orders → quotes → content/settings → email log. Keep every test green after each step.
4. **Auth hardening:** password reset, email verification, rate limiting, optional staff 2FA, audit log.
5. **File storage:** keep private VPS-disk storage behind `storeUpload` / `readUpload`; add virus scanning and off-site backups.
6. **Email:** implement `EmailProvider` for Amazon SES pay-as-you-go (or the client's SMTP); branded templates; SPF/DKIM/DMARC.
7. **Payments:** implement `PaymentProvider` (Stripe recommended) with sandbox keys, hosted fields, wallets, webhooks, refunds; keep the e-Transfer flow.
8. **Real business data and catalogue** from the client: business details, zones, tax, policies; product CSV import; photos via `next/image`.
9. **SEO, analytics and cookie consent.**
10. **Production hosting on the approved annually prepaid VPS** (Caddy, PostgreSQL, backups, monitoring), domain and DNS.
11. **Final QA and launch:** cross-browser, accessibility, performance, client UAT, `NEXT_PUBLIC_DEMO_MODE=false`, remove demo users from production data.

Steps that need client information or third-party credentials are marked `[CLIENT]` and `[3RD-PARTY]` in `PRODUCTION_TODO.md`. If they're missing, build and test with sandbox or placeholder values behind env vars, and list exactly what's still needed.

## Regression testing (every step)

- Run `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` before every push.
- `tests/e2e/regression.spec.ts` contains the **contractor-price leak matrix**. It must keep passing for guests, regular customers, pending and rejected contractors and staff, with the approved-contractor positive control.
- For user-journey changes, also check manually at 375, 390, 430, 768, 1024, 1280 and 1440 px.
- When replacing a simulated service, add tests for the real adapter (sandbox mode) **and** keep the demo implementation selectable for local development and staging.
- After each step: update README (change log, Last updated, affected sections) and tick items in `PRODUCTION_TODO.md`.

Start with **"Safe start"** above, report the baseline results, then continue with Phase 2 step 1. Don't ask questions you can answer from the repository documents.
