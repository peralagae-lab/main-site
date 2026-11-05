"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImage } from "@/types/product";

export interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: ProductImage[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  productName: string;
}

export function ImageLightboxModal({
  isOpen,
  onClose,
  images,
  currentIndex,
  onSelectIndex,
  productName,
}: ImageLightboxModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        onSelectIndex((currentIndex - 1 + images.length) % images.length);
      } else if (e.key === "ArrowRight") {
        onSelectIndex((currentIndex + 1) % images.length);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose, currentIndex, images.length, onSelectIndex]);

  if (!isOpen || !mounted) return null;

  const currentImage = images[currentIndex] || images[0];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Expanded image view: ${productName}`}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-black/90 p-4 sm:p-6 backdrop-blur-md animate-fade-in"
    >
      {/* Top Header */}
      <div className="flex w-full items-center justify-between text-white py-2">
        <span className="text-xs sm:text-sm font-light tracking-widest uppercase text-neutral-300">
          {productName} • {currentIndex + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          aria-label="Close enlarged view"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Large Image Container */}
      <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-auto">
        {images.length > 1 && (
          <button
            onClick={() => onSelectIndex((currentIndex - 1 + images.length) % images.length)}
            aria-label="Previous image"
            className="absolute left-2 sm:left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition-all duration-200 hover:bg-[#C5A572] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div className="relative w-full h-[65vh] sm:h-[72vh] flex items-center justify-center">
          <Image
            src={currentImage.src}
            alt={currentImage.alt || productName}
            fill
            sizes="(max-width: 1200px) 100vw, 1200px"
            className="object-contain"
            priority
          />
        </div>

        {images.length > 1 && (
          <button
            onClick={() => onSelectIndex((currentIndex + 1) % images.length)}
            aria-label="Next image"
            className="absolute right-2 sm:right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition-all duration-200 hover:bg-[#C5A572] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] cursor-pointer"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex items-center gap-2 sm:gap-3 py-2 overflow-x-auto max-w-full">
          {images.map((img, idx) => (
            <button
              key={`${img.src}-${idx}`}
              onClick={() => onSelectIndex(idx)}
              aria-label={`View image view ${idx + 1}`}
              className={`relative h-14 w-14 sm:h-16 sm:w-16 flex-none overflow-hidden rounded border transition-all ${
                idx === currentIndex
                  ? "border-[#C5A572] ring-2 ring-[#C5A572]/50 opacity-100 scale-105"
                  : "border-white/20 opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={img.src}
                alt={img.alt || `Thumbnail ${idx + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
