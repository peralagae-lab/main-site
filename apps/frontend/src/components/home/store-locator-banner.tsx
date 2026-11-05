"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Store } from "lucide-react";
import {
  type StoreLocatorBannerConfig,
  defaultStoreLocatorConfig,
} from "@/config/store-locator";
import { scrollToSectionId } from "@/lib/navigation";

export interface StoreLocatorBannerProps {
  /**
   * Banner configuration parameters.
   * Defaults to defaultStoreLocatorConfig.
   */
  config?: StoreLocatorBannerConfig;

  /**
   * Optional container className override.
   */
  className?: string;

  /**
   * Optional custom click handler for the Find Store button.
   */
  onButtonClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * StoreLocatorBanner Component — PERALAGAE
 *
 * Implements the "Find Jewelry Shops Near You" spacious horizontal banner
 * positioned directly below the New Collection carousel.
 *
 * Visual Specifications:
 * - Content group centered horizontally & vertically.
 * - Soft pastel lavender-pink background (#F8E8F8).
 * - Simple outline storefront icon on the left (dark charcoal #111111).
 * - Heading: "Find Jewelry Shops Near You" (editorial sans/serif, dark charcoal).
 * - Rectangular outline button: "Find Store" (thin dark charcoal border, transparent bg).
 * - Fully responsive: single horizontal line on desktop; elegant stacked wrapping on mobile.
 */
export function StoreLocatorBanner({
  config = defaultStoreLocatorConfig,
  className = "",
  onButtonClick,
}: StoreLocatorBannerProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleHash = () => {
      if (window.location.hash === "#store-locator" || window.location.hash === "#find-store") {
        requestAnimationFrame(() => {
          scrollToSectionId("store-locator", { updateHash: false });
        });
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    window.addEventListener("popstate", handleHash);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener("popstate", handleHash);
    };
  }, []);

  return (
    <section
      id="store-locator"
      aria-labelledby="store-locator-heading"
      data-testid="store-locator-section"
      suppressHydrationWarning
      className={`w-full bg-white pb-14 sm:pb-20 lg:pb-24 scroll-mt-28 lg:scroll-mt-32 ${className}`}
    >
      <div className="mx-auto max-w-7xl 2xl:max-w-[1536px] 3xl:max-w-[1720px] px-3 sm:px-6 lg:px-8 2xl:px-12">
        <div
          data-testid="store-locator-banner"
          className="w-full py-8 sm:py-10 md:py-12 lg:py-14 px-6 sm:px-10 lg:px-16 transition-colors"
          style={{ backgroundColor: config.backgroundColor }}
        >
          {/* Centred horizontal content group on desktop, stacking gracefully on mobile */}
          <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-4 sm:gap-6 md:gap-8 lg:gap-10">
            {/* Store Icon + Heading Group */}
            <div className="flex items-center justify-center gap-3 sm:gap-3.5 md:gap-4 shrink-0">
              <Store
                data-testid="store-locator-icon"
                className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 shrink-0 stroke-[1.5]"
                style={{ color: config.textColor }}
                aria-hidden="true"
              />
              <h2
                id="store-locator-heading"
                suppressHydrationWarning
                className="text-lg sm:text-xl md:text-2xl lg:text-[26px] font-normal tracking-[-0.01em] leading-tight"
                style={{ color: config.textColor }}
              >
                {config.heading}
              </h2>
            </div>

            {/* Rectangular Outline CTA Button */}
            {config.buttonHref.startsWith("http") ? (
              <a
                href={config.buttonHref}
                onClick={onButtonClick}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="store-locator-cta"
                suppressHydrationWarning
                className="inline-flex items-center justify-center border border-[#111111] bg-transparent px-6 py-2.5 sm:px-7 sm:py-3 text-xs sm:text-[13px] font-medium tracking-[0.06em] uppercase whitespace-nowrap text-[#111111] transition-all duration-250 hover:border-[#C5A572] hover:bg-[#C5A572] hover:text-white active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2 cursor-pointer"
                title={
                  config.isImplemented
                    ? config.buttonLabel
                    : `${config.buttonLabel} (Pending Catalogue Integration)`
                }
                aria-label={`${config.buttonLabel}: ${config.heading}`}
              >
                {config.buttonLabel}
              </a>
            ) : (
              <Link
                href={config.buttonHref}
                onClick={onButtonClick}
                data-testid="store-locator-cta"
                prefetch={false}
                suppressHydrationWarning
                className="inline-flex items-center justify-center border border-[#111111] bg-transparent px-6 py-2.5 sm:px-7 sm:py-3 text-xs sm:text-[13px] font-medium tracking-[0.06em] uppercase whitespace-nowrap text-[#111111] transition-all duration-250 hover:border-[#C5A572] hover:bg-[#C5A572] hover:text-white active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2 cursor-pointer"
                title={
                  config.isImplemented
                    ? config.buttonLabel
                    : `${config.buttonLabel} (Pending Catalogue Integration)`
                }
                aria-label={`${config.buttonLabel}: ${config.heading}`}
              >
                {config.buttonLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
