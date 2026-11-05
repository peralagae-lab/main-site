"use client";

import React, { useState, useEffect } from "react";
import { Mail, Phone, MessageCircle } from "lucide-react";
import {
  fetchPublicStoreDetails,
  STORE_DETAILS_UPDATED_EVENT,
} from "@/services/store-details-service";

export interface ContactDetailsProps {
  email?: string;
  phone?: string;
}

/**
 * ContactDetails Component — PERALAGAE
 *
 * Implements the minimal, elegant left column of the Contact page:
 * - Eyebrow: GET IN TOUCH in subtle champagne gold
 * - Heading: How Can We Help?
 * - Short luxury intro description
 * - Strictly TWO authentic, compact contact methods:
 *   1. Email (mailto: link)
 *   2. Phone / WhatsApp (tel: and WhatsApp link)
 *
 * Automatically and dynamically synchronizes with the store details
 * configured in the website footer.
 */
export function ContactDetails({
  email: initialEmail,
  phone: initialPhone,
}: ContactDetailsProps) {
  const [currentEmail, setCurrentEmail] = useState<string>(initialEmail || "");
  const [currentPhone, setCurrentPhone] = useState<string>(initialPhone || "");

  useEffect(() => {
    let isMounted = true;

    const loadStoreDetails = async () => {
      try {
        const data = await fetchPublicStoreDetails();
        if (isMounted && data) {
          if (data.email) setCurrentEmail(data.email);
          if (data.phone) setCurrentPhone(data.phone);
        }
      } catch {
        // Keep fallback
      }
    };

    if (!initialEmail || !initialPhone) {
      loadStoreDetails();
    }

    const handleUpdate = () => {
      loadStoreDetails();
    };

    window.addEventListener(STORE_DETAILS_UPDATED_EVENT, handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener(STORE_DETAILS_UPDATED_EVENT, handleUpdate);
    };
  }, [initialEmail, initialPhone]);

  // Synchronize when props update
  useEffect(() => {
    if (initialEmail) setCurrentEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (initialPhone) setCurrentPhone(initialPhone);
  }, [initialPhone]);

  const activeEmail = currentEmail || "contact@peralagae.com";
  const activePhone = currentPhone || "+91 98765 43210";

  // Extract pure phone digits for WhatsApp link (e.g. 919876543210)
  const digitsOnly = activePhone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${digitsOnly}?text=Hello%20PERALAGAE%20Jewellery`;
  const telDigits = activePhone.replace(/[^\d+]/g, "");
  const telHref = telDigits ? `tel:${telDigits}` : `tel:${activePhone.replace(/\s+/g, "")}`;

  return (
    <div className="flex flex-col justify-start lg:pr-8 space-y-6">
      {/* Eyebrow & Main Headings */}
      <div>
        <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] text-[#C5A572] uppercase block mb-2">
          GET IN TOUCH
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-serif font-normal text-[#111111] tracking-tight leading-snug">
          How Can We Help?
        </h2>
        <p className="mt-3 text-sm sm:text-[15px] text-[#666666] font-light leading-relaxed max-w-md">
          Have a question about a piece, a custom order, or your purchase? We&apos;d love to hear from you.
        </p>
      </div>

      {/* Understated Divider */}
      <hr className="border-t border-[#EBEBEB] w-16" aria-hidden="true" />

      {/* Two Minimal Contact Details */}
      <div className="space-y-5 pt-1">
        {/* 1. Email */}
        <div className="flex items-start gap-3.5 group">
          <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#FAF9F5] text-[#C5A572] transition-colors group-hover:bg-[#C5A572]/15">
            <Mail className="h-4 w-4 stroke-[1.4]" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider font-medium text-[#888888]">
              Email
            </span>
            <a
              href={`mailto:${activeEmail}`}
              className="text-sm sm:text-base font-normal text-[#111111] hover:text-[#C5A572] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] rounded-sm"
            >
              {activeEmail}
            </a>
          </div>
        </div>

        {/* 2. Phone / WhatsApp */}
        <div className="flex items-start gap-3.5 group">
          <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#FAF9F5] text-[#C5A572] transition-colors group-hover:bg-[#C5A572]/15">
            <Phone className="h-4 w-4 stroke-[1.4]" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider font-medium text-[#888888]">
              Phone / WhatsApp
            </span>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-0.5">
              <a
                href={telHref}
                className="text-sm sm:text-base font-normal text-[#111111] hover:text-[#C5A572] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] rounded-sm"
              >
                {activePhone}
              </a>
              <span className="text-[#CCCCCC] text-xs" aria-hidden="true">
                |
              </span>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#C5A572] hover:text-[#111111] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572] rounded-sm"
              >
                <MessageCircle className="h-3.5 w-3.5 stroke-[1.4]" aria-hidden="true" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
