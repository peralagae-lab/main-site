"use client";

import { useState, useEffect } from "react";
import type { NavbarSettingsData } from "@/types/navbar";
import {
  fetchPublicNavbarSettings,
  NAVBAR_SETTINGS_UPDATED_EVENT,
} from "@/services/navbar-settings-service";

/**
 * Prerender-safe hook for storefront navbar settings.
 *
 * Avoids evaluating unstable Date.now() / clocks during Next.js SSR/prerender passes.
 * Uses initial baseline during prerendering, then asynchronously syncs latest published
 * settings inside useEffect on the client.
 */
export function useNavbarSettings(initialData?: NavbarSettingsData | null) {
  const [data, setData] = useState<NavbarSettingsData | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setIsLoading(false);
      setIsError(false);
    }
  }, [initialData]);

  useEffect(() => {
    let isMounted = true;

    async function load(isBackground = false) {
      if (!isBackground && !data) {
        setIsLoading(true);
      }
      try {
        const settings = await fetchPublicNavbarSettings();
        if (isMounted) {
          if (settings) {
            setData(settings);
            setIsError(false);
          } else if (!data) {
            setIsError(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          if (!data) setIsError(true);
          console.warn("Could not retrieve authoritative navbar settings from database:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load(Boolean(initialData));

    const handleSync = (e?: Event) => {
      const customEvent = e as CustomEvent<NavbarSettingsData> | undefined;
      if (customEvent?.detail) {
        setData(customEvent.detail);
        setIsError(false);
        setIsLoading(false);
      }
      load(true);
    };

    window.addEventListener("focus", handleSync);
    window.addEventListener(NAVBAR_SETTINGS_UPDATED_EVENT, handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleSync);
      window.removeEventListener(NAVBAR_SETTINGS_UPDATED_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  return { data, isLoading, isError };
}
