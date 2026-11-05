"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { brandConfig } from "@/config/brand";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Root Error Boundary — PERALAGAE Luxury E-commerce
 *
 * Displays a luxury branded error screen with recovery options when an unexpected
 * runtime or database connectivity error occurs, avoiding raw crashes or silent failures.
 */
export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    // Log error securely to console without leaking sensitive credentials
    console.error("[PERALAGAE Storefront Error Boundary]", error.message);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 bg-white text-[#111111] font-jost text-center">
      <div className="w-16 h-16 rounded-full bg-[#FFF9F2] border border-[#F3E5D8] flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-[#C5A572]" />
      </div>

      <span className="text-xs uppercase tracking-[0.2em] text-[#C5A572] font-semibold mb-2">
        {brandConfig.name} Atelier
      </span>

      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-[#111111] font-normal mb-4 max-w-lg">
        Something Unexpected Occurred
      </h1>

      <p className="text-sm text-[#666666] max-w-md mb-8 leading-relaxed">
        We encountered a temporary issue while retrieving your luxury fine jewellery collection.
        Please try refreshing the connection or return to our homepage.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#111111] text-white text-xs uppercase tracking-widest hover:bg-[#C5A572] active:bg-[#B3935F] transition-all duration-200 min-w-[160px] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#111111] text-[#111111] text-xs uppercase tracking-widest hover:border-[#C5A572] hover:bg-[#C5A572] hover:text-white active:bg-[#B3935F] transition-all duration-200 min-w-[160px] cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          Home
        </Link>
      </div>

      {process.env.NODE_ENV !== "production" && error.message && (
        <div className="mt-8 p-4 bg-neutral-50 border border-neutral-200 text-left max-w-lg text-xs font-mono text-neutral-600 overflow-x-auto rounded">
          <p className="font-semibold text-neutral-800 mb-1">Development Diagnostics:</p>
          <p>{error.message}</p>
        </div>
      )}
    </div>
  );
}
