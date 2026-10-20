"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { CartLine } from "@/lib/types";
import { cartLineKey } from "@/lib/cart";

/**
 * Cart state lives in the browser (localStorage) so guests can shop without an
 * account. Prices are NEVER stored here — every view re-prices the lines on the
 * server for the current viewer (see app/actions/cart.ts).
 *
 * The cart is a small external store read with useSyncExternalStore rather than
 * React state held in a context provider. Loading the saved cart after the page
 * arrives therefore re-renders only the components that read it (header count,
 * drawer, cart page…). A context update above a still-streaming part of the page
 * would make React discard that server HTML and re-render it on the client.
 */
const STORAGE_KEY = "nl_cart_v1";

interface CartState {
  lines: CartLine[];
  /** False during server render / hydration, true once the saved cart has been read. */
  hydrated: boolean;
  drawerOpen: boolean;
}

interface CartContextValue extends CartState {
  count: number;
  addItem: (productId: string, quantity: number, options?: Record<string, string>) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.productId === "string" && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

function writeStorage(lines: CartLine[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // storage full or disabled — cart still works for this page view
  }
}

/* ------------------------------ store ------------------------------ */

const SERVER_STATE: CartState = { lines: [], hydrated: false, drawerOpen: false };
let state: CartState | null = null;
const listeners = new Set<() => void>();

function getState(): CartState {
  state ??= { lines: readStorage(), hydrated: true, drawerOpen: false };
  return state;
}

const getServerState = () => SERVER_STATE;

function update(fn: (s: CartState) => CartState) {
  const prev = getState();
  const next = fn(prev);
  if (next === prev) return;
  state = next;
  if (next.lines !== prev.lines) writeStorage(next.lines);
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key === STORAGE_KEY) update((s) => ({ ...s, lines: readStorage() }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

const actions = {
  addItem(productId: string, quantity: number, options?: Record<string, string>) {
    update((s) => {
      const key = cartLineKey({ productId, options });
      const existing = s.lines.find((l) => cartLineKey(l) === key);
      const lines = existing
        ? s.lines.map((l) => (cartLineKey(l) === key ? { ...l, quantity: Math.min(999, l.quantity + quantity) } : l))
        : [...s.lines, { productId, quantity, options: options && Object.keys(options).length ? options : undefined }];
      return { ...s, lines };
    });
  },
  setQuantity(key: string, quantity: number) {
    update((s) => ({ ...s, lines: s.lines.map((l) => (cartLineKey(l) === key ? { ...l, quantity: Math.max(1, Math.min(999, quantity)) } : l)) }));
  },
  removeItem(key: string) {
    update((s) => ({ ...s, lines: s.lines.filter((l) => cartLineKey(l) !== key) }));
  },
  clear() {
    update((s) => ({ ...s, lines: [] }));
  },
  openDrawer() {
    update((s) => (s.drawerOpen ? s : { ...s, drawerOpen: true }));
  },
  closeDrawer() {
    update((s) => (s.drawerOpen ? { ...s, drawerOpen: false } : s));
  },
};

/** Kept so layouts don't change; the cart no longer needs a context provider. */
export function CartProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useCart(): CartContextValue {
  const s = useSyncExternalStore(subscribe, getState, getServerState);
  return useMemo(() => ({ ...s, count: s.lines.reduce((n, l) => n + l.quantity, 0), ...actions }), [s]);
}
