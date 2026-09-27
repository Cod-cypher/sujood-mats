/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// The two ways to pay inside the checkout:
// - StripeCardForm: Stripe's Payment Element, embedded in the page. Card details (and Apple
//   Pay / Google Pay) go straight from the browser to Stripe; we only ever see the result.
// - PayPalButton: PayPal's own button, which opens PayPal's own window.
// Both scripts must come from the provider itself, so they are loaded on demand rather than
// bundled, and only once the buyer reaches the checkout.

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { formatMoney } from "../format";

export type PaymentProvider = "paypal" | "stripe";
export const PROVIDER_NAME: Record<PaymentProvider, string> = { paypal: "PayPal", stripe: "Stripe" };

/** What the buyer is waiting for, so the checkout can say so. */
export type PaymentActivity = "idle" | "paying" | "confirming";

// ---------------------------------------------------------------------------
// Script loading
// ---------------------------------------------------------------------------

const scripts = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = scripts.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error(`Could not load ${new URL(src).hostname}.`));
    };
    document.head.appendChild(script);
  });
  // A failed load (offline, blocker) must not poison later attempts.
  promise.catch(() => scripts.delete(src));
  scripts.set(src, promise);
  return promise;
}

async function loadStripe(publishableKey: string): Promise<any> {
  await loadScript("https://js.stripe.com/v3/");
  const Stripe = (window as any).Stripe;
  if (typeof Stripe !== "function") throw new Error("Stripe did not load.");
  return Stripe(publishableKey);
}

async function loadPayPal(clientId: string, currency: string): Promise<any> {
  const params = new URLSearchParams({ "client-id": clientId, currency, intent: "capture", components: "buttons" });
  await loadScript(`https://www.paypal.com/sdk/js?${params}`);
  const paypal = (window as any).paypal;
  if (!paypal?.Buttons) throw new Error("PayPal did not load.");
  return paypal;
}

const LoadFailed = ({ name }: { name: string }) => (
  <p role="alert" className="text-sm text-spruce-700 leading-relaxed p-4 border border-spruce-200 rounded-lg bg-spruce-50">
    {name} couldn't be loaded. An ad or tracker blocker can cause this: please pause it for this site and reload, or choose another way to pay.
  </p>
);

const Loading = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center space-x-2.5 text-sm text-spruce-600 h-14">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span>{label}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Card (Stripe Payment Element)
// ---------------------------------------------------------------------------

// Stripe draws its form in its own frame, so the theme is handed over as values.
const STRIPE_APPEARANCE = {
  theme: "night",
  variables: {
    colorPrimary: "#C5A27D",
    colorBackground: "#121715",
    colorText: "#F5F5F0",
    colorTextSecondary: "#9AA8A4",
    colorTextPlaceholder: "#5F6F6A",
    colorDanger: "#FCA5A5",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSizeBase: "16px",
    borderRadius: "8px",
    spacingUnit: "4px",
    gridRowSpacing: "16px",
  },
  rules: {
    ".Input": { border: "1px solid #252D2B", boxShadow: "none", padding: "13px 14px" },
    ".Input:focus": { border: "1px solid #C5A27D", boxShadow: "0 0 0 1px #C5A27D" },
    ".Label": { fontSize: "13px", fontWeight: "500", color: "#C8D4D0", marginBottom: "6px" },
    ".Tab": { border: "1px solid #252D2B", boxShadow: "none" },
    ".Tab--selected": { border: "1px solid #C5A27D", boxShadow: "0 0 0 1px #C5A27D" },
    ".Error": { fontSize: "13px" },
  },
};

export interface BillingDefaults {
  name: string;
  email: string;
  postalCode: string;
  countryCode: string;
}

interface StripeCardFormProps {
  publishableKey: string;
  /** In dollars. Must equal what the server charges, or Stripe refuses the payment. */
  amount: number;
  currency: string;
  /** Prefills Stripe's own fields from the shipping form. Read once, when the form loads. */
  billing: BillingDefaults;
  disabled?: boolean;
  /** Checked on click, before anything is charged. Return false to stop (e.g. invalid form). */
  beforePay: () => boolean;
  /** Creates (or reuses) the payment on our server. */
  startPayment: () => Promise<{ paymentId: string; clientSecret: string }>;
  /** Tells our server the payment went through. Throws with a message for the buyer if not. */
  confirmOrder: (paymentId: string) => Promise<void>;
  onError: (message: string | null) => void;
  onActivity: (activity: PaymentActivity) => void;
}

export function StripeCardForm(props: StripeCardFormProps) {
  const { publishableKey, amount, currency, disabled } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [activity, setActivity] = useState<PaymentActivity>("idle");

  // pay() outlives renders while it awaits, so it reads the latest of everything here.
  const latest = useRef(props);
  latest.current = props;

  const cents = Math.round(amount * 100);

  useEffect(() => {
    let cancelled = false;
    let element: any;
    loadStripe(publishableKey)
      .then((stripe) => {
        if (cancelled || !containerRef.current) return;
        const { billing } = latest.current;
        const elements = stripe.elements({
          // No payment exists yet: it is created on our server only when the buyer clicks Pay.
          mode: "payment",
          amount: Math.round(latest.current.amount * 100),
          currency: currency.toLowerCase(),
          paymentMethodTypes: ["card"],
          appearance: STRIPE_APPEARANCE,
          // Stripe only fetches fonts over https, so on plain-http localhost its form
          // falls back to the system font.
          fonts: window.location.protocol === "https:" ? [{ family: "Inter", src: `url(${window.location.origin}/fonts/inter-latin.woff2)`, weight: "300 700" }] : [],
        });
        element = elements.create("payment", {
          layout: "tabs",
          // Without this Stripe adds its own "save my information" sign-up (three more
          // fields) under the card. Apple Pay and Google Pay are unaffected.
          wallets: { link: "never" },
          defaultValues: {
            billingDetails: { name: billing.name, email: billing.email, address: { postal_code: billing.postalCode, country: billing.countryCode } },
          },
        });
        element.on("ready", () => !cancelled && setStatus("ready"));
        element.on("loaderror", () => !cancelled && setStatus("failed"));
        element.mount(containerRef.current);
        stripeRef.current = stripe;
        elementsRef.current = elements;
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setStatus("failed");
      });
    return () => {
      cancelled = true;
      try {
        element?.destroy();
      } catch {
        /* already gone */
      }
      stripeRef.current = null;
      elementsRef.current = null;
    };
  }, [publishableKey, currency]);

  // The cart can change while the form is open (another tab, a removed item).
  useEffect(() => {
    if (status === "ready" && cents > 0) elementsRef.current?.update({ amount: cents });
  }, [cents, status]);

  const report = (next: PaymentActivity) => {
    setActivity(next);
    latest.current.onActivity(next);
  };

  const pay = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements || activity !== "idle") return;
    const { beforePay, startPayment, confirmOrder, onError } = latest.current;
    onError(null);
    if (!beforePay()) return;

    report("paying");
    try {
      // Stripe checks its own fields and shows what is wrong next to each one.
      const { error: invalid } = await elements.submit();
      if (invalid) {
        if (invalid.type !== "validation_error") onError(invalid.message ?? "Please check your card details.");
        return;
      }

      const { clientSecret } = await startPayment();
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        // Only used if the buyer's bank insists on a full-page check; normally that
        // happens in a dialog on this page and the buyer never leaves.
        confirmParams: { return_url: `${window.location.origin}/stripe/return` },
        redirect: "if_required",
      });

      // An error that carries a succeeded payment is a retry of one that already went through.
      const intent = result.paymentIntent ?? result.error?.payment_intent;
      if (intent?.status === "succeeded" || intent?.status === "processing") {
        report("confirming");
        await confirmOrder(intent.id);
        return;
      }
      onError(result.error?.message ?? "Your payment was not completed and you have not been charged. Please try again.");
    } catch (err) {
      console.error(err);
      onError(err instanceof Error && err.message ? err.message : "Something went wrong taking your payment. Please try again.");
    } finally {
      report("idle");
    }
  };

  return (
    <div className="space-y-5">
      {status === "failed" && <LoadFailed name="The card form" />}
      {/* The form is laid out while it loads (it measures itself), just not shown yet. */}
      <div className={status === "failed" ? "hidden" : "relative min-h-14"}>
        {status === "loading" && (
          <div className="absolute inset-0">
            <Loading label="Loading secure card form..." />
          </div>
        )}
        <div ref={containerRef} className={status === "ready" ? "" : "opacity-0"} />
      </div>
      {status !== "failed" && (
        <button
          type="button"
          onClick={pay}
          disabled={disabled || status !== "ready" || activity !== "idle"}
          className="cursor-pointer w-full h-14 bg-clay-ochre text-clay-ink hover:bg-white disabled:bg-spruce-200 disabled:text-spruce-400 disabled:cursor-not-allowed font-semibold text-base rounded-full transition-colors duration-200 shadow-md flex items-center justify-center space-x-2.5"
        >
          {activity === "idle" ? (
            <>
              <Lock className="w-4 h-4" />
              <span>Pay {formatMoney(amount)}</span>
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{activity === "paying" ? "Processing..." : "Confirming..."}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PayPal (PayPal's own button)
// ---------------------------------------------------------------------------

interface PayPalButtonProps {
  clientId: string;
  currency: string;
  /** Checked on click, before PayPal opens. Return false to stop (e.g. invalid form). */
  beforePay: () => boolean;
  /** Creates the order on our server and resolves with PayPal's id for it. */
  startPayment: () => Promise<string>;
  /** Takes the approved payment. "restart" reopens PayPal (payment method declined). Throws otherwise. */
  confirmOrder: (paymentId: string) => Promise<"done" | "restart">;
  onError: (message: string | null) => void;
  onActivity: (activity: PaymentActivity) => void;
}

export function PayPalButton(props: PayPalButtonProps) {
  const { clientId, currency } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  // The button is rendered once, but must always call the latest handlers (they close over
  // the form values, which change on every keystroke).
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    let cancelled = false;
    let buttons: any;
    // Set when one of our own handlers already told the buyer what went wrong, so PayPal's
    // generic onError (which fires as well) does not overwrite it.
    let explained = false;

    loadPayPal(clientId, currency)
      .then((paypal) => {
        if (cancelled || !containerRef.current) return;
        buttons = paypal.Buttons({
          fundingSource: paypal.FUNDING.PAYPAL,
          style: { layout: "horizontal", color: "gold", shape: "pill", label: "paypal", height: 55, tagline: false },
          onClick: (_data: unknown, actions: any) => {
            explained = false;
            latest.current.onError(null);
            return latest.current.beforePay() ? actions.resolve() : actions.reject();
          },
          createOrder: async () => {
            try {
              return await latest.current.startPayment();
            } catch (err) {
              explained = true;
              latest.current.onError(err instanceof Error && err.message ? err.message : "We couldn't start your PayPal payment. Please try again.");
              throw err; // tells PayPal to close its window
            }
          },
          onApprove: async (data: { orderID: string }, actions: any) => {
            latest.current.onActivity("confirming");
            try {
              if ((await latest.current.confirmOrder(data.orderID)) === "restart") return actions.restart();
            } catch (err) {
              explained = true;
              latest.current.onError(err instanceof Error && err.message ? err.message : "We couldn't confirm your payment. Please don't pay again: email us and we'll check it.");
            } finally {
              latest.current.onActivity("idle");
            }
          },
          onError: (err: unknown) => {
            console.error("PayPal error:", err);
            if (!explained) latest.current.onError("Something went wrong with PayPal and you have not been charged. Please try again.");
          },
        });
        if (!buttons.isEligible()) throw new Error("PayPal is not available for this purchase.");
        return buttons.render(containerRef.current).then(() => !cancelled && setStatus("ready"));
      })
      .catch((err) => {
        // render() also rejects when the container is removed mid-render (checkout closed).
        if (cancelled) return;
        console.error(err);
        setStatus("failed");
      });

    return () => {
      cancelled = true;
      buttons?.close?.().catch(() => {});
    };
  }, [clientId, currency]);

  return (
    <div>
      {status === "failed" && <LoadFailed name="PayPal" />}
      {/* PayPal sizes its button to this box, so the box is laid out while the button loads. */}
      <div className={status === "failed" ? "hidden" : "relative min-h-14"}>
        {status === "loading" && (
          <div className="absolute inset-0">
            <Loading label="Loading PayPal..." />
          </div>
        )}
        <div ref={containerRef} className={status === "ready" ? "" : "opacity-0"} />
      </div>
    </div>
  );
}
