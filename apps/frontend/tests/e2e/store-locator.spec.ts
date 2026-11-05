import { test, expect } from "@playwright/test";

test.describe("PERALAGAE Store Locator Banner E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for preloader to complete
    await expect(page.getByRole("status")).not.toBeAttached({ timeout: 5000 });
  });

  test("Desktop: renders Store Locator Banner directly after New Collection with exact design tokens", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // Verify DOM order: Hero -> Collections -> New Collection -> Store Locator
    const newCollection = page.locator('section[aria-labelledby="new-collection-heading"]');
    await expect(newCollection).toBeVisible();

    const storeLocator = page.locator('section[aria-labelledby="store-locator-heading"]');
    await expect(storeLocator).toBeVisible();

    // Check sibling position immediately after newCollection
    const isDirectFollower = await page.evaluate(() => {
      const nc = document.querySelector('section[aria-labelledby="new-collection-heading"]');
      const sl = document.querySelector('section[aria-labelledby="store-locator-heading"]');
      return nc && sl && nc.nextElementSibling === sl;
    });
    expect(isDirectFollower).toBe(true);

    // Verify banner background color (#F8E8F8 is rgb(248, 232, 248))
    const bannerBox = storeLocator.getByTestId("store-locator-banner");
    await expect(bannerBox).toBeVisible();
    const bgColor = await bannerBox.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe("rgb(248, 232, 248)");

    // Verify outline store icon
    const icon = storeLocator.getByTestId("store-locator-icon");
    await expect(icon).toBeVisible();

    // Verify heading text
    const heading = storeLocator.locator("#store-locator-heading");
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("Find Jewelry Shops Near You");

    // Verify CTA button
    const cta = storeLocator.getByTestId("store-locator-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveText("Find Store");
    await expect(cta).toHaveAttribute("href", /google\.com\/maps/);

    // Verify no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("Mobile: renders cleanly without horizontal overflow and stacks comfortably", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const storeLocator = page.locator('section[aria-labelledby="store-locator-heading"]');
    await expect(storeLocator).toBeVisible();

    const heading = storeLocator.locator("#store-locator-heading");
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("Find Jewelry Shops Near You");

    const icon = storeLocator.getByTestId("store-locator-icon");
    await expect(icon).toBeVisible();

    const cta = storeLocator.getByTestId("store-locator-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveText("Find Store");

    // Check no horizontal scrollbar on mobile
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("Desktop: hover on CTA button displays legible white text against dark charcoal fill", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    const storeLocator = page.locator('section[aria-labelledby="store-locator-heading"]');
    const cta = storeLocator.getByTestId("store-locator-cta");
    await cta.scrollIntoViewIfNeeded();

    // Hover on button
    await cta.hover();
    await page.waitForTimeout(250);

    // Verify text is clearly visible in white and background is dark charcoal
    const textColor = await cta.evaluate((el) => window.getComputedStyle(el).color);
    expect(textColor).toBe("rgb(255, 255, 255)");

    const bgColor = await cta.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe("rgb(17, 17, 17)");
  });
});
