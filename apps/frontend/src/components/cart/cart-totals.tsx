"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Truck, Lock } from "lucide-react";
import { formatInr } from "@/lib/utils";
import type { Coupon } from "@/services/coupon-service";
import { useStorefront } from "@/providers/storefront-provider";

export interface CartTotalsProps {
  subtotalInr: number;
  discountInr: number;
  appliedCoupon: Coupon | null;
  className?: string;
}

/**
 * CartTotals Component — PERALAGAE
 *
 * Displays order summary, shipping estimates, promotional discounts,
 * and Proceed to Checkout button.
 */
export function CartTotals({
  subtotalInr,
  discountInr,
  appliedCoupon,
  className = "",
}: CartTotalsProps) {
  const router = useRouter();
  const { isAuthenticated, openAuthModal } = useStorefront();

  // Free Insured Express Delivery for all PERALAGAE fine jewellery orders in India
  const shippingInr = 0;
  const finalTotalInr = Math.max(0, subtotalInr - discountInr + shippingInr);

  const handleCheckoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      router.push("/checkout");
    } else {
      openAuthModal("login", "/checkout");
    }
  };

  return (
    <div
      data-testid="cart-totals-panel"
      className={`w-full border border-[#E5E5E5] bg-[#FAFAFA] p-6 sm:p-8 flex flex-col ${className}`}
    >
      {/* Panel Heading */}
      <h2 className="text-base sm:text-lg font-semibold uppercase tracking-wider text-[#111111] pb-4 border-b border-[#E5E5E5]">
        Cart Totals
      </h2>

      {/* Breakdown Rows */}
      <div className="flex flex-col gap-4 py-5 border-b border-[#E5E5E5] text-sm">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-[#444444]">
          <span className="font-medium">Subtotal</span>
          <span data-testid="cart-subtotal" className="font-semibold text-[#111111]">
            {formatInr(subtotalInr)}
          </span>
        </div>

        {/* Shipping */}
        <div className="flex items-start justify-between text-[#444444]">
          <div className="flex flex-col">
            <span className="font-medium">Shipping</span>
            <span className="text-[11px] text-[#777777] mt-0.5 flex items-center gap-1">
              <Truck className="h-3 w-3" />
              <span>Insured Delivery across India</span>
            </span>
          </div>
          <span className="font-semibold text-[#15803D] uppercase text-xs">
            Free
          </span>
        </div>

        {/* Applied Coupon Discount */}
        {discountInr > 0 && appliedCoupon && (
          <div
            data-testid="cart-discount-row"
            className="flex items-center justify-between text-[#15803D]"
          >
            <div className="flex flex-col">
              <span className="font-medium">Discount ({appliedCoupon.code})</span>
              <span className="text-[11px] opacity-80">{appliedCoupon.description}</span>
            </div>
            <span data-testid="cart-discount-amount" className="font-semibold">
              – {formatInr(discountInr)}
            </span>
          </div>
        )}
      </div>

      {/* Final Total */}
      <div className="flex items-baseline justify-between py-5 border-b border-[#E5E5E5]">
        <span className="text-base font-bold uppercase tracking-wider text-[#111111]">
          Total
        </span>
        <div className="text-right">
          <span
            data-testid="cart-final-total"
            className="text-xl sm:text-2xl font-bold text-[#111111]"
          >
            {formatInr(finalTotalInr)}
          </span>
          <p className="text-[11px] text-[#777777] mt-0.5">
            (Includes all applicable GST)
          </p>
        </div>
      </div>

      {/* Checkout CTA */}
      <div className="pt-6 flex flex-col gap-3">
        <Link
          href="/checkout"
          onClick={handleCheckoutClick}
          data-testid="proceed-to-checkout-btn"
          className="w-full py-4 bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-semibold tracking-widest uppercase text-center transition-all duration-250 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer"
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Proceed to Checkout</span>
        </Link>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-[#777777] pt-2">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-black" />
            <span>100% Certified Jewellery</span>
          </span>
          <span>•</span>
          <span>Secure Checkout</span>
        </div>
      </div>
    </div>
  );
}
