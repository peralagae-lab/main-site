"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  type HeroBannerItem,
  type HeroBannersConfig,
  defaultHeroBannersConfig,
} from "@/config/hero-banners";
import { useHeroSettings } from "@/hooks/use-hero-settings";
import type { HeroSettingsData } from "@/types/hero";

export interface OutlineButtonProps {
  label: string;
  href: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Rectangular outline call-to-action button matching the reference design.
 * Features clean square corners, thin border, and subtle hover transition.
 */
export function OutlineButton({
  label,
  href,
  className = "",
  "aria-label": ariaLabel,
}: OutlineButtonProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel || label}
      className={`inline-flex items-center justify-center border border-[#222222] bg-transparent px-5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-[13px] font-normal text-[#111111] transition-all duration-250 hover:border-[#C5A572] hover:bg-[#C5A572] hover:text-white active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2 cursor-pointer ${className}`}
    >
      {label}
    </Link>
  );
}

export interface BannerCardProps {
  item: HeroBannerItem;
  isFeatured?: boolean;
  className?: string;
}

/**
 * Single editorial banner card with image background, subtle contrast
 * treatment, and left-aligned text hierarchy matching reference composition.
 */
export function BannerCard({ item, isFeatured = false, className = "" }: BannerCardProps) {
  const HeadingTag = isFeatured ? "h2" : "h3";

  return (
    <article
      data-testid={`banner-${item.id}`}
      className={`group relative overflow-hidden bg-[#ECECEC] ${
        isFeatured
          ? "h-full min-h-[500px] sm:min-h-[580px] lg:min-h-[660px] 2xl:min-h-[720px] 3xl:min-h-[780px]"
          : "h-full min-h-[275px] sm:min-h-[300px] lg:min-h-[314px] 2xl:min-h-[345px] 3xl:min-h-[375px]"
      } ${className}`}
    >
      {/* Background Image with Focal Point Alignment */}
      <div className="absolute inset-0 z-0">
        <Image
          src={item.image.src}
          alt={item.image.alt}
          fill
          priority={item.priority}
          sizes={isFeatured ? "(max-width: 1024px) 100vw, (max-width: 1920px) 50vw, 960px" : "(max-width: 1024px) 100vw, (max-width: 1920px) 50vw, 960px"}
          className="object-cover origin-top-right transition-transform duration-700 ease-out group-hover:scale-105"
          style={{ objectPosition: item.image.objectPosition || "right top" }}
        />
      </div>

      {/* Subtle Legibility Gradient Overlay (seamlessly blends with imagery) */}
      <div
        className="pointer-events-none absolute inset-0 z-1 bg-gradient-to-r from-[#ECECEC]/75 via-[#ECECEC]/25 to-transparent sm:from-[#ECECEC]/45 sm:to-transparent"
        aria-hidden="true"
      />

      {/* Left-Aligned Text Content Block */}
      <div
        className={`relative z-10 flex h-full flex-col items-start px-5 sm:px-7 lg:px-8 xl:px-9 max-w-[84%] sm:max-w-[65%] lg:max-w-[58%] ${
          isFeatured
            ? "justify-start pt-9 sm:pt-12 lg:pt-14 xl:pt-16"
            : "justify-start pt-7 sm:pt-9 lg:pt-10 xl:pt-12"
        }`}
      >
        {/* Optional Introductory Small Badge */}
        {item.introHeading && (
          <span className="mb-2 text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase text-[#666666]">
            {item.introHeading}
          </span>
        )}

        {/* Heading Line 1 (Subheading) */}
        {item.subheading && (
          <span
            className={`font-light text-[#222222] tracking-[-0.01em] leading-tight sm:whitespace-nowrap ${
              isFeatured
                ? "text-2xl sm:text-3xl lg:text-[28px] xl:text-[30px] mb-0.5 sm:mb-1"
                : "text-lg sm:text-xl lg:text-[22px] xl:text-[24px] mb-0.5 sm:mb-1"
            }`}
          >
            {item.subheading}
          </span>
        )}

        {/* Heading Line 2 (Main Prominent Title) */}
        <HeadingTag
          className={`font-normal tracking-[-0.01em] text-[#111111] leading-[1.12] sm:whitespace-nowrap ${
            isFeatured
              ? "text-3xl sm:text-4xl lg:text-[36px] xl:text-[40px] mb-2 sm:mb-3"
              : "text-2xl sm:text-3xl lg:text-[28px] xl:text-[32px] mb-4 sm:mb-5"
          }`}
        >
          {item.title}
        </HeadingTag>

        {/* Optional Supporting Description */}
        {item.description && (
          <p className="mb-6 sm:mb-7 lg:mb-8 max-w-[270px] text-xs sm:text-[13.5px] font-normal text-[#555555] leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Rectangular Outline CTA Button */}
        <div>
          <OutlineButton
            label={item.cta.label}
            href={item.cta.href}
            aria-label={`${item.cta.label} - ${item.subheading ? `${item.subheading} ` : ""}${item.title.replace(/\n/g, " ")}`}
          />
        </div>
      </div>
    </article>
  );
}

import type { CategoryItem } from "@/types/category";

export interface HeroBannersProps {
  /**
   * Promotional banner configuration.
   * If omitted or defaultHeroBannersConfig, dynamically syncs with published hero settings.
   */
  config?: HeroBannersConfig;
  initialSettings?: HeroSettingsData;
  initialCategories?: CategoryItem[];
  className?: string;
}

/**
 * PERALAGAE Hero & Promotional Banner Section
 *
 * Implements a 2-column desktop composition:
 * - Left column: One large vertically-oriented promotional banner spanning full height.
 * - Right column: Two stacked landscape promotional banners with consistent gap.
 * - Mobile (< lg): Seamless vertical stack preserving visual hierarchy.
 */
export function HeroBanners({
  config: propConfig,
  initialSettings,
  initialCategories,
  className = "",
}: HeroBannersProps) {
  const { config: dynamicConfig, isError } = useHeroSettings(initialSettings, initialCategories);
  const activeConfig = propConfig ?? dynamicConfig;

  if (isError && !propConfig && !initialSettings) {
    return (
      <section aria-label="Promotional Collections Error" className="w-full py-12 text-center bg-neutral-50 text-neutral-600">
        <p className="text-sm font-medium">Failed to load promotional hero banners from database.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-1.5 text-xs uppercase tracking-wider bg-[#111111] text-white hover:bg-[#C5A572] active:bg-[#B3935F] transition-colors cursor-pointer"
        >
          Retry Connection
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Promotional Collections"
      className={`w-full bg-white pt-1 sm:pt-1.5 lg:pt-2 pb-6 sm:pb-8 lg:pb-10 ${className}`}
    >
      <div className="mx-auto max-w-7xl 2xl:max-w-[1536px] 3xl:max-w-[1720px] px-3 sm:px-4 lg:px-6 2xl:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 2xl:gap-8 items-stretch">
          {/* Left Column: Vertically Oriented Featured Banner */}
          <div className="h-full">
            <BannerCard item={activeConfig.featuredBanner} isFeatured />
          </div>

          {/* Right Column: Two Stacked Landscape Banners */}
          <div className="flex flex-col gap-4 sm:gap-5 lg:gap-6 justify-between h-full">
            <div className="flex-1">
              <BannerCard item={activeConfig.secondaryTopBanner} />
            </div>
            <div className="flex-1">
              <BannerCard item={activeConfig.secondaryBottomBanner} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
