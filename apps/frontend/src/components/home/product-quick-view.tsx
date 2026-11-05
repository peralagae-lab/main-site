"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, Heart, ShoppingBag, Check } from "lucide-react";
import type { Product } from "@/types/product";
import { formatInr } from "@/lib/utils";
import { useStorefront } from "@/providers/storefront-provider";

export interface ProductQuickViewProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ProductQuickView Modal Dialog
 *
 * Implements accessible, responsive modal dialog for inspecting product details,
 * INR pricing, specifications, and adding to cart/wishlist directly.
 */
export function ProductQuickView({ product, isOpen, onClose }: ProductQuickViewProps) {
  const { isWishlisted, toggleWishlist, addToCart } = useStorefront();
  const [justAdded, setJustAdded] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Lock body scroll while dialog is open
    document.body.style.overflow = "hidden";

    // Focus close button on mount
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) {
    return null;
  }

  const isFavorite = isWishlisted(product.id);

  const handleAddToCart = () => {
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl overflow-hidden bg-white shadow-2xl rounded-none border border-neutral-200 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute top-4 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#222222] shadow-sm hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
          {/* Left: Square Product Image */}
          <div className="relative aspect-square w-full bg-[#F2F2F2] overflow-hidden">
            <Image
              src={product.image.src}
              alt={product.image.alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            {product.isHot && (
              <span className="absolute top-3 left-3 bg-[#D9383A] text-white text-[10px] font-bold tracking-widest px-2 py-0.5 uppercase">
                HOT
              </span>
            )}
            {!product.isHot && product.isNew && (
              <span className="absolute top-3 left-3 bg-[#111111] text-white text-[10px] font-bold tracking-widest px-2 py-0.5 uppercase">
                NEW
              </span>
            )}
          </div>

          {/* Right: Product Meta & Purchase Actions */}
          <div className="flex flex-col justify-between text-left">
            <div>
              {/* Category */}
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#777777] mb-1.5 block">
                {product.category}
              </span>

              {/* Title */}
              <h2
                id="quick-view-title"
                className="text-xl sm:text-2xl font-normal text-[#111111] leading-tight mb-3"
              >
                {product.name}
              </h2>

              {/* Price in INR */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl sm:text-2xl font-semibold text-[#111111]">
                  {formatInr(product.priceInr)}
                </span>
                {product.compareAtPriceInr && (
                  <span className="text-sm text-[#888888] line-through font-normal">
                    {formatInr(product.compareAtPriceInr)}
                  </span>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-xs sm:text-[13.5px] text-[#555555] leading-relaxed mb-4">
                  {product.description}
                </p>
              )}

              {/* Material Spec */}
              {product.material && (
                <div className="mb-6 pt-3 border-t border-neutral-100 text-xs text-[#666666]">
                  <span className="font-medium text-[#222222]">Material: </span>
                  <span>{product.material}</span>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleAddToCart}
                className={`w-full py-3 px-6 text-white text-xs font-semibold tracking-[0.1em] uppercase transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] ${
                  justAdded
                    ? "bg-[#C5A572]"
                    : "bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F]"
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span>Added to Bag</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                className={`w-full py-2.5 px-6 border text-xs font-medium tracking-[0.08em] uppercase transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                  isFavorite
                    ? "border-[#D9383A] text-[#D9383A] bg-red-50/50"
                    : "border-neutral-300 text-[#222222] hover:border-[#C5A572] hover:text-[#C5A572]"
                }`}
              >
                <Heart
                  className={`h-4 w-4 ${isFavorite ? "fill-[#D9383A]" : ""}`}
                  aria-hidden="true"
                />
                <span>{isFavorite ? "In Wishlist" : "Add to Wishlist"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
