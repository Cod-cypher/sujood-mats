/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrismaClient, Prisma } from "@prisma/client";

// Single Prisma client, reused across tsx hot-reloads in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
export interface SessionInput {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  locale?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export interface EventInput {
  sessionId?: string | null;
  eventType: string;
  productId?: string | null;
  productName?: string | null;
  colorway?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  value?: number | null;
  currency?: string | null;
  cartId?: string | null;
  orderId?: string | null;
  pageUrl?: string | null;
  metadata?: unknown;
}

export interface CartItemInput {
  productId?: string;
  name: string;
  colorway?: string;
  price: number;
  quantity: number;
  configuration?: unknown;
  imageUrl?: string;
}

export interface CartSyncInput {
  cartId: string;
  sessionId?: string | null;
  status?: "active" | "abandoned" | "converted";
  reachedCheckout?: boolean;
  items: CartItemInput[];
}

export interface CustomerInfo {
  name: string;
  email: string;
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface SaveOrderInput {
  orderId: string;
  sessionId?: string | null;
  cartId?: string | null;
  ipAddress?: string | null;
  customerInfo: CustomerInfo;
  cartItems: CartItemInput[];
  subtotal: number;
  discount: number;
  total: number;
  estimatedDelivery: string;
}

// JSON helper: Prisma wants Prisma.JsonNull (not JS null) to store SQL NULL.
const asJson = (v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  v == null ? Prisma.JsonNull : (v as Prisma.InputJsonValue);

// ---------------------------------------------------------------------------
// SESSIONS
// ---------------------------------------------------------------------------
export async function upsertSession(input: SessionInput): Promise<void> {
  // COALESCE semantics: only overwrite a field when a new value is provided.
  const merge = <T>(v: T | null | undefined) => (v == null ? undefined : v);
  const data = {
    ipAddress: merge(input.ipAddress),
    userAgent: merge(input.userAgent),
    deviceType: merge(input.deviceType),
    browser: merge(input.browser),
    os: merge(input.os),
    country: merge(input.country),
    region: merge(input.region),
    city: merge(input.city),
    latitude: merge(input.latitude),
    longitude: merge(input.longitude),
    timezone: merge(input.timezone),
    locale: merge(input.locale),
    referrer: merge(input.referrer),
    landingPage: merge(input.landingPage),
    utmSource: merge(input.utmSource),
    utmMedium: merge(input.utmMedium),
    utmCampaign: merge(input.utmCampaign),
  };
  await prisma.session.upsert({
    where: { id: input.id },
    create: { id: input.id, ...data },
    update: { ...data, lastSeenAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// EVENTS
// ---------------------------------------------------------------------------
export async function recordEvent(input: EventInput): Promise<void> {
  // Snapshot location from the session so geo queries don't need a join.
  let country: string | null = null;
  let city: string | null = null;
  if (input.sessionId) {
    const s = await prisma.session.findUnique({
      where: { id: input.sessionId },
      select: { country: true, city: true },
    });
    country = s?.country ?? null;
    city = s?.city ?? null;
  }
  await prisma.event.create({
    data: {
      sessionId: input.sessionId ?? null,
      eventType: input.eventType,
      productId: input.productId ?? null,
      productName: input.productName ?? null,
      colorway: input.colorway ?? null,
      quantity: input.quantity ?? null,
      unitPrice: input.unitPrice ?? null,
      value: input.value ?? null,
      currency: input.currency ?? "USD",
      cartId: input.cartId ?? null,
      orderId: input.orderId ?? null,
      pageUrl: input.pageUrl ?? null,
      country,
      city,
      metadata: asJson(input.metadata),
    },
  });
}

export async function recordEvents(events: EventInput[]): Promise<void> {
  for (const e of events) await recordEvent(e);
}

// ---------------------------------------------------------------------------
// CARTS
// ---------------------------------------------------------------------------
export async function syncCart(input: CartSyncInput): Promise<void> {
  const itemCount = input.items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = input.items.reduce((n, i) => n + i.price * i.quantity, 0);
  const status = input.status ?? "active";

  await prisma.$transaction(async (tx) => {
    const existing = await tx.cart.findUnique({
      where: { id: input.cartId },
      select: { reachedCheckout: true, abandonedAt: true },
    });
    const reachedCheckout = (existing?.reachedCheckout ?? false) || !!input.reachedCheckout;
    const abandonedAt =
      status === "abandoned" ? existing?.abandonedAt ?? new Date() : existing?.abandonedAt ?? null;

    await tx.cart.upsert({
      where: { id: input.cartId },
      create: {
        id: input.cartId,
        sessionId: input.sessionId ?? null,
        status,
        itemCount,
        subtotal,
        reachedCheckout,
        abandonedAt,
      },
      update: {
        sessionId: input.sessionId ?? undefined,
        status,
        itemCount,
        subtotal,
        reachedCheckout,
        abandonedAt,
      },
    });

    // Replace the item snapshot each sync so it mirrors the live cart.
    await tx.cartItem.deleteMany({ where: { cartId: input.cartId } });
    if (input.items.length > 0) {
      await tx.cartItem.createMany({
        data: input.items.map((item) => ({
          cartId: input.cartId,
          productId: item.productId ?? "custom",
          name: item.name,
          colorway: item.colorway ?? null,
          price: item.price,
          quantity: item.quantity,
          configuration: asJson(item.configuration),
          imageUrl: item.imageUrl ?? null,
        })),
      });
    }
  });
}

// Any 'active' cart untouched for `minutes` is treated as abandoned.
export async function markStaleCartsAbandoned(minutes = 30): Promise<number> {
  const cutoff = new Date(Date.now() - minutes * 60_000);
  const res = await prisma.cart.updateMany({
    where: { status: "active", itemCount: { gt: 0 }, updatedAt: { lte: cutoff } },
    data: { status: "abandoned", abandonedAt: new Date() },
  });
  return res.count;
}

// ---------------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------------
export async function saveOrder(input: SaveOrderInput): Promise<void> {
  const c = input.customerInfo;

  // Session location for the purchase event (read before the write txn).
  let country: string | null = null;
  let city: string | null = null;
  if (input.sessionId) {
    const s = await prisma.session.findUnique({
      where: { id: input.sessionId },
      select: { country: true, city: true },
    });
    country = s?.country ?? null;
    city = s?.city ?? null;
  }

  // Order + line items + cart conversion + purchase event: all-or-nothing.
  await prisma.$transaction(async (tx) => {
    await tx.order.create({
      data: {
        id: input.orderId,
        sessionId: input.sessionId ?? null,
        cartId: input.cartId ?? null,
        customerName: c.name,
        customerEmail: c.email,
        address: c.address ?? null,
        city: c.city ?? null,
        region: c.region ?? null,
        postalCode: c.postalCode ?? null,
        country: c.country ?? null,
        latitude: c.latitude ?? null,
        longitude: c.longitude ?? null,
        timezone: c.timezone ?? null,
        ipAddress: input.ipAddress ?? null,
        subtotal: input.subtotal,
        discount: input.discount,
        total: input.total,
        estimatedDelivery: input.estimatedDelivery,
        items: {
          create: input.cartItems.map((item) => ({
            productId: item.productId ?? "custom",
            name: item.name,
            colorway: item.colorway ?? null,
            price: item.price,
            quantity: item.quantity,
            configuration: asJson(item.configuration),
            imageUrl: item.imageUrl ?? null,
          })),
        },
      },
    });

    if (input.cartId) {
      // updateMany avoids throwing if the cart was never synced server-side.
      await tx.cart.updateMany({
        where: { id: input.cartId },
        data: { status: "converted", convertedOrderId: input.orderId, convertedAt: new Date() },
      });
    }

    await tx.event.create({
      data: {
        sessionId: input.sessionId ?? null,
        eventType: "purchase",
        value: input.total,
        cartId: input.cartId ?? null,
        orderId: input.orderId,
        country,
        city,
        metadata: { itemCount: input.cartItems.reduce((n, i) => n + i.quantity, 0) },
      },
    });
  });
}

export async function getOrder(orderId: string) {
  return prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
}

export async function listOrders(limit = 50) {
  return prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}

// ---------------------------------------------------------------------------
// ANALYTICS  — the queries that drive business decisions
// ---------------------------------------------------------------------------

// Distinct sessions that fired a given event type.
async function distinctSessions(eventType: string): Promise<number> {
  const rows = await prisma.event.findMany({
    where: { eventType, sessionId: { not: null } },
    distinct: ["sessionId"],
    select: { sessionId: true },
  });
  return rows.length;
}

// Headline numbers: traffic, revenue, conversion, abandonment.
export async function getOverview() {
  const [totalSessions, totalOrders, revenue, abandoned, sessionsWithAdd] = await Promise.all([
    prisma.session.count(),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { total: true }, _avg: { total: true } }),
    prisma.cart.aggregate({ where: { status: "abandoned" }, _count: { _all: true }, _sum: { subtotal: true } }),
    distinctSessions("add_to_cart"),
  ]);

  const abandonedCarts = abandoned._count._all;
  const conversionRate = totalSessions > 0 ? totalOrders / totalSessions : 0;
  const abandonmentDenom = abandonedCarts + totalOrders;
  const cartAbandonmentRate = abandonmentDenom > 0 ? abandonedCarts / abandonmentDenom : 0;

  return {
    total_sessions: totalSessions,
    total_orders: totalOrders,
    total_revenue: revenue._sum.total ?? 0,
    avg_order_value: revenue._avg.total ?? 0,
    abandoned_carts: abandonedCarts,
    abandoned_value: abandoned._sum.subtotal ?? 0,
    sessions_with_add_to_cart: sessionsWithAdd,
    conversion_rate: Number(conversionRate.toFixed(4)),
    cart_abandonment_rate: Number(cartAbandonmentRate.toFixed(4)),
  };
}

// The classic e-commerce funnel, counted in distinct sessions per stage.
export async function getFunnel() {
  const [visited, viewed_product, added_to_cart, began_checkout, purchased] = await Promise.all([
    prisma.session.count(),
    distinctSessions("product_view"),
    distinctSessions("add_to_cart"),
    distinctSessions("begin_checkout"),
    distinctSessions("purchase"),
  ]);
  return { visited, viewed_product, added_to_cart, began_checkout, purchased };
}

// Carts that were abandoned — with contents and the visitor's location.
export async function getAbandonedCarts(limit = 50) {
  const carts = await prisma.cart.findMany({
    where: { status: "abandoned", itemCount: { gt: 0 } },
    orderBy: { abandonedAt: "desc" },
    take: limit,
    include: {
      items: { select: { productId: true, name: true, colorway: true, price: true, quantity: true } },
      session: { select: { country: true, city: true, timezone: true, deviceType: true } },
    },
  });
  return carts.map((c) => ({
    id: c.id,
    subtotal: c.subtotal,
    item_count: c.itemCount,
    reached_checkout: c.reachedCheckout,
    updated_at: c.updatedAt,
    abandoned_at: c.abandonedAt,
    country: c.session?.country ?? null,
    city: c.session?.city ?? null,
    timezone: c.session?.timezone ?? null,
    device_type: c.session?.deviceType ?? null,
    items: c.items,
  }));
}

// Where the money comes from, geographically.
export async function getRevenueByLocation() {
  const groups = await prisma.order.groupBy({
    by: ["country"],
    _count: { _all: true },
    _sum: { total: true },
    _avg: { total: true },
  });
  return groups
    .map((g) => ({
      country: g.country ?? "Unknown",
      orders: g._count._all,
      revenue: g._sum.total ?? 0,
      avg_order_value: g._avg.total ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// Product interest vs. sales — spot demand the catalog isn't converting.
export async function getTopProducts() {
  // Interest (views + add-to-cart) from the event stream.
  const interest = await prisma.$queryRaw<
    { product_id: string; product_name: string | null; add_to_cart_count: number; view_count: number }[]
  >(Prisma.sql`
    SELECT product_id,
           MAX(product_name) AS product_name,
           SUM(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END)::int AS add_to_cart_count,
           SUM(CASE WHEN event_type = 'product_view' THEN 1 ELSE 0 END)::int AS view_count
    FROM events
    WHERE product_id IS NOT NULL
    GROUP BY product_id
  `);

  // Actual sales from order line items.
  const sales = await prisma.$queryRaw<{ product_id: string; units_sold: number; revenue: number }[]>(
    Prisma.sql`
      SELECT product_id, SUM(quantity)::int AS units_sold, SUM(price * quantity)::float AS revenue
      FROM order_items
      GROUP BY product_id
    `
  );
  const salesById = new Map(sales.map((s) => [s.product_id, s]));

  return interest
    .map((p) => {
      const s = salesById.get(p.product_id);
      const units = s?.units_sold ?? 0;
      const revenue = s?.revenue ?? 0;
      const addToCart = p.add_to_cart_count ?? 0;
      return {
        product_id: p.product_id,
        product_name: p.product_name,
        view_count: p.view_count ?? 0,
        add_to_cart_count: addToCart,
        units_sold: units,
        revenue,
        // Of everyone who added it, how many actually bought?
        add_to_purchase_rate: addToCart > 0 ? Number((units / addToCart).toFixed(3)) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.add_to_cart_count - a.add_to_cart_count);
}

export async function getRecentEvents(limit = 100) {
  return prisma.event.findMany({
    orderBy: { id: "desc" },
    take: limit,
    select: {
      id: true,
      sessionId: true,
      eventType: true,
      productName: true,
      colorway: true,
      quantity: true,
      value: true,
      country: true,
      city: true,
      orderId: true,
      createdAt: true,
    },
  });
}

export default prisma;
