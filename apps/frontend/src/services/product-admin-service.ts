import { API_BASE_URL } from "@/lib/api-client";
import { getStoredAdminToken } from "./admin-auth-service";
import type { Product, ProductSpec } from "@/types/product";

export const PRODUCTS_UPDATED_EVENT = "peralagae_products_updated";
export const PRODUCTS_ADMIN_QUERY_KEY = ["admin", "products"];

export interface CreateProductPayload {
  name: string;
  slug?: string;
  categoryId?: string | null;
  categoryKey?: string | null;
  priceInr: number;
  compareAtPriceInr?: number | null;
  inStock?: boolean;
  isAvailable?: boolean;
  stockCount?: number;
  imageUrl?: string;
  imageAlt?: string;
  images?: Array<{ src: string; alt?: string; width?: number; height?: number } | string>;
  description?: string;
  productOverview?: string;
  productDetails?: string;
  careInstructions?: string;
  additionalInfo?: string;
  descriptionParagraph1?: string;
  descriptionParagraph2?: string;
  specs?: ProductSpec[];
  materialId?: string | null;
  material?: string;
  materials?: string[];
  isHot?: boolean;
  isNew?: boolean;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface AdminProductListResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function getAuthHeaders(includeContentType = true): HeadersInit {
  const token = getStoredAdminToken();
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetches paginated products for admin management with filters.
 */
export async function fetchAdminProducts(params: {
  search?: string;
  category?: string;
  inStock?: boolean;
  page?: number;
  pageSize?: number;
} = {}): Promise<AdminProductListResult> {
  const queryParams = new URLSearchParams();
  if (params.search?.trim()) queryParams.set("search", params.search.trim());
  if (params.category && params.category !== "all") queryParams.set("category", params.category);
  if (params.inStock !== undefined) queryParams.set("inStock", String(params.inStock));
  if (params.page) queryParams.set("page", String(params.page));
  if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));

  const qs = queryParams.toString();
  const url = `${API_BASE_URL}/products/admin/list${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch products (HTTP ${res.status})`);
  }

  const json = await res.json();
  return json.data;
}

/**
 * Fetches a single product by slug or ID for editing.
 */
export async function fetchAdminProductById(slugOrId: string): Promise<Product> {
  const url = `${API_BASE_URL}/products/${encodeURIComponent(slugOrId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch product (HTTP ${res.status})`);
  }

  const json = await res.json();
  return json.data;
}

/**
 * Creates a new product in MongoDB.
 */
export async function createAdminProduct(data: CreateProductPayload): Promise<Product> {
  const url = `${API_BASE_URL}/products/admin`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(data),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error?.message || `Failed to create product (HTTP ${res.status})`);
  }

  return json.data;
}

/**
 * Updates an existing product in MongoDB.
 */
export async function updateAdminProduct(
  id: string,
  data: UpdateProductPayload
): Promise<Product> {
  const url = `${API_BASE_URL}/products/admin/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(data),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error?.message || `Failed to update product (HTTP ${res.status})`);
  }

  return json.data;
}

/**
 * Permanently deletes a product from MongoDB.
 */
export async function deleteAdminProduct(
  id: string
): Promise<{ success: boolean; id: string; name: string }> {
  const url = `${API_BASE_URL}/products/admin/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error?.message || `Failed to delete product (HTTP ${res.status})`);
  }

  return json.data;
}

/**
 * Uploads a single product image file to persistent storage with 5MB validation.
 */
export async function uploadAdminProductImage(
  file: File
): Promise<{ url: string; filename: string; mimetype: string; size: number }> {
  const url = `${API_BASE_URL}/products/admin/upload-image`;
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(false),
    credentials: "include",
    body: formData,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error?.message || `Failed to upload product image (HTTP ${res.status})`);
  }

  return json.data;
}

/**
 * Uploads multiple product image files to persistent storage.
 */
export async function uploadAdminProductImages(
  files: File[]
): Promise<Array<{ url: string; filename: string; mimetype: string; size: number }>> {
  const url = `${API_BASE_URL}/products/admin/upload-images`;
  const formData = new FormData();
  for (const file of files) {
    formData.append("images", file);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(false),
    credentials: "include",
    body: formData,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error?.message || `Failed to upload product images (HTTP ${res.status})`);
  }

  return json.data;
}
