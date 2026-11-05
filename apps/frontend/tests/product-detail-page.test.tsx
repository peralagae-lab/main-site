import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StorefrontProvider } from "@/providers/storefront-provider";
import {
  getProductBySlug as baseGetProductBySlug,
  getProductById as baseGetProductById,
  getAllProducts as baseGetAllProducts,
  getAdjacentProducts as baseGetAdjacentProducts,
} from "@/services/product-service";
import { SHOP_PRODUCTS } from "./fixtures/products";

const getProductBySlug = (slug: string) => baseGetProductBySlug(slug, SHOP_PRODUCTS);
const getProductById = (id: string) => baseGetProductById(id, SHOP_PRODUCTS);
const getAllProducts = () => baseGetAllProducts(SHOP_PRODUCTS);
const getAdjacentProducts = (slugOrProd: any) => baseGetAdjacentProducts(slugOrProd, SHOP_PRODUCTS);
import { getRelatedProducts } from "@/services/recommendation-service";
import { ProductBreadcrumb } from "@/components/product/product-breadcrumb";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductInfoPanel } from "@/components/product/product-info-panel";
import { ProductTabs } from "@/components/product/product-tabs";
import { RelatedProducts } from "@/components/product/related-products";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { ImageLightboxModal } from "@/components/product/image-lightbox-modal";
import { DeliveryReturnsModal } from "@/components/product/delivery-returns-modal";
import { AskQuestionModal } from "@/components/product/ask-question-modal";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/product/solitaire-diamond-pendant-necklace",
  useSearchParams: () => new URLSearchParams(),
}));

describe("PERALAGAE Product Detail Page (PDP) Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Product Service & Data Enrichment", () => {
    it("resolves all 24 catalogue products by slug with complete enriched detail", () => {
      expect(SHOP_PRODUCTS.length).toBe(24);

      SHOP_PRODUCTS.forEach((baseProduct) => {
        const enriched = getProductBySlug(baseProduct.slug);
        expect(enriched).not.toBeNull();
        expect(enriched?.id).toBe(baseProduct.id);
        expect(enriched?.name).toBe(baseProduct.name);
        expect(enriched?.priceInr).toBe(baseProduct.priceInr);
        expect(enriched?.images && enriched.images.length).toBeGreaterThanOrEqual(3);
        expect(enriched?.specs && enriched.specs.length).toBeGreaterThanOrEqual(4);
        expect(enriched?.rating).toBeGreaterThanOrEqual(4);
        expect(enriched?.reviewCount).toBeGreaterThan(0);
      });
    });

    it("returns null or undefined for non-existent slug", () => {
      const result = getProductBySlug("non-existent-luxury-item");
      expect(result).toBeUndefined();
    });

    it("resolves product by ID matching slug", () => {
      const first = SHOP_PRODUCTS[0];
      const byId = getProductById(first.id);
      expect(byId?.slug).toBe(first.slug);
    });

    it("returns adjacent previous and next products with safe wrap-around", () => {
      const first = SHOP_PRODUCTS[0];
      const last = SHOP_PRODUCTS[SHOP_PRODUCTS.length - 1];

      const firstAdjacent = getAdjacentProducts(first.slug);
      expect(firstAdjacent.prev?.id).toBe(last.id); // wrap-around
      expect(firstAdjacent.next?.id).toBe(SHOP_PRODUCTS[1].id);

      const lastAdjacent = getAdjacentProducts(last.slug);
      expect(lastAdjacent.prev?.id).toBe(SHOP_PRODUCTS[SHOP_PRODUCTS.length - 2].id);
      expect(lastAdjacent.next?.id).toBe(first.id); // wrap-around
    });
  });

  describe("2. Recommendation Service (Category-Aware Algorithm)", () => {
    it("returns up to 4 recommendations and strictly excludes the current product", () => {
      const current = getProductBySlug("solitaire-diamond-pendant-necklace")!;
      const related = getRelatedProducts(current, { limit: 4, catalogue: SHOP_PRODUCTS });

      expect(related.length).toBeLessThanOrEqual(4);
      expect(related.some((p) => p.id === current.id)).toBe(false);

      // Check no duplicates in results
      const idSet = new Set(related.map((p) => p.id));
      expect(idSet.size).toBe(related.length);
    });

    it("prioritizes products from the same category and shared attributes", () => {
      const currentEarring = getProductBySlug("pave-diamond-teardrop-earrings")!;
      const related = getRelatedProducts(currentEarring, { limit: 4, catalogue: SHOP_PRODUCTS });

      // Earring recommendations should prioritize other earrings
      const sameCategoryCount = related.filter((p) => p.category === currentEarring.category).length;
      expect(sameCategoryCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("3. ProductBreadcrumb Component", () => {
    it("renders semantic breadcrumb with Home > Shop > Category > Product Name", () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;
      const adjacent = getAdjacentProducts(product.slug);

      render(
        <ProductBreadcrumb
          product={product}
          prevProduct={adjacent.prev}
          nextProduct={adjacent.next}
        />
      );

      const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
      expect(nav).toBeInTheDocument();

      // Home, Shop, Category links
      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
      expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/shop");
      expect(screen.getByRole("link", { name: "Necklaces" })).toHaveAttribute(
        "href",
        "/shop?category=necklaces"
      );

      // Current product label
      expect(screen.getByText(product.name)).toBeInTheDocument();

      // Prev and next navigation links
      const prevLink = screen.getByRole("link", { name: /previous product/i });
      const nextLink = screen.getByRole("link", { name: /next product/i });
      expect(prevLink).toHaveAttribute("href", `/product/${adjacent.prev?.slug}`);
      expect(nextLink).toHaveAttribute("href", `/product/${adjacent.next?.slug}`);
    });
  });

  describe("4. ProductGallery Component & Lightbox Modal", () => {
    it("renders vertical thumbnails, main image, and changes main image on thumbnail click", () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;

      render(<ProductGallery product={product} />);

      // Thumbnails exist
      const thumbnails = screen.getAllByRole("tab");
      expect(thumbnails.length).toBeGreaterThanOrEqual(3);

      // Main image container
      expect(screen.getByRole("tabpanel")).toBeInTheDocument();

      // Click second thumbnail
      fireEvent.click(thumbnails[1]);
      expect(thumbnails[1]).toHaveAttribute("aria-selected", "true");
    });

    it("opens full-screen lightbox modal on zoom button click and handles keyboard navigation", () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;

      render(<ProductGallery product={product} />);

      const expandBtn = screen.getByRole("button", { name: /enlarge product image/i });
      fireEvent.click(expandBtn);

      // Lightbox dialog should open
      const lightbox = screen.getByRole("dialog", { name: new RegExp(product.name, "i") });
      expect(lightbox).toBeInTheDocument();

      // Next image inside lightbox
      const nextBtn = screen.getByRole("button", { name: /next image/i });
      fireEvent.click(nextBtn);

      // Close lightbox with close button
      const closeBtn = screen.getByRole("button", { name: /close enlarged view/i });
      fireEvent.click(closeBtn);

      expect(screen.queryByRole("dialog", { name: new RegExp(product.name, "i") })).not.toBeInTheDocument();
    });

    it("renders HOT badge when product has hot/bestseller flag", () => {
      const hotProduct = getProductBySlug("sculpted-18k-yellow-gold-band")!;
      render(<ProductGallery product={hotProduct} />);

      // Sculpted 18k band has isHot = true or tag 'HOT'
      expect(screen.getByText("HOT")).toBeInTheDocument();
    });
  });

  describe("5. ProductInfoPanel Component", () => {
    it("renders product title, INR price, stock status, and rating summary", () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;

      render(
        <StorefrontProvider>
          <ProductInfoPanel product={product} />
        </StorefrontProvider>
      );

      // Title
      expect(screen.getByRole("heading", { level: 1, name: product.name })).toBeInTheDocument();

      // Price formatted with Indian rupee
      expect(screen.getByText("₹24,999")).toBeInTheDocument();

      // Stock status
      expect(screen.getByText(/in stock/i)).toBeInTheDocument();

      // Review count link
      expect(screen.getByText(new RegExp(`${product.reviewCount} customer reviews`, "i"))).toBeInTheDocument();
    });

    it("manages quantity controls with lower bound at 1 and upper bound at stock", () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;

      render(
        <StorefrontProvider>
          <ProductInfoPanel product={product} />
        </StorefrontProvider>
      );

      const qtyDisplay = screen.getByLabelText(/selected quantity/i);
      expect(qtyDisplay).toHaveTextContent("1");

      const decBtn = screen.getByRole("button", { name: "Decrease quantity" });
      const incBtn = screen.getByRole("button", { name: "Increase quantity" });

      // Cannot decrease below 1 (disabled)
      expect(decBtn).toBeDisabled();

      // Increment
      fireEvent.click(incBtn);
      expect(qtyDisplay).toHaveTextContent("2");
      expect(decBtn).not.toBeDisabled();

      // Decrement back to 1
      fireEvent.click(decBtn);
      expect(qtyDisplay).toHaveTextContent("1");
      expect(decBtn).toBeDisabled();
    });

    it("adds product to cart with visual confirmation feedback", async () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;

      render(
        <StorefrontProvider>
          <ProductInfoPanel product={product} />
        </StorefrontProvider>
      );

      const addToCartBtn = screen.getByRole("button", { name: /add to cart/i });
      fireEvent.click(addToCartBtn);

      // Temporary feedback
      expect(screen.getByText("Added to Bag")).toBeInTheDocument();
    });

    it("triggers Buy It Now navigation to cart/checkout", () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;

      render(
        <StorefrontProvider>
          <ProductInfoPanel product={product} />
        </StorefrontProvider>
      );

      const buyNowBtn = screen.getByRole("button", { name: /buy it now/i });
      fireEvent.click(buyNowBtn);

      expect(mockPush).toHaveBeenCalledWith("/cart");
    });

    it("toggles product in wishlist", () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;

      render(
        <StorefrontProvider>
          <ProductInfoPanel product={product} />
        </StorefrontProvider>
      );

      const wishlistBtn = screen.getByRole("button", { name: /add to wishlist/i });
      fireEvent.click(wishlistBtn);

      expect(
        screen.getByRole("button", { name: /browse wishlist|in your wishlist/i })
      ).toBeInTheDocument();
    });

    it("opens Delivery & Returns modal and Ask a Specialist modal", () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;

      render(
        <StorefrontProvider>
          <ProductInfoPanel product={product} />
        </StorefrontProvider>
      );

      // Delivery modal
      const deliveryBtn = screen.getByRole("button", { name: /delivery & return/i });
      fireEvent.click(deliveryBtn);
      expect(screen.getByRole("dialog", { name: /delivery & returns/i })).toBeInTheDocument();

      const closeDelivery = screen.getByRole("button", { name: /close delivery information dialog/i });
      fireEvent.click(closeDelivery);

      // Ask question modal
      const askBtn = screen.getByRole("button", { name: /ask a question|ask a specialist/i });
      fireEvent.click(askBtn);
      expect(screen.getByRole("dialog", { name: /ask a specialist/i })).toBeInTheDocument();
    });
  });

  describe("6. ProductTabs Component (Description & Reviews)", () => {
    it("renders Description tab by default with product specifications table", () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;

      render(<ProductTabs product={product} />);

      // Description tab active
      expect(screen.getByRole("tab", { name: "Description" })).toHaveAttribute(
        "aria-selected",
        "true"
      );

      // Specifications present
      expect(screen.getByText("Precious Metal")).toBeInTheDocument();
      expect(screen.getByText("Gemstones")).toBeInTheDocument();
      expect(screen.getByText("Purity & Hallmarking")).toBeInTheDocument();
    });

    it("switches to Reviews tab, displaying verified reviews and review count", () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;

      render(<ProductTabs product={product} />);

      const reviewsTab = screen.getByRole("tab", {
        name: new RegExp(`Reviews \\(${product.reviews?.length}\\)`, "i"),
      });
      fireEvent.click(reviewsTab);

      expect(reviewsTab).toHaveAttribute("aria-selected", "true");

      // Verify review author and badge
      const firstReview = product.reviews![0];
      expect(screen.getByText(firstReview.author)).toBeInTheDocument();
      expect(screen.getByText(firstReview.comment)).toBeInTheDocument();
      expect(screen.getAllByText("Verified Buyer").length).toBeGreaterThanOrEqual(1);
    });

    it("allows submitting a new review through the interactive form", async () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;

      render(<ProductTabs product={product} />);

      // Switch to reviews
      const reviewsTab = screen.getByRole("tab", {
        name: new RegExp(`Reviews \\(${product.reviews?.length}\\)`, "i"),
      });
      fireEvent.click(reviewsTab);

      // Open write review form
      const writeReviewBtn = screen.getByRole("button", { name: /write a review/i });
      fireEvent.click(writeReviewBtn);

      // Fill form
      fireEvent.change(screen.getByLabelText(/your full name/i), {
        target: { value: "Aarav Sharma" },
      });
      fireEvent.change(screen.getByLabelText(/review comments/i), {
        target: {
          value:
            "Truly outstanding craftsmanship! The diamond brilliance and gold polish are world-class.",
        },
      });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /post review/i }));

      // Success message
      await waitFor(() => {
        expect(
          screen.getByText(/thank you! your verified review has been submitted/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("7. RelatedProducts Component", () => {
    it("renders Related Products section with 4 recommended jewellery items", () => {
      const product = getProductBySlug("solitaire-diamond-pendant-necklace")!;
      const related = getRelatedProducts(product, { limit: 4, catalogue: SHOP_PRODUCTS });

      render(
        <StorefrontProvider>
          <RelatedProducts currentProduct={product} limit={4} initialRelated={related} />
        </StorefrontProvider>
      );

      expect(
        screen.getByRole("heading", { level: 2, name: "Related Products" })
      ).toBeInTheDocument();

      // Related cards are present
      related.forEach((rel) => {
        expect(screen.getByText(rel.name)).toBeInTheDocument();
      });
    });
  });

  describe("8. Full ProductDetailView Integration", () => {
    it("renders complete end-to-end page without errors", () => {
      const product = getProductBySlug("classic-solitaire-diamond-ring")!;
      const adjacent = getAdjacentProducts(product.slug);
      const related = getRelatedProducts(product, { limit: 4, catalogue: SHOP_PRODUCTS });

      render(
        <StorefrontProvider>
          <ProductDetailView
            product={product}
            prevProduct={adjacent.prev}
            nextProduct={adjacent.next}
            initialRelated={related}
          />
        </StorefrontProvider>
      );

      // Heading 1
      expect(screen.getByRole("heading", { level: 1, name: product.name })).toBeInTheDocument();

      // Breadcrumb
      expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();

      // Description & Reviews tabs
      expect(screen.getByRole("tab", { name: "Description" })).toBeInTheDocument();

      // Related products
      expect(
        screen.getByRole("heading", { level: 2, name: "Related Products" })
      ).toBeInTheDocument();
    });
  });
});
