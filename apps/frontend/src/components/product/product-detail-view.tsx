"use client";

import React, { useState } from "react";
import type { Product } from "@/types/product";
import { ProductBreadcrumb } from "./product-breadcrumb";
import { ProductGallery } from "./product-gallery";
import { ProductInfoPanel } from "./product-info-panel";
import { ProductTabs } from "./product-tabs";
import { RelatedProducts } from "./related-products";
import { StickyProductBar } from "./sticky-product-bar";

export interface ProductDetailViewProps {
  product: Product;
  prevProduct?: Product | null;
  nextProduct?: Product | null;
  initialRelated?: Product[];
}

export function ProductDetailView({
  product,
  prevProduct,
  nextProduct,
  initialRelated,
}: ProductDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"description" | "reviews">("description");

  const handleScrollToReviews = () => {
    setActiveTab("reviews");
    const el = document.getElementById("product-tabs-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <article className="w-full bg-white text-[#111111] min-h-screen pdp-typography font-jost">
      {/* 1. Breadcrumb & Prev/Next Arrows */}
      <ProductBreadcrumb
        product={product}
        prevProduct={prevProduct}
        nextProduct={nextProduct}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-2 pb-12 sm:pt-3 sm:pb-16">
        {/* 2. Spacious Two-Column Section Matching Reference */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-start">
          {/* Left Column: Image Gallery (Span 6 cols on desktop) */}
          <div className="lg:col-span-6 w-full">
            <ProductGallery product={product} />
          </div>

          {/* Right Column: Information & Actions (Span 6 cols on desktop) */}
          <div className="lg:col-span-6 w-full lg:sticky lg:top-24">
            <ProductInfoPanel
              product={product}
              onScrollToReviews={handleScrollToReviews}
            />
          </div>
        </div>

        {/* 3. Description & Reviews Tabs (Full width below main section) */}
        <ProductTabs
          product={product}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* 4. Category-Aware Related Products */}
        <RelatedProducts currentProduct={product} limit={4} initialRelated={initialRelated} />
      </div>

      {/* 5. Sticky Bottom Action Bar */}
      <StickyProductBar product={product} />
    </article>
  );
}
