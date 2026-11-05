"use client";

import React from "react";
import type {
  CustomerReviewsSectionConfig,
  ReviewItem,
} from "@/config/reviews";
import { defaultReviewsConfig } from "@/config/reviews";

/* -------------------------------------------------------------------------
 * Component: StarRating
 * ------------------------------------------------------------------------- */

export interface StarRatingProps {
  rating: number;
  maxStars?: number;
  starColor?: string;
  className?: string;
}

export function StarRating({
  rating,
  maxStars = 5,
  starColor = "#D4A373",
  className = "",
}: StarRatingProps) {
  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      aria-label={`Rated ${rating} out of ${maxStars} stars`}
      role="img"
    >
      <span className="sr-only">Rated {rating} out of {maxStars} stars</span>
      {Array.from({ length: maxStars }).map((_, i) => {
        const isFilled = i < rating;
        return (
          <svg
            key={i}
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors"
            viewBox="0 0 20 20"
            fill={isFilled ? starColor : "#E5E7EB"}
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Component: ReviewCard
 * ------------------------------------------------------------------------- */

export interface ReviewCardProps {
  review: ReviewItem;
  starColor?: string;
  className?: string;
  "aria-hidden"?: boolean;
}

export function ReviewCard({
  review,
  starColor = "#D4A373",
  className = "",
  "aria-hidden": ariaHidden,
}: ReviewCardProps) {
  return (
    <article
      data-testid={`review-card-${review.id}`}
      aria-hidden={ariaHidden}
      className={`bg-white rounded-none p-6 sm:p-7 md:p-8 flex flex-col justify-between w-[310px] sm:w-[350px] lg:w-[390px] shrink-0 border border-black/[0.04] shadow-none select-none transition-shadow duration-300 hover:shadow-md ${className}`}
      style={{ minHeight: "260px" }}
    >
      <div>
        {/* Circular dark quotation-mark icon near upper-left */}
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#111111] text-white flex items-center justify-center shrink-0 mb-5"
          aria-hidden="true"
        >
          <svg
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </div>

        {/* Bold review headline */}
        <h3 className="font-semibold text-base sm:text-[17px] text-[#111111] leading-snug mb-2.5">
          {review.headline}
        </h3>

        {/* Short jewellery-specific review */}
        <p className="text-xs sm:text-[13px] md:text-sm text-[#555555] leading-relaxed">
          {review.reviewText}
        </p>
      </div>

      {/* Bottom row: Indian customer name (left) & Star rating (right) */}
      <div className="flex items-center justify-between pt-5 mt-6 border-t border-neutral-100">
        <span className="text-xs sm:text-[13px] font-medium text-[#111111]">
          {review.authorName}
        </span>
        <StarRating rating={review.rating} starColor={starColor} />
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------
 * Component: ReviewPagination (Kept for full backward-compatibility)
 * ------------------------------------------------------------------------- */

export interface ReviewPaginationProps {
  totalPages: number;
  activePage: number;
  onPageSelect: (pageIndex: number) => void;
  className?: string;
}

export function ReviewPagination({
  totalPages,
  activePage,
  onPageSelect,
  className = "",
}: ReviewPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={`flex items-center justify-center gap-2 sm:gap-2.5 mt-8 sm:mt-12 ${className}`}
      role="tablist"
      aria-label="Customer reviews pages"
    >
      {Array.from({ length: totalPages }).map((_, idx) => (
        <button
          key={`review-dot-${idx}`}
          type="button"
          role="tab"
          aria-selected={idx === activePage}
          aria-label={`Go to review page ${idx + 1}`}
          onClick={() => onPageSelect(idx)}
          className={`h-2 w-2 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] ${
            idx === activePage
              ? "bg-[#C5A572] border border-[#C5A572] w-5"
              : "bg-white border border-[#888888] hover:border-[#C5A572] hover:bg-[#C5A572]/20"
          }`}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Component: CustomerReviewsSection
 * ------------------------------------------------------------------------- */

export interface CustomerReviewsSectionProps {
  config?: CustomerReviewsSectionConfig;
  className?: string;
}

/**
 * CustomerReviewsSection Component — PERALAGAE
 *
 * Implements:
 * 1. Exact Section Heading: "Customer Reviews" (centred, elegant dark charcoal)
 * 2. Soft muted blush-grey background (#F0E5E4) with subtle CSS concentric circles
 * 3. Continuous Infinite Marquee: Cards glide smoothly and endlessly in continuous motion
 * 4. Pure white minimal cards with quotation badge, headline, body, customer name, and 5-star rating
 * 5. Full accessibility with zero duplicate screen-reader announcements & reduced-motion support
 */
export function CustomerReviewsSection({
  config = defaultReviewsConfig,
  className = "",
}: CustomerReviewsSectionProps) {
  const {
    heading = "Customer Reviews",
    backgroundColor = "#F0E5E4",
    starColor = "#D4A373",
    reviews = [],
    marqueeDurationSeconds = 45,
  } = config;

  // Graceful empty state: return null if no reviews provided
  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="customer-reviews-heading"
      data-testid="customer-reviews-section"
      className={`relative w-full py-16 sm:py-20 lg:py-24 overflow-hidden select-none ${className}`}
      style={{ backgroundColor }}
      role="region"
      aria-roledescription="marquee"
    >
      {/* CSS Animation Keyframes for Smooth Infinite Marquee */}
      <style>{`
        @keyframes reviewsMarqueeAnim {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .reviews-marquee-track {
          display: flex;
          width: max-content;
          animation: reviewsMarqueeAnim ${marqueeDurationSeconds}s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .reviews-marquee-track {
            animation-play-state: paused;
          }
        }
      `}</style>

      {/* Subtle, oversized concentric circular outlines in background */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="absolute w-[480px] h-[480px] sm:w-[680px] sm:h-[680px] lg:w-[860px] lg:h-[860px] rounded-full border border-black/[0.04]" />
        <div className="absolute w-[760px] h-[760px] sm:w-[1040px] sm:h-[1040px] lg:w-[1300px] lg:h-[1300px] rounded-full border border-black/[0.035]" />
        <div className="absolute w-[1040px] h-[1040px] sm:w-[1400px] sm:h-[1400px] lg:w-[1740px] lg:h-[1740px] rounded-full border border-black/[0.025]" />
      </div>

      <div className="relative z-10 w-full">
        {/* Exact Section Heading: Customer Reviews */}
        <h2
          id="customer-reviews-heading"
          data-testid="customer-reviews-heading"
          className="text-center font-normal text-2xl sm:text-3xl md:text-[32px] lg:text-[36px] tracking-[-0.01em] text-[#111111] leading-tight mb-10 sm:mb-12 lg:mb-14 px-4"
        >
          {heading}
        </h2>

        {/* Continuous Infinite Marquee Track with subtle gradient edge mask */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 3%, black 97%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 3%, black 97%, transparent)",
          }}
        >
          <div
            className="reviews-marquee-track flex gap-5 sm:gap-6 lg:gap-7 pl-4"
            data-testid="reviews-marquee-track"
          >
            {/* Primary Set */}
            {reviews.map((review) => (
              <ReviewCard
                key={`primary-${review.id}`}
                review={review}
                starColor={starColor}
              />
            ))}
            {/* Duplicate Set for Seamless Continuous Infinite Loop */}
            {reviews.map((review) => (
              <ReviewCard
                key={`loop-${review.id}`}
                review={review}
                starColor={starColor}
                aria-hidden={true}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
