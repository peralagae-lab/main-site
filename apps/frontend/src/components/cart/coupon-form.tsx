"use client";

import React, { useState } from "react";
import { Tag, Check, AlertCircle, X } from "lucide-react";
import type { Coupon } from "@/services/coupon-service";

export interface CouponFormProps {
  appliedCoupon: Coupon | null;
  onApplyCoupon: (code: string) => { success: boolean; message: string };
  onRemoveCoupon: () => void;
  className?: string;
}

/**
 * CouponForm Component — PERALAGAE
 *
 * Provides promotional coupon code input, validation feedback,
 * active coupon chip with discount amount, and clear action.
 */
export function CouponForm({
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  className = "",
}: CouponFormProps) {
  const [couponInput, setCouponInput] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) {
      setFeedback({
        type: "error",
        message: "Please enter a coupon code.",
      });
      return;
    }

    if (appliedCoupon && appliedCoupon.code.toUpperCase() === couponInput.trim().toUpperCase()) {
      setFeedback({
        type: "error",
        message: `Coupon "${appliedCoupon.code}" is already applied.`,
      });
      return;
    }

    const result = onApplyCoupon(couponInput.trim());
    if (result.success) {
      setFeedback({ type: "success", message: result.message });
      setCouponInput("");
    } else {
      setFeedback({ type: "error", message: result.message });
    }
  };

  const handleRemove = () => {
    onRemoveCoupon();
    setFeedback({ type: null, message: "" });
  };

  return (
    <div className={`w-full flex flex-col gap-3 ${className}`}>
      {/* Active Coupon Badge if Applied */}
      {appliedCoupon ? (
        <div
          data-testid="applied-coupon-banner"
          className="flex items-center justify-between p-3.5 border border-[#222222] bg-[#F7F7F7] text-[#111111]"
        >
          <div className="flex items-center gap-2.5">
            <Tag className="h-4 w-4 text-black" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wider uppercase">
                {appliedCoupon.code} Applied
              </span>
              <span className="text-[11px] text-[#555555]">
                {appliedCoupon.description}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove applied coupon"
            className="flex items-center gap-1 text-xs text-[#888888] hover:text-[#D9383A] underline transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span>Remove</span>
          </button>
        </div>
      ) : (
        /* Coupon Input Form */
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value);
                if (feedback.type) setFeedback({ type: null, message: "" });
              }}
              placeholder="Coupon code (e.g. SUMMER15)"
              aria-label="Promotional coupon code"
              className="w-full h-11 px-4 border border-[#CCCCCC] bg-white text-xs text-[#111111] placeholder-[#888888] tracking-wider uppercase focus:border-[#C5A572] focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            aria-label="Apply Coupon"
            className="h-11 px-6 bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-semibold uppercase tracking-widest whitespace-nowrap transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer"
          >
            Apply Coupon
          </button>
        </form>
      )}

      {/* Validation Feedback Messages */}
      {feedback.type && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`flex items-center gap-2 text-xs py-2 px-3 ${
            feedback.type === "success"
              ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]"
              : "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
          }`}
        >
          {feedback.type === "success" ? (
            <Check className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}
