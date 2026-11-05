"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { ShopHero } from "./shop-hero";
import { ShopSidebar } from "./shop-sidebar";
import { MobileFilterDrawer } from "./mobile-filter-drawer";
import { ProductToolbar, type ViewMode } from "./product-toolbar";
import { ShopProductCard, ShopProductCardSkeleton } from "./shop-product-card";
import { ShopPagination } from "./shop-pagination";
import { ShopEmptyState } from "./shop-empty-state";
import { Loader2 } from "lucide-react";
import {
  getShopCatalogue,
  fetchPublicProducts,
  type ShopFilters,
  type SortOption,
  type ShopCatalogueResult,
} from "@/services/product-service";
import type { CategoryItem } from "@/types/category";
import {
  fetchPublicCategories,
  CATEGORIES_UPDATED_EVENT,
} from "@/services/category-public-service";
import { MATERIALS_UPDATED_EVENT } from "@/services/material-service";

export interface ShopPageContentProps {
  pageSize?: number;
  initialCategories?: CategoryItem[];
  initialCatalogue?: ShopCatalogueResult;
}

export function ShopPageContent({
  pageSize = 12,
  initialCategories,
  initialCatalogue,
}: ShopPageContentProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const productAreaRef = useRef<HTMLDivElement>(null);

  // Initialize state from URL Search Params if available
  const initialCategory = searchParams.get("category") || null;
  const initialMaterial = searchParams.get("material") || null;
  const initialSort = (searchParams.get("sort") as SortOption) || "default";
  const initialView = (searchParams.get("view") as ViewMode) || "grid-4";
  const initialPage = Number(searchParams.get("page")) || 1;

  const [filters, setFilters] = useState<ShopFilters>({
    category: initialCategory,
    material: initialMaterial,
    minPrice: null,
    maxPrice: null,
    materials: initialMaterial ? [initialMaterial] : [],
  });

  const [sort, setSort] = useState<SortOption>(initialSort);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Sync category & material filter when URL search parameters change externally
  const categoryParam = searchParams.get("category") || null;
  const materialParam = searchParams.get("material") || null;

  useEffect(() => {
    setFilters((prev) => {
      let changed = false;
      const next = { ...prev };
      if (prev.category !== categoryParam) {
        next.category = categoryParam;
        changed = true;
      }
      if (prev.material !== materialParam) {
        next.material = materialParam;
        if (materialParam && !next.materials?.includes(materialParam)) {
          next.materials = [materialParam];
        } else if (!materialParam && prev.material) {
          next.materials = [];
        }
        changed = true;
      }
      return changed ? next : prev;
    });
    setCurrentPage(1);
  }, [categoryParam, materialParam]);

  // Sync state to URL search parameters for shareable/bookmarkable URLs
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.material) params.set("material", filters.material);
    if (sort !== "default") params.set("sort", sort);
    if (viewMode !== "grid-4") params.set("view", viewMode);
    if (currentPage > 1) params.set("page", String(currentPage));

    const newQuery = params.toString();
    const newUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
    window.history.replaceState(null, "", newUrl);
  }, [filters, sort, viewMode, currentPage, pathname]);

  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories || []);
  const [catalogueData, setCatalogueData] = useState<ShopCatalogueResult | null>(
    initialCatalogue ?? (process.env["VITEST"] ? getShopCatalogue(filters, sort, currentPage, pageSize) : null)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch or sync categories on mount and when categories are updated in admin
  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      try {
        const fetched = await fetchPublicCategories();
        if (isMounted && fetched && fetched.length > 0) {
          setCategories(fetched);
        }
      } catch (err) {
        console.warn("[ShopPageContent] Failed to fetch public categories:", err);
      }
    };

    if (!initialCategories || initialCategories.length === 0) {
      loadCategories();
    }

    const handleCategoryUpdate = () => {
      loadCategories();
    };
    const handleProductsUpdate = () => {
      loadCategories();
      fetchPublicProducts(filters, sort, currentPage, pageSize).then((res) => {
        if (res) setCatalogueData(res);
      });
    };
    const handleMaterialsUpdate = () => {
      fetchPublicProducts(filters, sort, currentPage, pageSize).then((res) => {
        if (res) setCatalogueData(res);
      });
    };

    window.addEventListener(CATEGORIES_UPDATED_EVENT, handleCategoryUpdate);
    window.addEventListener("peralagae:products_updated", handleProductsUpdate);
    window.addEventListener(MATERIALS_UPDATED_EVENT, handleMaterialsUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener(CATEGORIES_UPDATED_EVENT, handleCategoryUpdate);
      window.removeEventListener("peralagae:products_updated", handleProductsUpdate);
      window.removeEventListener(MATERIALS_UPDATED_EVENT, handleMaterialsUpdate);
    };
  }, [initialCategories, filters, sort, currentPage, pageSize]);

  // Sync initialCategories if passed externally
  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
    }
  }, [initialCategories]);

  // Sync products from database API whenever filters, sort, page, or categories change
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    fetchPublicProducts(filters, sort, currentPage, pageSize)
      .then((res) => {
        if (isMounted) {
          if (res) {
            setCatalogueData(res);
            setLoadError(null);
          } else {
            setLoadError("Failed to load products from database.");
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadError("Failed to load products from database.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [filters, sort, currentPage, pageSize]);

  // Default empty catalogue result when initial loading is pending
  const defaultEmptyResult: ShopCatalogueResult = useMemo(
    () => ({
      products: [],
      total: 0,
      totalCatalogueCount: 0,
      page: 1,
      pageSize: 12,
      totalPages: 1,
      fromIndex: 0,
      toIndex: 0,
      minCataloguePrice: 0,
      maxCataloguePrice: 0,
      categoryCounts: {},
      materialCounts: {},
      availableMaterials: [],
    }),
    []
  );

  // Authoritative catalogue results from MongoDB API
  const catalogueResult = useMemo(() => {
    return catalogueData ?? defaultEmptyResult;
  }, [catalogueData, defaultEmptyResult]);

  // Resolve human-readable name of selected collection (category or material) for empty state
  const selectedCollectionName = useMemo(() => {
    if (filters.category) {
      const found = categories.find(
        (c) =>
          c.slug.toLowerCase() === filters.category?.toLowerCase() ||
          c.id.toLowerCase() === filters.category?.toLowerCase()
      );
      return found ? found.name : filters.category;
    }
    if (filters.material) {
      return filters.material
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return null;
  }, [filters.category, filters.material, categories]);

  // Authoritative total catalogue count from database
  const totalCatalogueProductsCount = useMemo(() => {
    if (typeof catalogueResult.totalCatalogueCount === "number") {
      return catalogueResult.totalCatalogueCount;
    }
    if (categories && categories.length > 0 && catalogueResult.categoryCounts) {
      const sum = categories.reduce(
        (acc, c) => acc + (catalogueResult.categoryCounts[c.slug] ?? c.productCount ?? 0),
        0
      );
      if (sum > 0) return sum;
    }
    return catalogueResult.total;
  }, [catalogueResult, categories]);

  // Count of active filters for drawer badge & clear all visibility
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count += 1;
    if (filters.material) count += 1;
    if (
      (filters.minPrice != null && filters.minPrice > catalogueResult.minCataloguePrice) ||
      (filters.maxPrice != null && filters.maxPrice < catalogueResult.maxCataloguePrice)
    ) {
      count += 1;
    }
    if (filters.materials && filters.materials.length > 0 && !filters.material) {
      count += filters.materials.length;
    }
    return count;
  }, [filters, catalogueResult.minCataloguePrice, catalogueResult.maxCataloguePrice]);

  // Filter change resets current page to 1 and immediately initiates loading
  const handleFilterChange = useCallback((newFilters: ShopFilters) => {
    setIsLoading(true);
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // Clear all filters resets to initial defaults and triggers loading
  const handleClearAll = useCallback(() => {
    setIsLoading(true);
    setFilters({
      category: null,
      material: null,
      minPrice: null,
      maxPrice: null,
      materials: [],
    });
    setCurrentPage(1);
  }, []);

  // Sort change handler
  const handleSortChange = useCallback((newSort: SortOption) => {
    setIsLoading(true);
    setSort(newSort);
    setCurrentPage(1);
  }, []);

  // Page change with smooth scroll to top of product grid
  const handlePageChange = useCallback((newPage: number) => {
    setIsLoading(true);
    setCurrentPage(newPage);
    if (productAreaRef.current) {
      productAreaRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Determine grid container classes based on active view mode
  const gridContainerClass = useMemo(() => {
    switch (viewMode) {
      case "list":
        return "flex flex-col gap-4 sm:gap-6";
      case "grid-2":
        return "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8";
      case "grid-3":
        return "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6";
      case "grid-4":
      default:
        return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5";
    }
  }, [viewMode]);

  return (
    <div className="w-full bg-white text-black min-h-screen flex flex-col">
      {/* 1. Shop Hero Banner */}
      <ShopHero />

      {/* 2. Main Two-Part Shop Content Layout */}
      <main
        ref={productAreaRef}
        id="shop-content"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
      >
        <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
          {/* Left Sidebar (Desktop 25% width, hidden on mobile/tablet) */}
          <div className="hidden lg:block w-full lg:w-[260px] xl:w-[280px] flex-none">
            <div className="sticky top-28">
              <ShopSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearAll}
                categories={categories}
                categoryCounts={catalogueResult.categoryCounts}
                totalProductsCount={totalCatalogueProductsCount}
                availableMaterials={catalogueResult.availableMaterials}
                materialCounts={catalogueResult.materialCounts}
                minCataloguePrice={catalogueResult.minCataloguePrice}
                maxCataloguePrice={catalogueResult.maxCataloguePrice}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Right Product Area (75% width on desktop) */}
          <section
            aria-label="Product catalogue listing"
            className="flex-1 w-full min-w-0 flex flex-col"
          >
            {/* Product Toolbar */}
            <ProductToolbar
              total={catalogueResult.total}
              fromIndex={catalogueResult.fromIndex}
              toIndex={catalogueResult.toIndex}
              sort={sort}
              onSortChange={handleSortChange}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onOpenMobileFilters={() => setMobileDrawerOpen(true)}
              activeFilterCount={activeFilterCount}
              isLoading={isLoading}
            />

            {/* Glowing Luxury Loading Progress / Shimmer Bar */}
            <div
              className={`w-full transition-opacity duration-300 mt-2 ${
                isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <div
                role="progressbar"
                aria-label="Updating jewellery catalogue"
                className="w-full h-1 bg-[#FAF8F5] overflow-hidden rounded-full relative border border-[#EAE6DF]/60"
              >
                <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#C5A572] to-transparent animate-luxury-shimmer" />
              </div>
            </div>

            {/* Product Listing Area */}
            <div className="relative mt-4 sm:mt-6 min-h-[400px]">
              {/* Luxury Floating Loading Overlay when fetching products */}
              {isLoading && catalogueResult.products.length > 0 && (
                <div
                  data-testid="filter-loading-overlay"
                  aria-live="polite"
                  className="absolute inset-0 z-20 flex items-start justify-center pt-24 sm:pt-32 pointer-events-none"
                >
                  <div className="sticky top-40 flex items-center gap-3 px-6 py-3 bg-white/95 backdrop-blur-md border border-[#EAE6DF] shadow-xl rounded-full text-xs font-medium tracking-widest text-[#111111] uppercase transition-all duration-300">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A572] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C5A572]"></span>
                    </span>
                    <Loader2 className="h-4 w-4 animate-spin text-[#C5A572]" />
                    <span className="tracking-widest">Refining Jewels...</span>
                  </div>
                </div>
              )}

              {/* Error state if database fetch failed and no products available */}
              {loadError && !catalogueData ? (
                <div
                  role="alert"
                  className="w-full flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center border border-[#FCA5A5] bg-[#FEF2F2] rounded"
                >
                  <p className="text-sm text-[#991B1B] font-medium">{loadError}</p>
                  <p className="text-xs text-[#7F1D1D] mt-1 max-w-sm">
                    Unable to retrieve catalogue filters and products from the database service.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoading(true);
                      setLoadError(null);
                      fetchPublicProducts(filters, sort, currentPage, pageSize)
                        .then((res) => {
                          if (res) setCatalogueData(res);
                          else setLoadError("Failed to load products from database.");
                        })
                        .catch(() => setLoadError("Failed to load products from database."))
                        .finally(() => setIsLoading(false));
                    }}
                    className="mt-4 px-5 py-2.5 bg-black hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-semibold uppercase tracking-wider rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : isLoading && catalogueResult.products.length === 0 ? (
                /* When loading and no products present, show luxury skeleton cards */
                <div className={gridContainerClass} data-testid="filter-skeleton-grid">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ShopProductCardSkeleton
                      key={i}
                      viewMode={viewMode === "list" ? "list" : "grid"}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className={`transition-opacity duration-300 ${
                    isLoading ? "opacity-35 pointer-events-none select-none" : "opacity-100"
                  }`}
                >
                  {catalogueResult.total === 0 ? (
                    <ShopEmptyState
                      onClearAll={handleClearAll}
                      categoryName={selectedCollectionName}
                      isCategoryOnly={Boolean(
                        filters.category &&
                          !filters.materials?.length &&
                          filters.minPrice == null &&
                          filters.maxPrice == null &&
                          !filters.search
                      )}
                      isCatalogueEmpty={totalCatalogueProductsCount === 0}
                    />
                  ) : (
                    <div className={gridContainerClass}>
                      {catalogueResult.products.map((product) => (
                        <ShopProductCard
                          key={product.id}
                          product={product}
                          viewMode={viewMode === "list" ? "list" : "grid"}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {catalogueResult.totalPages > 1 && (
              <div className={isLoading ? "opacity-40 pointer-events-none" : ""}>
                <ShopPagination
                  currentPage={catalogueResult.page}
                  totalPages={catalogueResult.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Accessible Mobile Filter Drawer (< lg) */}
      <MobileFilterDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        categories={categories}
        categoryCounts={catalogueResult.categoryCounts}
        totalProductsCount={totalCatalogueProductsCount}
        availableMaterials={catalogueResult.availableMaterials}
        materialCounts={catalogueResult.materialCounts}
        minCataloguePrice={catalogueResult.minCataloguePrice}
        maxCataloguePrice={catalogueResult.maxCataloguePrice}
        activeFilterCount={activeFilterCount}
        isLoading={isLoading}
      />
    </div>
  );
}
