"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Check } from "lucide-react";
import type { Product } from "@/types/product";
import { formatInr } from "@/lib/utils";

export interface WishlistTableProps {
  products: Product[];
  onRemove: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

/**
 * WishlistTable Component — PERALAGAE
 *
 * Implements the responsive Wishlist table:
 * - Desktop (md+): Clean, spacious 6-column tabular layout matching the reference.
 * - Mobile (< md): Responsive card layout with touch-friendly controls.
 */
export function WishlistTable({
  products,
  onRemove,
  onAddToCart,
}: WishlistTableProps) {
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const handleAddToCart = (product: Product) => {
    if (product.inStock === false || product.isAvailable === false) return;
    onAddToCart(product);
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  return (
    <div className="w-full">
      {/* =========================================================================
       * 1. DESKTOP & TABLET VIEW (md+)
       * ========================================================================= */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="Wishlist Products Table">
          <colgroup>
            <col className="w-12" />
            <col className="w-24" />
            <col />
            <col className="w-36 lg:w-44" />
            <col className="w-36 lg:w-40" />
            <col className="w-44 lg:w-48" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#EBEBEB]">
              <th
                scope="col"
                className="w-12 py-4 pl-2 pr-1 text-center text-xs font-medium tracking-[0.1em] uppercase text-[#777777]"
              >
                <span className="sr-only">Remove</span>
              </th>
              <th
                scope="col"
                className="w-24 py-4 px-2 text-center text-xs font-medium tracking-[0.1em] uppercase text-[#777777]"
              >
                <span className="sr-only">Image</span>
              </th>
              <th
                scope="col"
                className="py-4 px-4 text-left text-xs font-medium tracking-[0.1em] uppercase text-[#777777]"
              >
                Product Name
              </th>
              <th
                scope="col"
                className="w-36 lg:w-44 py-4 px-4 text-left text-xs font-medium tracking-[0.1em] uppercase text-[#777777]"
              >
                Unit Price
              </th>
              <th
                scope="col"
                className="w-36 lg:w-40 py-4 px-4 text-left text-xs font-medium tracking-[0.1em] uppercase text-[#777777]"
              >
                Stock Status
              </th>
              <th
                scope="col"
                className="w-44 lg:w-48 py-4 px-4 text-right text-xs font-medium tracking-[0.1em] uppercase text-[#777777]"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBEBEB]">
            {products.map((product) => {
              const isAdded = !!addedIds[product.id];
              const isInStock = product.inStock !== false && product.isAvailable !== false;

              return (
                <tr
                  key={product.id}
                  data-testid={`wishlist-row-${product.id}`}
                  className="transition-colors hover:bg-[#FAFAFA]/70"
                >
                  {/* 1. Remove Action */}
                  <td className="w-12 py-5 pl-2 pr-1 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => onRemove(product)}
                      aria-label={`Remove ${product.name} from wishlist`}
                      data-testid={`remove-wishlist-${product.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#888888] hover:text-[#D9383A] hover:bg-[#F5F5F5] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>

                  {/* 2. Product Image Thumbnail */}
                  <td className="w-24 py-5 px-2 text-center align-middle">
                    <div className="relative h-20 w-20 mx-auto flex-shrink-0 overflow-hidden bg-[#F4F4F4]">
                      <Link href={`/product/${product.slug}`} aria-label={product.name}>
                        <Image
                          src={product.image.src}
                          alt={product.image.alt || product.name}
                          fill
                          sizes="80px"
                          className="object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </Link>
                    </div>
                  </td>

                  {/* 3. Product Name & Category */}
                  <td className="py-5 px-4 text-left align-middle">
                    <span className="text-[10px] uppercase tracking-wider text-[#888888] block">
                      {product.category}
                    </span>
                    <h3 className="text-sm font-medium text-[#111111] mt-0.5">
                      <Link
                        href={`/product/${product.slug}`}
                        className="hover:text-[#C5A572] hover:underline transition-colors"
                      >
                        {product.name}
                      </Link>
                    </h3>
                  </td>

                  {/* 4. Unit Price */}
                  <td className="w-36 lg:w-44 py-5 px-4 text-left align-middle whitespace-nowrap">
                    <span className="text-sm font-semibold text-[#111111]">
                      {formatInr(product.priceInr)}
                    </span>
                    {product.compareAtPriceInr && product.compareAtPriceInr > product.priceInr && (
                      <span className="ml-2 text-xs text-[#999999] line-through">
                        {formatInr(product.compareAtPriceInr)}
                      </span>
                    )}
                  </td>

                  {/* 5. Stock Status */}
                  <td className="w-36 lg:w-40 py-5 px-4 text-left align-middle whitespace-nowrap">
                    {isInStock ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2E7D32]">
                        <span className="h-2 w-2 rounded-full bg-[#2E7D32]" aria-hidden="true" />
                        In Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D9383A]">
                        <span className="h-2 w-2 rounded-full bg-[#D9383A]" aria-hidden="true" />
                        Out of Stock
                      </span>
                    )}
                  </td>

                  {/* 6. Add to Cart Action */}
                  <td className="w-44 lg:w-48 py-5 px-4 text-right align-middle whitespace-nowrap">
                    {isInStock ? (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        data-testid={`add-to-cart-wishlist-${product.id}`}
                        className={`inline-flex items-center justify-center min-w-[130px] h-10 px-5 text-xs font-medium tracking-[0.08em] uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer ${
                          isAdded
                            ? "bg-[#2E7D32] text-white hover:bg-[#256829]"
                            : "bg-[#111111] text-white hover:bg-[#C5A572] active:bg-[#B3935F] active:scale-[0.98]"
                        }`}
                      >
                        {isAdded ? (
                          <span className="flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 stroke-[2]" />
                            Added
                          </span>
                        ) : (
                          "Add to Cart"
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        data-testid={`out-of-stock-wishlist-${product.id}`}
                        className="inline-flex items-center justify-center min-w-[130px] h-10 px-5 text-xs font-medium tracking-[0.08em] uppercase bg-[#F2F2F2] text-[#999999] cursor-not-allowed border border-[#E5E5E5]"
                      >
                        Out of Stock
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* =========================================================================
       * 2. MOBILE VIEW (< md)
       * ========================================================================= */}
      <div className="md:hidden flex flex-col gap-4">
        {products.map((product) => {
          const isAdded = !!addedIds[product.id];
          const isInStock = product.inStock !== false && product.isAvailable !== false;

          return (
            <article
              key={product.id}
              data-testid={`wishlist-card-${product.id}`}
              className="relative flex flex-col p-4 border border-[#EBEBEB] bg-white transition-all"
            >
              {/* Remove Button (Top Right) */}
              <button
                type="button"
                onClick={() => onRemove(product)}
                aria-label={`Remove ${product.name} from wishlist`}
                data-testid={`remove-wishlist-mobile-${product.id}`}
                className="absolute top-3 right-3 p-1.5 text-[#888888] hover:text-[#D9383A] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Upper Content: Image + Details */}
              <div className="flex gap-3.5 pr-8">
                {/* Thumbnail */}
                <div className="relative h-20 w-20 flex-shrink-0 bg-[#F4F4F4] overflow-hidden">
                  <Link href={`/product/${product.slug}`} aria-label={product.name}>
                    <Image
                      src={product.image.src}
                      alt={product.image.alt || product.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </Link>
                </div>

                {/* Details */}
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-[#888888]">
                    {product.category}
                  </span>
                  <h3 className="text-xs sm:text-sm font-medium text-[#111111] leading-snug line-clamp-2 mt-0.5">
                    <Link href={`/product/${product.slug}`} className="hover:underline">
                      {product.name}
                    </Link>
                  </h3>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-[#111111]">
                      {formatInr(product.priceInr)}
                    </span>
                    {product.compareAtPriceInr && product.compareAtPriceInr > product.priceInr && (
                      <span className="text-[11px] text-[#999999] line-through">
                        {formatInr(product.compareAtPriceInr)}
                      </span>
                    )}
                  </div>

                  {/* Stock Status Badge */}
                  <div className="mt-1">
                    {isInStock ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2E7D32]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2E7D32]" aria-hidden="true" />
                        In Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D9383A]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D9383A]" aria-hidden="true" />
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom: Add to Cart Action */}
              <div className="mt-3.5 pt-3 border-t border-[#F0F0F0]">
                {isInStock ? (
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    data-testid={`add-to-cart-wishlist-mobile-${product.id}`}
                    className={`w-full flex items-center justify-center h-10 px-4 text-xs font-medium tracking-[0.08em] uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer ${
                      isAdded
                        ? "bg-[#2E7D32] text-white"
                        : "bg-[#111111] text-white hover:bg-[#C5A572] active:bg-[#B3935F] active:scale-[0.99]"
                    }`}
                  >
                    {isAdded ? (
                      <span className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 stroke-[2]" />
                        Added to Cart
                      </span>
                    ) : (
                      "Add to Cart"
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    data-testid={`out-of-stock-wishlist-mobile-${product.id}`}
                    className="w-full flex items-center justify-center h-10 px-4 text-xs font-medium tracking-[0.08em] uppercase bg-[#F2F2F2] text-[#999999] cursor-not-allowed border border-[#E5E5E5]"
                  >
                    Out of Stock
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
