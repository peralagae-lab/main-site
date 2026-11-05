/**
 * Store Locator Banner Configuration — PERALAGAE
 *
 * Configurable settings for the "Find Jewelry Shops Near You" horizontal banner.
 * Allows easy destination updates and content localization without code refactoring.
 */

export interface StoreLocatorBannerConfig {
  /**
   * Main banner heading text.
   * Default: "Find Jewelry Shops Near You"
   */
  heading: string;

  /**
   * Action button text.
   * Default: "Find Store"
   */
  buttonLabel: string;

  /**
   * Target URL or route destination.
   * Default: PERALAGAE_STORE_MAPS_URL
   */
  buttonHref: string;

  /**
   * Whether the destination route is currently active / implemented in the frontend.
   * Currently pending backend / store location catalogue deployment.
   */
  isImplemented: boolean;

  /**
   * Background hex color for the banner container.
   * Soft pastel lavender-pink matching Alukas design system reference.
   * Default: "#F8E8F8"
   */
  backgroundColor: string;

  /**
   * Foreground text, icon, and button border hex color.
   * Dark charcoal matching PERALAGAE editorial palette.
   * Default: "#111111"
   */
  textColor: string;

  /**
   * Hover background color for the button.
   * Default: "#111111"
   */
  buttonHoverBgColor?: string;

  /**
   * Hover text color for the button.
   * Default: "#FFFFFF"
   */
  buttonHoverTextColor?: string;
}

/**
 * Approved Google Maps destination URL for PERALAGAE Coimbatore Showroom.
 * Location: Vitamin7 Semantics, 15, 3rd Cross Road, Sathy Rd, Gandhipuram, Coimbatore, Tamil Nadu 641012
 */
export const PERALAGAE_STORE_MAPS_URL =
  "https://www.google.com/maps/dir//Vitamin7+Semantics,+15,+3rd+Cross+Road,+Sathy+Rd,+Gandhipuram,+Coimbatore,+Tamil+Nadu+641012/@12.9400832,80.2029568,12z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3ba8597a5c957c41:0x6a27ee69ae8a00d4!2m2!1d76.9705987!2d11.0277375?entry=ttu&g_ep=EgoyMDI2MTEwMi4wIKXMDSoASAFQAw%3D%3D";

/**
 * Approved default configuration for PERALAGAE Store Locator Banner.
 */
export const defaultStoreLocatorConfig: StoreLocatorBannerConfig = {
  heading: "Find Jewelry Shops Near You",
  buttonLabel: "Find Store",
  buttonHref: PERALAGAE_STORE_MAPS_URL,
  isImplemented: true,
  backgroundColor: "#F8E8F8",
  textColor: "#111111",
  buttonHoverBgColor: "#111111",
  buttonHoverTextColor: "#FFFFFF",
};
