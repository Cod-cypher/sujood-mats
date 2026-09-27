/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Stripe PaymentIntents over plain fetch, for the card form embedded in the checkout.
// We create a PaymentIntent for an already-priced order, the browser's Stripe form pays it
// (card details go straight from the browser to Stripe and never reach this server), and we
// read the intent back to see whether the money arrived. The amount is set here from our own
// catalogue and the result is read from Stripe, never from the browser, so a tampered page can
// neither change the price nor fake a payment.
//
// Env: STRIPE_SECRET_KEY (sk_...), STRIPE_PUBLISHABLE_KEY (pk_..., handed to the browser).
// Optional: STRIPE_WEBHOOK_SECRET (whsec_...) to also accept Stripe's payment webhooks.

import crypto from "crypto";

const CURRENCY = "usd";
const REQUEST_TIMEOUT_MS = 20_000;
const BASE_URL = "https://api.stripe.com/v1";

export interface StripePaymentInput {
  orderId: string;
  total: number;
  customer: {
    name: string;
    email: string;
    address: string;
    city: string;
    region?: string;
    postalCode: string;
    /** ISO 3166-1 alpha-2, when the checkout supplied one. */
    countryCode?: string;
  };
}

export interface StripePayment {
  id: string;
  /** Stripe's own status: succeeded, processing, requires_payment_method, requires_action, canceled... */
  status: string;
  /** In whole currency units (Stripe reports cents). */
  amount: number | null;
  currency: string | null;
  /** Our order id, echoed back from the intent's metadata. */
  orderId: string | null;
}

export class StripeError extends Error {
  constructor(message: string, public status: number, public code: string | null, public requestId: string | null) {
    super(message);
    this.name = "StripeError";
  }
}

const secretKey = () => (process.env.STRIPE_SECRET_KEY ?? "").trim();
const publishableKey = () => (process.env.STRIPE_PUBLISHABLE_KEY ?? "").trim();

export function stripeConfigured(): boolean {
  const mode = /^sk_(test|live)_/.exec(secretKey())?.[1];
  // Both keys, and from the same mode: a test key paired with a live one can never pay.
  return !!mode && publishableKey().startsWith(`pk_${mode}_`);
}

/** Safe to hand to the browser: the publishable key is made for that (never the secret). */
export function stripePublicConfig() {
  const enabled = stripeConfigured();
  return { enabled, publishableKey: enabled ? publishableKey() : "", currency: CURRENCY.toUpperCase(), test: /^sk_test_/.test(secretKey()) };
}

// Stripe's API takes form-encoded bodies; nested fields are written as a[b][c]=v.
function encodeForm(obj: unknown, prefix = "", out: string[] = []): string[] {
  if (obj === undefined || obj === null || obj === "") return out;
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) encodeForm(v, prefix ? `${prefix}[${k}]` : k, out);
  } else {
    out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(obj))}`);
  }
  return out;
}

async function stripeRequest(method: "GET" | "POST", path: string, body?: unknown, idempotencyKey?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Retrying a create with the same key returns the same intent instead of a second one.
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: body === undefined ? undefined : encodeForm(body).join("&"),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error ?? {};
    throw new StripeError(`Stripe ${method} ${path} failed (${res.status}): ${e.code ?? e.type ?? "unknown"} ${e.message ?? ""}`.trim(), res.status, e.code ?? e.type ?? null, res.headers.get("request-id"));
  }
  return data;
}

export const toCents = (n: number) => Math.round(n * 100);

function readPayment(pi: any): StripePayment {
  // amount_received is what actually arrived; before payment it is 0, so fall back to the ask.
  const cents = Number(pi?.status === "succeeded" ? pi?.amount_received : pi?.amount);
  return {
    id: pi?.id ?? "",
    status: pi?.status ?? "unknown",
    amount: Number.isFinite(cents) ? cents / 100 : null,
    currency: pi?.currency ?? null,
    orderId: pi?.metadata?.orderId ?? null,
  };
}

/** Creates the PaymentIntent. Returns its id and the client secret the browser form pays it with. */
export async function createStripePayment(o: StripePaymentInput): Promise<{ id: string; clientSecret: string }> {
  const c = o.customer;
  const data = await stripeRequest(
    "POST",
    "/payment_intents",
    {
      amount: toCents(o.total),
      currency: CURRENCY,
      // Cards only, which includes Apple Pay and Google Pay. Nothing here redirects the
      // buyer away from the checkout.
      payment_method_types: { 0: "card" },
      // Ask the buyer's bank to approve the payment (3D Secure) whenever the card has it.
      // Left to itself Stripe only asks where the law requires it, and banks elsewhere
      // (Pakistan, for one) decline a payment that arrives without it. A card without 3D
      // Secure is charged as before.
      payment_method_options: { card: { request_three_d_secure: "any" } },
      description: `Sujood Mats order ${o.orderId}`,
      // In live mode Stripe emails its own receipt to this address as well as ours.
      receipt_email: c.email,
      metadata: { orderId: o.orderId },
      shipping: {
        name: c.name,
        address: { line1: c.address, city: c.city, state: c.region, postal_code: c.postalCode, country: c.countryCode },
      },
    },
    `pi-${o.orderId}`
  );
  if (!data?.id || typeof data?.client_secret !== "string") throw new StripeError("Stripe did not return a payment to complete.", 502, null, null);
  return { id: data.id, clientSecret: data.client_secret };
}

/** Reads a payment back. The only source of truth for "was it paid". */
export async function getStripePayment(paymentIntentId: string): Promise<StripePayment> {
  return readPayment(await stripeRequest("GET", `/payment_intents/${encodeURIComponent(paymentIntentId)}`));
}

/** Cancels a payment the buyer walked away from, so it can never be completed later. */
export async function cancelStripePayment(paymentIntentId: string): Promise<void> {
  try {
    await stripeRequest("POST", `/payment_intents/${encodeURIComponent(paymentIntentId)}/cancel`, { cancellation_reason: "abandoned" });
  } catch (error) {
    // Already paid or already cancelled: nothing to do.
    if (!(error instanceof StripeError && error.status === 400)) throw error;
  }
}

// ---------------------------------------------------------------------------
// WEBHOOKS
// ---------------------------------------------------------------------------

export const stripeWebhookConfigured = () => /^whsec_/.test((process.env.STRIPE_WEBHOOK_SECRET ?? "").trim());

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

/**
 * Checks a webhook's Stripe-Signature header against the raw request body and returns the
 * event, or null if it was not signed by Stripe with our secret (or is a replay of an old one).
 */
export function readStripeWebhook(rawBody: Buffer, signatureHeader: string | undefined, now = Date.now()): any | null {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  if (!secret || !signatureHeader) return null;
  const parts = signatureHeader.split(",").map((p) => p.trim().split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!timestamp || signatures.length === 0) return null;
  if (Math.abs(now / 1000 - Number(timestamp)) > WEBHOOK_TOLERANCE_SECONDS) return null;

  const expected = Buffer.from(crypto.createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex"));
  const genuine = signatures.some((s) => {
    const given = Buffer.from(s ?? "");
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
  if (!genuine) return null;
  try {
    return JSON.parse(rawBody.toString("utf8"));
  } catch {
    return null;
  }
}
