"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { MorphingText } from "@/components/ui/morphing-text";

export interface LuxuryPreloaderProps {
  /**
   * Source for the animated intro preloader GIF.
   * Defaults to "/images/preloader/peralagae-intro.gif".
   */
  gifSrc?: string;
  /**
   * Presentation variant:
   * - "gif" (default): High-definition animated brand intro GIF ("PERALAGE ontro gif (1).gif").
   * - "morphing": Liquid morphing text.
   */
  variant?: "gif" | "morphing";
  /**
   * Time in seconds to display the preloader GIF before starting dissolve exit.
   * Defaults to 3.5s (giving full view of the animated calligraphy flourish settling).
   */
  duration?: number;
  /**
   * Words to morph through in order when using variant="morphing".
   */
  texts?: string[];
  /**
   * Visual theme for the preloader.
   * - "light" (default): Pure white #FFFFFF matching the intro GIF seamlessly.
   * - "dark": Pitch black #000000.
   */
  theme?: "dark" | "light";
  /**
   * Time in seconds for the liquid morph between words (morphing variant).
   */
  morphTime?: number;
  /**
   * Time in seconds to hold the final word (morphing variant).
   */
  cooldownTime?: number;
  /**
   * Time in seconds to hold the initial word (morphing variant).
   */
  initialCooldown?: number;
  /**
   * Optional callback fired when the exit animation completes and the preloader is unmounted.
   */
  onComplete?: () => void;
}

const PRELOADER_TEXTS = ["Peralagae", "Jewellery"];
const DEFAULT_GIF_SRC = "/images/preloader/peralagae-intro.gif";

/**
 * Luxury Preloader for PERALAGAE.
 *
 * Displays the high-definition animated brand calligraphy intro GIF ("PERALAGE ontro gif (1).gif")
 * seamlessly centered on a luxury pure white canvas, dissolving smoothly into the storefront.
 */
export function LuxuryPreloader({
  gifSrc = DEFAULT_GIF_SRC,
  variant = "gif",
  duration = 3.5,
  texts = PRELOADER_TEXTS,
  theme = "light",
  morphTime = 0.75,
  cooldownTime = 0.6,
  initialCooldown = 0.5,
  onComplete,
}: LuxuryPreloaderProps) {
  const prefersReduced = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  const isDark = theme === "dark";
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";

  useEffect(() => {
    if (prefersReduced) {
      const reducedMotionTimer = setTimeout(() => {
        setIsVisible(false);
      }, 1200);
      return () => clearTimeout(reducedMotionTimer);
    }

    if (variant === "gif") {
      const gifTimer = setTimeout(() => {
        setIsVisible(false);
      }, duration * 1000);
      return () => clearTimeout(gifTimer);
    }

    // Morphing fallback safety timer
    const safetyTimeoutMs = (initialCooldown + morphTime + cooldownTime + 2.5) * 1000;
    const safetyTimer = setTimeout(() => {
      setIsVisible(false);
    }, safetyTimeoutMs);

    return () => {
      clearTimeout(safetyTimer);
    };
  }, [prefersReduced, variant, duration, initialCooldown, morphTime, cooldownTime]);

  if (isFinished) {
    return null;
  }

  const handleSequenceComplete = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence
      onExitComplete={() => {
        setIsFinished(true);
        onComplete?.();
      }}
    >
      {isVisible && (
        <motion.div
          key="peralagae-preloader-overlay"
          role="status"
          aria-label="PERALAGAE"
          aria-live="polite"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: {
              duration: prefersReduced ? 0.25 : 0.45,
              ease: [0.22, 1, 0.36, 1],
            },
          }}
          className={`fixed inset-0 h-screen h-[100dvh] w-screen w-[100dvw] z-[9999] flex items-center justify-center select-none overflow-hidden px-4 sm:px-6 md:px-8 ${
            isDark ? "bg-black text-white" : "bg-white text-black"
          }`}
          style={{
            backgroundColor: bgColor,
            color: textColor,
          }}
        >
          {prefersReduced ? (
            <div
              className="text-center font-sans font-normal tracking-normal select-none px-4"
              style={{
                fontSize: "clamp(1.75rem, 6vw, 4rem)",
                color: textColor,
                fontFamily:
                  'var(--font-inter), var(--font-geist-sans), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 400,
                letterSpacing: "normal",
              }}
            >
              PERALAGAE
            </div>
          ) : variant === "gif" ? (
            <div className="relative flex items-center justify-center w-full max-w-[340px] sm:max-w-[480px] md:max-w-[620px] lg:max-w-[720px] px-4 pointer-events-none">
              <Image
                src={gifSrc}
                alt="PERALAGAE"
                width={1920}
                height={1080}
                priority
                unoptimized
                data-testid="peralagae-intro-gif"
                className="w-full h-auto object-contain select-none pointer-events-none drop-shadow-none"
              />
              <span className="sr-only">PERALAGAE</span>
            </div>
          ) : (
            <MorphingText
              texts={texts}
              loop={false}
              morphTime={morphTime}
              cooldownTime={cooldownTime}
              initialCooldown={initialCooldown}
              onComplete={handleSequenceComplete}
              className={isDark ? "text-white" : "text-black"}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LuxuryPreloader;
