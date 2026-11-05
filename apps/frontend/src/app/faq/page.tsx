import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { brandConfig } from "@/config/brand";
import { fetchPublicFaqs } from "@/services/faq-service";
import { FaqClient } from "./faq-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Frequently Asked Questions | ${brandConfig.name}`,
  description:
    "Find answers to common questions regarding PERALAGAE fine jewellery, authentic BIS hallmarking, orders, shipping, and care.",
};

export default async function FaqPage() {
  const faqs = await fetchPublicFaqs();

  return (
    <main className="w-full min-h-screen bg-white">
      {/* Page Title & Breadcrumb Banner matching Contact and Wishlist */}
      <section
        data-testid="faq-hero-banner"
        aria-label="FAQ Title and Breadcrumb"
        className="w-full bg-[#F5F5F5] border-b border-[#EBEBEB] py-10 sm:py-14 text-center"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center justify-center space-x-2 text-xs text-neutral-500 uppercase tracking-widest mb-3 font-jost"
          >
            <Link
              href="/"
              className="text-neutral-500 hover:text-[#C5A572] transition-colors"
            >
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
            <span className="text-neutral-900 font-medium" aria-current="page">
              FAQs
            </span>
          </nav>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-neutral-900 font-jost">
            Frequently Asked Questions
          </h1>
        </div>
      </section>

      {/* Questions List */}
      <FaqClient initialFaqs={faqs} />
    </main>
  );
}
