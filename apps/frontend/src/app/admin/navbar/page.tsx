"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  RotateCcw,
  Clock,
  History,
  Check,
  Upload,
  Info,
  ImageIcon,
} from "lucide-react";
import { getAdminSession, logoutAdmin } from "@/services/admin-auth-service";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import {
  fetchAdminNavbarSettings,
  updateAdminTopBar,
  updateAdminSecondNavbar,
  fetchAdminNavbarHistory,
  restoreAdminNavbarVersion,
} from "@/services/navbar-admin-service";
import {
  NAVBAR_SETTINGS_QUERY_KEY,
  NAVBAR_SETTINGS_UPDATED_EVENT,
} from "@/services/navbar-settings-service";
import {
  fetchAdminHeroSettings,
  updateAdminHeroSlot,
  uploadAdminHeroImage,
  fetchAdminHeroHistory,
  restoreAdminHeroSlot,
} from "@/services/hero-admin-service";
import {
  HERO_SETTINGS_QUERY_KEY,
  HERO_SETTINGS_UPDATED_EVENT,
} from "@/services/hero-settings-service";
import type {
  NavbarSettingsData,
  NavbarHistoryItem,
  TopBarConfig,
} from "@/types/navbar";
import {
  defaultHeroSettingsData,
  HERO_SLOT_SPECS,
  type HeroSettingsData,
  type HeroHistoryItem,
} from "@/types/hero";
import {
  fetchPublicCategories,
  CATEGORIES_UPDATED_EVENT,
} from "@/services/category-public-service";
import type { CategoryItem } from "@/types/category";

function formatCategoryDisplayName(name: string): string {
  if (name === name.toUpperCase()) {
    return name
      .toLowerCase()
      .split(" ")
      .map((word) => {
        if (word === "&") return "&";
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }
  return name;
}

const formatCategoryLabel = formatCategoryDisplayName;

type TabKey =
  | "top_bar"
  | "second_navbar"
  | "hero_image_1"
  | "hero_image_2"
  | "hero_image_3";

interface HeroSlotForm1 {
  imageUrl: string;
  imageAlt: string;
  normalHeadline: string;
  boldHeadline: string;
  description: string;
  categoryId?: string | null;
}

interface HeroSlotFormSecondary {
  imageUrl: string;
  imageAlt: string;
  normalHeadline: string;
  boldHeadline: string;
  categoryId?: string | null;
}

export default function AdminNavbarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Authentication & Layout state
  const [isVerifying, setIsVerifying] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Active Tab: Navbar (Top Bar, Second Navbar) or Hero Section (Hero Image 1, 2, 3)
  const [activeTab, setActiveTab] = useState<TabKey>("top_bar");

  // Server Data state for Navbar
  const [serverSettings, setServerSettings] = useState<NavbarSettingsData | null>(null);
  const [topBarHistory, setTopBarHistory] = useState<NavbarHistoryItem[]>([]);
  const [secondNavbarHistory, setSecondNavbarHistory] = useState<NavbarHistoryItem[]>([]);

  // Server Data state for Hero Section
  const [serverHeroSettings, setServerHeroSettings] = useState<HeroSettingsData>(defaultHeroSettingsData);
  const [hero1History, setHero1History] = useState<HeroHistoryItem[]>([]);
  const [hero2History, setHero2History] = useState<HeroHistoryItem[]>([]);
  const [hero3History, setHero3History] = useState<HeroHistoryItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Top Bar Form State
  const [topBarForm, setTopBarForm] = useState<TopBarConfig>({
    text: "",
    backgroundColor: "#FBC0CE",
    textColor: "#222222",
    visible: true,
    dismissible: true,
  });

  // Second Navbar Form State — Promotional Message Only
  const [secondNavbarPromo, setSecondNavbarPromo] = useState("");

  // Hero Section Form States for the 3 slots
  const [hero1Form, setHero1Form] = useState<HeroSlotForm1>({
    imageUrl: defaultHeroSettingsData.heroImage1.imageUrl,
    imageAlt: defaultHeroSettingsData.heroImage1.imageAlt,
    normalHeadline: defaultHeroSettingsData.heroImage1.normalHeadline,
    boldHeadline: defaultHeroSettingsData.heroImage1.boldHeadline,
    description: defaultHeroSettingsData.heroImage1.description,
    categoryId: defaultHeroSettingsData.heroImage1.categoryId ?? null,
  });

  const [hero2Form, setHero2Form] = useState<HeroSlotFormSecondary>({
    imageUrl: defaultHeroSettingsData.heroImage2.imageUrl,
    imageAlt: defaultHeroSettingsData.heroImage2.imageAlt,
    normalHeadline: defaultHeroSettingsData.heroImage2.normalHeadline,
    boldHeadline: defaultHeroSettingsData.heroImage2.boldHeadline,
    categoryId: defaultHeroSettingsData.heroImage2.categoryId ?? null,
  });

  const [hero3Form, setHero3Form] = useState<HeroSlotFormSecondary>({
    imageUrl: defaultHeroSettingsData.heroImage3.imageUrl,
    imageAlt: defaultHeroSettingsData.heroImage3.imageAlt,
    normalHeadline: defaultHeroSettingsData.heroImage3.normalHeadline,
    boldHeadline: defaultHeroSettingsData.heroImage3.boldHeadline,
    categoryId: defaultHeroSettingsData.heroImage3.categoryId ?? null,
  });

  // Hero Image file upload & local preview states
  const [heroPendingFiles, setHeroPendingFiles] = useState<{
    heroImage1?: File;
    heroImage2?: File;
    heroImage3?: File;
  }>({});

  const [heroPreviewUrls, setHeroPreviewUrls] = useState<{
    heroImage1?: string;
    heroImage2?: string;
    heroImage3?: string;
  }>({});

  const [heroSlotErrors, setHeroSlotErrors] = useState<{
    heroImage1?: string;
    heroImage2?: string;
    heroImage3?: string;
  }>({});

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);

  // Navbar Restore Modal State
  const [restoreConfirmTarget, setRestoreConfirmTarget] = useState<{
    item: NavbarHistoryItem;
    section: "top_bar" | "second_navbar";
  } | null>(null);

  // Hero Restore Modal State
  const [heroRestoreConfirmTarget, setHeroRestoreConfirmTarget] = useState<{
    item: HeroHistoryItem;
    slotId: "heroImage1" | "heroImage2" | "heroImage3";
    slotName: string;
  } | null>(null);

  const [isRestoring, setIsRestoring] = useState(false);

  // Verify authentication on mount
  useEffect(() => {
    let isMounted = true;
    async function verifyAuth() {
      try {
        await getAdminSession();
        if (isMounted) setIsVerifying(false);
      } catch {
        if (isMounted) router.replace("/?auth=login");
      }
    }
    verifyAuth();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Load both Navbar and Hero settings and histories
  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      try {
        const [navbarSettings, topHistory, secondHistory] = await Promise.all([
          fetchAdminNavbarSettings(),
          fetchAdminNavbarHistory("top_bar"),
          fetchAdminNavbarHistory("second_navbar"),
        ]);

        setServerSettings(navbarSettings);
        setTopBarHistory(topHistory);
        setSecondNavbarHistory(secondHistory);
        setTopBarForm({ ...navbarSettings.topBar });
        setSecondNavbarPromo(navbarSettings.secondNavbar.promoText);
      } catch (navErr) {
        console.error("Navbar load error:", navErr);
      }

      try {
        const [heroSettings, h1History, h2History, h3History, fetchedCategories] = await Promise.all([
          fetchAdminHeroSettings(),
          fetchAdminHeroHistory("heroImage1"),
          fetchAdminHeroHistory("heroImage2"),
          fetchAdminHeroHistory("heroImage3"),
          fetchPublicCategories(),
        ]);

        setServerHeroSettings(heroSettings);
        setHero1History(h1History);
        setHero2History(h2History);
        setHero3History(h3History);
        setCategories(fetchedCategories || []);

        setHero1Form({
          imageUrl: heroSettings.heroImage1.imageUrl,
          imageAlt: heroSettings.heroImage1.imageAlt,
          normalHeadline: heroSettings.heroImage1.normalHeadline,
          boldHeadline: heroSettings.heroImage1.boldHeadline,
          description: heroSettings.heroImage1.description,
          categoryId: heroSettings.heroImage1.categoryId ?? null,
        });

        setHero2Form({
          imageUrl: heroSettings.heroImage2.imageUrl,
          imageAlt: heroSettings.heroImage2.imageAlt,
          normalHeadline: heroSettings.heroImage2.normalHeadline,
          boldHeadline: heroSettings.heroImage2.boldHeadline,
          categoryId: heroSettings.heroImage2.categoryId ?? null,
        });

        setHero3Form({
          imageUrl: heroSettings.heroImage3.imageUrl,
          imageAlt: heroSettings.heroImage3.imageAlt,
          normalHeadline: heroSettings.heroImage3.normalHeadline,
          boldHeadline: heroSettings.heroImage3.boldHeadline,
          categoryId: heroSettings.heroImage3.categoryId ?? null,
        });
      } catch (heroErr) {
        console.error("Hero load error:", heroErr);
      }

      // Clear pending uploads
      setHeroPendingFiles({});
      setHeroPreviewUrls({});
      setHeroSlotErrors({});
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load management settings",
      });
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!isVerifying) {
      loadData();
    }
  }, [isVerifying, loadData]);

  // Listen for category updates across admin sessions
  useEffect(() => {
    const handleCategoriesSync = async () => {
      try {
        const cats = await fetchPublicCategories();
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
      } catch (err) {
        console.warn("Failed to sync categories:", err);
      }
    };
    window.addEventListener(CATEGORIES_UPDATED_EVENT, handleCategoriesSync);
    return () => {
      window.removeEventListener(CATEGORIES_UPDATED_EVENT, handleCategoriesSync);
    };
  }, []);

  // Resolves the selected category ID for dropdowns (matches by id or slug)
  const getSelectedCategoryValue = useCallback(
    (catIdOrSlug?: string | null): string => {
      if (!catIdOrSlug) return "";
      const match = categories.find((c) => c.id === catIdOrSlug || c.slug === catIdOrSlug);
      return match ? match.id : "";
    },
    [categories]
  );

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(heroPreviewUrls).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [heroPreviewUrls]);

  // Handle Logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAdmin();
      router.replace("/?auth=login");
    } catch {
      router.replace("/?auth=login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // ─── CHANGE DETECTORS ───────────────────────────────────────────────────────
  const hasTopBarChanges = useMemo(() => {
    if (!serverSettings?.topBar) return false;
    const s = serverSettings.topBar;
    return (
      topBarForm.text !== s.text ||
      topBarForm.backgroundColor !== s.backgroundColor ||
      topBarForm.textColor !== s.textColor ||
      topBarForm.visible !== s.visible ||
      topBarForm.dismissible !== s.dismissible
    );
  }, [serverSettings, topBarForm]);

  const hasSecondNavbarChanges = useMemo(() => {
    if (!serverSettings?.secondNavbar) return false;
    return secondNavbarPromo !== serverSettings.secondNavbar.promoText;
  }, [serverSettings, secondNavbarPromo]);

  const hasHero1Changes = useMemo(() => {
    if (heroPendingFiles.heroImage1) return true;
    const s = serverHeroSettings.heroImage1;
    const currentCat = hero1Form.categoryId || null;
    const serverCat = s.categoryId || null;
    return (
      hero1Form.normalHeadline !== s.normalHeadline ||
      hero1Form.boldHeadline !== s.boldHeadline ||
      hero1Form.description !== s.description ||
      currentCat !== serverCat
    );
  }, [serverHeroSettings.heroImage1, hero1Form, heroPendingFiles.heroImage1]);

  const hasHero2Changes = useMemo(() => {
    if (heroPendingFiles.heroImage2) return true;
    const s = serverHeroSettings.heroImage2;
    const currentCat = hero2Form.categoryId || null;
    const serverCat = s.categoryId || null;
    return (
      hero2Form.normalHeadline !== s.normalHeadline ||
      hero2Form.boldHeadline !== s.boldHeadline ||
      currentCat !== serverCat
    );
  }, [serverHeroSettings.heroImage2, hero2Form, heroPendingFiles.heroImage2]);

  const hasHero3Changes = useMemo(() => {
    if (heroPendingFiles.heroImage3) return true;
    const s = serverHeroSettings.heroImage3;
    const currentCat = hero3Form.categoryId || null;
    const serverCat = s.categoryId || null;
    return (
      hero3Form.normalHeadline !== s.normalHeadline ||
      hero3Form.boldHeadline !== s.boldHeadline ||
      currentCat !== serverCat
    );
  }, [serverHeroSettings.heroImage3, hero3Form, heroPendingFiles.heroImage3]);

  // ─── TOP BAR ACTIONS ────────────────────────────────────────────────────────
  const handleCancelTopBar = () => {
    if (serverSettings?.topBar) {
      setTopBarForm({ ...serverSettings.topBar });
    }
    setStatusMessage({
      type: "info",
      text: "Top Bar changes discarded.",
    });
  };

  const handleSaveTopBar = async () => {
    if (!topBarForm.text.trim()) {
      setStatusMessage({
        type: "error",
        text: "Top Bar announcement text is required.",
      });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updated = await updateAdminTopBar({
        text: topBarForm.text.trim(),
        backgroundColor: topBarForm.backgroundColor,
        textColor: topBarForm.textColor,
        visible: topBarForm.visible,
        dismissible: topBarForm.dismissible,
        description: `Updated Top Bar announcement (v${(serverSettings?.topBarVersion ?? 1) + 1})`,
      });

      setServerSettings(updated);
      setTopBarForm({ ...updated.topBar });

      const newHistory = await fetchAdminNavbarHistory("top_bar");
      setTopBarHistory(newHistory);

      queryClient.invalidateQueries({ queryKey: NAVBAR_SETTINGS_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(NAVBAR_SETTINGS_UPDATED_EVENT, { detail: updated })
        );
      }

      const versionLabel = updated.topBarVersion ?? updated.version;
      setStatusMessage({
        type: "success",
        text: `Top Bar published successfully as v${versionLabel}! Storefront is now synchronized.`,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to publish Top Bar changes",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── SECOND NAVBAR ACTIONS ──────────────────────────────────────────────────
  const handleCancelSecondNavbar = () => {
    if (serverSettings?.secondNavbar) {
      setSecondNavbarPromo(serverSettings.secondNavbar.promoText);
    }
    setStatusMessage({
      type: "info",
      text: "Second Navbar changes discarded.",
    });
  };

  const handleSaveSecondNavbar = async () => {
    if (!secondNavbarPromo.trim()) {
      setStatusMessage({
        type: "error",
        text: "Promotional message cannot be empty.",
      });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updated = await updateAdminSecondNavbar({
        promoText: secondNavbarPromo.trim(),
      });

      setServerSettings(updated);
      setSecondNavbarPromo(updated.secondNavbar.promoText);

      const newHistory = await fetchAdminNavbarHistory("second_navbar");
      setSecondNavbarHistory(newHistory);

      queryClient.invalidateQueries({ queryKey: NAVBAR_SETTINGS_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(NAVBAR_SETTINGS_UPDATED_EVENT, { detail: updated })
        );
      }

      const versionLabel = updated.secondNavbarVersion ?? updated.version;
      setStatusMessage({
        type: "success",
        text: `Second Navbar published successfully as v${versionLabel}! Storefront is now synchronized.`,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to publish Second Navbar changes",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── HERO FILE SELECTION & VALIDATION ───────────────────────────────────────
  const handleHeroFileSelect = (
    slotKey: "heroImage1" | "heroImage2" | "heroImage3",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setHeroSlotErrors((prev) => ({
        ...prev,
        [slotKey]: "Invalid file format. Please upload a JPEG, PNG, or WebP image.",
      }));
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setHeroSlotErrors((prev) => ({
        ...prev,
        [slotKey]: `File size (${sizeMb}MB) exceeds the maximum 5MB limit.`,
      }));
      e.target.value = "";
      return;
    }

    setHeroSlotErrors((prev) => {
      const copy = { ...prev };
      delete copy[slotKey];
      return copy;
    });

    if (heroPreviewUrls[slotKey]?.startsWith("blob:")) {
      URL.revokeObjectURL(heroPreviewUrls[slotKey]!);
    }

    const objectUrl = URL.createObjectURL(file);
    setHeroPreviewUrls((prev) => ({ ...prev, [slotKey]: objectUrl }));
    setHeroPendingFiles((prev) => ({ ...prev, [slotKey]: file }));
  };

  // ─── HERO SLOT ACTIONS (INDEPENDENT) ────────────────────────────────────────
  const handleCancelHeroSlot = (slotKey: "heroImage1" | "heroImage2" | "heroImage3") => {
    if (heroPreviewUrls[slotKey]?.startsWith("blob:")) {
      URL.revokeObjectURL(heroPreviewUrls[slotKey]!);
    }

    setHeroPendingFiles((prev) => {
      const copy = { ...prev };
      delete copy[slotKey];
      return copy;
    });
    setHeroPreviewUrls((prev) => {
      const copy = { ...prev };
      delete copy[slotKey];
      return copy;
    });
    setHeroSlotErrors((prev) => {
      const copy = { ...prev };
      delete copy[slotKey];
      return copy;
    });

    if (slotKey === "heroImage1") {
      setHero1Form({
        imageUrl: serverHeroSettings.heroImage1.imageUrl,
        imageAlt: serverHeroSettings.heroImage1.imageAlt,
        normalHeadline: serverHeroSettings.heroImage1.normalHeadline,
        boldHeadline: serverHeroSettings.heroImage1.boldHeadline,
        description: serverHeroSettings.heroImage1.description,
        categoryId: serverHeroSettings.heroImage1.categoryId ?? null,
      });
      if (fileInputRef1.current) fileInputRef1.current.value = "";
    } else if (slotKey === "heroImage2") {
      setHero2Form({
        imageUrl: serverHeroSettings.heroImage2.imageUrl,
        imageAlt: serverHeroSettings.heroImage2.imageAlt,
        normalHeadline: serverHeroSettings.heroImage2.normalHeadline,
        boldHeadline: serverHeroSettings.heroImage2.boldHeadline,
        categoryId: serverHeroSettings.heroImage2.categoryId ?? null,
      });
      if (fileInputRef2.current) fileInputRef2.current.value = "";
    } else {
      setHero3Form({
        imageUrl: serverHeroSettings.heroImage3.imageUrl,
        imageAlt: serverHeroSettings.heroImage3.imageAlt,
        normalHeadline: serverHeroSettings.heroImage3.normalHeadline,
        boldHeadline: serverHeroSettings.heroImage3.boldHeadline,
        categoryId: serverHeroSettings.heroImage3.categoryId ?? null,
      });
      if (fileInputRef3.current) fileInputRef3.current.value = "";
    }

    setStatusMessage({
      type: "info",
      text: `${HERO_SLOT_SPECS[slotKey].name} changes reverted to current published values.`,
    });
  };

  const handleSaveHeroSlot = async (slotKey: "heroImage1" | "heroImage2" | "heroImage3") => {
    // Validate text inputs
    if (slotKey === "heroImage1") {
      if (!hero1Form.normalHeadline.trim()) {
        setStatusMessage({ type: "error", text: "Normal headline is required." });
        return;
      }
      if (!hero1Form.boldHeadline.trim()) {
        setStatusMessage({ type: "error", text: "Bold headline is required." });
        return;
      }
    } else if (slotKey === "heroImage2") {
      if (!hero2Form.normalHeadline.trim()) {
        setStatusMessage({ type: "error", text: "Normal headline is required." });
        return;
      }
      if (!hero2Form.boldHeadline.trim()) {
        setStatusMessage({ type: "error", text: "Bold headline is required." });
        return;
      }
    } else {
      if (!hero3Form.normalHeadline.trim()) {
        setStatusMessage({ type: "error", text: "Normal headline is required." });
        return;
      }
      if (!hero3Form.boldHeadline.trim()) {
        setStatusMessage({ type: "error", text: "Bold headline is required." });
        return;
      }
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      let finalImageUrl =
        slotKey === "heroImage1"
          ? hero1Form.imageUrl
          : slotKey === "heroImage2"
          ? hero2Form.imageUrl
          : hero3Form.imageUrl;

      // 1. Upload pending image if one was selected for this slot
      const pendingFile = heroPendingFiles[slotKey];
      if (pendingFile) {
        const uploadRes = await uploadAdminHeroImage(pendingFile);
        finalImageUrl = uploadRes.url;
      }

      // 2. Persist slot independently
      let payload;
      if (slotKey === "heroImage1") {
        const selectedCat = categories.find(
          (c) => c.id === hero1Form.categoryId || c.slug === hero1Form.categoryId
        );
        payload = {
          imageUrl: finalImageUrl,
          imageAlt: `${hero1Form.normalHeadline.trim()} ${hero1Form.boldHeadline.trim()} - PERALAGAE`,
          normalHeadline: hero1Form.normalHeadline.trim(),
          boldHeadline: hero1Form.boldHeadline.trim(),
          description: hero1Form.description.trim(),
          categoryId: hero1Form.categoryId || null,
          categorySlug: selectedCat ? selectedCat.slug : null,
        };
      } else if (slotKey === "heroImage2") {
        const selectedCat = categories.find(
          (c) => c.id === hero2Form.categoryId || c.slug === hero2Form.categoryId
        );
        payload = {
          imageUrl: finalImageUrl,
          imageAlt: `${hero2Form.normalHeadline.trim()} ${hero2Form.boldHeadline.trim()} - PERALAGAE`,
          normalHeadline: hero2Form.normalHeadline.trim(),
          boldHeadline: hero2Form.boldHeadline.trim(),
          categoryId: hero2Form.categoryId || null,
          categorySlug: selectedCat ? selectedCat.slug : null,
        };
      } else {
        const selectedCat = categories.find(
          (c) => c.id === hero3Form.categoryId || c.slug === hero3Form.categoryId
        );
        payload = {
          imageUrl: finalImageUrl,
          imageAlt: `${hero3Form.normalHeadline.trim()} ${hero3Form.boldHeadline.trim()} - PERALAGAE`,
          normalHeadline: hero3Form.normalHeadline.trim(),
          boldHeadline: hero3Form.boldHeadline.trim(),
          categoryId: hero3Form.categoryId || null,
          categorySlug: selectedCat ? selectedCat.slug : null,
        };
      }

      const updated = await updateAdminHeroSlot(slotKey, payload);

      // 3. Update server state
      setServerHeroSettings(updated);

      if (slotKey === "heroImage1") {
        setHero1Form({
          imageUrl: updated.heroImage1.imageUrl,
          imageAlt: updated.heroImage1.imageAlt,
          normalHeadline: updated.heroImage1.normalHeadline,
          boldHeadline: updated.heroImage1.boldHeadline,
          description: updated.heroImage1.description,
          categoryId: updated.heroImage1.categoryId ?? null,
        });
        const newHist = await fetchAdminHeroHistory("heroImage1");
        setHero1History(newHist);
      } else if (slotKey === "heroImage2") {
        setHero2Form({
          imageUrl: updated.heroImage2.imageUrl,
          imageAlt: updated.heroImage2.imageAlt,
          normalHeadline: updated.heroImage2.normalHeadline,
          boldHeadline: updated.heroImage2.boldHeadline,
          categoryId: updated.heroImage2.categoryId ?? null,
        });
        const newHist = await fetchAdminHeroHistory("heroImage2");
        setHero2History(newHist);
      } else {
        setHero3Form({
          imageUrl: updated.heroImage3.imageUrl,
          imageAlt: updated.heroImage3.imageAlt,
          normalHeadline: updated.heroImage3.normalHeadline,
          boldHeadline: updated.heroImage3.boldHeadline,
          categoryId: updated.heroImage3.categoryId ?? null,
        });
        const newHist = await fetchAdminHeroHistory("heroImage3");
        setHero3History(newHist);
      }

      // Clear pending file
      setHeroPendingFiles((prev) => {
        const copy = { ...prev };
        delete copy[slotKey];
        return copy;
      });
      setHeroPreviewUrls((prev) => {
        const copy = { ...prev };
        delete copy[slotKey];
        return copy;
      });
      setHeroSlotErrors((prev) => {
        const copy = { ...prev };
        delete copy[slotKey];
        return copy;
      });

      // Synchronize live homepage
      queryClient.invalidateQueries({ queryKey: HERO_SETTINGS_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(HERO_SETTINGS_UPDATED_EVENT, { detail: updated })
        );
      }

      const newVersion =
        slotKey === "heroImage1"
          ? updated.heroImage1Version
          : slotKey === "heroImage2"
          ? updated.heroImage2Version
          : updated.heroImage3Version;

      setStatusMessage({
        type: "success",
        text: `${HERO_SLOT_SPECS[slotKey].name} published successfully (v${newVersion}). The live homepage reflects your updates.`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : `Failed to publish ${HERO_SLOT_SPECS[slotKey].name}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── RESTORE HANDLERS ───────────────────────────────────────────────────────
  const handleExecuteNavbarRestore = async () => {
    if (!restoreConfirmTarget) return;

    setIsRestoring(true);
    setStatusMessage(null);

    try {
      const { item, section } = restoreConfirmTarget;
      const updated = await restoreAdminNavbarVersion(
        item.id,
        section
      );

      setServerSettings(updated);

      if (section === "top_bar") {
        setTopBarForm({ ...updated.topBar });
        const newHistory = await fetchAdminNavbarHistory("top_bar");
        setTopBarHistory(newHistory);
      } else {
        setSecondNavbarPromo(updated.secondNavbar.promoText);
        const newHistory = await fetchAdminNavbarHistory("second_navbar");
        setSecondNavbarHistory(newHistory);
      }

      queryClient.invalidateQueries({ queryKey: NAVBAR_SETTINGS_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(NAVBAR_SETTINGS_UPDATED_EVENT, { detail: updated })
        );
      }

      const sectionTitle = section === "top_bar" ? "Top Bar" : "Second Navbar";
      const newVer =
        section === "top_bar"
          ? (updated.topBarVersion ?? updated.version)
          : (updated.secondNavbarVersion ?? updated.version);

      setStatusMessage({
        type: "success",
        text: `Version ${item.version} of the ${sectionTitle} successfully restored and published as v${newVer}! Storefront is now synchronized.`,
      });

      setRestoreConfirmTarget(null);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to restore version snapshot",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExecuteHeroRestore = async () => {
    if (!heroRestoreConfirmTarget) return;

    setIsRestoring(true);
    setStatusMessage(null);

    const { slotId, item } = heroRestoreConfirmTarget;

    try {
      const updated = await restoreAdminHeroSlot(slotId, item.version);

      setServerHeroSettings(updated);

      if (slotId === "heroImage1") {
        setHero1Form({
          imageUrl: updated.heroImage1.imageUrl,
          imageAlt: updated.heroImage1.imageAlt,
          normalHeadline: updated.heroImage1.normalHeadline,
          boldHeadline: updated.heroImage1.boldHeadline,
          description: updated.heroImage1.description,
          categoryId: updated.heroImage1.categoryId ?? null,
        });
        const newHist = await fetchAdminHeroHistory("heroImage1");
        setHero1History(newHist);
      } else if (slotId === "heroImage2") {
        setHero2Form({
          imageUrl: updated.heroImage2.imageUrl,
          imageAlt: updated.heroImage2.imageAlt,
          normalHeadline: updated.heroImage2.normalHeadline,
          boldHeadline: updated.heroImage2.boldHeadline,
          categoryId: updated.heroImage2.categoryId ?? null,
        });
        const newHist = await fetchAdminHeroHistory("heroImage2");
        setHero2History(newHist);
      } else {
        setHero3Form({
          imageUrl: updated.heroImage3.imageUrl,
          imageAlt: updated.heroImage3.imageAlt,
          normalHeadline: updated.heroImage3.normalHeadline,
          boldHeadline: updated.heroImage3.boldHeadline,
          categoryId: updated.heroImage3.categoryId ?? null,
        });
        const newHist = await fetchAdminHeroHistory("heroImage3");
        setHero3History(newHist);
      }

      queryClient.invalidateQueries({ queryKey: HERO_SETTINGS_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(HERO_SETTINGS_UPDATED_EVENT, { detail: updated })
        );
      }

      const activeVersion =
        slotId === "heroImage1"
          ? updated.heroImage1Version
          : slotId === "heroImage2"
          ? updated.heroImage2Version
          : updated.heroImage3Version;

      setStatusMessage({
        type: "success",
        text: `${HERO_SLOT_SPECS[slotId].name} restored to historical v${item.version} (now live as v${activeVersion}). The live homepage reflects your restoration.`,
      });

      setHeroRestoreConfirmTarget(null);
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : `Failed to restore ${HERO_SLOT_SPECS[slotId].name}`,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  if (isVerifying || isLoadingData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9F9F9]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#C5A572]" />
          <p className="text-sm font-medium text-gray-600">Loading Management Dashboard...</p>
        </div>
      </div>
    );
  }

  // Active display image URLs for Hero Section
  const displayHero1Image = heroPreviewUrls.heroImage1 || hero1Form.imageUrl;
  const displayHero2Image = heroPreviewUrls.heroImage2 || hero2Form.imageUrl;
  const displayHero3Image = heroPreviewUrls.heroImage3 || hero3Form.imageUrl;

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col font-sans text-[#111111]">
      {/* Top Navigation */}
      <AdminNavbar
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      {/* Sidebar Navigation (Dashboard & Navbar only) */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 transition-all">
        {/* Page Title & Breadcrumb Header */}
        <div className="mb-5 sm:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <span>Admin</span>
              <span>/</span>
              <span className="text-gray-900 font-medium">Header Management</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111111]">
              Header Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Manage the storefront announcement bar, secondary navigation bar, and hero banners with live previews and independent version histories.
            </p>
          </div>
        </div>

        {/* Global Status Banner */}
        {statusMessage && (
          <div
            data-testid="admin-global-status-banner"
            className={`mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-lg flex items-start sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-sm transition-all duration-300 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : statusMessage.type === "error"
                ? "bg-rose-50 text-rose-800 border border-rose-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              {statusMessage.type === "success" && (
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
              )}
              {statusMessage.type === "error" && (
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
              )}
              {statusMessage.type === "info" && (
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <span className="font-medium break-words leading-relaxed">{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-gray-400 hover:text-gray-600 transition p-1 shrink-0 -mr-1 -mt-1 sm:mt-0"
            >
              &times;
            </button>
          </div>
        )}

        {/* ─── SECTION NAVIGATION & TABS ────────────────────────────────────── */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-5 shadow-sm space-y-4 mb-6">
          {/* Section A: Navbar Settings */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#C5A572]">
                Section A: Navbar Settings
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="tab-top-bar"
                onClick={() => setActiveTab("top_bar")}
                className={`px-3.5 sm:px-4 py-2 min-h-[38px] text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                  activeTab === "top_bar"
                    ? "bg-[#111111] text-white shadow-sm font-semibold"
                    : "bg-[#F5F5F5] text-[#555555] hover:bg-[#EBEBEB] hover:text-[#111111]"
                }`}
              >
                <span>Top Bar</span>
                {hasTopBarChanges && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
                )}
              </button>

              <button
                type="button"
                data-testid="tab-second-navbar"
                onClick={() => setActiveTab("second_navbar")}
                className={`px-3.5 sm:px-4 py-2 min-h-[38px] text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                  activeTab === "second_navbar"
                    ? "bg-[#111111] text-white shadow-sm font-semibold"
                    : "bg-[#F5F5F5] text-[#555555] hover:bg-[#EBEBEB] hover:text-[#111111]"
                }`}
              >
                <span>Second Navbar</span>
                {hasSecondNavbarChanges && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
                )}
              </button>
            </div>
          </div>

          <div className="border-t border-[#F0F0F0]" />

          {/* Section B: Hero Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#C5A572]">
                Section B: Hero Section
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="tab-hero-image-1"
                onClick={() => setActiveTab("hero_image_1")}
                className={`px-3.5 sm:px-4 py-2 min-h-[38px] text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                  activeTab === "hero_image_1"
                    ? "bg-[#111111] text-white shadow-sm font-semibold"
                    : "bg-[#F5F5F5] text-[#555555] hover:bg-[#EBEBEB] hover:text-[#111111]"
                }`}
              >
                <span>Hero Image 1</span>
                {hasHero1Changes && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
                )}
              </button>

              <button
                type="button"
                data-testid="tab-hero-image-2"
                onClick={() => setActiveTab("hero_image_2")}
                className={`px-3.5 sm:px-4 py-2 min-h-[38px] text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                  activeTab === "hero_image_2"
                    ? "bg-[#111111] text-white shadow-sm font-semibold"
                    : "bg-[#F5F5F5] text-[#555555] hover:bg-[#EBEBEB] hover:text-[#111111]"
                }`}
              >
                <span>Hero Image 2</span>
                {hasHero2Changes && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
                )}
              </button>

              <button
                type="button"
                data-testid="tab-hero-image-3"
                onClick={() => setActiveTab("hero_image_3")}
                className={`px-3.5 sm:px-4 py-2 min-h-[38px] text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                  activeTab === "hero_image_3"
                    ? "bg-[#111111] text-white shadow-sm font-semibold"
                    : "bg-[#F5F5F5] text-[#555555] hover:bg-[#EBEBEB] hover:text-[#111111]"
                }`}
              >
                <span>Hero Image 3</span>
                {hasHero3Changes && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ─── TAB 1: TOP BAR MANAGEMENT ───────────────────────────────────── */}
        {activeTab === "top_bar" && (
          <div className="space-y-6 sm:space-y-8">
            {/* Live Preview Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-4 border-b border-[#F0F0F0]">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#888888]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
                    Live Storefront Preview
                  </span>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {hasTopBarChanges ? (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                      Previewing Unsaved Changes
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      Live Storefront Matches Preview
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Rendering Container */}
              <div className="w-full mx-auto transition-all duration-300 rounded overflow-x-auto overscroll-x-contain border border-gray-200 shadow-inner">
                {topBarForm.visible ? (
                  <div
                    className="w-full py-2 sm:py-2.5 px-3 sm:px-4 text-center text-xs sm:text-sm font-medium tracking-wide flex items-center justify-center transition-colors duration-200 relative break-words"
                    style={{
                      backgroundColor: topBarForm.backgroundColor,
                      color: topBarForm.textColor,
                    }}
                  >
                    <span>{topBarForm.text || "Type announcement text below..."}</span>
                    {topBarForm.dismissible && (
                      <span className="ml-3 opacity-60 text-xs select-none font-bold" aria-hidden="true">
                        &times;
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full py-3 px-4 text-center text-xs text-gray-500 italic bg-gray-100">
                    Top Bar is currently hidden (Visibility toggle is OFF)
                  </div>
                )}
              </div>
            </div>

            {/* Editor Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111] mb-4 pb-2 border-b border-[#F0F0F0]">
                Top Bar Announcement Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="topbar-text"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                  >
                    Announcement Text
                  </label>
                  <textarea
                    id="topbar-text"
                    rows={2}
                    value={topBarForm.text}
                    onChange={(e) =>
                      setTopBarForm((prev) => ({ ...prev, text: e.target.value }))
                    }
                    placeholder="e.g. Complimentary gift box with all fine jewellery orders."
                    maxLength={250}
                    className="w-full px-3 py-2 text-base sm:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-black focus:border-black outline-none"
                  />
                  <div className="flex justify-between items-center mt-1 text-[11px] text-gray-400">
                    <span>Promotional message shown at the top of every storefront page</span>
                    <span>{topBarForm.text.length} / 250</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  <div>
                    <label
                      htmlFor="topbar-bg-color"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                    >
                      Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="topbar-bg-color"
                        value={topBarForm.backgroundColor}
                        onChange={(e) =>
                          setTopBarForm((prev) => ({ ...prev, backgroundColor: e.target.value }))
                        }
                        className="w-9 h-9 p-0.5 rounded border border-gray-300 cursor-pointer bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={topBarForm.backgroundColor}
                        onChange={(e) =>
                          setTopBarForm((prev) => ({ ...prev, backgroundColor: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 text-base sm:text-xs font-mono uppercase border border-gray-300 rounded focus:ring-1 focus:ring-black focus:border-black outline-none"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="topbar-text-color"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                    >
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="topbar-text-color"
                        value={topBarForm.textColor}
                        onChange={(e) =>
                          setTopBarForm((prev) => ({ ...prev, textColor: e.target.value }))
                        }
                        className="w-9 h-9 p-0.5 rounded border border-gray-300 cursor-pointer bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={topBarForm.textColor}
                        onChange={(e) =>
                          setTopBarForm((prev) => ({ ...prev, textColor: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 text-base sm:text-xs font-mono uppercase border border-gray-300 rounded focus:ring-1 focus:ring-black focus:border-black outline-none"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col justify-end pt-1 sm:pt-0">
                    <label className="flex items-center cursor-pointer gap-2.5 py-2 sm:py-1">
                      <input
                        type="checkbox"
                        checked={topBarForm.visible}
                        onChange={(e) =>
                          setTopBarForm((prev) => ({ ...prev, visible: e.target.checked }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#111111]"></div>
                      <span className="text-xs font-medium text-gray-800">Show on Storefront</span>
                    </label>
                  </div>

                  <div className="flex flex-col justify-end pt-1 sm:pt-0">
                    <label className="flex items-center cursor-pointer gap-2.5 py-2 sm:py-1">
                      <input
                        type="checkbox"
                        checked={topBarForm.dismissible}
                        onChange={(e) =>
                          setTopBarForm((prev) => ({ ...prev, dismissible: e.target.checked }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#111111]"></div>
                      <span className="text-xs font-medium text-gray-800">Dismissible Close (x)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-[#F0F0F0] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <span className="text-xs text-gray-500 order-2 sm:order-1 text-center sm:text-left">
                  {hasTopBarChanges ? (
                    <span className="text-amber-700 font-medium">You have unsaved changes</span>
                  ) : (
                    <span>Current settings published live (v{serverSettings?.topBarVersion ?? 1})</span>
                  )}
                </span>
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto justify-end order-1 sm:order-2">
                  <button
                    type="button"
                    onClick={handleCancelTopBar}
                    disabled={!hasTopBarChanges || isSaving}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cancel Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTopBar}
                    disabled={!hasTopBarChanges || isSaving}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-white bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] rounded transition shadow-sm disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save & Publish Changes</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Top Bar Version History Table */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-[#F0F0F0]">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#888888]" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                    Top Bar Version History
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-50 border border-gray-200 px-3 py-1 rounded text-[#555555]">
                    Current Live: v{serverSettings?.topBarVersion ?? 1}
                  </span>
                </div>
              </div>

              {/* Mobile Table Scroll Indicator */}
              <div className="sm:hidden flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded border border-amber-200/60 mb-2">
                <span>Swipe horizontally to view full history &amp; actions &rarr;</span>
              </div>

              <div className="overflow-x-auto overscroll-x-contain -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="bg-[#F9F9F9] text-[#666666] uppercase text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Version</th>
                      <th className="py-2.5 px-3 font-semibold">Announcement Text</th>
                      <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topBarHistory.map((item) => {
                      const isCurrent = item.version === (serverSettings?.topBarVersion ?? 1);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                            v{item.version}
                          </td>
                          <td className="py-2.5 px-3 text-gray-800 max-w-xs truncate">
                            {item.snapshot.topBar.text}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Check className="w-3 h-3" /> Active Live
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">Previous</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => setRestoreConfirmTarget({ item, section: "top_bar" })}
                                className="px-3 py-1.5 min-h-[32px] text-[11px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
                              >
                                Restore
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: SECOND NAVBAR MANAGEMENT ─────────────────────────────── */}
        {activeTab === "second_navbar" && (
          <div className="space-y-6 sm:space-y-8">
            {/* Live Preview Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-4 border-b border-[#F0F0F0]">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#888888]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
                    Live Storefront Preview
                  </span>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {hasSecondNavbarChanges ? (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                      Previewing Unsaved Changes
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      Live Storefront Matches Preview
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Rendering Container: Shows full storefront second navbar with live promoText */}
              <div className="w-full mx-auto transition-all duration-300 rounded overflow-x-auto overscroll-x-contain border border-gray-200 shadow-inner bg-white">
                <div className="w-full min-w-[500px] border-b border-[#E5E5E5] bg-white text-xs lg:text-[13px] text-black">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-x-4 gap-y-2 px-3 sm:px-4 py-2 sm:py-2.5">
                    {/* Left Group */}
                    <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-5 gap-y-1.5 min-w-0">
                      {serverSettings?.secondNavbar.showPhone && serverSettings?.secondNavbar.phone && (
                        <span className="font-normal text-black shrink-0 text-[11px] sm:text-xs lg:text-[13px]">
                          {serverSettings.secondNavbar.phone}
                        </span>
                      )}

                      {serverSettings?.secondNavbar.showPhone &&
                        serverSettings?.secondNavbar.showPromotion &&
                        secondNavbarPromo && (
                          <span className="h-3 w-px bg-[#E5E5E5] inline-block shrink-0" />
                        )}

                      {serverSettings?.secondNavbar.showPromotion && secondNavbarPromo && (
                        <div className="flex items-center gap-2 truncate text-[11px] sm:text-xs lg:text-[13px]">
                          <span className="text-gray-700 truncate">{secondNavbarPromo}</span>
                          {serverSettings?.secondNavbar.ctaText && (
                            <span className="font-semibold text-black underline underline-offset-2 shrink-0 cursor-pointer">
                              {serverSettings.secondNavbar.ctaText}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Group: Static Secondary Links */}
                    {serverSettings?.secondNavbar.showLinks &&
                      serverSettings?.secondNavbar.links &&
                      serverSettings.secondNavbar.links.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 text-[11px] sm:text-xs text-gray-700 shrink-0">
                          {serverSettings.secondNavbar.links.map((link) => (
                            <span key={link.id} className="hover:text-black transition">
                              {link.label}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Editor Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111] mb-4 pb-2 border-b border-[#F0F0F0]">
                Promotional Message Only
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between items-center mb-1.5">
                  <label
                    htmlFor="second-navbar-promo"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#333333]"
                  >
                    Promotional Message
                  </label>
                  <span className="text-xs text-gray-400 font-mono">
                    {secondNavbarPromo.length}/120
                  </span>
                </div>
                <input
                  type="text"
                  id="second-navbar-promo"
                  value={secondNavbarPromo}
                  onChange={(e) => setSecondNavbarPromo(e.target.value)}
                  placeholder="e.g. Summer Sale 15% off!"
                  maxLength={120}
                  className="w-full px-3 py-2 text-base sm:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-black focus:border-black outline-none"
                />
                <div className="flex justify-between items-center text-[11px] text-gray-400">
                  <span>Displayed centrally in the Second Navbar strip</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-[#F0F0F0] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <span className="text-xs text-gray-500 order-2 sm:order-1 text-center sm:text-left">
                  {hasSecondNavbarChanges ? (
                    <span className="text-amber-700 font-medium">You have unsaved changes</span>
                  ) : (
                    <span>Current settings published live (v{serverSettings?.secondNavbarVersion ?? 1})</span>
                  )}
                </span>
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto justify-end order-1 sm:order-2">
                  <button
                    type="button"
                    onClick={handleCancelSecondNavbar}
                    disabled={!hasSecondNavbarChanges || isSaving}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cancel Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSecondNavbar}
                    disabled={!hasSecondNavbarChanges || isSaving}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-white bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] rounded transition shadow-sm disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save & Publish Changes</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Second Navbar Version History Table */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-[#F0F0F0]">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#888888]" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                    Second Navbar Version History
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-50 border border-gray-200 px-3 py-1 rounded text-[#555555]">
                    Current Live: v{serverSettings?.secondNavbarVersion ?? 1}
                  </span>
                </div>
              </div>

              {/* Mobile Table Scroll Indicator */}
              <div className="sm:hidden flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded border border-amber-200/60 mb-2">
                <span>Swipe horizontally to view full history &amp; actions &rarr;</span>
              </div>

              <div className="overflow-x-auto overscroll-x-contain -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="bg-[#F9F9F9] text-[#666666] uppercase text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Version</th>
                      <th className="py-2.5 px-3 font-semibold">Promotional Message</th>
                      <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {secondNavbarHistory.map((item) => {
                      const isCurrent = item.version === (serverSettings?.secondNavbarVersion ?? 1);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                            v{item.version}
                          </td>
                          <td className="py-2.5 px-3 text-gray-800 max-w-xs truncate">
                            {item.snapshot.secondNavbar.promoText}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Check className="w-3 h-3" /> Active Live
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">Previous</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => setRestoreConfirmTarget({ item, section: "second_navbar" })}
                                className="px-3 py-1.5 min-h-[32px] text-[11px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
                              >
                                Restore
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: HERO IMAGE 1 (LEFT TALL) ─────────────────────────────── */}
        {activeTab === "hero_image_1" && (
          <div className="space-y-6 sm:space-y-8">
            <div
              data-testid="hero-card-1"
              className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden"
            >
              <div className="px-4 sm:px-6 py-4 border-b border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                    Hero Image 1 — Large Left Column Banner
                  </h2>
                  <p className="text-[11px] text-[#666666]">
                    {HERO_SLOT_SPECS.heroImage1.position}
                  </p>
                </div>
                <div className="text-xs bg-gray-50 border border-gray-200 px-3 py-1 rounded text-[#555555]">
                  <span className="font-medium text-[#222222]">Recommended: </span>
                  {HERO_SLOT_SPECS.heroImage1.recommendedDimensions} ({HERO_SLOT_SPECS.heroImage1.recommendedAspectRatio})
                </div>
              </div>

              <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Thumbnail & File Upload */}
                <div className="lg:col-span-5 space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333]">
                    Current Image Asset
                  </label>

                  <div className="relative aspect-[3/4] max-w-[280px] w-full rounded-md overflow-hidden bg-gray-100 border border-gray-200 shadow-inner group">
                    <Image
                      src={displayHero1Image}
                      alt={hero1Form.imageAlt || "Hero Image 1 preview"}
                      fill
                      sizes="280px"
                      className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    />
                    {heroPreviewUrls.heroImage1 && (
                      <div className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow">
                        Pending Publish Preview
                      </div>
                    )}
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef1}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleHeroFileSelect("heroImage1", e)}
                      className="hidden"
                      id="hero-image-1-upload"
                    />
                    <label
                      htmlFor="hero-image-1-upload"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 min-h-[38px] text-xs font-medium uppercase tracking-wider text-[#111111] bg-white border border-[#D1D5DB] rounded hover:bg-[#F9F9F9] cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#C5A572]" />
                      <span>Replace Image</span>
                    </label>
                    <p className="mt-1 text-[11px] text-[#777777]">
                      JPEG, PNG, or WebP up to 5MB. Applied upon publishing.
                    </p>
                  </div>

                  {heroSlotErrors.heroImage1 && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded">
                      {heroSlotErrors.heroImage1}
                    </p>
                  )}
                </div>

                {/* Editable Fields */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <label
                      htmlFor="hero1-normal-headline"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                    >
                      Normal Headline (Displayed above bold headline)
                    </label>
                    <input
                      type="text"
                      id="hero1-normal-headline"
                      data-testid="hero1-normal-headline-input"
                      value={hero1Form.normalHeadline}
                      onChange={(e) =>
                        setHero1Form((prev) => ({ ...prev, normalHeadline: e.target.value }))
                      }
                      placeholder="e.g. Necklaces &"
                      className="w-full px-3.5 py-2 text-base sm:text-sm text-[#111111] border border-[#D1D5DB] rounded focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hero1-bold-headline"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                    >
                      Bold Headline (Displayed below normal headline)
                    </label>
                    <input
                      type="text"
                      id="hero1-bold-headline"
                      data-testid="hero1-bold-headline-input"
                      value={hero1Form.boldHeadline}
                      onChange={(e) =>
                        setHero1Form((prev) => ({ ...prev, boldHeadline: e.target.value }))
                      }
                      placeholder="e.g. Body Jewels"
                      className="w-full px-3.5 py-2 text-base sm:text-sm text-[#111111] border border-[#D1D5DB] rounded focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hero1-description"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                    >
                      Short Description (Displayed beneath headlines)
                    </label>
                    <textarea
                      id="hero1-description"
                      data-testid="hero1-description-input"
                      rows={3}
                      value={hero1Form.description}
                      onChange={(e) =>
                        setHero1Form((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="e.g. Look to our new season collection for girls."
                      className="w-full px-3.5 py-2 text-base sm:text-sm text-[#111111] border border-[#D1D5DB] rounded focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572] outline-none transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hero1-category"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                    >
                      Category
                    </label>
                    <select
                      id="hero1-category"
                      data-testid="hero1-category-select"
                      value={getSelectedCategoryValue(hero1Form.categoryId)}
                      onChange={(e) =>
                        setHero1Form((prev) => ({ ...prev, categoryId: e.target.value || null }))
                      }
                      className="w-full px-3.5 py-2 text-base sm:text-sm text-[#111111] bg-white border border-[#D1D5DB] rounded focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572] outline-none transition-colors cursor-pointer"
                    >
                      <option value="">Select a category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {formatCategoryLabel(c.name)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-[#777777]">
                      Connects the &quot;Shop Now&quot; button to products in this category.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-[#F0F0F0] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <span className="text-xs text-gray-500 text-center sm:text-left">
                  {hasHero1Changes ? (
                    <span className="text-amber-700 font-medium">Unsaved changes on Hero Image 1</span>
                  ) : (
                    <span>Published live as v{serverHeroSettings.heroImage1Version ?? 1}</span>
                  )}
                </span>
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleCancelHeroSlot("heroImage1")}
                    disabled={!hasHero1Changes || isSaving}
                    data-testid="hero1-cancel-button"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cancel Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveHeroSlot("heroImage1")}
                    disabled={!hasHero1Changes || isSaving}
                    data-testid="hero1-save-button"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-white bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] rounded transition shadow-sm disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save & Publish Changes</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Hero Image 1 Independent Version History */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#F0F0F0]">
                <History className="w-4 h-4 text-[#888888]" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                  Hero Image 1 Version History
                </h3>
              </div>

              {/* Mobile Table Scroll Indicator */}
              <div className="sm:hidden flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded border border-amber-200/60 mb-2">
                <span>Swipe horizontally to view full history &amp; actions &rarr;</span>
              </div>

              <div className="overflow-x-auto overscroll-x-contain -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-[#F9F9F9] text-[#666666] uppercase text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Version</th>
                      <th className="py-2.5 px-3 font-semibold">Image</th>
                      <th className="py-2.5 px-3 font-semibold">Headlines & Description</th>
                      <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {hero1History.map((item) => {
                      const isCurrent = item.version === (serverHeroSettings.heroImage1Version ?? 1);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                            v{item.version}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="relative w-12 h-14 rounded overflow-hidden bg-gray-100 border border-gray-200">
                              <Image src={item.imageUrl} alt="Thumbnail" fill sizes="48px" className="object-cover" />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-gray-800 max-w-sm">
                            <div className="font-medium text-gray-900 truncate">
                              {item.normalHeadline} {item.boldHeadline}
                            </div>
                            {item.description && (
                              <div className="text-[11px] text-gray-500 truncate">{item.description}</div>
                            )}
                            {item.categoryId && (
                              <div className="text-[10px] text-amber-700 font-medium truncate mt-0.5">
                                Category: {categories.find((c) => c.id === item.categoryId || c.slug === item.categoryId)?.name ? formatCategoryLabel(categories.find((c) => c.id === item.categoryId || c.slug === item.categoryId)!.name) : (item.categorySlug || item.categoryId)}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Check className="w-3 h-3" /> Current Live
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">Previous</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() =>
                                  setHeroRestoreConfirmTarget({
                                    item,
                                    slotId: "heroImage1",
                                    slotName: "Hero Image 1",
                                  })
                                }
                                className="px-3 py-1.5 min-h-[32px] text-[11px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
                              >
                                Restore
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: HERO IMAGE 2 (UPPER RIGHT) ───────────────────────────── */}
        {activeTab === "hero_image_2" && (
          <div className="space-y-6 sm:space-y-8">
            <div
              data-testid="hero-card-2"
              className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden"
            >
              <div className="px-4 sm:px-6 py-4 border-b border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                    Hero Image 2 — Upper Right Banner
                  </h2>
                  <p className="text-[11px] text-[#666666]">
                    {HERO_SLOT_SPECS.heroImage2.position}
                  </p>
                </div>
                <div className="text-xs bg-gray-50 border border-gray-200 px-3 py-1 rounded text-[#555555]">
                  <span className="font-medium text-[#222222]">Recommended: </span>
                  {HERO_SLOT_SPECS.heroImage2.recommendedDimensions} ({HERO_SLOT_SPECS.heroImage2.recommendedAspectRatio})
                </div>
              </div>

              <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333]">
                    Current Image Asset
                  </label>

                  <div className="relative aspect-[16/9] max-w-[340px] w-full rounded-md overflow-hidden bg-gray-100 border border-gray-200 shadow-inner group">
                    <Image
                      src={displayHero2Image}
                      alt={hero2Form.imageAlt || "Hero Image 2 preview"}
                      fill
                      sizes="340px"
                      className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    />
                    {heroPreviewUrls.heroImage2 && (
                      <div className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow">
                        Pending Publish Preview
                      </div>
                    )}
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef2}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleHeroFileSelect("heroImage2", e)}
                      className="hidden"
                      id="hero-image-2-upload"
                    />
                    <label
                      htmlFor="hero-image-2-upload"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 min-h-[38px] text-xs font-medium uppercase tracking-wider text-[#111111] bg-white border border-[#D1D5DB] rounded hover:bg-[#F9F9F9] cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#C5A572]" />
                      <span>Replace Image</span>
                    </label>
                    <p className="mt-1 text-[11px] text-[#777777]">
                      JPEG, PNG, or WebP up to 5MB. Applied upon publishing.
                    </p>
                  </div>

                  {heroSlotErrors.heroImage2 && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded">
                      {heroSlotErrors.heroImage2}
                    </p>
                  )}
                </div>

                {/* Editable Fields (No description field for slot 2) */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <label
                      htmlFor="hero2-normal-headline"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                    >
                      Normal Headline
                    </label>
                    <input
                      type="text"
                      id="hero2-normal-headline"
                      data-testid="hero2-normal-headline-input"
                      value={hero2Form.normalHeadline}
                      onChange={(e) =>
                        setHero2Form((prev) => ({ ...prev, normalHeadline: e.target.value }))
                      }
                      placeholder="e.g. Just Lunched"
                      className="w-full px-3.5 py-2 text-base sm:text-sm text-[#111111] border border-[#D1D5DB] rounded focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hero2-bold-headline"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                    >
                      Bold Headline
                    </label>
                    <input
                      type="text"
                      id="hero2-bold-headline"
                      data-testid="hero2-bold-headline-input"
                      value={hero2Form.boldHeadline}
                      onChange={(e) =>
                        setHero2Form((prev) => ({ ...prev, boldHeadline: e.target.value }))
                      }
                      placeholder="e.g. Desk The Hals"
                      className="w-full px-3.5 py-2 text-base sm:text-sm text-[#111111] border border-[#D1D5DB] rounded focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hero2-category"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                    >
                      Category
                    </label>
                    <select
                      id="hero2-category"
                      data-testid="hero2-category-select"
                      value={getSelectedCategoryValue(hero2Form.categoryId)}
                      onChange={(e) =>
                        setHero2Form((prev) => ({ ...prev, categoryId: e.target.value || null }))
                      }
                      className="w-full px-3.5 py-2 text-base sm:text-sm text-[#111111] bg-white border border-[#D1D5DB] rounded focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572] outline-none transition-colors cursor-pointer"
                    >
                      <option value="">Select a category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {formatCategoryLabel(c.name)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-[#777777]">
                      Connects the &quot;Shop Now&quot; button to products in this category.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-[#F0F0F0] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <span className="text-xs text-gray-500 text-center sm:text-left">
                  {hasHero2Changes ? (
                    <span className="text-amber-700 font-medium">Unsaved changes on Hero Image 2</span>
                  ) : (
                    <span>Published live as v{serverHeroSettings.heroImage2Version ?? 1}</span>
                  )}
                </span>
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleCancelHeroSlot("heroImage2")}
                    disabled={!hasHero2Changes || isSaving}
                    data-testid="hero2-cancel-button"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cancel Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveHeroSlot("heroImage2")}
                    disabled={!hasHero2Changes || isSaving}
                    data-testid="hero2-save-button"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-white bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] rounded transition shadow-sm disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save & Publish Changes</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Hero Image 2 Independent Version History */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#F0F0F0]">
                <History className="w-4 h-4 text-[#888888]" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                  Hero Image 2 Version History
                </h3>
              </div>

              {/* Mobile Table Scroll Indicator */}
              <div className="sm:hidden flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded border border-amber-200/60 mb-2">
                <span>Swipe horizontally to view full history &amp; actions &rarr;</span>
              </div>

              <div className="overflow-x-auto overscroll-x-contain -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-[#F9F9F9] text-[#666666] uppercase text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Version</th>
                      <th className="py-2.5 px-3 font-semibold">Image</th>
                      <th className="py-2.5 px-3 font-semibold">Headlines</th>
                      <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {hero2History.map((item) => {
                      const isCurrent = item.version === (serverHeroSettings.heroImage2Version ?? 1);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                            v{item.version}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="relative w-16 h-10 rounded overflow-hidden bg-gray-100 border border-gray-200">
                              <Image src={item.imageUrl} alt="Thumbnail" fill sizes="64px" className="object-cover" />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-gray-800 max-w-sm">
                            <div className="font-medium text-gray-900 truncate">
                              {item.normalHeadline} {item.boldHeadline}
                            </div>
                            {item.categoryId && (
                              <div className="text-[10px] text-amber-700 font-medium truncate mt-0.5">
                                Category: {categories.find((c) => c.id === item.categoryId || c.slug === item.categoryId)?.name ? formatCategoryLabel(categories.find((c) => c.id === item.categoryId || c.slug === item.categoryId)!.name) : (item.categorySlug || item.categoryId)}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Check className="w-3 h-3" /> Current Live
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">Previous</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() =>
                                  setHeroRestoreConfirmTarget({
                                    item,
                                    slotId: "heroImage2",
                                    slotName: "Hero Image 2",
                                  })
                                }
                                className="px-3 py-1.5 min-h-[32px] text-[11px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
                              >
                                Restore
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: HERO IMAGE 3 (LOWER RIGHT) ───────────────────────────── */}
        {activeTab === "hero_image_3" && (
          <div className="space-y-6 sm:space-y-8">
            <div
              data-testid="hero-card-3"
              className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden"
            >
              <div className="px-4 sm:px-6 py-4 border-b border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                    Hero Image 3 — Lower Right Banner
                  </h2>
                  <p className="text-[11px] text-[#666666]">
                    {HERO_SLOT_SPECS.heroImage3.position}
                  </p>
                </div>
                <div className="text-xs bg-gray-50 border border-gray-200 px-3 py-1 rounded text-[#555555]">
                  <span className="font-medium text-[#222222]">Recommended: </span>
                  {HERO_SLOT_SPECS.heroImage3.recommendedDimensions} ({HERO_SLOT_SPECS.heroImage3.recommendedAspectRatio})
                </div>
              </div>

              <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333]">
                    Current Image Asset
                  </label>

                  <div className="relative aspect-[16/9] max-w-[340px] w-full rounded-md overflow-hidden bg-gray-100 border border-gray-200 shadow-inner group">
                    <Image
                      src={displayHero3Image}
                      alt={hero3Form.imageAlt || "Hero Image 3 preview"}
                      fill
                      sizes="340px"
                      className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    />
                    {heroPreviewUrls.heroImage3 && (
                      <div className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow">
                        Pending Publish Preview
                      </div>
                    )}
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef3}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleHeroFileSelect("heroImage3", e)}
                      className="hidden"
                      id="hero-image-3-upload"
                    />
                    <label
                      htmlFor="hero-image-3-upload"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 min-h-[38px] text-xs font-medium uppercase tracking-wider text-[#111111] bg-white border border-[#D1D5DB] rounded hover:bg-[#F9F9F9] cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#C5A572]" />
                      <span>Replace Image</span>
                    </label>
                    <p className="mt-1 text-[11px] text-[#777777]">
                      JPEG, PNG, or WebP up to 5MB. Applied upon publishing.
                    </p>
                  </div>

                  {heroSlotErrors.heroImage3 && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded">
                      {heroSlotErrors.heroImage3}
                    </p>
                  )}
                </div>

                {/* Editable Fields (No description field for slot 3) */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <label
                      htmlFor="hero3-normal-headline"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                    >
                      Normal Headline
                    </label>
                    <input
                      type="text"
                      id="hero3-normal-headline"
                      data-testid="hero3-normal-headline-input"
                      value={hero3Form.normalHeadline}
                      onChange={(e) =>
                        setHero3Form((prev) => ({ ...prev, normalHeadline: e.target.value }))
                      }
                      placeholder="e.g. Jewelry &"
                      className="w-full px-3.5 py-2 text-base sm:text-sm text-[#111111] border border-[#D1D5DB] rounded focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hero3-bold-headline"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                    >
                      Bold Headline
                    </label>
                    <input
                      type="text"
                      id="hero3-bold-headline"
                      data-testid="hero3-bold-headline-input"
                      value={hero3Form.boldHeadline}
                      onChange={(e) =>
                        setHero3Form((prev) => ({ ...prev, boldHeadline: e.target.value }))
                      }
                      placeholder="e.g. Charm Bracelets"
                      className="w-full px-3.5 py-2 text-base sm:text-sm text-[#111111] border border-[#D1D5DB] rounded focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hero3-category"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5"
                    >
                      Category
                    </label>
                    <select
                      id="hero3-category"
                      data-testid="hero3-category-select"
                      value={getSelectedCategoryValue(hero3Form.categoryId)}
                      onChange={(e) =>
                        setHero3Form((prev) => ({ ...prev, categoryId: e.target.value || null }))
                      }
                      className="w-full px-3.5 py-2 text-base sm:text-sm text-[#111111] bg-white border border-[#D1D5DB] rounded focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572] outline-none transition-colors cursor-pointer"
                    >
                      <option value="">Select a category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {formatCategoryLabel(c.name)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-[#777777]">
                      Connects the &quot;Shop Now&quot; button to products in this category.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-[#F0F0F0] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <span className="text-xs text-gray-500 text-center sm:text-left">
                  {hasHero3Changes ? (
                    <span className="text-amber-700 font-medium">Unsaved changes on Hero Image 3</span>
                  ) : (
                    <span>Published live as v{serverHeroSettings.heroImage3Version ?? 1}</span>
                  )}
                </span>
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleCancelHeroSlot("heroImage3")}
                    disabled={!hasHero3Changes || isSaving}
                    data-testid="hero3-cancel-button"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cancel Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveHeroSlot("heroImage3")}
                    disabled={!hasHero3Changes || isSaving}
                    data-testid="hero3-save-button"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-white bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] rounded transition shadow-sm disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save & Publish Changes</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Hero Image 3 Independent Version History */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#F0F0F0]">
                <History className="w-4 h-4 text-[#888888]" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                  Hero Image 3 Version History
                </h3>
              </div>

              {/* Mobile Table Scroll Indicator */}
              <div className="sm:hidden flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded border border-amber-200/60 mb-2">
                <span>Swipe horizontally to view full history &amp; actions &rarr;</span>
              </div>

              <div className="overflow-x-auto overscroll-x-contain -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-[#F9F9F9] text-[#666666] uppercase text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Version</th>
                      <th className="py-2.5 px-3 font-semibold">Image</th>
                      <th className="py-2.5 px-3 font-semibold">Headlines</th>
                      <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {hero3History.map((item) => {
                      const isCurrent = item.version === (serverHeroSettings.heroImage3Version ?? 1);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                            v{item.version}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="relative w-16 h-10 rounded overflow-hidden bg-gray-100 border border-gray-200">
                              <Image src={item.imageUrl} alt="Thumbnail" fill sizes="64px" className="object-cover" />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-gray-800 max-w-sm">
                            <div className="font-medium text-gray-900 truncate">
                              {item.normalHeadline} {item.boldHeadline}
                            </div>
                            {item.categoryId && (
                              <div className="text-[10px] text-amber-700 font-medium truncate mt-0.5">
                                Category: {categories.find((c) => c.id === item.categoryId || c.slug === item.categoryId)?.name ? formatCategoryLabel(categories.find((c) => c.id === item.categoryId || c.slug === item.categoryId)!.name) : (item.categorySlug || item.categoryId)}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Check className="w-3 h-3" /> Current Live
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">Previous</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() =>
                                  setHeroRestoreConfirmTarget({
                                    item,
                                    slotId: "heroImage3",
                                    slotName: "Hero Image 3",
                                  })
                                }
                                className="px-3 py-1.5 min-h-[32px] text-[11px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
                              >
                                Restore
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── NAVBAR RESTORE CONFIRMATION MODAL ─────────────────────────────── */}
      {restoreConfirmTarget && (
        <div
          data-testid="navbar-restore-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 shadow-xl border border-gray-200 transition-all my-auto">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#C5A572]" />
              <span>Restore This Version?</span>
            </h3>

            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              {`You are about to restore this previous version of the ${
                restoreConfirmTarget.section === "top_bar" ? "Top Bar" : "Second Navbar"
              }. The selected ${
                restoreConfirmTarget.section === "top_bar" ? "announcement" : "promotional message"
              } will replace the current published content on the live PERALAGAE website. Your current live version will be saved in history before the restoration.`}
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setRestoreConfirmTarget(null)}
                disabled={isRestoring}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteNavbarRestore}
                disabled={isRestoring}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-white bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] rounded transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
              >
                {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Confirm & Publish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── HERO RESTORE CONFIRMATION MODAL ───────────────────────────────── */}
      {heroRestoreConfirmTarget && (
        <div
          data-testid="hero-restore-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 shadow-xl border border-gray-200 transition-all my-auto">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#C5A572]" />
              <span>Confirm {heroRestoreConfirmTarget.slotName} Restoration</span>
            </h3>

            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              You are about to restore historical <strong>v{heroRestoreConfirmTarget.item.version}</strong> of{" "}
              <strong>{heroRestoreConfirmTarget.slotName}</strong>. This will replace the current live slot on the homepage, while preserving the other two hero images and navbar settings unchanged.
            </p>

            <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200 text-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-14 rounded overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                  <Image
                    src={heroRestoreConfirmTarget.item.imageUrl}
                    alt="Restoring Thumbnail"
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">
                    {heroRestoreConfirmTarget.item.normalHeadline} {heroRestoreConfirmTarget.item.boldHeadline}
                  </div>
                  {heroRestoreConfirmTarget.item.description && (
                    <div className="text-[11px] text-gray-500 truncate">
                      {heroRestoreConfirmTarget.item.description}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Originally published {new Date(heroRestoreConfirmTarget.item.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Your current live version will be backed up in history before restoration is completed.
              </span>
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setHeroRestoreConfirmTarget(null)}
                disabled={isRestoring}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteHeroRestore}
                disabled={isRestoring}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 min-h-[40px] text-xs font-medium text-white bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] rounded transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
              >
                {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Confirm & Publish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
