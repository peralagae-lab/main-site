import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StorefrontProvider, type CartItem } from "@/providers/storefront-provider";
import { CartBreadcrumb } from "@/components/cart/cart-breadcrumb";
import { CartHero } from "@/components/cart/cart-hero";
import { CartItemRow } from "@/components/cart/cart-item-row";
import { CartItemsTable } from "@/components/cart/cart-items-table";
import { CouponForm } from "@/components/cart/coupon-form";
import { CartTotals } from "@/components/cart/cart-totals";
import { CartEmptyState } from "@/components/cart/cart-empty-state";
import { CartRecommendations } from "@/components/cart/cart-recommendations";
import { CartPageContent } from "@/components/cart/cart-page-content";
import {
  getRecommendedProducts,
} from "@/services/recommendation-service";
import {
  validateCoupon,
  calculateDiscount,
  VALID_COUPONS,
} from "@/services/coupon-service";
import { SHOP_PRODUCTS } from "./fixtures/products";
import type { Product } from "@/types/product";

const mockProductA: Product = {
  id: "prod-ring-1",
  name: "Solitaire Diamond Ring",
  slug: "solitaire-diamond-ring",
  category: "Rings",
  priceInr: 45000,
  compareAtPriceInr: 52000,
  image: { src: "/images/products/ring-1.jpg", alt: "Solitaire Diamond Ring" },
  materials: ["Gold", "Diamond"],
  inStock: true,
};

const mockProductB: Product = {
  id: "prod-necklace-1",
  name: "Emerald Cascade Necklace",
  slug: "emerald-cascade-necklace",
  category: "Necklaces",
  priceInr: 32000,
  image: { src: "/images/products/necklace-1.jpg", alt: "Emerald Cascade Necklace" },
  materials: ["Gold", "Emerald"],
  inStock: true,
};

const mockCartItemA: CartItem = {
  id: "cart-prod-ring-1",
  product: mockProductA,
  quantity: 2,
};

const mockCartItemB: CartItem = {
  id: "cart-prod-necklace-1",
  product: mockProductB,
  quantity: 1,
};

describe("PERALAGAE Cart Page & Recommendations Suite", () => {
  /* -------------------------------------------------------------------------
   * 1. Recommendation Engine Unit Tests
   * ------------------------------------------------------------------------- */
  describe("Recommendation Service (getRecommendedProducts)", () => {
    it("returns up to 4 recommendations for an empty cart as fallback", () => {
      const recs = getRecommendedProducts([]);
      expect(recs.length).toBeLessThanOrEqual(4);
      expect(recs.length).toBeGreaterThan(0);
    });

    it("strictly excludes all products currently in the customer's cart", () => {
      const cartItems: CartItem[] = [mockCartItemA, mockCartItemB];
      const recs = getRecommendedProducts(cartItems);

      const recIds = recs.map((r) => r.id);
      expect(recIds).not.toContain(mockProductA.id);
      expect(recIds).not.toContain(mockProductB.id);
    });

    it("prioritizes same-category products (Priority 1) when cart contains a ring", () => {
      // Cart contains only a ring
      const cartItems: CartItem[] = [{ id: "c-1", product: SHOP_PRODUCTS.find((p) => p.category.toLowerCase().includes("ring"))!, quantity: 1 }];
      const recs = getRecommendedProducts(cartItems, { limit: 4 });

      // Rings should be present in recommendations
      const hasRing = recs.some((r) => r.category.toLowerCase().includes("ring"));
      expect(hasRing).toBe(true);
    });

    it("falls back to related categories (Priority 2) and avoids duplicate IDs", () => {
      const cartItems: CartItem[] = [mockCartItemA];
      const recs = getRecommendedProducts(cartItems, { limit: 4 });

      // No duplicates
      const uniqueIds = new Set(recs.map((r) => r.id));
      expect(uniqueIds.size).toBe(recs.length);

      // Recommendations should not include the cart product
      expect(uniqueIds.has(mockProductA.id)).toBe(false);
    });

    it("excludes out-of-stock products from recommendations", () => {
      const outOfStockProduct: Product = {
        ...mockProductA,
        id: "prod-oos-1",
        inStock: false,
      };
      const customCatalogue = [outOfStockProduct, ...SHOP_PRODUCTS];
      const recs = getRecommendedProducts([], { catalogue: customCatalogue });

      expect(recs.map((r) => r.id)).not.toContain("prod-oos-1");
    });
  });

  /* -------------------------------------------------------------------------
   * 2. Coupon Service Unit Tests
   * ------------------------------------------------------------------------- */
  describe("Coupon Service (validateCoupon & calculateDiscount)", () => {
    it("validates percentage coupon SUMMER15 and calculates 15% discount", () => {
      const result = validateCoupon("SUMMER15", 50000);
      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(7500); // 15% of 50,000
      expect(result.message).toContain("SUMMER15");
    });

    it("rejects unknown / arbitrary coupon codes", () => {
      const result = validateCoupon("FAKEDISCOUNT99", 50000);
      expect(result.isValid).toBe(false);
      expect(result.discountAmount).toBe(0);
      expect(result.message).toContain("invalid");
    });

    it("rejects expired coupon EXPIRED20", () => {
      const result = validateCoupon("EXPIRED20", 50000);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("expired");
    });

    it("enforces minimum subtotal threshold for GOLD5000", () => {
      // Below threshold of 30,000
      const belowMin = validateCoupon("GOLD5000", 25000);
      expect(belowMin.isValid).toBe(false);
      expect(belowMin.message).toContain("minimum order");

      // Meeting threshold of 30,000
      const validOrder = validateCoupon("GOLD5000", 40000);
      expect(validOrder.isValid).toBe(true);
      expect(validOrder.discountAmount).toBe(5000);
    });

    it("recalculates discount amount dynamically when cart subtotal changes", () => {
      const coupon = VALID_COUPONS["PERA10"]; // 10%
      expect(calculateDiscount(coupon, 40000)).toBe(4000);
      expect(calculateDiscount(coupon, 20000)).toBe(2000);
      expect(calculateDiscount(null, 50000)).toBe(0);
    });
  });

  /* -------------------------------------------------------------------------
   * 3. CartBreadcrumb Component
   * ------------------------------------------------------------------------- */
  describe("CartBreadcrumb Component", () => {
    it("renders Home > Shop > Cart semantic breadcrumb navigation", () => {
      render(<CartBreadcrumb />);

      const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
      expect(nav).toBeInTheDocument();

      const homeLink = screen.getByRole("link", { name: "Home" });
      expect(homeLink).toHaveAttribute("href", "/");

      const shopLink = screen.getByRole("link", { name: "Shop" });
      expect(shopLink).toHaveAttribute("href", "/shop");

      const cartItem = screen.getByText("Cart", { selector: "span" });
      expect(cartItem).toBeInTheDocument();
    });
  });

  /* -------------------------------------------------------------------------
   * 3b. CartHero Component
   * ------------------------------------------------------------------------- */
  describe("CartHero Component", () => {
    it("renders page title banner with jewellery photography background and breadcrumb", () => {
      render(<CartHero title="Cart" />);

      const hero = screen.getByTestId("cart-hero-banner");
      expect(hero).toBeInTheDocument();

      const heading = screen.getByRole("heading", { level: 1, name: "Cart" });
      expect(heading).toBeInTheDocument();

      const image = screen.getByAltText(/PERALAGAE Luxury Jewellery Shopping Bag Banner/i);
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", expect.stringContaining("banner-charm-bracelets.jpg"));

      const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
      expect(nav).toBeInTheDocument();
    });
  });

  /* -------------------------------------------------------------------------
   * 4. CartItemRow & Quantity Control
   * ------------------------------------------------------------------------- */
  describe("CartItemRow Component", () => {
    it("renders product thumbnail, title, formatted INR unit price and line subtotal", () => {
      render(
        <table>
          <tbody>
            <CartItemRow
              item={mockCartItemA}
              onUpdateQuantity={vi.fn()}
              onRemove={vi.fn()}
              layout="table-row"
            />
          </tbody>
        </table>
      );

      expect(screen.getByText("Solitaire Diamond Ring")).toBeInTheDocument();
      expect(screen.getByText("₹45,000")).toBeInTheDocument(); // Unit price
      expect(screen.getByText("₹90,000")).toBeInTheDocument(); // 2 x 45,000
    });

    it("triggers onUpdateQuantity when increment or decrement buttons are clicked", () => {
      const onUpdateQuantity = vi.fn();
      render(
        <table>
          <tbody>
            <CartItemRow
              item={mockCartItemA} // quantity = 2
              onUpdateQuantity={onUpdateQuantity}
              onRemove={vi.fn()}
              layout="table-row"
            />
          </tbody>
        </table>
      );

      const increaseBtn = screen.getByRole("button", { name: /Increase quantity/i });
      fireEvent.click(increaseBtn);
      expect(onUpdateQuantity).toHaveBeenCalledWith("prod-ring-1", 3);

      const decreaseBtn = screen.getByRole("button", { name: /Decrease quantity/i });
      fireEvent.click(decreaseBtn);
      expect(onUpdateQuantity).toHaveBeenCalledWith("prod-ring-1", 1);
    });

    it("disables decrement button when quantity is 1 to prevent <= 0", () => {
      render(
        <table>
          <tbody>
            <CartItemRow
              item={{ ...mockCartItemA, quantity: 1 }}
              onUpdateQuantity={vi.fn()}
              onRemove={vi.fn()}
              layout="table-row"
            />
          </tbody>
        </table>
      );

      const decreaseBtn = screen.getByRole("button", { name: /Decrease quantity/i });
      expect(decreaseBtn).toBeDisabled();
    });

    it("triggers onRemove when remove button is clicked", () => {
      const onRemove = vi.fn();
      render(
        <table>
          <tbody>
            <CartItemRow
              item={mockCartItemA}
              onUpdateQuantity={vi.fn()}
              onRemove={onRemove}
              layout="table-row"
            />
          </tbody>
        </table>
      );

      const removeBtn = screen.getByRole("button", { name: /Remove.*from cart/i });
      fireEvent.click(removeBtn);
      expect(onRemove).toHaveBeenCalledWith("prod-ring-1");
    });
  });

  /* -------------------------------------------------------------------------
   * 5. CartTotals Component
   * ------------------------------------------------------------------------- */
  describe("CartTotals Component", () => {
    it("renders subtotal, free insured delivery, final total, and Proceed to Checkout button", () => {
      render(
        <CartTotals
          subtotalInr={90000}
          discountInr={0}
          appliedCoupon={null}
        />
      );

      expect(screen.getByText("Cart Totals")).toBeInTheDocument();
      expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("₹90,000");
      expect(screen.getByText(/Free/i)).toBeInTheDocument();
      expect(screen.getByTestId("cart-final-total")).toHaveTextContent("₹90,000");

      const checkoutBtn = screen.getByTestId("proceed-to-checkout-btn");
      expect(checkoutBtn).toHaveAttribute("href", "/checkout");
    });

    it("subtracts discount correctly when a coupon is applied", () => {
      render(
        <CartTotals
          subtotalInr={90000}
          discountInr={13500} // 15% discount
          appliedCoupon={VALID_COUPONS["SUMMER15"]}
        />
      );

      expect(screen.getByTestId("cart-discount-row")).toBeInTheDocument();
      expect(screen.getByTestId("cart-discount-amount")).toHaveTextContent("₹13,500");
      // 90,000 - 13,500 = 76,500
      expect(screen.getByTestId("cart-final-total")).toHaveTextContent("₹76,500");
    });
  });

  /* -------------------------------------------------------------------------
   * 6. CouponForm Component
   * ------------------------------------------------------------------------- */
  describe("CouponForm Component", () => {
    it("calls onApplyCoupon when valid code is entered", () => {
      const onApplyCoupon = vi.fn().mockReturnValue({ success: true, message: "Applied" });
      render(
        <CouponForm
          appliedCoupon={null}
          onApplyCoupon={onApplyCoupon}
          onRemoveCoupon={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/Coupon code/i);
      const applyBtn = screen.getByRole("button", { name: /Apply Coupon/i });

      fireEvent.change(input, { target: { value: "SUMMER15" } });
      fireEvent.click(applyBtn);

      expect(onApplyCoupon).toHaveBeenCalledWith("SUMMER15");
    });

    it("displays error alert when empty coupon code is submitted", () => {
      render(
        <CouponForm
          appliedCoupon={null}
          onApplyCoupon={vi.fn()}
          onRemoveCoupon={vi.fn()}
        />
      );

      const applyBtn = screen.getByRole("button", { name: /Apply Coupon/i });
      fireEvent.click(applyBtn);

      expect(screen.getByRole("alert")).toHaveTextContent(/Please enter a coupon code/i);
    });

    it("renders applied coupon banner and triggers onRemoveCoupon when Remove is clicked", () => {
      const onRemoveCoupon = vi.fn();
      render(
        <CouponForm
          appliedCoupon={VALID_COUPONS["SUMMER15"]}
          onApplyCoupon={vi.fn()}
          onRemoveCoupon={onRemoveCoupon}
        />
      );

      expect(screen.getByTestId("applied-coupon-banner")).toHaveTextContent("SUMMER15 Applied");

      const removeBtn = screen.getByRole("button", { name: /Remove applied coupon/i });
      fireEvent.click(removeBtn);

      expect(onRemoveCoupon).toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------
   * 7. CartEmptyState Component
   * ------------------------------------------------------------------------- */
  describe("CartEmptyState Component", () => {
    it("renders Your Cart Is Empty heading and Continue Shopping CTA", () => {
      render(<CartEmptyState />);

      expect(screen.getByText("Your Cart Is Empty")).toBeInTheDocument();
      expect(screen.getByText(/Discover jewellery that makes every moment special/i)).toBeInTheDocument();

      const cta = screen.getByRole("link", { name: /Continue Shopping/i });
      expect(cta).toHaveAttribute("href", "/shop");
    });
  });

  /* -------------------------------------------------------------------------
   * 8. CartRecommendations Component
   * ------------------------------------------------------------------------- */
  describe("CartRecommendations Component", () => {
    it("renders You May Be Interested In… heading with up to 4 catalogue cards", () => {
      render(
        <StorefrontProvider>
          <CartRecommendations cartItems={[mockCartItemA]} />
        </StorefrontProvider>
      );

      expect(screen.getByRole("heading", { name: /You May Be Interested In…/i })).toBeInTheDocument();
      const productCards = screen.getAllByRole("article");
      expect(productCards.length).toBeLessThanOrEqual(4);
      expect(productCards.length).toBeGreaterThan(0);
    });
  });

  /* -------------------------------------------------------------------------
   * 9. CartItemsTable Component
   * ------------------------------------------------------------------------- */
  describe("CartItemsTable Component", () => {
    it("renders table with items, continue shopping, and clear shopping bag button", () => {
      const onClearCart = vi.fn();
      render(
        <CartItemsTable
          items={[mockCartItemA, mockCartItemB]}
          onUpdateQuantity={vi.fn()}
          onRemoveItem={vi.fn()}
          onClearCart={onClearCart}
        />
      );

      expect(screen.getByRole("link", { name: /Continue Shopping/i })).toHaveAttribute("href", "/shop");
      const clearBtn = screen.getByRole("button", { name: /Clear Shopping Bag/i });
      fireEvent.click(clearBtn);
      expect(onClearCart).toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------
   * 10. CartPageContent Component
   * ------------------------------------------------------------------------- */
  describe("CartPageContent Component", () => {
    it("renders empty state when cart has no items", () => {
      render(
        <StorefrontProvider>
          <CartPageContent />
        </StorefrontProvider>
      );

      expect(screen.getByText("Cart", { selector: "h1" })).toBeInTheDocument();
      expect(screen.getByTestId("cart-empty-state")).toBeInTheDocument();
      expect(screen.getByTestId("cart-recommendations-section")).toBeInTheDocument();
    });
  });
});
