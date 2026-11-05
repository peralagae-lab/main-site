"use client";

import React, { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowUp, Headphones, ChevronDown } from "lucide-react";
import { scrollToSectionId } from "@/lib/navigation";
import {
  fetchPublicStoreDetails,
  STORE_DETAILS_UPDATED_EVENT,
} from "@/services/store-details-service";
import {
  fetchPublicInstagramSection,
  INSTAGRAM_SECTION_UPDATED_EVENT,
} from "@/services/instagram-service";
import type { StoreDetailsData } from "@/types/store-details";
import type {
  FooterConfig,
  FooterColumnConfig,
  StoreDetailsConfig,
  FollowUsConfig,
  SocialLinkItem,
} from "@/config/footer";
import { defaultFooterConfig } from "@/config/footer";

/* -------------------------------------------------------------------------
 * Reduced Motion Helper
 * ------------------------------------------------------------------------- */

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!mediaQuery.addEventListener) return () => {};
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

/* -------------------------------------------------------------------------
 * Component: BackToTopButton
 * ------------------------------------------------------------------------- */

export interface BackToTopButtonProps {
  label?: string;
  className?: string;
}

export function BackToTopButton({
  label = "Back to top",
  className = "",
}: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={label}
      data-testid="back-to-top-button"
      suppressHydrationWarning
      className={`fixed bottom-20 right-4 sm:right-6 lg:bottom-8 lg:right-8 z-30 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-none bg-[#111111] text-white transition-all duration-300 hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] shadow-sm cursor-pointer ${className}`}
    >
      <ArrowUp className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2]" aria-hidden="true" />
    </button>
  );
}

/* -------------------------------------------------------------------------
 * Component: FooterBrand (Column 1)
 * ------------------------------------------------------------------------- */

export interface FooterBrandProps {
  name: string;
  tagline: string;
  href?: string;
  logoSrc?: string;
  logoWidth?: number;
  logoHeight?: number;
  className?: string;
}

export function FooterBrand({
  name,
  tagline,
  href = "/",
  logoSrc,
  logoWidth,
  logoHeight,
  className = "",
}: FooterBrandProps) {
  return (
    <div className={`flex flex-col ${className}`} data-testid="footer-brand-column">
      <Link
        href={href}
        className="inline-block hover:opacity-85 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
        aria-label={name}
      >
        {logoSrc ? (
          <>
            <Image
              src={logoSrc}
              alt={name}
              width={logoWidth ?? 1308}
              height={logoHeight ?? 537}
              className="h-12 sm:h-14 lg:h-16 w-auto max-w-[200px] sm:max-w-[230px] lg:max-w-[250px] object-contain"
            />
            <span className="sr-only">{name}</span>
          </>
        ) : (
          <span className="text-base sm:text-lg font-semibold tracking-[0.12em] text-[#111111] uppercase">
            {name}
          </span>
        )}
      </Link>
      <p className="mt-2.5 sm:mt-3 text-xs sm:text-[13px] text-[#777777] leading-relaxed max-w-xs font-normal">
        {tagline}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Component: FooterAccordionSection (Mobile Collapsible with Smooth Transition)
 * ------------------------------------------------------------------------- */

export interface FooterAccordionSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  testId?: string;
  align?: "left" | "center";
}

export function FooterAccordionSection({
  id,
  title,
  children,
  className = "",
  testId,
  align = "left",
}: FooterAccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const isCenter = align === "center";

  return (
    <div className={`flex flex-col ${isCenter ? "items-center text-center" : ""} ${className}`} data-testid={testId}>
      {/* Accordion Trigger on mobile (< lg), Static Heading on Desktop (lg+) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={`footer-accordion-${id}`}
        data-testid={`accordion-trigger-${id}`}
        suppressHydrationWarning
        className={`w-full relative flex items-center ${
          isCenter ? "justify-center text-center" : "justify-between text-left"
        } py-2 sm:py-2.5 lg:py-0 lg:cursor-default lg:pointer-events-none mb-0 lg:mb-4 sm:lg:mb-5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black transition-colors group`}
      >
        <span className={`text-[15px] sm:text-base lg:text-xs lg:sm:text-[13px] font-semibold tracking-[0.02em] lg:tracking-[0.08em] uppercase text-[#111111] group-hover:text-black ${
          isCenter ? "text-center mx-auto" : ""
        }`}>
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#444444] transition-transform ${
            reducedMotion ? "duration-0" : "duration-300 ease-in-out"
          } lg:hidden ${isOpen ? "rotate-180" : "rotate-0"} ${
            isCenter ? "absolute right-0" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Collapsible Content with Smooth Grid-Template-Rows Transition */}
      <div
        id={`footer-accordion-${id}`}
        data-testid={`accordion-content-${id}`}
        className={`w-full grid transition-[grid-template-rows,opacity] ${
          reducedMotion ? "duration-0" : "duration-300 ease-in-out"
        } ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        } lg:grid-rows-[1fr] lg:opacity-100`}
      >
        <div className="overflow-hidden">
          <div className={`pt-2 pb-3.5 lg:p-0 ${isCenter ? "flex flex-col items-center justify-center text-center" : "w-full text-left"}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Component: FooterLinkGroup (Columns 2 & 3: Explore Peralagae, Shopping & More)
 * ------------------------------------------------------------------------- */

export interface FooterLinkGroupProps {
  column: FooterColumnConfig;
  className?: string;
}

export function FooterLinkGroup({ column, className = "" }: FooterLinkGroupProps) {
  let pathname = "/";
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const hookPath = usePathname();
    if (hookPath) pathname = hookPath;
  } catch {
    pathname = "/";
  }

  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (href.startsWith("/#") && typeof window !== "undefined") {
      const targetId = href.replace("/#", "");
      if (pathname === "/") {
        const scrolled = scrollToSectionId(targetId);
        if (scrolled) {
          e.preventDefault();
        }
      }
      // If on another route, allow Next.js Link to navigate to `/#${targetId}`
    }
  };

  return (
    <FooterAccordionSection
      id={column.id}
      title={column.title}
      className={className}
      testId={`footer-column-${column.id}`}
    >
      <ul className="space-y-2 sm:space-y-2.5" role="list">
        {column.links.map((link) => (
          <li key={link.id}>
            {link.isExternal ? (
              <a
                href={link.href}
                className="text-xs sm:text-[13px] text-[#666666] hover:text-[#C5A572] transition-colors duration-200 block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572]"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href)}
                className="text-xs sm:text-[13px] text-[#666666] hover:text-[#C5A572] transition-colors duration-200 block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572]"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </FooterAccordionSection>
  );
}

/* -------------------------------------------------------------------------
 * Component: FooterStoreDetails (Column 4: Store Details)
 * ------------------------------------------------------------------------- */

export interface FooterStoreDetailsProps {
  details?: Partial<StoreDetailsConfig> | null;
  className?: string;
}

export function FooterStoreDetails({
  details,
  className = "",
}: FooterStoreDetailsProps) {
  const [storeData, setStoreData] = useState<StoreDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isMountedRef = useRef(true);

  const title = details?.title || "Store Details";
  const helpLabel = details?.helpLabel || "Need Any Help?";

  const loadData = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      setHasError(false);
      const data = await fetchPublicStoreDetails();
      if (!isMountedRef.current) return;
      if (data) {
        setStoreData(data);
      } else {
        setHasError(true);
      }
    } catch {
      if (isMountedRef.current) setHasError(true);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener(STORE_DETAILS_UPDATED_EVENT, handleUpdate);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener(STORE_DETAILS_UPDATED_EVENT, handleUpdate);
    };
  }, [loadData]);

  // Loading skeleton while fetching from database
  if (isLoading && !storeData) {
    return (
      <FooterAccordionSection
        id="store-details"
        title={title}
        className={className}
        testId="footer-column-store-details"
      >
        <div data-testid="store-details-skeleton" className="animate-pulse">
          <div className="flex items-center gap-3.5 mb-4 sm:mb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAEAEA] text-[#777777] shrink-0">
              <Headphones className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <span className="block text-xs text-[#777777] font-normal leading-tight">
                {helpLabel}
              </span>
              <div className="h-4 w-28 bg-[#EAEAEA] rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-44 bg-[#EAEAEA] rounded" />
            <div className="h-3.5 w-36 bg-[#EAEAEA] rounded" />
          </div>
        </div>
      </FooterAccordionSection>
    );
  }

  // Error state without hardcoded fake contact details
  if (hasError && !storeData) {
    return (
      <FooterAccordionSection
        id="store-details"
        title={title}
        className={className}
        testId="footer-column-store-details"
      >
        <div data-testid="store-details-error" className="py-2 text-xs text-[#888888]">
          <p>Unable to load store contact details.</p>
          <button
            type="button"
            onClick={loadData}
            className="mt-1 text-[11px] text-[#C5A572] hover:underline"
          >
            Retry
          </button>
        </div>
      </FooterAccordionSection>
    );
  }

  const phone = storeData?.phone || "";
  const address = storeData?.address || "";
  const email = storeData?.email || "";
  const phoneDigits = phone.replace(/[^\d+]/g, "");
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : `tel:${phone.replace(/\s+/g, "")}`;

  return (
    <FooterAccordionSection
      id="store-details"
      title={title}
      className={className}
      testId="footer-column-store-details"
    >
      <div className="w-full text-left space-y-3 sm:space-y-4">
        {/* Headset Icon & Help Callout */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAEAEA] text-[#777777] shrink-0">
            <Headphones className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs text-[#777777] font-normal leading-tight">
              {helpLabel}
            </span>
            <a
              href={phoneHref}
              className="text-sm sm:text-base font-semibold text-[#111111] hover:text-[#C5A572] transition-colors tracking-tight focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] whitespace-nowrap block"
            >
              {phone}
            </a>
          </div>
        </div>

        {/* Address & Email */}
        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-[13px] text-[#666666] leading-relaxed">
          <p className="break-words">
            <span className="font-medium text-[#222222]">Address:</span> {address}
          </p>
          <p className="break-words">
            <span className="font-medium text-[#222222]">Email:</span>{" "}
            <a
              href={`mailto:${email}`}
              className="hover:text-[#C5A572] transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] break-all"
            >
              {email}
            </a>
          </p>
        </div>
      </div>
    </FooterAccordionSection>
  );
}

/* -------------------------------------------------------------------------
 * Social Platform Icon Renderer
 * ------------------------------------------------------------------------- */

function SocialIcon({ platform }: { platform: SocialLinkItem["platform"] }) {
  switch (platform) {
    case "facebook":
      return (
        <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "twitter":
      return (
        <svg className="h-5.5 w-5.5 sm:h-6.5 sm:w-6.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
        </svg>
      );
    case "instagram":
      return (
        <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
  }
}

/* -------------------------------------------------------------------------
 * Component: FooterFollowUs (Column 5: Follow Us)
 * ------------------------------------------------------------------------- */

export interface FooterFollowUsProps {
  followUs: FollowUsConfig;
  className?: string;
}

export function FooterFollowUs({
  followUs,
  className = "",
}: FooterFollowUsProps) {
  const [instagramUrl, setInstagramUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadInstagramUrl = async () => {
      try {
        const section = await fetchPublicInstagramSection();
        if (!isMounted) return;
        if (section) {
          const resolved =
            section.profileUrl?.trim() ||
            (section.handle
              ? `https://www.instagram.com/${section.handle.replace(/^@/, "").trim()}/`
              : null);
          if (resolved && isMounted) {
            setInstagramUrl(resolved);
          }
        }
      } catch {
        // Maintain default configuration on failure
      }
    };

    loadInstagramUrl();

    const handleUpdate = () => {
      loadInstagramUrl();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "peralagae:instagram_updated_at") {
        loadInstagramUrl();
      }
    };

    window.addEventListener(INSTAGRAM_SECTION_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener(INSTAGRAM_SECTION_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <FooterAccordionSection
      id="follow-us"
      title={followUs.title}
      align="center"
      className={`w-full flex flex-col items-center justify-center text-center ${className}`}
      testId="footer-column-follow-us"
    >
      <div className="w-full flex items-center justify-center text-[#222222]">
        {followUs.links.map((social) => {
          const href =
            social.platform === "instagram" && instagramUrl ? instagramUrl : social.href;
          return (
            <a
              key={social.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="hover:text-[#C5A572] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] p-1 hover:scale-110 transition-transform flex items-center justify-center"
            >
              <SocialIcon platform={social.platform} />
            </a>
          );
        })}
      </div>
    </FooterAccordionSection>
  );
}

/* -------------------------------------------------------------------------
 * Payment Badges SVG Renderer
 * ------------------------------------------------------------------------- */

function PaymentBadge({ id, name }: { id: string; name: string }) {
  switch (id) {
    case "maestro":
      return (
        <svg
          className="h-6 w-9 sm:h-6.5 sm:w-10 rounded border border-[#E0E0E0]"
          viewBox="0 0 38 24"
          fill="none"
          role="img"
          aria-label={name}
        >
          <rect width="38" height="24" rx="2" fill="#FFFFFF" />
          <circle cx="15" cy="12" r="7" fill="#0061A8" />
          <circle cx="23" cy="12" r="7" fill="#EB001B" fillOpacity="0.85" />
        </svg>
      );
    case "paypal":
      return (
        <svg
          className="h-6 w-11 sm:h-6.5 sm:w-12 rounded border border-[#E0E0E0]"
          viewBox="0 0 44 24"
          fill="none"
          role="img"
          aria-label={name}
        >
          <rect width="44" height="24" rx="2" fill="#FFFFFF" />
          <path
            d="M14 7h4.5c2 0 3.2.9 3 2.5-.2 1.6-1.5 2.5-3 2.5h-1.5l-.8 5H13l1-10zm2 3.5h1.2c.8 0 1.4-.4 1.5-1.1.1-.7-.4-1.1-1.2-1.1H16l-.3 2.2z"
            fill="#003087"
          />
          <path
            d="M18.5 9.5h4c2 0 3.2.9 3 2.5-.2 1.6-1.5 2.5-3 2.5H21l-.8 5h-3.2l1-10zm2 3.5h1.2c.8 0 1.4-.4 1.5-1.1.1-.7-.4-1.1-1.2-1.1H20.5l-.3 2.2z"
            fill="#0079C1"
          />
        </svg>
      );
    case "visa":
      return (
        <svg
          className="h-6 w-10 sm:h-6.5 sm:w-11 rounded border border-[#E0E0E0]"
          viewBox="0 0 40 24"
          fill="none"
          role="img"
          aria-label={name}
        >
          <rect width="40" height="24" rx="2" fill="#FFFFFF" />
          <path
            d="M16 8l-2.5 8h-2.1l1.6-8h3zm8.3 5.3l1.1-3 .6 3h-1.7zm2.4 2.7h1.9l-1.7-8h-1.8c-.4 0-.7.2-.9.6l-3.2 7.4h2.2l.4-1.2h2.6l.5 1.2zm-6.2-.9c-.5-.4-.8-.9-.8-1.5 0-1.2 1.1-1.8 2.2-2.3.6-.3.8-.5.8-.8 0-.4-.5-.6-1-.6-.6 0-1.2.2-1.6.4l-.3-1.4c.5-.2 1.2-.4 1.9-.4 2 0 3.2 1 3.2 2.3 0 1.3-1 1.9-2.1 2.4-.6.3-.9.5-.9.9 0 .4.5.6 1.1.6.6 0 1.3-.2 1.7-.5l.3 1.4c-.5.3-1.3.5-2.1.5-1.5 0-2.5-.8-2.5-2z"
            fill="#00579F"
          />
        </svg>
      );
    case "mastercard":
      return (
        <svg
          className="h-6 w-9 sm:h-6.5 sm:w-10 rounded border border-[#E0E0E0]"
          viewBox="0 0 38 24"
          fill="none"
          role="img"
          aria-label={name}
        >
          <rect width="38" height="24" rx="2" fill="#FFFFFF" />
          <circle cx="15" cy="12" r="7" fill="#EB001B" />
          <circle cx="23" cy="12" r="7" fill="#F79E1B" fillOpacity="0.85" />
        </svg>
      );
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------
 * Component: FooterBottom (Divider, Payment Logos, Copyright)
 * ------------------------------------------------------------------------- */

export interface FooterBottomProps {
  copyright: {
    year: number;
    brandName: string;
    rightsText: string;
  };
  developer?: {
    text: string;
    label: string;
    href: string;
  };
  paymentMethods?: Array<{ id: string; name: string }>;
  className?: string;
}

export function FooterBottom({
  copyright,
  developer,
  paymentMethods,
  className = "",
}: FooterBottomProps) {
  const hasPaymentMethods = paymentMethods && paymentMethods.length > 0;

  return (
    <div className={`border-t border-[#EAE6DF] pt-4 sm:pt-5 pb-20 sm:pb-7 ${className}`}>
      <div className="mx-auto max-w-7xl 2xl:max-w-[1536px] 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8 2xl:px-12">
        {/* Payment Methods Row (Rendered only if methods are provided) */}
        {hasPaymentMethods && (
          <div
            data-testid="footer-payment-methods"
            className="flex items-center justify-center flex-wrap gap-3 sm:gap-4 mb-6"
          >
            {paymentMethods.map((method) => (
              <span key={method.id} className="inline-block" title={method.name}>
                <PaymentBadge id={method.id} name={method.name} />
              </span>
            ))}
          </div>
        )}

        {/* Bottom Bar: Centered copyright notice (or space-between if developer exists) */}
        <div
          className={`flex flex-col sm:flex-row items-center ${
            developer ? "justify-between sm:text-left" : "justify-center text-center"
          } gap-3 sm:gap-4`}
        >
          {/* Copyright */}
          <p
            data-testid="footer-copyright"
            className="text-xs text-[#777777] tracking-[0.02em] font-normal text-center"
          >
            © {copyright.year} {copyright.brandName}. {copyright.rightsText}
          </p>

          {/* Right: Design and Developed by Javix */}
          {developer && (
            <p
              data-testid="footer-developer"
              className="text-xs text-[#777777] tracking-[0.02em] font-normal"
            >
              <span>{developer.text}{" "}</span>
              <a
                href={developer.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#111111] hover:text-[#C5A572] font-medium transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
              >
                {developer.label}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Component: SiteFooter (Five-Column Desktop, Smooth Accordion Mobile)
 * ------------------------------------------------------------------------- */

export interface SiteFooterProps {
  config?: FooterConfig;
  className?: string;
}

/**
 * SiteFooter Component — PERALAGAE
 *
 * Implements:
 * - Desktop: Spacious 5-column luxury layout matching the design reference.
 * - Mobile: Interactive collapsible accordions with smooth transitions and rotating chevrons.
 *   - Column 1: PERALAGAE brand wordmark & timeless elegance tagline
 *   - Column 2: Explore Peralagae (Shop Our Collections, New Arrivals, Necklaces, Rings, Bracelets, Earrings)
 *   - Column 3: Shopping & More (Charms & Bangles, Gift Ideas, Find Store, Services, Subscribe)
 *   - Column 4: Store Details (Headset icon, Need Any Help?, phone, address, email)
 *   - Column 5: Follow Us (Facebook, X, Instagram)
 * - Divider line
 * - Payment methods (Maestro, PayPal, Visa, MasterCard)
 * - Centered copyright notice
 * - Bottom-right back-to-top button
 */
export function SiteFooter({
  config = defaultFooterConfig,
  className = "",
}: SiteFooterProps) {
  const {
    brand,
    explorePeralagae,
    exploreJavix,
    shoppingAndMore,
    storeDetails,
    followUs,
    copyright,
    developer,
    backToTop,
    paymentMethods,
  } = config;

  const exploreColumn = explorePeralagae ?? exploreJavix;

  let pathname = "/";
  try {
    const p = usePathname();
    if (p) pathname = p;
  } catch {
    pathname = "/";
  }

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer
      role="contentinfo"
      data-testid="site-footer"
      className={`w-full bg-[#FAF8F5] text-black ${className}`}
    >
      {/* Main Grid: 5-column on desktop, smooth collapsible accordions on mobile */}
      <div className="mx-auto max-w-7xl 2xl:max-w-[1536px] 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8 2xl:px-12 pt-8 sm:pt-10 lg:pt-12 pb-5 sm:pb-6 lg:pb-7">
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr_1fr_1.45fr_0.8fr] gap-3 sm:gap-4 lg:gap-6 xl:gap-8 2xl:gap-12 items-start">
          {/* Column 1: PERALAGAE Brand */}
          <FooterBrand
            name={brand.name}
            tagline={brand.tagline}
            href={brand.href}
            logoSrc={brand.logoSrc}
            logoWidth={brand.logoWidth}
            logoHeight={brand.logoHeight}
            className="mb-4 sm:mb-6 lg:mb-0"
          />

          {/* Column 2: Explore Peralagae */}
          {exploreColumn && <FooterLinkGroup column={exploreColumn} />}

          {/* Column 3: Shopping & More */}
          <FooterLinkGroup column={shoppingAndMore} />

          {/* Column 4: Store Details */}
          <FooterStoreDetails details={storeDetails} />

          {/* Column 5: Follow Us */}
          <FooterFollowUs followUs={followUs} className="w-full" />
        </div>
      </div>

      {/* Horizontal Divider & Bottom Section */}
      <FooterBottom
        copyright={copyright}
        developer={developer}
        paymentMethods={paymentMethods}
      />

      {/* Back-to-Top Button */}
      {backToTop?.enabled && <BackToTopButton label={backToTop.label} />}
    </footer>
  );
}
