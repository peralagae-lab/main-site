"use client";

import React, { useState } from "react";
import { Menu } from "lucide-react";
import { BrandWordmark } from "./brand-wordmark";
import { PrimaryNavigation } from "./primary-navigation";
import { NavbarActions, CartButton } from "./navbar-actions";
import { MobileNavigation } from "./mobile-navigation";
import type { NavigationConfig } from "@/config/navigation";
import { useStorefront } from "@/providers/storefront-provider";

export interface MainNavbarProps {
  config: NavigationConfig;
  onSearchClick?: () => void;
}

/**
 * Row Three: Main Navigation Bar.
 *
 * Responsive Architecture matching the design reference:
 * - Desktop:
 *   - Left: PERALAGAE brand wordmark
 *   - Centre: Primary Navigation (Home, Shop, Contact, New Arrivals)
 *   - Right: Action Icons (Search, Account, Wishlist, Cart)
 * - Mobile (< lg):
 *   - Left: Hamburger Menu trigger
 *   - Centre: PERALAGAE brand wordmark (optically centered)
 *   - Right: Shopping Cart icon with circular "0" count badge
 */
export function MainNavbar({ config, onSearchClick }: MainNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const storefront = useStorefront();
  const cartAction = config.actions?.find((a) => a.id === "cart");
  const cartCount = storefront.cartCount || (config.badges?.cartCount ?? 0);
  const wishlistCount = storefront.wishlistCount || (config.badges?.wishlistCount ?? 0);

  return (
    <>
      <nav aria-label="Main Storefront Header" className="w-full bg-white transition-colors border-b border-[#F0EBE1]/60">
        <div className="mx-auto flex h-16 sm:h-20 lg:h-24 max-w-7xl 2xl:max-w-[1536px] 3xl:max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-8 2xl:px-12">
          {/* Mobile Left: Hamburger trigger (visible strictly on screens < lg) */}
          <div className="flex w-10 items-center justify-start lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#222222] transition-colors hover:text-[#C5A572] active:text-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer"
            >
              <Menu className="h-6 w-6 stroke-[1.4]" aria-hidden="true" />
            </button>
          </div>

          {/* Brand Wordmark: Centered on mobile (< lg), left-aligned on desktop (lg+) */}
          <div className="flex flex-1 items-center justify-center lg:flex-none lg:w-1/4 lg:justify-start">
            <BrandWordmark config={config.brand} />
          </div>

          {/* Desktop Centre: Primary Navigation Links */}
          <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center">
            <PrimaryNavigation items={config.primaryNav} />
          </div>

          {/* Right Group:
              - Mobile (< lg): Cart icon with badge matching mobile reference
              - Desktop (lg+): Full 4 action icons (Search, Account, Wishlist, Cart)
          */}
          <div className="flex w-10 items-center justify-end lg:w-1/4">
            {/* Mobile Cart Button */}
            <div className="flex lg:hidden">
              <CartButton
                href={cartAction?.href}
                isImplemented={cartAction?.isImplemented}
                badgeCount={cartCount}
              />
            </div>

            {/* Desktop Action Icons */}
            <div className="hidden lg:flex">
              <NavbarActions
                actions={config.actions}
                cartCount={cartCount}
                wishlistCount={wishlistCount}
                onSearchClick={onSearchClick ?? storefront.openSearch}
                onAccountClick={() => storefront.openAuthModal("login")}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Responsive Mobile Drawer */}
      <MobileNavigation
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        config={config}
      />
    </>
  );
}
