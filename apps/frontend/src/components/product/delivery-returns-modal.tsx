"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Truck, RotateCcw, ShieldCheck, Clock } from "lucide-react";

export interface DeliveryReturnsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeliveryReturnsModal({ isOpen, onClose }: DeliveryReturnsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-none bg-white p-6 sm:p-8 shadow-2xl border border-[#E5E5E5] text-left"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close delivery information dialog"
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-black transition"
        >
          <X className="h-5 w-5" />
        </button>

        <h3
          id="delivery-modal-title"
          className="font-serif text-2xl font-normal text-[#111111] border-b border-[#EEEEEE] pb-3"
        >
          Delivery & Returns
        </h3>

        <div className="mt-5 space-y-6 text-sm text-[#444444]">
          {/* Section 1: Delivery */}
          <div>
            <div className="flex items-center gap-2.5 font-medium text-[#111111]">
              <Truck className="h-4 w-4 text-[#C5A572]" />
              <span>Complimentary Insured Shipping</span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-[#666666] leading-relaxed">
              Every PERALAGAE order is shipped via high-security, armoured couriers (BlueDart Apex / Sequel Logistics) with 100% transit insurance.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-[#555555]">
              <li>• <strong>Metro Cities:</strong> Delivered within 2–4 business days.</li>
              <li>• <strong>Rest of India:</strong> Delivered within 3–5 business days.</li>
              <li>• Dispatched in tamper-evident, discreet luxury packaging.</li>
            </ul>
          </div>

          {/* Section 2: Returns */}
          <div>
            <div className="flex items-center gap-2.5 font-medium text-[#111111]">
              <RotateCcw className="h-4 w-4 text-[#C5A572]" />
              <span>14-Day Complimentary Returns</span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-[#666666] leading-relaxed">
              If your chosen jewel is not entirely perfect, you may request a hassle-free return or size exchange within 14 days of delivery.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-[#555555]">
              <li>• Free doorstep pickup by our logistics team.</li>
              <li>• Full refund processed directly to original payment method within 48 hours of verification.</li>
              <li>• Items must be unworn with original certificate and security tag intact.</li>
            </ul>
          </div>

          {/* Section 3: Lifetime Exchange */}
          <div>
            <div className="flex items-center gap-2.5 font-medium text-[#111111]">
              <ShieldCheck className="h-4 w-4 text-[#C5A572]" />
              <span>Lifetime Exchange & Buyback Guarantee</span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-[#666666] leading-relaxed">
              Enjoy lifetime upgrade and exchange on all PERALAGAE fine jewellery at prevailing benchmark gold and certified diamond market valuations.
            </p>
          </div>
        </div>

        <div className="mt-7 pt-4 border-t border-[#EEEEEE] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#111111] text-white px-6 py-2.5 text-xs font-semibold tracking-wider uppercase hover:bg-[#C5A572] active:bg-[#B3935F] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
          >
            Got It
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
