/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Tiny first-party analytics client. Manages a durable session id, captures
// no-permission location signals (timezone + locale-derived country), and
// ships events to the backend. Everything is best-effort and never throws.

import { apiUrl } from "./config";

const SESSION_KEY = "sujood_session_id";
const CART_KEY = "sujood_cart_id";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function persistentId(key: string): string {
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = uuid();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return uuid(); // private mode / storage disabled
  }
}

export function getSessionId(): string {
  return persistentId(SESSION_KEY);
}

// A cart id is created lazily on first add-to-cart and rotated after purchase.
export function getCartId(): string {
  return persistentId(CART_KEY);
}

export function resetCartId(): void {
  try {
    localStorage.removeItem(CART_KEY);
  } catch {
    /* ignore */
  }
}

function localeCountry(): string | null {
  try {
    const loc = new Intl.Locale(navigator.language);
    // maximize() fills in a likely region when the tag omits one (e.g. "en" -> "en-US")
    const region = (loc as any).maximize?.().region ?? loc.region;
    return region ?? null;
  } catch {
    return null;
  }
}

function timezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

function parseUtm() {
  try {
    const q = new URLSearchParams(location.search);
    return {
      utmSource: q.get("utm_source"),
      utmMedium: q.get("utm_medium"),
      utmCampaign: q.get("utm_campaign"),
    };
  } catch {
    return {};
  }
}

let sessionReady: Promise<void> | null = null;

// Call once on app load. Registers the session with device/location context.
export function initAnalytics(): Promise<void> {
  if (sessionReady) return sessionReady;
  const body = {
    id: getSessionId(),
    timezone: timezone(),
    locale: typeof navigator !== "undefined" ? navigator.language : null,
    country: localeCountry(),
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    landingPage: typeof location !== "undefined" ? location.pathname + location.search : null,
    ...parseUtm(),
  };
  sessionReady = fetch(apiUrl("/api/session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(() => undefined)
    .catch(() => undefined);
  return sessionReady;
}

export interface TrackProps {
  productId?: string;
  productName?: string;
  colorway?: string;
  quantity?: number;
  unitPrice?: number;
  value?: number;
  cartId?: string;
  orderId?: string;
  metadata?: unknown;
}

// Fire-and-forget event. Uses sendBeacon when the page is unloading.
export function track(eventType: string, props: TrackProps = {}, useBeacon = false): void {
  const payload = {
    sessionId: getSessionId(),
    eventType,
    pageUrl: typeof location !== "undefined" ? location.pathname : null,
    ...props,
  };
  try {
    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(apiUrl("/api/track"), blob);
      return;
    }
    fetch(apiUrl("/api/track"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* never let analytics break the app */
  }
}

export interface SyncCartItem {
  productId?: string;
  name: string;
  colorway?: string;
  price: number;
  quantity: number;
  configuration?: unknown;
  imageUrl?: string;
}

// Mirror the live cart to the backend so abandonment can be measured.
export function syncCart(
  items: SyncCartItem[],
  status: "active" | "abandoned" | "converted" = "active",
  reachedCheckout = false,
  useBeacon = false,
): void {
  const payload = {
    cartId: getCartId(),
    sessionId: getSessionId(),
    status,
    reachedCheckout,
    items,
  };
  try {
    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(apiUrl("/api/cart/sync"), blob);
      return;
    }
    fetch(apiUrl("/api/cart/sync"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}
