"use client";

import React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

export interface WishlistEmptyStateProps {
  title?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
}

/**
 * WishlistEmptyState Component — PERALAGAE
 *
 * Polished empty state displayed when customer has zero items saved in their wishlist.
 */
export function WishlistEmptyState({
  title = "Your Wishlist Is Empty",
  description = "Save the jewellery you love and find it here whenever you're ready.",
  ctaText = "Continue Shopping",
  ctaHref = "/shop",
}: WishlistEmptyStateProps) {
  return (
    <div
      data-testid="wishlist-empty-state"
      className="flex flex-col items-center justify-center py-16 sm:py-24 text-center max-w-lg mx-auto px-4"
    >
      {/* Elegant Circle Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#EBEBEB] text-[#888888] mb-6">
        <Heart className="h-9 w-9 stroke-[1.2]" />
      </div>

      {/* Heading */}
      <h2 className="text-2xl sm:text-3xl font-serif font-normal text-[#111111] tracking-wide mb-3">
        {title}
      </h2>

      {/* Subtitle */}
      <p className="text-sm sm:text-base text-[#666666] leading-relaxed max-w-md mb-8">
        {description}
      </p>

      {/* Continue Shopping CTA */}
      <Link
        href={ctaHref}
        className="inline-flex items-center justify-center bg-[#111111] text-white px-8 py-3.5 text-xs font-medium tracking-[0.15em] uppercase transition-all duration-250 hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer"
      >
        {ctaText}
      </Link>
    </div>
  );
}
