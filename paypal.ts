/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// PayPal Orders v2 over plain fetch: we create the order, the buyer approves it in PayPal's
// own window (opened by PayPal's button in the checkout), and we capture. The browser only
// ever sees the client id and a PayPal order id: amounts are set here from our own catalogue,
// and the capture is made and checked here, so a tampered page can neither change the price
// nor fake a payment.
//
// Env: PAYPAL_CLIENT_ID, PAYPAL_SECRET_KEY, PAYPAL_BASE_URL (https://api-m.sandbox.paypal.com
// for sandbox, https://api-m.paypal.com for live; defaults to sandbox).

const CURRENCY = "USD";
const REQUEST_TIMEOUT_MS = 20_000;

export interface PayPalOrderInput {
  orderId: string;
  items: { name: string; colorway: string; price: number; quantity: number }[];
  subtotal: number;
  discount: number;
  total: number;
  /** Which PayPal page the buyer lands on: the login, or the pay-by-card (guest) form. */
  funding: "paypal" | "card";
  /** Where PayPal sends the buyer's window after they approve / give up. */
  returnUrl: string;
  cancelUrl: string;
}

export interface PayPalCapture {
  /** COMPLETED = money received. PENDING = PayPal is still reviewing it. */
  status: string;
  captureId: string | null;
  amount: number | null;
  currency: string | null;
  /** Our order id, echoed back from the purchase unit. */
  customId: string | null;
}

/** A PayPal API error, with PayPal's own issue code (e.g. INSTRUMENT_DECLINED) when it sent one. */
export class PayPalError extends Error {
  constructor(message: string, public status: number, public issue: string | null, public debugId: string | null) {
    super(message);
    this.name = "PayPalError";
  }
}

const baseUrl = () => (process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com").trim().replace(/\/+$/, "");
const credentials = () => ({
  clientId: (process.env.PAYPAL_CLIENT_ID ?? "").trim(),
  secret: (process.env.PAYPAL_SECRET_KEY ?? "").trim(),
});

export function paypalConfigured(): boolean {
  const { clientId, secret } = credentials();
  return clientId.length > 0 && secret.length > 0;
}

/** Safe to hand to the browser: PayPal's button script needs the client id (never the secret). */
export function paypalPublicConfig() {
  const enabled = paypalConfigured();
  return { enabled, clientId: enabled ? credentials().clientId : "", currency: CURRENCY, sandbox: /sandbox/i.test(baseUrl()) };
}

const money = (n: number) => n.toFixed(2);

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const { clientId, secret } = credentials();
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) {
    throw new PayPalError(
      `PayPal auth failed (${res.status}): ${data?.error_description ?? data?.error ?? "no token returned"}`,
      res.status,
      data?.error ?? null,
      null
    );
  }
  // Refresh a minute early so a token never expires mid-request.
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000 };
  return cachedToken.value;
}

async function paypalRequest(method: "GET" | "POST", path: string, body?: unknown, requestId?: string): Promise<any> {
  const send = async () =>
    fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
        "Content-Type": "application/json",
        // Makes retries of the same create/capture idempotent on PayPal's side.
        ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

  let res = await send();
  if (res.status === 401) {
    // Token revoked or expired early: fetch a new one, once.
    cachedToken = null;
    res = await send();
  }
  const data: any = await res.json().catch(() => null);
  if (!res.ok) {
    const issue = data?.details?.[0]?.issue ?? data?.name ?? null;
    throw new PayPalError(
      `PayPal ${method} ${path} failed (${res.status}): ${issue ?? "unknown"} ${data?.details?.[0]?.description ?? data?.message ?? ""}`.trim(),
      res.status,
      issue,
      data?.debug_id ?? null
    );
  }
  return data;
}

function readCapture(order: any): PayPalCapture {
  const unit = order?.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const value = Number(capture?.amount?.value);
  return {
    status: capture?.status ?? order?.status ?? "UNKNOWN",
    captureId: capture?.id ?? null,
    amount: Number.isFinite(value) ? value : null,
    currency: capture?.amount?.currency_code ?? null,
    customId: capture?.custom_id ?? unit?.custom_id ?? null,
  };
}

/** Creates the PayPal order for an already-priced cart. Returns its id and the page where the buyer approves it. */
export async function createPayPalOrder(o: PayPalOrderInput): Promise<{ id: string; approveUrl: string }> {
  const data = await paypalRequest(
    "POST",
    "/v2/checkout/orders",
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: o.orderId,
          custom_id: o.orderId,
          invoice_id: o.orderId,
          description: `Sujood Mats order ${o.orderId}`.slice(0, 127),
          amount: {
            currency_code: CURRENCY,
            value: money(o.total),
            breakdown: {
              item_total: { currency_code: CURRENCY, value: money(o.subtotal) },
              ...(o.discount > 0 ? { discount: { currency_code: CURRENCY, value: money(o.discount) } } : {}),
            },
          },
          items: o.items.map((i) => ({
            name: i.name.slice(0, 127),
            description: `Colour: ${i.colorway}`.slice(0, 127),
            quantity: String(i.quantity),
            unit_amount: { currency_code: CURRENCY, value: money(i.price) },
            category: "PHYSICAL_GOODS",
          })),
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Sujood Mats",
            user_action: "PAY_NOW",
            // We collect the shipping address ourselves, before the buyer reaches PayPal.
            shipping_preference: "NO_SHIPPING",
            landing_page: o.funding === "card" ? "GUEST_CHECKOUT" : "LOGIN",
            return_url: o.returnUrl,
            cancel_url: o.cancelUrl,
          },
        },
      },
    },
    o.orderId
  );
  const approveUrl = (data?.links ?? []).find((l: any) => l?.rel === "payer-action" || l?.rel === "approve")?.href;
  if (!data?.id || typeof approveUrl !== "string") throw new PayPalError("PayPal did not return an approval link.", 502, null, null);
  return { id: data.id as string, approveUrl };
}

/** Reads a PayPal order: used to find which of our orders it pays for before capturing. */
export async function getPayPalOrder(paypalOrderId: string): Promise<{ status: string; customId: string | null; capture: PayPalCapture }> {
  const data = await paypalRequest("GET", `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`);
  return { status: data?.status ?? "UNKNOWN", customId: data?.purchase_units?.[0]?.custom_id ?? null, capture: readCapture(data) };
}

/** Takes the money for an order the buyer has approved. */
export async function capturePayPalOrder(paypalOrderId: string): Promise<PayPalCapture> {
  try {
    const data = await paypalRequest(
      "POST",
      `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
      undefined,
      `capture-${paypalOrderId}`
    );
    return readCapture(data);
  } catch (error) {
    // A retry after a lost response: the money was already taken, so report that capture.
    if (error instanceof PayPalError && error.issue === "ORDER_ALREADY_CAPTURED") {
      return (await getPayPalOrder(paypalOrderId)).capture;
    }
    throw error;
  }
}
