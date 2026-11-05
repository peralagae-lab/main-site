import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StorefrontProvider } from "@/providers/storefront-provider";
import { SiteHeader } from "@/components/navbar/site-header";
import { SearchOverlay } from "@/components/search/search-overlay";
import { searchCatalogue } from "@/services/search-service";
import { SHOP_PRODUCTS } from "./fixtures/products";

describe("PERALAGAE Premium Glass Search Overlay Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("1. searchCatalogue Relevance Algorithm", () => {
    it("returns empty result for empty or whitespace query", () => {
      const resEmpty = searchCatalogue("");
      expect(resEmpty.products).toHaveLength(0);
      expect(resEmpty.totalMatches).toBe(0);

      const resSpaces = searchCatalogue("   ");
      expect(resSpaces.products).toHaveLength(0);
      expect(resSpaces.totalMatches).toBe(0);
    });

    it("matches products by category in case-insensitive manner (e.g. 'ring' and 'RINGS')", () => {
      const resRings = searchCatalogue("ring", SHOP_PRODUCTS);
      expect(resRings.products.length).toBeGreaterThan(0);
      expect(resRings.products.some((p) => p.category === "RINGS")).toBe(true);

      const resNecklaces = searchCatalogue("NECKLACES", SHOP_PRODUCTS);
      expect(resNecklaces.products.length).toBeGreaterThan(0);
      expect(resNecklaces.products.some((p) => p.category === "NECKLACES")).toBe(true);
    });

    it("matches products by precious material (e.g. 'gold', 'platinum', 'diamond')", () => {
      const resGold = searchCatalogue("gold", SHOP_PRODUCTS);
      expect(resGold.products.length).toBeGreaterThan(0);
      resGold.products.forEach((p) => {
        const hasGold =
          p.material?.toLowerCase().includes("gold") ||
          p.materials?.some((m) => m.toLowerCase().includes("gold"));
        expect(hasGold).toBe(true);
      });
    });

    it("ranks exact or prefix name matches above general description matches", () => {
      const res = searchCatalogue("Solitaire Diamond Pendant Necklace", SHOP_PRODUCTS);
      expect(res.products.length).toBeGreaterThan(0);
      expect(res.products[0].name).toBe("Solitaire Diamond Pendant Necklace");
    });

    it("returns zero matches for obscure non-existent queries without errors", () => {
      const res = searchCatalogue("xyz_random_non_existent_piece_999");
      expect(res.products).toHaveLength(0);
      expect(res.totalMatches).toBe(0);
    });
  });

  describe("2. Navbar Search Icon Trigger & Dialog Lifecycle", () => {
    it("opens the glass search overlay when clicking the desktop search button in SiteHeader", async () => {
      render(
        <StorefrontProvider>
          <SiteHeader />
        </StorefrontProvider>
      );

      // Verify overlay is not visible initially
      expect(screen.queryByTestId("search-overlay-content")).not.toBeInTheDocument();

      // Find the desktop search button in the header
      const searchButton = screen.getAllByRole("button", { name: "Search" })[0];
      fireEvent.click(searchButton);

      // Verify overlay opens
      await waitFor(() => {
        expect(screen.getByTestId("search-overlay-content")).toBeInTheDocument();
      });

      // Verify search input is rendered with clear placeholder
      const input = screen.getByTestId("search-overlay-input");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Search jewellery, rings, necklaces...");
    });

    it("closes the search overlay when clicking the close button", async () => {
      render(
        <StorefrontProvider>
          <SiteHeader />
        </StorefrontProvider>
      );

      const searchButton = screen.getAllByRole("button", { name: "Search" })[0];
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId("search-overlay-content")).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId("search-close-button");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("search-overlay-content")).not.toBeInTheDocument();
      });
    });

    it("closes the search overlay when pressing the Escape key", async () => {
      render(
        <StorefrontProvider>
          <SiteHeader />
        </StorefrontProvider>
      );

      const searchButton = screen.getAllByRole("button", { name: "Search" })[0];
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId("search-overlay-content")).toBeInTheDocument();
      });

      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByTestId("search-overlay-content")).not.toBeInTheDocument();
      });
    });
  });

  describe("3. Live Search Input, Suggestions & Dynamic Results", () => {
    it("renders popular search suggestion chips on empty input and triggers search on click", async () => {
      const user = userEvent.setup();
      render(
        <StorefrontProvider>
          <SearchOverlay isOpen={true} onClose={vi.fn()} />
        </StorefrontProvider>
      );

      expect(screen.getByTestId("search-initial-suggestions")).toBeInTheDocument();
      expect(screen.getByText("POPULAR SEARCHES")).toBeInTheDocument();

      // Verify all 4 required compact suggestions
      expect(screen.getByTestId("suggested-search-rings")).toHaveTextContent("Rings");
      expect(screen.getByTestId("suggested-search-necklaces")).toHaveTextContent("Necklaces");
      expect(screen.getByTestId("suggested-search-bracelets")).toHaveTextContent("Bracelets");
      expect(screen.getByTestId("suggested-search-earrings")).toHaveTextContent("Earrings");

      const ringsChip = screen.getByTestId("suggested-search-rings");
      await user.click(ringsChip);

      // Should fill the input and show matching products
      await waitFor(() => {
        expect(screen.getByTestId("search-overlay-input")).toHaveValue("Rings");
        expect(screen.getByTestId("search-product-grid")).toBeInTheDocument();
      });
    });

    it("displays relevant products dynamically as user types", async () => {
      const user = userEvent.setup();
      render(
        <StorefrontProvider>
          <SearchOverlay isOpen={true} onClose={vi.fn()} />
        </StorefrontProvider>
      );

      const input = screen.getByTestId("search-overlay-input");
      await user.type(input, "necklace");

      await waitFor(() => {
        expect(screen.getByTestId("search-product-grid")).toBeInTheDocument();
      });

      // Solitaire Diamond Pendant Necklace should be displayed
      expect(screen.getByText("Solitaire Diamond Pendant Necklace")).toBeInTheDocument();

      // Check INR price formatting
      expect(screen.getByText("₹24,999")).toBeInTheDocument();
    });

    it("renders 'No jewellery found. Try another search.' when query has no matches", async () => {
      const user = userEvent.setup();
      render(
        <StorefrontProvider>
          <SearchOverlay isOpen={true} onClose={vi.fn()} />
        </StorefrontProvider>
      );

      const input = screen.getByTestId("search-overlay-input");
      await user.type(input, "qwertyuiopnonexistent");

      await waitFor(() => {
        expect(screen.getByTestId("search-no-results")).toBeInTheDocument();
      });

      expect(
        screen.getByText("No jewellery found. Try another search.")
      ).toBeInTheDocument();
    });

    it("clears input and restores default state when clear button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <StorefrontProvider>
          <SearchOverlay isOpen={true} onClose={vi.fn()} />
        </StorefrontProvider>
      );

      const input = screen.getByTestId("search-overlay-input");
      await user.type(input, "solitaire");

      await waitFor(() => {
        expect(screen.getByTestId("search-clear-button")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("search-clear-button"));

      expect(input).toHaveValue("");
      await waitFor(() => {
        expect(screen.getByTestId("search-initial-suggestions")).toBeInTheDocument();
      });
    });
  });

  describe("4. Shared Wishlist & Cart Integration Inside Search Overlay", () => {
    it("toggles wishlist directly from search result and updates badge count immediately", async () => {
      const user = userEvent.setup();
      render(
        <StorefrontProvider>
          <SiteHeader />
        </StorefrontProvider>
      );

      // Open search
      const searchButton = screen.getAllByRole("button", { name: "Search" })[0];
      await user.click(searchButton);

      const input = screen.getByTestId("search-overlay-input");
      await user.type(input, "solitaire");

      await waitFor(() => {
        expect(screen.getByTestId("search-wishlist-prod-solitaire-pendant")).toBeInTheDocument();
      });

      // Wishlist initial state: 0 items
      expect(screen.getByTestId("wishlist-badge")).toHaveTextContent("0");

      // Click heart button
      const heartBtn = screen.getByTestId("search-wishlist-prod-solitaire-pendant");
      await user.click(heartBtn);

      // Wishlist count in navbar should immediately increment to 1
      await waitFor(() => {
        expect(screen.getByTestId("wishlist-badge")).toHaveTextContent("1");
      });

      // Click heart again to toggle off
      await user.click(heartBtn);
      await waitFor(() => {
        expect(screen.getByTestId("wishlist-badge")).toHaveTextContent("0");
      });
    });

    it("adds product to cart directly from search result with visual feedback and updates badge count", async () => {
      const user = userEvent.setup();
      render(
        <StorefrontProvider>
          <SiteHeader />
        </StorefrontProvider>
      );

      // Open search
      const searchButton = screen.getAllByRole("button", { name: "Search" })[0];
      await user.click(searchButton);

      const input = screen.getByTestId("search-overlay-input");
      await user.type(input, "solitaire");

      await waitFor(() => {
        expect(screen.getByTestId("search-add-to-cart-prod-solitaire-pendant")).toBeInTheDocument();
      });

      // Cart initial state: 0 items
      expect(screen.getAllByTestId("cart-badge")[0]).toHaveTextContent("0");

      const addToBagBtn = screen.getByTestId("search-add-to-cart-prod-solitaire-pendant");
      await user.click(addToBagBtn);

      // Cart count in navbar should immediately increment to 1
      await waitFor(() => {
        expect(screen.getAllByTestId("cart-badge")[0]).toHaveTextContent("1");
      });

      // Button feedback should show "Added"
      expect(addToBagBtn).toHaveTextContent("Added");
    });
  });
});
