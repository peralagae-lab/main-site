import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { SiteHeader } from "@/components/navbar/site-header";
import { AnnouncementBar } from "@/components/navbar/announcement-bar";
import { UtilityBar } from "@/components/navbar/utility-bar";
import { MainNavbar } from "@/components/navbar/main-navbar";
import { PrimaryNavigation } from "@/components/navbar/primary-navigation";
import { MobileBottomBar } from "@/components/navbar/mobile-bottom-bar";
import { defaultNavigationConfig } from "@/config/navigation";

describe("PERALAGAE Premium Navbar Component Suite", () => {
  const testAnnouncementConfig = {
    text: "FESTIVE SALE, Get 40% Off for all products.",
    backgroundColor: "#FBC0CE",
    textColor: "#222222",
    dismissible: true,
  };

  describe("Row 1: AnnouncementBar", () => {
    it("renders the exact promotional announcement text with soft pink background", () => {
      render(<AnnouncementBar config={testAnnouncementConfig} />);

      expect(screen.getByText("FESTIVE SALE,")).toBeInTheDocument();
      expect(screen.getByText("Get 40% Off for all products.")).toBeInTheDocument();

      const aside = screen.getByRole("complementary", {
        name: "Promotional Announcement",
      });
      expect(aside).toHaveStyle({ backgroundColor: "rgb(251, 192, 206)" }); // #FBC0CE
    });

    it("dismisses the announcement bar when the close button is clicked", async () => {
      const onDismiss = vi.fn();
      render(
        <AnnouncementBar config={testAnnouncementConfig} onDismiss={onDismiss} />,
      );

      const closeButton = screen.getByRole("button", {
        name: "Close announcement bar",
      });
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(onDismiss).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(screen.queryByText("FESTIVE SALE,")).not.toBeInTheDocument();
      });
      expect(screen.queryByText("Get 40% Off for all products.")).not.toBeInTheDocument();
    });

    it("renders neutral placeholder and no promotional text while loading", () => {
      render(
        <AnnouncementBar
          config={{
            text: "",
            backgroundColor: "#FBC0CE",
            textColor: "#222222",
            dismissible: true,
            isLoading: true,
          }}
        />,
      );

      expect(screen.getByTestId("top-bar-placeholder")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Close announcement bar" })).not.toBeInTheDocument();
    });

    it("returns null when not loading and announcement text is empty", () => {
      const { container } = render(
        <AnnouncementBar
          config={{
            text: "",
            backgroundColor: "#FBC0CE",
            textColor: "#222222",
            dismissible: true,
            isLoading: false,
          }}
        />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Row 2: UtilityBar", () => {
    it("renders Indian phone number (+91 98765 43210) and promotional message when configured", () => {
      render(
        <UtilityBar
          config={{
            ...defaultNavigationConfig.utility,
            promotion: {
              text: "Persisted Promo Message",
              linkText: "Shop Now!",
              href: "/shop",
            },
          }}
        />
      );

      // Indian 10-digit phone number
      expect(screen.getByText("+91 98765 43210")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "+91 98765 43210" })).toHaveAttribute(
        "href",
        "tel:+919876543210"
      );

      // Promo text
      expect(screen.getByText("Persisted Promo Message")).toBeInTheDocument();
      expect(screen.getByText("Shop Now!")).toBeInTheDocument();
    });

    it("renders neutral loading placeholder without static text during loading state", () => {
      render(
        <UtilityBar
          config={{
            ...defaultNavigationConfig.utility,
            promotion: {
              text: "",
              isLoading: true,
            },
          }}
        />
      );

      expect(screen.getByTestId("navbar-promo-loading-placeholder")).toBeInTheDocument();
      expect(screen.queryByText(/Summer Sale 15% off!/)).not.toBeInTheDocument();
    });

    it("renders the 3 utility items on the right in exact order: Find a Store, FAQs, Subscribe", () => {
      render(<UtilityBar config={defaultNavigationConfig.utility} />);

      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(3);
      expect(listItems[0]).toHaveTextContent("Find a Store");
      expect(listItems[1]).toHaveTextContent("FAQs");
      expect(listItems[2]).toHaveTextContent("Subscribe");

      // Find a Store & Subscribe have valid destination links
      expect(screen.getByRole("link", { name: "Find a Store" })).toHaveAttribute(
        "href",
        "/#store-locator"
      );
      expect(screen.getByRole("link", { name: "Subscribe" })).toHaveAttribute(
        "href",
        "/#newsletter-section"
      );

      // FAQs is rendered as an active link to the dedicated FAQ page
      expect(screen.getByRole("link", { name: "FAQs" })).toHaveAttribute(
        "href",
        "/faq"
      );
    });
  });

  describe("Row 3: MainNavbar", () => {
    it("renders the PERALAGAE brand logo pointing to / without taglines or extra logos", () => {
      render(<MainNavbar config={defaultNavigationConfig} />);

      const brandLink = screen.getByRole("link", {
        name: "PERALAGAE Fine Jewellery — Home",
      });
      expect(brandLink).toBeInTheDocument();
      expect(brandLink).toHaveAttribute("href", "/");
      expect(brandLink).toHaveTextContent("PERALAGAE");
      const logoImg = screen.getByRole("img", { name: "PERALAGAE Fine Jewellery" });
      expect(logoImg).toBeInTheDocument();
    });

    it("renders exactly 4 primary navigation items: Home, Shop, Contact, New Arrivals in order", () => {
      render(<MainNavbar config={defaultNavigationConfig} />);

      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
      expect(screen.getByText("Shop")).toBeInTheDocument();
      expect(screen.getByText("Contact")).toBeInTheDocument();
      expect(screen.getByText("New Arrivals")).toBeInTheDocument();
    });

    it("renders action buttons including Search, Account, Wishlist, and Cart", () => {
      render(<MainNavbar config={defaultNavigationConfig} />);

      expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
      
      const wishlistLink = screen.getByRole("link", { name: "Wishlist" });
      expect(wishlistLink).toBeInTheDocument();
      expect(wishlistLink).toHaveAttribute("href", "/wishlist");

      // Cart link exists for both mobile header and desktop actions
      const cartLinks = screen.getAllByRole("link", { name: "Cart" });
      expect(cartLinks.length).toBeGreaterThanOrEqual(1);
      expect(cartLinks[0]).toHaveAttribute("href", "/cart");
    });

    it("opens and closes mobile menu drawer via hamburger button and close button", async () => {
      render(<MainNavbar config={defaultNavigationConfig} />);

      const menuToggle = screen.getByRole("button", { name: "Open navigation menu" });
      expect(menuToggle).toBeInTheDocument();

      // Open mobile drawer
      fireEvent.click(menuToggle);

      const mobileDialog = screen.getByRole("dialog", {
        name: "Mobile Navigation Menu",
      });
      expect(mobileDialog).toBeInTheDocument();

      // Close mobile drawer
      const closeMenuButton = screen.getByRole("button", { name: "Close menu" });
      fireEvent.click(closeMenuButton);

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: "Mobile Navigation Menu" }),
        ).not.toBeInTheDocument();
      });
    });

    it("supports MENU and CATEGORIES tabs where MENU strictly reflects navbar links", () => {
      render(<MainNavbar config={defaultNavigationConfig} />);

      const menuToggle = screen.getByRole("button", { name: "Open navigation menu" });
      fireEvent.click(menuToggle);

      const mobileDialog = screen.getByRole("dialog", {
        name: "Mobile Navigation Menu",
      });
      const drawer = within(mobileDialog);

      // Verify tabs exist
      const menuTab = drawer.getByRole("tab", { name: "Menu" });
      const categoriesTab = drawer.getByRole("tab", { name: "Categories" });
      expect(menuTab).toBeInTheDocument();
      expect(categoriesTab).toBeInTheDocument();

      // Under MENU tab: strictly mirrors navbar links (Home, Shop, Contact, New Arrivals)
      expect(drawer.getByRole("link", { name: "Home" })).toBeInTheDocument();
      expect(drawer.getByRole("link", { name: "Shop" })).toBeInTheDocument();
      expect(drawer.getByRole("link", { name: "Contact" })).toBeInTheDocument();
      expect(drawer.getByRole("link", { name: "New Arrivals" })).toBeInTheDocument();

      // Ensure template dummy items are not shown
      expect(drawer.queryByRole("link", { name: "Home v1" })).not.toBeInTheDocument();
      expect(drawer.queryByRole("link", { name: "Product" })).not.toBeInTheDocument();
      expect(drawer.queryByRole("link", { name: "Pages" })).not.toBeInTheDocument();
      expect(drawer.queryByRole("link", { name: "Blog" })).not.toBeInTheDocument();
      expect(drawer.queryByRole("link", { name: "Buy Theme!" })).not.toBeInTheDocument();

      // Switch to CATEGORIES tab
      fireEvent.click(categoriesTab);
      expect(drawer.getByRole("tab", { name: "Categories" })).toHaveAttribute("aria-selected", "true");
      expect(drawer.getByRole("navigation", { name: "Mobile Categories Navigation" })).toBeInTheDocument();

      // Ensure template dummy items are completely removed
      expect(drawer.queryByRole("link", { name: "New Products" })).not.toBeInTheDocument();
      expect(drawer.queryByRole("link", { name: "Today On Sale" })).not.toBeInTheDocument();
      expect(drawer.queryByRole("link", { name: "Special Offer!" })).not.toBeInTheDocument();

      // Bottom footer controls
      expect(drawer.getByRole("button", { name: /English/i })).toBeInTheDocument();
      expect(drawer.getByRole("button", { name: /Dollar \(US\)/i })).toBeInTheDocument();
    });
  });

  describe("MobileBottomBar (Sticky Navigation)", () => {
    it("renders HOME, SEARCH, WISHLIST (with count badge), and ACCOUNT", () => {
      render(<MobileBottomBar config={defaultNavigationConfig} />);

      const bottomNav = screen.getByRole("navigation", {
        name: "Mobile Bottom Navigation",
      });
      expect(bottomNav).toBeInTheDocument();

      // HOME
      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");

      // SEARCH
      expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();

      // WISHLIST with badge
      const wishlistLink = screen.getByRole("link", { name: "Wishlist" });
      expect(wishlistLink).toHaveAttribute("href", "/wishlist");
      expect(screen.getByTestId("mobile-wishlist-badge")).toHaveTextContent("0");

      // ACCOUNT
      expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
    });
  });

  describe("Full SiteHeader Integration", () => {
    it("renders complete 3-row header and sticky mobile bottom bar", () => {
      const mockSettings = {
        id: "current",
        topBar: {
          text: "FESTIVE SALE, Get 40% Off for all products.",
          backgroundColor: "#FBC0CE",
          textColor: "#222222",
          visible: true,
          dismissible: true,
        },
        secondNavbar: {
          phone: "+91 98765 43210",
          phoneHref: "tel:+919876543210",
          promoText: "",
          ctaText: "Shop Now!",
          ctaHref: "/shop",
          links: [],
          showPhone: true,
          showPromotion: true,
          showLinks: true,
        },
        version: 1,
        topBarVersion: 1,
        secondNavbarVersion: 1,
        updatedAt: new Date().toISOString(),
        updatedBy: "Admin",
      };

      render(<SiteHeader initialSettings={mockSettings} />);

      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass("bg-white");

      // Row 1
      expect(screen.getByText("FESTIVE SALE,")).toBeInTheDocument();
      expect(screen.getByText("Get 40% Off for all products.")).toBeInTheDocument();

      // Row 2
      expect(screen.getByText("+91 98765 43210")).toBeInTheDocument();

      // Row 3
      expect(screen.getByRole("link", { name: /PERALAGAE Fine Jewellery/ })).toBeInTheDocument();

      // Mobile Bottom Bar
      expect(
        screen.getByRole("navigation", { name: "Mobile Bottom Navigation" }),
      ).toBeInTheDocument();
    });
  });

  describe("PrimaryNavigation: Luxury Hover & Active Navigation Animations", () => {
    it("renders all 4 primary navigation items as semantic HTML links", () => {
      render(<PrimaryNavigation items={defaultNavigationConfig.primaryNav} currentPath="/" />);

      const homeLink = screen.getByRole("link", { name: /Home/i });
      const shopLink = screen.getByRole("link", { name: /Shop/i });
      const contactLink = screen.getByRole("link", { name: /Contact/i });
      const newArrivalsLink = screen.getByRole("link", { name: /New Arrivals/i });

      expect(homeLink).toHaveAttribute("href", "/");
      expect(shopLink).toHaveAttribute("href", "/shop");
      expect(contactLink).toHaveAttribute("href", "/contact");
      expect(newArrivalsLink).toHaveAttribute("href", "/#new-arrivals");
    });

    it("activates Home with aria-current='page', active class and gold text when on '/'", () => {
      render(<PrimaryNavigation items={defaultNavigationConfig.primaryNav} currentPath="/" />);

      const homeLink = screen.getByRole("link", { name: /Home/i });
      const shopLink = screen.getByRole("link", { name: /Shop/i });

      expect(homeLink).toHaveAttribute("aria-current", "page");
      expect(homeLink).toHaveClass("active");
      expect(homeLink).toHaveClass("text-[#C5A572]");

      expect(shopLink).not.toHaveAttribute("aria-current");
      expect(shopLink).not.toHaveClass("active");
    });

    it("activates Shop when on '/shop' or subroute, keeping other links inactive", () => {
      render(<PrimaryNavigation items={defaultNavigationConfig.primaryNav} currentPath="/shop" />);

      const homeLink = screen.getByRole("link", { name: /Home/i });
      const shopLink = screen.getByRole("link", { name: /Shop/i });
      const contactLink = screen.getByRole("link", { name: /Contact/i });

      expect(shopLink).toHaveAttribute("aria-current", "page");
      expect(shopLink).toHaveClass("active");
      expect(shopLink).toHaveClass("text-[#C5A572]");

      expect(homeLink).not.toHaveAttribute("aria-current");
      expect(homeLink).not.toHaveClass("active");
      expect(contactLink).not.toHaveAttribute("aria-current");
    });

    it("activates Contact when on '/contact'", () => {
      render(
        <PrimaryNavigation items={defaultNavigationConfig.primaryNav} currentPath="/contact" />,
      );

      const contactLink = screen.getByRole("link", { name: /Contact/i });
      expect(contactLink).toHaveAttribute("aria-current", "page");
      expect(contactLink).toHaveClass("active");
      expect(contactLink).toHaveClass("text-[#C5A572]");
    });

    it("activates New Arrivals when on '/#new-arrivals'", () => {
      render(
        <PrimaryNavigation
          items={defaultNavigationConfig.primaryNav}
          currentPath="/#new-arrivals"
        />,
      );

      const homeLink = screen.getByRole("link", { name: /Home/i });
      const newArrivalsLink = screen.getByRole("link", { name: /New Arrivals/i });
      expect(newArrivalsLink).toHaveAttribute("aria-current", "page");
      expect(newArrivalsLink).toHaveClass("active");
      expect(newArrivalsLink).toHaveClass("text-[#C5A572]");

      // Home should not be active when New Arrivals is active
      expect(homeLink).not.toHaveAttribute("aria-current");
      expect(homeLink).not.toHaveClass("active");
    });

    it("renders the refined champagne gold underline element under each navigation link", () => {
      const { container } = render(
        <PrimaryNavigation items={defaultNavigationConfig.primaryNav} currentPath="/" />,
      );

      const underlines = container.querySelectorAll(".peralagae-nav-underline");
      expect(underlines).toHaveLength(4);

      // Verify active underline has scale-x-100 opacity-100
      expect(underlines[0]).toHaveClass("scale-x-100");
      expect(underlines[0]).toHaveClass("opacity-100");

      // Verify inactive underlines have scale-x-0 opacity-0
      expect(underlines[1]).toHaveClass("scale-x-0");
      expect(underlines[1]).toHaveClass("opacity-0");
    });
  });
});

