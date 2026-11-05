"use client";

import React, { useState } from "react";
import { Star, ShieldCheck, CheckCircle2, MessageSquarePlus, Sparkles } from "lucide-react";
import type { Product, ProductReview, ProductSpec } from "@/types/product";

export interface ProductTabsProps {
  product: Product;
  activeTab?: "description" | "reviews";
  onTabChange?: (tab: "description" | "reviews") => void;
}

export function ProductTabs({
  product,
  activeTab: controlledActiveTab,
  onTabChange,
}: ProductTabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<"description" | "reviews">("description");
  const activeTab = controlledActiveTab ?? internalActiveTab;

  const handleTabClick = (tab: "description" | "reviews") => {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };
  const [reviewsList, setReviewsList] = useState<ProductReview[]>(
    product.reviews && product.reviews.length > 0 ? product.reviews : []
  );

  // Write a Review Form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newName, setNewName] = useState("");
  const [newComment, setNewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const specs: ProductSpec[] = product.specs || [];

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newComment.trim()) return;

    const newRev: ProductReview = {
      id: `rev-${Date.now()}`,
      author: newName.trim(),
      rating: newRating,
      date: new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      comment: newComment.trim(),
      verified: true,
    };

    setReviewsList((prev) => [newRev, ...prev]);
    setReviewSubmitted(true);
    setNewName("");
    setNewComment("");
    setNewRating(5);
    setTimeout(() => {
      setReviewSubmitted(false);
      setShowReviewForm(false);
    }, 2500);
  };

  return (
    <section
      id="product-tabs-section"
      aria-label="Product Specifications and Reviews"
      className="mt-14 sm:mt-16 border-t border-[#E5E5E5] pt-8 sm:pt-10 w-full pdp-typography font-jost"
    >
      {/* Tab Navigation Controls */}
      <div
        role="tablist"
        aria-label="Product Information Tabs"
        className="flex items-center justify-center gap-8 sm:gap-12 border-b border-[#EEEEEE] pb-4"
      >
        <button
          role="tab"
          id="tab-description"
          aria-selected={activeTab === "description"}
          aria-controls="panel-description"
          tabIndex={activeTab === "description" ? 0 : -1}
          onClick={() => handleTabClick("description")}
          className={`relative pb-3 text-base sm:text-lg font-medium transition-all ${
            activeTab === "description"
              ? "text-[#111111] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#C5A572]"
              : "text-[#888888] hover:text-[#C5A572]"
          }`}
        >
          Description
        </button>

        <button
          role="tab"
          id="tab-reviews"
          aria-selected={activeTab === "reviews"}
          aria-controls="panel-reviews"
          tabIndex={activeTab === "reviews" ? 0 : -1}
          onClick={() => handleTabClick("reviews")}
          className={`relative pb-3 text-base sm:text-lg font-medium transition-all ${
            activeTab === "reviews"
              ? "text-[#111111] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#C5A572]"
              : "text-[#888888] hover:text-[#C5A572]"
          }`}
        >
          Reviews ({reviewsList.length})
        </button>
      </div>

      {/* Tab Panel 1: Description & Specifications */}
      {activeTab === "description" && (
        <div
          role="tabpanel"
          id="panel-description"
          aria-labelledby="tab-description"
          className="pt-8 text-left max-w-4xl mx-auto space-y-8 animate-fade-in"
        >
          {/* Editorial Description Text (Overview & Details) */}
          {(product.productOverview || product.descriptionParagraph1 || product.longDescription || product.productDetails || product.descriptionParagraph2) && (
            <div className="space-y-4 text-sm sm:text-base text-[#444444] leading-relaxed">
              {(product.productOverview || product.descriptionParagraph1 || product.longDescription) && (
                <p className="text-[#222222] font-normal leading-relaxed">
                  {product.productOverview || product.descriptionParagraph1 || product.longDescription}
                </p>
              )}
              {(product.productDetails || product.descriptionParagraph2) && (
                <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
                  {product.productDetails || product.descriptionParagraph2}
                </p>
              )}
            </div>
          )}

          {/* Product Specifications Table */}
          {specs.length > 0 && (
            <div className="pt-2">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#111111] mb-4">
                Product Specifications
              </h3>
              <div className="overflow-hidden border border-[#E5E5E5] rounded-[2px] bg-white">
                <table className="w-full text-left text-xs sm:text-sm">
                  <tbody>
                    {specs.map((spec, idx) => (
                      <tr
                        key={`${spec.label}-${idx}`}
                        className={`border-b border-[#EEEEEE] last:border-b-0 ${
                          idx % 2 === 0 ? "bg-[#FAFAFA]" : "bg-white"
                        }`}
                      >
                        <th
                          scope="row"
                          className="w-1/3 sm:w-1/4 px-4 sm:px-6 py-3.5 font-medium text-[#222222] border-r border-[#EEEEEE]"
                        >
                          {spec.label}
                        </th>
                        <td className="px-4 sm:px-6 py-3.5 text-[#555555]">
                          {spec.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Care Instructions */}
          {(product.careInstructions || specs.find((s) => s.label.toLowerCase().includes("care"))?.value) && (
            <div className="pt-2">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#111111] mb-3">
                Jewellery Care Instructions
              </h3>
              <div className="p-4 sm:p-5 rounded-[2px] bg-[#FAF9F6] border border-[#EBE7DF] text-xs sm:text-sm text-[#555555] leading-relaxed">
                {product.careInstructions || specs.find((s) => s.label.toLowerCase().includes("care"))?.value}
              </div>
            </div>
          )}

          {/* Additional Information */}
          {product.additionalInfo && (
            <div className="pt-2">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[#111111] mb-3">
                Additional Information
              </h3>
              <div className="p-4 sm:p-5 rounded-[2px] bg-white border border-[#E5E5E5] text-xs sm:text-sm text-[#555555] leading-relaxed">
                {product.additionalInfo}
              </div>
            </div>
          )}

          {/* Brand Authenticity Note */}
          <div className="flex items-start gap-3 rounded-[2px] bg-[#F7F5F0] border border-[#EBE6DC] p-4 text-xs text-[#55554D]">
            <Sparkles className="h-5 w-5 text-[#C5A572] flex-none mt-0.5" />
            <div>
              <strong className="text-[#222222]">The PERALAGAE Guarantee:</strong> All precious metals and stones are ethically sourced, conflict-free, and independently assayed in compliance with Bureau of Indian Standards (BIS) regulations.
            </div>
          </div>
        </div>
      )}

      {/* Tab Panel 2: Customer Reviews */}
      {activeTab === "reviews" && (
        <div
          role="tabpanel"
          id="panel-reviews"
          aria-labelledby="tab-reviews"
          className="pt-6 sm:pt-8 text-left max-w-4xl mx-auto pdp-typography font-jost animate-fade-in"
        >
          {/* Reviews Header Matching Reference: "{count} reviews for {product.name}" */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-2">
            <h2 className="text-xl sm:text-[22px] font-normal text-[#1A1A1A] leading-snug">
              {reviewsList.length} {reviewsList.length === 1 ? "review" : "reviews"} for {product.name}
            </h2>

            <button
              type="button"
              onClick={() => setShowReviewForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold uppercase tracking-wider text-[#111111] hover:text-[#C5A572] transition-colors cursor-pointer"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              <span>{showReviewForm ? "Cancel Review" : "Write a Review"}</span>
            </button>
          </div>

          {/* Interactive "Write a Review" Form */}
          {showReviewForm && (
            <div className="mb-8 bg-[#FAFAFA] border border-[#E5E5E5] p-5 sm:p-6 rounded-[2px] space-y-4">
              <h4 className="text-base font-medium text-[#111111]">
                Share Your Experience with {product.name}
              </h4>

              {reviewSubmitted ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-4 rounded">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Thank you! Your verified review has been submitted.</span>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#444444] mb-1.5">
                      Your Rating *
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
                          aria-label={`Rate ${star} stars`}
                        >
                          <Star
                            className={`h-4 w-4 cursor-pointer transition ${
                              star <= newRating
                                ? "fill-black text-black"
                                : "fill-transparent text-[#CCCCCC]"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="rev-author" className="block text-xs font-medium uppercase tracking-wider text-[#444444] mb-1">
                      Your Full Name *
                    </label>
                    <input
                      id="rev-author"
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Shalini Roy"
                      className="w-full border border-[#D9D9D9] px-3.5 py-2 text-sm bg-white focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="rev-text" className="block text-xs font-medium uppercase tracking-wider text-[#444444] mb-1">
                      Review Comments *
                    </label>
                    <textarea
                      id="rev-text"
                      required
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write your genuine thoughts on the design, finish, and unboxing..."
                      className="w-full border border-[#D9D9D9] p-3 text-sm bg-white focus:border-black focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      type="submit"
                      className="bg-[#111111] text-white px-6 py-2.5 text-xs font-semibold tracking-widest uppercase hover:bg-[#C5A572] active:bg-[#B3935F] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                    >
                      Post Review
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* List of Customer Reviews Matching Reference Screenshot */}
          {reviewsList.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#777777]">
              No reviews yet. Be the first to share your thoughts on this fine piece.
            </div>
          ) : (
            <div className="divide-y divide-[#EEEEEE]">
              {reviewsList.map((rev) => (
                <article
                  key={rev.id}
                  className="flex items-start gap-4 sm:gap-5 py-6 sm:py-7 first:pt-0"
                >
                  {/* Left: Classic Circular Silhouette Avatar */}
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#CCCCCC] text-white">
                    <svg
                      className="h-7 w-7 sm:h-8 sm:w-8 fill-white"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>

                  {/* Right Content */}
                  <div className="flex-1 text-left">
                    {/* Solid Black Stars */}
                    <div
                      className="flex items-center gap-[2px] mb-1"
                      aria-label={`Rated ${rev.rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < rev.rating
                              ? "fill-black text-black"
                              : "fill-transparent text-[#CCCCCC]"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Author – Date */}
                    <div className="text-[13.5px] sm:text-[14px] leading-snug">
                      <span className="font-semibold text-[#1A1A1A]">{rev.author}</span>
                      <span className="text-[#888888] font-normal"> – {rev.date}</span>
                      {rev.verified && (
                        <span className="sr-only">Verified Buyer</span>
                      )}
                    </div>

                    {/* Comment text */}
                    <p className="mt-2 text-[13.5px] sm:text-[14px] text-[#666666] leading-[1.65] font-normal">
                      {rev.comment}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
