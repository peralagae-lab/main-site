"use client";

import React, { useState, useEffect } from "react";
import { ContactHero } from "./contact-hero";
import { ContactDetails } from "./contact-details";
import { ContactForm } from "./contact-form";
import type { StoreDetailsData } from "@/types/store-details";
import {
  fetchPublicStoreDetails,
  STORE_DETAILS_UPDATED_EVENT,
} from "@/services/store-details-service";

export interface ContactPageContentProps {
  initialStoreDetails?: StoreDetailsData | null;
}

/**
 * ContactPageContent Component — PERALAGAE
 *
 * Implements the minimal, royal luxury contact page:
 * 1. Wide jewellery background hero banner matching Shop & Wishlist styles
 * 2. Balanced two-column layout:
 *    - Left: Understated introduction & dynamic contact details (Email, Phone/WhatsApp)
 *            synchronized directly from the single source of truth (Footer / Store Details).
 *    - Right: Refined, clean contact form with field-specific validation that persists
 *            enquiries directly to the production database.
 */
export function ContactPageContent({ initialStoreDetails }: ContactPageContentProps) {
  const [storeDetails, setStoreDetails] = useState<StoreDetailsData | null>(
    initialStoreDetails ?? null
  );

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const data = await fetchPublicStoreDetails();
        if (isMounted && data) {
          setStoreDetails(data);
        }
      } catch {
        // Maintain initial state
      }
    };

    if (!initialStoreDetails) {
      loadData();
    }

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener(STORE_DETAILS_UPDATED_EVENT, handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener(STORE_DETAILS_UPDATED_EVENT, handleUpdate);
    };
  }, [initialStoreDetails]);

  return (
    <main className="w-full min-h-screen bg-white">
      {/* 1. Luxury Inner-Page Title Banner */}
      <ContactHero />

      {/* 2. Main Two-Column Contact Section */}
      <section
        aria-label="Contact Information and Enquiry Form"
        className="w-full bg-white py-14 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column: Essential details & introduction */}
            <div className="lg:col-span-5">
              <ContactDetails
                email={storeDetails?.email}
                phone={storeDetails?.phone}
              />
            </div>

            {/* Right Column: Refined contact form */}
            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
