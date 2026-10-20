# Phase 2 Plan — from Stage 1 prototype to production

> **SUPERSEDED (2026-10-20):** the client chose **Shopify (Basic, billed yearly)** for the live store. See [SHOPIFY_SETUP.md](./SHOPIFY_SETUP.md). This document is kept for reference only.

**Status:** DRAFT. Do not start this plan until the client has approved the Stage 1 prototype and all revision requests are closed.
**Written:** 2026-09-28, from the codebase at the end of the Stage 1 audit (branch `claude/intelligent-edison-536z5s`).
**Companion documents:** [HANDOFF.md](./HANDOFF.md) (how the project works today), [PRODUCTION_TODO.md](./PRODUCTION_TODO.md) (launch checklist), [CLIENT_INFORMATION_REQUIRED.md](./CLIENT_INFORMATION_REQUIRED.md) (what we need from the client).

The approach is an **evolution, not a rewrite**. Stage 1 was built so that the UI, business rules and user journeys can stay unchanged while the simulated back-end services are swapped for real ones behind the interfaces that already exist.

---

## 1. Current state (Stage 1)

### 1.1 Stack

| Layer | Stage 1 | Notes |
| --- | --- | --- |
| Framework | Next.js 16.3 (App Router, Turbopack), React 19.2, TypeScript 5 | Server components by default; server actions for all mutations |
| Styling | Tailwind CSS v4, locked `@theme` tokens in `src/app/globals.css` | Default palette disabled. Only the approved colours and functional shades can be used |
| Validation | Zod 4 schemas in `src/lib/validation.ts`, shared by client and server | |
| Icons / fonts | lucide-react; Satoshi (Fontshare web-font CSS), Inter fallback via `next/font` | Consider self-hosting Satoshi WOFF2 files (permitted under the ITF Free Font License) to remove the third-party request |
| Data | JSON file store `DATA_DIR/db.json` (`src/server/db.ts`) | Seeded from `src/data/seed`. In-memory fallback if the disk isn't writable |
| Auth | scrypt password hashes and an HMAC-signed session cookie (`nl_session`, 14 days) | The user is re-read from the store on every request |
| Payments | `PaymentProvider` interface; demo provider and browser-side demo card tokenizer | Test cards only |
| Email | `EmailProvider` interface; simulated provider that writes to `db.emailLog` | Visible in Admin → Email notifications |
| Files | Local disk `DATA_DIR/uploads`, served through an authorised route | Extension, size and magic-byte checks |
| Images | Generated SVG illustrations (`src/server/art`) and generated placeholder PDFs | Plain `<img>` tags |
| Tests | Vitest (51 unit tests); Playwright (44 e2e tests: journeys, regression, pricing-leak matrix, responsive) | |
| Hosting | Render free web service (`render.yaml`), temporary disk | Demo data re-seeds on every restart |

### 1.2 Architecture

```
Browser (client components: cart, forms, filters, demo toolbar)
   │  server actions / fetch(/api/uploads)
   ▼
src/app/actions/*        ← input validation (Zod), auth checks (requireUser / requireStaff(perm))
   │
   ▼
src/server/services/*    ← catalog, email, payments, uploads, notifications
src/lib/*                ← pure business rules: pricing, cart/delivery/tax, stock, calculator, filters, validation
   │
   ▼
src/server/db.ts         ← getDb() / mutate()  (JSON file today, database in Phase 2)
```

Server components read through `getDb()` and the catalog service. Everything that changes data goes through a server action that calls `mutate()`.

### 1.3 Folder structure (key parts)

```
src/app/(store)/        storefront + customer account routes
src/app/admin/          admin routes (layout guards with requireStaff)
src/app/actions/        server actions (auth, cart, checkout, quote, contractor, contact, account, admin)
src/app/api/uploads/    upload + authorised download
src/app/media/          generated images and PDFs (replace with real media / CDN)
src/components/         ui, layout, product, cart, checkout, forms, account, admin, home, catalog
src/config/             business.ts (placeholders), site.ts (nav), env.ts
src/data/seed/          demo catalogue, people, orders, quotes, settings
src/lib/                domain logic + types.ts (the data model)
src/server/             db.ts, auth/, services/, art/
tests/unit, tests/e2e   Vitest, Playwright
```

### 1.4 State and data

- **Server state:** one `Database` object (`src/lib/types.ts`) with users, categories, products, orders, quotes, uploads, contactSubmissions, emailLog, content, settings and counters.
- **Cart:** stored in the browser's `localStorage` as product IDs, options and quantities only. `getCartAction` re-prices it on the server for the current viewer. Prices from the browser are never trusted.
- **Checkout:** `placeOrderAction` re-prices the cart, recalculates delivery and tax, charges through `PaymentProvider`, creates the order, decrements stock and sends notifications.
- **Quotes:** `submitQuoteAction` validates, links uploaded file IDs, assigns a `Q-YYYY-NNNN` reference from `counters` and notifies.
- **Admin edits:** server actions guarded by `requireStaff(permission)`, then `revalidatePath("/", "layout")`.

### 1.5 Auth and roles

| Role | How it's represented | Access |
| --- | --- | --- |
| Guest | no session | Store, cart, guest checkout, quotes, contractor application |
| Customer | `role: "customer"`, `accountType: "regular"` | + account dashboard |
| Contractor | `accountType: "contractor"`, `contractorStatus: pending / approved / rejected` | Contractor prices **only** when `approved` |
| Staff | `role: "staff"`, `staffPermissions: StaffPermission[]` (catalog, orders, quotes, customers, content, settings) | Admin sections by permission, enforced in layouts **and** actions |
| Admin | `role: "admin"` | Everything |

### 1.6 Contractor pricing (must not regress)

- `canSeeContractorPricing()` and `resolvePrice()` in `src/lib/pricing.ts` are the **single source of truth**.
- Pages receive a `ProductView` / card view (`src/lib/catalog-view.ts`) containing only the resolved price. The raw `pricing` object is never sent to the browser.
- The e2e suite scans the raw HTML/RSC payload for `kind:"contractor"` and `"contractor":<number>` for guest, customer, pending, rejected and staff viewers. An approved-contractor positive control keeps the check honest.

### 1.7 Cart, checkout, quote, admin

These are complete user journeys and are **production-shaped**. Their UI and server actions stay. Only the services underneath them change.

### 1.8 Storage, email and payment simulation

| Concern | Simulation | Real implementation goes in |
| --- | --- | --- |
| Payments | `demoProvider` + `demo_tok_*` tokens from `src/lib/demo-card.ts` | New provider in `src/server/services/payments.ts`; replace the card form in `src/components/checkout/` with the provider's hosted fields |
| Email | `simulatedProvider`, logged to `db.emailLog` | `activeProvider()` in `src/server/services/email.ts` |
| Files | local disk | `storeUpload` / `readUpload` in `src/server/services/uploads.ts` |
| Data | JSON file | `src/server/db.ts` and the services that call it |

---

## 2. Production-ready vs demo-only

| Area | Production-ready (keep) | Demo-only (replace or remove) |
| --- | --- | --- |
| UI / design system | All pages, components, tokens, responsive layouts, accessibility basics | Generated SVG product art, placeholder PDFs, placeholder copy |
| Business rules | Pricing resolution, sale logic, variant adjustments, delivery zones, tax, calculator, stock states, quote references, validation schemas | — |
| Auth | Password hashing, signed cookies, server-side permission checks, re-reading the user each request | Demo accounts, `Demo1234`, one-click demo sign-in, the demo toolbar, credentials listed on the sign-in page (all hidden when `NEXT_PUBLIC_DEMO_MODE=false`) |
| Data | Type model in `src/lib/types.ts`; `getDb` / `mutate` seam | JSON file store, seed data, "Reset demo data" |
| Payments | `PaymentProvider` interface and order flow | Demo provider, demo card tokenizer, test cards |
| Email | Templates, triggers, per-template toggles, admin log | Simulated provider |
| Uploads | Validation (extension, size, magic bytes), ownership checks | Local disk storage, no virus scan |
| SEO | Metadata, sitemap, robots, product/breadcrumb/org JSON-LD | Placeholder business data inside the JSON-LD |
| Analytics | `track()` events and env-gated GA4 / Meta Pixel | No consent banner yet |
| Hosting | Build and start commands, security headers | Render free plan, temporary disk |

---

## 3. What must change for production

> **Cost constraint (client requirement):** no mandatory monthly platform or SaaS subscription; annual billing where practical; usage- or transaction-based fees are acceptable. The recommended stack and costs are in [HOSTING_AND_COSTS.md](./HOSTING_AND_COSTS.md) and **need client approval before anything is purchased or set up**.

1. **Database:** self-hosted PostgreSQL on the annually prepaid VPS (see HOSTING_AND_COSTS.md), with Drizzle, migrations, transactions and nightly off-site backups. Not a managed database, because those are billed monthly.
2. **Auth hardening:** password reset, email verification, rate limiting and lockout, optional 2FA for staff, session revocation, audit log.
3. **Payments:** a provider with **no monthly fee** (Stripe recommended for Canadian cards, Apple Pay and Google Pay; Helcim or Square as alternatives; avoid merchant plans with monthly fees), hosted fields, webhooks, refunds, idempotency.
4. **Email:** Amazon SES pay-as-you-go ("à la carte", no monthly fee) or the client's existing mailbox over SMTP; branded templates; SPF/DKIM/DMARC.
5. **File storage:** private storage on the VPS disk (already built), included in encrypted off-site backups; virus scanning (ClamAV, self-hosted) and a retention policy.
6. **Catalogue and media:** real products, photos (`next/image` with a CDN), spec sheets, warranty documents.
7. **Business data:** replace every placeholder in `src/config/business.ts` and the seed settings (delivery zones, pickup locations, tax, policies).
8. **Demo removal:** `NEXT_PUBLIC_DEMO_MODE=false`, remove demo accounts from production data, remove the reset action from production builds.
9. **Operations:** an annually prepaid Canadian VPS running Caddy (free Let's Encrypt SSL), Node.js and PostgreSQL; custom domain; self-hosted uptime monitoring; a staging environment (a second app instance on the same server).
10. **Legal:** privacy policy (PIPEDA), CASL-compliant consent, terms, returns and delivery policies, cookie consent.

---

## 4. Recommended Phase 2 order

Each step ends with `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` green, a README change-log entry, and a deploy to **staging** before production.

| # | Step | Depends on | Client input? |
| --- | --- | --- | --- |
| 0 | **Apply approved Stage 1 revisions** (copy, layout and colour tweaks the client asked for). Tag the approved state first: `git tag stage1-approved` | Client feedback | Yes |
| 0b | **Client approves hosting and costs** ([HOSTING_AND_COSTS.md](./HOSTING_AND_COSTS.md)). Nothing is purchased before this | — | Yes |
| 1 | **Staging environment and CI:** GitHub Actions running lint, typecheck, unit, build and e2e; a staging deploy with its own env vars | — | No |
| 2 | **Database layer:** add Postgres + Drizzle/Prisma; schema mirrors `src/lib/types.ts`; implement a repository layer with the same shape as today's `getDb` / `mutate` callers; a seed script that loads the demo data into staging | 1 | No |
| 3 | **Move reads and writes to the DB** one domain at a time (catalogue → users/auth → cart pricing → orders → quotes → content/settings → email log), keeping the tests green after each | 2 | No |
| 4 | **Auth hardening:** password reset, email verification, rate limiting, staff 2FA (optional), audit log | 3, email provider for reset emails | Partly (email domain) |
| 5 | **File storage:** keep VPS-disk storage behind `storeUpload` / `readUpload`; add a virus scan and off-site backups | 3 | No |
| 6 | **Email provider:** implement `EmailProvider`, branded templates, domain authentication | Domain / DNS | Yes |
| 7 | **Payments:** implement `PaymentProvider` with sandbox keys, hosted card fields, wallets, webhooks, refunds; keep the e-Transfer flow | 3 | Yes (merchant account) |
| 8 | **Real business data and catalogue:** business details, delivery zones, pickup locations, tax, policies; product import (CSV → DB) with photos and documents; switch to `next/image` | 3, client data | Yes |
| 9 | **SEO, analytics, consent:** final metadata, JSON-LD with the real address, GA4 / Meta Pixel IDs, cookie consent, Search Console | 8 | Yes |
| 10 | **Production hosting, domain and DNS** on the approved VPS (see HOSTING_AND_COSTS.md): Caddy and SSL, backups, monitoring | 1–9 | Yes, client approval of costs |
| 11 | **Final QA and launch:** cross-browser and device testing, accessibility audit, performance, client UAT, turn off demo mode, go live | All | Sign-off |

Steps 4–7 can run in parallel once step 3 is complete.

---

## 5. Migration risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Contractor price leak during the data-layer rewrite (e.g. a query returns the full product row to a client component) | High: commercial pricing exposed | Keep `resolvePrice` / `toProductView` as the only path from DB to UI; keep and extend `tests/e2e/regression.spec.ts`; never pass DB rows directly to client components |
| Money rounding differences (floats in JSON vs `numeric` in Postgres) | Totals change | Store cents as integers or `numeric(10,2)`; keep the `roundMoney` rules; add unit tests comparing old and new totals |
| Order and quote number collisions under concurrency | Duplicate references | Use DB sequences or `SELECT … FOR UPDATE` inside transactions (today's counters assume a single process) |
| Stock oversell with concurrent checkouts | Negative stock | Decrement stock in the same transaction as the order, with a conditional update |
| Time zones (dates were a Stage 1 bug) | Wrong restock or sale dates | Keep the `dateInputToISO` / `dateInputToEndOfDayISO` / `toDateInput` helpers in `src/lib/format.ts`; store `timestamptz` |
| Session invalidation when moving to DB-backed users | Everyone logged out | Acceptable at launch. Keep the cookie format or rotate `SESSION_SECRET` deliberately |
| Demo features leaking into production (toolbar, one-click sign-in, reset) | Security | Gate them on `env.demoMode` (already done) **and** remove demo users from production data; add a test that production mode has no demo UI |
| Breaking established journeys while refactoring | Client trust | No UI or route changes without sign-off; run the full e2e suite on every step |
| Payment webhook failures | Paid orders stuck as unpaid | Idempotent webhook handler, admin view of payment status, reconciliation report |
| Upload migration | Old quote files lost | Stage 1 files live on temporary disk and are demo-only. Nothing to migrate unless the client used the demo for real requests |

---

## 6. How to preserve existing functionality

1. **Freeze the baseline:** tag the approved commit (`stage1-approved`) and keep the live demo on that tag until production is ready.
2. **Keep the seams:** replace implementations behind `getDb` / `mutate`, `PaymentProvider`, `EmailProvider`, `storeUpload` / `readUpload`. Don't change the UI or the server-action signatures.
3. **Tests are the contract:** the 44 Playwright tests and 51 unit tests must stay green at every step. Add tests before changing behaviour.
4. **Keep demo mode working** on staging (`NEXT_PUBLIC_DEMO_MODE=true` plus seeded demo data) so the client can still review flows while production integrations are built.
5. **One domain at a time:** migrate catalogue, then users, then orders, and so on, each in its own commit and PR, with a README change-log entry.
6. **No new visual design** unless the client asks for it. Colour tokens stay locked in `globals.css`.
