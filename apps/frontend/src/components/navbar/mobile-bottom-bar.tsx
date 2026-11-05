"use client";

import React from "react";
import Link from "next/link";
import { Home, Search, Heart, User } from "lucide-react";
import type { NavigationConfig } from "@/config/navigation";
import { useStorefront } from "@/providers/storefront-provider";

export interface MobileBottomBarProps {
  config: NavigationConfig;
  onSearchClick?: () => void;
  onWishlistClick?: () => void;
  onAccountClick?: () => void;
}

const ICON_STROKE_WIDTH = 1.4;

/**
 * Mobile Bottom Navigation Bar (Sticky Bottom Navigation).
 *
 * Faithfully reproduces the Alukas & Co mobile reference:
 * 1. HOME — Home icon + "HOME" label, navigating to "/"
 * 2. SEARCH — Search icon + "SEARCH" label
 * 3. WISHLIST — Heart icon with circular black "0" badge + "WISHLIST" label
 * 4. ACCOUNT — User icon + "ACCOUNT" label
 *
 * Characteristics:
 * - Visible strictly on mobile & tablet viewports (< lg), hidden on desktop.
 * - Fixed to bottom of screen with white background and subtle top border.
 * - Semantic navigation with accessible labels.
 */
export function MobileBottomBar({
  config,
  onSearchClick,
  onWishlistClick,
  onAccountClick,
}: MobileBottomBarProps) {
  const storefront = useStorefront();
  const wishlistCount = storefront.wishlistCount || (config.badges?.wishlistCount ?? 0);
  const accountAction = config.actions?.find((a) => a.id === "account");
  const wishlistAction = config.actions?.find((a) => a.id === "wishlist");

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-[#E5E5E5] bg-white lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-2">
        {/* 1. HOME */}
        <Link
          href="/"
          aria-label="Home"
          className="flex flex-col items-center justify-center py-1 text-[#222222] transition-colors hover:text-[#C5A572] active:text-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
        >
          <Home className="h-5 w-5" strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />
          <span className="mt-1 text-[10px] font-medium tracking-[0.05em] uppercase text-[#222222]">
            Home
          </span>
        </Link>

        {/* 2. SEARCH */}
        <button
          type="button"
          onClick={onSearchClick ?? storefront.openSearch}
          aria-label="Search"
          className="flex flex-col items-center justify-center py-1 text-[#222222] transition-colors hover:text-[#C5A572] active:text-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
        >
          <Search className="h-5 w-5" strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />
          <span className="mt-1 text-[10px] font-medium tracking-[0.05em] uppercase text-[#222222]">
            Search
          </span>
        </button>

        {/* 3. WISHLIST */}
        {wishlistAction?.isImplemented && wishlistAction.href ? (
          <Link
            href={wishlistAction.href}
            aria-label="Wishlist"
            className="flex flex-col items-center justify-center py-1 text-[#222222] transition-colors hover:text-[#C5A572] active:text-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
          >
            <div className="relative">
              <Heart className="h-5 w-5" strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />
              <span
                data-testid="mobile-wishlist-badge"
                className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-black px-0.5 text-[9px] font-semibold leading-none text-white"
              >
                {wishlistCount}
              </span>
            </div>
            <span className="mt-1 text-[10px] font-medium tracking-[0.05em] uppercase text-[#222222]">
              Wishlist
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={onWishlistClick}
            aria-label="Wishlist"
            className="flex flex-col items-center justify-center py-1 text-[#222222] transition-colors hover:text-[#C5A572] active:text-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
          >
            <div className="relative">
              <Heart className="h-5 w-5" strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />
              <span
                data-testid="mobile-wishlist-badge"
                className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-black px-0.5 text-[9px] font-semibold leading-none text-white"
              >
                {wishlistCount}
              </span>
            </div>
            <span className="mt-1 text-[10px] font-medium tracking-[0.05em] uppercase text-[#222222]">
              Wishlist
            </span>
          </button>
        )}

        {/* 4. ACCOUNT */}
        {accountAction?.isImplemented && accountAction.href ? (
          <Link
            href={accountAction.href}
            aria-label="Account"
            className="flex flex-col items-center justify-center py-1 text-[#222222] transition-colors hover:text-[#C5A572] active:text-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
          >
            <User className="h-5 w-5" strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />
            <span className="mt-1 text-[10px] font-medium tracking-[0.05em] uppercase text-[#222222]">
              Account
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAccountClick ?? (() => storefront.openAuthModal("login"))}
            aria-label="Account"
            className="flex flex-col items-center justify-center py-1 text-[#222222] transition-colors hover:text-[#C5A572] active:text-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
          >
            <User className="h-5 w-5" strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />
            <span className="mt-1 text-[10px] font-medium tracking-[0.05em] uppercase text-[#222222]">
              Account
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
