"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface ShopPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function ShopPagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: ShopPaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers array
  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <nav
      aria-label="Shop product catalog pagination"
      className={`flex items-center justify-center gap-1.5 sm:gap-2 mt-10 sm:mt-14 ${className}`}
    >
      {/* Previous Page Button */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
        suppressHydrationWarning
        className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-none border border-[#E0E0E0] text-[#111111] transition-colors hover:border-[#C5A572] hover:text-[#C5A572] active:bg-[#B3935F]/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#E0E0E0] disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
      >
        <ChevronLeft className="h-4 w-4 stroke-[1.75]" />
      </button>

      {/* Page Number Buttons */}
      {pages.map((pageNum) => {
        const isCurrent = pageNum === currentPage;
        return (
          <button
            key={`page-${pageNum}`}
            type="button"
            onClick={() => onPageChange(pageNum)}
            aria-label={`Go to page ${pageNum}`}
            aria-current={isCurrent ? "page" : undefined}
            suppressHydrationWarning
            className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-none text-xs sm:text-sm font-semibold tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black ${
              isCurrent
                ? "bg-black text-white border border-black"
                : "border border-[#E0E0E0] text-[#111111] hover:border-[#C5A572] hover:text-[#C5A572] active:bg-[#B3935F]/10"
            }`}
          >
            {pageNum}
          </button>
        );
      })}

      {/* Next Page Button */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
        suppressHydrationWarning
        className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-none border border-[#E0E0E0] text-[#111111] transition-colors hover:border-[#C5A572] hover:text-[#C5A572] active:bg-[#B3935F]/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#E0E0E0] disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
      >
        <ChevronRight className="h-4 w-4 stroke-[1.75]" />
      </button>
    </nav>
  );
}
