"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { CartItem } from "@/providers/storefront-provider";
import { getRecommendedProducts } from "@/services/recommendation-service";
import { fetchPublicProducts } from "@/services/product-service";
import type { Product } from "@/types/product";
import { ShopProductCard } from "@/components/shop/shop-product-card";

export interface CartRecommendationsProps {
  cartItems: CartItem[];
  className?: string;
}

/**
 * CartRecommendations Component — PERALAGAE
 *
 * "You May Be Interested In..." section.
 * Renders priority-curated jewellery product recommendations dynamically from
 * the production database that match the categories and materials in the customer's cart.
 * If no eligible products exist, this section hides completely.
 */
export function CartRecommendations({
  cartItems,
  className = "",
}: CartRecommendationsProps) {
  const [dbProducts, setDbProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchPublicProducts({}, "default", 1, 50)
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

  // Compute deterministic recommendations based exclusively on genuine database products
  const recommendations = useMemo(() => {
    if (dbProducts.length === 0) return [];
    return getRecommendedProducts(cartItems, { limit: 4, catalogue: dbProducts });
  }, [cartItems, dbProducts]);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="cart-recommendations-section"
      aria-labelledby="recommendations-heading"
      className={`w-full pt-12 sm:pt-16 border-t border-[#EAEAEA] ${className}`}
    >
      {/* Section Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h2
          id="recommendations-heading"
          className="text-xl sm:text-2xl md:text-3xl font-serif text-[#111111] tracking-wide"
        >
          You May Be Interested In…
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-[#777777] tracking-wider uppercase">
          Curated fine jewellery selections to complement your style
        </p>
      </div>

      {/* Responsive Product Grid (2 cols mobile, 4 cols desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
        {recommendations.map((product) => (
          <ShopProductCard
            key={product.id}
            product={product}
            viewMode="grid"
          />
        ))}
      </div>
    </section>
  );
}
