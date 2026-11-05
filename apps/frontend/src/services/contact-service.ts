/**
 * Contact Service & Integration Boundary — PERALAGAE
 *
 * Defines strongly-typed contact enquiry schemas, client validation,
 * storefront submission, and admin management service operations.
 */

import { API_BASE_URL, getBackendOrigin } from "@/lib/api-client";
import { getStoredAdminToken } from "./admin-auth-service";

export interface ContactEnquiryData {
  fullName: string;
  email: string;
  phone?: string;
  message: string;
}

export interface ContactSubmissionResult {
  success: boolean;
  status: "success" | "error";
  message: string;
}

export interface ContactValidationErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  message?: string;
}

export type ContactEnquiryStatus = "non-contact" | "contact";

export interface ContactEnquiryRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: ContactEnquiryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContactCounts {
  newContacts: number; // status === "non-contact"
  contacted: number;   // status === "contact"
  total: number;
}

export interface GetContactEnquiriesResponse {
  enquiries: ContactEnquiryRecord[];
  counts: ContactCounts;
  total: number;
  page: number;
  limit: number;
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Validates contact form data according to luxury e-commerce requirements.
 */
export function validateContactForm(data: ContactEnquiryData): ContactValidationErrors {
  const errors: ContactValidationErrors = {};

  const nameTrimmed = (data.fullName || "").trim();
  if (!nameTrimmed) {
    errors.fullName = "Please enter your full name.";
  } else if (nameTrimmed.length < 2) {
    errors.fullName = "Full name must be at least 2 characters.";
  }

  const emailTrimmed = (data.email || "").trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailTrimmed) {
    errors.email = "Please enter your email address.";
  } else if (!emailRegex.test(emailTrimmed)) {
    errors.email = "Please enter a valid email address (e.g. name@example.com).";
  }

  const phoneTrimmed = (data.phone || "").trim();
  if (phoneTrimmed) {
    // Optional phone validation: if entered, check for valid phone numbers (minimum 8 digits)
    const digitsOnly = phoneTrimmed.replace(/\D/g, "");
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      errors.phone = "Please enter a valid phone number (8–15 digits).";
    }
  }

  const messageTrimmed = (data.message || "").trim();
  if (!messageTrimmed) {
    errors.message = "Please share your enquiry or message.";
  } else if (messageTrimmed.length < 5) {
    errors.message = "Message must be at least 5 characters long.";
  }

  return errors;
}

// ── Storefront Public Submission ──────────────────────────────────────────

/**
 * Submits contact enquiry to the production database via backend API.
 */
export async function submitContactEnquiry(
  data: ContactEnquiryData
): Promise<ContactSubmissionResult> {
  const baseUrl =
    typeof window !== "undefined" && window.location?.origin && !process.env["VITEST"]
      ? ""
      : getBackendOrigin();
  const endpoint = `${baseUrl}/api/v1/contact`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.fullName,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        message: data.message,
      }),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        status: "error",
        message:
          json?.error?.message ||
          "An error occurred while submitting your enquiry. Please try again.",
      };
    }

    return {
      success: true,
      status: "success",
      message:
        json?.message ||
        "Thank you for contacting us. Our jewellery concierge team will respond shortly.",
    };
  } catch (error) {
    return {
      success: false,
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Network error occurred. Please verify your connection or contact us directly.",
    };
  }
}

// ── Admin Protected Services ──────────────────────────────────────────────

/**
 * Fetches contact enquiries filtered by status ('non-contact' or 'contact') for Admin.
 */
export async function fetchAdminContactEnquiries(
  status?: ContactEnquiryStatus,
  page = 1,
  limit = 50
): Promise<GetContactEnquiriesResponse> {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  params.set("page", page.toString());
  params.set("limit", limit.toString());

  const url = `${API_BASE_URL}/contact?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to fetch contact enquiries");
  }

  const json = await res.json();
  return {
    enquiries: json.data || [],
    counts: json.counts || { newContacts: 0, contacted: 0, total: 0 },
    total: json.total || 0,
    page: json.page || 1,
    limit: json.limit || limit,
  };
}

/**
 * Fetches exact live counts for 'non-contact' and 'contact' enquiries for Admin.
 */
export async function fetchAdminContactCounts(): Promise<ContactCounts> {
  const url = `${API_BASE_URL}/contact/counts`;

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to fetch contact counts");
  }

  const json = await res.json();
  return json.data || { newContacts: 0, contacted: 0, total: 0 };
}

/**
 * Updates an enquiry status in the database to 'non-contact' or 'contact'.
 */
export async function updateAdminContactStatus(
  id: string,
  status: ContactEnquiryStatus
): Promise<{ enquiry: ContactEnquiryRecord; counts: ContactCounts }> {
  const url = `${API_BASE_URL}/contact/${id}/status`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to update enquiry status");
  }

  const json = await res.json();
  return {
    enquiry: json.data,
    counts: json.counts,
  };
}
