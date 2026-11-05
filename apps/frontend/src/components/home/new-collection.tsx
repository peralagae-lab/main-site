"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "./product-card";
import { ProductQuickView } from "./product-quick-view";
import type { Product } from "@/types/product";
import {
  type NewCollectionConfig,
  defaultNewCollectionConfig,
} from "@/config/new-collection";
import { fetchNewArrivalsProducts } from "@/services/product-service";
import { PRODUCTS_UPDATED_EVENT } from "@/services/product-admin-service";
import { useStorefront } from "@/providers/storefront-provider";
import { scrollToSectionId } from "@/lib/navigation";

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!mediaQuery.addEventListener) return () => {};
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function subscribeMobile(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mediaQuery = window.matchMedia("(max-width: 639px)");
  if (!mediaQuery.addEventListener) return () => {};
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(max-width: 639px)").matches;
}

function getMobileServerSnapshot() {
  return false;
}

export interface NewCollectionSectionProps {
  config?: NewCollectionConfig;
  className?: string;
  initialProducts?: Product[];
}

/**
 * NewCollectionSection Component — PERALAGAE
 *
 * Database-driven New Arrivals Collection:
 * 1. Centred Section Header with flanking subtle divider lines and subtitle
 * 2. Fetches active, published products tagged with isNew from MongoDB
 * 3. Shows loading skeleton during initial fetch (never briefly flashes hardcoded data)
 * 4. Displays honest error state if database/API fails (never treats errors as empty or static fallback)
 * 5. Shows clean empty state if zero products are tagged
 * 6. Product Carousel displaying 2 products on mobile, 4 on desktop
 * 7. Real-time refetching when products are modified/saved in Admin
 * 8. Quick View modal, Wishlist, and Cart integration
 */
export function NewCollectionSection({
  config = defaultNewCollectionConfig,
  className = "",
  initialProducts,
}: NewCollectionSectionProps) {
  const { quickViewProduct, closeQuickView } = useStorefront();
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getMobileServerSnapshot,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const { heading, subtitle, autoRotateIntervalMs = 10000 } = config;

  // Database-driven New Arrivals query
  const {
    data: products = initialProducts ?? [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Product[], Error>({
    queryKey: ["public-products", "new-arrivals"],
    queryFn: () => fetchNewArrivalsProducts(100),
    initialData: initialProducts,
    staleTime: 30 * 1000,
  });

  // Listen for real-time updates broadcast by admin saves/deletions
  useEffect(() => {
    const handleProductsUpdated = () => {
      refetch();
    };
    window.addEventListener(PRODUCTS_UPDATED_EVENT, handleProductsUpdated);
    return () => {
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, handleProductsUpdated);
    };
  }, [refetch]);

  const headingWords = heading.split(" ");
  const firstHeadingPart = headingWords[0] ?? "New";
  const secondHeadingPart = headingWords.slice(1).join(" ") || "Collection";

  // On mobile (<640px): 2 items per page
  // On tablet & desktop (>=640px): 4 items per page
  const itemsPerPage = isMobile ? 2 : 4;
  const pages = useMemo(() => {
    if (!products || products.length === 0) return [];
    const chunks: Product[][] = [];
    for (let i = 0; i < products.length; i += itemsPerPage) {
      chunks.push(products.slice(i, i + itemsPerPage));
    }
    return chunks;
  }, [products, itemsPerPage]);

  const totalPages = pages.length;
  const activePage = currentPage >= totalPages ? 0 : currentPage;

  const goToNextPage = useCallback(() => {
    if (totalPages <= 1) return;
    setCurrentPage((prev) => (prev + 1) % totalPages);
  }, [totalPages]);

  const goToPrevPage = useCallback(() => {
    if (totalPages <= 1) return;
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  }, [totalPages]);

  // 10-second automatic rotation timer
  useEffect(() => {
    if (reducedMotion || totalPages <= 1 || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      goToNextPage();
    }, autoRotateIntervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [goToNextPage, totalPages, isPaused, reducedMotion, autoRotateIntervalMs]);

  // Pause timer on hover and focus
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);
  const handleFocus = () => setIsPaused(true);
  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsPaused(false);
    }
  };

  // Keyboard navigation for arrow keys
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      goToPrevPage();
    } else if (e.key === "ArrowRight") {
      goToNextPage();
    }
  };

  // Touch swipe handlers for smooth mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) {
      goToNextPage();
    } else if (distance < -45) {
      goToPrevPage();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Smooth scroll to New Arrivals section when URL hash matches #new-arrivals or #new-collection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const scrollToSection = () => {
      const hash = window.location.hash;
      if (hash === "#new-arrivals" || hash === "#new-collection") {
        requestAnimationFrame(() => {
          scrollToSectionId("new-arrivals", { updateHash: false });
        });
      }
    };

    scrollToSection();
    window.addEventListener("hashchange", scrollToSection);
    window.addEventListener("popstate", scrollToSection);
    return () => {
      window.removeEventListener("hashchange", scrollToSection);
      window.removeEventListener("popstate", scrollToSection);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      id="new-arrivals"
      aria-labelledby="new-collection-heading"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full overflow-hidden bg-white pt-10 sm:pt-16 lg:pt-20 pb-14 sm:pb-20 lg:pb-24 scroll-mt-28 lg:scroll-mt-32 ${className}`}
    >
      <div id="new-collection" className="mx-auto max-w-7xl 2xl:max-w-[1536px] 3xl:max-w-[1720px] px-3 sm:px-6 lg:px-8 2xl:px-12">
        {/* 1. SECTION HEADER: Centred heading with flanking horizontal lines and subtitle */}
        <div className="flex flex-col items-center justify-center text-center mb-7 sm:mb-12 lg:mb-14">
          <div className="flex items-center justify-center w-full gap-3 sm:gap-6">
            <span
              className="h-[1px] w-8 sm:w-20 lg:w-28 bg-[#D8D8D8]"
              aria-hidden="true"
            />
            <h2
              id="new-collection-heading"
              className="text-2xl sm:text-3xl lg:text-[32px] font-normal tracking-[-0.01em] text-[#111111] leading-[1.2] px-2 text-center"
            >
              <span className="block sm:inline">{firstHeadingPart} </span>
              {headingWords.length > 1 && (
                <span className="block sm:inline">{secondHeadingPart}</span>
              )}
            </h2>
            <span
              className="h-[1px] w-8 sm:w-20 lg:w-28 bg-[#D8D8D8]"
              aria-hidden="true"
            />
          </div>

          {subtitle && (
            <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-[#666666] font-normal tracking-normal max-w-[280px] sm:max-w-md mx-auto text-center leading-relaxed">
              Collect your loves with our newest<br className="sm:hidden" /> arrivals.
            </p>
          )}
        </div>

        {/* 2. LOADING STATE: Sleek skeleton cards (No hardcoded fallback products) */}
        {isLoading && (
          <div
            data-testid="new-collection-loading"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6"
          >
            {[...Array(itemsPerPage)].map((_, idx) => (
              <div key={idx} className="flex flex-col space-y-3">
                <div className="aspect-square w-full bg-[#F3F4F6] animate-pulse rounded border border-[#E5E5E5]" />
                <div className="h-3 w-1/3 bg-[#E5E7EB] animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-[#E5E7EB] animate-pulse rounded" />
                <div className="h-4 w-1/4 bg-[#E5E7EB] animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}

        {/* 3. ERROR STATE: Honest error UI without silent empty collection or static fallback */}
        {!isLoading && isError && (
          <div
            data-testid="new-collection-error"
            className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto text-center bg-[#FEF2F2] border border-[#FCA5A5] rounded"
          >
            <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#DC2626] mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#991B1B] mb-1">
              Unable to Load New Arrivals
            </h3>
            <p className="text-xs text-[#B91C1C] mb-4 leading-relaxed">
              {error?.message || "A database connection issue occurred while retrieving the new collection."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111111] text-white hover:bg-[#C5A572] rounded text-xs uppercase tracking-wider font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* 4. CLEAN EMPTY STATE: Displayed when database returns 0 tagged products */}
        {!isLoading && !isError && products.length === 0 && (
          <div
            data-testid="new-collection-empty"
            className="flex flex-col items-center justify-center py-12 px-6 max-w-md mx-auto text-center border border-[#EAEAEA] rounded bg-[#FAFAFA]"
          >
            <p className="text-sm font-medium text-[#222222] mb-1">
              No New Arrivals Currently Available
            </p>
            <p className="text-xs text-[#666666] leading-relaxed">
              Check back soon to explore our newest handcrafted fine jewellery creations.
            </p>
          </div>
        )}

        {/* 5. DATABASE PRODUCTS CAROUSEL */}
        {!isLoading && !isError && products.length > 0 && (
          <div className="relative group/carousel">
            {/* Previous Arrow Button (Desktop & Tablet) */}
            {totalPages > 1 && (
              <button
                type="button"
                onClick={goToPrevPage}
                aria-label="Previous products"
                suppressHydrationWarning
                className="hidden sm:flex absolute -left-3 sm:-left-5 lg:-left-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-[#222222] shadow-md border border-neutral-100 transition-all duration-250 hover:bg-[#C5A572] hover:text-white hover:border-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5 stroke-[1.5]" aria-hidden="true" />
              </button>
            )}

            {/* Next Arrow Button (Desktop & Tablet) */}
            {totalPages > 1 && (
              <button
                type="button"
                onClick={goToNextPage}
                aria-label="Next products"
                suppressHydrationWarning
                className="hidden sm:flex absolute -right-3 sm:-right-5 lg:-right-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-[#222222] shadow-md border border-neutral-100 transition-all duration-250 hover:bg-[#C5A572] hover:text-white hover:border-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer"
              >
                <ChevronRight className="h-5 w-5 stroke-[1.5]" aria-hidden="true" />
              </button>
            )}

            {/* Carousel Viewport Container */}
            <div className="overflow-hidden w-full">
              <div
                className={`flex ${
                  reducedMotion ? "" : "transition-transform duration-700 ease-in-out"
                }`}
                style={{ transform: `translateX(-${activePage * 100}%)` }}
              >
                {pages.map((pageProducts, pageIdx) => (
                  <div
                    key={`page-${pageIdx}`}
                    className="w-full shrink-0"
                    aria-hidden={pageIdx !== activePage}
                  >
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6 2xl:gap-8">
                      {pageProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. PAGINATION DOTS: Clean circular indicators */}
        {!isLoading && !isError && totalPages > 1 && (
          <div
            className="flex items-center justify-center gap-2 sm:gap-2.5 mt-7 sm:mt-10"
            role="tablist"
            aria-label="Product carousel pages"
          >
            {pages.map((_, idx) => (
              <button
                key={`dot-${idx}`}
                type="button"
                role="tab"
                aria-selected={idx === activePage}
                aria-label={`Go to carousel page ${idx + 1}`}
                onClick={() => setCurrentPage(idx)}
                suppressHydrationWarning
                className={`h-2 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer ${
                  idx === activePage
                    ? "w-6 bg-[#C5A572]"
                    : "w-2 bg-neutral-300 hover:bg-[#C5A572]/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 7. ACCESSIBLE PRODUCT QUICK VIEW DIALOG */}
      <ProductQuickView
        product={quickViewProduct}
        isOpen={Boolean(quickViewProduct)}
        onClose={closeQuickView}
      />
    </section>
  );
}
