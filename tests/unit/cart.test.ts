import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createSeedDatabase } from "@/data/seed";
import { cartLineKey, cartTotals, estimateDelivery, findDeliveryZone, orderTotals, priceCartLines } from "@/lib/cart";

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
const bySlug = (slug: string) => db.products.find((p) => p.slug === slug)!;

describe("cart pricing", () => {
  const oak = bySlug("harbour-oak-rigid-core-spc-plank"); // sale 69.99, contractor 64.99
  const door = bySlug("shaker-1-panel-interior-door-slab"); // 179 + width adjustments

  it("prices lines on the server for the viewer", () => {
    const guest = priceCartLines([{ productId: oak.id, quantity: 3 }], db.products, null);
    expect(guest[0]).toMatchObject({ unitPrice: 69.99, lineTotal: 209.97 });
    const pro = priceCartLines([{ productId: oak.id, quantity: 3 }], db.products, { accountType: "contractor", contractorStatus: "approved" });
    expect(pro[0]).toMatchObject({ unitPrice: 64.99, lineTotal: 194.97 });
  });

  it("applies variant adjustments and labels options", () => {
    const [line] = priceCartLines([{ productId: door.id, quantity: 2, options: { Width: "36" } }], db.products, null);
    expect(line.unitPrice).toBe(204);
    expect(line.lineTotal).toBe(408);
    expect(line.optionsLabel).toBe('36"');
  });

  it("drops unknown products and clamps quantities", () => {
    const lines = priceCartLines([{ productId: "nope", quantity: 1 }, { productId: oak.id, quantity: 5000 }], db.products, null);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(999);
  });

  it("flags quote-only and out-of-stock items", () => {
    const quoteOnly = bySlug("estate-collection-european-oak");
    const out = db.products.find((p) => p.inventory.status === "out_of_stock")!;
    const lines = priceCartLines([{ productId: quoteOnly.id, quantity: 1 }, { productId: out.id, quantity: 1 }], db.products, null);
    expect(lines.every((l) => l.issue)).toBe(true);
    const totals = cartTotals(lines);
    expect(totals.hasQuoteOnlyItems).toBe(true);
    expect(totals.hasIssues).toBe(true);
  });

  it("totals subtotal and savings", () => {
    const lines = priceCartLines([{ productId: oak.id, quantity: 2 }], db.products, null);
    expect(cartTotals(lines)).toMatchObject({ itemCount: 2, subtotal: 139.98, savings: 25 });
  });

  it("uses stable keys regardless of option order", () => {
    expect(cartLineKey({ productId: "a", options: { B: "2", A: "1" } })).toBe(cartLineKey({ productId: "a", options: { A: "1", B: "2" } }));
  });
});

describe("delivery & totals", () => {
  const zones = db.settings.deliveryZones;
  it("matches the most specific postal prefix", () => {
    expect(findDeliveryZone("L5A 1B2", zones)?.id).toBe("zone_local");
    expect(findDeliveryZone("M4C1A1", zones)?.id).toBe("zone_metro");
    expect(findDeliveryZone("N2L 3G1", zones)?.id).toBe("zone_extended");
    expect(findDeliveryZone("V6B 1A1", zones)).toBeUndefined();
  });

  it("validates postal codes and reports out-of-area", () => {
    expect(estimateDelivery("12345", [], 0, db.settings).status).toBe("invalid");
    expect(estimateDelivery("V6B 1A1", [], 0, db.settings).status).toBe("outside");
  });

  it("charges the zone fee, waives it over the threshold and marks large oversized orders TBC", () => {
    expect(estimateDelivery("L5A 1B2", [], 100, db.settings)).toMatchObject({ status: "ok", fee: 79, feeToBeConfirmed: false });
    expect(estimateDelivery("L5A 1B2", [], 3000, db.settings)).toMatchObject({ fee: 0, freeDelivery: true });
    expect(estimateDelivery("L5A 1B2", [{ oversized: true, quantity: 10 }], 100, db.settings)).toMatchObject({ fee: 0, feeToBeConfirmed: true });
  });

  it("calculates tax on subtotal plus delivery", () => {
    expect(orderTotals(100, 79, 0.13)).toEqual({ subtotal: 100, deliveryFee: 79, tax: 23.27, total: 202.27 });
  });
});
