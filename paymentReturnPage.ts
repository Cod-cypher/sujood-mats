/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// The page PayPal / Stripe send the buyer to (GET /paypal/return, GET /stripe/return) when
// paying took them away from the checkout, after they pay (?token=<PayPal order id> /
// ?payment_intent=<Stripe PaymentIntent id>) or give up (?cancelled=1).
//
// Normally the cart that opened the window is waiting: this page tells it the outcome
// (BroadcastChannel, plus window.opener for a cart on another origin), the cart answers
// with an ack and takes over, and the window closes. If nothing acks (the shop tab was
// closed or reloaded meanwhile), an approved payment must not be left hanging, so this page
// confirms it itself and shows the result. Confirming twice is safe: the server ignores the
// repeat. Only the provider is rendered server-side; the script reads the ids from the URL.

export type ReturnProvider = "paypal" | "stripe";
export const PAYMENT_CHANNEL = "sujood-payment";
// Must match CART_STORAGE_KEY in src/App.tsx and CART_KEY in src/analytics.ts.
const CART_STORAGE_KEYS = ["sujood-cart-v1", "sujood_cart_id"];

export function renderPaymentReturnPage(provider: ReturnProvider): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Sujood Mats: payment</title>
<style>
  html, body { height: 100%; margin: 0; }
  body { background: #0D1110; color: #E5E5E0; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; text-align: center; }
  main { max-width: 360px; padding: 32px 24px; }
  .brand { font-family: Georgia, serif; letter-spacing: 0.3em; font-size: 14px; color: #C5A27D; margin-bottom: 32px; }
  .spinner { width: 44px; height: 44px; margin: 0 auto 24px; border-radius: 50%; border: 3px solid #252D2B; border-top-color: #C5A27D; animation: spin 0.9s linear infinite; }
  .done .spinner { display: none; }
  h1 { font-family: Georgia, serif; font-size: 22px; font-weight: 700; color: #F5F5F0; margin: 0 0 12px; }
  p { font-size: 14px; line-height: 1.6; color: #C8D4D0; margin: 0 0 10px; }
  .ref { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; letter-spacing: 0.08em; color: #9AA8A4; }
  a.button { display: inline-block; margin-top: 18px; padding: 12px 28px; border-radius: 999px; background: #C5A27D; color: #0D1110; font-size: 14px; font-weight: 600; text-decoration: none; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2.5s; } }
</style>
</head>
<body>
<main id="box" aria-live="polite">
  <div class="brand">SUJOOD</div>
  <div class="spinner" role="presentation"></div>
  <h1 id="title">Finishing up...</h1>
  <p id="text">One moment while we hand you back to Sujood Mats.</p>
  <p id="ref" class="ref"></p>
  <a id="back" class="button" href="/" hidden>Return to Sujood Mats</a>
</main>
<script>
(function () {
  var PROVIDER = ${JSON.stringify(provider)};
  var PROVIDER_NAME = ${JSON.stringify(provider === "stripe" ? "Stripe" : "PayPal")};
  var CHANNEL = ${JSON.stringify(PAYMENT_CHANNEL)};
  var CART_KEYS = ${JSON.stringify(CART_STORAGE_KEYS)};
  var params = new URLSearchParams(location.search);
  var id = PROVIDER === "stripe" ? params.get("payment_intent") : params.get("token");
  var cancelled = params.has("cancelled") || !id;
  var acked = false;

  function show(title, text, opts) {
    opts = opts || {};
    document.getElementById("title").textContent = title;
    document.getElementById("text").textContent = text;
    document.getElementById("ref").textContent = opts.ref || "";
    document.getElementById("back").hidden = !opts.back;
    document.getElementById("box").className = opts.busy ? "" : "done";
  }

  // The cart has taken over: this window's job is done.
  function handOver(title) {
    show(title, "Returning you to Sujood Mats...", { busy: true });
    window.close();
    // Only reached if the browser refused to close a window the cart did not open.
    setTimeout(function () { show(title, "You can close this window and return to Sujood Mats."); }, 1200);
  }

  function onAck(data) {
    if (acked || !data || data.type !== "sujood-payment-ack" || data.paymentId !== id) return;
    acked = true;
    handOver(cancelled ? "Payment cancelled" : "Payment approved");
  }

  var message = { type: "sujood-payment", provider: PROVIDER, status: cancelled ? "cancelled" : "approved", paymentId: id };
  window.addEventListener("message", function (e) { onAck(e.data); });
  try {
    var channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = function (e) { onAck(e.data); };
    channel.postMessage(message);
  } catch (e) { /* older browser: window.opener below still works */ }
  // "*" is fine: the message holds nothing secret, and the cart re-checks everything with the server.
  try { if (window.opener) window.opener.postMessage(message, "*"); } catch (e) {}

  if (cancelled) {
    setTimeout(function () {
      if (acked) return;
      show("Payment cancelled", "You have not been charged. Your cart is still saved.", { back: true });
    }, 1500);
    return;
  }

  // No cart answered: complete the payment here.
  setTimeout(function () {
    if (acked) return;
    show("Confirming your payment...", "Please don't close this window.", { busy: true });
    fetch("/api/payments/" + PROVIDER + "/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: id })
    })
      .then(function (r) { return r.json().catch(function () { return null; }).then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (acked) return;
        var d = res.data || {};
        if (res.ok && d.orderId) {
          try { CART_KEYS.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
          if (d.paymentState === "paid") show("Payment received", "Thank you. Your order is confirmed and a confirmation is on its way to " + d.email + ".", { ref: "ORDER " + d.orderId, back: true });
          else show("Order received", PROVIDER_NAME + " is still processing your payment. We'll email " + d.email + " as soon as it clears. You don't need to pay again.", { ref: "ORDER " + d.orderId, back: true });
        } else {
          show("We couldn't confirm your payment", d.error || "Please don't pay again. Email us and we'll check it for you.", { back: true });
        }
      })
      .catch(function () {
        if (acked) return;
        show("We couldn't confirm your payment", "We lost the connection. Please don't pay again: reload this page to retry, or email us and we'll check it.", { back: true });
      });
  }, 2500);
})();
</script>
</body>
</html>`;
}
