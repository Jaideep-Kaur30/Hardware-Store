# Hosting, infrastructure and running costs: final recommendation (for approval)

> **SUPERSEDED (2026-10-20):** the client chose **Shopify (Basic, billed yearly)** for the live store. See [SHOPIFY_SETUP.md](./SHOPIFY_SETUP.md). This document is kept for reference only.

**Status:** FINAL RECOMMENDATION. Awaiting approval. **Nothing has been purchased, subscribed to, deployed or migrated.** No server work starts until this document is approved in writing.
**Revised:** 2026-10-04. Prices are from public price lists on that date and **exclude tax** (Canadian providers add GST/HST; 13% in Ontario). Check each price at checkout.
**Approved direction (tentative):** the existing custom website · a Canadian OVHcloud VPS · PostgreSQL on the VPS · Stripe · Amazon SES or the client's existing business email · Cloudflare for DNS and security · Let's Encrypt SSL · annual domain renewal · no Shopify, Wix or Squarespace · no mandatory monthly SaaS platform.

---

## 1. Client requirements

1. Keep the custom website. Do not migrate to a website builder or hosted e-commerce platform.
2. No mandatory monthly platform or SaaS subscription. Use annual billing or a 12-month commitment where the provider offers it.
3. Keep recurring third-party dependencies to a minimum.
4. Use free tiers only where they are fit for production, with their limits documented.
5. For every paid item, state whether it is billed **annually, by usage or per transaction**.
6. Payment-processing fees are acceptable and are listed separately from hosting.
7. **Every production account belongs to the client's business** (section 9).

---

## 2. Final configuration

| Layer | Final choice | Account owner |
| --- | --- | --- |
| Server | **OVHcloud VPS-1**, Canadian data centre (Beauharnois, QC), Ubuntu 24.04 LTS, **12-month commitment** | Client's business |
| Web server / SSL | Caddy reverse proxy with automatic **Let's Encrypt** certificates (free, auto-renewing) | Runs on the server; no account |
| Application | The existing Next.js app, run as a systemd service under Node.js LTS, built on the server | Code repository transferred to or shared with the business (section 9) |
| Database | **PostgreSQL 16** on the same VPS, listening on localhost only | Runs on the server |
| Uploaded files | Private directory on the VPS disk, served only to the file's owner or authorised staff (already built) | Runs on the server |
| Off-site backups | Encrypted backups ( **restic** ) to **OVHcloud Object Storage in a different Canadian region (Toronto)**, plus a monthly copy held by the business (section 5) | Client's business |
| Transactional email | **Amazon SES, pay-as-you-go "à la carte"** (no monthly fee). *Alternative:* SMTP through the client's existing business email (Google Workspace or Microsoft 365) | Client's business |
| Payments | **Stripe** (Payment Element and Express Checkout) for cards and wallets. **Interac e-Transfer** stays a separate manual option (section 4) | Client's business |
| DNS / security | **Cloudflare Free**: DNS, proxy with basic DDoS and web-application-firewall protection, **Turnstile** bot protection on forms | Client's business |
| Domain | .ca (or .com) at a CIRA-certified registrar, **annual renewal**, auto-renew on | Client's business |
| Uptime monitoring | A free external uptime monitor whose terms allow commercial use (confirm at sign-up), plus a "backup ran" check-in alert | Client's business |
| Analytics | Google Analytics 4 (free), loaded only after cookie consent | Client's business |
| Font | Satoshi, **self-hosted** on the server (no third-party font request) | Licence: ITF Free Font License (confirm the text before launch) |

---

## 3. Server size: is 2 vCPU / 4 GB RAM / 40 GB storage enough?

**Yes.** OVHcloud **VPS-1** (2 vCores, 4 GB RAM, 40 GB NVMe SSD, unlimited traffic, 500 Mbps, daily backup of the previous 24 hours included) is the **minimum appropriate** size and is enough for initial production. A smaller plan (1 vCPU / 2 GB) would not be: PostgreSQL plus building the Next.js app would leave no headroom.

**Memory budget (4 GB):**

| Component | Typical use |
| --- | --- |
| Ubuntu and system services | ≈ 0.4 GB |
| Caddy | < 0.1 GB |
| Next.js app (website, accounts, admin, orders, quotes) | ≈ 0.3–0.5 GB |
| PostgreSQL (tuned: `shared_buffers` 512 MB) | ≈ 0.6–1.0 GB |
| Nightly backup job (restic, short spikes) | ≈ 0.2 GB |
| Optional upload virus scanner (ClamAV daemon) | ≈ 1.0–1.3 GB |
| **Peak with every optional item** | **≈ 3.0–3.5 GB**, plus a 2 GB swap file for app builds |

**Disk budget (40 GB), first year:**

| Item | Estimate |
| --- | --- |
| Operating system and packages | ≈ 5 GB |
| App, dependencies and the last two releases (for rollback) | ≈ 3 GB |
| PostgreSQL (60–200 products, customers, orders, quotes) | < 1 GB |
| Real product photos and resized versions | ≈ 1–3 GB |
| Customer quote uploads (up to 8 files × 10 MB each) | ≈ 2–5 GB a year |
| Logs, swap, backup cache | ≈ 4 GB |
| **Total** | **≈ 16–21 GB**: comfortable for 2–3 years. An alert fires at 75% full |

**CPU:** 2 vCores handle a local store's traffic easily. The heavy moments are app builds during deployment (a couple of minutes) and image resizing, both brief.

**Upgrade path:** if traffic, catalogue size or uploads grow, OVHcloud lets you move to a larger plan (VPS-2: 4 vCores / 8 GB) without rebuilding. That is a change of plan, not a new platform.

---

## 4. Payments with Stripe (official Canadian pricing)

Figures are from Stripe's official Canadian pricing and support pages (stripe.com/en-ca/pricing, support.stripe.com). stripe.com could not be opened directly from our build environment, so the figures were read from Stripe's own pages via search. **Re-check them on stripe.com/en-ca/pricing when the account is opened.**

| Item | Stripe Canada (standard pricing) |
| --- | --- |
| Domestic cards online: **Visa, Mastercard, American Express** | **2.9% + C$0.30** per successful payment |
| **Apple Pay, Google Pay** | **Same as cards (2.9% + C$0.30)**; no extra wallet fee |
| International cards (issued outside Canada) | **+0.8%** |
| Currency conversion (only if charging in a non-CAD currency) | **+2%**. The store charges in CAD, so this normally won't apply |
| Monthly fee / setup fee | **None** |
| Refunds | Stripe does not return the original processing fee |
| Disputes (chargebacks) | **C$15** fee per dispute received; **C$15** more if contested (that part is returned if the dispute is won) |

**Examples (domestic card):** C$100 order → C$3.20 fee · C$500 → C$14.80 · C$2,000 → C$58.30.

**Payment methods the integration will support:**

| Method | Supported? | Notes |
| --- | --- | --- |
| Visa | Yes | |
| Mastercard | Yes | |
| American Express | Yes | Enabled by default in Stripe Canada; same rate as Visa and Mastercard |
| Apple Pay | Yes | Shown only on Apple devices in Safari. Needs one-time **domain verification** in Stripe, done during setup |
| Google Pay | Yes | Shown in supported browsers and on Android; no extra setup fee |
| **Interac e-Transfer** | **Kept separate from Stripe** | Already built: the order is created as "awaiting payment", the customer sends an e-Transfer to the business's bank email, and staff mark it paid in the admin. Fees depend on the business's own bank plan. No Stripe involvement. |

*(Stripe Canada also lists online Interac Debit at 2.9% + C$0.30. It is not needed at launch and can be considered later.)*

---

## 5. Backup strategy

**Rule:** the database and uploaded files must **never** exist only on the VPS.

| Layer | What | How often | Where | Kept for |
| --- | --- | --- | --- | --- |
| 1. Database (primary) | `pg_dump` in compressed custom format, then restic | **Every 6 hours** (00:00, 06:00, 12:00, 18:00) | **OVHcloud Object Storage, Toronto region** (a different data centre from the Beauharnois VPS) | All 6-hourly copies for 2 days, daily for 30 days, weekly for 12 weeks, monthly for 12 months |
| 2. Uploaded files and site config | restic of the uploads folder, `.env` (secrets) and Caddy/systemd config | **Nightly** (02:30) | Same off-site storage | Daily for 30 days, weekly for 12 weeks, monthly for 12 months |
| 3. Whole-server snapshot | OVHcloud's included daily backup of the VPS | Daily (provider) | OVHcloud (same provider) | The previous 24 hours (included); longer retention is an optional paid add-on |
| 4. Provider-independent copy | Download of the latest encrypted backup | **Monthly** | Business-controlled storage (e.g. the owner's cloud drive or an external drive) | 12 months |

- **Encryption:** restic encrypts everything (AES-256) **before** it leaves the server. The storage provider cannot read the backups. The restic password lives in the **business's password manager** with a sealed offline copy. Losing it makes the backups unreadable, so the business must keep it safe.
- **Backup credentials:** an Object Storage user with access to the backup bucket only. Versioning or object lock is turned on (if offered) so a compromised server can't delete old backups.
- **Monitoring:** each successful run sends a check-in; a missed check-in emails the business and the maintainer.
- **Recovery targets:** at most **6 hours** of database changes and **24 hours** of new uploads could be lost (recovery point). The site can be back online in about **1–2 hours** (recovery time).

**Restore procedure** (written as a step-by-step runbook during setup):
1. Create a new VPS (or reinstall the existing one) and run the setup script: Ubuntu, Caddy, Node.js, PostgreSQL, firewall.
2. Install restic, enter the repository details and restic password from the password manager, and list the snapshots.
3. Restore the latest config and `.env`, then the uploads folder.
4. Restore the database: `pg_restore` the chosen dump into a fresh database.
5. Deploy the app from the repository at the recorded release, then start the services.
6. If the server's IP changed, update the DNS record in Cloudflare.
7. Smoke-test: home, product, cart, a test checkout in Stripe **test mode**, admin login, and opening an uploaded file.
8. **Restore drill every 3 months** onto a temporary server, then delete that server (cost: cents of usage).

---

## 6. Security: what must be maintained on the VPS

| Area | What we set up | Ongoing maintenance |
| --- | --- | --- |
| OS and security updates | Ubuntu 24.04 LTS (standard support to 2029); `unattended-upgrades` installs security patches automatically every day | Monthly: check for pending updates and reboot if the kernel was updated. Before 2029: plan an upgrade to the next LTS release |
| Firewall | `ufw` blocks all incoming traffic except SSH, 80 and 443. Optionally 80/443 accept only Cloudflare's IP ranges | Review when services change |
| SSH | Key-only login, no root login, no passwords; a named admin user with sudo; **fail2ban** bans repeated failures | Remove keys when someone leaves; review keys every 3 months |
| Database access | PostgreSQL listens on **localhost only** (no public port); the app uses a dedicated least-privilege user with a strong password; separate backup role | Rotate passwords if staff or contractors change |
| SSL | Caddy renews Let's Encrypt certificates automatically, about 30 days before expiry | The external monitor alerts if a certificate is close to expiry |
| Application | Pinned dependencies; scripted deploy that keeps the previous release for instant rollback | Monthly: `npm audit` and apply Next.js / Node.js security releases (urgent ones within days). **Node.js 22 reaches end of life in April 2027**, so move to the next LTS before then |
| Secrets | `.env` readable only by the app user: session secret, Stripe keys, SES credentials | Rotate when someone leaves or after any suspected leak |
| Backups | Section 5 | Check alerts; restore drill every 3 months |
| Monitoring | External uptime and SSL checks; disk-usage alert at 75%; backup check-in; log rotation | Respond to alerts |
| Brute-force / abuse | fail2ban (SSH); Cloudflare proxy and free managed firewall rules; Turnstile on public forms; app-side rate limiting on login, register, quote and upload (planned in Phase 2) | Review fail2ban and Cloudflare events monthly |
| Account security | **Two-factor authentication** on every business account: registrar, OVHcloud, Cloudflare, Stripe, AWS, Google | Check access lists every 3 months |

---

## 7. POST-LAUNCH MAINTENANCE RESPONSIBILITY

A self-hosted server has **no subscription, but it is not maintenance-free.** The business must decide, **before launch, in writing**, who is responsible. The developer is **not** providing indefinite free server administration. Any ongoing developer support must be covered by a separate, paid maintenance agreement or quoted per task.

### Routine maintenance

| Task | How often | Typical time | Automated? |
| --- | --- | --- | --- |
| Security patches | Daily | — | **Automatic** |
| SSL certificate renewal | About every 60 days | — | **Automatic** |
| Backups | Every 6 hours / nightly | — | **Automatic** (alerts on failure) |
| Read alerts (uptime, backup, disk) and act on them | When they arrive | Minutes | Alerts are automatic; the response is a person |
| Check updates, reboot if needed, check disk and logs | Monthly | 15–30 min | Partly |
| App dependency and security updates, then redeploy and test | Monthly (urgent ones within days) | 30–60 min | No; needs developer skills |
| Download the off-site backup copy | Monthly | 10 min | No |
| Restore drill | Every 3 months | 1–2 h | No; needs developer skills |
| Review user accounts, SSH keys and passwords | Every 3 months | 15 min | No |
| Renew domain and server; keep payment cards current | Yearly (auto-renew) | Minutes | Auto-renew, if the card is valid |
| Node.js / Ubuntu major upgrades | Every 1–2 years | Half a day | No; needs developer skills |

### Business responsibilities (no technical skills needed)

- Own and pay for every account (section 9) and **keep billing cards up to date**. An expired card is the most common way sites go offline.
- Keep two-factor authentication on and recovery codes stored safely.
- Keep the **restic backup password** and the monthly backup copy safe.
- Read alert emails and pass them on to the maintainer.
- Day-to-day store work in the admin: products, prices, stock, orders, quotes and contractor approvals.
- Manage Stripe: payouts, refunds and disputes.
- Remove access for staff or contractors who leave.

### Needs a developer (paid agreement or per task)

- App, Node.js, Next.js and dependency updates, and fixing anything they break.
- Responding to security advisories and incidents.
- Restore drills and real restores.
- OS major-version upgrades and server resizing.
- Code changes, new features, integrations, bug fixes.
- Investigating outages, errors and email-delivery problems.

### If nobody maintains the server

- It keeps working for a while: security patches and SSL renewals are automatic.
- Over months, **unpatched app dependencies and end-of-life software** (e.g. Node.js 22 after April 2027) become exploitable. A compromise could expose customer data, which creates **breach-reporting obligations under PIPEDA**, and could get the Stripe account restricted.
- Failing backups or a full disk go unnoticed until data is lost.
- An expired card or a missed renewal takes the **domain or server offline**. A lapsed domain can be taken by someone else.
- **Recommendation:** agree an annual maintenance arrangement (developer or another provider) **before launch**, or formally accept the risk in writing.

---

## 8. Costs

All amounts exclude tax unless noted. "Annual" means one yearly payment or a 12-month commitment. **None of these is a mandatory monthly subscription.**

### 8a. MANDATORY FIXED COSTS (annual)

| Item | Provider | Billing | Estimate |
| --- | --- | --- | --- |
| Domain (.ca) | CIRA-certified registrar (e.g. Cloudflare Registrar, if it handles .ca, or CanSpace / Porkbun) | **Annual renewal** | **≈ C$13–20 / year** (list renewal ≈ US$9–15) |
| VPS-1 server (2 vCores, 4 GB, 40 GB NVMe, Canada, daily backup included) | OVHcloud | **12-month commitment** (OVHcloud offers lower rates for 6- or 12-month terms paid upfront) | **≤ C$75 / year** (list price from about C$6.20 per month on the no-commitment rate, so the 12-month term should cost the same or less. Confirm at checkout) |
| **Mandatory fixed total** | | | **≈ C$88–95 / year before tax** → **≈ C$100–110 with 13% HST** |

### 8b. USAGE-BASED COSTS (no monthly fee; pay only for use)

| Item | Provider | Rate | Expected |
| --- | --- | --- | --- |
| Off-site backup storage | OVHcloud Object Storage (Toronto) | ≈ C$0.0096 per GiB a month (one-zone) to ≈ C$0.021 (multi-zone); no data-transfer fees | 5–15 GB stored → **≈ C$1–4 / year** |
| Transactional email | Amazon SES **"à la carte"** (do not choose the newer monthly plans or a dedicated IP) | US$0.10 per 1,000 emails | ≈ 1,500 emails a month → **≈ US$2 / year**. **US$0** if using the client's existing business email instead |
| Cloudflare DNS, proxy, Turnstile | Cloudflare Free | Free | **C$0** |
| **Usage total** | | | **≈ C$3–7 / year** |

### 8c. PAYMENT TRANSACTION COSTS (separate from hosting)

| Item | Rate |
| --- | --- |
| Stripe: Visa, Mastercard, Amex, Apple Pay, Google Pay (domestic) | **2.9% + C$0.30** per successful payment |
| Stripe: international cards | +0.8% |
| Stripe: disputes | C$15 per dispute (+C$15 if contested; returned if won) |
| Stripe: monthly fee | **None** |
| Interac e-Transfer (manual) | Per the business's bank plan; often included |

*Illustration only (not a forecast):* C$5,000 of domestic card sales from 40 orders a month costs about **C$157 a month in Stripe fees** (5,000 × 2.9% + 40 × C$0.30). That is a cost of selling, not of hosting.

### 8d. OPTIONAL COSTS

| Item | Billing | Estimate | When it's worth it |
| --- | --- | --- | --- |
| Longer OVHcloud VPS backup retention | Add-on billed with the server | Confirm on OVHcloud's price list | Extra safety; not required because of section 5 |
| Upgrade to VPS-2 (4 vCores / 8 GB) | 12-month commitment | Roughly double VPS-1 (confirm at checkout) | Only if monitoring shows the server is under strain |
| Staff mailboxes (orders@, sales@) | Annual billing where offered | Depends on provider | Only if the business doesn't already have business email |
| Error tracking (e.g. Sentry free tier) | Free tier | C$0 | Optional; logs and uptime alerts are enough at launch |
| **Post-launch maintenance agreement** | To be agreed between the business and the maintainer | To be quoted | **Strongly recommended** (section 7) |

### 8e. Totals

| | Estimate |
| --- | --- |
| **First-year cost** (mandatory + usage) | **≈ C$90–105 before tax** / **≈ C$100–120 with HST**. Some registrars discount the first year of a domain |
| **Expected annual renewal** | **≈ C$90–105 before tax** / **≈ C$100–120 with HST**, if the plan isn't changed |
| Plus | Optional items you choose, and Stripe's per-transaction fees |
| One-time setup | Developer labour as agreed in the project; no mandatory third-party setup fees |

---

## 9. Account ownership

**Every production account is opened in the business's name, with business email and billing.** The developer gets **collaborator or admin access** during development and setup, and that access can be removed later. Nothing in production depends on an account personally owned by the developer.

| Account | Owner | Developer access | Notes |
| --- | --- | --- | --- |
| Domain registrar | Business | Delegated or DNS-only access, if needed | Auto-renew on; business payment card |
| Cloudflare | Business | Member (Administrator) | Holds DNS, proxy and Turnstile keys |
| OVHcloud (VPS and Object Storage) | Business | Delegated access / sub-user | 12-month commitment billed to the business |
| Server SSH | Business admin user | Developer's own SSH key, removable | No shared passwords |
| Stripe | Business (completes Stripe's identity and bank verification) | Team member (Developer role) | Payouts go to the business's bank account |
| AWS (SES) or business email | Business | IAM user limited to SES sending | Root account protected by 2FA; SES moved out of sandbox mode at launch |
| Google Analytics / Search Console | Business | Editor / user | |
| Backup password (restic) | Business password manager | Shared during setup only | Rotate after handover if the business wants |
| **Code repository** | **Transfer to, or a full copy held by, the business at launch** | Collaborator | Today's repository is under the developer's GitHub account. Transfer or share it at handover |
| Render (current demo) | Developer (demo only) | — | **Not used in production.** Shut down after launch |

---

## 10. Options considered and rejected

| Option | Reason |
| --- | --- |
| Shopify, Wix, Squarespace, BigCommerce | Mandatory monthly subscriptions; would require a rebuild and lock the business into the platform |
| Render paid, Vercel, Fly, Netlify | Billed monthly. Vercel Hobby is for non-commercial use only |
| Render free (today's demo) | Demo only: it sleeps when idle, files are temporary, and the free database is deleted after 30 days |
| Managed Postgres (Neon, Supabase, RDS) | Monthly billing; free tiers pause or cap storage |
| Auth SaaS (Clerk, Auth0) | Monthly plans; login is already built in |
| Postmark, Resend, SendGrid; SES monthly plans | Monthly plans; SES "à la carte" has no monthly fee |
| Backups on the same VPS only | Breaks the backup rule: one server failure would lose everything |

---

## 11. Next steps (only after approval)

1. The client approves this document, the yearly budget and the maintenance arrangement (section 7) in writing.
2. The business opens the accounts in its own name (section 9) and invites the developer.
3. Only then does Phase 2 production work start, as set out in PHASE_2_PLAN.md: database layer, backups, deployment scripts, SES and Stripe adapters, self-hosted font, staging, then launch.

**Sources (checked 2026-10-04):** Stripe official pages via search: [Pricing & fees (Canada)](https://stripe.com/en-ca/pricing), [Local payment methods pricing](https://stripe.com/en-ca/pricing/local-payment-methods), [Fees for refunded payments](https://support.stripe.com/questions/understanding-fees-for-refunded-payments), [How disputes work](https://docs.stripe.com/disputes/how-disputes-work), [Apple Pay](https://docs.stripe.com/apple-pay), [Google Pay pricing](https://support.stripe.com/questions/pricing-for-google-pay-with-stripe), [Cards](https://docs.stripe.com/payments/cards). OVHcloud: [VPS Canada](https://www.ovhcloud.com/en-ca/vps/vps-canada/), [Public Cloud price list (Object Storage)](https://www.ovhcloud.com/en-ca/public-cloud/prices/), [OVHcloud VPS billing terms summary](https://getdeploying.com/ovh). Amazon SES: [pricing summary](https://www.mailblast.io/blog/ses/amazon-ses-pricing). Domains: [.ca registrar prices](https://cybernews.com/best-domain-registrars/best-canadian-domain-registrars/), [CIRA](https://www.cira.ca/en/resources/documents/domains/registrar-fees-list/). Cloudflare: [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/). Render: [free-tier limits](https://justinmckelvey.com/blog/is-render-free). Some official pages were blocked from our build environment and were read through search results. **Re-check every price on the provider's own site at purchase.**
