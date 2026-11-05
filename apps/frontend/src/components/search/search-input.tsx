"use client";

import React, { useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";

export interface SearchInputProps {
  query: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
  isLoading?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchInput({
  query,
  onChange,
  onClear,
  onClose,
  isLoading = false,
  inputRef: externalRef,
}: SearchInputProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef || internalRef;

  // Auto-focus input when the overlay opens
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [inputRef]);

  const handleClear = () => {
    onClear();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="relative flex items-center border-b border-[#EAE6DF] px-4 py-3.5 sm:px-6 sm:py-4.5 bg-transparent transition-colors">
      {/* 1. Subtle Search Icon */}
      <div className="flex h-8 w-8 items-center justify-center text-[#C5A572] flex-none" aria-hidden="true">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin stroke-[1.5]" />
        ) : (
          <Search className="h-5 w-5 stroke-[1.5]" />
        )}
      </div>

      {/* 2. Prominent Minimal Search Input */}
      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        data-testid="search-overlay-input"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search jewellery, rings, necklaces..."
        aria-label="Search jewellery catalogue"
        className="mx-2.5 sm:mx-3 flex-1 bg-transparent text-sm sm:text-base font-normal text-[#111111] placeholder:text-[#888888] focus:outline-none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />

      {/* 3. Action Controls (Clear + Close) */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 flex-none">
        {/* Clear Button */}
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            data-testid="search-clear-button"
            aria-label="Clear search input"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#888888] transition-colors hover:bg-[#C5A572]/15 hover:text-[#C5A572] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] cursor-pointer"
          >
            <X className="h-4 w-4 stroke-[1.6]" aria-hidden="true" />
          </button>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          data-testid="search-close-button"
          aria-label="Close search overlay"
          className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full text-[#222222] transition-colors hover:bg-[#C5A572]/15 hover:text-[#C5A572] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] cursor-pointer"
        >
          <X className="h-4.5 w-4.5 stroke-[1.5]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
