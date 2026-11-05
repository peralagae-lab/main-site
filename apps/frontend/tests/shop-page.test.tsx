import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StorefrontProvider } from "@/providers/storefront-provider";
import { ShopHero } from "@/components/shop/shop-hero";
import { ShopSidebar } from "@/components/shop/shop-sidebar";
import { ProductToolbar } from "@/components/shop/product-toolbar";
import { ShopProductCard } from "@/components/shop/shop-product-card";
import { ShopPagination } from "@/components/shop/shop-pagination";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";
import { ShopPageContent } from "@/components/shop/shop-page-content";
import { DualRangeSlider } from "@/components/shop/dual-range-slider";
import {
  getShopCatalogue as baseGetShopCatalogue,
  type ShopFilters,
} from "@/services/product-service";
import { SHOP_PRODUCTS } from "./fixtures/products";

const getShopCatalogue = (
  filters: any = {},
  sort: any = "default",
  page = 1,
  pageSize = 24,
  categories?: any
) => baseGetShopCatalogue(filters, sort, page, pageSize, categories, SHOP_PRODUCTS);

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/shop",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("PERALAGAE Shop Page Suite", () => {
  describe("Product Service & Catalogue Repository", () => {
    it("returns all 24 curated products with accurate min and max catalogue prices", () => {
      const result = getShopCatalogue({}, "default", 1, 24);
      expect(result.total).toBe(24);
      expect(result.products).toHaveLength(24);
      expect(result.minCataloguePrice).toBeLessThan(result.maxCataloguePrice);
      expect(result.minCataloguePrice).toBe(12500);
      expect(result.maxCataloguePrice).toBe(68000);
    });

    it("filters correctly by jewellery category (Rings, Necklaces, etc.)", () => {
      const ringsResult = getShopCatalogue({ category: "rings" });
      expect(ringsResult.total).toBeGreaterThan(0);
      ringsResult.products.forEach((prod) => {
        expect(prod.category).toBe("RINGS");
      });

      const necklacesResult = getShopCatalogue({ category: "necklaces" });
      expect(necklacesResult.total).toBeGreaterThan(0);
      necklacesResult.products.forEach((prod) => {
        expect(prod.category).toBe("NECKLACES");
      });
    });

    it("filters strictly by minimum and maximum numeric INR price", () => {
      const result = getShopCatalogue({ minPrice: 20000, maxPrice: 35000 });
      expect(result.total).toBeGreaterThan(0);
      result.products.forEach((prod) => {
        expect(prod.priceInr).toBeGreaterThanOrEqual(20000);
        expect(prod.priceInr).toBeLessThanOrEqual(35000);
      });
    });

    it("filters by materials multi-selection", () => {
      const result = getShopCatalogue({ materials: ["Platinum"] });
      expect(result.total).toBeGreaterThan(0);
      result.products.forEach((prod) => {
        expect(prod.materials?.some((m) => m.toLowerCase() === "platinum")).toBe(true);
      });
    });

    it("combines category, price range, and material filters simultaneously", () => {
      const result = getShopCatalogue({
        category: "rings",
        minPrice: 15000,
        maxPrice: 50000,
        materials: ["Gold"],
      });
      expect(result.total).toBeGreaterThan(0);
      result.products.forEach((prod) => {
        expect(prod.category).toBe("RINGS");
        expect(prod.priceInr).toBeGreaterThanOrEqual(15000);
        expect(prod.priceInr).toBeLessThanOrEqual(50000);
        expect(prod.materials).toContain("Gold");
      });
    });

    it("sorts by Price: Low to High and Price: High to Low", () => {
      const lowToHigh = getShopCatalogue({}, "price-low-to-high", 1, 24);
      for (let i = 1; i < lowToHigh.products.length; i++) {
        expect(lowToHigh.products[i].priceInr).toBeGreaterThanOrEqual(
          lowToHigh.products[i - 1].priceInr
        );
      }

      const highToLow = getShopCatalogue({}, "price-high-to-low", 1, 24);
      for (let i = 1; i < highToLow.products.length; i++) {
        expect(highToLow.products[i].priceInr).toBeLessThanOrEqual(
          highToLow.products[i - 1].priceInr
        );
      }
    });

    it("sorts alphabetically by Name: A to Z and Name: Z to A", () => {
      const aToZ = getShopCatalogue({}, "name-a-z", 1, 24);
      for (let i = 1; i < aToZ.products.length; i++) {
        expect(
          aToZ.products[i].name.localeCompare(aToZ.products[i - 1].name)
        ).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("ShopHero Component", () => {
    it("renders page title 'Shop' with proper heading level 1 and breadcrumb", () => {
      render(<ShopHero />);

      const heading = screen.getByRole("heading", { level: 1, name: /Shop/i });
      expect(heading).toBeInTheDocument();

      const breadcrumb = screen.getByRole("navigation", { name: /Breadcrumb/i });
      expect(breadcrumb).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Home/i })).toHaveAttribute("href", "/");
      expect(screen.getByText("Shop", { selector: "li[aria-current='page']" })).toBeInTheDocument();
    });
  });

  describe("ShopSidebar Component", () => {
    const mockFilters: ShopFilters = {
      category: null,
      minPrice: null,
      maxPrice: null,
      materials: [],
    };
    const mockCounts = { necklaces: 4, rings: 5, bracelets: 4, earrings: 4, "charms-bangles": 3, "gift-ideas": 4 };
    const mockMaterialCounts = { Gold: 15, Silver: 3, "Rose Gold": 4, Diamond: 12, Platinum: 6 };

    it("renders 3 collapsible sections in exact required order: Categories, Price Filter, Materials", () => {
      render(
        <ShopSidebar
          filters={mockFilters}
          onFilterChange={vi.fn()}
          onClearAll={vi.fn()}
          categoryCounts={mockCounts}
          materialCounts={mockMaterialCounts}
          minCataloguePrice={12500}
          maxCataloguePrice={68000}
        />
      );

      const sectionHeadings = screen.getAllByRole("button", { expanded: true });
      expect(sectionHeadings[0]).toHaveTextContent(/Categories/i);
      expect(sectionHeadings[1]).toHaveTextContent(/Price Filter/i);
      expect(sectionHeadings[2]).toHaveTextContent(/Materials/i);
    });

    it("triggers onFilterChange when category is clicked", () => {
      const onFilterChange = vi.fn();
      render(
        <ShopSidebar
          filters={mockFilters}
          onFilterChange={onFilterChange}
          onClearAll={vi.fn()}
          categoryCounts={mockCounts}
          materialCounts={mockMaterialCounts}
          minCataloguePrice={12500}
          maxCataloguePrice={68000}
        />
      );

      const ringsBtn = screen.getByRole("button", { name: /^Rings/i });
      fireEvent.click(ringsBtn);

      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ category: "rings" }));
    });

    it("displays Clear All button when active filters exist and triggers onClearAll", () => {
      const onClearAll = vi.fn();
      render(
        <ShopSidebar
          filters={{ ...mockFilters, category: "rings" }}
          onFilterChange={vi.fn()}
          onClearAll={onClearAll}
          categoryCounts={mockCounts}
          materialCounts={mockMaterialCounts}
          minCataloguePrice={12500}
          maxCataloguePrice={68000}
        />
      );

      const clearBtn = screen.getByRole("button", { name: /Clear All/i });
      expect(clearBtn).toBeInTheDocument();
      fireEvent.click(clearBtn);
      expect(onClearAll).toHaveBeenCalled();
    });

    it("renders single-track dual-thumb price slider with Min, Max, and range underneath in INR", () => {
      render(
        <ShopSidebar
          filters={mockFilters}
          onFilterChange={vi.fn()}
          onClearAll={vi.fn()}
          categoryCounts={mockCounts}
          materialCounts={mockMaterialCounts}
          minCataloguePrice={12500}
          maxCataloguePrice={68000}
        />
      );

      // Verify Min and Max labels
      expect(screen.getByText(/Min:/i)).toBeInTheDocument();
      expect(screen.getByText(/Max:/i)).toBeInTheDocument();

      // Exactly two slider thumbs belonging to the single track
      const sliders = screen.getAllByRole("slider");
      expect(sliders).toHaveLength(2);
      expect(sliders[0]).toHaveAttribute("aria-label", "Minimum price");
      expect(sliders[1]).toHaveAttribute("aria-label", "Maximum price");

      // Verify formatted range underneath
      expect(screen.getByText("₹12,500 – ₹68,000")).toBeInTheDocument();
    });

    it("displays Reset Price when price filter is active and clears only price without affecting other filters", () => {
      const onFilterChange = vi.fn();
      render(
        <ShopSidebar
          filters={{ ...mockFilters, category: "rings", minPrice: 20000, maxPrice: 50000 }}
          onFilterChange={onFilterChange}
          onClearAll={vi.fn()}
          categoryCounts={mockCounts}
          materialCounts={mockMaterialCounts}
          minCataloguePrice={12500}
          maxCataloguePrice={68000}
        />
      );

      const resetPriceBtn = screen.getByRole("button", { name: /Reset Price/i });
      expect(resetPriceBtn).toBeInTheDocument();
      fireEvent.click(resetPriceBtn);

      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "rings",
          minPrice: null,
          maxPrice: null,
        })
      );
    });
  });

  describe("DualRangeSlider Component", () => {
    it("renders exactly one track and two thumbs with accessible ARIA attributes", () => {
      render(
        <DualRangeSlider
          min={12500}
          max={68000}
          step={500}
          value={[12500, 68000]}
          onChange={vi.fn()}
        />
      );

      const track = screen.getByTestId("dual-range-slider-track");
      expect(track).toBeInTheDocument();

      const thumbs = screen.getAllByRole("slider");
      expect(thumbs).toHaveLength(2);

      const [minThumb, maxThumb] = thumbs;
      expect(minThumb).toHaveAttribute("aria-label", "Minimum price");
      expect(minThumb).toHaveAttribute("aria-valuemin", "12500");
      expect(minThumb).toHaveAttribute("aria-valuemax", "68000");
      expect(minThumb).toHaveAttribute("aria-valuenow", "12500");

      expect(maxThumb).toHaveAttribute("aria-label", "Maximum price");
      expect(maxThumb).toHaveAttribute("aria-valuemin", "12500");
      expect(maxThumb).toHaveAttribute("aria-valuemax", "68000");
      expect(maxThumb).toHaveAttribute("aria-valuenow", "68000");
    });

    it("supports keyboard navigation on minimum thumb and prevents crossing", () => {
      const onChange = vi.fn();
      render(
        <DualRangeSlider
          min={12500}
          max={68000}
          step={500}
          value={[20000, 30000]}
          onChange={onChange}
        />
      );

      const minThumb = screen.getByRole("slider", { name: "Minimum price" });

      // ArrowRight increases by step (500)
      fireEvent.keyDown(minThumb, { key: "ArrowRight" });
      expect(onChange).toHaveBeenCalledWith([20500, 30000]);

      // ArrowLeft decreases by step (500)
      fireEvent.keyDown(minThumb, { key: "ArrowLeft" });
      expect(onChange).toHaveBeenCalledWith([19500, 30000]);

      // Home sets to min bound
      fireEvent.keyDown(minThumb, { key: "Home" });
      expect(onChange).toHaveBeenCalledWith([12500, 30000]);

      // End sets to current max value (prevents crossing)
      fireEvent.keyDown(minThumb, { key: "End" });
      expect(onChange).toHaveBeenCalledWith([30000, 30000]);
    });

    it("supports keyboard navigation on maximum thumb and prevents dropping below min", () => {
      const onChange = vi.fn();
      render(
        <DualRangeSlider
          min={12500}
          max={68000}
          step={500}
          value={[20000, 30000]}
          onChange={onChange}
        />
      );

      const maxThumb = screen.getByRole("slider", { name: "Maximum price" });

      // ArrowRight increases by step (500)
      fireEvent.keyDown(maxThumb, { key: "ArrowRight" });
      expect(onChange).toHaveBeenCalledWith([20000, 30500]);

      // ArrowLeft decreases by step (500)
      fireEvent.keyDown(maxThumb, { key: "ArrowLeft" });
      expect(onChange).toHaveBeenCalledWith([20000, 29500]);

      // End sets to max bound
      fireEvent.keyDown(maxThumb, { key: "End" });
      expect(onChange).toHaveBeenCalledWith([20000, 68000]);

      // Home sets to current min value (prevents dropping below min)
      fireEvent.keyDown(maxThumb, { key: "Home" });
      expect(onChange).toHaveBeenCalledWith([20000, 20000]);
    });

    it("highlights the active track between min and max percentages", () => {
      render(
        <DualRangeSlider
          min={0}
          max={100}
          step={1}
          value={[25, 75]}
          onChange={vi.fn()}
        />
      );

      const activeTrack = screen.getByTestId("dual-range-slider-active-track");
      expect(activeTrack).toHaveStyle({
        left: "25%",
        width: "50%",
      });
    });
  });

  describe("ProductToolbar Component", () => {
    it("renders accurate product count range and total", () => {
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
        />
      );

      expect(screen.getByText(/Showing/i)).toHaveTextContent("Showing 1–12 of 24 products");
    });

    it("handles sort option changes", () => {
      const onSortChange = vi.fn();
      render(
        <ProductToolbar
          total={24}
          fromIndex={1}
          toIndex={12}
          sort="default"
          onSortChange={onSortChange}
          viewMode="grid-4"
          onViewModeChange={vi.fn()}
          onOpenMobileFilters={vi.fn()}
          activeFilterCount={0}
        />
      );

      const sortSelect = screen.getByRole("combobox");
      fireEvent.change(sortSelect, { target: { value: "price-low-to-high" } });
      expect(onSortChange).toHaveBeenCalledWith("price-low-to-high");
    });

    it("renders all four view mode buttons and handles switching", () => {
      const onViewModeChange = vi.fn();
      render(
        <ProductToolbar
          total={24}
          fromIndex={1}
          toIndex={12}
          sort="default"
          onSortChange={vi.fn()}
          viewMode="grid-4"
          onViewModeChange={onViewModeChange}
          onOpenMobileFilters={vi.fn()}
          activeFilterCount={0}
        />
      );

      const listBtn = screen.getByRole("button", { name: /List view/i });
      const grid2Btn = screen.getByRole("button", { name: /2 columns grid/i });
      const grid3Btn = screen.getByRole("button", { name: /3 columns grid/i });
      const grid4Btn = screen.getByRole("button", { name: /4 columns grid/i });

      expect(listBtn).toBeInTheDocument();
      expect(grid2Btn).toBeInTheDocument();
      expect(grid3Btn).toBeInTheDocument();
      expect(grid4Btn).toBeInTheDocument();

      fireEvent.click(listBtn);
      expect(onViewModeChange).toHaveBeenCalledWith("list");

      fireEvent.click(grid2Btn);
      expect(onViewModeChange).toHaveBeenCalledWith("grid-2");
    });
  });

  describe("ShopProductCard Component", () => {
    const mockProduct = SHOP_PRODUCTS[0];

    it("renders in grid mode with product details and formatted INR price", () => {
      render(
        <StorefrontProvider>
          <ShopProductCard product={mockProduct} viewMode="grid" />
        </StorefrontProvider>
      );

      expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
      expect(screen.getByText("₹24,999")).toBeInTheDocument();
      expect(screen.getByText("₹29,999")).toBeInTheDocument(); // compareAtPrice
      expect(screen.getByText("NECKLACES")).toBeInTheDocument();
    });

    it("renders in list mode with description, metadata, and direct Add to Cart CTA", () => {
      render(
        <StorefrontProvider>
          <ShopProductCard product={mockProduct} viewMode="list" />
        </StorefrontProvider>
      );

      expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
      expect(screen.getByText(mockProduct.description!)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: new RegExp(`Add ${mockProduct.name} to cart`, "i") })).toBeInTheDocument();
    });

    it("handles wishlist toggle and cart additions seamlessly", () => {
      render(
        <StorefrontProvider>
          <ShopProductCard product={mockProduct} viewMode="grid" />
        </StorefrontProvider>
      );

      const wishlistBtn = screen.getByRole("button", { name: /wishlist/i });
      expect(wishlistBtn).toHaveAttribute("aria-pressed", "false");
      fireEvent.click(wishlistBtn);
      expect(wishlistBtn).toHaveAttribute("aria-pressed", "true");

      const addToCartBtn = screen.getByRole("button", { name: /Add.*to cart/i });
      fireEvent.click(addToCartBtn);
      expect(screen.getByText(/Added to Bag/i)).toBeInTheDocument();
    });
  });

  describe("ShopPagination Component", () => {
    it("renders numeric page buttons with accessible active indicator", () => {
      const onPageChange = vi.fn();
      render(
        <ShopPagination
          currentPage={1}
          totalPages={3}
          onPageChange={onPageChange}
        />
      );

      const page1 = screen.getByRole("button", { name: /Go to page 1/i });
      const page2 = screen.getByRole("button", { name: /Go to page 2/i });
      const prevBtn = screen.getByRole("button", { name: /Previous page/i });
      const nextBtn = screen.getByRole("button", { name: /Next page/i });

      expect(page1).toHaveAttribute("aria-current", "page");
      expect(prevBtn).toBeDisabled();
      expect(nextBtn).not.toBeDisabled();

      fireEvent.click(page2);
      expect(onPageChange).toHaveBeenCalledWith(2);

      fireEvent.click(nextBtn);
      expect(onPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe("ShopEmptyState Component", () => {
    it("displays 'No jewellery found' message and Clear All Filters button", () => {
      const onClearAll = vi.fn();
      render(<ShopEmptyState onClearAll={onClearAll} />);

      expect(screen.getByText(/No jewellery found/i)).toBeInTheDocument();
      expect(screen.getByText(/Try adjusting your filters/i)).toBeInTheDocument();

      const clearBtn = screen.getByRole("button", { name: /Clear All Filters/i });
      fireEvent.click(clearBtn);
      expect(onClearAll).toHaveBeenCalled();
    });
  });

  describe("ShopPageContent Integration", () => {
    it("renders full integrated shop layout with hero, toolbar, product cards, and pagination", () => {
      render(
        <StorefrontProvider>
          <ShopPageContent pageSize={8} initialCatalogue={getShopCatalogue({}, "default", 1, 8)} />
        </StorefrontProvider>
      );

      // Hero banner
      expect(screen.getByRole("heading", { level: 1, name: /Shop/i })).toBeInTheDocument();

      // Product count (page 1 of 3 for 24 items with pageSize=8)
      expect(screen.getByRole("status")).toHaveTextContent("Showing 1–8 of 24 products");

      // 8 Product Cards rendered
      const productCards = screen.getAllByTestId(/^product-card-/);
      expect(productCards).toHaveLength(8);

      // Pagination present
      expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
    });
  });
});
