import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StorefrontProvider } from "@/providers/storefront-provider";
import { ShopSidebar } from "@/components/shop/shop-sidebar";
import { ProductToolbar } from "@/components/shop/product-toolbar";
import { MobileFilterDrawer } from "@/components/shop/mobile-filter-drawer";
import { ShopProductCardSkeleton } from "@/components/shop/shop-product-card";
import { ShopPageContent } from "@/components/shop/shop-page-content";
import * as productService from "@/services/product-service";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/shop",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("PERALAGAE Filter Loading Animation Suite", () => {
  const defaultCategoryCounts = { rings: 5, necklaces: 4, bracelets: 3, earrings: 4 };

  describe("1. ShopProductCardSkeleton Component", () => {
    it("renders grid skeleton card with shimmer effect", () => {
      render(<ShopProductCardSkeleton viewMode="grid" />);
      const skeleton = screen.getByTestId("product-card-skeleton");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.className).toContain("animate-pulse");
    });

    it("renders list skeleton card with shimmer effect", () => {
      render(<ShopProductCardSkeleton viewMode="list" />);
      const skeleton = screen.getByTestId("product-card-skeleton");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.className).toContain("animate-pulse");
    });
  });

  describe("2. ShopSidebar & MobileFilterDrawer Loading Indicators", () => {
    it("renders updating badge in sidebar header when isLoading is true", () => {
      render(
        <ShopSidebar
          filters={{ category: null, minPrice: null, maxPrice: null, materials: [] }}
          onFilterChange={vi.fn()}
          onClearAll={vi.fn()}
          categoryCounts={defaultCategoryCounts}
          materialCounts={{}}
          minCataloguePrice={10000}
          maxCataloguePrice={70000}
          isLoading={true}
        />
      );

      const loadingBadge = screen.getByTestId("sidebar-loading-badge");
      expect(loadingBadge).toBeInTheDocument();
      expect(loadingBadge).toHaveTextContent(/updating/i);
    });

    it("does not render updating badge in sidebar when isLoading is false", () => {
      render(
        <ShopSidebar
          filters={{ category: null, minPrice: null, maxPrice: null, materials: [] }}
          onFilterChange={vi.fn()}
          onClearAll={vi.fn()}
          categoryCounts={defaultCategoryCounts}
          materialCounts={{}}
          minCataloguePrice={10000}
          maxCataloguePrice={70000}
          isLoading={false}
        />
      );

      expect(screen.queryByTestId("sidebar-loading-badge")).not.toBeInTheDocument();
    });

    it("shows updating state inside MobileFilterDrawer action button when isLoading is true", () => {
      render(
        <MobileFilterDrawer
          isOpen={true}
          onClose={vi.fn()}
          activeFilterCount={1}
          filters={{ category: "rings", minPrice: null, maxPrice: null, materials: [] }}
          onFilterChange={vi.fn()}
          onClearAll={vi.fn()}
          categoryCounts={defaultCategoryCounts}
          materialCounts={{}}
          minCataloguePrice={10000}
          maxCataloguePrice={70000}
          isLoading={true}
        />
      );

      expect(screen.getByText(/Updating Results.../i)).toBeInTheDocument();
    });
  });

  describe("3. ProductToolbar Loading Indicator", () => {
    it("renders loading badge in toolbar when isLoading is true", () => {
      render(
        <ProductToolbar
          total={24}
          fromIndex={1}
          toIndex={12}
          sort="default"
          onSortChange={vi.fn()}
          viewMode="grid-4"
          onViewModeChange={vi.fn()}
          onOpenMobileFilters={vi.fn()}
          activeFilterCount={0}
          isLoading={true}
        />
      );

      const toolbarLoading = screen.getByTestId("toolbar-loading");
      expect(toolbarLoading).toBeInTheDocument();
      expect(toolbarLoading).toHaveTextContent(/Updating.../i);
    });

    it("does not render loading badge when isLoading is false", () => {
      render(
        <ProductToolbar
          total={24}
          fromIndex={1}
          toIndex={12}
          sort="default"
          onSortChange={vi.fn()}
          viewMode="grid-4"
          onViewModeChange={vi.fn()}
          onOpenMobileFilters={vi.fn()}
          activeFilterCount={0}
          isLoading={false}
        />
      );

      expect(screen.queryByTestId("toolbar-loading")).not.toBeInTheDocument();
    });
  });

  describe("4. ShopPageContent Interactive Filter Loading Experience", () => {
    it("immediately activates loading animation and overlay when filter is clicked", async () => {
      // Mock fetchPublicProducts with a delayed promise to inspect the in-flight loading state
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.spyOn(productService, "fetchPublicProducts").mockImplementation(() => delayedPromise as any);

      render(
        <StorefrontProvider>
          <ShopPageContent pageSize={8} />
        </StorefrontProvider>
      );

      // Find the Rings category button in desktop sidebar
      const ringsButtons = screen.getAllByRole("button", { name: /^Rings/i });
      expect(ringsButtons.length).toBeGreaterThan(0);

      // Click the filter option
      fireEvent.click(ringsButtons[0]);

      // Verify that the floating loading overlay and progressbar immediately appear
      expect(screen.getByRole("progressbar", { name: /Updating jewellery catalogue/i })).toBeInTheDocument();
      expect(screen.getByTestId("filter-loading-overlay")).toBeInTheDocument();
      expect(screen.getByText(/Refining Jewels.../i)).toBeInTheDocument();

      // Resolve the fetch
      resolvePromise!(productService.getShopCatalogue({ category: "rings" }, "default", 1, 8));

      // After fetch completes, verify loading overlay disappears
      await waitFor(() => {
        expect(screen.queryByTestId("filter-loading-overlay")).not.toBeInTheDocument();
      });
    });

    it("immediately triggers loading animation when Clear All filters is clicked", async () => {
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.spyOn(productService, "fetchPublicProducts").mockImplementation(() => delayedPromise as any);

      render(
        <StorefrontProvider>
          <ShopPageContent pageSize={8} />
        </StorefrontProvider>
      );

      // Click a filter to make Clear All visible
      const ringsButtons = screen.getAllByRole("button", { name: /^Rings/i });
      fireEvent.click(ringsButtons[0]);

      // Find Clear All button
      const clearAllButtons = screen.getAllByRole("button", { name: /Clear All/i });
      expect(clearAllButtons.length).toBeGreaterThan(0);

      // Click Clear All
      fireEvent.click(clearAllButtons[0]);

      // Check loading indicators are active
      expect(screen.getByTestId("filter-loading-overlay")).toBeInTheDocument();

      // Complete fetch
      resolvePromise!(productService.getShopCatalogue({}, "default", 1, 8));

      await waitFor(() => {
        expect(screen.queryByTestId("filter-loading-overlay")).not.toBeInTheDocument();
      });
    });
  });
});
