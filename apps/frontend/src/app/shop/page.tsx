import React, { Suspense } from "react";
import type { Metadata } from "next";
import { ShopPageContent } from "@/components/shop/shop-page-content";
import { brandConfig } from "@/config/brand";

import { fetchPublicCategories } from "@/services/category-public-service";
import { fetchPublicProducts } from "@/services/product-service";

export const metadata: Metadata = {
  title: `Shop Fine Jewellery | ${brandConfig.name}`,
  description:
    "Explore the PERALAGAE handcrafted fine jewellery collection. Discover 18k solid gold bands, solitaire diamond necklaces, tennis bracelets, and luxury keepsakes.",
  openGraph: {
    title: `Shop Fine Jewellery | ${brandConfig.name}`,
    description:
      "Explore the PERALAGAE handcrafted fine jewellery collection. Discover 18k solid gold bands, solitaire diamond necklaces, tennis bracelets, and luxury keepsakes.",
    type: "website",
  },
};

function ShopLoadingSkeleton() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* Banner Skeleton */}
      <div className="w-full h-48 sm:h-56 bg-neutral-100 animate-pulse flex items-center justify-center">
        <div className="h-8 w-32 bg-neutral-200 rounded" />
      </div>

      {/* Content Skeleton */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-8">
          <div className="hidden lg:block w-64 h-96 bg-neutral-100 animate-pulse rounded" />
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-neutral-100 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ShopPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function DynamicShopPage({ searchParams }: ShopPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const category = typeof resolvedParams.category === "string" ? resolvedParams.category : null;
  const material = typeof resolvedParams.material === "string" ? resolvedParams.material : null;
  const materials = typeof resolvedParams.materials === "string" ? resolvedParams.materials.split(",") : material ? [material] : [];
  const minPrice = typeof resolvedParams.minPrice === "string" ? Number(resolvedParams.minPrice) : null;
  const maxPrice = typeof resolvedParams.maxPrice === "string" ? Number(resolvedParams.maxPrice) : null;
  const search = typeof resolvedParams.search === "string" ? resolvedParams.search : undefined;
  const sort = typeof resolvedParams.sort === "string" ? (resolvedParams.sort as any) : "default";
  const page = typeof resolvedParams.page === "string" ? Number(resolvedParams.page) : 1;

  const initialFilters = {
    category,
    material,
    materials,
    minPrice,
    maxPrice,
    search,
  };

  const [categories, initialCatalogue] = await Promise.all([
    fetchPublicCategories(),
    fetchPublicProducts(initialFilters, sort, page),
  ]);

  return (
    <ShopPageContent
      initialCategories={categories}
      initialCatalogue={initialCatalogue ?? undefined}
    />
  );
}

export default async function ShopPage(props: ShopPageProps) {
  return (
    <Suspense fallback={<ShopLoadingSkeleton />}>
      <DynamicShopPage searchParams={props.searchParams} />
    </Suspense>
  );
}

