import React from "react";
import Link from "next/link";
import { brandConfig } from "@/config/brand";

export default function NotFound() {
  return (
    <main
      data-testid="not-found-page"
      className="w-full min-h-[70vh] bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <div className="max-w-md w-full text-center">
        {/* Subtle Brand Eyebrow */}
        <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-[#C5A572] block mb-3">
          {brandConfig.name} Fine Jewellery
        </span>

        {/* 404 Code & Heading */}
        <h1 className="font-serif text-4xl sm:text-5xl font-light text-[#111111] tracking-tight mb-3">
          404
        </h1>
        <h2 className="text-base sm:text-lg font-medium text-[#222222] tracking-wide mb-4">
          Page Not Found
        </h2>

        {/* Brand Narrative Copy */}
        <p className="text-xs sm:text-sm text-[#666666] leading-relaxed mb-8 max-w-sm mx-auto font-light">
          The fine jewellery collection or page you are seeking is unavailable or has been moved.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer"
          >
            Explore Catalogue
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-[#CCCCCC] hover:border-[#C5A572] hover:text-[#C5A572] text-[#111111] text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
