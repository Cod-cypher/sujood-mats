/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// The checkout step of the cart: contact and shipping details, then payment, beside a
// summary of the order. Paying by card happens right here (Stripe's embedded form); PayPal
// opens PayPal's own window. Ordering by invoice is only offered when neither is set up.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, CreditCard, HeartHandshake, Loader2, Lock, ShieldCheck, Wallet } from "lucide-react";
import { CartItem } from "../types";
import { CONTACT_EMAIL } from "../seo/site";
import { track, getSessionId, getCartId } from "../analytics";
import { apiUrl } from "../config";
import { countries, countryName, guessCountryCode } from "../countries";
import { formatMoney } from "../format";
import { PayPalButton, StripeCardForm, type PaymentActivity, type PaymentProvider } from "./PaymentCheckout";

export interface CustomerDetails {
  email: string;
  name: string;
  address: string;
  address2: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
}

export const EMPTY_CUSTOMER: CustomerDetails = { email: "", name: "", address: "", address2: "", city: "", region: "", postalCode: "", countryCode: "" };

export interface CompletedOrder {
  orderId: string;
  total: number;
  email: string;
  emailSent: boolean;
  // Set for orders paid at checkout. Absent for invoice orders, which are unpaid.
  paymentState?: "paid" | "processing";
  provider?: PaymentProvider;
}

interface CheckoutProps {
  cartItems: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  customer: CustomerDetails;
  onCustomerChange: (customer: CustomerDetails) => void;
  onBack: () => void;
  onComplete: (order: CompletedOrder) => void;
}

interface PaymentConfig {
  paypal: { enabled: boolean; clientId: string; currency: string };
  stripe: { enabled: boolean; publishableKey: string; currency: string };
}

const postJson = (path: string, body: unknown, keepalive = false) =>
  fetch(apiUrl(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive });

// Location context we can capture without a permission prompt.
const timezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

// 16px text: comfortable to read, and the size below which iPhones zoom the page on focus.
const FIELD =
  "w-full h-12 px-4 text-base rounded-lg bg-spruce-50 border border-spruce-200 text-spruce-950 placeholder:text-spruce-400 transition-colors duration-150 focus:outline-hidden focus:border-clay-ochre focus:ring-1 focus:ring-clay-ochre";
const LABEL = "block text-[13px] font-medium text-spruce-700 mb-1.5";

function Field({
  label,
  optional,
  className,
  ...input
}: { label: string; optional?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className={LABEL}>
        {label}
        {optional && <span className="text-spruce-400 font-normal"> (optional)</span>}
      </span>
      <input {...input} required={!optional} className={FIELD} />
    </label>
  );
}

function OrderSummary({ cartItems, subtotal, discount, total }: Pick<CheckoutProps, "cartItems" | "subtotal" | "discount" | "total">) {
  return (
    <div className="space-y-6">
      <ul className="space-y-5">
        {cartItems.map((item) => (
          <li key={item.id} className="flex items-center space-x-4">
            <div className="relative flex-shrink-0">
              <img src={item.imageUrl} alt="" className="w-[72px] h-[72px] object-cover rounded-lg border border-spruce-200" />
              <span className="absolute -top-2 -right-2 min-w-6 h-6 px-1.5 rounded-full bg-clay-ochre text-clay-ink text-xs font-semibold flex items-center justify-center">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-spruce-950 leading-snug">{item.name}</p>
              <p className="text-[13px] text-spruce-600 mt-0.5">{item.colorway}</p>
              {item.configuration && (
                <p className="text-[13px] text-clay-accent mt-0.5 capitalize">
                  {item.configuration.pattern}, {item.configuration.tassels} tassels
                  {item.configuration.monogram && `, “${item.configuration.monogram}”`}
                </p>
              )}
            </div>
            <p className="text-sm font-medium text-spruce-950 tabular-nums">{formatMoney(item.price * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <dl className="space-y-2.5 text-sm border-t border-spruce-200 pt-5">
        <div className="flex justify-between text-spruce-700">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-clay-accent">
            <dt className="flex items-center">
              <HeartHandshake className="w-4 h-4 mr-1.5" /> Bundle discount
            </dt>
            <dd className="tabular-nums">−{formatMoney(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between text-spruce-700">
          <dt>Shipping</dt>
          <dd className="text-clay-accent font-medium">Free</dd>
        </div>
        <div className="flex justify-between items-baseline border-t border-spruce-200 pt-4 text-spruce-950">
          <dt className="text-base font-semibold">Total</dt>
          <dd className="text-2xl font-semibold tracking-tight tabular-nums">
            <span className="text-xs font-normal tracking-normal text-spruce-600 mr-2">USD</span>
            {formatMoney(total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function Checkout({ cartItems, subtotal, discount, total, customer, onCustomerChange, onBack, onComplete }: CheckoutProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [method, setMethod] = useState<"card" | "paypal">("card");
  const [activity, setActivity] = useState<PaymentActivity | "invoice">("idle");
  const [error, setError] = useState<string | null>(null);
  // The card payment already created for exactly this cart and these details, so a retry
  // after a declined card pays the same order instead of starting a second one.
  const cardPayment = useRef<{ key: string; paymentId: string; clientSecret: string } | null>(null);

  const cardEnabled = !!config?.stripe.enabled;
  const paypalEnabled = !!config?.paypal.enabled;
  const payNow = cardEnabled || paypalEnabled;
  const busy = activity !== "idle";

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/payments/config"))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((c: PaymentConfig) => {
        if (cancelled) return;
        setConfig(c);
        if (!c.stripe?.enabled && c.paypal?.enabled) setMethod("paypal");
      })
      // Without it the checkout still works: by invoice.
      .catch(() => !cancelled && setConfig({ paypal: { enabled: false, clientId: "", currency: "USD" }, stripe: { enabled: false, publishableKey: "", currency: "USD" } }));
    return () => {
      cancelled = true;
    };
  }, []);

  // Most visitors order to the country their browser is set to.
  useEffect(() => {
    if (!customer.countryCode) {
      const guess = guessCountryCode();
      if (guess) onCustomerChange({ ...customer, countryCode: guess });
    }
    // Only on arrival: a buyer who clears the field must not have it filled back in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onCustomerChange({ ...customer, [e.target.name]: e.target.value });

  const payload = () => ({
    cartItems,
    customerInfo: {
      name: customer.name,
      email: customer.email,
      address: [customer.address, customer.address2].map((s) => s.trim()).filter(Boolean).join(", "),
      city: customer.city,
      region: customer.region,
      postalCode: customer.postalCode,
      country: countryName(customer.countryCode),
      countryCode: customer.countryCode,
      timezone: timezone(),
    },
    sessionId: getSessionId(),
    cartId: getCartId(),
  });

  // Same required-field checks for every way of paying, with the browser's own messages.
  const validate = () => {
    const ok = formRef.current?.reportValidity() ?? false;
    if (ok) track("add_shipping_info", { cartId: getCartId(), value: total });
    return ok;
  };

  // Errors appear beside the pay button, which may be off screen on a phone.
  const showError = useCallback((el: HTMLDivElement | null) => {
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const start = async (provider: PaymentProvider) => {
    const response = await postJson(`/api/payments/${provider}/start`, payload());
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.paymentId) throw new Error(data?.error ?? "We couldn't start your payment. Please try again.");
    return data as { paymentId: string; clientSecret: string };
  };

  const startCard = async () => {
    const { cartItems: items, customerInfo } = payload();
    const key = JSON.stringify([items.map((i) => [i.productId, i.colorway, i.quantity]), customerInfo]);
    const existing = cardPayment.current;
    if (existing?.key === key) return existing;
    // The cart or the details changed since the last attempt: that payment is for an order
    // that no longer matches, so it is cancelled and a new one made.
    if (existing) postJson("/api/payments/stripe/abandon", { paymentId: existing.paymentId }).catch(() => {});
    const created = await start("stripe");
    cardPayment.current = { key, paymentId: created.paymentId, clientSecret: created.clientSecret };
    return cardPayment.current;
  };

  // keepalive: the request completes even if the buyer closes the tab right after paying.
  const confirm = async (provider: PaymentProvider, paymentId: string) => {
    const response = await postJson(`/api/payments/${provider}/confirm`, { paymentId }, true);
    const data = await response.json().catch(() => null);
    if (response.ok && data?.orderId) {
      cardPayment.current = null;
      onComplete({ ...data, provider });
      return "done" as const;
    }
    if (data?.restart) return "restart" as const;
    throw new Error(data?.error ?? `We couldn't confirm your payment. Please don't pay again: email ${CONTACT_EMAIL} and we'll check it.`);
  };

  const placeInvoiceOrder = async () => {
    if (busy) return;
    setError(null);
    if (!validate()) return;
    setActivity("invoice");
    try {
      const response = await postJson("/api/checkout", payload());
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.orderId) {
        setError(data?.error ?? "Something went wrong placing your order. Please try again.");
        return;
      }
      onComplete(data);
    } catch (err) {
      console.error(err);
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setActivity("idle");
    }
  };

  const summary = <OrderSummary cartItems={cartItems} subtotal={subtotal} discount={discount} total={total} />;

  const methodOption = (value: "card" | "paypal", title: string, icon: React.ReactNode) => (
    <label
      className={`flex items-center space-x-3 px-4 h-14 rounded-lg border cursor-pointer transition-colors duration-150 ${
        method === value ? "border-clay-ochre bg-clay-ochre/10" : "border-spruce-200 bg-spruce-50 hover:border-spruce-400"
      }`}
    >
      <input type="radio" name="payment-method" value={value} checked={method === value} onChange={() => setMethod(value)} disabled={busy} className="w-4 h-4 accent-clay-ochre" />
      <span className="flex-1 text-base font-medium text-spruce-950">{title}</span>
      {icon}
    </label>
  );

  return (
    <div className="relative flex-1 min-h-0">
      <div className="h-full overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* Order summary: folded away above the form on a phone, a column of its own on a desktop. */}
        <details className="lg:hidden group border-b border-spruce-200 bg-spruce-50">
          <summary className="flex items-center justify-between px-5 sm:px-8 h-14 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center text-sm font-medium text-clay-accent">
              Order summary
              <ChevronDown className="w-4 h-4 ml-1.5 transition-transform duration-200 group-open:rotate-180" />
            </span>
            <span className="text-base font-semibold text-spruce-950 tabular-nums">{formatMoney(total)}</span>
          </summary>
          <div className="px-5 sm:px-8 pt-3 pb-6">{summary}</div>
        </details>

        <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="lg:overflow-y-auto px-5 sm:px-8 lg:px-12 py-8 lg:py-10">
          <div className="max-w-xl mx-auto space-y-10">
            <button type="button" onClick={onBack} disabled={busy} className="cursor-pointer flex items-center text-sm text-spruce-600 hover:text-spruce-950 disabled:cursor-not-allowed transition-colors duration-150">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to cart
            </button>

            <section className="space-y-4">
              <h4 className="font-serif text-xl font-semibold text-spruce-950">Contact</h4>
              <Field label="Email" type="email" name="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={customer.email} onChange={set} />
              <p className="text-[13px] text-spruce-600 -mt-1">Your order confirmation goes here.</p>
            </section>

            <section className="space-y-4">
              <h4 className="font-serif text-xl font-semibold text-spruce-950">Shipping address</h4>
              <label className="block">
                <span className={LABEL}>Country / region</span>
                <div className="relative">
                  <select name="countryCode" autoComplete="shipping country" required value={customer.countryCode} onChange={set} className={`${FIELD} appearance-none pr-10 cursor-pointer`}>
                    <option value="" disabled>
                      Select a country
                    </option>
                    {countries().map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-spruce-600 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </label>
              <Field label="Full name" name="name" autoComplete="shipping name" value={customer.name} onChange={set} />
              <Field label="Address" name="address" autoComplete="shipping address-line1" placeholder="Street and house number" value={customer.address} onChange={set} />
              <Field label="Apartment, suite, etc." optional name="address2" autoComplete="shipping address-line2" value={customer.address2} onChange={set} />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="City" className="col-span-2 sm:col-span-1" name="city" autoComplete="shipping address-level2" value={customer.city} onChange={set} />
                <Field label="State / province" optional name="region" autoComplete="shipping address-level1" value={customer.region} onChange={set} />
                <Field label="Postal code" name="postalCode" autoComplete="shipping postal-code" autoCapitalize="characters" value={customer.postalCode} onChange={set} />
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h4 className="font-serif text-xl font-semibold text-spruce-950">Payment</h4>
                {payNow && <p className="text-[13px] text-spruce-600 mt-1">All payments are encrypted. Your card details never reach our servers.</p>}
              </div>

              {!config && (
                <div className="flex items-center space-x-2.5 text-sm text-spruce-600 h-14">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading payment options...</span>
                </div>
              )}

              {cardEnabled && paypalEnabled && (
                <div role="radiogroup" aria-label="Payment method" className="grid sm:grid-cols-2 gap-3">
                  {methodOption("card", "Card", <CreditCard className="w-5 h-5 text-spruce-600" />)}
                  {methodOption("paypal", "PayPal", <Wallet className="w-5 h-5 text-spruce-600" />)}
                </div>
              )}

              {error && (
                <div ref={showError} role="alert" className="p-4 border border-red-500/40 bg-red-500/10 rounded-lg text-sm text-red-200 leading-relaxed">
                  {error}
                </div>
              )}

              {cardEnabled && config && (
                // Kept mounted while PayPal is selected, so a typed card number is not lost.
                <div className={method === "card" ? "pt-1" : "hidden"}>
                  <StripeCardForm
                    publishableKey={config.stripe.publishableKey}
                    amount={total}
                    currency={config.stripe.currency}
                    billing={{ name: customer.name, email: customer.email, postalCode: customer.postalCode, countryCode: customer.countryCode }}
                    disabled={busy}
                    beforePay={validate}
                    startPayment={startCard}
                    confirmOrder={async (id) => void (await confirm("stripe", id))}
                    onError={setError}
                    onActivity={setActivity}
                  />
                </div>
              )}

              {paypalEnabled && config && method === "paypal" && (
                <div className="space-y-3 pt-1">
                  <p className="text-sm text-spruce-700 leading-relaxed">
                    PayPal opens in its own secure window. When you've approved the payment there, your order is confirmed here.
                  </p>
                  <PayPalButton
                    clientId={config.paypal.clientId}
                    currency={config.paypal.currency}
                    beforePay={validate}
                    startPayment={async () => (await start("paypal")).paymentId}
                    confirmOrder={(id) => confirm("paypal", id)}
                    onError={setError}
                    onActivity={setActivity}
                  />
                </div>
              )}

              {/* No way to pay online is set up: ordering by invoice is the checkout. */}
              {config && !payNow && (
                <div className="space-y-5">
                  <div className="p-4 bg-spruce-50 border border-spruce-200 rounded-lg text-sm text-spruce-700 leading-relaxed flex items-start space-x-3">
                    <ShieldCheck className="w-5 h-5 text-clay-ochre flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-spruce-950">No payment is taken now.</strong> After you place your order we'll email you an invoice for {formatMoney(total)} USD. Your order is confirmed once that invoice is paid.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={placeInvoiceOrder}
                    disabled={busy}
                    className="cursor-pointer w-full h-14 bg-clay-ochre text-clay-ink hover:bg-white disabled:bg-spruce-200 disabled:text-spruce-400 font-semibold text-base rounded-full transition-colors duration-200 shadow-md"
                  >
                    {activity === "invoice" ? "Placing order..." : "Place order"}
                  </button>
                </div>
              )}
            </section>

          </div>
        </form>

        <aside className="hidden lg:block lg:overflow-y-auto bg-spruce-50 border-l border-spruce-200 px-10 py-10">
          <h4 className="font-serif text-xl font-semibold text-spruce-950 mb-6">Order summary</h4>
          {summary}
        </aside>
      </div>

      {/* The money has moved and the order is being recorded: nothing else may be clicked. */}
      {activity === "confirming" && (
        <div role="status" aria-live="assertive" className="absolute inset-0 z-10 bg-alabaster-pearl/90 backdrop-blur-xs flex flex-col items-center justify-center text-center px-8">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-[3px] border-spruce-200 border-t-clay-ochre animate-spin" />
            <Lock className="absolute inset-0 m-auto w-5 h-5 text-clay-ochre" />
          </div>
          <h4 className="font-serif text-2xl font-bold text-spruce-950 mt-6">Confirming your payment</h4>
          <p className="text-base text-spruce-700 mt-2 max-w-sm leading-relaxed">Almost done. Please keep this page open.</p>
        </div>
      )}
    </div>
  );
}
