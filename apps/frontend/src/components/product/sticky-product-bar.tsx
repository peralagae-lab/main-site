"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingBag, Check } from "lucide-react";
import type { Product } from "@/types/product";
import { formatInr } from "@/lib/utils";
import { useStorefront } from "@/providers/storefront-provider";

export interface StickyProductBarProps {
  product: Product;
}

export function StickyProductBar({ product }: StickyProductBarProps) {
  const { addToCart } = useStorefront();
  const [isVisible, setIsVisible] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar when scrolled past 650px (after the main add to cart button)
      const scrolled = window.scrollY > 650;
      setIsVisible(scrolled);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleQuickAdd = () => {
    addToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  if (!isVisible) return null;

  return (
    <div
      aria-label="Quick purchase bar"
      className="fixed bottom-0 left-0 right-0 z-30 hidden sm:block border-t border-[#E5E5E5] bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-lg transition-all duration-300 animate-slide-up"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Product Preview */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative h-12 w-12 flex-none overflow-hidden rounded-[2px] bg-[#F7F7F7] border border-[#EEEEEE]">
            <Image
              src={product.image.src}
              alt={product.image.alt || product.name}
              fill
              sizes="48px"
              className="object-contain p-1"
            />
          </div>
          <div className="truncate">
            <h4 className="truncate text-xs sm:text-sm font-medium text-[#111111]">
              {product.name}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-[#111111]">
                {formatInr(product.priceInr)}
              </span>
              {product.compareAtPriceInr && product.compareAtPriceInr > product.priceInr && (
                <span className="text-[11px] text-[#888888] line-through font-normal">
                  {formatInr(product.compareAtPriceInr)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 flex-none">
          <button
            onClick={handleQuickAdd}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all duration-250 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] ${
              justAdded
                ? "bg-emerald-700 text-white"
                : "bg-[#111111] text-white hover:bg-[#C5A572] active:bg-[#B3935F] active:scale-[0.99]"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
