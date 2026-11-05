import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StoreLocatorBanner } from "@/components/home/store-locator-banner";
import {
  defaultStoreLocatorConfig,
  type StoreLocatorBannerConfig,
} from "@/config/store-locator";

describe("StoreLocatorBanner Component Suite", () => {
  it("renders with default configuration", () => {
    render(<StoreLocatorBanner config={defaultStoreLocatorConfig} />);

    // Section and heading
    const section = screen.getByTestId("store-locator-section");
    expect(section).toBeInTheDocument();

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Find Jewelry Shops Near You");
    expect(heading).toHaveAttribute("id", "store-locator-heading");

    // Outline store icon
    const icon = screen.getByTestId("store-locator-icon");
    expect(icon).toBeInTheDocument();

    // CTA button
    const button = screen.getByTestId("store-locator-cta");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Find Store");
    expect(button).toHaveAttribute("href", defaultStoreLocatorConfig.buttonHref);
    expect(button).toHaveAttribute("target", "_blank");
    expect(button.getAttribute("href")).toContain("google.com/maps");
  });

  it("applies the specified background color #F8E8F8 and dark charcoal text color", () => {
    render(<StoreLocatorBanner config={defaultStoreLocatorConfig} />);

    const bannerContainer = screen.getByTestId("store-locator-banner");
    expect(bannerContainer).toHaveStyle({ backgroundColor: "#F8E8F8" });

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveStyle({ color: "#111111" });
  });

  it("supports configurable heading, button label, href, and styling", () => {
    const customConfig: StoreLocatorBannerConfig = {
      heading: "Locate Boutique Showrooms",
      buttonLabel: "Explore Boutiques",
      buttonHref: "/showrooms",
      isImplemented: true,
      backgroundColor: "#FAF5EF",
      textColor: "#222222",
    };

    render(<StoreLocatorBanner config={customConfig} />);

    expect(screen.getByText("Locate Boutique Showrooms")).toBeInTheDocument();
    const button = screen.getByRole("link", { name: /Explore Boutiques/i });
    expect(button).toHaveAttribute("href", "/showrooms");

    const bannerContainer = screen.getByTestId("store-locator-banner");
    expect(bannerContainer).toHaveStyle({ backgroundColor: "#FAF5EF" });
  });

  it("fires onButtonClick handler when the CTA button is clicked", () => {
    const handleButtonClick = vi.fn();
    render(
      <StoreLocatorBanner
        config={defaultStoreLocatorConfig}
        onButtonClick={handleButtonClick}
      />
    );

    const button = screen.getByTestId("store-locator-cta");
    fireEvent.click(button);

    expect(handleButtonClick).toHaveBeenCalledTimes(1);
  });

  it("has accessible aria labels and title attribute reflecting integration status", () => {
    // When implemented (active route)
    const { unmount } = render(<StoreLocatorBanner config={defaultStoreLocatorConfig} />);
    const button = screen.getByTestId("store-locator-cta");
    expect(button).toHaveAttribute("title", "Find Store");
    expect(button).toHaveAttribute(
      "aria-label",
      "Find Store: Find Jewelry Shops Near You"
    );
    unmount();

    // When pending integration
    render(<StoreLocatorBanner config={{ ...defaultStoreLocatorConfig, isImplemented: false }} />);
    const pendingButton = screen.getByTestId("store-locator-cta");
    expect(pendingButton).toHaveAttribute("title", "Find Store (Pending Catalogue Integration)");
  });
});
