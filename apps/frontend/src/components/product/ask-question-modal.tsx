"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Send, CheckCircle2 } from "lucide-react";
import type { Product } from "@/types/product";

export interface AskQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export function AskQuestionModal({
  isOpen,
  onClose,
  product,
}: AskQuestionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    `Hello, I would like to inquire about "${product.name}" (SKU: ${product.sku || product.id}).`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
      }, 2500);
    }, 800);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white p-6 sm:p-8 shadow-2xl border border-[#E5E5E5] text-left"
      >
        <button
          onClick={onClose}
          aria-label="Close question dialog"
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-black transition"
        >
          <X className="h-5 w-5" />
        </button>

        <h3
          id="ask-modal-title"
          className="font-serif text-2xl font-normal text-[#111111] border-b border-[#EEEEEE] pb-3"
        >
          Ask a Specialist
        </h3>

        <p className="mt-2 text-xs sm:text-sm text-[#666666]">
          Have questions regarding <strong>{product.name}</strong>, diamond certification, custom sizing, or styling advice? Our master jewellers are here to assist.
        </p>

        {isSubmitted ? (
          <div className="my-8 flex flex-col items-center justify-center text-center py-6 bg-[#FAFAF8] border border-[#EFEFE8]">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-2" />
            <h4 className="text-base font-medium text-[#111111]">Inquiry Received</h4>
            <p className="mt-1 text-xs text-[#666666] max-w-xs">
              Thank you, {name}. A PERALAGAE jewellery consultant will reach out via {email} within 4 business hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="inquiry-name" className="block text-xs font-medium uppercase tracking-wider text-[#333333]">
                Your Name *
              </label>
              <input
                id="inquiry-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Radhika Sharma"
                className="mt-1.5 w-full border border-[#D9D9D9] px-3.5 py-2.5 text-sm text-[#111111] placeholder-[#999999] focus:border-black focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="inquiry-email" className="block text-xs font-medium uppercase tracking-wider text-[#333333]">
                  Email Address *
                </label>
                <input
                  id="inquiry-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1.5 w-full border border-[#D9D9D9] px-3.5 py-2.5 text-sm text-[#111111] placeholder-[#999999] focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="inquiry-phone" className="block text-xs font-medium uppercase tracking-wider text-[#333333]">
                  Phone (Optional)
                </label>
                <input
                  id="inquiry-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1.5 w-full border border-[#D9D9D9] px-3.5 py-2.5 text-sm text-[#111111] placeholder-[#999999] focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="inquiry-msg" className="block text-xs font-medium uppercase tracking-wider text-[#333333]">
                Your Question *
              </label>
              <textarea
                id="inquiry-msg"
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1.5 w-full border border-[#D9D9D9] p-3 text-sm text-[#111111] focus:border-black focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-medium text-[#666666] hover:text-[#C5A572] transition uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 bg-[#111111] px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-all duration-200 hover:bg-[#C5A572] active:bg-[#B3935F] disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
              >
                {isSubmitting ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <span>Submit Inquiry</span>
                    <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
