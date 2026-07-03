/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Activity, Globe, Feather, Check, ShoppingBag, Eye } from "lucide-react";
import { PRODUCTS } from "../data";
import { CartItem } from "../types";
import { track } from "../analytics";

interface ProductCatalogProps {
  onAddToCart: (item: Omit<CartItem, "id">) => void;
}

export default function ProductCatalog({ onAddToCart }: ProductCatalogProps) {
  // Store selected colorway index per product ID to allow live mock color selection
  const [selectedColors, setSelectedColors] = useState<Record<string, number>>({
    "rawdah-ortho": 0,
    "silk-route": 0,
    "andalusia-wool": 0,
  });

  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  // Fire a single product_view per product when it first scrolls into view.
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const viewedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pid = entry.target.getAttribute("data-product-id");
          if (entry.isIntersecting && pid && !viewedRef.current.has(pid)) {
            viewedRef.current.add(pid);
            const product = PRODUCTS.find((p) => p.id === pid);
            track("product_view", { productId: pid, productName: product?.name, unitPrice: product?.price });
          }
        }
      },
      { threshold: 0.4 }
    );
    const els = Object.values(sectionRefs.current) as (HTMLDivElement | null)[];
    for (const el of els) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const handleColorSelect = (productId: string, idx: number) => {
    setSelectedColors((prev) => ({ ...prev, [productId]: idx }));
  };

  const handleAddToCart = (productId: string) => {
    const product = PRODUCTS.find((p) => p.id === productId)!;
    const colorIdx = selectedColors[productId];
    const selectedColorway = product.colorways[colorIdx];

    onAddToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      colorway: selectedColorway.name,
      imageUrl: selectedColorway.imageUrl || product.imageUrl,
    });

    setAddedProductId(productId);
    setTimeout(() => setAddedProductId(null), 3000);
  };

  return (
    <div className="space-y-32" id="catalog-section">
      {PRODUCTS.map((p, idx) => {
        const isEven = idx % 2 === 0;
        const activeColorIdx = selectedColors[p.id];
        const activeColorway = p.colorways[activeColorIdx];

        return (
          <div
            key={p.id}
            ref={(el) => { sectionRefs.current[p.id] = el; }}
            data-product-id={p.id}
            className={`grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center`}
            id={`product-${p.id}`}
          >
            {/* 1. PHOTOGRAPHY PANEL (Alternates Left / Right on Large) */}
            <div
              className={`lg:col-span-6 overflow-hidden rounded-2xl border border-spruce-100 shadow-md aspect-4/3 relative group ${
                isEven ? "lg:order-1" : "lg:order-2"
              }`}
            >
              <img
                src={activeColorway.imageUrl || p.imageUrl}
                alt={p.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
              />
              {/* Soft vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-spruce-950/20 to-transparent pointer-events-none" />
              
              {/* Thickness Badge */}
              <div className="absolute top-4 left-4 bg-spruce-950/80 backdrop-blur-xs border border-clay-ochre/25 text-clay-ochre px-3 py-1 text-[10px] font-mono tracking-wider uppercase rounded-xs">
                {p.thickness}
              </div>
            </div>

            {/* 2. TEXT/SPECS/STORYTELLING PANEL */}
            <div
              className={`lg:col-span-6 flex flex-col justify-center space-y-6 ${
                isEven ? "lg:order-2" : "lg:order-1"
              }`}
            >
              {/* Product Label / Tagline */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-clay-accent">
                  {p.id === "rawdah-ortho" ? (
                    <Activity className="w-4 h-4" />
                  ) : p.id === "silk-route" ? (
                    <Feather className="w-4 h-4" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                  <span className="text-[10px] font-mono tracking-widest uppercase">{p.tagline}</span>
                </div>
                <h3 className="font-serif text-3xl md:text-4xl text-spruce-950 font-semibold tracking-tight leading-none">
                  {p.name}
                </h3>
              </div>

              {/* Price & Primary Bio */}
              <div className="space-y-3">
                <div className="flex items-baseline space-x-2">
                  <span className="font-serif text-3xl font-bold text-spruce-950">${p.price}</span>
                  <span className="text-xs text-spruce-500 font-sans">USD</span>
                </div>
                <p className="text-sm text-spruce-700 font-sans leading-relaxed text-pretty max-w-prose">
                  {p.description}
                </p>
              </div>

              {/* Technical Specifications (Monospace formatting for authenticity) */}
              <div className="p-5 bg-spruce-850/50 border border-spruce-200 rounded-xl space-y-3 shadow-xs">
                <p className="text-[10px] font-mono tracking-wider text-clay-ochre uppercase">SPECIFICATIONS</p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
                  <div>
                    <span className="text-spruce-400">MATERIAL:</span>
                    <p className="text-spruce-900 font-medium leading-tight">{p.material}</p>
                  </div>
                  <div>
                    <span className="text-spruce-400">DIMENSIONS:</span>
                    <p className="text-spruce-900 font-medium leading-tight">{p.dimensions}</p>
                  </div>
                  <div className="col-span-2 border-t border-spruce-200 pt-2 mt-1">
                    <span className="text-spruce-400">STITCH COUNT / WEAVE:</span>
                    <p className="text-spruce-900 font-medium leading-tight">{p.stitchCount}</p>
                  </div>
                </div>
              </div>

              {/* Colorway & Option Selectors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-spruce-500">COLOR: <span className="text-spruce-900 font-semibold uppercase">{activeColorway.name}</span></span>
                </div>
                <div className="flex items-center space-x-2">
                  {p.colorways.map((c, cIdx) => (
                    <button
                      key={c.name}
                      onClick={() => handleColorSelect(p.id, cIdx)}
                      className={`cursor-pointer w-8 h-8 rounded-full border-2 transition-transform duration-200 relative flex items-center justify-center ${
                        activeColorIdx === cIdx ? "scale-110 border-spruce-900" : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      aria-label={`Select ${c.name} colorway`}
                    >
                      {activeColorIdx === cIdx && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium Interactive Action Triggers */}
              <div className="flex pt-4">
                {/* Standard Checkout Add */}
                <button
                  onClick={() => handleAddToCart(p.id)}
                  disabled={addedProductId !== null}
                  className={`cursor-pointer w-full px-6 py-3.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center justify-center space-x-2 shadow-sm border ${
                    addedProductId === p.id
                      ? "bg-clay-accent text-clay-ink border-clay-accent animate-pulse"
                      : "bg-clay-ochre text-clay-ink border-clay-ochre hover:bg-white hover:text-clay-ink hover:border-white"
                  }`}
                >
                  {addedProductId === p.id ? (
                    <>
                      <Check className="w-4 h-4 animate-bounce" />
                      <span>Added to Cart</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}
