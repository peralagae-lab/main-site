"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/services/faq-service";

export interface FaqSectionProps {
  initialFaqs?: FaqItem[];
}

export function FaqSection({ initialFaqs = [] }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Strictly enforce maximum 5 questions
  const faqs = initialFaqs.slice(0, 5);

  // If no FAQ records exist, hide the section entirely
  if (faqs.length === 0) {
    return null;
  }

  const toggleItem = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      id="faqs"
      aria-labelledby="faq-heading"
      className="w-full bg-[#FAF9F6] py-16 sm:py-20 lg:py-24 border-t border-neutral-200/70"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-[#C5A572] uppercase mb-3">
            Client Assistance
          </p>
          <h2
            id="faq-heading"
            className="font-serif text-2xl sm:text-3xl lg:text-4xl text-neutral-900 font-normal tracking-tight"
          >
            Frequently Asked Questions
          </h2>
          <div className="w-12 h-px bg-[#C5A572] mx-auto mt-4" />
        </div>

        {/* Accordion list */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const itemId = `faq-item-${faq.id || index}`;
            const headerId = `faq-header-${faq.id || index}`;

            return (
              <div
                key={faq.id || index}
                className={`border rounded-sm transition-colors duration-200 bg-white ${
                  isOpen
                    ? "border-[#C5A572] shadow-sm"
                    : "border-neutral-200 hover:border-[#C5A572]/60"
                }`}
              >
                <button
                  type="button"
                  id={headerId}
                  aria-expanded={isOpen}
                  aria-controls={itemId}
                  onClick={() => toggleItem(index)}
                  className="w-full flex items-center justify-between text-left px-5 sm:px-6 py-4 sm:py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] group"
                >
                  <span className="font-serif text-base sm:text-lg text-neutral-900 group-hover:text-[#C5A572] transition-colors pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-neutral-500 shrink-0 transition-transform duration-300 group-hover:text-[#C5A572] ${
                      isOpen ? "rotate-180 text-[#C5A572]" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div
                    id={itemId}
                    role="region"
                    aria-labelledby={headerId}
                    className="px-5 sm:px-6 pb-5 pt-1 text-sm sm:text-base text-neutral-600 leading-relaxed border-t border-neutral-100"
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

