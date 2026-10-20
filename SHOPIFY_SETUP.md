# Shopify setup guide — Northline Building Supply

**Decision (2026-10-20):** the client has accepted **Shopify** for the live store, paid **yearly**. This replaces the self-hosted plan in [HOSTING_AND_COSTS.md](./HOSTING_AND_COSTS.md), which is kept for reference only.
**Status:** files prepared, **no Shopify account created and nothing purchased**. The store must be created in, or transferred to, the **business's own Shopify account**. Claude cannot sign up, pay or log in on anyone's behalf.

What is ready in this repository:

| File | What it is |
| --- | --- |
| `shopify/products.csv` | Shopify product import: 59 products / 90 variants with prices, sale (compare-at) prices, stock, tags, SEO text and metafields (coverage, minimum order) |
| `shopify/contractor-prices.csv` | Contractor fixed prices by SKU for the B2B "Contractors" catalog (lower of contractor price and active sale price, matching the prototype's rule) |
| `shopify/delivery-zones.csv` | Local delivery zones (postal-code prefixes, fees, free-over amounts, lead times) |
| `shopify/theme/snippets/nl-coverage-calculator.liquid` | The square-footage calculator ("How much do I need?") |
| `shopify/theme/snippets/nl-product-actions.liquid` | "Request a quote" instead of buying, for quote-only and contractors-only products |
| `shopify/theme/sections/nl-quote-request.liquid` | Quote request form (general, from a product, or from the cart) |
| `shopify/theme/sections/nl-contractor-application.liquid` | Contractor (trade) account application form |
| `shopify/theme/snippets/nl-brand-styles.liquid` | Satoshi typography |
| `scripts/export-shopify.ts` | Regenerates the three CSVs from the catalogue: `npx tsx scripts/export-shopify.ts` |

> The catalogue is the prototype's **placeholder** data. When the client sends the real product list, put it into the same CSV columns, or update the seed data and re-run the script. Product **images are not included**: the prototype's illustrations are SVG placeholders. Upload the client's real photos per product.

---

## 1. Costs (confirm on [shopify.com/ca/pricing](https://www.shopify.com/ca/pricing) at signup; prices exclude tax)

| Category | Item | Billing | Estimate |
| --- | --- | --- | --- |
| **Mandatory fixed** | Shopify **Basic** plan | **Yearly** (about 25% less than monthly billing) | **≈ C$37/month billed yearly → ≈ C$444/year** |
| **Mandatory fixed** | Domain (.ca) | Yearly renewal | ≈ C$13–20/year (or buy it through Shopify) |
| **Transaction** | Shopify Payments: online Visa / Mastercard (Basic) | Per transaction, no monthly fee | **2.8% + 30¢** |
| **Transaction** | Shopify Payments: Amex and international cards | Per transaction | **3.5% + 30¢** (per the Canadian pricing page; verify) |
| **Transaction** | Interac e-Transfer (manual payment method) | Your bank's plan | No Shopify fee |
| Optional | Upgrade to **Grow** (only if you need separate *staff* logins) | Yearly | ≈ C$99/month billed yearly → ≈ C$1,188/year |
| Optional | Apps (file uploads on forms, advanced B2B, etc.) | **Usually monthly** | Avoided by this setup; add only if the client approves |

**Expected first-year cost:** ≈ **C$460 + tax** (Basic yearly + domain), plus payment fees. **Renewal:** about the same each year.
Do **not** use a third-party payment gateway (e.g. Stripe directly): Shopify charges an extra transaction fee on top when Shopify Payments isn't used.

---

## 2. Who owns what

- The **store owner account is the business (client)**, not the developer and not Aditya.
- **You (developer) and Aditya** get **collaborator access**: free and unlimited on every plan. On **Basic**, *staff* accounts aren't included, but collaborators are.
  - Each of you creates a free **Shopify Partner** account (partners.shopify.com).
  - The owner shares the **collaborator request code** (Settings → Users → Security), or you request access from the Partner Dashboard. The owner approves and picks permissions.
  - **Aditya (marketing):** Products, Collections, Inventory, Online Store (themes, pages, navigation, blog), Marketing, Discounts. **Not** Orders, Payments, Settings or Customers, unless the client wants him to have them.
  - **Developer:** Online Store (themes), Products, Settings as needed. Remove or reduce after handover.
- **Recommended build route:** from your Partner Dashboard, create a **client transfer store**. It is free while you build it. Import and configure everything, then **transfer ownership** to the business owner, who chooses **Basic, billed yearly**, when billing starts. *Check this option in the Partner Dashboard; Shopify changes partner store types from time to time.* Otherwise the owner creates the store and invites you as a collaborator.
- The domain, Google Analytics and any Google or Meta accounts also belong to the business.

---

## 3. Setup steps

### 3.1 Store basics
1. **Settings → Store details:** legal business name, address, phone, sender email (e.g. orders@domain). Store currency **CAD**.
2. **Settings → Plan:** Basic, **yearly billing** (at transfer or when the trial ends).
3. **Settings → Taxes and duties → Canada:** enter the HST registration number and collect sales tax (13% HST in Ontario; Shopify works out other provinces).
4. **Settings → Policies:** refund, privacy, terms and shipping. Start from Shopify's templates or our placeholder copy, and have the client approve the final wording.
5. **Settings → Markets:** Canada as the primary market (the new Markets experience is required for B2B on Basic).

### 3.2 Payments
1. **Settings → Payments → Shopify Payments:** activate with the business's bank details and identity. This enables **Visa, Mastercard, American Express, Apple Pay, Google Pay** and Shop Pay.
2. **Manual payment method → Create custom payment method:** "**Interac e-Transfer**", with the instruction "Send the order total to <bank email> with your order number in the message. We'll process your order once payment arrives." Staff mark the order *Paid* when it arrives.
3. Test with Shopify's test mode before launch.

### 3.3 Products
1. **Settings → Custom data → Products → Add definition** (do this *before* importing):
   - `custom.coverage_sqft`: **Decimal**, "Coverage per unit (sq ft)"
   - `custom.coverage_unit`: **Single line text**, "Coverage unit"
   - `custom.min_order_qty`: **Integer**, "Minimum order quantity"
2. **Products → Import → `shopify/products.csv`**. If Shopify rejects the three metafield columns, delete those columns and set the values afterwards with the bulk editor.
3. Upload real photos to each product.
4. **Tags created by the import:** category, subcategory, brand, `on-sale`, `quote-only`, `contractors-only`, `special-order`, `oversized`, `best-seller`/`new`/…
   - **Quote-only** products are imported at price 0 with stock 0 and "deny", so they **cannot be bought**.
   - **Special-order** products allow ordering when out of stock ("continue").
5. **Sale end dates:** Shopify has no built-in scheduled end for compare-at prices. Remove the compare-at price when a sale ends (or use the bulk editor).

### 3.4 Collections and menu
1. **Products → Collections → Create (automated):** one per category with the condition *Product type equals* (Vinyl Flooring, Stairs, Doors, Locks & Door Hardware, Shower Bases, Shower Doors, Shower Accessories, Toilet Seats, Vanities, Plumbing, WPC Wall Panels).
2. Subcategory collections: *Product tag equals* the subcategory name (e.g. "Rigid Core SPC").
3. **Deals** collection: *Product tag equals* `on-sale`.
4. **Online Store → Navigation → Main menu:** Vinyl Flooring, Doors & Locks, Stairs, Bathroom, Plumbing, WPC Wall Panels, Deals, and "Contractor pricing" → `/pages/contractors`.

### 3.5 Delivery and pickup
1. **Settings → Shipping and delivery → Local pickup:** enable for the store location. Add pickup instructions and "Usually ready in 2 business hours" (placeholder; the client confirms).
2. **Local delivery:** one zone per row of `shopify/delivery-zones.csv`.
   - Enter each postal prefix followed by `*` (e.g. `L4*`).
   - Set the delivery price, and add a free-delivery condition over the "free over" amount if your Shopify version offers conditional pricing. If it doesn't, describe free delivery in the zone's delivery information.
3. **Oversized orders ("fee to be confirmed")** aren't automated in Shopify. Note in the delivery information that large orders are confirmed by staff, or use **Draft orders** (below) for those customers.

### 3.6 Contractor pricing (B2B; free on Basic)
1. **Settings → Customer accounts:** use the **new customer accounts** (required for B2B).
2. **Markets → Add market → B2B market** "Contractors" (Canada).
3. **Catalogs → Create catalog** "Contractor prices" for the Contractors market.
   - Leave the percentage adjustment at 0. **Export** the catalog CSV, copy each SKU's **Contractor fixed price** from `shopify/contractor-prices.csv` into the *Fixed price* column, then **import** it back.
   - Basic allows up to 3 catalogs. Catalogs go to B2B markets, not to individual companies (that needs Plus).
4. **Approving a contractor:**
   - The application arrives by email from the contractor form (3.7).
   - Staff go to **Customers → Companies → Add company**, add the applicant as a contact, and attach the company to the Contractors market. Shopify emails them an invite.
   - Once signed in, they see contractor prices. Everyone else sees retail. **Contractor prices never appear for guests, regular customers or unapproved applicants**, because Shopify only applies the catalog to B2B companies.
5. **Contractors-only products** (tag `contractors-only`) show "Request a quote" to everyone except signed-in contractors (snippet 3.8).

### 3.7 Quote requests and contractor applications (free; no app)
1. **Online Store → Themes → Edit code → Sections → Add a new section:** create `nl-quote-request` and `nl-contractor-application` and paste in the files from `shopify/theme/sections/`.
2. **Customize theme → Pages → Create template** "quote" (add the *Quote request form* section) and "contractors" (add the *Contractor application* section).
3. **Online Store → Pages:** create **Quote** (handle `quote`) and **Contractors** (handle `contractors`) using those templates.
4. **Request quote for cart:** add a button on the cart page (theme editor → Cart → Custom Liquid):
   ```liquid
   <a class="button button--secondary" href="/pages/quote?from=cart">Request a quote for this cart</a>
   ```
5. Submissions arrive by email to the store's sender address.
   - To send a priced quote, create a **Draft order** (Orders → Drafts) for the customer and **Send invoice**. They pay online from the link. This is built in on every plan.
   - **File uploads:** Shopify forms can't take attachments, so the form asks customers to email photos and plans. An upload-capable form app is optional, and usually billed monthly.

### 3.8 Theme
1. Start from a free Shopify theme (**Horizon** or **Dawn**).
2. **Theme settings → Colors:** create schemes with the approved palette.
   - Background `#1D211C`, surfaces `#262B24` / `#32382F`, text `#F3F1E9`, secondary text `#B2B7AA`, borders `#40463C`.
   - Primary button and accent **`#F5B82E`** with dark text `#1D211C`; secondary button `#CDD7BD` with text `#20291C`.
3. **Typography:** follow `shopify/theme/snippets/nl-brand-styles.liquid` (upload Satoshi, then render the snippet in `layout/theme.liquid`).
4. **Header:** logo; search; "Get a free quote" link to `/pages/quote`; account; cart. Announcement bar: pickup and delivery message.
5. **Homepage hero:** an *Image with text* / *Hero* section with the image on the right and a 50/50 split.
   - Eyebrow: "YOUR FOUNDATION FOR A BETTER HOME".
   - Heading: "Quality building supplies. Better prices." (style "Better prices." gold with the theme's accent or a span in a Custom Liquid block).
   - Buttons: "Shop products" → `/collections/all`, "Get a free quote" → `/pages/quote`.
   - The live prototype is the visual reference.
6. **Product template:** add two **Custom Liquid** blocks, then save the snippet files from `shopify/theme/snippets/` under *Snippets*:
   - above Buy buttons: `{% render 'nl-product-actions', product: product %}`
   - below Buy buttons: `{% render 'nl-coverage-calculator', product: product %}`
7. **Quote-only prices on product cards:** in the theme's card price file (Dawn: `snippets/price.liquid`; Horizon: the price block), wrap the price output in
   ```liquid
   {% unless product.tags contains 'quote-only' %} … existing price markup … {% endunless %}
   ```
   so "$0.00" never shows. **Check this in the chosen theme before launch.**
8. **Inventory display:** turn on the product page's *Inventory status* (low-stock threshold) in the theme editor.

### 3.9 Domain, analytics, launch
1. **Domain:** connect the business's domain (Settings → Domains → Connect existing). If DNS is on Cloudflare, add Shopify's A and CNAME records as **DNS only** (grey cloud).
2. **Analytics:** install Google's free **Google & YouTube** app and connect the business's GA4 property. The cookie banner is under Settings → Customer privacy.
3. **Launch checklist:**
   - test card order (test mode), e-Transfer order, local delivery and pickup;
   - contractor approval → contractor sees catalog prices;
   - guest and regular customer see retail only;
   - quote form, cart quote, contractor form;
   - mobile check;
   - remove the store password (Online Store → Preferences).

---

## 4. Prototype features on Shopify

| Prototype feature | On Shopify | Cost |
| --- | --- | --- |
| Catalogue, categories, search, filters, variations, sale prices | Built in (collections, tags, filters via the free **Search & Discovery** app) | Free |
| Stock levels, low-stock, special order | Built in (inventory, "continue selling when out of stock") | Free |
| Square-footage calculator | `nl-coverage-calculator` snippet + metafields | Free |
| Cart, guest checkout, Apple Pay / Google Pay / cards | Built in (Shopify Payments) | Transaction fees |
| Interac e-Transfer | Manual payment method | Free |
| Pickup and postal-code delivery zones | Built in (Local pickup / Local delivery) | Free |
| Oversized "delivery fee to be confirmed" | Manual (delivery note or Draft order) | Free |
| Contractor pricing, approved contractors only | Built-in B2B (market + fixed-price catalog) | Free on Basic |
| Contractor application, pending / approve / reject | Contact-form application + manual company creation | Free |
| Quote requests (general / product / cart) | `nl-quote-request` section + Draft order invoices | Free |
| File uploads with quotes | Email photos; optional app | Free / app optional |
| Quote reference numbers and customer quote history | Draft order numbers; customers see paid orders in their account | Free (simpler than the prototype) |
| Customer accounts, order history | Built in (new customer accounts) | Free |
| Admin: products, prices, inventory, orders | Shopify admin | Included |
| Staff permissions (Aditya etc.) | Collaborator accounts (staff accounts need Grow) | Free |
| Email notifications | Built in (Settings → Notifications) | Free |
| Demo persona switcher, demo data reset | Not needed in production | — |

---

## 5. What happens to the custom-built prototype

- It stays live on Render as the **design reference and demo** until the Shopify store launches, then it should be turned off.
- `HOSTING_AND_COSTS.md`, `PHASE_2_PLAN.md` and `NEXT_CLAUDE_PROMPT.md` describe the **self-hosted** route and are superseded by this guide.

**Sources:** [Shopify Canada pricing](https://www.shopify.com/ca/pricing) · [Users and plan requirements](https://help.shopify.com/en/manual/your-account/users/users-plan-requirements) · [B2B plan features](https://help.shopify.com/en/manual/b2b/getting-started/plan-features) · [Creating B2B catalogs](https://help.shopify.com/en/manual/b2b/catalogs/creating-catalogs) · [B2B on non-Plus plans](https://changelog.shopify.com/posts/key-b2b-features-now-available-on-non-plus-plans) · [Local delivery](https://help.shopify.com/en/manual/fulfillment/setup/delivery-methods/local-delivery) · [Product CSV](https://help.shopify.com/en/manual/products/import-export/using-csv). Prices and plan limits change; confirm them in Shopify at setup.
