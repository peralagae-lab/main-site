"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  Star,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Plus,
  Layers,
  Sparkles,
  Info,
  ShieldAlert,
  Loader2,
  X,
  FileText,
  Sliders,
  Check,
  ImageIcon,
} from "lucide-react";
import {
  fetchAdminCategories,
  createAdminCategory,
} from "@/services/category-admin-service";
import {
  fetchAdminMaterials,
  createAdminMaterial,
  MATERIALS_QUERY_KEY,
  MATERIALS_UPDATED_EVENT,
} from "@/services/material-service";
import { useNotification } from "@/providers/storefront-provider";
import {
  createAdminProduct,
  updateAdminProduct,
  uploadAdminProductImages,
  PRODUCTS_UPDATED_EVENT,
  PRODUCTS_ADMIN_QUERY_KEY,
  type CreateProductPayload,
  type UpdateProductPayload,
} from "@/services/product-admin-service";
import { fetchPublicProducts } from "@/services/product-service";
import type { Product, ProductSpec, ProductImage } from "@/types/product";
import type { CategoryItem } from "@/types/category";
import type { MaterialItem } from "@/types/material";

interface ProductEditorFormProps {
  initialProduct?: Product | null;
  mode?: "create" | "edit";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductEditorForm({ initialProduct, mode = "create" }: ProductEditorFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit" && Boolean(initialProduct?.id);

  // Categories from database
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Materials from database
  const [dbMaterials, setDbMaterials] = useState<MaterialItem[]>([]);
  const [isLoadingDbMaterials, setIsLoadingDbMaterials] = useState(true);

  // Form Fields: Basic Information
  const [name, setName] = useState(initialProduct?.name || "");
  const [slug, setSlug] = useState(initialProduct?.slug || "");
  const [categoryId, setCategoryId] = useState(
    initialProduct?.categoryId || initialProduct?.categoryKey || ""
  );
  const [materialId, setMaterialId] = useState<string>(
    initialProduct?.materialId || ""
  );
  const [priceInr, setPriceInr] = useState<string>(
    initialProduct?.priceInr !== undefined ? String(initialProduct.priceInr) : ""
  );
  const [compareAtPriceInr, setCompareAtPriceInr] = useState<string>(
    initialProduct?.compareAtPriceInr ? String(initialProduct.compareAtPriceInr) : ""
  );
  const [stockCount, setStockCount] = useState<string>(
    initialProduct?.stockCount !== undefined ? String(initialProduct.stockCount) : "10"
  );
  const [inStock, setInStock] = useState<boolean>(initialProduct?.inStock ?? true);

  // Form Fields: 6-Section Structured Description
  const [shortDescription, setShortDescription] = useState(
    initialProduct?.description || ""
  );
  const [productOverview, setProductOverview] = useState(
    initialProduct?.productOverview || initialProduct?.descriptionParagraph1 || ""
  );
  const [productDetails, setProductDetails] = useState(
    initialProduct?.productDetails || initialProduct?.descriptionParagraph2 || ""
  );
  const [careInstructions, setCareInstructions] = useState(
    initialProduct?.careInstructions ||
      initialProduct?.specs?.find((s) => s.label.toLowerCase().includes("care"))?.value ||
      ""
  );
  const [additionalInfo, setAdditionalInfo] = useState(
    initialProduct?.additionalInfo || ""
  );

  // Form Fields: Dynamic Specifications
  const [specs, setSpecs] = useState<ProductSpec[]>(
    Array.isArray(initialProduct?.specs) && initialProduct.specs.length > 0
      ? initialProduct.specs.map((s) => ({ label: s.label, value: s.value }))
      : [
          { label: "Precious Metal", value: "18k Solid Yellow Gold (750 Purity)" },
          { label: "Purity & Hallmarking", value: "BIS Hallmarked 750 (18 Karat)" },
          { label: "Certification", value: "Authenticity Certificate Included" },
        ]
  );

  // Form Fields: Visual Image Management (NO technical URLs)
  const [images, setImages] = useState<ProductImage[]>(() => {
    if (initialProduct?.images && initialProduct.images.length > 0) {
      return initialProduct.images;
    }
    if (initialProduct?.image?.src) {
      return [{ src: initialProduct.image.src, alt: initialProduct.name }];
    }
    return [];
  });
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0);

  // Optional Badges & Metadata
  const [materials, setMaterials] = useState<string[]>(initialProduct?.materials || []);
  const [customMaterialInput, setCustomMaterialInput] = useState("");
  const [isHot, setIsHot] = useState<boolean>(Boolean(initialProduct?.isHot));
  const [isNew, setIsNew] = useState<boolean>(Boolean(initialProduct?.isNew));

  useEffect(() => {
    if (initialProduct) {
      setIsHot(Boolean(initialProduct.isHot));
      setIsNew(Boolean(initialProduct.isNew));
    }
  }, [initialProduct]);

  const handleAddCustomMaterial = () => {
    const trimmed = customMaterialInput.trim();
    if (!trimmed) return;
    const formatted = trimmed
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    if (!materials.includes(formatted)) {
      setMaterials((prev) => [...prev, formatted]);
      markDirty();
    }
    setCustomMaterialInput("");
  };

  // UI & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Image deletion confirmation modal state
  const [imageIndexToDelete, setImageIndexToDelete] = useState<number | null>(null);

  // Unsaved changes tracking
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Toast & Notification System
  const notify = useNotification();

  // Category Modal State
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);

  // Material Modal State
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [isSubmittingMaterial, setIsSubmittingMaterial] = useState(false);
  const [materialModalError, setMaterialModalError] = useState<string | null>(null);

  // Mark dirty whenever any input changes
  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Handler: Create Category from Product Form
  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCategoryModalError("Category name is required.");
      return;
    }

    // Client-side case-insensitive duplicate check
    const exists = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setCategoryModalError(`A category named "${trimmed}" already exists.`);
      return;
    }

    try {
      setIsSubmittingCategory(true);
      setCategoryModalError(null);

      // Save new category through backend API and MongoDB
      const created = await createAdminCategory({ name: trimmed });

      // Refresh authoritative categories from backend
      const refreshed = await fetchAdminCategories();
      setCategories(refreshed);

      // Automatically select the newly created category
      setCategoryId(created.id);
      markDirty();

      // Clear any validation error on categoryId
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next.categoryId;
        return next;
      });

      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });

      notify.success("Category Created", {
        description: `"${created.name}" is now selected for this product.`,
      });

      setIsAddCategoryModalOpen(false);
      setNewCategoryName("");
    } catch (err: any) {
      setCategoryModalError(err?.message || "Failed to create category. Please try again.");
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  // Handler: Create Material from Product Form
  const handleCreateMaterial = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newMaterialName.trim();
    if (!trimmed) {
      setMaterialModalError("Material name is required.");
      return;
    }

    // Client-side case-insensitive duplicate check
    const exists = dbMaterials.some(
      (m) => m.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setMaterialModalError(`A material named "${trimmed}" already exists.`);
      return;
    }

    try {
      setIsSubmittingMaterial(true);
      setMaterialModalError(null);

      // Save new material through backend API and MongoDB
      const created = await createAdminMaterial({ name: trimmed });

      // Refresh authoritative materials from backend
      const refreshed = await fetchAdminMaterials();
      setDbMaterials(refreshed);

      // Automatically select the newly created material
      setMaterialId(created.id);
      if (!materials.includes(created.name)) {
        setMaterials((prev) => [...prev, created.name]);
      }
      markDirty();

      queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(MATERIALS_UPDATED_EVENT));
      }

      notify.success("Material Created", {
        description: `"${created.name}" is now selected for this product.`,
      });

      setIsAddMaterialModalOpen(false);
      setNewMaterialName("");
    } catch (err: any) {
      setMaterialModalError(err?.message || "Failed to create material. Please try again.");
    } finally {
      setIsSubmittingMaterial(false);
    }
  };

  // Warn before leaving if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Load Categories from database
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        setIsLoadingCategories(true);
        const cats = await fetchAdminCategories();
        if (isMounted) {
          setCategories(cats);
          // Set default category if none set
          if (!categoryId && cats.length > 0) {
            setCategoryId(cats[0]?.id || "");
          }
        }
      } catch (err) {
        console.error("Failed to load categories", err);
      } finally {
        if (isMounted) setIsLoadingCategories(false);
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load Materials from database
  useEffect(() => {
    let isMounted = true;
    async function loadMaterials() {
      try {
        setIsLoadingDbMaterials(true);
        const mats = await fetchAdminMaterials();
        if (isMounted) {
          setDbMaterials(mats);
          if (!materialId && mats.length > 0) {
            if (initialProduct?.materialId) {
              setMaterialId(initialProduct.materialId);
            } else if (initialProduct?.material) {
              const matched = mats.find(
                (m) =>
                  m.name.toLowerCase() === initialProduct.material?.toLowerCase() ||
                  m.slug.toLowerCase() === initialProduct.material?.toLowerCase()
              );
              if (matched) {
                setMaterialId(matched.id);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load materials", err);
      } finally {
        if (isMounted) setIsLoadingDbMaterials(false);
      }
    }
    loadMaterials();
    return () => {
      isMounted = false;
    };
  }, [initialProduct?.materialId, initialProduct?.material]);

  // Synchronize auto-generated slug when creating product
  const handleNameChange = (val: string) => {
    setName(val);
    markDirty();
    if (!isEdit) {
      setSlug(slugify(val));
    }
  };

  // Handle Image Uploads via drop or file selector
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    // Client-side validation
    for (const f of fileArray) {
      if (f.size > 5 * 1024 * 1024) {
        setStatusMessage({
          type: "error",
          text: `File "${f.name}" exceeds the 5MB size limit. Please upload a smaller image.`,
        });
        return;
      }
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(f.type)) {
        setStatusMessage({
          type: "error",
          text: `File "${f.name}" is not a supported format. Please upload JPG, PNG, or WebP.`,
        });
        return;
      }
    }

    try {
      setIsUploadingImages(true);
      setStatusMessage(null);
      const results = await uploadAdminProductImages(fileArray);

      const newImages: ProductImage[] = results.map((r) => ({
        src: r.url,
        alt: name.trim() || "Fine Jewellery View",
      }));

      setImages((prev) => [...prev, ...newImages]);
      markDirty();
      setStatusMessage({
        type: "success",
        text: `Successfully uploaded ${results.length} product ${
          results.length === 1 ? "image" : "images"
        }.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to upload image(s). Please try again.",
      });
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Move image left in order
  const handleMoveImage = (fromIdx: number, direction: "left" | "right") => {
    markDirty();
    const toIdx = direction === "left" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= images.length) return;

    setImages((prev) => {
      const copy = [...prev];
      const item = copy[fromIdx];
      if (!item) return prev;
      copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, item);
      return copy;
    });

    // Update primary index if it was moved
    if (primaryImageIndex === fromIdx) {
      setPrimaryImageIndex(toIdx);
    } else if (primaryImageIndex === toIdx) {
      setPrimaryImageIndex(fromIdx);
    }
  };

  // Remove image after confirmation
  const handleConfirmDeleteImage = () => {
    if (imageIndexToDelete === null) return;
    markDirty();
    const targetIdx = imageIndexToDelete;
    setImages((prev) => prev.filter((_, idx) => idx !== targetIdx));

    if (primaryImageIndex === targetIdx) {
      setPrimaryImageIndex(0);
    } else if (primaryImageIndex > targetIdx) {
      setPrimaryImageIndex((prev) => prev - 1);
    }

    setImageIndexToDelete(null);
  };

  // Dynamic Specification handlers
  const handleAddSpec = () => {
    markDirty();
    setSpecs((prev) => [...prev, { label: "", value: "" }]);
  };

  const handleUpdateSpec = (idx: number, field: "label" | "value", val: string) => {
    markDirty();
    setSpecs((prev) => {
      const copy = [...prev];
      if (copy[idx]) {
        copy[idx] = { ...copy[idx], [field]: val };
      }
      return copy;
    });
  };

  const handleRemoveSpec = (idx: number) => {
    markDirty();
    setSpecs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveSpec = (idx: number, direction: "up" | "down") => {
    markDirty();
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= specs.length) return;

    setSpecs((prev) => {
      const copy = [...prev];
      const item = copy[idx];
      if (!item) return prev;
      copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const handleAddStandardSpecsTemplate = () => {
    markDirty();
    const standardKeys = [
      "Precious Metal",
      "Gemstones",
      "Purity & Hallmarking",
      "Approximate Metal Weight",
      "Dimensions / Sizing",
      "Certification",
    ];

    const currentLabels = new Set(specs.map((s) => s.label.trim().toLowerCase()));
    const toAdd = standardKeys
      .filter((k) => !currentLabels.has(k.toLowerCase()))
      .map((k) => ({ label: k, value: "" }));

    if (toAdd.length === 0) {
      setStatusMessage({
        type: "info",
        text: "Standard specification keys are already present in your table.",
      });
      return;
    }

    setSpecs((prev) => [...prev, ...toAdd]);
  };

  // Comprehensive Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Product name is required.";
    } else if (name.trim().length < 2) {
      errors.name = "Product name must be at least 2 characters.";
    }

    if (!categoryId) {
      errors.categoryId = "Please select a product category.";
    }

    const parsedPrice = parseFloat(priceInr);
    if (!priceInr || isNaN(parsedPrice) || parsedPrice <= 0) {
      errors.priceInr = "A valid positive price in INR is required.";
    }

    const parsedStock = parseInt(stockCount, 10);
    if (stockCount === "" || isNaN(parsedStock) || parsedStock < 0) {
      errors.stockCount = "Stock quantity must be a non-negative whole number.";
    }

    // Required 6-section descriptions validation
    if (!shortDescription.trim()) {
      errors.shortDescription = "Short description is required (displayed on PDP near price).";
    } else if (shortDescription.trim().length < 8) {
      errors.shortDescription = "Short description must be at least 8 characters.";
    }

    if (!productOverview.trim()) {
      errors.productOverview = "Product Overview paragraph is required.";
    } else if (productOverview.trim().length < 20) {
      errors.productOverview = "Product Overview must be at least 20 characters.";
    }

    if (!productDetails.trim()) {
      errors.productDetails = "Product Details description is required.";
    } else if (productDetails.trim().length < 20) {
      errors.productDetails = "Product Details must be at least 20 characters.";
    }

    if (!careInstructions.trim()) {
      errors.careInstructions = "Care Instructions are required.";
    } else if (careInstructions.trim().length < 10) {
      errors.careInstructions = "Care Instructions must be at least 10 characters.";
    }

    // Image validation
    if (images.length === 0) {
      errors.images = "At least one product image is required. Please upload an image.";
    }

    // Spec validation: any spec row with one field filled must have both
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      if ((s?.label && !s.value) || (!s?.label && s?.value)) {
        errors.specs = `Specification row #${i + 1} has an empty name or value. Please complete or remove it.`;
        break;
      }
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      setStatusMessage({
        type: "error",
        text: "Please correct the highlighted fields before saving.",
      });
      return false;
    }

    return true;
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setStatusMessage(null);

      // Re-order images so primary image is at index 0
      const orderedImages = [...images];
      if (primaryImageIndex > 0 && primaryImageIndex < orderedImages.length) {
        const primary = orderedImages.splice(primaryImageIndex, 1)[0];
        if (primary) orderedImages.unshift(primary);
      }

      const primaryImgUrl = orderedImages[0]?.src || "/images/collections/collection-necklaces.jpg";
      const cleanSpecs = specs.filter((s) => Boolean(s.label.trim() && s.value.trim()));

      const selectedDbMaterial = dbMaterials.find((m) => m.id === materialId);
      const combinedMaterials = Array.from(
        new Set([
          ...materials,
          ...(selectedDbMaterial ? [selectedDbMaterial.name] : []),
        ])
      ).filter(Boolean);

      const payload: CreateProductPayload = {
        name: name.trim(),
        slug: slug.trim() ? slugify(slug.trim()) : slugify(name.trim()),
        categoryId,
        materialId: materialId || null,
        material: selectedDbMaterial?.name || initialProduct?.material || undefined,
        priceInr: parseFloat(priceInr),
        compareAtPriceInr: compareAtPriceInr.trim() ? parseFloat(compareAtPriceInr) : null,
        stockCount: parseInt(stockCount, 10),
        inStock,
        isAvailable: inStock,
        imageUrl: primaryImgUrl,
        imageAlt: name.trim(),
        images: orderedImages,
        description: shortDescription.trim(),
        productOverview: productOverview.trim(),
        productDetails: productDetails.trim(),
        careInstructions: careInstructions.trim(),
        additionalInfo: additionalInfo.trim() || undefined,
        specs: cleanSpecs,
        materials: combinedMaterials,
        isHot,
        isNew,
      };

      let savedProduct: Product;
      if (isEdit && initialProduct?.id) {
        savedProduct = await updateAdminProduct(initialProduct.id, payload as UpdateProductPayload);
        setStatusMessage({
          type: "success",
          text: `"${savedProduct.name}" has been successfully updated in the database.`,
        });
      } else {
        savedProduct = await createAdminProduct(payload);
        setStatusMessage({
          type: "success",
          text: `"${savedProduct.name}" has been successfully published to the catalogue!`,
        });
      }

      // Invalidate queries and broadcast update event
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: PRODUCTS_ADMIN_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["public-products"] });
      queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(PRODUCTS_UPDATED_EVENT));
        window.dispatchEvent(new CustomEvent(MATERIALS_UPDATED_EVENT));
      }

      // Navigate back to product catalogue after short delay
      setTimeout(() => {
        router.push("/admin/products");
      }, 1000);
    } catch (err: any) {
      console.error("Save product error", err);
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to save product to database. Please check your inputs.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowDiscardPrompt(true);
    } else {
      router.push("/admin/products");
    }
  };

  return (
    <div className="w-full pb-20">
      {/* Unsaved Changes Discard Confirmation Modal */}
      {showDiscardPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded border border-[#E5E5E5] shadow-2xl max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center gap-3 text-[#DC2626]">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-serif font-medium text-[#111111]">
                Discard Unsaved Changes?
              </h3>
            </div>
            <p className="text-xs text-[#666666] leading-relaxed">
              You have made modifications to this product that have not been saved to the database.
              Leaving now will permanently discard your changes.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEEEEE]">
              <button
                type="button"
                onClick={() => setShowDiscardPrompt(false)}
                className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#555555] hover:text-black hover:bg-[#F5F5F5] rounded transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDirty(false);
                  setShowDiscardPrompt(false);
                  router.push("/admin/products");
                }}
                className="px-4 py-2 text-xs font-medium uppercase tracking-wider bg-[#DC2626] text-white hover:bg-[#B91C1C] rounded transition-colors"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Image Confirmation Modal */}
      {imageIndexToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded border border-[#E5E5E5] shadow-2xl max-w-sm w-full p-6 text-left space-y-4">
            <div className="flex items-center gap-3 text-[#DC2626]">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-serif font-medium text-[#111111]">
                Remove Image from Gallery?
              </h3>
            </div>
            <p className="text-xs text-[#666666] leading-relaxed">
              Are you sure you want to remove image #{imageIndexToDelete + 1}? This action can be
              undone before saving by re-uploading the file.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#EEEEEE]">
              <button
                type="button"
                onClick={() => setImageIndexToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[#555555] hover:text-black rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteImage}
                className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider bg-[#DC2626] text-white hover:bg-[#B91C1C] rounded"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD NEW CATEGORY MODAL ─── */}
      {isAddCategoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-new-category-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white rounded border border-[#E5E5E5] shadow-2xl max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#E5DFD5] flex items-center justify-center text-[#C5A572]">
                  <Plus className="w-4 h-4" />
                </div>
                <h3
                  id="add-new-category-modal-title"
                  className="text-base font-serif font-medium text-[#111111]"
                >
                  Create New Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingCategory) {
                    setIsAddCategoryModalOpen(false);
                    setCategoryModalError(null);
                  }
                }}
                disabled={isSubmittingCategory}
                className="text-[#888888] hover:text-[#111111] p-1 rounded transition-colors disabled:opacity-40 cursor-pointer"
                aria-label="Close category modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed">
              Enter a category name. It will be saved to MongoDB, immediately available in the dropdown, and automatically selected for this product.
            </p>

            {categoryModalError && (
              <div
                role="alert"
                className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded text-xs text-[#DC2626] font-medium flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{categoryModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label
                  htmlFor="quick-new-category-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#222222] mb-1.5"
                >
                  Category Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="quick-new-category-name"
                  data-testid="new-category-name-input"
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Anklets, Brooches, Mangalsutras"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (categoryModalError) setCategoryModalError(null);
                  }}
                  disabled={isSubmittingCategory}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm border border-[#D1D5DB] focus:border-[#C5A572] rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572] transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEEEEE]">
                <button
                  type="button"
                  data-testid="cancel-new-category-button"
                  onClick={() => {
                    setIsAddCategoryModalOpen(false);
                    setCategoryModalError(null);
                  }}
                  disabled={isSubmittingCategory}
                  className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#555555] hover:text-black hover:bg-[#F5F5F5] rounded transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-new-category-button"
                  disabled={isSubmittingCategory || !newCategoryName.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#C5A572] hover:bg-[#B39360] text-white rounded transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isSubmittingCategory ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Category</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD NEW MATERIAL MODAL ─── */}
      {isAddMaterialModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-new-material-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white rounded border border-[#E5E5E5] shadow-2xl max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#E5DFD5] flex items-center justify-center text-[#C5A572]">
                  <Plus className="w-4 h-4" />
                </div>
                <h3
                  id="add-new-material-modal-title"
                  className="text-base font-serif font-medium text-[#111111]"
                >
                  Create New Material
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingMaterial) {
                    setIsAddMaterialModalOpen(false);
                    setMaterialModalError(null);
                  }
                }}
                disabled={isSubmittingMaterial}
                className="text-[#888888] hover:text-[#111111] p-1 rounded transition-colors disabled:opacity-40 cursor-pointer"
                aria-label="Close material modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed">
              Enter a material name. It will be saved to MongoDB, immediately added to the dropdown, and automatically selected for this product.
            </p>

            {materialModalError && (
              <div
                role="alert"
                className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded text-xs text-[#DC2626] font-medium flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{materialModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMaterial} className="space-y-4">
              <div>
                <label
                  htmlFor="quick-new-material-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#222222] mb-1.5"
                >
                  Material Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="quick-new-material-name"
                  data-testid="new-material-name-input"
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. 14k Rose Gold, Platinum 950, Sterling Silver"
                  value={newMaterialName}
                  onChange={(e) => {
                    setNewMaterialName(e.target.value);
                    if (materialModalError) setMaterialModalError(null);
                  }}
                  disabled={isSubmittingMaterial}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm border border-[#D1D5DB] focus:border-[#C5A572] rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572] transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEEEEE]">
                <button
                  type="button"
                  data-testid="cancel-new-material-button"
                  onClick={() => {
                    setIsAddMaterialModalOpen(false);
                    setMaterialModalError(null);
                  }}
                  disabled={isSubmittingMaterial}
                  className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#555555] hover:text-black hover:bg-[#F5F5F5] rounded transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-new-material-button"
                  disabled={isSubmittingMaterial || !newMaterialName.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#C5A572] hover:bg-[#B39360] text-white rounded transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isSubmittingMaterial ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Material</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Breadcrumbs & Page Header */}
      <div className="border-b border-[#EAEAEA] bg-white pb-5 pt-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Row: Enlarged Products Navigation Button & Breadcrumb */}
          <div className="flex items-center justify-between mb-3.5">
            <button
              type="button"
              onClick={handleCancelClick}
              className="inline-flex items-center gap-2.5 px-4 py-2 sm:px-5 sm:py-2.5 bg-white hover:bg-[#FAF9F6] text-[#111111] hover:text-[#C5A572] border border-[#D1D5DB] hover:border-[#C5A572] rounded text-xs sm:text-sm font-medium tracking-wide transition-all shadow-xs cursor-pointer group"
              aria-label="Back to Products"
            >
              <ArrowLeft className="w-4 h-4 text-[#666666] group-hover:text-[#C5A572] group-hover:-translate-x-0.5 transition-all" />
              <span>Back to Products</span>
            </button>

            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs text-[#888888]">
              <span>Products</span>
              <span>/</span>
              <span className="text-[#C5A572] font-medium">
                {isEdit ? "Edit Product" : "New Product"}
              </span>
            </nav>
          </div>

          {/* Title & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C5A572]">
                {isEdit ? "Catalogue Management" : "Product Creator"}
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-medium text-[#111111] mt-0.5">
                {isEdit ? "Edit Product" : "Create New Product"}
              </h1>
              <p className="text-xs text-[#666666] mt-0.5">
                {isEdit
                  ? "Update product imagery, structured descriptions, specifications, and availability."
                  : "Publish an authentic fine jewellery piece to the PERALAGAE online boutique."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCancelClick}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2 border border-[#D1D5DB] text-xs font-medium uppercase tracking-wider text-[#374151] hover:text-black hover:bg-[#F9FAFB] rounded transition-colors min-h-[38px]"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="save-product-button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#111111] text-white hover:bg-[#C5A572] transition-colors rounded text-xs uppercase tracking-wider font-medium shadow-sm disabled:opacity-50 min-h-[38px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C5A572]" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isEdit ? "Save Changes" : "Save Product"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Form Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Status Feedback Banner */}
        {statusMessage && (
          <div
            data-testid="form-status-banner"
            className={`mb-8 p-4 rounded border flex items-start gap-3 shadow-xs ${
              statusMessage.type === "success"
                ? "bg-[#F0FDF4] border-[#86EFAC] text-[#166534]"
                : statusMessage.type === "error"
                ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
                : "bg-[#F0F9FF] border-[#BAE6FD] text-[#075985]"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-[#16A34A] mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-[#DC2626] mt-0.5" />
            )}
            <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">
              {statusMessage.text}
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-[#888888] hover:text-black p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Legacy Data Review Notice */}
        {isEdit &&
          (!initialProduct?.productOverview ||
            !initialProduct?.productDetails ||
            !initialProduct?.careInstructions) && (
            <div className="mb-8 p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded text-[#92400E] flex items-start gap-3">
              <Info className="w-5 h-5 shrink-0 text-[#F59E0B] mt-0.5" />
              <div className="text-xs leading-relaxed">
                <strong className="font-semibold">Legacy Description Notice:</strong> This product
                record was created under an older schema. We have pre-filled available text from
                existing fields. Please verify all 6 required description sections below before
                saving.
              </div>
            </div>
          )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ════════════════════════════════════════════════════════════════════════
              SECTION 1: BASIC PRODUCT INFORMATION
              ════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white border border-[#EAEAEA] rounded shadow-xs p-4 sm:p-6 md:p-8 space-y-6">
            <div className="border-b border-[#F0F0F0] pb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A572]">
                Section 1
              </span>
              <h2 className="text-lg font-serif font-medium text-[#111111]">Basic Information</h2>
              <p className="text-xs text-[#666666] mt-0.5">
                Essential identity, pricing, and category classification.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* Product Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#222222] mb-1.5">
                  Product Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Celestial Diamond Solitaire Pendant"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-base sm:text-sm border rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572] ${
                    validationErrors.name ? "border-[#DC2626] bg-[#FEF2F2]" : "border-[#D1D5DB]"
                  }`}
                />
                {validationErrors.name && (
                  <p className="text-[11px] text-[#DC2626] mt-1 font-medium">
                    {validationErrors.name}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="product-category-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#222222] mb-1.5"
                >
                  Category <span className="text-[#DC2626]">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="product-category-select"
                    required
                    data-testid="product-category-select"
                    aria-label="Category"
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      markDirty();
                    }}
                    disabled={isLoadingCategories}
                    className={`flex-1 min-w-0 px-3.5 py-2.5 text-base sm:text-sm border rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572] ${
                      validationErrors.categoryId ? "border-[#DC2626]" : "border-[#D1D5DB]"
                    }`}
                  >
                    <option value="">Select a Category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    data-testid="add-new-category-button"
                    onClick={() => {
                      setNewCategoryName("");
                      setCategoryModalError(null);
                      setIsAddCategoryModalOpen(true);
                    }}
                    title="Create a new category"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-[#C5A572] bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#E5DFD5] hover:border-[#C5A572] rounded transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New</span>
                  </button>
                </div>
                {validationErrors.categoryId && (
                  <p className="text-[11px] text-[#DC2626] mt-1 font-medium">
                    {validationErrors.categoryId}
                  </p>
                )}
              </div>

              {/* Primary Material */}
              <div>
                <label
                  htmlFor="product-material-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#222222] mb-1.5"
                >
                  Material
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="product-material-select"
                    data-testid="product-material-select"
                    aria-label="Material"
                    value={materialId}
                    onChange={(e) => {
                      const newMatId = e.target.value;
                      setMaterialId(newMatId);
                      markDirty();
                      if (newMatId) {
                        const found = dbMaterials.find((m) => m.id === newMatId);
                        if (found && !materials.includes(found.name)) {
                          setMaterials((prev) => [...prev, found.name]);
                        }
                      }
                    }}
                    disabled={isLoadingDbMaterials}
                    className="flex-1 min-w-0 px-3.5 py-2.5 text-base sm:text-sm border border-[#D1D5DB] rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572]"
                  >
                    <option value="">Select a Material...</option>
                    {dbMaterials.map((mat) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    data-testid="add-new-material-button"
                    onClick={() => {
                      setNewMaterialName("");
                      setMaterialModalError(null);
                      setIsAddMaterialModalOpen(true);
                    }}
                    title="Create a new material"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-[#C5A572] bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#E5DFD5] hover:border-[#C5A572] rounded transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#888888] mt-1">
                  Database-driven material entity for storefront collections and filters.
                </p>
              </div>

              {/* Price in INR */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#222222] mb-1.5">
                  Price in INR (₹) <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#666666]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="24900"
                    value={priceInr}
                    onChange={(e) => {
                      setPriceInr(e.target.value);
                      markDirty();
                    }}
                    className={`w-full pl-8 pr-3.5 py-2.5 text-base sm:text-sm border rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572] ${
                      validationErrors.priceInr ? "border-[#DC2626] bg-[#FEF2F2]" : "border-[#D1D5DB]"
                    }`}
                  />
                </div>
                {validationErrors.priceInr && (
                  <p className="text-[11px] text-[#DC2626] mt-1 font-medium">
                    {validationErrors.priceInr}
                  </p>
                )}
              </div>

              {/* Compare-at Price */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#222222] mb-1.5">
                  Compare-At Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#666666]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Optional original price"
                    value={compareAtPriceInr}
                    onChange={(e) => {
                      setCompareAtPriceInr(e.target.value);
                      markDirty();
                    }}
                    className="w-full pl-8 pr-3.5 py-2.5 text-base sm:text-sm border border-[#D1D5DB] rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572]"
                  />
                </div>
                <p className="text-[11px] text-[#888888] mt-1">
                  Optional original price for strikethrough sale display.
                </p>
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#222222] mb-1.5">
                  Stock Quantity <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="10"
                  value={stockCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStockCount(val);
                    setInStock(parseInt(val, 10) > 0);
                    markDirty();
                  }}
                  className={`w-full px-3.5 py-2.5 text-base sm:text-sm border rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572] ${
                    validationErrors.stockCount ? "border-[#DC2626]" : "border-[#D1D5DB]"
                  }`}
                />
                {validationErrors.stockCount && (
                  <p className="text-[11px] text-[#DC2626] mt-1 font-medium">
                    {validationErrors.stockCount}
                  </p>
                )}
              </div>

              {/* Availability Status */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#222222] mb-1.5">
                  Availability Status <span className="text-[#DC2626]">*</span>
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[#222222]">
                    <input
                      type="radio"
                      name="availability"
                      checked={inStock}
                      onChange={() => {
                        setInStock(true);
                        markDirty();
                      }}
                      className="text-[#C5A572] focus:ring-[#C5A572]"
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> In Stock
                    </span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[#222222]">
                    <input
                      type="radio"
                      name="availability"
                      checked={!inStock}
                      onChange={() => {
                        setInStock(false);
                        markDirty();
                      }}
                      className="text-[#C5A572] focus:ring-[#C5A572]"
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> Out of Stock
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════════
              SECTION 2: PRODUCT IMAGE MANAGEMENT (VISUAL ONLY — NO URL INPUTS)
              ════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white border border-[#EAEAEA] rounded shadow-xs p-4 sm:p-6 md:p-8 space-y-6">
            <div className="border-b border-[#F0F0F0] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A572]">
                  Section 2
                </span>
                <h2 className="text-lg font-serif font-medium text-[#111111]">
                  Visual Image Gallery ({images.length})
                </h2>
                <p className="text-xs text-[#666666] mt-0.5">
                  Upload multiple product images, reorder sequence, and designate the primary piece
                  photo. No technical URLs exposed.
                </p>
              </div>

              {/* Upload Button */}
              <div className="w-full sm:w-auto">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="admin-image-upload-input"
                />
                <label
                  htmlFor="admin-image-upload-input"
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#111111] text-white hover:bg-[#C5A572] rounded text-xs uppercase tracking-wider font-medium cursor-pointer transition-colors shadow-xs min-h-[40px] ${
                    isUploadingImages ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {isUploadingImages ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#C5A572]" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Images</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Validation Error */}
            {validationErrors.images && (
              <p className="text-xs text-[#DC2626] font-medium p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded">
                {validationErrors.images}
              </p>
            )}

            {/* Drag & Drop Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFileUpload(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-[#D1D5DB] hover:border-[#C5A572] rounded-lg p-6 sm:p-8 text-center bg-[#FAFAFA] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-10 h-10 mx-auto rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center text-[#C5A572] mb-3 shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#111111]">
                Drag and drop fine jewellery images here, or click to browse
              </p>
              <p className="text-[11px] text-[#888888] mt-1">
                Supports JPG, PNG, and WebP up to 5MB each. Upload multiple files without limit.
              </p>
            </div>

            {/* Visual Previews Grid */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 pt-2">
                {images.map((img, idx) => {
                  const isPrimary = idx === primaryImageIndex;
                  return (
                    <div
                      key={`${img.src}-${idx}`}
                      className={`group relative rounded-md border bg-white overflow-hidden shadow-xs transition-all ${
                        isPrimary
                          ? "ring-2 ring-[#C5A572] border-[#C5A572]"
                          : "border-[#E5E7EB] hover:border-[#C5A572]"
                      }`}
                    >
                      {/* Image Thumbnail Preview */}
                      <div className="aspect-square relative bg-[#F5F5F5] overflow-hidden flex items-center justify-center">
                        <img
                          src={img.src}
                          alt={img.alt || name || `Product Image ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/images/collections/collection-necklaces.jpg";
                          }}
                        />

                        {/* Primary Badge */}
                        {isPrimary && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#111111] text-[#C5A572] shadow-sm flex items-center gap-1">
                            <Star className="w-3 h-3 fill-[#C5A572]" />
                            <span>Primary</span>
                          </div>
                        )}

                        {/* Image Index Number */}
                        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/60 text-white">
                          #{idx + 1}
                        </div>
                      </div>

                      {/* Card Actions Bar */}
                      <div className="p-2 sm:p-2.5 bg-white border-t border-[#F0F0F0] flex items-center justify-between gap-1">
                        {/* Primary Image Toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            setPrimaryImageIndex(idx);
                            markDirty();
                          }}
                          className={`p-1.5 rounded transition-colors text-[11px] flex items-center gap-1 min-h-[30px] ${
                            isPrimary
                              ? "text-[#C5A572] font-semibold"
                              : "text-[#666666] hover:text-black hover:bg-[#F5F5F5]"
                          }`}
                          title={isPrimary ? "Primary Image" : "Set as Primary Image"}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              isPrimary ? "fill-[#C5A572] text-[#C5A572]" : ""
                            }`}
                          />
                          <span className="text-[10px] hidden sm:inline">
                            {isPrimary ? "Primary" : "Make Primary"}
                          </span>
                        </button>

                        <div className="flex items-center gap-1">
                          {/* Move Left */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveImage(idx, "left")}
                            className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center text-[#666666] hover:text-black hover:bg-[#F5F5F5] rounded disabled:opacity-30 disabled:pointer-events-none"
                            title="Move Earlier in Gallery"
                          >
                            <ChevronUp className="w-3.5 h-3.5 -rotate-90" />
                          </button>

                          {/* Move Right */}
                          <button
                            type="button"
                            disabled={idx === images.length - 1}
                            onClick={() => handleMoveImage(idx, "right")}
                            className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center text-[#666666] hover:text-black hover:bg-[#F5F5F5] rounded disabled:opacity-30 disabled:pointer-events-none"
                            title="Move Later in Gallery"
                          >
                            <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                          </button>

                          {/* Delete Action with Modal Confirmation */}
                          <button
                            type="button"
                            onClick={() => setImageIndexToDelete(idx)}
                            className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center text-[#666666] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded"
                            title="Remove Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#888888] bg-[#FDFDFD] border border-[#EEEEEE] rounded">
                No images added yet. Click &quot;Upload Images&quot; above to add high-resolution photos.
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════════════
              SECTION 3: AUTOMATIC PRODUCT DESCRIPTION STRUCTURE (6 SECTIONS)
              ════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white border border-[#EAEAEA] rounded shadow-xs p-4 sm:p-6 md:p-8 space-y-6">
            <div className="border-b border-[#F0F0F0] pb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A572]">
                Section 3
              </span>
              <h2 className="text-lg font-serif font-medium text-[#111111]">
                Structured Description Sections
              </h2>
              <p className="text-xs text-[#666666] mt-0.5">
                All description sections are required to maintain a consistent, luxury storefront
                experience. Fabricated factual claims are strictly prohibited.
              </p>
            </div>

            {/* 1. Short Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#222222]">
                  1. Short Description (Storefront Subtitle){" "}
                  <span className="text-[#DC2626]">*</span>
                </label>
                <span className="text-[11px] text-[#888888]">
                  {shortDescription.length} / 180 chars
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={180}
                placeholder="One concise, elegant sentence displayed beside price on the product detail page."
                value={shortDescription}
                onChange={(e) => {
                  setShortDescription(e.target.value);
                  markDirty();
                }}
                className={`w-full px-3.5 py-2.5 text-base sm:text-sm border rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572] ${
                  validationErrors.shortDescription
                    ? "border-[#DC2626] bg-[#FEF2F2]"
                    : "border-[#D1D5DB]"
                }`}
              />
              {validationErrors.shortDescription && (
                <p className="text-[11px] text-[#DC2626] mt-1 font-medium">
                  {validationErrors.shortDescription}
                </p>
              )}
            </div>

            {/* 2. Product Overview */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#222222]">
                  2. Product Overview (Primary Story Paragraph){" "}
                  <span className="text-[#DC2626]">*</span>
                </label>
                <span className="text-[11px] text-[#888888]">
                  {productOverview.length} / 1500 chars (min 20)
                </span>
              </div>
              <textarea
                rows={3}
                required
                maxLength={1500}
                placeholder="The primary editorial paragraph describing the jewellery piece's inspiration, form, and aesthetic character."
                value={productOverview}
                onChange={(e) => {
                  setProductOverview(e.target.value);
                  markDirty();
                }}
                className={`w-full px-3.5 py-2.5 text-base sm:text-sm border rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572] leading-relaxed ${
                  validationErrors.productOverview
                    ? "border-[#DC2626] bg-[#FEF2F2]"
                    : "border-[#D1D5DB]"
                }`}
              />
              {validationErrors.productOverview && (
                <p className="text-[11px] text-[#DC2626] mt-1 font-medium">
                  {validationErrors.productOverview}
                </p>
              )}
            </div>

            {/* 3. Product Details */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#222222]">
                  3. Product Details (Craftsmanship & Materials){" "}
                  <span className="text-[#DC2626]">*</span>
                </label>
                <span className="text-[11px] text-[#888888]">
                  {productDetails.length} / 1500 chars (min 20)
                </span>
              </div>
              <textarea
                rows={3}
                required
                maxLength={1500}
                placeholder="Supporting description explaining design mechanics, gold setting, comfort-fit bevels, and artisan finishing."
                value={productDetails}
                onChange={(e) => {
                  setProductDetails(e.target.value);
                  markDirty();
                }}
                className={`w-full px-3.5 py-2.5 text-base sm:text-sm border rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572] leading-relaxed ${
                  validationErrors.productDetails
                    ? "border-[#DC2626] bg-[#FEF2F2]"
                    : "border-[#D1D5DB]"
                }`}
              />
              {validationErrors.productDetails && (
                <p className="text-[11px] text-[#DC2626] mt-1 font-medium">
                  {validationErrors.productDetails}
                </p>
              )}
            </div>

            {/* 4. Care Instructions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#222222]">
                  4. Jewellery Care Instructions <span className="text-[#DC2626]">*</span>
                </label>
                <span className="text-[11px] text-[#888888]">
                  {careInstructions.length} / 800 chars (min 10)
                </span>
              </div>
              <textarea
                rows={2}
                required
                maxLength={800}
                placeholder="Specific guidance for cleaning, safe pouch storage, and protection from chemicals and perfumes."
                value={careInstructions}
                onChange={(e) => {
                  setCareInstructions(e.target.value);
                  markDirty();
                }}
                className={`w-full px-3.5 py-2.5 text-base sm:text-sm border rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572] leading-relaxed ${
                  validationErrors.careInstructions
                    ? "border-[#DC2626] bg-[#FEF2F2]"
                    : "border-[#D1D5DB]"
                }`}
              />
              {validationErrors.careInstructions && (
                <p className="text-[11px] text-[#DC2626] mt-1 font-medium">
                  {validationErrors.careInstructions}
                </p>
              )}
            </div>

            {/* 5. Additional Information */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#222222]">
                  5. Additional Information (Packaging, Hallmarking & Guarantees)
                </label>
                <span className="text-[11px] text-[#888888]">
                  {additionalInfo.length} / 800 chars
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={800}
                placeholder="Complimentary luxury gift packaging, tamper-evident security seal, laser assay inscriptions, etc."
                value={additionalInfo}
                onChange={(e) => {
                  setAdditionalInfo(e.target.value);
                  markDirty();
                }}
                className="w-full px-3.5 py-2.5 text-base sm:text-sm border border-[#D1D5DB] rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572] leading-relaxed"
              />
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════════
              SECTION 4: DYNAMIC PRODUCT SPECIFICATIONS
              ════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white border border-[#EAEAEA] rounded shadow-xs p-4 sm:p-6 md:p-8 space-y-6">
            <div className="border-b border-[#F0F0F0] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A572]">
                  Section 4
                </span>
                <h2 className="text-lg font-serif font-medium text-[#111111]">
                  Dynamic Specifications Table ({specs.length} rows)
                </h2>
                <p className="text-xs text-[#666666] mt-0.5">
                  Rendered in a 2-column layout on the storefront. Add as many specification rows as
                  needed without arbitrary limits.
                </p>
              </div>

              {/* Template & Add Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAddStandardSpecsTemplate}
                  className="px-3.5 py-2 border border-[#D1D5DB] text-xs font-medium text-[#374151] hover:text-black hover:bg-[#F9FAFB] rounded transition-colors min-h-[36px]"
                >
                  Insert Standard Keys
                </button>
                <button
                  type="button"
                  onClick={handleAddSpec}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#111111] text-white hover:bg-[#C5A572] rounded text-xs uppercase tracking-wider font-medium transition-colors min-h-[36px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
              </div>
            </div>

            {validationErrors.specs && (
              <p className="text-xs text-[#DC2626] font-medium p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded">
                {validationErrors.specs}
              </p>
            )}

            {/* Specifications Dynamic Rows */}
            <div className="space-y-3">
              {specs.map((spec, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 sm:p-3.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded hover:border-[#D1D5DB] transition-colors"
                >
                  <span className="text-[11px] font-mono text-[#888888] w-6 shrink-0 text-center hidden sm:block">
                    #{idx + 1}
                  </span>

                  {/* Specification Name */}
                  <div className="flex-1 sm:w-1/3">
                    <input
                      type="text"
                      placeholder="Specification Name (e.g. Precious Metal)"
                      value={spec.label}
                      onChange={(e) => handleUpdateSpec(idx, "label", e.target.value)}
                      className="w-full px-3 py-2.5 text-base sm:text-xs border border-[#D1D5DB] rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572]"
                    />
                  </div>

                  {/* Specification Value */}
                  <div className="flex-1 sm:w-1/2">
                    <input
                      type="text"
                      placeholder="Value (e.g. 18k Solid Yellow Gold)"
                      value={spec.value}
                      onChange={(e) => handleUpdateSpec(idx, "value", e.target.value)}
                      className="w-full px-3 py-2.5 text-base sm:text-xs border border-[#D1D5DB] rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572]"
                    />
                  </div>

                  {/* Row Controls */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0 pt-1 sm:pt-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSpec(idx, "up")}
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#666666] hover:text-black hover:bg-white rounded border border-[#E5E7EB] disabled:opacity-30 disabled:pointer-events-none"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === specs.length - 1}
                      onClick={() => handleMoveSpec(idx, "down")}
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#666666] hover:text-black hover:bg-white rounded border border-[#E5E7EB] disabled:opacity-30 disabled:pointer-events-none"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(idx)}
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#DC2626] hover:bg-[#FEF2F2] rounded border border-[#FCA5A5]"
                      title="Remove Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {specs.length === 0 && (
                <div className="py-6 text-center text-xs text-[#888888] bg-[#FDFDFD] border border-[#EEEEEE] rounded">
                  No specifications added. Click &quot;Add Row&quot; or &quot;Insert Standard Keys&quot; to begin.
                </div>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════════
              SECTION 5: METADATA & BADGES
              ════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white border border-[#EAEAEA] rounded shadow-xs p-4 sm:p-6 md:p-8 space-y-6">
            <div className="border-b border-[#F0F0F0] pb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A572]">
                Section 5
              </span>
              <h2 className="text-lg font-serif font-medium text-[#111111]">
                Storefront Tags & Badges
              </h2>
              <p className="text-xs text-[#666666] mt-0.5">
                Curate catalogue badges and faceted search attributes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {/* Product Badges */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#222222] mb-2">
                  Highlight Badges
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#222222] py-1">
                    <input
                      type="checkbox"
                      checked={isNew}
                      onChange={(e) => {
                        setIsNew(e.target.checked);
                        markDirty();
                      }}
                      className="rounded border-[#D1D5DB] text-[#C5A572] focus:ring-[#C5A572] w-4 h-4"
                    />
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F0FDF4] text-[#16A34A] border border-[#86EFAC]">
                      NEW ARRIVAL
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#222222] py-1">
                    <input
                      type="checkbox"
                      checked={isHot}
                      onChange={(e) => {
                        setIsHot(e.target.checked);
                        markDirty();
                      }}
                      className="rounded border-[#D1D5DB] text-[#C5A572] focus:ring-[#C5A572] w-4 h-4"
                    />
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
                      HOT / TRENDING
                    </span>
                  </label>
                </div>
              </div>

              {/* Material Tags */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#222222] mb-2">
                  Materials Filter Tags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {Array.from(
                    new Set([
                      ...dbMaterials.map((m) => m.name),
                      ...materials,
                    ])
                  ).map((mat) => {
                    const active = materials.includes(mat);
                    return (
                      <button
                        key={mat}
                        type="button"
                        onClick={() => {
                          setMaterials((prev) =>
                            active ? prev.filter((m) => m !== mat) : [...prev, mat]
                          );
                          markDirty();
                        }}
                        className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors border min-h-[32px] cursor-pointer ${
                          active
                            ? "bg-[#111111] text-[#C5A572] border-[#111111]"
                            : "bg-white text-[#555555] border-[#E5E7EB] hover:border-[#C5A572]"
                        }`}
                      >
                        {mat}
                      </button>
                    );
                  })}
                </div>
                {/* Custom Material Addition */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="New material (e.g. Titanium)..."
                    value={customMaterialInput}
                    onChange={(e) => setCustomMaterialInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomMaterial();
                      }
                    }}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-[#D1D5DB] rounded bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#C5A572]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMaterial}
                    disabled={!customMaterialInput.trim()}
                    className="px-3 py-1.5 bg-[#111111] text-white hover:bg-[#C5A572] disabled:opacity-40 text-xs font-medium rounded transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Save & Cancel Bar */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white border border-[#EAEAEA] rounded shadow-xs">
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 border border-[#D1D5DB] text-xs font-medium uppercase tracking-wider text-[#374151] hover:text-black hover:bg-[#F9FAFB] rounded transition-colors min-h-[42px]"
            >
              Cancel & Discard
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-2.5 bg-[#111111] text-white hover:bg-[#C5A572] transition-colors rounded text-xs uppercase tracking-wider font-medium shadow-sm disabled:opacity-50 min-h-[42px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C5A572]" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEdit ? "Save Changes" : "Save Product"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
