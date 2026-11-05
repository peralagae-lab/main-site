"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Check } from "lucide-react";
import type { Product } from "@/types/product";
import { formatInr } from "@/lib/utils";
import { useStorefront } from "@/providers/storefront-provider";

export interface ProductCardProps {
  product: Product;
  className?: string;
  dataTestId?: string;
  onQuickView?: (product: Product) => void;
}

/**
 * ProductCard Component — PERALAGAE
 *
 * Implements the luxury jewellery catalogue card matching the reference:
 * - Square image container on uniform light-grey studio background (#F2F2F2) with thin border
 * - Upper-left product badge (HOT / NEW)
 * - Upper-right circular wishlist action button
 * - Slide-up Add to Cart action button on hover
 * - Left-aligned category label, product name, and formatted Indian Rupee (INR) price
 */
export function ProductCard({ product, className = "", dataTestId }: ProductCardProps) {
  const { isWishlisted, toggleWishlist, addToCart } = useStorefront();
  const [justAdded, setJustAdded] = useState(false);

  const isFavorite = isWishlisted(product.id);

  const isOutOfStock =
    product.inStock === false ||
    product.isAvailable === false ||
    (product.stockCount !== undefined && product.stockCount <= 0);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <article
      data-testid={dataTestId || `product-card-${product.id}`}
      className={`group relative flex flex-col w-full text-left bg-white transition-all duration-300 ${className}`}
    >
      {/* 1. Square Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#F2F2F2] border border-[#E5E5E5]">
        {/* Product Badge */}
        {isOutOfStock ? (
          <span
            data-testid="badge-out-of-stock"
            className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 bg-[#71717A] text-white text-[9.5px] sm:text-[10px] font-bold tracking-widest px-2 py-0.5 uppercase shadow-sm select-none"
          >
            Out of Stock
          </span>
        ) : product.isHot ? (
          <span
            data-testid="badge-hot"
            className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 bg-[#D9383A] text-white text-[9.5px] sm:text-[10px] font-bold tracking-widest px-2 py-0.5 uppercase shadow-sm select-none"
          >
            HOT
          </span>
        ) : product.isNew ? (
          <span
            data-testid="badge-new"
            className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 bg-[#111111] text-white text-[9.5px] sm:text-[10px] font-bold tracking-widest px-2 py-0.5 uppercase shadow-sm select-none"
          >
            NEW
          </span>
        ) : null}

        {/* Product Image */}
        <Link
          href={`/product/${product.slug}`}
          className="relative block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
          aria-label={product.name}
        >
          <Image
            src={product.image.src}
            alt={product.image.alt || product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </Link>

        {/* Action Controls: Circular white button on upper-right */}
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 flex flex-col gap-1.5">
          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleWishlistClick}
            aria-label={isFavorite ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            aria-pressed={isFavorite}
            suppressHydrationWarning
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white shadow-sm border border-[#EAEAEA] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer ${
              isFavorite ? "text-[#D9383A]" : "text-[#222222] hover:text-[#C5A572]"
            }`}
          >
            <Heart
              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isFavorite ? "fill-[#D9383A] text-[#D9383A]" : ""}`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Slide-Up Add to Cart Bar */}
        <div className="absolute bottom-0 inset-x-0 z-20 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 transition-all duration-300">
          <button
            type="button"
            onClick={handleAddToCartClick}
            disabled={isOutOfStock}
            aria-label={isOutOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
            suppressHydrationWarning
            className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 text-[11px] sm:text-xs font-semibold tracking-[0.08em] uppercase transition-all duration-200 flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer ${
              isOutOfStock
                ? "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed border-t border-[#E5E7EB]"
                : justAdded
                ? "bg-[#C5A572] text-white"
                : "bg-white/95 text-[#111111] hover:bg-[#C5A572] hover:text-white active:bg-[#B3935F] border-t border-[#E5E7EB]"
            }`}
          >
            {isOutOfStock ? (
              <span>Out of Stock</span>
            ) : justAdded ? (
              <>
                <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                <span>Added to Bag</span>
              </>
            ) : (
              <span>Add to Cart</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Text Details Underneath Image — Left-aligned matching reference screenshot */}
      <div className="flex flex-col pt-3 pb-1 text-left items-start w-full">
        {/* Category Label */}
        <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.1em] text-[#777777] mb-1">
          {product.category}
        </span>

        {/* Product Name */}
        <h3 className="text-xs sm:text-[13.5px] font-medium text-[#111111] leading-snug line-clamp-1 truncate mb-1 w-full text-left">
          <Link
            href={`/product/${product.slug}`}
            className="hover:text-[#C5A572] hover:underline transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572]"
          >
            {product.name}
          </Link>
        </h3>

        {/* Indian Rupee Price */}
        <div className="flex items-center gap-2 mt-0.5 text-left">
          <span className="text-xs sm:text-sm font-bold text-[#111111]">
            {formatInr(product.priceInr)}
          </span>
          {product.compareAtPriceInr && product.compareAtPriceInr > product.priceInr && (
            <span className="text-[11px] sm:text-xs text-[#999999] line-through font-normal">
              {formatInr(product.compareAtPriceInr)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
