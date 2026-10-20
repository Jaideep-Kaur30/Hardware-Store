# Northline Building Supply — E-commerce Prototype (Stage 1)

A client-facing prototype for a hardware / building-materials store selling vinyl flooring, stairs, doors, locks, shower bases and doors, shower accessories, toilet seats, vanities, plumbing and WPC wall panels.

The prototype demonstrates the full customer, contractor and admin experience with realistic demo data. External production services (payments, email, file storage, database) are simulated behind clean interfaces so the codebase can move to production in Stage 2 without a rewrite.

**Live demo:** https://northline-prototype.onrender.com (branch `claude/intelligent-edison-536z5s`, auto-deploys on every push)
**Last updated:** 2026-09-28 — see the [Change log](#change-log) at the bottom.

> **Placeholder notice:** "Northline Building Supply", the address, phone numbers, emails, hours, brand names, product specifications and policies are **fictional placeholders**. Product images are generated illustrations, not photographs. Replace them before launch (see [Where to change things](#where-to-change-things)).

---

## Quick start

Requirements: Node.js 20+ (tested on Node 22) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

The first request seeds the demo database into `.data/db.json`. Changes you make (orders, quotes, approvals, product edits) persist across restarts.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end journeys (Playwright) — run `npm run build` first |
| `npm run demo:reset` | Delete the demo database so it re-seeds on next start |

The demo data can also be reset from the **Demo** toolbar (bottom-right) → *Reset demo data*.

### Environment variables

Copy `.env.example` to `.env.local`. **Nothing is required** for the prototype. Key variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (metadata, sitemap) |
| `NEXT_PUBLIC_DEMO_MODE` | `true` shows the presenter toolbar and demo credentials; set `false` for production |
| `SESSION_SECRET` | Signs session cookies. **Required in production.** If unset a random per-process secret is used |
| `DATA_DIR` | Location of the demo JSON store and uploads (default `./.data`) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GSC_VERIFICATION` | Analytics / Search Console — scripts only load when set |
| `STRIPE_*`, `EMAIL_*` | Reserved for Stage 2 integrations (unused today) |

No secrets are committed to the repository.

---

## Deploying a shareable demo (Render)

The repo includes a `render.yaml` Blueprint.

1. Sign in at https://render.com (free) and connect your GitHub account.
2. **New → Blueprint** → choose this repository and the branch to deploy → **Apply**.
3. Wait for the first build (~3–5 min). Your link will look like `https://northline-prototype.onrender.com`.

Notes:
- The free plan sleeps after ~15 min of inactivity; the first visit afterwards takes ~30–60 s to wake. Open the link a minute before a meeting.
- Free instances use temporary storage, so demo data resets to the original seed on each restart or redeploy. For permanent changes, use a paid plan with the disk block in `render.yaml`.
- `SESSION_SECRET` is generated automatically; the public URL is detected automatically (`RENDER_EXTERNAL_URL`). To use a custom domain, set `NEXT_PUBLIC_SITE_URL`.
- Demo mode stays on (presenter toolbar + demo logins). Anyone with the link can sign in with the demo accounts — share it only with the client.

---

## Demo accounts & presenting

All demo accounts use the password **`Demo1234`**. Emails use the reserved `example.com` domain.

| Persona | Email | What to show |
| --- | --- | --- |
| Regular customer | `jordan.avery@example.com` | Retail pricing, dashboard with orders, quotes, uploaded files |
| Approved contractor | `priya.raman@example.com` | Contractor prices on eligible products ("Contractor price" label) |
| Pending contractor | `marcus.bell@example.com` | Retail pricing + "application under review" notices |
| Rejected contractor | `elena.novak@example.com` | Retail pricing, rejection reason on status page |
| Administrator | `admin@example.com` | Full admin dashboard |
| Staff (limited) | `taylor.kim@example.com` | Admin with orders/quotes/customers permissions only |

**Presenter toolbar:** in demo mode a *Demo* button (bottom-right) switches personas in one click and resets data between meetings. The sign-in page also lists demo accounts (click to fill).

**Test payments:** card `4242 4242 4242 4242` (any future expiry, any CVC) succeeds; `4000 0000 0000 0002` is declined; `4000 0000 0000 9995` shows insufficient funds. Apple Pay / Google Pay open a simulated wallet sheet; Interac e-Transfer creates an order awaiting payment with instructions.

**Delivery postal codes (placeholder zones):** `L5A 1B2` (Local, $79), `M4C 1A1` (Metro, $119), `N2L 3G1` (Extended, $169). Anything else (e.g. `V6B 1A1`) is outside the delivery area. More than 6 oversized units (doors, vanities, shower bases…) → *delivery fee to be confirmed*.

### Suggested demo script

1. **Homepage → category → product**: show stock states, sale pricing, the square-footage calculator (Harbour Oak SPC), variations (Coastline SPC colours recolour the images).
2. **Cart → checkout** as a guest: delivery vs pickup, postal-code fee, preferred date, test card, confirmation.
3. **Cart → "Request quote for this cart"** and the **Free Quote** form with a PDF/photo upload → reference `Q-2026-00NN`.
4. **Contractor journey**: apply at `/contractors/apply` → pending status → switch to *Administrator* → *Contractor applications* → approve → switch back → contractor prices appear.
5. **Admin**: edit a product price/stock (Pricing & Inventory tables or product editor) and show the storefront update; open a quote, set it to *Quoted* with an amount, then show it in Jordan's dashboard; browse the email-notification log.

---

## Stack & architecture

- **Next.js 16 (App Router) + React 19 + TypeScript**, server components by default, server actions for mutations
- **Tailwind CSS v4** with a locked design-token palette (`src/app/globals.css`) — the default Tailwind colour palette is disabled so only approved tokens can be used
- **Zod** validation (shared client/server schemas), **lucide-react** icons (single icon set)
- **Vitest** unit tests, **Playwright** end-to-end tests
- Fonts: **Satoshi** for body and headings, the same typeface as the reference site. It is loaded from Fontshare's official web-font CSS in `src/app/layout.tsx` under the ITF Free Font License, and no font files are committed. Inter (self-hosted via `next/font`) is the fallback. Weights: 400 body, 500 hero heading and buttons, 600 labels/nav/section headings, 700 page titles

```
src/
  app/
    (store)/            Storefront routes (home, shop, products, cart, checkout, quote, contractors, account…)
    admin/              Admin dashboard routes (guarded server-side)
    actions/            Server actions: auth, cart, checkout, quote, contractor, account, admin
    api/uploads/        File upload + authorised download
    media/              Generated placeholder imagery and spec-sheet PDFs
  components/           UI grouped by area (ui, layout, product, cart, checkout, forms, account, admin, home, catalog)
  config/               business.ts (placeholders), site.ts (navigation), env.ts
  data/seed/            Structured demo data (categories, products, people, orders/quotes, settings)
  lib/                  Pure domain logic: pricing, stock, calculator, cart/delivery, catalogue filters, validation, types
  server/
    db.ts               Prototype JSON data store (swap for a real DB in Stage 2)
    auth/               Password hashing (scrypt) and signed-cookie sessions
    services/           Catalogue, email, payments, uploads, notifications
    art/                Placeholder illustration + PDF generators
tests/
  unit/                 Vitest
  e2e/                  Playwright journeys A–G, responsive and console checks
```

**Layering:** UI → server actions → services/lib → `server/db.ts`. Business rules (pricing, delivery, validation) live in `src/lib` as pure, tested functions. Replacing the JSON store with Postgres (Prisma/Drizzle) means re-implementing `getDb`/`mutate` and the services, not the UI.

### Demo data strategy

`src/data/seed` builds the database from compact structured definitions (≈60 products across all 11 categories, 10 customers covering every contractor state, 12 orders, 9 quotes, uploaded-file metadata, contact messages and notification history). Dates are relative to "now" so the demo always looks current. The seed is written to `DATA_DIR/db.json` on first run. If the directory isn't writable (e.g. serverless hosting) the store falls back to in-memory mode.

---

## Brand colours

Defined once in `src/app/globals.css` (`@theme`). The default Tailwind palette is disabled, so only these tokens can be used.

**Storefront: reference dark theme + client-approved accent.** The storefront layout adds the `theme-dark` class. That class remaps the light-theme utilities onto the reference palette in one place, so individual components need no per-file colour changes. The admin keeps the light theme.

| Token | Colour | Role (reference variable) |
| --- | --- | --- |
| `page` / `ink` | `#1D211C` | Page background, header, nav, footer (`--bg`) |
| `surface` | `#262B24` | Cards, panels, menus, cart drawer, hero panel (`--surface`) |
| `surface-2` | `#32382F` | Raised panels, hover states, top strip (`--surface2`) |
| `cream` | `#F3F1E9` | Primary text (`--text`) |
| `stone` | `#B2B7AA` | Secondary / muted text (`--muted`) |
| `edge` / `ink-line` | `#40463C` | Borders and dividers (`--line`) |
| `sage` | `#CDD7BD` | Pale sage button treatment (the "dark" button variant) (`--button`) |
| `inverse` | `#20291C` | Text on sage and light cards (`--inverse`) |
| `gold` | `#F5B82E` | **Brand accent**, client-approved. Replaces the reference's `#D6B47D`. Used for primary buttons, highlighted headline words, eyebrows, active nav, contractor-pricing link, sale prices and badges, selected options, accent icons |

**Admin (light theme):** white `#FFFFFF`, light gray `#F3F4F6`, muted gray `#9CA3AF`, body text `#4B5563`, borders `#E5E7EB`, with the dark `#1D211C` sidebar and the same `#F5B82E` accent. `gold-dark` `#B7830F` is kept only for small gold text on white in the admin, where the bright gold is unreadable; the storefront uses `#F5B82E` instead.

Status colours (stock, order and quote states, errors) have lighter tints on the dark storefront so they stay readable.

---

## How key features work

### Contractor pricing

- Every product has `retail`, `sale`, `contractor` prices and a `visibility` of `public`, `contractors_only` or `hidden` (`src/lib/types.ts`).
- `resolvePrice()` in `src/lib/pricing.ts` decides what a viewer sees. **Only** accounts with `accountType: "contractor"` **and** `contractorStatus: "approved"` receive contractor prices. Guests, regular customers and pending/rejected contractors always get retail/sale pricing.
- Approved contractors get the lower of their contractor price and an active sale price.
- No retail price or `hidden` visibility → *Request a Quote*. `contractors_only` → quote for everyone except approved contractors.
- Pricing is resolved **on the server**. Pages and cart snapshots receive a `ProductView` with only the resolved `price` — the raw pricing object and contractor price never reach the browser for unauthorised viewers. Cart and checkout re-price on the server; browser-supplied prices are never trusted.
- The session cookie only holds a signed user id; role and contractor status are re-read on every request, so an approval takes effect on the next page load.
- A single `pricingTier` field is reserved on users for future multiple tiers or customer-specific pricing.

### Quote flow

1. Visitors (guest or signed in) submit `/quote` — directly, from a product (`?product=slug`) or from the cart (`?from=cart`, cart items imported; the cart is kept).
2. Files upload individually to `/api/uploads` (extension, size **and** file-signature checks; stored outside `public/` with random names).
3. `submitQuoteAction` validates input, allocates the next reference (`Q-YYYY-NNNN`, per-year sequence), links uploads, attaches the quote to the signed-in account, and sends (simulated) customer + admin emails.
4. Staff manage it in **Admin → Quote requests** (Submitted → Under Review → Additional Info Required → Quoted → Approved/Declined). Status changes are emailed (simulated) and appear in the customer's dashboard.

### Checkout, delivery & payments

- Pickup (free, location details and readiness from settings) or delivery (postal-code zone matching, fee, free-over threshold, oversized → fee TBC, preferred date "subject to confirmation").
- HST is configurable in **Admin → Delivery settings** (placeholder 13%).
- Payments go through a `PaymentProvider` interface (`src/server/services/payments.ts`). The prototype uses a demo provider; the browser "tokenises" test cards so raw card numbers never reach the server — mirroring hosted payment fields in production.

### Email notifications

`sendNotification()` renders every email (registration, contractor application/decision, quotes, orders, contact form) and records it in the notification log (**Admin → Email notifications**) instead of sending. Each template can be toggled on/off.

### Analytics

`src/components/analytics.tsx` loads GA4 / Meta Pixel only when IDs are configured. `track()` (`src/lib/analytics.ts`) already fires `add_to_cart`, `begin_checkout`, `purchase`, `generate_lead`, `sign_up` and `search`.

---

## Where to change things

| What | Where |
| --- | --- |
| Business name, phone, email, address, hours, social links | `src/config/business.ts` |
| Colours, radius, shadows, typography | `src/app/globals.css` (`@theme` tokens) |
| Logo | `src/components/layout/logo.tsx` (browser-tab icon: `src/app/icon.svg`) |
| Navigation & footer links, departments | `src/config/site.ts` |
| Products & categories (seed) | `src/data/seed/products.ts`, `src/data/seed/categories.ts` — or edit live in Admin |
| Delivery zones, pickup locations, tax | Admin → Delivery / Pickup settings (defaults in `src/data/seed/settings.ts`) |
| Announcement bar & promo tiles | Admin → Promotional banners |
| Homepage hero / section copy | Admin → Website content |
| Policies (placeholder copy) | `src/app/(store)/policies/[slug]/page.tsx` |
| Demo accounts | `src/data/seed/people.ts` |

After editing seed files run `npm run demo:reset` (or use the toolbar) so the database re-seeds.

---

## Testing & QA status

- **Unit (Vitest, 51 tests):** pricing visibility and contractor authorisation, sale behaviour, variant adjustments, browser-safe product views (no contractor-price leakage), cart and delivery calculations, tax, square-footage/waste calculator, quote references, stock states, validation, demo card tokenisation, upload rules, seed integrity, admin date handling in the store's time zone.
- **End-to-end (Playwright, 44 tests):** journeys A–G (guest checkout incl. declined card, e-Transfer pickup, free quote with upload + rejected file type, cart-to-quote, registration + dashboard, contractor application → admin approval → contractor pricing, rejected contractor, admin price/stock edit, hidden price, admin quote status → customer view, admin route protection, staff permission enforcement), console-error checks on key routes, filters, empty states, mobile navigation, and horizontal-overflow checks at 375/390/430/768/1024/1280/1440 px. A Stage 1 regression suite (`tests/e2e/regression.spec.ts`) adds a **contractor-price leak matrix** that scans the raw page payload for guests, regular customers, pending and rejected contractors and staff (plus an approved-contractor positive control), product variations, the square-footage calculator, the cart delivery checker, product → quote, upload size/content validation, admin inventory quick-edit, admin order status update, contractor rejection, the demo persona switcher, and overflow checks on account, cart-with-items and admin pages at every width.

## Prototype limitations

- **Reference site not inspected:** the reference URL (`nkflooring.pplx.app`) was blocked by the build environment's network policy and no screenshots were supplied, so the visual design follows the brief and approved colour tokens rather than a direct comparison. A visual pass against the reference is listed in `PRODUCTION_TODO.md`.
- Data is a JSON file (single server instance); not suitable for concurrent production traffic.
- Payments, emails and SMS are simulated; no real charges or messages are sent.
- Product images are generated SVG illustrations; spec sheets are generated placeholder PDFs.
- Password reset, 2-step verification, saved products, invoices, payment history and reorder are shown as "coming soon".
- Uploads are stored on local disk without virus scanning.
- Admin permissions are basic (admin vs staff with section permissions).

See **[PRODUCTION_TODO.md](./PRODUCTION_TODO.md)** for the production checklist.

## Project documents

| Document | For | What it contains |
| --- | --- | --- |
| [HANDOFF.md](./HANDOFF.md) | Developers | How to install, run, test and deploy; env vars; key files; routes; demo accounts, test cards and postal codes; data model; known limitations |
| [PHASE_2_PLAN.md](./PHASE_2_PLAN.md) | Developers | Current architecture, what is production-ready vs demo-only, the recommended Phase 2 order, migration risks |
| [PRODUCTION_TODO.md](./PRODUCTION_TODO.md) | Everyone | Launch checklist. Each item is marked: can do now, needs client info, or needs third-party credentials |
| [CLIENT_INFORMATION_REQUIRED.md](./CLIENT_INFORMATION_REQUIRED.md) | The client | Everything the store owner must supply, split into "required before production" and "optional / later" |
| [SHOPIFY_SETUP.md](./SHOPIFY_SETUP.md) | Developer, Aditya, the client | **Current plan:** step-by-step Shopify setup (Basic, yearly), costs, ownership and collaborator access, plus the ready-made import files and theme add-ons in `shopify/` |
| [HOSTING_AND_COSTS.md](./HOSTING_AND_COSTS.md) (superseded) | The client and developers | Recommended production stack (custom site, annually prepaid server, no monthly platform subscription) with estimated yearly, usage-based and per-transaction costs, **for approval** |
| [NEXT_CLAUDE_PROMPT.md](./NEXT_CLAUDE_PROMPT.md) | Future AI session | Ready-to-paste prompt for starting Phase 2 **after** client approval |
| `docs/Website-Features-Guide.pdf` / `.docx` | The client | Illustrated tour of every feature with links |

---

## Change log

Newest first. Every code change pushed to GitHub gets an entry here.

### 2026-10-20 — Stability fixes found while preparing the Shopify files
- Fixed an occasional glitch where, while a page was still loading, the browser briefly drew the page twice. Occasionally this caused an error when choosing a product size or finish very quickly. The cart now loads in a way that doesn't redraw the whole page, and size/finish buttons were made more robust.
- Fixed date-sensitive automated tests that started failing as real time passed (demo sales "expired"). The tests now use a fixed date.
- Fixed a code-quality warning in the test setup.
- All 51 unit tests and 44 end-to-end tests pass (three full runs in a row).

### 2026-10-20 — Shopify chosen for the live store; setup files prepared
- The client chose **Shopify** (Basic plan, paid yearly, ≈ C$444 a year plus domain and card fees) for the live store. This replaces the self-hosted plan.
- Added **SHOPIFY_SETUP.md**, a step-by-step guide covering who owns the store, collaborator access for the developer and Aditya, payments (including Interac e-Transfer), taxes, products, collections, pickup and delivery zones, contractor pricing with Shopify's free built-in B2B tools, quote and contractor forms, theme colours and fonts, domain and launch checks.
- Added ready-made files in `shopify/`: a **product import file** (59 products, 90 variants), the **contractor price list**, the **delivery zones**, and theme add-ons for the square-footage calculator, "Request a quote" products, the quote form and the contractor application form. These recreate the prototype's key features **without monthly apps**.
- Added `scripts/export-shopify.ts` to regenerate the import files.
- **Nothing has been set up on Shopify yet.** The store must be created in, or transferred to, the business's own Shopify account.
- No changes to the prototype website.

### 2026-10-04 — Final hosting recommendation (for approval)
- Finalised **HOSTING_AND_COSTS.md**. The chosen server is OVHcloud's smallest suitable Canadian plan (VPS-1: 2 cores, 4 GB memory, 40 GB storage), with a check that it is enough for the shop, database, accounts, admin, orders and quotes.
- Costs are split into mandatory yearly, optional, usage-based and per-sale costs. Expected **first-year and yearly renewal cost: about C$100–120 including tax**, plus Stripe fees.
- Stripe fees are corrected to Stripe's official Canadian prices: 2.9% + C$0.30 per card payment, +0.8% for international cards, C$15 per dispute, no monthly fee. Confirmed support for Visa, Mastercard, American Express, Apple Pay and Google Pay. Interac e-Transfer stays a separate manual option.
- Added a full backup plan (database every 6 hours, files nightly, encrypted, kept off-site in another Canadian data centre for 12 months, plus a monthly copy kept by the business), a server security checklist, a **post-launch maintenance responsibility** section, and an account-ownership table (every account in the business's name).
- No website changes. Nothing has been purchased or deployed.

### 2026-10-04 — Hosting and running-cost proposal (for approval)
- Added **HOSTING_AND_COSTS.md**: the recommended way to run the live store with **no monthly platform subscription** (no Shopify-style plan). It covers a custom site on one yearly-paid Canadian server with a free security certificate, the database and files on that server, nightly off-site backups, pay-per-use email and Stripe card payments (fees per sale only).
- Estimated running cost: about **C$75–280 a year** for the domain and server, a few dollars a year for email and backups, plus **2.9% + C$0.30 per card payment**. Every item says whether it is billed yearly, by usage or per transaction, and free services have their limits written down.
- Updated the plan, checklist, client information list, handoff notes and next-session prompt: no monthly subscriptions, and **nothing is bought or set up until the client approves**.
- No website changes. Nothing has been purchased.

### 2026-09-28 — Satoshi typeface and hero fine-tuning
- The whole website (shop, account, checkout, quotes, contractor pages, admin and footer) now uses **Satoshi** for all text and headings, the same typeface as the reference site. It loads from Fontshare, the official free web-font service from its designers; if it can't load, the site falls back to Inter.
- Lighter, more premium weights: regular for body text, medium for the homepage headline and buttons, semi-bold for labels, menus and section headings.
- The homepage banner was rebuilt to the client's target screenshot, measured pixel by pixel at 1600 × 900: 53/47 split, the same heading size and line breaks ("Quality building / supplies. / **Better prices.**"), a two-line description, smaller buttons side by side, the divider with "For homeowners & professionals" and "Canadian projects. Covered." on one line, and the "Explore vinyl flooring" card in the same place. It scales proportionally on other desktop sizes and stacks on tablets and phones.
- The banner description now uses the reference wording: "Flooring, interior doors, tiles and bathroom essentials. Thoughtfully selected for the spaces you live in and the projects you build."
- Colours, pictures, menus and features are unchanged. The banner picture is still our placeholder illustration until the client supplies a real photo.

### 2026-09-28 — Homepage banner size and alignment
- The homepage banner is now much larger and fills most of the first screen on computers: about 750px tall on a laptop (1280px wide), 810px on a 1440px screen, and up to 900px on large screens.
- On computers the banner is split evenly: text on the left half, picture on the right half. Both halves start and end at exactly the same line, so it reads as one block.
- The headline is bigger and reads "Quality building supplies. **Better prices.**" (the last part in yellow). It adjusts smoothly to the screen size.
- The text has more breathing room and is centred vertically. The description fits on about three lines, and the "Shop products" and "Get a free quote" buttons sit side by side.
- Added "For homeowners & professionals — Canadian projects. Covered." with a divider at the bottom of the text panel, as in the reference. The small line beside "Your foundation for a better home" is now yellow.
- The picture fills the whole right half. "A good home starts with a great foundation." sits near its top, and the "Explore vinyl flooring" card sits near its bottom with even margins.
- On tablets and phones the text comes first and the picture follows below, with readable text and full-width buttons on phones. Nothing scrolls sideways.
- Colours, header, menus and features are unchanged.

### 2026-09-28 — Reference dark theme with the approved yellow accent
- The whole storefront (shop, product pages, cart, checkout, quotes, contractor pages and customer account) now uses the reference website's dark olive colours: page #1D211C, cards #262B24, raised panels #32382F, text #F3F1E9, secondary text #B2B7AA, lines #40463C, and pale sage buttons #CDD7BD.
- The only accent colour is the client-approved yellow #F5B82E, replacing the reference's #D6B47D. It is used for highlighted words, active menu items, the contractor-pricing link, sale prices, selected options and main buttons.
- The cart pop-out, the full category menu, the mobile menu and all forms are dark too. Error and stock messages use lighter shades so they are readable.
- The admin area keeps its light layout for easy day-to-day use, with the new dark olive sidebar.
- Layout, text, pictures and features are unchanged.

### 2026-09-28 — Dark header and hero (reference-style theme)
- The top of every page now uses the dark style the client asked for, based on the reference design. It has a dark header with a white logo, a large dark search box, "Get a free quote", account and cart (with a count bubble).
- New navigation row under the header: "Shop all products" (opens the full category menu), the main categories, Deals, and a gold "Contractor pricing" link.
- New homepage banner: a split layout with a large headline on the left ("Quality materials for every project." with **"Better prices."** in gold) and a full-height picture on the right with an "Explore vinyl flooring" card.
- Colours are unchanged: dark #111827, gold #F5B82E, white #FFFFFF, light greys #F3F4F6 and #9CA3AF.
- The homepage headline can still be edited in Admin → Website content. If it has two sentences, the last one is shown in gold.
- All other pages, user journeys, demo accounts and sample data are unchanged. On existing local installs the demo data re-seeds once so the new homepage wording appears.

### 2026-09-28 — Handoff and Phase 2 planning documents
- Added **HANDOFF.md**: everything a developer needs to take over the project (commands, settings, key files, pages, demo logins, test cards, postal codes, data model, known limitations, next step).
- Added **PHASE_2_PLAN.md**: how to turn the prototype into the real store without rebuilding it. Covers what is ready, what is demo-only, the order of work, and the risks.
- Rewrote **PRODUCTION_TODO.md** as a launch checklist grouped by topic. Each item says whether it can be done now, needs information from the client, or needs an outside account (payments, email, hosting).
- Added **CLIENT_INFORMATION_REQUIRED.md**: a list to send to the client of everything we need from them, split into "needed before launch" and "can come later".
- Added **NEXT_CLAUDE_PROMPT.md**: a ready-made starting instruction for the next phase, to be used only after the client approves the prototype.
- No website changes in this update. Phase 2 has **not** been started, pending client approval.

### 2026-09-28 — Stage 1 audit and stabilisation
- Checked every page as a guest, customer, pending, rejected and approved contractor, staff member and administrator, looking for errors and layout problems.
- Fixed: on phones, the customer account pages, the "request a quote for this product" page and the admin media list were wider than the screen and could be dragged sideways. They now fit.
- Fixed: on phones, the admin pricing table stretched the whole page. Tables now scroll inside their own box, as intended.
- Fixed: restock and sale-end dates entered in the admin showed one day early on the website. Dates now show exactly as entered, and a sale runs until the end of the chosen day (Toronto time).
- Fixed: late in the evening, the checkout's "preferred delivery date" could skip tomorrow.
- Fixed: the cart said "1 items". It now says "1 item".
- The browser tab now shows the store's logo instead of the default framework icon.
- Removed an unused pop-up notification component and silenced a framework warning about smooth scrolling.
- Added 18 automated regression tests, including a check that contractor prices never reach guests, regular customers, or pending or rejected contractors. There are now 44 end-to-end tests and 51 unit tests, and all pass.
- No redesign: pages, user journeys, demo accounts and sample data are unchanged.

### 2026-09-28 — Website features guide (PDF)
- Added `docs/Website-Features-Guide.pdf`, a 12-page PDF version of the features guide with clickable links, ready to email or share.

### 2026-09-28 — Website features guide
- Added `docs/Website-Features-Guide.docx`: a Word guide listing every feature with direct links and click-by-click steps to reach it (shopping, checkout, quotes, contractor program, customer account, admin dashboard), plus demo accounts and test card details.

### 2026-09-28 — Brand colour clean-up
- All backgrounds and brand surfaces now use only the five approved colours (#111827, #F5B82E, #FFFFFF, #F3F4F6, #9CA3AF).
- Removed in-between shades: lighter dark `#1F2937` (hero right panel, cards), off-white `#F9FAFB`, pale gold tint.
- Button hovers now fade slightly instead of switching to a different colour.
- Added the Brand colours section, live demo link and this change log to the README.

### 2026-09-27 — Online demo on Render
- Added `render.yaml` so the site can be deployed from GitHub in one step (free plan, demo mode on).
- The site detects its public web address automatically for links, sitemap and secure logins.
- Live at https://northline-prototype.onrender.com.

### 2026-09-23 — Tests, fixes and documentation
- Added 48 unit tests and 26 end-to-end tests covering all seven required user journeys.
- Fixed: mobile header was wider than the screen, admin dashboard overflowed on phones, filter checkboxes lagged after clicking.
- Card name at checkout now defaults to the customer's name.
- Added README, PRODUCTION_TODO.md and .env.example.

### 2026-09-23 — First prototype
- Storefront: homepage, 11 categories, search, filters, product pages, square-footage calculator, stock labels.
- Cart, checkout (pickup/delivery, demo payments), free quote form with uploads, cart-to-quote.
- Contractor application and approval with server-side contractor pricing.
- Customer dashboard and full admin dashboard.
