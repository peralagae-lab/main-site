"use client";

import React, { useEffect, useRef } from "react";
import { X, SlidersHorizontal, Loader2 } from "lucide-react";
import { ShopSidebar, type ShopSidebarProps } from "./shop-sidebar";

export interface MobileFilterDrawerProps extends ShopSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilterCount: number;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  activeFilterCount,
  ...sidebarProps
}: MobileFilterDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Trap focus and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore upon close
    const previousActiveElement = document.activeElement as HTMLElement | null;

    // Focus close button on open
    closeButtonRef.current?.focus();

    // Prevent background scrolling
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filter Products Drawer"
      className="fixed inset-0 z-50 flex lg:hidden"
    >
      {/* Backdrop Fade */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Panel from Left */}
      <div
        ref={drawerRef}
        className="relative flex h-full w-[85vw] max-w-[360px] flex-col bg-white shadow-2xl z-10 transition-transform duration-300 ease-out"
      >
        {/* Drawer Header */}
        <div className="flex h-14 sm:h-16 flex-none items-center justify-between border-b border-[#E5E5E5] px-5 sm:px-6 bg-white">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#111111]" />
            <h2 className="text-sm font-semibold tracking-wider uppercase text-[#111111]">
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </h2>
            {sidebarProps.isLoading && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#EAE6DF] text-[10px] text-[#C5A572] font-medium">
                <Loader2 className="h-2.5 w-2.5 animate-spin text-[#C5A572]" />
                <span>updating</span>
              </span>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close filters drawer"
            suppressHydrationWarning
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#222222] hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Filter Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          <ShopSidebar {...sidebarProps} />
        </div>

        {/* Sticky Drawer Footer with Apply Action */}
        <div className="flex-none p-4 sm:p-5 border-t border-[#E5E5E5] bg-white">
          <button
            type="button"
            onClick={onClose}
            suppressHydrationWarning
            className="w-full py-3 bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-semibold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
          >
            {sidebarProps.isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C5A572]" />
                <span>Updating Results...</span>
              </>
            ) : (
              <span>Show Results</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
