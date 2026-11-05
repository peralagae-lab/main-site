import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { HeroBanners, OutlineButton, BannerCard } from "@/components/home/hero-banners";
import { defaultHeroBannersConfig, type HeroBannersConfig } from "@/config/hero-banners";

describe("PERALAGAE Hero & Promotional Banners Component Suite", () => {
  describe("OutlineButton", () => {
    it("renders rectangular outline button with correct label, href, and styling classes", () => {
      render(<OutlineButton label="Shop Now" href="/shop?category=necklaces" />);

      const link = screen.getByRole("link", { name: "Shop Now" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/shop?category=necklaces");
      expect(link.className).toContain("border");
      expect(link.className).toContain("hover:bg-[#C5A572]");
    });
  });

  describe("BannerCard", () => {
    it("renders featured banner card with h2, subheading, description, and image", () => {
      render(<BannerCard item={defaultHeroBannersConfig.featuredBanner} isFeatured />);

      // Subheading
      expect(screen.getByText("Necklaces &")).toBeInTheDocument();

      // Heading level 2
      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("Body Jewels");

      // Description
      expect(screen.getByText(/Look to our new season collection for girls\./)).toBeInTheDocument();

      // CTA Button
      const cta = screen.getByRole("link", { name: /Shop Now/i });
      expect(cta).toHaveAttribute("href", "/shop?category=necklaces");

      // Image
      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("alt", "Necklaces & Body Jewels - PERALAGAE");
    });

    it("renders secondary banner card with h3, subheading, and gracefully handles omitted description", () => {
      render(<BannerCard item={defaultHeroBannersConfig.secondaryTopBanner} isFeatured={false} />);

      // Subheading
      expect(screen.getByText("Just Lunched")).toBeInTheDocument();

      // Heading level 3
      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("Desk The Hals");

      // CTA button
      const cta = screen.getByRole("link", { name: /Shop Now/i });
      expect(cta).toHaveAttribute("href", "/shop?category=rings");
    });
  });

  describe("HeroBanners Composition", () => {
    it("renders all 3 promotional banners in the composition", () => {
      render(<HeroBanners config={defaultHeroBannersConfig} />);

      const section = screen.getByRole("region", { name: "Promotional Collections" });
      expect(section).toBeInTheDocument();

      // Verify all 3 cards are rendered
      expect(screen.getByTestId("banner-hero-featured-necklaces")).toBeInTheDocument();
      expect(screen.getByTestId("banner-hero-secondary-desk-hals")).toBeInTheDocument();
      expect(screen.getByTestId("banner-hero-secondary-charm-bracelets")).toBeInTheDocument();

      // Verify all 3 titles are present
      expect(screen.getByText("Body Jewels")).toBeInTheDocument();
      expect(screen.getByText("Desk The Hals")).toBeInTheDocument();
      expect(screen.getByText("Charm Bracelets")).toBeInTheDocument();

      // Verify 3 Shop Now CTA buttons are present with their destinations
      const ctaLinks = screen.getAllByRole("link", { name: /Shop Now/i });
      expect(ctaLinks).toHaveLength(3);
      expect(ctaLinks[0]).toHaveAttribute("href", "/shop?category=necklaces");
      expect(ctaLinks[1]).toHaveAttribute("href", "/shop?category=rings");
      expect(ctaLinks[2]).toHaveAttribute("href", "/shop?category=bracelets");
    });

    it("supports custom configuration overrides for backend CMS integration", () => {
      const customConfig: HeroBannersConfig = {
        featuredBanner: {
          id: "custom-featured",
          subheading: "Exclusive Offer",
          title: "Bridal Jewellery",
          description: "Handcrafted 24k gold sets.",
          cta: { label: "Explore Bridal", href: "/category/bridal" },
          image: { src: "/images/hero/banner-necklaces.jpg", alt: "Bridal set" },
        },
        secondaryTopBanner: {
          id: "custom-top",
          title: "Gold Bangles",
          cta: { label: "View Bangles", href: "/category/bangles" },
          image: { src: "/images/hero/banner-desk-hals.jpg", alt: "Bangles" },
        },
        secondaryBottomBanner: {
          id: "custom-bottom",
          title: "Diamond Earrings",
          cta: { label: "View Earrings", href: "/category/earrings" },
          image: { src: "/images/hero/banner-charm-bracelets.jpg", alt: "Diamond earrings" },
        },
      };

      render(<HeroBanners config={customConfig} />);

      expect(screen.getByText("Exclusive Offer")).toBeInTheDocument();
      expect(screen.getByText("Bridal Jewellery")).toBeInTheDocument();
      expect(screen.getByText("Gold Bangles")).toBeInTheDocument();
      expect(screen.getByText("Diamond Earrings")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Explore Bridal/i })).toHaveAttribute(
        "href",
        "/category/bridal",
      );
    });

    it("connects hero image slots dynamically to selected category shop URLs", async () => {
      const { resolveHeroCtaHref, transformHeroSettingsToConfig } = await import(
        "@/services/hero-settings-service"
      );

      const mockCategories: any[] = [
        {
          id: "cat-necklaces",
          name: "NECKLACES",
          slug: "necklaces",
          order: 0,
          isActive: true,
          productCount: 10,
        },
        {
          id: "cat-charms",
          name: "Charms & Bangles",
          slug: "charms-bangles",
          order: 1,
          isActive: true,
          productCount: 0,
        },
      ];

      // 1. Matched category links directly to /shop?category=${slug}
      const href = resolveHeroCtaHref(
        { categoryId: "cat-charms", categorySlug: "charms-bangles" },
        "/shop?category=bracelets",
        mockCategories
      );
      expect(href).toBe("/shop?category=charms-bangles");

      // 2. Deleted or unavailable category falls back safely to /shop
      const fallbackHref = resolveHeroCtaHref(
        { categoryId: "deleted-category-id" },
        "/shop?category=necklaces",
        mockCategories
      );
      expect(fallbackHref).toBe("/shop");

      // 3. No category set falls back to default CTA href
      const defaultHref = resolveHeroCtaHref(
        { categoryId: null },
        "/shop?category=necklaces",
        mockCategories
      );
      expect(defaultHref).toBe("/shop?category=necklaces");

      // 4. transformHeroSettingsToConfig correctly injects resolved URLs
      const mockSettings = {
        heroImage1: {
          imageUrl: "/img1.jpg",
          normalHeadline: "Handmade",
          boldHeadline: "Necklaces",
          description: "Finest gold.",
          categoryId: "cat-charms",
          categorySlug: "charms-bangles",
        },
        heroImage2: {
          imageUrl: "/img2.jpg",
          normalHeadline: "Classic",
          boldHeadline: "Rings",
          categoryId: "deleted-id",
        },
        heroImage3: {
          imageUrl: "/img3.jpg",
          normalHeadline: "Latest",
          boldHeadline: "Earrings",
          categoryId: null,
        },
      };

      const transformed = transformHeroSettingsToConfig(mockSettings as any, mockCategories);
      expect(transformed.featuredBanner.cta.href).toBe("/shop?category=charms-bangles");
      expect(transformed.secondaryTopBanner.cta.href).toBe("/shop");
      expect(transformed.secondaryBottomBanner.cta.href).toBe("/shop?category=bracelets");
    });
  });
});

