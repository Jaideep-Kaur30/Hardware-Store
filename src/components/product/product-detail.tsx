"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, HardHat, Minus, PackageCheck, ShoppingCart, Truck, Info } from "lucide-react";
import type { ProductView } from "@/lib/catalog-view";
import type { PriceView } from "@/lib/types";
import { optionAdjustment } from "@/lib/pricing";
import { formatDate } from "@/lib/format";
import { ProductFlag } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { PriceDisplay } from "./price";
import { StockIndicator } from "./stock-indicator";
import { CoverageCalculator } from "./coverage-calculator";
import { useAddToCart } from "./use-add-to-cart";
import { cn } from "@/lib/cn";

export type ViewerState = "guest" | "regular" | "pending" | "rejected" | "approved" | "staff";

function adjustPrice(price: PriceView, adjustment: number): PriceView {
  if (price.mode !== "price" || !adjustment) return price;
  return { ...price, amount: price.amount + adjustment, compareAt: price.compareAt ? price.compareAt + adjustment : undefined };
}

function Gallery({ images, colourOverride }: { images: ProductView["images"]; colourOverride?: string }) {
  const [active, setActive] = useState(0);
  const src = (s: string) => (colourOverride && s.startsWith("/media/products/") ? `${s}?c=${colourOverride.replace("#", "")}` : s);
  const current = images[Math.min(active, images.length - 1)];
  return (
    <div className="lg:sticky lg:top-6">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-mist">
        {current ? <img src={src(current.src)} alt={current.alt} className="h-full w-full object-cover" /> : null}
        <span className="absolute right-3 bottom-3 rounded-sm bg-white/90 px-2 py-1 text-[0.6875rem] font-medium text-body">Illustrative image — final photography to follow</span>
      </div>
      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === active}
                className={cn("block aspect-square w-full overflow-hidden rounded-md border-2 bg-mist", i === active ? "border-ink" : "border-transparent hover:border-line")}
              >
                <img src={src(img.src)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ProductDetail({
  product,
  viewerState,
  pickupReady,
  deliveryFrom,
}: {
  product: ProductView;
  viewerState: ViewerState;
  pickupReady: string;
  deliveryFrom: string;
}) {
  const add = useAddToCart();
  const [options, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.variants.map((g) => [g.name, (g.options.find((o) => o.available !== false) ?? g.options[0]).value])),
  );
  const minQty = product.minOrderQty ?? 1;
  const [quantity, setQuantity] = useState(minQty);

  const adjustment = optionAdjustment(product.variants, options);
  const price = adjustPrice(product.price, adjustment);
  const unitPrice = price.mode === "price" ? price.amount : null;
  const colourOverride = useMemo(() => {
    for (const g of product.variants) {
      const opt = g.options.find((o) => o.value === options[g.name]);
      if (opt?.swatch) return opt.swatch;
    }
    return undefined;
  }, [options, product.variants]);
  const optionsLabel = product.variants.map((g) => g.options.find((o) => o.value === options[g.name])?.label).filter(Boolean).join(" · ");
  const skuSuffix = product.variants.map((g) => g.options.find((o) => o.value === options[g.name])?.skuSuffix).filter(Boolean).join("-");
  const quoteHref = `/quote?product=${product.slug}${optionsLabel ? `&options=${encodeURIComponent(optionsLabel)}` : ""}&qty=${quantity}`;
  const savings = price.mode === "price" && price.kind === "sale" ? price.savingsPercent : undefined;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <Gallery images={product.images} colourOverride={colourOverride} />

      <div>
        <div className="flex flex-wrap gap-1.5">
          {savings ? <ProductFlag variant="gold">Sale −{savings}%</ProductFlag> : null}
          {product.badges.map((b) => (
            <ProductFlag key={b} variant={b === "new" ? "dark" : "light"}>
              {b.replace("_", " ")}
            </ProductFlag>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold tracking-[0.1em] text-body uppercase">
          <Link href={`/search?q=${encodeURIComponent(product.brand)}`} className="hover:text-ink">
            {product.brand}
          </Link>
        </p>
        <h1 className="mt-1 text-[1.75rem] leading-tight font-extrabold text-ink sm:text-[2.125rem]">{product.name}</h1>
        <p className="mt-2 text-sm text-body">
          SKU <span className="font-medium text-ink">{product.sku}{skuSuffix ? `-${skuSuffix}` : ""}</span>
          {product.subcategory ? (
            <>
              {" · "}
              <Link href={`/shop/${product.category.slug}?sub=${product.subcategory.slug}`} className="underline-offset-2 hover:underline">
                {product.subcategory.name}
              </Link>
            </>
          ) : null}
        </p>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-body">{product.shortDescription}</p>

        <div className="mt-6 rounded-lg border border-line p-5">
          <PriceDisplay price={price} size="lg" />
          {product.coverage && unitPrice !== null ? (
            <p className="mt-1 text-sm text-body">
              {(unitPrice / product.coverage.perUnit).toLocaleString("en-CA", { style: "currency", currency: "CAD" })} / sq. ft. · {product.coverage.perUnit} sq. ft. per {product.coverage.unitLabel}
            </p>
          ) : null}
          <ContractorNote state={viewerState} price={price} />
          <div className="mt-4 border-t border-line pt-4">
            <StockIndicator stock={product.stock} showDetail />
            {product.stock.status === "out_of_stock" && product.restockDate ? (
              <p className="mt-1 ml-5.5 text-xs text-body">Expected back {formatDate(product.restockDate, { dateStyle: "long" })}. You can still request a quote to reserve stock.</p>
            ) : null}
          </div>
        </div>

        {product.variants.map((group) => (
          <fieldset key={group.name} className="mt-6">
            <legend className="text-sm font-semibold text-ink">
              {group.name}: <span className="font-normal text-body">{group.options.find((o) => o.value === options[group.name])?.label}</span>
            </legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {group.options.map((o) => {
                const selected = options[group.name] === o.value;
                return (
                  <label
                    key={o.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold-dark",
                      selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink",
                      o.available === false && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <input type="radio" name={group.name} value={o.value} defaultChecked={selected} disabled={o.available === false} onChange={() => setOptions((prev) => ({ ...prev, [group.name]: o.value }))} className="sr-only" />
                    {o.swatch ? <span className="h-4 w-4 rounded-full ring-1 ring-line" style={{ background: o.swatch }} aria-hidden /> : null}
                    {o.label}
                    {o.priceAdjustment && price.mode === "price" ? <span className={cn("text-xs", selected ? "text-white/70" : "text-body")}>{o.priceAdjustment > 0 ? "+" : "−"}${Math.abs(o.priceAdjustment)}</span> : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        {product.coverage ? (
          <div className="mt-6">
            <CoverageCalculator coverage={product.coverage} unitPrice={unitPrice} onApply={(n) => setQuantity(Math.max(minQty, n))} />
          </div>
        ) : null}

        <div className="mt-6">
          {price.mode === "price" ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row">
                <QuantityStepper value={quantity} onChange={setQuantity} min={minQty} label="Quantity" />
                <button
                  type="button"
                  disabled={!product.stock.purchasable}
                  onClick={() => add(product, quantity, product.variants.length ? options : undefined)}
                  className={buttonClass("dark", "md", "flex-1")}
                >
                  <ShoppingCart className="h-5 w-5" aria-hidden /> {product.stock.purchasable ? "Add to cart" : "Out of stock"}
                </button>
              </div>
              {minQty > 1 ? <p className="mt-2 flex items-center gap-1 text-xs text-body"><Minus className="h-3 w-3" aria-hidden /> Minimum order quantity: {minQty}</p> : null}
              <Link href={quoteHref} className={buttonClass("outline", "md", "mt-3 w-full")}>
                <FileText className="h-4.5 w-4.5" aria-hidden /> Request a quote for this item
              </Link>
            </>
          ) : (
            <>
              <Link href={quoteHref} className={buttonClass("primary", "lg", "w-full")}>
                <FileText className="h-5 w-5" aria-hidden /> Request a Quote
              </Link>
              <p className="mt-2 text-sm text-body">Tell us your measurements and quantities — our team will send pricing, usually within one business day.</p>
            </>
          )}
        </div>

        <ul className="mt-6 divide-y divide-line rounded-lg border border-line text-sm">
          <li className="flex gap-3 p-4">
            <PackageCheck className="h-5 w-5 shrink-0 text-success" aria-hidden />
            <span>
              <span className="font-semibold text-ink">Free in-store pickup</span>
              <span className="block text-body">{product.stock.status === "special_order" ? "Available once your special order arrives" : `Usually ready ${pickupReady.toLowerCase()}`}</span>
            </span>
          </li>
          <li className="flex gap-3 p-4">
            <Truck className="h-5 w-5 shrink-0 text-ink" aria-hidden />
            <span>
              <span className="font-semibold text-ink">Local delivery from {deliveryFrom}</span>
              <span className="block text-body">
                {product.oversized ? "Oversized item — larger orders may have the delivery fee confirmed by our team." : "Check your postal code at checkout."}
              </span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function ContractorNote({ state, price }: { state: ViewerState; price: PriceView }) {
  if (price.mode === "price" && price.kind === "contractor") {
    return (
      <p className="mt-3 flex items-start gap-2 rounded-md bg-mist px-3 py-2 text-[0.8125rem] text-ink">
        <HardHat className="mt-px h-4 w-4 shrink-0" aria-hidden /> Your approved contractor pricing is applied automatically at checkout.
      </p>
    );
  }
  if (state === "pending") {
    return (
      <p className="mt-3 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-[0.8125rem] text-warning">
        <Info className="mt-px h-4 w-4 shrink-0" aria-hidden /> Your contractor application is under review. Retail prices are shown until it&apos;s approved.
      </p>
    );
  }
  if (state === "guest" || state === "regular") {
    return (
      <p className="mt-3 text-[0.8125rem] text-body">
        <HardHat className="mr-1 inline h-4 w-4 align-text-bottom text-gold-dark" aria-hidden />
        Contractor?{" "}
        <Link href={state === "guest" ? "/account/login" : "/contractors/apply"} className="font-semibold text-ink underline decoration-gold decoration-2 underline-offset-2">
          {state === "guest" ? "Sign in" : "Apply"} for trade pricing
        </Link>
      </p>
    );
  }
  return null;
}
