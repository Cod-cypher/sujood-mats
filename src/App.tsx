/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingBag,
  Heart,
  HelpCircle,
  MessageSquare,
  BookOpen,
  ChevronDown,
  Compass,
  CornerDownRight,
  Bookmark
} from "lucide-react";

import { PRODUCTS, REVIEWS, FAQS } from "./data";
import { CartItem } from "./types";
import ProductCatalog from "./components/ProductCatalog";
import Cart from "./components/Cart";

export default function App() {
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Scroll helper
  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Cart operations
  const handleAddToCart = (newItem: Omit<CartItem, "id">) => {
    setCart((prev) => {
      // If it's a standard mat and already exists in cart, increment quantity
      if (newItem.productId !== "custom") {
        const existingIdx = prev.findIndex(
          (item) => item.productId === newItem.productId && item.colorway === newItem.colorway
        );
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx].quantity += 1;
          return updated;
        }
      }
      
      // Otherwise, append as a fresh unique item
      return [
        ...prev,
        {
          ...newItem,
          id: `cart-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        },
      ];
    });
    // Automatically reveal cart on adding for fluid transactional feedback
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return { ...item, quantity: Math.max(1, nextQty) };
          }
          return item;
        })
    );
  };

  const handleRemoveItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
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
            className="font-serif text-2xl font-bold tracking-widest text-spruce-950 focus:outline-hidden hover:opacity-90 transition-opacity"
            id="logo-button"
          >
            S U J O O D
          </button>

          {/* Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-mono tracking-wider text-spruce-600">
            <button onClick={() => scrollToId("catalog-section")} className="cursor-pointer hover:text-spruce-950 transition-colors">
              THE LOOM COLLECTIONS
            </button>
            <button onClick={() => scrollToId("philosophy-section")} className="cursor-pointer hover:text-spruce-950 transition-colors">
              PHILOSOPHY
            </button>
            <button onClick={() => scrollToId("reviews-section")} className="cursor-pointer hover:text-spruce-950 transition-colors">
              HEIRLOOM VERDICTS
            </button>
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

          </div>
        </div>
      </header>

      {/* 2. DRAMATIC EDITORIAL HERO SECTION */}
      <section className="py-20 lg:py-32 overflow-hidden border-b border-spruce-100/40 bg-linear-to-b from-spruce-50/10 to-alabaster-pearl" id="hero-section">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          
          {/* Hero text */}
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center space-x-2 text-clay-accent">
              <Compass className="w-4.5 h-4.5" />
              <span className="text-xs font-mono tracking-widest uppercase">DIRECTED DEVOTION & FOCUS</span>
            </div>

            <h1 className="font-serif text-5xl sm:text-6xl lg:text-[72px] text-spruce-950 font-bold tracking-tight leading-none text-balance">
              Sacred Spaces. <br />
              <span className="font-serif font-medium text-clay-accent">Woven for Prostration.</span>
            </h1>

            <p className="text-base sm:text-lg text-spruce-700 leading-relaxed max-w-[65ch] text-pretty">
              Every prostration is an absolute grounding. Sujood weaves therapeutic orthopedic memory mats, organic Anatolian wool flatweaves, and shimmery travel silken sanctuaries designed to absorb posture impact and direct the seeker’s infinite sight.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => scrollToId("catalog-section")}
                className="cursor-pointer px-8 py-4 bg-spruce-950 text-alabaster-pearl hover:bg-spruce-900 font-semibold text-sm rounded-full transition-all duration-300 shadow-md border border-spruce-950"
              >
                Explore Loom Collection
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
                <p className="text-sm font-semibold text-spruce-950">Anatolian Loom</p>
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
                alt="Sujood Premium Orthopedic Devotional Altar"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-[4000ms] ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-spruce-950/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-6 text-alabaster-pearl space-y-1">
                <p className="text-[10px] font-mono tracking-widest text-clay-ochre">FEATURED MASTERPIECE</p>
                <h4 className="font-serif text-lg font-medium">The Rawdah Orthopedic in Spruce Green</h4>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. MATERIAL BIOGRAPHY / COGNITIVE SEGMENTS */}
      <section className="py-24 bg-spruce-50 border-b border-spruce-100/40" id="philosophy-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl space-y-4 mb-20">
            <span className="text-[10px] font-mono tracking-widest text-clay-accent uppercase">TACTILE THEOLOGY</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-spruce-950 font-bold tracking-tight">
              An Elevated Sanctuary for the Forehead, Knees, and Mind
            </h2>
            <p className="text-sm text-spruce-700 leading-relaxed text-pretty max-w-prose">
              Sujood was born from a search for physical comfort and deep geometric focus. We choose wool, silk, and medical-grade cellular structures to enhance the tranquility of the daily prayers.
            </p>
          </div>

          {/* Staggered Bio List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            
            <div className="space-y-4">
              <div className="w-12 h-12 bg-spruce-50 border border-spruce-100 text-spruce-800 rounded-lg flex items-center justify-center font-serif text-lg font-bold">
                A
              </div>
              <h4 className="font-serif text-lg font-semibold text-spruce-950">Dual-Density Joint Altar</h4>
              <p className="text-xs text-spruce-700 leading-relaxed text-pretty">
                Standard rugs transfer floor hardness directly to the joints. Our orthopedic core utilizes dense supportive foam that cradles the contact bone groups, preventing stiffness and allowing deep, unhurried devotions.
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
              <h4 className="font-serif text-lg font-semibold text-spruce-950">Infinite Sacred Tessellations</h4>
              <p className="text-xs text-spruce-700 leading-relaxed text-pretty">
                By celebrating traditional geometric star tiles (Tawhid), we provide structural focus during sight-cast. The visual order represents natural creation, guiding internal alignment.
              </p>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-clay-accent">
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>Star structures & focal Arches</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-spruce-50 border border-spruce-100 text-spruce-800 rounded-lg flex items-center justify-center font-serif text-lg font-bold">
                C
              </div>
              <h4 className="font-serif text-lg font-semibold text-spruce-950">Self-Cleaning Mountain Yarn</h4>
              <p className="text-xs text-spruce-700 leading-relaxed text-pretty">
                Anatolian wool retains natural lanolin grease, pushing away ambient dust and household lint automatically. It adapts to cold ceramic or hot concrete surfaces effortlessly.
              </p>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-clay-accent">
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>100% hand-spun Anatolian wool</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. MAGAZINE ALTERNATING CATALOG */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="max-w-2xl space-y-4 mb-20 text-center mx-auto">
          <span className="text-[10px] font-mono tracking-widest text-clay-accent uppercase">CURATED LOOMS</span>
          <h2 className="font-serif text-3xl sm:text-4xl text-spruce-950 font-bold tracking-tight">The Sujood Signature Gallery</h2>
          <p className="text-xs text-spruce-500 font-mono tracking-wider">
            PREMIUM CRAFTSMANSHIP • LIFETIME WARRANTY ON ALL EDGES
          </p>
        </div>

        <ProductCatalog
          onAddToCart={handleAddToCart}
        />
      </section>

      {/* 6. VERIFIED HEIRLOOM VERDICTS */}
      <section className="py-24 max-w-7xl mx-auto px-6" id="reviews-section">
        <div className="max-w-3xl space-y-4 mb-16">
          <span className="text-[10px] font-mono tracking-widest text-clay-accent uppercase">SEEKERS' ACCOUNTABLE VERDICTS</span>
          <h2 className="font-serif text-3xl sm:text-4xl text-spruce-950 font-bold tracking-tight">
            Heirloom Testimonials from Daily Practice
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
            <span className="text-[10px] font-mono tracking-widest text-clay-accent uppercase">FAQ PROTOCOLS</span>
            <h2 className="font-serif text-3xl text-spruce-950 font-bold tracking-tight">Common Contemplations</h2>
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

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="bg-[#121715] border border-spruce-100 p-5 rounded-xl text-sm text-spruce-900 leading-relaxed text-pretty mb-6 shadow-inner">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. HUMBLE FOOTER (Strict Anti-AI-Slop compliance) */}
      <footer className="bg-spruce-950 text-alabaster-pearl py-16 border-t border-spruce-900" id="main-footer">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          
          <div className="md:col-span-4 space-y-4 text-center md:text-left">
            <h4 className="font-serif text-xl font-bold tracking-widest">S U J O O D</h4>
            <p className="text-[11px] text-spruce-300 leading-relaxed max-w-xs">
              Hand-spun Anatolian looms, Orthopedic devotions, and fold-resistant travel sanctuaries designed to direct sensory focus during prostration.
            </p>
          </div>

          <div className="md:col-span-5 flex justify-center space-x-12 text-xs font-mono text-spruce-300">
            <div className="space-y-3">
              <h5 className="text-[10px] text-clay-ochre font-semibold tracking-wider">NAVIGATE</h5>
              <div className="flex flex-col space-y-2">
                <button onClick={() => scrollToId("catalog-section")} className="cursor-pointer hover:text-clay-ochre text-left transition-colors">Collections</button>
                <button onClick={() => scrollToId("philosophy-section")} className="cursor-pointer hover:text-clay-ochre text-left transition-colors">Weave Philosophy</button>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-[10px] text-clay-ochre font-semibold tracking-wider">COVENANT</h5>
              <div className="flex flex-col space-y-2">
                <span className="text-spruce-400">Fair Trade Looms</span>
                <span className="text-spruce-400">Lifetime Bound Edge</span>
                <span className="text-spruce-400">Bursa Velvet Mills</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 text-center md:text-right text-[10px] font-mono text-spruce-400 space-y-1">
            <p>&copy; 2026 Sujood Prayer Sanctuary.</p>
            <p>Made for daily devotions.</p>
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
