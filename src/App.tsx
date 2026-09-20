/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  ShoppingBag,
  Heart,
  HelpCircle,
  MessageSquare,
  BookOpen,
  ChevronDown,
  Compass,
  CornerDownRight,
  Bookmark,
  Menu,
  X
} from "lucide-react";

import { PRODUCTS, REVIEWS, FAQS } from "./data";
import { CartItem } from "./types";
import ProductCatalog from "./components/ProductCatalog";
import Cart from "./components/Cart";
import { initAnalytics, track, syncCart, getCartId } from "./analytics";
import { productPath, CONTACT_EMAIL } from "./seo/site";
import { webpSrcSet } from "./images";
import { NAV_LINKS, FOOTER_COLUMNS, FOOTER_BLURB } from "./seo/nav";

// The hero photo is the LCP element; index.html preloads it with these same sizes.
const HERO_IMAGE_SIZES = "(min-width: 1024px) 480px, calc(100vw - 48px)";

// Guide pages linked from the "Prayer mats for every need" section.
const GUIDE_LINKS = [
  { href: "/orthopedic-prayer-mats/", title: "Orthopedic prayer mats", blurb: "For knee & joint pain" },
  { href: "/wool-prayer-mats/", title: "Wool prayer mats", blurb: "Handwoven & natural" },
  { href: "/silk-prayer-mats/", title: "Silk prayer mats", blurb: "Feel, sheen & care" },
  { href: "/travel-prayer-mats/", title: "Travel prayer mats", blurb: "Lightweight & portable" },
  { href: "/non-slip-prayer-mats/", title: "Non-slip prayer mats", blurb: "For tile, wood & laminate" },
  { href: "/prayer-mats-for-elderly/", title: "Prayer mats for the elderly", blurb: "Comfort & stability" },
  { href: "/prayer-mat-size-guide/", title: "Prayer mat size guide", blurb: "Dimensions in cm & inches" },
  { href: "/prayer-mat-thickness/", title: "Prayer mat thickness", blurb: "3mm vs 8mm vs 12mm" },
  { href: "/prayer-mat-gifts/", title: "Prayer mat gifts", blurb: "Ramadan, Eid & weddings" },
  { href: "/prayer-mat-guide/", title: "How to choose a prayer mat", blurb: "The full buying guide" },
];

// Maps CartItem[] to the backend cart snapshot shape.
const toSyncItems = (items: CartItem[]) =>
  items.map((i) => ({
    productId: i.productId,
    name: i.name,
    colorway: i.colorway,
    price: i.price,
    quantity: i.quantity,
    configuration: i.configuration,
    imageUrl: i.imageUrl,
  }));

const CART_STORAGE_KEY = "sujood-cart-v1";

export default function App() {
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Keep a ref to the latest cart so the unload handler reads current contents.
  const cartRef = useRef<CartItem[]>(cart);
  cartRef.current = cart;

  // The cart survives reloads and return visits. It is restored after hydration (the
  // server always renders an empty cart) and re-priced from the current catalogue, so
  // a saved cart can never show a price the server would not charge.
  const [cartRestored, setCartRestored] = useState(false);
  useEffect(() => {
    try {
      const saved: CartItem[] = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
      const restored = (Array.isArray(saved) ? saved : []).flatMap((item) => {
        const product = PRODUCTS.find((p) => p.id === item.productId);
        const colorway = product?.colorways.find((c) => c.name === item.colorway);
        if (!product || !colorway || !(item.quantity >= 1)) return [];
        return [{ ...item, name: product.name, price: product.price, imageUrl: colorway.imageUrl || product.imageUrl }];
      });
      if (restored.length > 0) setCart(restored);
    } catch { /* unreadable or blocked storage: start with an empty cart */ }
    setCartRestored(true);
  }, []);
  useEffect(() => {
    if (!cartRestored) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch { /* storage unavailable: the cart just won't persist */ }
  }, [cart, cartRestored]);

  // Register the visitor session once, and flag the cart as abandoned on exit.
  useEffect(() => {
    initAnalytics();
    const handleExit = () => {
      const items = cartRef.current;
      if (items.length > 0) {
        syncCart(toSyncItems(items), "abandoned", false, true);
        track("cart_abandoned", { cartId: getCartId(), value: items.reduce((a, i) => a + i.price * i.quantity, 0) }, true);
      }
    };
    window.addEventListener("pagehide", handleExit);
    return () => window.removeEventListener("pagehide", handleExit);
  }, []);

  // Scroll helper
  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Shared nav uses "/#section" hrefs: scroll smoothly here instead of reloading.
  const onNavClick = (e: React.MouseEvent, href: string) => {
    if (!href.startsWith("/#")) return;
    e.preventDefault();
    scrollToId(href.slice(2));
    setIsMenuOpen(false);
  };

  // Cart operations
  const handleAddToCart = (newItem: Omit<CartItem, "id">) => {
    setCart((prev) => {
      let next: CartItem[];
      // If it's a standard mat and already exists in cart, increment quantity
      if (newItem.productId !== "custom") {
        const existingIdx = prev.findIndex(
          (item) => item.productId === newItem.productId && item.colorway === newItem.colorway
        );
        if (existingIdx > -1) {
          next = prev.map((item, i) =>
            i === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
          );
          syncCart(toSyncItems(next));
          return next;
        }
      }

      // Otherwise, append as a fresh unique item
      next = [
        ...prev,
        {
          ...newItem,
          id: `cart-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        },
      ];
      syncCart(toSyncItems(next));
      return next;
    });
    track("add_to_cart", {
      productId: newItem.productId,
      productName: newItem.name,
      colorway: newItem.colorway,
      quantity: 1,
      unitPrice: newItem.price,
      value: newItem.price,
      cartId: getCartId(),
    });
    // Automatically reveal cart on adding for fluid transactional feedback
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      );
      const changed = next.find((i) => i.id === id);
      if (changed) {
        track("update_quantity", {
          productId: changed.productId,
          productName: changed.name,
          quantity: changed.quantity,
          unitPrice: changed.price,
          cartId: getCartId(),
        });
      }
      syncCart(toSyncItems(next));
      return next;
    });
  };

  const handleRemoveItem = (id: string) => {
    setCart((prev) => {
      const removed = prev.find((i) => i.id === id);
      const next = prev.filter((item) => item.id !== id);
      if (removed) {
        track("remove_from_cart", {
          productId: removed.productId,
          productName: removed.name,
          colorway: removed.colorway,
          quantity: removed.quantity,
          unitPrice: removed.price,
          cartId: getCartId(),
        });
      }
      syncCart(toSyncItems(next));
      return next;
    });
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-alabaster-pearl selection:bg-spruce-100 selection:text-spruce-950 font-sans text-spruce-900" id="sujood-root">
      
      {/* 1. PREMIUM FLOATING HEADER */}
      <header className="sticky top-0 z-40 bg-alabaster-pearl/80 backdrop-blur-md border-b border-spruce-100/60" id="main-header">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Brand Serif Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center focus:outline-hidden hover:opacity-90 transition-opacity"
            id="logo-button"
            aria-label="Sujood — back to top"
          >
            <img
              src="/images/logo-128.webp"
              alt="Sujood"
              width="56"
              height="56"
              className="h-14 w-14 rounded-xl object-cover ring-1 ring-clay-ochre/25"
            />
          </button>

          {/* Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-mono tracking-wider uppercase text-spruce-600">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} onClick={(e) => onNavClick(e, l.href!)} className="cursor-pointer hover:text-spruce-950 transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          {/* Action Hub */}
          <div className="flex items-center space-x-3">
            
            {/* Shopping Cart Indicator */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="cursor-pointer relative p-2.5 bg-spruce-950 text-alabaster-pearl hover:bg-spruce-900 rounded-full transition-all duration-200 shadow-sm border border-spruce-950 flex items-center justify-center"
              id="cart-nav-trigger"
              aria-label="Open Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-clay-ochre border border-spruce-950 text-spruce-950 text-[9px] font-mono font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className="md:hidden cursor-pointer p-2.5 bg-spruce-800 text-spruce-950 hover:bg-spruce-200 rounded-full transition-all duration-200 border border-spruce-100 flex items-center justify-center"
              id="mobile-menu-trigger"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

          </div>
        </div>

        {/* Mobile Nav Panel */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-spruce-100/60 bg-alabaster-pearl/95 backdrop-blur-md">
            <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col space-y-4 text-xs font-mono tracking-wider uppercase text-spruce-600">
              {NAV_LINKS.map((l) => (
                <a key={l.label} href={l.href} onClick={(e) => onNavClick(e, l.href!)} className="hover:text-spruce-950 transition-colors">
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* 2. DRAMATIC EDITORIAL HERO SECTION */}
      <section className="py-20 lg:py-32 overflow-hidden border-b border-spruce-100/40 bg-linear-to-b from-spruce-50/10 to-alabaster-pearl" id="hero-section">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          
          {/* Hero text */}
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center space-x-2 text-clay-accent">
              <Compass className="w-4.5 h-4.5" />
              <span className="text-xs font-mono tracking-widest uppercase">COMFORTABLE PRAYER MATS</span>
            </div>

            <h1 className="font-serif text-5xl sm:text-6xl lg:text-[72px] text-spruce-950 font-bold tracking-tight leading-none text-balance">
              Prayer mats <br />
              <span className="font-serif font-medium text-clay-accent">built for comfort.</span>
            </h1>

            <p className="text-base sm:text-lg text-spruce-700 leading-relaxed max-w-[65ch] text-pretty">
              Sujood makes prayer mats that are comfortable to use every day: orthopedic memory-foam mats for joint support, organic Pakistani wool flatweaves, and lightweight silk mats for travel.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => scrollToId("catalog-section")}
                className="cursor-pointer px-8 py-4 bg-spruce-950 text-alabaster-pearl hover:bg-spruce-900 font-semibold text-sm rounded-full transition-all duration-300 shadow-md border border-spruce-950"
              >
                Shop the Collection
              </button>
            </div>

            {/* Quick value props */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-spruce-100">
              <div className="space-y-1">
                <span className="text-xs font-mono text-spruce-400">ORTHOPEDIC</span>
                <p className="text-sm font-semibold text-spruce-950">12mm Joint Care</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-mono text-spruce-400">HERITAGE</span>
                <p className="text-sm font-semibold text-spruce-950">Pakistani Wool</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-mono text-spruce-400">PORTABLE</span>
                <p className="text-sm font-semibold text-spruce-950">3mm Travel Silk</p>
              </div>
            </div>
          </div>

          {/* Hero Atmospheric Visual */}
          <div className="lg:col-span-5 relative">
            <div className="absolute inset-0 bg-clay-ochre/10 rounded-3xl -rotate-2 blur-xs translate-x-2 translate-y-2" />
            <div className="relative overflow-hidden rounded-3xl border border-spruce-100 shadow-xl aspect-3/4">
              <img
                src="/images/rawdah_mat_1782347244248.jpg"
                srcSet={webpSrcSet("/images/rawdah_mat_1782347244248.jpg")}
                sizes={HERO_IMAGE_SIZES}
                width="1200"
                height="896"
                fetchPriority="high"
                decoding="async"
                alt="The Rawdah Orthopedic prayer mat"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-[4000ms] ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-spruce-950/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-6 text-alabaster-pearl space-y-1">
                <p className="text-[10px] font-mono tracking-widest text-clay-ochre">FEATURED</p>
                <h4 className="font-serif text-lg font-medium">The Rawdah Orthopedic in Royal Emerald</h4>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. MATERIAL BIOGRAPHY / COGNITIVE SEGMENTS */}
      <section className="py-24 bg-spruce-50 border-b border-spruce-100/40" id="philosophy-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl space-y-4 mb-20">
            <span className="text-[10px] font-mono tracking-widest text-clay-accent uppercase">WHY SUJOOD</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-spruce-950 font-bold tracking-tight">
              Designed to be comfortable where it matters
            </h2>
            <p className="text-sm text-spruce-700 leading-relaxed text-pretty max-w-prose">
              We started Sujood to make prayer mats that are actually comfortable to use. We use wool, silk, and medical-grade foam so your knees, ankles, and forehead are supported during daily prayers.
            </p>
          </div>

          {/* Staggered Bio List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            
            <div className="space-y-4">
              <div className="w-12 h-12 bg-spruce-50 border border-spruce-100 text-spruce-800 rounded-lg flex items-center justify-center font-serif text-lg font-bold">
                A
              </div>
              <h4 className="font-serif text-lg font-semibold text-spruce-950">Joint Support</h4>
              <p className="text-xs text-spruce-700 leading-relaxed text-pretty">
                A thin mat passes the hardness of the floor straight to your joints. Our orthopedic foam core cushions your knees, ankles, and forehead so you can pray without stiffness or pain.
              </p>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-clay-accent">
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>12mm depth cushioning</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-spruce-50 border border-spruce-100 text-spruce-800 rounded-lg flex items-center justify-center font-serif text-lg font-bold">
                B
              </div>
              <h4 className="font-serif text-lg font-semibold text-spruce-950">Traditional Patterns</h4>
              <p className="text-xs text-spruce-700 leading-relaxed text-pretty">
                Our mats feature traditional Islamic geometric patterns and mihrab arch designs, woven with care to give you something calm and focused to look at during prayer.
              </p>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-clay-accent">
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>Geometric patterns & arch designs</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-spruce-50 border border-spruce-100 text-spruce-800 rounded-lg flex items-center justify-center font-serif text-lg font-bold">
                C
              </div>
              <h4 className="font-serif text-lg font-semibold text-spruce-950">Easy-Care Wool</h4>
              <p className="text-xs text-spruce-700 leading-relaxed text-pretty">
                Pakistani wool has natural lanolin that helps it resist dust and lint, so it stays clean with little effort. It also feels good on both cold tile and warm floors.
              </p>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-clay-accent">
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>100% hand-spun Pakistani wool</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. MAGAZINE ALTERNATING CATALOG */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="max-w-2xl space-y-4 mb-20 text-center mx-auto">
          <span className="text-[10px] font-mono tracking-widest text-clay-accent uppercase">OUR PRODUCTS</span>
          <h2 className="font-serif text-3xl sm:text-4xl text-spruce-950 font-bold tracking-tight">Shop Prayer Mats</h2>
          <p className="text-sm text-spruce-700 leading-relaxed text-pretty">
            Buy prayer mats online, direct from Sujood. Choose a colour, add it to your cart, and we ship every order free.
          </p>
          <p className="text-xs text-spruce-500 font-mono tracking-wider">
            FREE SHIPPING • QUALITY MATERIALS • LIFETIME WARRANTY ON EDGES
          </p>
        </div>

        <ProductCatalog
          onAddToCart={handleAddToCart}
        />
      </section>

      {/* 5. PRAYER MATS BY NEED (links into the guides) */}
      <section className="py-24 bg-spruce-50 border-y border-spruce-100/40" id="guides-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl space-y-4 mb-12">
            <span className="text-[10px] font-mono tracking-widest text-clay-accent uppercase">FIND YOUR MAT</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-spruce-950 font-bold tracking-tight">
              Prayer mats for every need
            </h2>
            <p className="text-sm text-spruce-700 leading-relaxed text-pretty max-w-prose">
              The right prayer mat depends on where and how you pray. A thick memory-foam mat takes the pressure off your knees and ankles on hard floors. A hand-woven wool mat is the durable everyday choice and stays warm on cold tile. A thin silk mat folds flat for work, travel and the mosque. Our guides cover each type, along with sizes, thickness, grip and care, so you can choose with confidence.
            </p>
            <p className="text-sm text-spruce-700 leading-relaxed text-pretty max-w-prose">
              Looking to buy a prayer rug? Prayer mats are also called prayer rugs, sajjada, janamaz or musalla, depending on where you grew up, and they are the same thing. See all three on our{" "}
              <a href="/prayer-rugs/" className="text-clay-accent underline hover:text-spruce-950 transition-colors">prayer rugs</a> page.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {GUIDE_LINKS.map((g) => (
              <a
                key={g.href}
                href={g.href}
                className="block p-4 bg-spruce-800 border border-spruce-100 rounded-xl hover:border-clay-ochre/50 transition-colors"
              >
                <span className="block font-serif text-sm font-semibold text-spruce-950">{g.title}</span>
                <span className="block text-[11px] text-spruce-500 mt-1">{g.blurb}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 6. VERIFIED HEIRLOOM VERDICTS */}
      <section className="py-24 max-w-7xl mx-auto px-6" id="reviews-section">
        <div className="max-w-3xl space-y-4 mb-16">
          <span className="text-[10px] font-mono tracking-widest text-clay-accent uppercase">REVIEWS</span>
          <h2 className="font-serif text-3xl sm:text-4xl text-spruce-950 font-bold tracking-tight">
            What Our Customers Say
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {REVIEWS.map((r) => (
            <div
              key={r.id}
              className="bg-spruce-800 p-6 border border-spruce-100 rounded-xl space-y-4 flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-3">
                {/* 5 Star Stars in gold color */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <span key={i} className="text-clay-ochre text-lg">★</span>
                  ))}
                </div>
                <p className="text-xs text-spruce-700 leading-relaxed font-serif">
                  &ldquo;{r.comment}&rdquo;
                </p>
              </div>

              <div className="border-t border-spruce-50 pt-4 flex items-center justify-between text-[11px] font-mono">
                <div>
                  <span className="font-bold text-spruce-950">{r.author}</span>
                  <p className="text-spruce-400 text-[10px]">{r.date}</p>
                </div>
                <div className="text-right">
                  <span className="text-clay-accent font-semibold text-[9px] bg-spruce-50 px-2 py-0.5 rounded-sm border border-spruce-100/40">
                    VERIFIED OWNER
                  </span>
                  <p className="text-spruce-500 text-[9px] truncate max-w-[120px] mt-0.5">{r.matPurchased}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. CONTEMPLATIVE ACCORDION FAQ */}
      <section className="py-24 bg-alabaster-pearl border-t border-spruce-100/40" id="faq-section">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <span className="text-[10px] font-mono tracking-widest text-clay-accent uppercase">FAQ</span>
            <h2 className="font-serif text-3xl text-spruce-950 font-bold tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4 border-t border-spruce-100">
            {FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="border-b border-spruce-100/80 transition-colors duration-200"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="cursor-pointer w-full py-5 flex justify-between items-center text-left text-sm font-semibold text-spruce-900 hover:text-spruce-950 transition-colors focus:outline-hidden"
                  >
                    <span className="font-serif text-base">{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-spruce-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Answers stay mounted (collapsed) so they are in the server-rendered HTML. */}
                  <motion.div
                    initial={false}
                    animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                    aria-hidden={!isOpen}
                  >
                    <div className="bg-[#121715] border border-spruce-100 p-5 rounded-xl text-sm text-spruce-900 leading-relaxed text-pretty mb-6 shadow-inner">
                      {faq.answer}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. HUMBLE FOOTER (Strict Anti-AI-Slop compliance) */}
      <footer className="bg-spruce-950 text-alabaster-pearl py-16 border-t border-spruce-900" id="main-footer">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-8 xl:gap-12">

          <div className="space-y-4 lg:flex-1 lg:max-w-xs">
            <a href="/" onClick={(e) => onNavClick(e, "/#sujood-root")} className="inline-flex items-center gap-3 hover:opacity-90 transition-opacity">
              <img
                src="/images/logo-128.webp"
                alt="Sujood Mats"
                width="48"
                height="48"
                loading="lazy"
                className="h-12 w-12 rounded-xl object-cover ring-1 ring-clay-ochre/40"
              />
              <span className="font-serif text-xl font-bold tracking-widest">S U J O O D</span>
            </a>
            <p className="text-[11px] leading-relaxed max-w-xs">{FOOTER_BLURB}</p>
          </div>

          {/* One row from 640px up; two tidy columns on phones, where three don't fit. */}
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-10 gap-y-8 sm:flex sm:flex-nowrap sm:whitespace-nowrap lg:shrink-0 text-xs font-mono">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="space-y-3 last:col-span-2">
                <h5 className="text-[10px] text-clay-ochre font-semibold tracking-wider uppercase">{col.title}</h5>
                <div className="flex flex-col space-y-2">
                  {col.items.map((item) =>
                    item.href ? (
                      <a key={item.label} href={item.href} onClick={(e) => onNavClick(e, item.href!)} className="hover:text-clay-ochre transition-colors">
                        {item.label}
                      </a>
                    ) : (
                      <span key={item.label} className="text-spruce-400">{item.label}</span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:w-52 lg:shrink-0 lg:text-right text-[10px] font-mono text-spruce-400 space-y-1">
            <p>&copy; 2026 Sujood.</p>
            <p>Prayer mats made for everyday comfort.</p>
            <p><a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-clay-ochre transition-colors underline">{CONTACT_EMAIL}</a></p>
            <p>Website and search optimization by <a href="https://optimizeindex.com/" rel="nofollow" className="hover:text-clay-ochre transition-colors underline">OptimizeIndex</a>.</p>
          </div>

        </div>
      </footer>

      {/* 10. SLIDE-OVER CHECKOUT CART DRAWER */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCart([])}
      />

    </div>
  );
}
