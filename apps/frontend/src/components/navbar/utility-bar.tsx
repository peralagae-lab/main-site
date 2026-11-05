"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStorefront } from "@/providers/storefront-provider";
import type { UtilityConfig, UtilityLinkItem } from "@/config/navigation";
import { scrollToSectionId } from "@/lib/navigation";

export interface UtilityBarProps {
  config: UtilityConfig;
}

/**
 * Renders the right-side utility links (Find a Store, FAQs, Subscribe).
 * Handles unimplemented routes gracefully without dead links or broken 404 navigation.
 */
export function UtilityLinks({ links }: { links: UtilityLinkItem[] }) {
  const storefront = useStorefront();
  let pathname = "/";
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const hookPath = usePathname();
    if (hookPath) pathname = hookPath;
  } catch {
    pathname = "/";
  }

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: UtilityLinkItem
  ) => {
    if (item.id === "subscribe") {
      e.preventDefault();
      storefront.openNewsletter();
      return;
    }

    const href = item.href;
    if (href && href.startsWith("/#") && typeof window !== "undefined") {
      const targetId = href.replace("/#", "");
      if (pathname === "/") {
        const scrolled = scrollToSectionId(targetId);
        if (scrolled) {
          e.preventDefault();
        }
      }
      // If not on homepage, let Next.js Link navigate to `/#${targetId}`
    }
  };

  return (
    <ul
      className="flex items-center space-x-6 lg:space-x-8 text-xs lg:text-[13px] font-jost font-medium tracking-[0.02em] text-black"
      role="list"
    >
      {links.map((item) => (
        <li key={item.id}>
          {item.isImplemented && item.href ? (
            <Link
              href={item.href}
              data-testid={item.id === "subscribe" ? "navbar-subscribe-link" : undefined}
              onClick={(e) => handleLinkClick(e, item)}
              className="text-black font-jost transition-colors duration-200 hover:text-[#C5A572] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572]"
            >
              {item.label}
            </Link>
          ) : (
            <span
              className="cursor-default select-none text-black font-jost transition-colors duration-200 hover:text-[#C5A572]"
              title={`${item.label} (Coming Soon)`}
            >
              {item.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Row Two: Full-width utility information bar.
 *
 * Left group:
 * 1. Indian Phone Number (10 digits)
 * 2. Summer Sale 15% off! Shop Now!
 *
 * Right group:
 * - Find a Store, FAQs, Subscribe
 *
 * Style:
 * - Clean white background with subtle #E5E5E5 bottom border.
 * - Solid black typography with minimalist editorial spacing.
 */
export function UtilityBar({ config }: UtilityBarProps) {
  const showPhone = config.showPhone !== false && Boolean(config.phone);
  const showPromotion =
    config.showPromotion !== false &&
    (Boolean(config.promotion?.text) || Boolean(config.promotion?.isLoading));
  const showLinks = config.showLinks !== false && Array.isArray(config.links) && config.links.length > 0;

  // If all elements are hidden, don't render empty bar
  if (!showPhone && !showPromotion && !showLinks) {
    return null;
  }

  return (
    <div
      className="w-full border-b border-[#E5E5E5] bg-white text-xs lg:text-[13px] font-jost text-black transition-all duration-200"
      role="region"
      aria-label="Utility navigation and store information"
    >
      <div className="mx-auto flex min-h-[40px] lg:min-h-[48px] max-w-7xl 2xl:max-w-[1536px] 3xl:max-w-[1720px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 lg:px-8 2xl:px-12 py-1.5">
        {/* Left group: Phone and Promotion */}
        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-5 lg:gap-x-6 gap-y-1">
          {/* 1. Phone Number */}
          {showPhone && (
            <a
              href={config.phoneHref ?? "tel:+919876543210"}
              className="inline-flex items-center font-normal text-black transition-colors duration-200 hover:text-[#C5A572] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] shrink-0"
            >
              {config.phone}
            </a>
          )}

          {showPhone && showPromotion && (
            <span
              className="h-3 lg:h-3.5 w-px bg-[#E5E5E5] inline-block shrink-0"
              aria-hidden="true"
            />
          )}

          {/* 2. Promotional info */}
          {showPromotion && (
            <span className="text-black inline-flex flex-wrap items-center gap-1.5 leading-snug">
              {config.promotion?.isLoading ? (
                <span
                  data-testid="navbar-promo-loading-placeholder"
                  className="inline-block w-28 sm:w-36 h-3 bg-neutral-200/70 animate-pulse rounded"
                  aria-label="Loading promotional message"
                />
              ) : config.promotion?.text ? (
                <>
                  <span data-testid="navbar-promo-text">{config.promotion.text}</span>
                  {config.promotion.linkText && (
                    <Link
                      href={config.promotion.href || "/shop"}
                      className="font-semibold text-black transition-colors duration-200 hover:text-[#C5A572] hover:underline cursor-pointer shrink-0"
                    >
                      {config.promotion.linkText}
                    </Link>
                  )}
                </>
              ) : null}
            </span>
          )}
        </div>

        {/* Right group: Secondary Links */}
        {showLinks && (
          <div className="hidden sm:flex items-center shrink-0">
            <UtilityLinks links={config.links} />
          </div>
        )}
      </div>
    </div>
  );
}
