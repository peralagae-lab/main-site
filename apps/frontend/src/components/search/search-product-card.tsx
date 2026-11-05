"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Check, ShoppingBag } from "lucide-react";
import type { Product } from "@/types/product";
import { formatInr } from "@/lib/utils";
import { useStorefront } from "@/providers/storefront-provider";

export interface SearchProductCardProps {
  product: Product;
  onSelect?: () => void;
  className?: string;
}

export function SearchProductCard({
  product,
  onSelect,
  className = "",
}: SearchProductCardProps) {
  const { isWishlisted, toggleWishlist, addToCart } = useStorefront();
  const [justAdded, setJustAdded] = useState(false);

  const isFavorite = isWishlisted(product.id);
  const isOutOfStock = product.inStock === false || product.isAvailable === false;

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
    setTimeout(() => {
      setJustAdded(false);
    }, 1800);
  };

  return (
    <article
      data-testid={`search-product-card-${product.id}`}
      className={`group flex items-center justify-between gap-3 rounded-xl border border-[#EDE8E1] bg-white/70 p-2.5 sm:p-3 transition-all duration-200 hover:border-[#C5A572]/50 hover:bg-white hover:shadow-xs ${className}`}
    >
      {/* Left: Thumbnail & Details */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Thumbnail (Consistent square size) */}
        <Link
          href={`/product/${product.slug}`}
          onClick={onSelect}
          className="relative h-14 w-14 sm:h-16 sm:w-16 flex-none overflow-hidden rounded-lg bg-[#F7F5F0] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572]"
          aria-label={product.name}
        >
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes="64px"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        </Link>

        {/* Product Info */}
        <div className="min-w-0 flex-1 text-left">
          <h4 className="line-clamp-1 text-xs sm:text-sm font-medium text-[#111111] transition-colors group-hover:text-[#C5A572]">
            <Link href={`/product/${product.slug}`} onClick={onSelect}>
              {product.name}
            </Link>
          </h4>

          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-xs sm:text-sm font-semibold text-[#111111]">
              {formatInr(product.priceInr)}
            </span>
            {product.compareAtPriceInr && product.compareAtPriceInr > product.priceInr && (
              <span className="text-[10px] text-[#888888] line-through">
                {formatInr(product.compareAtPriceInr)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions (Wishlist & Add to Cart) */}
      <div className="flex flex-none items-center space-x-1.5 sm:space-x-2">
        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlistClick}
          aria-label={isFavorite ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          data-testid={`search-wishlist-${product.id}`}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] ${
            isFavorite ? "text-[#C5A572]" : "text-[#777777] hover:text-[#111111]"
          }`}
        >
          <Heart
            className={`h-4 w-4 ${isFavorite ? "fill-[#C5A572] stroke-[#C5A572]" : "stroke-[1.5]"}`}
            aria-hidden="true"
          />
        </button>

        {/* Add to Cart Button */}
        {isOutOfStock ? (
          <span className="rounded-md bg-[#F0EEE8] px-2.5 py-1.5 text-[10px] font-medium tracking-wide text-[#888888] uppercase select-none">
            Out of Stock
          </span>
        ) : (
          <button
            type="button"
            onClick={handleAddToCartClick}
            disabled={justAdded}
            aria-label={justAdded ? `Added ${product.name} to cart` : `Add ${product.name} to cart`}
            data-testid={`search-add-to-cart-${product.id}`}
            className={`flex items-center gap-1 rounded-md px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-medium tracking-wider uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] cursor-pointer ${
              justAdded
                ? "bg-[#C5A572] text-white"
                : "bg-[#111111] text-white hover:bg-[#C5A572] active:bg-[#B3935F]"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="h-3 w-3 stroke-[2.2]" aria-hidden="true" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-3 w-3 stroke-[1.6]" aria-hidden="true" />
                <span className="hidden xs:inline sm:inline">Add</span>
                <span className="xs:hidden sm:hidden">Add</span>
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
}
