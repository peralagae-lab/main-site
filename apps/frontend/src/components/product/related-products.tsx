"use client";

import React, { useState, useEffect } from "react";
import type { Product } from "@/types/product";
import { fetchRelatedProducts } from "@/services/product-service";
import { ProductCard } from "@/components/home/product-card";

export interface RelatedProductsProps {
  currentProduct: Product;
  limit?: number;
  initialRelated?: Product[];
}

/**
 * Related Products Component — PERALAGAE
 *
 * Dynamically fetches related fine jewellery products from the MongoDB database
 * based on actual category/material relationships.
 * Excludes the current product and any out-of-stock items.
 * If zero matching products exist, the entire section is cleanly hidden.
 */
export function RelatedProducts({
  currentProduct,
  limit = 4,
  initialRelated,
}: RelatedProductsProps) {
  const [related, setRelated] = useState<Product[]>(initialRelated || []);
  const [isLoading, setIsLoading] = useState(!initialRelated);

  useEffect(() => {
    if (initialRelated && initialRelated.length > 0) {
      setRelated(initialRelated);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    const identifier = currentProduct.slug || currentProduct.id;
    if (!identifier) {
      setIsLoading(false);
      return;
    }

    fetchRelatedProducts(identifier, limit)
      .then((items) => {
        if (isMounted) {
          setRelated(items);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn("[RelatedProducts] Failed to fetch related products:", err);
        if (isMounted) {
          setRelated([]);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentProduct.id, currentProduct.slug, limit]);

  if (isLoading || related.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Related Products"
      className="mt-14 sm:mt-20 mb-14 sm:mb-20 w-full"
    >
      {/* Section Header: Centred heading with flanking horizontal lines matching New Collection */}
      <div className="flex flex-col items-center justify-center text-center mb-7 sm:mb-12 lg:mb-14">
        <div className="flex items-center justify-center w-full gap-3 sm:gap-6">
          <span
            className="h-[1px] w-8 sm:w-20 lg:w-28 bg-[#D8D8D8]"
            aria-hidden="true"
          />
          <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-normal tracking-[-0.01em] text-[#111111] leading-[1.2] px-2 text-center font-jost">
            Related Products
          </h2>
          <span
            className="h-[1px] w-8 sm:w-20 lg:w-28 bg-[#D8D8D8]"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* 4-Item Responsive Grid matching New Collection */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-7">
        {related.map((prod) => (
          <ProductCard
            key={prod.id}
            product={prod}
            dataTestId={`related-product-${prod.id}`}
          />
        ))}
      </div>
    </section>
  );
}
