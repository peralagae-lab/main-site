"use client";

import React from "react";
import { SlidersHorizontal, ChevronDown, Loader2 } from "lucide-react";
import type { SortOption } from "@/services/product-service";

export type ViewMode = "list" | "grid-2" | "grid-3" | "grid-4";

export interface ProductToolbarProps {
  total: number;
  fromIndex: number;
  toIndex: number;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenMobileFilters: () => void;
  activeFilterCount: number;
  isLoading?: boolean;
  className?: string;
}

/**
 * ProductToolbar Component — PERALAGAE
 *
 * Implements:
 * A. Accurate Product Count ("1–12 of 24 products")
 * B. Sort By dropdown (Default, Price Low-High, Price High-Low, Newest First, Name A-Z, Name Z-A)
 * C. 4 View Controls (List View, 2-Column Grid, 3-Column Grid, 4-Column Grid)
 * D. Mobile Filter trigger button
 */
export function ProductToolbar({
  total,
  fromIndex,
  toIndex,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  onOpenMobileFilters,
  activeFilterCount,
  isLoading = false,
  className = "",
}: ProductToolbarProps) {
  return (
    <div
      role="region"
      aria-label="Product catalogue controls"
      className={`w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3 sm:py-4 border-b border-[#E5E5E5] bg-white ${className}`}
    >
      {/* Left Area: Mobile Filter Trigger & Product Count */}
      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
        {/* Mobile Filters Trigger Button (< lg) */}
        <button
          type="button"
          onClick={onOpenMobileFilters}
          suppressHydrationWarning
          aria-label="Open product filters"
          className="lg:hidden flex items-center gap-2 px-3.5 py-2 border border-[#111111] text-[#111111] text-xs font-semibold tracking-wider uppercase transition-colors hover:border-[#C5A572] hover:bg-[#C5A572] active:bg-[#B3935F] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-black text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Product Count Announcement & Loading State */}
        <div
          role="status"
          aria-live="polite"
          className="text-xs sm:text-[13px] text-[#666666] tracking-wide flex items-center gap-2"
        >
          {total === 0 ? (
            <span>0 products</span>
          ) : (
            <span>
              Showing <strong className="font-semibold text-[#111111]">{fromIndex}–{toIndex}</strong> of{" "}
              <strong className="font-semibold text-[#111111]">{total}</strong> products
            </span>
          )}
          {isLoading && (
            <span
              data-testid="toolbar-loading"
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#EAE6DF] text-xs text-[#C5A572] font-medium animate-pulse"
            >
              <Loader2 className="h-3 w-3 animate-spin text-[#C5A572]" />
              <span>Updating...</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Area: Sort Dropdown & 4 View Mode Controls */}
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto">
        {/* Sort By Dropdown */}
        <div className="relative flex items-center">
          <label htmlFor="shop-sort-select" className="sr-only">
            Sort products
          </label>
          <div className="relative">
            <select
              id="shop-sort-select"
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              suppressHydrationWarning
              className="appearance-none bg-transparent border border-[#CCCCCC] hover:border-[#C5A572] focus:border-[#C5A572] py-1.5 pl-3 pr-8 text-xs sm:text-[13px] text-[#111111] font-medium tracking-wide outline-none cursor-pointer transition-colors focus-visible:ring-1 focus-visible:ring-[#C5A572]"
            >
              <option value="default">Default Sorting</option>
              <option value="price-low-to-high">Price: Low to High</option>
              <option value="price-high-to-low">Price: High to Low</option>
              <option value="newest">Newest First</option>
              <option value="name-a-z">Name: A to Z</option>
              <option value="name-z-a">Name: Z to A</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#666666]" />
          </div>
        </div>

        {/* Four Product View Controls (Desktop & Tablet) */}
        <div
          role="group"
          aria-label="Product layout view options"
          className="hidden sm:flex items-center gap-1 border-l border-[#E5E5E5] pl-3 sm:pl-4"
        >
          {/* 1. List View (1 Column) */}
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            aria-label="List view (1 column)"
            aria-pressed={viewMode === "list"}
            suppressHydrationWarning
            className={`p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black ${
              viewMode === "list"
                ? "text-black bg-neutral-100 rounded-sm"
                : "text-[#888888] hover:text-black"
            }`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="1" y="2" width="14" height="3" rx="0.5" />
              <rect x="1" y="6.5" width="14" height="3" rx="0.5" />
              <rect x="1" y="11" width="14" height="3" rx="0.5" />
            </svg>
          </button>

          {/* 2. Two-Column Grid */}
          <button
            type="button"
            onClick={() => onViewModeChange("grid-2")}
            aria-label="2 columns grid"
            aria-pressed={viewMode === "grid-2"}
            suppressHydrationWarning
            className={`p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black ${
              viewMode === "grid-2"
                ? "text-black bg-neutral-100 rounded-sm"
                : "text-[#888888] hover:text-black"
            }`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="5" height="12" rx="0.5" />
              <rect x="9" y="2" width="5" height="12" rx="0.5" />
            </svg>
          </button>

          {/* 3. Three-Column Grid */}
          <button
            type="button"
            onClick={() => onViewModeChange("grid-3")}
            aria-label="3 columns grid"
            aria-pressed={viewMode === "grid-3"}
            suppressHydrationWarning
            className={`p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black ${
              viewMode === "grid-3"
                ? "text-black bg-neutral-100 rounded-sm"
                : "text-[#888888] hover:text-black"
            }`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="1" y="2" width="3.8" height="12" rx="0.5" />
              <rect x="6.1" y="2" width="3.8" height="12" rx="0.5" />
              <rect x="11.2" y="2" width="3.8" height="12" rx="0.5" />
            </svg>
          </button>

          {/* 4. Four-Column Grid */}
          <button
            type="button"
            onClick={() => onViewModeChange("grid-4")}
            aria-label="4 columns grid"
            aria-pressed={viewMode === "grid-4"}
            suppressHydrationWarning
            className={`p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black ${
              viewMode === "grid-4"
                ? "text-black bg-neutral-100 rounded-sm"
                : "text-[#888888] hover:text-black"
            }`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="1" y="2" width="2.5" height="12" rx="0.5" />
              <rect x="4.8" y="2" width="2.5" height="12" rx="0.5" />
              <rect x="8.6" y="2" width="2.5" height="12" rx="0.5" />
              <rect x="12.4" y="2" width="2.5" height="12" rx="0.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
