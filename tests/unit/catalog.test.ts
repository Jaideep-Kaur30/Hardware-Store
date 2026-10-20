import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createSeedDatabase } from "@/data/seed";
import { toProductView } from "@/lib/catalog-view";
import { filterProducts, parseFilters, searchScore } from "@/lib/catalog-filter";

// Freeze the clock at the seed date: sale end dates are relative to it, and
// pricing checks "is this sale still running?" against the current time.
const SEED_DATE = new Date("2026-09-23T12:00:00Z");
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SEED_DATE);
});
afterAll(() => {
  vi.useRealTimers();
});

const db = createSeedDatabase(SEED_DATE);

describe("product view (data sent to the browser)", () => {
  it("never includes the raw pricing object or contractor price for non-approved viewers", () => {
    for (const viewer of [null, { accountType: "regular" as const }, { accountType: "contractor" as const, contractorStatus: "pending" as const }, { accountType: "contractor" as const, contractorStatus: "rejected" as const }]) {
      for (const product of db.products) {
        const view = toProductView(product, db.categories, viewer);
        expect(view).not.toHaveProperty("pricing");
        if (view.price.mode === "price") expect(view.price.kind).not.toBe("contractor");
        if (product.pricing.contractor !== null && product.pricing.contractor !== product.pricing.retail && product.pricing.contractor !== product.pricing.sale) {
          expect(JSON.stringify(view)).not.toContain(`"amount":${product.pricing.contractor}`);
        }
      }
    }
  });

  it("gives approved contractors contractor pricing on eligible products", () => {
    const product = db.products.find((p) => p.slug === "harbour-oak-rigid-core-spc-plank")!;
    const view = toProductView(product, db.categories, { accountType: "contractor", contractorStatus: "approved" });
    expect(view.price).toMatchObject({ mode: "price", kind: "contractor", amount: 64.99 });
  });
});

describe("catalogue search & filters", () => {
  it("finds products by name, synonym and SKU", () => {
    const vinyl = filterProducts(db.products, db.categories, { q: "vinyl" }, null).products;
    expect(vinyl.length).toBeGreaterThan(5);
    const lvp = filterProducts(db.products, db.categories, { q: "lvp" }, null).products;
    expect(lvp.some((p) => p.categoryId === "vinyl")).toBe(true);
    const sku = db.products[0].sku;
    expect(filterProducts(db.products, db.categories, { q: sku }, null).products[0].sku).toBe(sku);
  });

  it("returns no results for nonsense queries", () => {
    expect(filterProducts(db.products, db.categories, { q: "zzzqqq" }, null).products).toHaveLength(0);
  });

  it("filters by category, brand, availability and sale", () => {
    const doors = filterProducts(db.products, db.categories, { category: "doors" }, null).products;
    expect(doors.every((p) => p.categoryId === "doors")).toBe(true);
    const brand = filterProducts(db.products, db.categories, { brands: ["Ironside Hardware"] }, null).products;
    expect(brand.length).toBeGreaterThan(0);
    expect(brand.every((p) => p.brand === "Ironside Hardware")).toBe(true);
    const special = filterProducts(db.products, db.categories, { availability: ["special_order"] }, null).products;
    expect(special.every((p) => p.inventory.status === "special_order")).toBe(true);
    const sale = filterProducts(db.products, db.categories, { onSale: true }, null).products;
    expect(sale.length).toBeGreaterThan(3);
    expect(sale.every((p) => p.pricing.sale !== null)).toBe(true);
  });

  it("sorts by effective price with quote-only products last", () => {
    const sorted = filterProducts(db.products, db.categories, { category: "vinyl", sort: "price-asc" }, null).products;
    const prices = sorted.map((p) => (p.pricing.retail === null ? Infinity : (p.pricing.sale ?? p.pricing.retail)));
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    expect(sorted.at(-1)?.pricing.retail).toBeNull();
  });

  it("filters by price range using the viewer's price", () => {
    const res = filterProducts(db.products, db.categories, { priceMin: 50, priceMax: 100 }, null).products;
    for (const p of res) {
      const price = p.pricing.sale ?? p.pricing.retail!;
      expect(price).toBeGreaterThanOrEqual(50);
      expect(price).toBeLessThanOrEqual(100);
    }
  });

  it("parses search params safely", () => {
    expect(parseFilters({ q: "door", brand: "A,B", sale: "1", min: "-5", sort: "bogus", availability: "in_stock,evil" })).toMatchObject({
      q: "door",
      brands: ["A", "B"],
      onSale: true,
      priceMin: undefined,
      sort: undefined,
      availability: ["in_stock"],
    });
  });

  it("scores name matches above description matches", () => {
    const door = db.products.find((p) => p.slug === "shaker-1-panel-interior-door-slab")!;
    const cat = db.categories.find((c) => c.id === door.categoryId);
    expect(searchScore(door, cat, "shaker")).toBeGreaterThan(searchScore(door, cat, "primed"));
  });
});
