"use client";

import React from "react";
import Link from "next/link";
import { Search, User, Heart, ShoppingCart, LogOut, Package } from "lucide-react";
import type { ActionItem } from "@/config/navigation";
import { useStorefront } from "@/providers/storefront-provider";

export interface NavbarActionsProps {
  actions?: ActionItem[];
  cartCount?: number;
  wishlistCount?: number;
  onSearchClick?: () => void;
  onAccountClick?: () => void;
  onWishlistClick?: () => void;
  onCartClick?: () => void;
}

const ICON_STROKE_WIDTH = 1.4;
const ICON_CLASS_NAME = "h-5 w-5 lg:h-[22px] lg:w-[22px]";

/**
 * 1. Search Action Button
 */
export function SearchButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Search"
      className="group relative flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full text-[#222222] transition-all duration-250 hover:bg-[#C5A572] hover:text-white active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2 cursor-pointer"
    >
      <Search className={ICON_CLASS_NAME} strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />
    </button>
  );
}

/**
 * 2. Account Action Button
 */
export function AccountButton({
  href,
  isImplemented = false,
  onClick,
}: {
  href?: string;
  isImplemented?: boolean;
  onClick?: () => void;
}) {
  const { customer, isAuthenticated, logoutCustomer } = useStorefront();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!mounted || !isAuthenticated) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Account"
        data-testid="account-action-button"
        className="group relative flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full text-[#222222] transition-all duration-250 hover:bg-[#C5A572] hover:text-white active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2 cursor-pointer"
      >
        <User className={ICON_CLASS_NAME} strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Account (${customer?.fullName})`}
        aria-expanded={isOpen}
        data-testid="account-action-button-authenticated"
        className="group relative flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full text-[#222222] transition-all duration-250 hover:bg-[#C5A572] hover:text-white active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2 cursor-pointer"
      >
        <User className={ICON_CLASS_NAME} strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#C5A572] ring-2 ring-white" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white p-4 shadow-xl border border-[#EAE6DF] z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="border-b border-[#EAE6DF] pb-3 mb-3">
            <p className="text-xs uppercase tracking-wider text-[#C5A572] font-semibold">
              Customer Account
            </p>
            <p className="text-sm font-medium text-[#111111] truncate mt-0.5">
              {customer?.fullName}
            </p>
            <p className="text-xs text-[#777777] truncate">{customer?.email}</p>
          </div>

          <div className="space-y-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#222222] hover:bg-[#FAF8F5] rounded-lg transition-colors"
            >
              <User className="h-4 w-4 text-[#666666]" />
              <span>My Profile</span>
            </Link>

            <Link
              href="/orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#222222] hover:bg-[#FAF8F5] rounded-lg transition-colors"
            >
              <Package className="h-4 w-4 text-[#666666]" />
              <span>My Orders</span>
            </Link>

            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await logoutCustomer();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer text-left"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 3. Wishlist Action Button
 */
export function WishlistButton({
  href,
  isImplemented = false,
  badgeCount,
  onClick,
}: {
  href?: string;
  isImplemented?: boolean;
  badgeCount?: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <Heart className={ICON_CLASS_NAME} strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />
      {badgeCount !== undefined && (
        <span
          data-testid="wishlist-badge"
          className="absolute top-0.5 right-0.5 flex h-4 min-w-4 lg:h-[18px] lg:min-w-[18px] items-center justify-center rounded-full bg-black px-1 text-[10px] lg:text-[11px] font-semibold leading-none text-white select-none transition-colors group-hover:ring-1 group-hover:ring-white"
        >
          {badgeCount}
        </span>
      )}
    </>
  );

  if (isImplemented && href) {
    return (
      <Link
        href={href}
        aria-label="Wishlist"
        className="group relative flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full text-[#222222] transition-all duration-250 hover:bg-[#C5A572] hover:text-white active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2 cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Wishlist"
      className="group relative flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full text-[#222222] transition-all duration-250 hover:bg-[#C5A572] hover:text-white active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2 cursor-pointer"
    >
      {content}
    </button>
  );
}

/**
 * 4. Cart Action Button (with circular count badge matching screenshot)
 */
export function CartButton({
  href,
  isImplemented = false,
  badgeCount,
  onClick,
}: {
  href?: string;
  isImplemented?: boolean;
  badgeCount?: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <ShoppingCart
        className={ICON_CLASS_NAME}
        strokeWidth={ICON_STROKE_WIDTH}
        aria-hidden="true"
      />
      {badgeCount !== undefined && (
        <span
          data-testid="cart-badge"
          className="absolute top-0.5 right-0.5 flex h-4 min-w-4 lg:h-[18px] lg:min-w-[18px] items-center justify-center rounded-full bg-black px-1 text-[10px] lg:text-[11px] font-semibold leading-none text-white select-none transition-colors group-hover:bg-[#111111] group-hover:ring-1 group-hover:ring-white"
        >
          {badgeCount}
        </span>
      )}
    </>
  );

  if (isImplemented && href) {
    return (
      <Link
        href={href}
        aria-label="Cart"
        className="group relative flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full text-[#222222] transition-all duration-250 hover:bg-[#C5A572] hover:text-white active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2 cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cart"
      className="group relative flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full text-[#222222] transition-all duration-250 hover:bg-[#C5A572] hover:text-white active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2 cursor-pointer"
    >
      {content}
    </button>
  );
}

/**
 * Right Group: Action icons (Search, Account, Wishlist, Cart in exact order).
 *
 * Characteristics:
 * - Minimalist outline style with consistent stroke weights.
 * - Accessible labels for screen readers.
 * - Handles unimplemented actions gracefully without fake feedback or dummy toasts.
 */
export function NavbarActions({
  actions,
  cartCount,
  wishlistCount,
  onSearchClick,
  onAccountClick,
  onWishlistClick,
  onCartClick,
}: NavbarActionsProps) {
  const accountAction = actions?.find((a) => a.id === "account");
  const wishlistAction = actions?.find((a) => a.id === "wishlist");
  const cartAction = actions?.find((a) => a.id === "cart");

  return (
    <div
      className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3"
      role="group"
      aria-label="Customer actions"
    >
      <SearchButton onClick={onSearchClick} />
      <AccountButton
        href={accountAction?.href}
        isImplemented={accountAction?.isImplemented}
        onClick={onAccountClick}
      />
      <WishlistButton
        href={wishlistAction?.href}
        isImplemented={wishlistAction?.isImplemented}
        badgeCount={wishlistCount}
        onClick={onWishlistClick}
      />
      <CartButton
        href={cartAction?.href}
        isImplemented={cartAction?.isImplemented}
        badgeCount={cartCount}
        onClick={onCartClick}
      />
    </div>
  );
}
