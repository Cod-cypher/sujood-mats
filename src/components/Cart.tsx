/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, ShieldCheck, ArrowRight, HeartHandshake, CheckCircle2, ShoppingBag, AlertTriangle, Minus, Plus, Lock } from "lucide-react";
import { CartItem } from "../types";
import { CONTACT_EMAIL } from "../seo/site";
import { track, syncCart, getCartId, resetCartId } from "../analytics";
import { formatMoney } from "../format";
import { PROVIDER_NAME } from "./PaymentCheckout";
import Checkout, { EMPTY_CUSTOMER, type CompletedOrder, type CustomerDetails } from "./Checkout";

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
  // Kept here, not in the checkout, so going back to the cart does not empty the form.
  const [customer, setCustomer] = useState<CustomerDetails>(EMPTY_CUSTOMER);
  const [step, setStep] = useState<"review" | "checkout" | "confirmation">("review");
  const [orderConfirmation, setOrderConfirmation] = useState<CompletedOrder | null>(null);

  // A finished order's confirmation screen must not mask a newly started cart.
  useEffect(() => {
    if (step === "confirmation" && cartItems.length > 0) setStep("review");
  }, [step, cartItems.length]);

  // Emptying the cart from the checkout leaves nothing to check out.
  useEffect(() => {
    if (step === "checkout" && cartItems.length === 0) setStep("review");
  }, [step, cartItems.length]);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Custom discount for companion sets (multiple mats)
  const bundleDiscount = cartItems.length > 1 ? 25 : 0;
  const grandTotal = Math.max(0, subtotal - bundleDiscount);

  // Shared tail of every way of ordering: the order exists server-side, show it.
  const finishOrder = (order: CompletedOrder) => {
    track("purchase", { cartId: getCartId(), orderId: order.orderId, value: order.total });
    resetCartId(); // next add-to-cart starts a fresh cart
    setOrderConfirmation(order);
    setStep("confirmation");
    onClearCart(); // empty local cart on success
  };

  const beginCheckout = () => {
    track("begin_checkout", { cartId: getCartId(), value: grandTotal });
    // Mark the persisted cart as having reached checkout.
    syncCart(
      cartItems.map((i) => ({
        productId: i.productId,
        name: i.name,
        colorway: i.colorway,
        price: i.price,
        quantity: i.quantity,
        configuration: i.configuration,
        imageUrl: i.imageUrl,
      })),
      "active",
      true,
    );
    setStep("checkout");
  };

  const inCheckout = step === "checkout" && cartItems.length > 0;
  const paid = orderConfirmation?.paymentState === "paid";
  const processing = orderConfirmation?.paymentState === "processing";
  const providerName = PROVIDER_NAME[orderConfirmation?.provider ?? "paypal"];

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

          {/* Drawer: a narrow panel for the cart, widening into a full checkout. */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 z-50 h-full w-full bg-alabaster-pearl border-l border-spruce-100 shadow-2xl flex flex-col transition-[max-width] duration-300 ease-out ${
              inCheckout ? "max-w-6xl" : "max-w-md"
            }`}
            id="cart-drawer"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-spruce-100 flex items-center justify-between bg-spruce-900 text-alabaster-pearl">
              <div className="flex items-center space-x-2.5">
                {inCheckout ? <Lock className="w-5 h-5 text-clay-ochre" /> : <ShoppingBag className="w-5 h-5 text-clay-ochre" />}
                <h3 className="font-serif text-xl tracking-wide">
                  {step === "confirmation" ? (paid ? "Order Confirmed" : "Order Received") : inCheckout ? "Secure Checkout" : "Your Cart"}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="cursor-pointer p-2 hover:bg-spruce-800 rounded-full transition-colors duration-200 text-spruce-200 hover:text-white"
                id="close-cart"
                aria-label="Close Cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inCheckout ? (
              <Checkout
                cartItems={cartItems}
                subtotal={subtotal}
                discount={bundleDiscount}
                total={grandTotal}
                customer={customer}
                onCustomerChange={setCustomer}
                onBack={() => setStep("review")}
                onComplete={finishOrder}
              />
            ) : (
              <>
                {/* Cart Body */}
                <div className="flex-1 overflow-y-auto p-6">
                  <AnimatePresence mode="wait">

                    {/* EMPTY STATE */}
                    {cartItems.length === 0 && step !== "confirmation" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col items-center justify-center text-center space-y-5"
                      >
                        <div className="w-16 h-16 bg-spruce-50 border border-spruce-100 text-spruce-400 rounded-full flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-serif text-xl text-spruce-950 font-semibold">Your cart is empty</h4>
                          <p className="text-sm text-spruce-600 mt-2 max-w-[260px] leading-relaxed mx-auto">
                            Browse our collection to find a prayer mat that works for you.
                          </p>
                        </div>
                        <button
                          onClick={onClose}
                          className="cursor-pointer px-6 h-11 bg-spruce-800 text-spruce-950 hover:bg-spruce-200 text-sm font-semibold rounded-full transition-colors duration-200 border border-spruce-100"
                        >
                          Browse Products
                        </button>
                      </motion.div>
                    )}

                    {/* STEP 1: REVIEW ITEMS */}
                    {step === "review" && cartItems.length > 0 && (
                      <motion.ul
                        key="review"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        {cartItems.map((item) => (
                          <li key={item.id} className="bg-spruce-800 p-4 border border-spruce-100 rounded-xl flex space-x-4 shadow-2xs">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-20 h-20 object-cover rounded-lg border border-spruce-100 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between space-x-2">
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-sm text-spruce-950 leading-snug">{item.name}</h4>
                                  <p className="text-[13px] text-spruce-600 mt-0.5">{item.colorway}</p>
                                </div>
                                <button
                                  onClick={() => onRemoveItem(item.id)}
                                  className="cursor-pointer p-1.5 -mt-1 -mr-1 text-spruce-400 hover:text-red-400 transition-colors duration-200 flex-shrink-0"
                                  aria-label={`Remove ${item.name} from cart`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              {item.configuration && (
                                <p className="text-xs text-clay-accent mt-1 capitalize">
                                  {item.configuration.pattern}, {item.configuration.tassels} tassels
                                  {item.configuration.monogram && `, “${item.configuration.monogram}”`}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center border border-spruce-200 rounded-full bg-spruce-50">
                                  <button
                                    onClick={() => onUpdateQuantity(item.id, -1)}
                                    className="cursor-pointer w-9 h-9 flex items-center justify-center text-spruce-600 hover:text-spruce-950"
                                    aria-label={`One fewer ${item.name}`}
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-6 text-center text-sm font-medium text-spruce-950 tabular-nums">{item.quantity}</span>
                                  <button
                                    onClick={() => onUpdateQuantity(item.id, 1)}
                                    className="cursor-pointer w-9 h-9 flex items-center justify-center text-spruce-600 hover:text-spruce-950"
                                    aria-label={`One more ${item.name}`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="text-base font-semibold text-spruce-950 tabular-nums">{formatMoney(item.price * item.quantity)}</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </motion.ul>
                    )}

                    {/* STEP 3: ORDER CONFIRMATION */}
                    {step === "confirmation" && orderConfirmation && (
                      <motion.div
                        key="confirmation"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-6 space-y-6"
                      >
                        <div className="flex flex-col items-center text-center">
                          <CheckCircle2 className="w-14 h-14 text-clay-ochre" />
                          <h4 className="font-serif text-3xl font-bold text-spruce-950 tracking-tight mt-4">
                            {paid ? "Thank you" : "Order received"}
                          </h4>
                          <p className="text-sm text-spruce-600 mt-2">
                            Order <span className="font-mono text-spruce-900">{orderConfirmation.orderId}</span>
                          </p>
                        </div>

                        {/* The one thing the customer must not miss. */}
                        <div role="status" className="p-4 border border-clay-ochre bg-clay-ochre/10 rounded-xl text-left space-y-1.5">
                          <div className="flex items-center space-x-2 text-clay-accent">
                            {paid ? <ShieldCheck className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
                            <h5 className="text-base font-bold">
                              {paid ? "Payment received" : processing ? "Your payment is still processing" : "Your order is not confirmed yet"}
                            </h5>
                          </div>
                          <p className="text-sm text-spruce-900 leading-relaxed">
                            {paid
                              ? `We've received your ${orderConfirmation.provider === "stripe" ? "card" : "PayPal"} payment of ${formatMoney(orderConfirmation.total)} USD. There is nothing more you need to do.`
                              : processing
                                ? `${providerName} is still reviewing your payment. We'll email you as soon as it clears, and your order is confirmed at that point. You don't need to pay again.`
                                : "No payment has been taken. Your order is confirmed only once you pay the invoice we email you."}
                          </p>
                        </div>

                        <div className="bg-spruce-800 p-5 border border-spruce-100 rounded-xl text-left shadow-xs space-y-4">
                          <h5 className="text-sm font-semibold text-spruce-950">What happens next</h5>
                          <ol className="space-y-3 text-sm text-spruce-900 leading-relaxed list-decimal pl-5">
                            <li>
                              {orderConfirmation.emailSent ? (
                                <>We've sent a confirmation of your order to <strong className="text-spruce-950 break-all">{orderConfirmation.email}</strong>. Check your spam folder if you don't see it.</>
                              ) : (
                                <>We saved your order but couldn't send the confirmation email to <strong className="text-spruce-950 break-all">{orderConfirmation.email}</strong>. Please email <a href={`mailto:${CONTACT_EMAIL}`} className="text-clay-accent underline">{CONTACT_EMAIL}</a> with your order number.</>
                              )}
                            </li>
                            {paid ? (
                              <li>We prepare your order for shipping. If we need anything from you, we'll write to that address.</li>
                            ) : processing ? (
                              <li>Once {providerName} clears your payment, your order is confirmed and we prepare it for shipping.</li>
                            ) : (
                              <>
                                <li>We'll email you an <strong className="text-spruce-950">invoice for {formatMoney(orderConfirmation.total)} USD</strong> in a separate message.</li>
                                <li>Pay the invoice. Once your payment is received, your order is confirmed and we prepare it for shipping.</li>
                              </>
                            )}
                          </ol>

                          <dl className="border-t border-spruce-100 pt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-spruce-600">{paid ? "Total paid" : processing ? "Total" : "Total due on invoice"}</dt>
                              <dd className="text-spruce-950 font-semibold tabular-nums">{formatMoney(orderConfirmation.total)} USD</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-spruce-600">Status</dt>
                              <dd className="text-clay-accent font-semibold">{paid ? "Paid" : processing ? "Payment processing" : "Awaiting payment"}</dd>
                            </div>
                          </dl>
                        </div>

                        <button
                          onClick={onClose}
                          className="cursor-pointer w-full h-12 bg-spruce-800 text-spruce-950 hover:bg-spruce-200 text-sm font-semibold rounded-full transition-all duration-200 border border-spruce-100"
                        >
                          Continue Shopping
                        </button>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>

                {/* Cart Footer Price totals */}
                {step === "review" && cartItems.length > 0 && (
                  <div className="p-6 border-t border-spruce-100 bg-spruce-50 space-y-5 shadow-xl">
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between text-spruce-700">
                        <dt>Subtotal</dt>
                        <dd className="tabular-nums">{formatMoney(subtotal)}</dd>
                      </div>
                      {bundleDiscount > 0 && (
                        <div className="flex justify-between text-clay-accent font-medium">
                          <dt className="flex items-center"><HeartHandshake className="w-4 h-4 mr-1.5" /> Bundle discount</dt>
                          <dd className="tabular-nums">−{formatMoney(bundleDiscount)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between text-spruce-700">
                        <dt>Shipping</dt>
                        <dd className="text-clay-accent font-medium">Free</dd>
                      </div>
                      <div className="flex justify-between items-baseline text-spruce-950 pt-3 border-t border-spruce-200">
                        <dt className="text-base font-semibold">Total</dt>
                        <dd className="text-2xl font-semibold tracking-tight tabular-nums">{formatMoney(grandTotal)}</dd>
                      </div>
                    </dl>

                    <button
                      onClick={beginCheckout}
                      className="cursor-pointer w-full h-14 bg-clay-ochre text-clay-ink hover:bg-white font-semibold text-base rounded-full transition-colors duration-200 flex items-center justify-center space-x-2 shadow-md group"
                    >
                      <span>Checkout</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
