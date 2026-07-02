/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, ShieldCheck, ArrowRight, HeartHandshake, CheckCircle2, ShoppingBag } from "lucide-react";
import { CartItem } from "../types";

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

export default function Cart({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CartProps) {
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
  });

  const [step, setStep] = useState<"review" | "shipping" | "confirmation">("review");
  const [isLoading, setIsLoading] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<{
    orderId: string;
    total: number;
    estimatedDelivery: string;
    message: string;
  } | null>(null);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  // Custom discount for companion sets (multiple mats)
  const bundleDiscount = cartItems.length > 1 ? 25 : 0;
  const grandTotal = Math.max(0, subtotal - bundleDiscount);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.name || !customerInfo.email || !customerInfo.address) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems,
          customerInfo,
        }),
      });

      if (!response.ok) throw new Error("Checkout failed.");

      const data = await response.json();
      setOrderConfirmation(data);
      setStep("confirmation");
      onClearCart(); // empty local cart on success
    } catch (err) {
      console.error(err);
      alert("We encountered an issue preparing your devotions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-spruce-950/60 backdrop-blur-xs"
            id="cart-backdrop"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-alabaster-pearl border-l border-spruce-100 shadow-2xl flex flex-col"
            id="cart-drawer"
          >
            {/* Header */}
            <div className="p-6 border-b border-spruce-100 flex items-center justify-between bg-spruce-900 text-alabaster-pearl">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-clay-ochre" />
                <h3 className="font-serif text-lg tracking-wide">
                  {step === "confirmation" ? "Sacred Covenant" : "Woven Devotional Sanctuary"}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="cursor-pointer p-1.5 hover:bg-spruce-800 rounded-full transition-colors duration-200 text-spruce-200 hover:text-white"
                id="close-cart"
                aria-label="Close Cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps Navigation Indicator */}
            {step !== "confirmation" && cartItems.length > 0 && (
              <div className="bg-spruce-50 border-b border-spruce-100 px-6 py-3 flex justify-between text-[11px] font-mono tracking-wider text-spruce-500">
                <button
                  onClick={() => setStep("review")}
                  className={step === "review" ? "text-spruce-950 font-semibold" : "hover:text-spruce-950"}
                >
                  1. REVIEW CART
                </button>
                <span className="text-spruce-300">/</span>
                <span className={step === "shipping" ? "text-spruce-950 font-semibold" : ""}>
                  2. SHIPPING SANCTUARY
                </span>
              </div>
            )}

            {/* Cart Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                
                {/* EMPTY STATE */}
                {cartItems.length === 0 && step !== "confirmation" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-4"
                  >
                    <div className="w-16 h-16 bg-spruce-50 border border-spruce-100 text-spruce-400 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-serif text-lg text-spruce-950 font-semibold">Your sanctuary is vacant</h4>
                      <p className="text-xs text-spruce-500 mt-2 max-w-[240px] leading-relaxed mx-auto">
                        Explore our customizer and staggered loom collections to begin crafting your personal sanctuary space.
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="cursor-pointer px-5 py-2.5 bg-spruce-800 text-spruce-950 hover:bg-spruce-200 text-xs font-semibold rounded-full transition-colors duration-200 border border-spruce-100"
                    >
                      Browse Selections
                    </button>
                  </motion.div>
                )}

                {/* STEP 1: REVIEW ITEMS */}
                {step === "review" && cartItems.length > 0 && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-spruce-800 p-4 border border-spruce-100 rounded-xl flex space-x-4 shadow-2xs relative"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-md border border-spruce-100 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="font-semibold text-xs text-spruce-950 truncate">{item.name}</h4>
                          <p className="text-[10px] text-spruce-400 font-mono tracking-wider uppercase">
                            COLOUR: {item.colorway}
                          </p>
                          {item.configuration && (
                            <div className="text-[9px] text-clay-accent font-mono flex flex-wrap gap-x-2 gap-y-0.5 pt-0.5 bg-spruce-50 p-1.5 rounded-sm">
                              <span>PAT: {item.configuration.pattern.toUpperCase()}</span>
                              <span>•</span>
                              <span>TAS: {item.configuration.tassels.toUpperCase()}</span>
                              {item.configuration.monogram && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-spruce-900">MONO: {item.configuration.monogram.toUpperCase()}</span>
                                </>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2">
                            {/* Quantity buttons */}
                            <div className="flex items-center space-x-2.5 border border-spruce-100 rounded-md bg-spruce-50/50 p-1">
                              <button
                                onClick={() => onUpdateQuantity(item.id, -1)}
                                className="cursor-pointer text-xs text-spruce-500 hover:text-spruce-900 font-bold px-1"
                              >
                                -
                              </button>
                              <span className="text-xs font-mono font-medium text-spruce-800">{item.quantity}</span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, 1)}
                                className="cursor-pointer text-xs text-spruce-500 hover:text-spruce-900 font-bold px-1"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-xs font-serif font-bold text-spruce-950">
                              ${item.price * item.quantity}
                            </span>
                          </div>
                        </div>

                        {/* Trash remove Button */}
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="cursor-pointer absolute top-4 right-4 p-1 text-spruce-300 hover:text-red-600 transition-colors duration-200"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* STEP 2: SHIPPING DETAILS FORM */}
                {step === "shipping" && cartItems.length > 0 && (
                  <motion.form
                    key="shipping"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleCheckout}
                    className="space-y-4"
                  >
                    <h4 className="font-serif text-sm font-semibold text-spruce-900 border-b border-spruce-100 pb-2">
                      Recipient & Devotional Address
                    </h4>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-spruce-400 block">FULL LEGAL NAME</label>
                      <input
                        required
                        type="text"
                        name="name"
                        value={customerInfo.name}
                        onChange={handleInputChange}
                        placeholder="e.g. Amina Al-Hassan"
                        className="w-full px-4 py-2 text-xs border border-spruce-200 rounded-lg bg-spruce-50 text-spruce-950 focus:outline-hidden focus:ring-1 focus:ring-clay-ochre focus:border-clay-ochre"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-spruce-400 block">SECURE EMAIL ADDRESS</label>
                      <input
                        required
                        type="email"
                        name="email"
                        value={customerInfo.email}
                        onChange={handleInputChange}
                        placeholder="amina@example.com"
                        className="w-full px-4 py-2 text-xs border border-spruce-200 rounded-lg bg-spruce-50 text-spruce-950 focus:outline-hidden focus:ring-1 focus:ring-clay-ochre focus:border-clay-ochre"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-spruce-400 block">STREET ADDRESS & UNIT</label>
                      <input
                        required
                        type="text"
                        name="address"
                        value={customerInfo.address}
                        onChange={handleInputChange}
                        placeholder="1248 Sacred Way, Apt 3B"
                        className="w-full px-4 py-2 text-xs border border-spruce-200 rounded-lg bg-spruce-50 text-spruce-950 focus:outline-hidden focus:ring-1 focus:ring-clay-ochre focus:border-clay-ochre"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-spruce-400 block">CITY / REGION</label>
                        <input
                          required
                          type="text"
                          name="city"
                          value={customerInfo.city}
                          onChange={handleInputChange}
                          placeholder="San Jose"
                          className="w-full px-4 py-2 text-xs border border-spruce-200 rounded-lg bg-spruce-50 text-spruce-950 focus:outline-hidden focus:ring-1 focus:ring-clay-ochre focus:border-clay-ochre"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-spruce-400 block">POSTAL CODE</label>
                        <input
                          required
                          type="text"
                          name="postalCode"
                          value={customerInfo.postalCode}
                          onChange={handleInputChange}
                          placeholder="95112"
                          className="w-full px-4 py-2 text-xs border border-spruce-200 rounded-lg bg-spruce-50 text-spruce-950 focus:outline-hidden focus:ring-1 focus:ring-clay-ochre focus:border-clay-ochre"
                        />
                      </div>
                    </div>

                    {/* Security promise */}
                    <div className="p-3 bg-spruce-50 border border-spruce-100 rounded-lg text-[11px] text-spruce-600 leading-relaxed flex items-start space-x-2.5 mt-4">
                      <ShieldCheck className="w-4.5 h-4.5 text-spruce-700 flex-shrink-0 mt-0.5" />
                      <span>
                        Secure hand-woven registration. Sujood utilizes client-side isolated mock transacting for preview fidelity. No real funds are moved.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="cursor-pointer w-full py-3.5 bg-clay-ochre text-clay-ink hover:bg-white hover:text-clay-ink hover:border-white disabled:bg-spruce-200 disabled:text-spruce-400 font-semibold text-sm rounded-full transition-all duration-200 shadow-md border border-clay-ochre mt-4 flex items-center justify-center space-x-2"
                    >
                      {isLoading ? "Weaving Sanctuary..." : "Finalize Hand-Woven Order"}
                    </button>
                  </motion.form>
                )}

                {/* STEP 3: ORDER CONFIRMATION SUCCESS */}
                {step === "confirmation" && orderConfirmation && (
                  <motion.div
                    key="confirmation"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8 space-y-6"
                  >
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-12 h-12 text-spruce-900 animate-pulse" />
                      <h4 className="font-serif text-2xl font-bold text-spruce-950 tracking-tight mt-4">Order Received</h4>
                      <p className="text-xs text-spruce-400 font-mono tracking-widest mt-1 uppercase">
                        RECEIPT: {orderConfirmation.orderId}
                      </p>
                    </div>

                    <div className="bg-spruce-800 p-5 border border-spruce-100 rounded-xl space-y-4 text-left shadow-xs">
                      <p className="text-xs text-spruce-800 leading-relaxed font-serif">
                        &ldquo;{orderConfirmation.message}&rdquo;
                      </p>

                      <div className="border-t border-spruce-50 pt-3 space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-spruce-400">TOTAL TRANSFERRED:</span>
                          <span className="text-spruce-900 font-bold">${orderConfirmation.total} USD</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-spruce-400">ESTIMATED LANDING:</span>
                          <span className="text-spruce-900 font-medium">{orderConfirmation.estimatedDelivery}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-spruce-400">STATUS:</span>
                          <span className="text-clay-accent font-semibold">PREPARING ON LOOM</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-spruce-50 border border-spruce-100 rounded-lg text-left space-y-1">
                      <h5 className="text-[10px] font-mono uppercase text-spruce-700 tracking-wider">What happens next?</h5>
                      <p className="text-[10px] text-spruce-600 leading-relaxed">
                        Our master artisans in Bursa will select the finest yarn fibers, mount your bespoke pattern specifications onto the looms, and prepare your prayer sanctuary. We will email tracking updates directly.
                      </p>
                    </div>

                    <button
                      onClick={onClose}
                      className="cursor-pointer w-full py-3 bg-spruce-800 text-spruce-950 hover:bg-spruce-200 text-xs font-semibold rounded-full transition-all duration-200 border border-spruce-100"
                    >
                      Return to Devotional Gallery
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Cart Footer Price totals */}
            {step !== "confirmation" && cartItems.length > 0 && (
              <div className="p-6 border-t border-spruce-100 bg-spruce-50 space-y-4 shadow-xl">
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-spruce-500">
                    <span>Loom Subtotal:</span>
                    <span>${subtotal}</span>
                  </div>
                  {bundleDiscount > 0 && (
                    <div className="flex justify-between text-clay-accent font-medium flex-wrap gap-1">
                      <span className="flex items-center"><HeartHandshake className="w-3.5 h-3.5 mr-1" /> Companion Bundle Save:</span>
                      <span>-${bundleDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-spruce-500 border-t border-spruce-50 pt-1.5">
                    <span>Artisan Wrapping & Shipping:</span>
                    <span className="text-clay-accent font-semibold uppercase">COMPLIMENTARY</span>
                  </div>
                  <div className="flex justify-between text-sm text-spruce-950 font-bold font-sans pt-2 border-t border-spruce-100">
                    <span>Total Investment:</span>
                    <span className="font-serif text-lg font-extrabold">${grandTotal}</span>
                  </div>
                </div>

                {step === "review" && (
                  <button
                    onClick={() => setStep("shipping")}
                    className="cursor-pointer w-full py-3.5 bg-clay-ochre text-clay-ink hover:bg-white hover:text-clay-ink hover:border-white font-semibold text-sm rounded-full transition-all duration-300 flex items-center justify-center space-x-2 shadow-md border border-clay-ochre group"
                  >
                    <span>Proceed to Devotional Shipping</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
