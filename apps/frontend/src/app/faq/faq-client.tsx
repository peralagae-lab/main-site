"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/services/faq-service";

export interface FaqClientProps {
  initialFaqs: FaqItem[];
}

export function FaqClient({ initialFaqs }: FaqClientProps) {
  // Strictly display only the database-backed questions (max 5)
  const faqs = initialFaqs.slice(0, 5);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  if (faqs.length === 0) {
    return (
      <div className="py-16 text-center text-neutral-500 font-jost">
        <p className="text-base">No questions currently available.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 font-jost">
      <div className="space-y-3 sm:space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          const itemId = `faq-item-${faq.id || index}`;
          const headerId = `faq-header-${faq.id || index}`;

          return (
            <div
              key={faq.id || index}
              className={`border rounded transition-all duration-200 bg-white ${
                isOpen
                  ? "border-[#C5A572] shadow-sm"
                  : "border-neutral-200 hover:border-[#C5A572]"
              }`}
            >
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={itemId}
                onClick={() => toggleItem(index)}
                className="w-full flex items-center justify-between text-left p-4 sm:p-5 lg:p-6 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] group cursor-pointer"
              >
                <span className="font-jost text-base sm:text-lg font-medium text-neutral-900 group-hover:text-[#C5A572] transition-colors pr-4 leading-snug">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-neutral-400 shrink-0 transition-transform duration-300 group-hover:text-[#C5A572] ${
                    isOpen ? "rotate-180 text-[#C5A572]" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div
                  id={itemId}
                  role="region"
                  aria-labelledby={headerId}
                  className="px-4 sm:px-5 lg:px-6 pb-5 sm:pb-6 pt-1 text-sm sm:text-base text-neutral-600 leading-relaxed font-jost border-t border-neutral-100"
                >
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
