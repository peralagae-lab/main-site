"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import {
  type EditorialCollectionItem,
  type EditorialCollectionsSectionConfig,
  defaultEditorialCollectionsConfig,
} from "@/config/editorial-collections";
import {
  fetchPublicMaterialsSection,
  MATERIAL_SECTION_UPDATED_EVENT,
} from "@/services/material-service";
import type { MaterialSectionConfig, MaterialCardConfig } from "@/types/material";

export interface EditorialCollectionCardProps {
  item: EditorialCollectionItem;
  className?: string;
  onCtaClick?: (item: EditorialCollectionItem, e: React.MouseEvent) => void;
}

/**
 * EditorialCollectionCard Component
 *
 * Renders an individual luxury editorial card consisting of:
 * 1. Tall portrait lifestyle campaign image (3:4 aspect ratio)
 * 2. Collection title
 * 3. Short editorial descriptive sentence
 * 4. Refined underlined text-link CTA navigating to material destination
 */
export function EditorialCollectionCard({
  item,
  className = "",
  onCtaClick,
}: EditorialCollectionCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onCtaClick) {
      onCtaClick(item, e);
    }
  };

  return (
    <article
      data-testid={`editorial-card-${item.id}`}
      className={`group flex flex-col items-center text-center ${className}`}
    >
      {/* 1. Large Lifestyle Jewellery Image (Tall 3:4 Portrait Ratio) */}
      <Link
        href={item.href}
        aria-label={`View ${item.title} Collection`}
        className="block w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F2F2F2]">
          <Image
            src={item.image.src}
            alt={item.image.alt}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 cursor-pointer"
            style={{ objectPosition: item.image.objectPosition || "center" }}
          />
        </div>
      </Link>

      {/* 2. Collection Title */}
      <h3 className="mt-5 sm:mt-6 text-lg sm:text-xl lg:text-[22px] font-normal tracking-[-0.01em] text-[#111111] leading-tight">
        {item.title}
      </h3>

      {/* 3. Short Descriptive Sentence */}
      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[#666666] font-normal leading-relaxed max-w-[280px] sm:max-w-xs mx-auto">
        {item.description}
      </p>

      {/* 4. Underlined Text-Link CTA */}
      <div className="mt-3.5 sm:mt-4">
        <Link
          href={item.href}
          onClick={handleClick}
          data-testid={`editorial-cta-${item.id}`}
          className="inline-block text-xs sm:text-[13px] font-medium tracking-[0.08em] uppercase text-[#111111] underline underline-offset-4 decoration-[#C5A572] transition-colors duration-200 hover:text-[#C5A572] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2 cursor-pointer"
          title={
            item.isImplemented
              ? item.ctaText
              : `${item.ctaText} (Pending Catalogue Route)`
          }
          aria-label={`${item.ctaText}: ${item.title}`}
        >
          {item.ctaText}
        </Link>
      </div>
    </article>
  );
}

/**
 * EditorialCollectionsSkeleton Component
 * Honest loading skeleton rendered while database response arrives.
 * Prevents flashing hardcoded or static mock card content.
 */
export function EditorialCollectionsSkeleton({ className = "" }: { className?: string }) {
  return (
    <section
      role="status"
      aria-label="Loading materials collection"
      className={`w-full bg-white pt-2 sm:pt-4 lg:pt-6 pb-16 sm:pb-20 lg:pb-24 ${className}`}
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex justify-center mb-10 sm:mb-14 lg:mb-16">
          <div className="h-8 sm:h-10 w-72 sm:w-96 bg-neutral-100 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 md:gap-6 lg:gap-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="aspect-[3/4] w-full bg-neutral-100 animate-pulse rounded" />
              <div className="mt-5 h-6 w-40 bg-neutral-100 animate-pulse rounded" />
              <div className="mt-2 h-4 w-56 bg-neutral-100 animate-pulse rounded" />
              <div className="mt-4 h-4 w-28 bg-neutral-100 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export interface EditorialCollectionsSectionProps {
  /**
   * Database-backed section setting from MongoDB.
   */
  initialSection?: MaterialSectionConfig | null;

  /**
   * Optional custom configuration override (e.g. for unit testing).
   */
  config?: EditorialCollectionsSectionConfig;

  /**
   * Optional container className override.
   */
  className?: string;

  /**
   * Optional custom click callback for any card CTA.
   */
  onCtaClick?: (item: EditorialCollectionItem, e: React.MouseEvent) => void;
}

/**
 * EditorialCollectionsSection Component — PERALAGAE
 *
 * Implements:
 * 1. Centred Top Brand Tagline: "Designed in India. Crafted with timeless elegance."
 * 2. Visual Material Collection Cards (dynamically configured via Admin Dashboard)
 * 3. STRICT DATABASE-ONLY RENDERING:
 *    - Never flashes or renders mock/static fallback cards.
 *    - Only renders cards after a verified database response from Supabase.
 *    - Destination CTA links are resolved directly from database Material assignments.
 *    - Displays honest loading skeleton, error retry state, or empty state.
 */
export function EditorialCollectionsSection({
  initialSection = null,
  config,
  className = "",
  onCtaClick,
}: EditorialCollectionsSectionProps) {
  // Database-driven state
  const [section, setSection] = useState<MaterialSectionConfig | null>(initialSection);
  const [isLoading, setIsLoading] = useState(!initialSection && !config);
  const [error, setError] = useState<string | null>(null);

  const loadSection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPublicMaterialsSection();
      if (data) {
        setSection(data);
      } else {
        setError("Failed to retrieve materials collection from database.");
      }
    } catch (err) {
      console.error("[EditorialCollectionsSection] Fetch error:", err);
      setError("Unable to connect to database service.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (config) return;

    if (!initialSection) {
      loadSection();
    }

    const handlePublished = () => {
      loadSection();
    };

    window.addEventListener(MATERIAL_SECTION_UPDATED_EVENT, handlePublished);
    return () => {
      window.removeEventListener(MATERIAL_SECTION_UPDATED_EVENT, handlePublished);
    };
  }, [config, initialSection, loadSection]);

  // If an explicit config is passed (e.g. in legacy unit tests), render it directly
  if (config) {
    return (
      <section
        aria-labelledby="editorial-collections-tagline"
        data-testid="editorial-collections-section"
        className={`w-full bg-white pt-2 sm:pt-4 lg:pt-6 pb-16 sm:pb-20 lg:pb-24 ${className}`}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <h2
            id="editorial-collections-tagline"
            data-testid="editorial-tagline"
            className="text-center font-normal text-2xl sm:text-3xl md:text-[32px] lg:text-[36px] tracking-[-0.015em] text-[#111111] leading-snug mb-10 sm:mb-14 lg:mb-16"
          >
            {config.tagline}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 md:gap-6 lg:gap-8">
            {config.items.map((item) => (
              <EditorialCollectionCard
                key={item.id}
                item={item}
                onCtaClick={onCtaClick}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Loading state
  if (isLoading && !section) {
    return <EditorialCollectionsSkeleton className={className} />;
  }

  // Error state
  if (error && !section) {
    return (
      <section
        role="alert"
        aria-live="polite"
        className={`w-full bg-white pt-8 pb-16 text-center ${className}`}
      >
        <div className="mx-auto max-w-xl px-4 py-8 border border-dashed border-[#E5E5E5] rounded bg-[#FAFAFA]">
          <h3 className="text-base font-serif font-medium text-[#111111]">
            Unable to Load Materials Collection
          </h3>
          <p className="mt-1 text-xs text-[#666666]">
            {error}
          </p>
          <button
            type="button"
            onClick={loadSection}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-semibold tracking-wider uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      </section>
    );
  }

  const activeCards = (section?.cards || [])
    .filter((c) => c.isActive !== false)
    .sort((a, b) => a.order - b.order);

  // Empty state
  if (!section || activeCards.length === 0) {
    return (
      <section
        className={`w-full bg-white pt-2 sm:pt-4 lg:pt-6 pb-16 sm:pb-20 lg:pb-24 ${className}`}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 text-center">
          <h2
            id="editorial-collections-tagline"
            data-testid="editorial-tagline"
            className="text-center font-normal text-2xl sm:text-3xl md:text-[32px] lg:text-[36px] tracking-[-0.015em] text-[#111111] leading-snug mb-8"
          >
            {section?.heading || "Designed in India. Crafted with timeless elegance."}
          </h2>
          <div className="py-12 border border-dashed border-[#E5E5E5] bg-[#FAF9F6] rounded max-w-md mx-auto">
            <p className="text-xs sm:text-sm text-[#777777] font-medium tracking-wide uppercase">
              No material collections are currently active.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Active Database Content
  return (
    <section
      aria-labelledby="editorial-collections-tagline"
      data-testid="editorial-collections-section"
      className={`w-full bg-white pt-2 sm:pt-4 lg:pt-6 pb-16 sm:pb-20 lg:pb-24 ${className}`}
    >
      <div className="mx-auto max-w-7xl 2xl:max-w-[1536px] 3xl:max-w-[1720px] px-3 sm:px-6 lg:px-8 2xl:px-12">
        {/* Top Brand Heading configured by Admin */}
        <h2
          id="editorial-collections-tagline"
          data-testid="editorial-tagline"
          className="text-center font-normal text-2xl sm:text-3xl md:text-[32px] lg:text-[36px] tracking-[-0.015em] text-[#111111] leading-snug mb-10 sm:mb-14 lg:mb-16"
        >
          {section.heading}
        </h2>

        {/* Database-Driven Editorial Material Collection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 md:gap-6 lg:gap-8 2xl:gap-12">
          {activeCards.map((card: MaterialCardConfig) => {
            // Destination URL dynamically resolved from database Material assignment
            const destinationHref = card.material?.slug
              ? `/shop?material=${encodeURIComponent(card.material.slug)}`
              : card.materialId
              ? `/shop?material=${encodeURIComponent(card.materialId)}`
              : "/shop";

            const item: EditorialCollectionItem = {
              id: card.id,
              title: card.title,
              description: card.description,
              ctaText: card.ctaText,
              href: destinationHref,
              isImplemented: true,
              image: {
                src: card.imageUrl,
                alt: card.imageAlt || `${card.title} - ${card.material?.name || "Fine Jewellery"}`,
                objectPosition: "center",
              },
            };

            return (
              <EditorialCollectionCard
                key={card.id}
                item={item}
                onCtaClick={onCtaClick}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
