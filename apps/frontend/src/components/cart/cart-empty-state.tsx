"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export interface CartEmptyStateProps {
  className?: string;
}

/**
 * CartEmptyState Component — PERALAGAE
 *
 * Displays a refined empty state message with a direct Continue Shopping CTA.
 */
export function CartEmptyState({ className = "" }: CartEmptyStateProps) {
  return (
    <div
      data-testid="cart-empty-state"
      className={`w-full py-16 sm:py-24 px-4 flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-[#F7F7F7] border border-[#E5E5E5] text-[#333333] mb-6">
        <ShoppingBag className="h-8 w-8 stroke-[1.25]" />
      </div>

      <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#111111] tracking-wide">
        Your Cart Is Empty
      </h2>

      <p className="mt-3 text-xs sm:text-sm text-[#666666] max-w-md leading-relaxed tracking-wide">
        Discover jewellery that makes every moment special. Browse our latest arrivals,
        statement rings, and timeless necklaces.
      </p>

      <div className="mt-8">
        <Link
          href="/shop"
          className="inline-flex items-center justify-center px-8 py-3.5 bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-semibold uppercase tracking-widest transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
