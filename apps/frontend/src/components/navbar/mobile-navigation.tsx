"use client";

import React, { useEffect, useCallback, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { X, ChevronDown, Check, User, LogOut, Package } from "lucide-react";
import type { NavigationConfig } from "@/config/navigation";
import { scrollToSectionId, scrollToTop } from "@/lib/navigation";
import { useStorefront } from "@/providers/storefront-provider";
import { fetchPublicCategories, CATEGORIES_UPDATED_EVENT } from "@/services/category-public-service";
import type { CategoryItem } from "@/types/category";

export interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  config: NavigationConfig;
}

const DEFAULT_LANGUAGES = ["English", "Français", "Deutsch", "Español", "Hindi"];
const DEFAULT_CURRENCIES = ["$ Dollar (US)", "₹ Rupees (INR)", "€ Euro (EUR)", "£ Pound (GBP)"];

/**
 * Mobile Navigation Drawer.
 *
 * Implements:
 * - Silky smooth slide-in and slide-out transitions with backdrop fade.
 * - Top Header: Brand Wordmark (PERALAGAE) + Close 'X' button with light neutral background.
 * - Tabs Bar: 'MENU' and 'CATEGORIES' with solid black indicator underline for active tab.
 * - Tab 1 (MENU): Shows the exact primary navbar links (Home, Shop, Contact, New Arrivals).
 * - Tab 2 (CATEGORIES): Categories list (New Products, Today On Sale, Special Offer!, Necklaces, Rings, Bracelets, Earnings, Charm & Dangles, Watches, Gift Ideas).
 * - Bottom Footer: Border-top with English ⌵ and $ Dollar (US) ⌵ dropdown selectors.
 */
export function MobileNavigation({ isOpen, onClose, config }: MobileNavigationProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [active, setActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"menu" | "categories">("menu");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    config.utility.language || "English",
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>("$ Dollar (US)");
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

  // Dynamic Categories from MongoDB
  const [dbCategories, setDbCategories] = useState<CategoryItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingCategories(true);
    fetchPublicCategories()
      .then((cats) => {
        if (isMounted) {
          setDbCategories(cats || []);
          setIsLoadingCategories(false);
        }
      })
      .catch((err) => {
        console.warn("[MobileNavigation] Failed to fetch public categories:", err);
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      });

    const handleCategoryUpdate = () => {
      fetchPublicCategories().then((cats) => {
        if (isMounted) setDbCategories(cats || []);
      });
    };

    window.addEventListener(CATEGORIES_UPDATED_EVENT, handleCategoryUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener(CATEGORIES_UPDATED_EVENT, handleCategoryUpdate);
    };
  }, [isOpen]);

  const langRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const currentPathname = pathname || "/";
  const router = useRouter();
  const { customer, isAuthenticated, logoutCustomer, openAuthModal } = useStorefront();

  const [activeHash, setActiveHash] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.location.hash || "";
    }
    return "";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateHash = () => {
      setActiveHash(window.location.hash || "");
    };

    updateHash();
    const raf = requestAnimationFrame(updateHash);
    const timeout = setTimeout(updateHash, 60);

    window.addEventListener("hashchange", updateHash);
    window.addEventListener("popstate", updateHash);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("popstate", updateHash);
    };
  }, [currentPathname]);

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href?: string
  ) => {
    handleClose();

    if (!href) return;

    if (href.startsWith("/#") && typeof window !== "undefined") {
      const targetId = href.replace("/#", "");

      if (currentPathname === "/") {
        e.preventDefault();
        scrollToSectionId(targetId);
        setActiveHash(`#${targetId}`);
      } else {
        e.preventDefault();
        setActiveHash(`#${targetId}`);
        router.push(href);
      }
    } else if (href === "/" && currentPathname === "/" && typeof window !== "undefined") {
      if (window.location.hash || window.scrollY > 50) {
        e.preventDefault();
        scrollToTop();
        setActiveHash("");
      }
    } else if (href.startsWith("/")) {
      setActiveHash("");
    }
  };

  const isItemActive = (href?: string) => {
    if (!href) return false;

    const onHomepage = currentPathname === "/";

    if (href === "/#new-arrivals" || href === "/#new-collection") {
      return onHomepage && (activeHash === "#new-arrivals" || activeHash === "#new-collection");
    }

    if (href === "/") {
      return onHomepage && activeHash !== "#new-arrivals" && activeHash !== "#new-collection";
    }

    const cleanHref = href.split("?")[0].split("#")[0];
    return currentPathname === cleanHref || currentPathname.startsWith(`${cleanHref}/`);
  };

  // Smooth slide-in animation when opened
  useEffect(() => {
    let raf: number;
    if (isOpen) {
      raf = requestAnimationFrame(() => {
        setActive(true);
      });
    } else {
      raf = requestAnimationFrame(() => {
        setActive(false);
      });
    }
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setActive(false);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  const isVisible = isOpen || isClosing;

  // Lock body scroll when mobile menu is visible
  useEffect(() => {
    if (isVisible) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isVisible]);

  // Handle escape key to dismiss smoothly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        if (isLangOpen) {
          setIsLangOpen(false);
          return;
        }
        if (isCurrencyOpen) {
          setIsCurrencyOpen(false);
          return;
        }
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, isLangOpen, isCurrencyOpen, handleClose]);

  // Click outside listener for dropdown popups
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setIsCurrencyOpen(false);
      }
    };

    if (isLangOpen || isCurrencyOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isLangOpen, isCurrencyOpen]);

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
      className="fixed inset-0 z-50 flex lg:hidden"
    >
      {/* Backdrop with smooth fade in/out */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${
          active ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel with smooth slide in/out */}
      <div
        className={`relative flex h-full w-[85vw] max-w-[340px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          active ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* 1. Top Header inside drawer: Brand + Close Icon */}
        <div className="flex h-14 sm:h-16 flex-none items-center justify-between border-b border-[#E5E5E5] bg-[#F7F7F7] px-6">
          {config.brand.logoSrc ? (
            <div className="flex items-center">
              <Image
                src={config.brand.logoSrc}
                alt={`${config.brand.name} Fine Jewellery`}
                width={config.brand.logoWidth ?? 1308}
                height={config.brand.logoHeight ?? 537}
                className="h-7 sm:h-8 w-auto max-w-[140px] object-contain"
              />
              <span className="sr-only">{config.brand.name}</span>
            </div>
          ) : (
            <span className="font-sans text-xl sm:text-2xl font-normal tracking-[0.18em] text-[#111111] uppercase">
              {config.brand.name}
            </span>
          )}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#222222] transition-colors hover:bg-neutral-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <X className="h-5 w-5 stroke-[1.25]" aria-hidden="true" />
          </button>
        </div>

        {/* 2. Tabs Bar: MENU | CATEGORIES */}
        <div
          role="tablist"
          aria-label="Mobile Menu Categories"
          className="flex flex-none items-center gap-8 border-b border-[#E5E5E5] bg-white px-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "menu"}
            aria-controls="mobile-tab-panel"
            onClick={() => setActiveTab("menu")}
            className={`relative py-3.5 text-[13px] sm:text-sm font-semibold tracking-wider uppercase transition-colors focus-visible:outline-none ${
              activeTab === "menu"
                ? "border-b-2 border-black text-[#111111] -mb-[1px]"
                : "border-b-2 border-transparent text-[#767676] hover:text-[#111111] -mb-[1px]"
            }`}
          >
            Menu
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "categories"}
            aria-controls="mobile-tab-panel"
            onClick={() => setActiveTab("categories")}
            className={`relative py-3.5 text-[13px] sm:text-sm font-semibold tracking-wider uppercase transition-colors focus-visible:outline-none ${
              activeTab === "categories"
                ? "border-b-2 border-black text-[#111111] -mb-[1px]"
                : "border-b-2 border-transparent text-[#767676] hover:text-[#111111] -mb-[1px]"
            }`}
          >
            Categories
          </button>
        </div>

        {/* 3. Tab Content Area (Scrollable) */}
        <div id="mobile-tab-panel" className="flex-1 overflow-y-auto px-6 py-3">
          {activeTab === "menu" ? (
            <nav aria-label="Mobile Menu Navigation">
              <ul className="space-y-1" role="list">
                {config.primaryNav
                  .filter(
                    (item) => item.id !== "materials" && item.label.toLowerCase() !== "materials"
                  )
                  .map((item) => {
                    const isActive = isItemActive(item.href);

                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href || "#"}
                          onClick={(e) => handleLinkClick(e, item.href)}
                          aria-current={isActive ? "page" : undefined}
                          className={`group relative flex items-center justify-between py-2.5 text-[15px] font-medium tracking-wide transition-colors duration-250 ${
                            isActive
                              ? "text-[#C5A572] font-semibold"
                              : "text-[#111111] hover:text-[#C5A572]"
                          }`}
                        >
                          <span className="relative inline-block">
                            {item.label}
                            <span
                              className={`absolute -bottom-1 left-0 h-[1.5px] w-full bg-[#C5A572] origin-left transition-all duration-300 ease-out motion-reduce:transition-none pointer-events-none ${
                                isActive
                                  ? "scale-x-100 opacity-100"
                                  : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100"
                              }`}
                              aria-hidden="true"
                            />
                          </span>
                          {isActive && (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-[#C5A572]"
                              aria-hidden="true"
                            />
                          )}
                        </Link>
                      </li>
                    );
                  })}

                {/* Account & Profile Options */}
                <li className="pt-4 mt-4 border-t border-[#EAE6DF]">
                  {isAuthenticated && customer ? (
                    <div className="space-y-1">
                      <div className="pb-2">
                        <p className="text-[11px] font-semibold text-[#C5A572] uppercase tracking-wider">
                          Signed in as
                        </p>
                        <p className="text-sm font-medium text-[#111111] truncate">{customer.fullName}</p>
                      </div>
                      <Link
                        href="/profile"
                        onClick={handleClose}
                        className="flex items-center gap-2.5 py-2 text-sm font-medium text-[#222222] hover:text-[#C5A572] transition-colors"
                      >
                        <User className="h-4 w-4 text-[#666666]" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        href="/orders"
                        onClick={handleClose}
                        className="flex items-center gap-2.5 py-2 text-sm font-medium text-[#222222] hover:text-[#C5A572] transition-colors"
                      >
                        <Package className="h-4 w-4 text-[#666666]" />
                        <span>My Orders</span>
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          handleClose();
                          await logoutCustomer();
                        }}
                        className="w-full flex items-center gap-2.5 py-2 text-sm font-medium text-[#DC2626] hover:text-[#B91C1C] text-left cursor-pointer transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        openAuthModal("login");
                      }}
                      className="w-full flex items-center gap-2.5 py-2 text-sm font-medium text-[#222222] hover:text-[#C5A572] active:text-[#B3935F] cursor-pointer text-left transition-colors"
                    >
                      <User className="h-4 w-4 text-[#666666]" />
                      <span>Sign In / Register</span>
                    </button>
                  )}
                </li>
              </ul>
            </nav>
          ) : (
            <nav aria-label="Mobile Categories Navigation">
              {isLoadingCategories ? (
                <div className="space-y-3 py-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-8 bg-neutral-100 rounded animate-pulse w-3/4"
                    />
                  ))}
                </div>
              ) : dbCategories.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#888888] italic">
                  No categories found.
                </div>
              ) : (
                <ul className="space-y-1" role="list">
                  {dbCategories.map((cat) => (
                    <li key={cat.id || cat.slug}>
                      <Link
                        href={`/shop?category=${encodeURIComponent(cat.slug || cat.id)}`}
                        onClick={handleClose}
                        className="block py-2.5 text-[15px] font-medium tracking-wide text-[#111111] transition-colors hover:text-[#C5A572] active:text-[#B3935F]"
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </nav>
          )}
        </div>

        {/* 4. Bottom Footer Bar: English ⌵ & $ Dollar (US) ⌵ */}
        <div className="relative flex-none border-t border-[#E5E5E5] bg-white px-6 py-4">
          <div className="flex items-center justify-between text-sm text-[#222222]">
            {/* Language Dropdown Selector */}
            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => {
                  setIsLangOpen(!isLangOpen);
                  setIsCurrencyOpen(false);
                }}
                aria-expanded={isLangOpen}
                aria-haspopup="listbox"
                className="flex items-center gap-1.5 py-1 text-sm font-normal text-[#222222] transition-colors hover:text-[#C5A572] active:text-[#B3935F] focus-visible:outline-none"
              >
                <span>{selectedLanguage}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 stroke-[1.5] text-[#666666] transition-transform duration-200 ${
                    isLangOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isLangOpen && (
                <div
                  role="listbox"
                  className="absolute bottom-full left-0 z-30 mb-2 w-36 rounded-md border border-[#E5E5E5] bg-white py-1 shadow-lg"
                >
                  {DEFAULT_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      role="option"
                      aria-selected={selectedLanguage === lang}
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setIsLangOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-[#222222] hover:bg-neutral-100"
                    >
                      <span>{lang}</span>
                      {selectedLanguage === lang && (
                        <Check className="h-3.5 w-3.5 stroke-[2] text-black" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currency Dropdown Selector */}
            <div className="relative" ref={currencyRef}>
              <button
                type="button"
                onClick={() => {
                  setIsCurrencyOpen(!isCurrencyOpen);
                  setIsLangOpen(false);
                }}
                aria-expanded={isCurrencyOpen}
                aria-haspopup="listbox"
                className="flex items-center gap-1.5 py-1 text-sm font-normal text-[#222222] transition-colors hover:text-[#C5A572] active:text-[#B3935F] focus-visible:outline-none"
              >
                <span>{selectedCurrency}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 stroke-[1.5] text-[#666666] transition-transform duration-200 ${
                    isCurrencyOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isCurrencyOpen && (
                <div
                  role="listbox"
                  className="absolute bottom-full right-0 z-30 mb-2 w-44 rounded-md border border-[#E5E5E5] bg-white py-1 shadow-lg"
                >
                  {DEFAULT_CURRENCIES.map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      role="option"
                      aria-selected={selectedCurrency === curr}
                      onClick={() => {
                        setSelectedCurrency(curr);
                        setIsCurrencyOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-[#222222] hover:bg-neutral-100"
                    >
                      <span>{curr}</span>
                      {selectedCurrency === curr && (
                        <Check className="h-3.5 w-3.5 stroke-[2] text-black" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
