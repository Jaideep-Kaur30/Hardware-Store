/**
 * Exports the demo catalogue into files for setting up the Shopify store.
 *
 *   npx tsx scripts/export-shopify.ts
 *
 * Writes to shopify/:
 *   products.csv           Shopify product import (Products → Import)
 *   contractor-prices.csv  Contractor fixed prices by SKU, to paste into the
 *                          exported B2B catalog CSV (see SHOPIFY_SETUP.md)
 *   delivery-zones.csv     Local-delivery zones to enter under Shipping and delivery
 *
 * Product data is the prototype's placeholder catalogue. Replace it with the
 * client's real catalogue before launch (same columns).
 */
import fs from "node:fs";
import path from "node:path";
import { createSeedDatabase } from "@/data/seed";
import { isActiveSale } from "@/lib/pricing";
import type { Product, VariantOption } from "@/lib/types";

const OUT = path.join(process.cwd(), "shopify");
const db = createSeedDatabase();
const categoryName = new Map(db.categories.map((c) => [c.id, c.name]));
const subcategoryName = new Map(db.categories.flatMap((c) => c.subcategories.map((s) => [`${c.id}:${s.slug}`, s.name] as const)));

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: Record<string, unknown>[], headers: string[]) =>
  [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n") + "\n";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function bodyHtml(p: Product): string {
  const parts = [`<p>${esc(p.description)}</p>`];
  if (p.features.length) parts.push(`<ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`);
  if (p.specifications.length)
    parts.push(`<h3>Specifications</h3><table>${p.specifications.map((s) => `<tr><th>${esc(s.label)}</th><td>${esc(s.value)}</td></tr>`).join("")}</table>`);
  if (p.installation) parts.push(`<h3>Installation</h3><p>${esc(p.installation)}</p>`);
  if (p.warranty) parts.push(`<h3>Warranty</h3><p>${esc(p.warranty)}</p>`);
  return parts.join("");
}

/** Every combination of the product's option groups (Shopify allows up to 3 options). */
function combinations(p: Product): VariantOption[][] {
  const groups = p.variants.slice(0, 3);
  return groups.reduce<VariantOption[][]>((acc, g) => acc.flatMap((combo) => g.options.map((o) => [...combo, o])), [[]]);
}

const HEADERS = [
  "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
  "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value", "Option3 Name", "Option3 Value",
  "Variant SKU", "Variant Inventory Tracker", "Variant Inventory Qty", "Variant Inventory Policy", "Variant Fulfillment Service",
  "Variant Price", "Variant Compare At Price", "Variant Requires Shipping", "Variant Taxable",
  "SEO Title", "SEO Description", "Status",
  "Coverage per unit sq ft (product.metafields.custom.coverage_sqft)",
  "Coverage unit (product.metafields.custom.coverage_unit)",
  "Minimum order quantity (product.metafields.custom.min_order_qty)",
];

const productRows: Record<string, unknown>[] = [];
const contractorRows: Record<string, unknown>[] = [];

for (const p of db.products.filter((x) => x.active)) {
  const { pricing, inventory } = p;
  const quoteOnly = pricing.retail === null || pricing.visibility === "hidden";
  const contractorsOnly = !quoteOnly && pricing.visibility === "contractors_only";
  const sale = isActiveSale(pricing);
  const tags = [
    categoryName.get(p.categoryId),
    p.subcategory ? subcategoryName.get(`${p.categoryId}:${p.subcategory}`) : undefined,
    p.brand,
    ...p.badges.map((b) => b.replace(/_/g, "-")),
    quoteOnly ? "quote-only" : undefined,
    contractorsOnly ? "contractors-only" : undefined,
    inventory.status === "special_order" ? "special-order" : undefined,
    p.oversized ? "oversized" : undefined,
    sale ? "on-sale" : undefined,
  ].filter(Boolean);

  const combos = combinations(p);
  const each = Math.floor(inventory.quantity / combos.length);
  combos.forEach((combo, i) => {
    const adj = combo.reduce((s, o) => s + (o.priceAdjustment ?? 0), 0);
    const suffix = combo.map((o) => o.skuSuffix ?? o.value.toUpperCase().replace(/[^A-Z0-9]+/g, "")).join("-");
    const sku = suffix ? `${p.sku}-${suffix}` : p.sku;
    // Quote-only products: price 0 with stock 0 + "deny", so they can never be bought at $0
    // even if the theme snippet that swaps the button for "Request a quote" is missing.
    const price = quoteOnly ? 0 : (sale ? (pricing.sale as number) : (pricing.retail as number)) + adj;
    const qty = quoteOnly || inventory.status === "out_of_stock" ? 0 : i === 0 ? inventory.quantity - each * (combos.length - 1) : each;
    const first = i === 0;
    productRows.push({
      Handle: p.slug,
      Title: first ? p.name : "",
      "Body (HTML)": first ? bodyHtml(p) : "",
      Vendor: first ? p.brand : "",
      Type: first ? categoryName.get(p.categoryId) : "",
      Tags: first ? tags.join(", ") : "",
      Published: first ? "TRUE" : "",
      "Option1 Name": first ? (p.variants[0]?.name ?? "Title") : "",
      "Option1 Value": combo[0]?.label ?? "Default Title",
      "Option2 Name": first ? (p.variants[1]?.name ?? "") : "",
      "Option2 Value": combo[1]?.label ?? "",
      "Option3 Name": first ? (p.variants[2]?.name ?? "") : "",
      "Option3 Value": combo[2]?.label ?? "",
      "Variant SKU": sku,
      "Variant Inventory Tracker": "shopify",
      "Variant Inventory Qty": qty,
      "Variant Inventory Policy": inventory.status === "special_order" && !quoteOnly ? "continue" : "deny",
      "Variant Fulfillment Service": "manual",
      "Variant Price": money(price),
      "Variant Compare At Price": !quoteOnly && sale ? money((pricing.retail as number) + adj) : "",
      "Variant Requires Shipping": "TRUE",
      "Variant Taxable": "TRUE",
      "SEO Title": first ? p.name : "",
      "SEO Description": first ? p.shortDescription : "",
      Status: first ? "active" : "",
      "Coverage per unit sq ft (product.metafields.custom.coverage_sqft)": first && p.coverage ? p.coverage.perUnit : "",
      "Coverage unit (product.metafields.custom.coverage_unit)": first && p.coverage ? p.coverage.unitLabel : "",
      "Minimum order quantity (product.metafields.custom.min_order_qty)": first && p.minOrderQty ? p.minOrderQty : "",
    });
    if (pricing.contractor !== null && pricing.contractor !== undefined && !quoteOnly) {
      contractorRows.push({
        Handle: p.slug,
        Product: p.name,
        Variant: combo.map((o) => o.label).join(" / ") || "Default Title",
        "Variant SKU": sku,
        "Retail price": money((pricing.retail as number) + adj),
        // Matches the site's rule: approved contractors pay the lower of their price and an active sale.
        "Contractor fixed price": money(Math.min(pricing.contractor, sale ? (pricing.sale as number) : Infinity) + adj),
      });
    }
  });
}

const zoneRows = db.settings.deliveryZones
  .filter((z) => z.active)
  .map((z) => ({
    Zone: z.name,
    "Postal code prefixes (enter each followed by *)": z.postalPrefixes.join(" "),
    "Delivery price (CAD)": money(z.fee),
    "Free delivery over (CAD)": z.freeOver !== undefined ? money(z.freeOver) : "",
    "Delivery time (show in zone notes)": z.leadTime,
  }));

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "products.csv"), toCsv(productRows, HEADERS));
fs.writeFileSync(path.join(OUT, "contractor-prices.csv"), toCsv(contractorRows, ["Handle", "Product", "Variant", "Variant SKU", "Retail price", "Contractor fixed price"]));
fs.writeFileSync(
  path.join(OUT, "delivery-zones.csv"),
  toCsv(zoneRows, ["Zone", "Postal code prefixes (enter each followed by *)", "Delivery price (CAD)", "Free delivery over (CAD)", "Delivery time (show in zone notes)"]),
);
console.log(`products.csv: ${new Set(productRows.map((r) => r.Handle)).size} products, ${productRows.length} variants`);
console.log(`contractor-prices.csv: ${contractorRows.length} variants`);
console.log(`delivery-zones.csv: ${zoneRows.length} zones`);
