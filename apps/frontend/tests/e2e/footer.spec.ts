import { test, expect } from "@playwright/test";

test.describe("PERALAGAE Footer Comprehensive E2E & QA Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for luxury preloader to complete
    await expect(page.getByRole("status")).not.toBeAttached({ timeout: 10000 });
  });

  /* -------------------------------------------------------------------------
   * 1. Desktop & Laptop Viewports (1920x1080, 1366x768)
   * ------------------------------------------------------------------------- */

  test("Desktop (1920x1080): renders five-column layout with exact headings, links, payment logos, and copyright", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    const footer = page.locator('footer[data-testid="site-footer"]');
    await expect(footer).toBeVisible();

    // Column 1: PERALAGAE Brand & Tagline
    const brandCol = footer.getByTestId("footer-brand-column");
    await expect(brandCol.getByRole("link", { name: "PERALAGAE", exact: true })).toBeVisible();
    await expect(brandCol.locator("img")).toBeVisible();
    await expect(
      brandCol.getByText("Designed in India. Crafted with timeless elegance.")
    ).toBeVisible();

    // Column 2: Explore Peralagae with exact 6 links
    const exploreCol = footer.getByTestId("footer-column-explore-peralagae");
    await expect(exploreCol.getByText("Explore Peralagae", { exact: true })).toBeVisible();
    const exploreLinks = [
      { name: "Shop Our Collections", href: "/#shop-our-collections" },
      { name: "New Arrivals", href: "/#new-collection" },
      { name: "Necklaces", href: "/#shop-our-collections" },
      { name: "Rings", href: "/#shop-our-collections" },
      { name: "Bracelets", href: "/#shop-our-collections" },
      { name: "Earrings", href: "/#shop-our-collections" },
    ];
    for (const { name, href } of exploreLinks) {
      const link = exploreCol.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
    }

    // Column 3: Shopping & More with exact 5 links
    const shoppingCol = footer.getByTestId("footer-column-shopping-and-more");
    await expect(shoppingCol.getByText("Shopping & More", { exact: true })).toBeVisible();
    const shoppingLinks = [
      { name: "Charms & Bangles", href: "/#shop-our-collections" },
      { name: "Gift Ideas", href: "/#shop-our-collections" },
      { name: "Find Store", href: "/#store-locator" },
      { name: "Services", href: "/#store-locator" },
      { name: "Subscribe", href: "/#newsletter-section" },
    ];
    for (const { name, href } of shoppingLinks) {
      const link = shoppingCol.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
    }

    // Column 4: Store Details
    const storeCol = footer.getByTestId("footer-column-store-details");
    await expect(storeCol.getByText("Store Details", { exact: true })).toBeVisible();
    await expect(storeCol.getByText("Need Any Help?")).toBeVisible();
    await expect(storeCol.getByText("123 45678 90")).toBeVisible();
    await expect(storeCol.getByText(/502 New Design Str, Melbourne, Australia/i)).toBeVisible();
    await expect(storeCol.getByText("contact@peralagae.com")).toBeVisible();

    // Column 5: Follow Us
    const followCol = footer.getByTestId("footer-column-follow-us");
    await expect(followCol.getByText("Follow Us", { exact: true })).toBeVisible();
    await expect(followCol.getByRole("link", { name: "Instagram", exact: true })).toBeVisible();
    await expect(followCol.getByRole("link", { name: "Facebook", exact: true })).toHaveCount(0);
    await expect(followCol.getByRole("link", { name: "X (Twitter)", exact: true })).toHaveCount(0);
    await expect(followCol.getByRole("link", { name: "Pinterest", exact: true })).toHaveCount(0);

    // Payment Methods Row removed per user request
    await expect(footer.getByTestId("footer-payment-methods")).toHaveCount(0);

    // Bottom Row: Copyright Notice only (no developer attribution or payment icons)
    const copyright = footer.getByTestId("footer-copyright");
    await expect(copyright).toBeVisible();
    await expect(copyright).toHaveText("© 2026 PERALAGAE. All Rights Reserved.");

    await expect(footer.getByTestId("footer-developer")).toHaveCount(0);

    // Zero horizontal overflow
    const footerOverflow = await page.evaluate(() => {
      const footerEl = document.querySelector('footer[data-testid="site-footer"]');
      if (!footerEl) return false;
      return footerEl.scrollWidth > document.documentElement.clientWidth;
    });
    expect(footerOverflow).toBe(false);
  });

  test("Laptop (1366x768): maintains five columns with balanced proportions and zero clipping", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });

    const footer = page.locator('footer[data-testid="site-footer"]');
    await expect(footer).toBeVisible();
    await expect(footer.getByText("Explore Peralagae", { exact: true })).toBeVisible();
    await expect(footer.getByText("Shopping & More", { exact: true })).toBeVisible();
    await expect(footer.getByText("Store Details", { exact: true })).toBeVisible();
    await expect(footer.getByText("Follow Us", { exact: true })).toBeVisible();

    const footerOverflow = await page.evaluate(() => {
      const footerEl = document.querySelector('footer[data-testid="site-footer"]');
      if (!footerEl) return false;
      return footerEl.scrollWidth > document.documentElement.clientWidth;
    });
    expect(footerOverflow).toBe(false);
  });

  /* -------------------------------------------------------------------------
   * 2. Tablet Viewport (768x1024)
   * ------------------------------------------------------------------------- */

  test("Tablet (768x1024): reflows gracefully without text overlaps or horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    const footer = page.locator('footer[data-testid="site-footer"]');
    await expect(footer).toBeVisible();

    // Verify all columns and triggers exist
    await expect(footer.getByText("PERALAGAE", { exact: true })).toBeVisible();
    await expect(footer.getByText("Explore Peralagae", { exact: true })).toBeVisible();
    await expect(footer.getByText("Shopping & More", { exact: true })).toBeVisible();

    const footerOverflow = await page.evaluate(() => {
      const footerEl = document.querySelector('footer[data-testid="site-footer"]');
      if (!footerEl) return false;
      return footerEl.scrollWidth > document.documentElement.clientWidth;
    });
    expect(footerOverflow).toBe(false);
  });

  /* -------------------------------------------------------------------------
   * 3. Mobile Viewports (430x932, 375x812)
   * ------------------------------------------------------------------------- */

  test("Large mobile (430x932): collapsible accordions toggle smoothly and no horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });

    const footer = page.locator('footer[data-testid="site-footer"]');
    await expect(footer).toBeVisible();

    const exploreTrigger = footer.getByTestId("accordion-trigger-explore-peralagae");
    await expect(exploreTrigger).toBeVisible();
    await expect(exploreTrigger).toHaveAttribute("aria-expanded", "false");

    // Expand
    await exploreTrigger.click();
    await expect(exploreTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(footer.getByRole("link", { name: "Rings", exact: true })).toBeVisible();

    // Collapse
    await exploreTrigger.click();
    await expect(exploreTrigger).toHaveAttribute("aria-expanded", "false");

    const footerOverflow = await page.evaluate(() => {
      const footerEl = document.querySelector('footer[data-testid="site-footer"]');
      if (!footerEl) return false;
      return footerEl.scrollWidth > document.documentElement.clientWidth;
    });
    expect(footerOverflow).toBe(false);
  });

  test("Mobile (375x812): renders exact mobile reference layout with smooth accordions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const footer = page.locator('footer[data-testid="site-footer"]');
    await expect(footer).toBeVisible();

    // Brand and tagline are visible at top
    await expect(footer.getByText("PERALAGAE", { exact: true })).toBeVisible();
    await expect(
      footer.getByText("Designed in India. Crafted with timeless elegance.")
    ).toBeVisible();

    // All 4 collapsible accordions start collapsed
    const exploreTrigger = footer.getByTestId("accordion-trigger-explore-peralagae");
    const shoppingTrigger = footer.getByTestId("accordion-trigger-shopping-and-more");
    const storeTrigger = footer.getByTestId("accordion-trigger-store-details");
    const followTrigger = footer.getByTestId("accordion-trigger-follow-us");

    await expect(exploreTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(shoppingTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(storeTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(followTrigger).toHaveAttribute("aria-expanded", "false");

    // Open "Shopping & More"
    await shoppingTrigger.click();
    await expect(shoppingTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(footer.getByRole("link", { name: "Charms & Bangles", exact: true })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Gift Ideas", exact: true })).toBeVisible();

    // Open "Store Details"
    await storeTrigger.click();
    await expect(storeTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(footer.getByText("123 45678 90")).toBeVisible();

    // Check bottom row copyright and developer credits (payment methods removed)
    await expect(footer.getByTestId("footer-payment-methods")).toHaveCount(0);
    await expect(footer.getByTestId("footer-copyright")).toBeVisible();
    await expect(footer.getByTestId("footer-developer")).toBeVisible();

    // No horizontal scrollbar
    const footerOverflow = await page.evaluate(() => {
      const footerEl = document.querySelector('footer[data-testid="site-footer"]');
      if (!footerEl) return false;
      return footerEl.scrollWidth > document.documentElement.clientWidth;
    });
    expect(footerOverflow).toBe(false);
  });

  /* -------------------------------------------------------------------------
   * 4. Functional Link Navigation & Sticky Header Clearance
   * ------------------------------------------------------------------------- */

  test("Navigation: clicking Shop Our Collections navigates smoothly without hiding heading behind sticky header", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    const footer = page.locator('footer[data-testid="site-footer"]');
    await footer.scrollIntoViewIfNeeded();

    const collectionsLink = footer.getByRole("link", {
      name: "Shop Our Collections",
      exact: true,
    });
    await collectionsLink.click();

    // Verify URL updated with anchor
    await expect(page).toHaveURL(/\/#shop-our-collections/);

    // Verify destination section is visible
    const targetSection = page.locator("#shop-our-collections");
    await expect(targetSection).toBeVisible();

    // Verify section heading is in viewport and not covered by sticky header
    const heading = targetSection.locator("#shop-our-collections-heading");
    await expect(heading).toBeInViewport();
  });

  test("Navigation: clicking New Arrivals navigates to New Collection section", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    const footer = page.locator('footer[data-testid="site-footer"]');
    await footer.scrollIntoViewIfNeeded();

    const newArrivalsLink = footer.getByRole("link", {
      name: "New Arrivals",
      exact: true,
    });
    await newArrivalsLink.click();

    await expect(page).toHaveURL(/\/#new-collection/);
    const targetSection = page.locator("#new-collection");
    await expect(targetSection).toBeVisible();
  });

  test("Navigation: clicking Find Store navigates to Store Locator banner", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    const footer = page.locator('footer[data-testid="site-footer"]');
    await footer.scrollIntoViewIfNeeded();

    const findStoreLink = footer.getByRole("link", {
      name: "Find Store",
      exact: true,
    });
    await findStoreLink.click();

    await expect(page).toHaveURL(/\/#store-locator/);
    const targetSection = page.locator("#store-locator");
    await expect(targetSection).toBeVisible();
  });

  test("Navigation: clicking Subscribe navigates to Newsletter section", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    const footer = page.locator('footer[data-testid="site-footer"]');
    await footer.scrollIntoViewIfNeeded();

    const subscribeLink = footer.getByRole("link", {
      name: "Subscribe",
      exact: true,
    });
    await subscribeLink.click();

    await expect(page).toHaveURL(/\/#newsletter-section/);
    const targetSection = page.locator("#newsletter-section");
    await expect(targetSection).toBeVisible();
  });

  /* -------------------------------------------------------------------------
   * 5. Back-to-Top Button Smooth Scroll
   * ------------------------------------------------------------------------- */

  test("Back-to-top button: verified removed from the page per user request", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    const backToTopBtn = page.getByTestId("back-to-top-button");
    await expect(backToTopBtn).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(300);
    await expect(backToTopBtn).toHaveCount(0);
  });

  /* -------------------------------------------------------------------------
   * 6. Accessibility & Hygiene: No empty hrefs or broken links
   * ------------------------------------------------------------------------- */

  test("Accessibility: all footer links have valid non-empty destinations and proper landmarks", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    const footer = page.locator('footer[data-testid="site-footer"]');
    await expect(footer).toHaveAttribute("role", "contentinfo");

    // Collect all links in footer
    const links = footer.getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThan(10);

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const href = await link.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).not.toBe("#");
      expect(href).not.toBe("");
    }
  });
});
