"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useStorefront } from "@/providers/storefront-provider";
import { fetchPublicProducts } from "@/services/product-service";
import type { Product } from "@/types/product";
import { WishlistHero } from "./wishlist-hero";
import { WishlistTable } from "./wishlist-table";
import { WishlistEmptyState } from "./wishlist-empty-state";

export interface WishlistPageContentProps {
  catalogue?: Product[];
}

/**
 * WishlistPageContent Component — PERALAGAE
 *
 * Primary orchestrator for the /wishlist route.
 * Integrates directly with storefront wishlist and cart states.
 * All product entities are resolved dynamically from genuine database records.
 */
export function WishlistPageContent({
  catalogue,
}: WishlistPageContentProps) {
  const { wishlistIds, toggleWishlist, addToCart } = useStorefront();

  const [dbProducts, setDbProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchPublicProducts({}, "default", 1, 100)
      .then((res) => {
        if (isMounted && res && res.products) {
          setDbProducts(res.products);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const mergedCatalogue = useMemo(() => {
    const map = new Map<string, Product>();
    if (catalogue) {
      catalogue.forEach((p) => map.set(p.id, p));
    }
    if (dbProducts && dbProducts.length > 0) {
      dbProducts.forEach((p) => map.set(p.id, p));
    }
    return Array.from(map.values());
  }, [catalogue, dbProducts]);

  // Resolve full Product entities from stored wishlist IDs
  const wishlistProducts = useMemo(() => {
    return wishlistIds
      .map((id) => mergedCatalogue.find((p) => p.id === id))
      .filter((p): p is Product => p !== undefined);
  }, [wishlistIds, mergedCatalogue]);

  const hasItems = wishlistProducts.length > 0;

  return (
    <div className="w-full bg-white text-black min-h-[calc(100vh-200px)]">
      {/* 1. Page Title Hero with Background Image & Breadcrumbs */}
      <WishlistHero />

      {/* 2. Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {hasItems ? (
          <WishlistTable
            products={wishlistProducts}
            onRemove={toggleWishlist}
            onAddToCart={addToCart}
          />
        ) : (
          <WishlistEmptyState />
        )}
      </main>
    </div>
  );
}
