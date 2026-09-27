/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Order emails over SMTP. Two kinds of order:
// - Invoice: checkout took no payment, so the customer email says plainly that the order is
//   NOT confirmed until the invoice (sent separately, by hand) is paid, and the internal
//   email tells sales an invoice is needed.
// - Paid online (PayPal or Stripe): `payment` is set. The customer gets a confirmation, and
//   sales is told the money is in (or, for "processing", to check the provider before shipping).
//
// Env: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SALES_EMAIL, SALES_PASSWORD.
// Optional: ORDER_NOTIFY_TO (default below) and ORDER_NOTIFY_CC (no default), both
// comma-separated. Personal addresses belong in .env, not here: this repo is public.

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const DEFAULT_NOTIFY_TO = "sales@sujoodmats.com";

export interface OrderEmailItem {
  name: string;
  colorway: string;
  price: number;
  quantity: number;
}

export interface OrderEmailData {
  orderId: string;
  placedAt: Date;
  customer: {
    name: string;
    email: string;
    address: string;
    city: string;
    region?: string;
    postalCode: string;
    country: string;
  };
  items: OrderEmailItem[];
  subtotal: number;
  discount: number;
  total: number;
  ipAddress?: string;
  /** Set when the order was paid online at checkout. Omitted for invoice orders. */
  payment?: {
    provider: "paypal" | "stripe";
    /** PayPal capture id / Stripe PaymentIntent id. */
    captureId: string | null;
    /** "paid" = money received. "processing" = the provider is still reviewing the payment. */
    state: "paid" | "processing";
  };
}

let transporter: Transporter | null | undefined;

/** Lazily built so a missing config only disables email instead of crashing startup. */
function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SALES_EMAIL, SALES_PASSWORD } = process.env;
  if (!SMTP_HOST || !SALES_EMAIL || !SALES_PASSWORD) {
    console.warn("[mailer] SMTP_HOST / SALES_EMAIL / SALES_PASSWORD not set: order emails are disabled.");
    transporter = null;
    return transporter;
  }
  const port = Number(SMTP_PORT) || 465;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: SMTP_SECURE ? SMTP_SECURE.trim().toLowerCase() === "true" : port === 465,
    auth: { user: SALES_EMAIL, pass: SALES_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

/** Checks the SMTP login without sending anything. */
export async function verifyMailer(): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  await t.verify();
  return true;
}

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (n: number) => `$${n.toFixed(2)}`;
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const list = (v: string | undefined, fallback: string) =>
  (v ?? fallback).split(",").map((s) => s.trim()).filter(Boolean);

/** How the provider is named to people. */
const providerName = (o: OrderEmailData) => (o.payment?.provider === "stripe" ? "Stripe" : "PayPal");
/** What the customer did, in their words: "PayPal payment" or "card payment". */
const paymentNoun = (o: OrderEmailData) => (o.payment?.provider === "stripe" ? "card payment" : "PayPal payment");

const totalLabel = (o: OrderEmailData) =>
  !o.payment ? "Total due on invoice" : o.payment.state === "paid" ? "Total paid" : "Total (payment processing)";

function itemsTable(o: OrderEmailData): string {
  const cell = "padding:10px 0;border-bottom:1px solid #e8e6df;font-size:14px;";
  const rows = o.items
    .map(
      (i) => `<tr>
        <td style="${cell}"><strong>${esc(i.name)}</strong><br /><span style="color:#6b756f;font-size:12px;">Colour: ${esc(i.colorway)} &middot; Qty ${i.quantity}</span></td>
        <td style="${cell}text-align:right;white-space:nowrap;">${money(i.price * i.quantity)}</td>
      </tr>`
    )
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:6px 0;font-size:14px;${bold ? "font-weight:700;" : "color:#6b756f;"}">${label}</td><td style="padding:6px 0;font-size:14px;text-align:right;${bold ? "font-weight:700;" : "color:#6b756f;"}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows}
      ${line("Subtotal", money(o.subtotal))}
      ${o.discount > 0 ? line("Bundle discount", `-${money(o.discount)}`) : ""}
      ${line("Shipping", "Free")}
      ${line(totalLabel(o), `${money(o.total)} USD`, true)}
    </table>`;
}

function itemsText(o: OrderEmailData): string {
  return [
    ...o.items.map((i) => `- ${i.name} (${i.colorway}) x ${i.quantity}: ${money(i.price * i.quantity)}`),
    `Subtotal: ${money(o.subtotal)}`,
    ...(o.discount > 0 ? [`Bundle discount: -${money(o.discount)}`] : []),
    "Shipping: Free",
    `${totalLabel(o)}: ${money(o.total)} USD`,
  ].join("\n");
}

const addressLines = (o: OrderEmailData) =>
  [
    o.customer.name,
    o.customer.address,
    `${[o.customer.city, o.customer.region].filter(Boolean).join(", ")} ${o.customer.postalCode}`.trim(),
    o.customer.country,
  ].filter(Boolean);

const shell = (body: string) => `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0d1110;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e6df;border-radius:12px;">
          <tr><td style="padding:24px 28px;border-bottom:1px solid #e8e6df;font-family:Georgia,serif;font-size:18px;font-weight:700;letter-spacing:0.2em;">SUJOOD</td></tr>
          <tr><td style="padding:28px;">${body}</td></tr>
        </table>
        <p style="font-size:12px;color:#6b756f;margin:16px 0 0;">Sujood Mats &middot; <a href="https://sujoodmats.com/" style="color:#6b756f;">sujoodmats.com</a></p>
      </td></tr>
    </table>
  </body>
</html>`;

/** Customer email for an order paid online at checkout. */
function renderPaidCustomerEmail(o: OrderEmailData, firstName: string) {
  const paid = o.payment?.state === "paid";
  const heading = paid ? "Your order is confirmed" : "We've received your order";
  const noticeTitle = paid ? "Payment received." : "Your payment is still processing.";
  const notice = paid
    ? `We've received your ${paymentNoun(o)} of ${money(o.total)} USD. There is nothing more you need to do.`
    : `${providerName(o)} is still reviewing your payment of ${money(o.total)} USD. We'll email you as soon as it clears, and your order is confirmed at that point. You don't need to pay again.`;
  const next = paid
    ? "We're now preparing your order for shipping. If we need anything from you, we'll write to this address."
    : `Once ${providerName(o)} clears the payment, we'll prepare your order for shipping.`;
  const reference = o.payment?.captureId ? `${providerName(o)} transaction ${o.payment.captureId}` : "";
  const noticeStyle = paid ? "background:#eef6f0;border:1px solid #a9cdb4;" : "background:#fdf6ec;border:1px solid #e6c99f;";

  const html = shell(`
    <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 6px;">${heading}</h1>
    <p style="font-size:13px;color:#6b756f;margin:0 0 20px;">Order ${esc(o.orderId)}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Hi ${esc(firstName)}, thank you for ordering from Sujood Mats.</p>

    <div style="${noticeStyle}border-radius:10px;padding:16px 18px;margin:0 0 22px;">
      <p style="font-size:15px;font-weight:700;margin:0 0 8px;">${noticeTitle}</p>
      <p style="font-size:14px;line-height:1.6;margin:0;">${esc(notice)}</p>
    </div>

    <p style="font-size:14px;line-height:1.6;margin:0 0 8px;">${esc(next)}</p>
    <p style="font-size:13px;line-height:1.6;color:#6b756f;margin:0 0 24px;">${esc(reference)}</p>

    <h2 style="font-size:15px;margin:0 0 4px;">Order summary</h2>
    ${itemsTable(o)}

    <h2 style="font-size:15px;margin:24px 0 6px;">Shipping to</h2>
    <p style="font-size:14px;line-height:1.6;margin:0 0 24px;">${addressLines(o).map(esc).join("<br />")}</p>

    <p style="font-size:14px;line-height:1.6;margin:0;">Questions, or need to change something? Just reply to this email.</p>
  `);

  const text = [
    `${heading}: ${o.orderId}`,
    "",
    `Hi ${firstName}, thank you for ordering from Sujood Mats.`,
    "",
    noticeTitle.toUpperCase(),
    notice,
    "",
    next,
    ...(reference ? [reference] : []),
    "",
    "Order summary",
    itemsText(o),
    "",
    "Shipping to",
    ...addressLines(o),
    "",
    "Questions, or need to change something? Just reply to this email.",
    "",
    "Sujood Mats - https://sujoodmats.com/",
  ].join("\n");

  const subject = paid
    ? `Your Sujood Mats order ${o.orderId} is confirmed`
    : `We've received your order ${o.orderId} (payment processing)`;
  return { subject, html, text };
}

export function renderCustomerEmail(o: OrderEmailData, salesEmail: string) {
  const firstName = o.customer.name.trim().split(/\s+/)[0] || "there";
  if (o.payment) return renderPaidCustomerEmail(o, firstName);
  const html = shell(`
    <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 6px;">We've received your order</h1>
    <p style="font-size:13px;color:#6b756f;margin:0 0 20px;">Order ${esc(o.orderId)}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Hi ${esc(firstName)}, thank you for ordering from Sujood Mats.</p>

    <div style="background:#fdf6ec;border:1px solid #e6c99f;border-radius:10px;padding:16px 18px;margin:0 0 22px;">
      <p style="font-size:15px;font-weight:700;margin:0 0 8px;">Your order is not confirmed yet.</p>
      <p style="font-size:14px;line-height:1.6;margin:0;">No payment has been taken. Your order is confirmed only once your invoice has been paid.</p>
    </div>

    <h2 style="font-size:15px;margin:0 0 10px;">What happens next</h2>
    <ol style="font-size:14px;line-height:1.7;margin:0 0 22px;padding-left:20px;">
      <li>We'll send you a second email with an <strong>invoice for ${money(o.total)} USD</strong>.</li>
      <li>Pay the invoice using the instructions in that email.</li>
      <li>Once your payment is received, your order is confirmed and we prepare it for shipping.</li>
    </ol>
    <p style="font-size:13px;line-height:1.6;color:#6b756f;margin:0 0 24px;">The invoice will come from ${esc(salesEmail)}. Please don't send payment before you receive it.</p>

    <h2 style="font-size:15px;margin:0 0 4px;">Order summary</h2>
    ${itemsTable(o)}

    <h2 style="font-size:15px;margin:24px 0 6px;">Shipping to</h2>
    <p style="font-size:14px;line-height:1.6;margin:0 0 24px;">${addressLines(o).map(esc).join("<br />")}</p>

    <p style="font-size:14px;line-height:1.6;margin:0;">Questions, or need to change something? Just reply to this email.</p>
  `);

  const text = `We've received your order ${o.orderId}

Hi ${firstName}, thank you for ordering from Sujood Mats.

YOUR ORDER IS NOT CONFIRMED YET.
No payment has been taken. Your order is confirmed only once your invoice has been paid.

What happens next
1. We'll send you a second email with an invoice for ${money(o.total)} USD.
2. Pay the invoice using the instructions in that email.
3. Once your payment is received, your order is confirmed and we prepare it for shipping.

The invoice will come from ${salesEmail}. Please don't send payment before you receive it.

Order summary
${itemsText(o)}

Shipping to
${addressLines(o).join("\n")}

Questions, or need to change something? Just reply to this email.

Sujood Mats - https://sujoodmats.com/`;

  return { subject: `We've received your order ${o.orderId} (invoice to follow)`, html, text };
}

export function renderSalesEmail(o: OrderEmailData) {
  const placed = o.placedAt.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const via = providerName(o);
  const captureRef = o.payment?.captureId ? ` (${via} transaction ${o.payment.captureId})` : "";
  // What sales has to do about this order: the part that differs by payment route.
  const tag = !o.payment ? "invoice needed" : o.payment.state === "paid" ? `PAID via ${via}` : `${via} payment under review`;
  const title = `New order: ${tag}`;
  const action = !o.payment
    ? `Send ${o.customer.name} an invoice for ${money(o.total)} USD. They have been told the order is not confirmed until it is paid.`
    : o.payment.state === "paid"
      ? `${o.customer.name} paid ${money(o.total)} USD via ${via}${captureRef}. No invoice is needed: prepare the order for shipping.`
      : `${o.customer.name} paid ${money(o.total)} USD via ${via}${captureRef}, but ${via} is still reviewing the payment. DO NOT SHIP until it shows as completed in ${via}. The customer has been told it is processing.`;
  const html = shell(`
    <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 6px;">${title}</h1>
    <p style="font-size:13px;color:#6b756f;margin:0 0 20px;">Order ${esc(o.orderId)} &middot; ${esc(placed)}</p>

    <div style="background:#fdf6ec;border:1px solid #e6c99f;border-radius:10px;padding:14px 18px;margin:0 0 22px;font-size:14px;line-height:1.6;">
      ${esc(action)} Replying to this email replies to the customer.
    </div>

    <h2 style="font-size:15px;margin:0 0 6px;">Customer</h2>
    <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">${esc(o.customer.name)}<br /><a href="mailto:${esc(o.customer.email)}">${esc(o.customer.email)}</a></p>

    <h2 style="font-size:15px;margin:0 0 6px;">Ship to</h2>
    <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">${addressLines(o).map(esc).join("<br />")}</p>

    <h2 style="font-size:15px;margin:0 0 4px;">Items</h2>
    ${itemsTable(o)}

    <p style="font-size:12px;color:#6b756f;margin:24px 0 0;">Placed from IP ${esc(o.ipAddress ?? "unknown")}.</p>
  `);

  const text = `${title}
Order ${o.orderId} - ${placed}

${action} Replying to this email replies to the customer.

Customer
${o.customer.name}
${o.customer.email}

Ship to
${addressLines(o).join("\n")}

Items
${itemsText(o)}

Placed from IP ${o.ipAddress ?? "unknown"}.`;

  return { subject: oneLine(`New order ${o.orderId}: ${money(o.total)} from ${o.customer.name} (${tag})`), html, text };
}

/**
 * Sends both emails independently; a failure in one never blocks the other, and neither
 * throws (the order is already saved). Returns which ones went out.
 */
export async function sendOrderEmails(o: OrderEmailData): Promise<{ customer: boolean; sales: boolean }> {
  const t = getTransporter();
  if (!t) return { customer: false, sales: false };

  const salesEmail = process.env.SALES_EMAIL as string;
  const from = { name: "Sujood Mats", address: salesEmail };
  const customerMail = renderCustomerEmail(o, salesEmail);
  const salesMail = renderSalesEmail(o);

  const [customer, sales] = await Promise.allSettled([
    t.sendMail({ from, to: { name: oneLine(o.customer.name), address: o.customer.email }, replyTo: salesEmail, ...customerMail }),
    t.sendMail({
      from,
      to: list(process.env.ORDER_NOTIFY_TO, DEFAULT_NOTIFY_TO),
      cc: list(process.env.ORDER_NOTIFY_CC, ""),
      replyTo: { name: oneLine(o.customer.name), address: o.customer.email },
      ...salesMail,
    }),
  ]);

  // Log both outcomes: "accepted" means the SMTP server took the message, not that it was
  // delivered, so the server's response is kept for chasing a mail that never arrived.
  if (customer.status === "rejected") console.error(`[mailer] customer email failed for ${o.orderId}:`, customer.reason);
  else console.log(`[mailer] customer email for ${o.orderId} accepted for ${o.customer.email}: ${customer.value.response}`);
  if (sales.status === "rejected") console.error(`[mailer] SALES NOTIFICATION FAILED for ${o.orderId}, check the orders table:`, sales.reason);
  else console.log(`[mailer] sales email for ${o.orderId} accepted for ${[...sales.value.accepted].join(", ")}: ${sales.value.response}`);
  return { customer: customer.status === "fulfilled", sales: sales.status === "fulfilled" };
}
