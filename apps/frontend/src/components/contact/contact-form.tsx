"use client";

import React, { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  type ContactEnquiryData,
  type ContactValidationErrors,
  validateContactForm,
  submitContactEnquiry,
} from "@/services/contact-service";
import { brandConfig } from "@/config/brand";
import { defaultNavigationConfig } from "@/config/navigation";
import { useNotification } from "@/providers/storefront-provider";

export function ContactForm() {
  const notify = useNotification();
  const [formData, setFormData] = useState<ContactEnquiryData>({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });

  const [errors, setErrors] = useState<ContactValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: "success" | "error" | "unconfigured" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error as the user types
    if (errors[name as keyof ContactValidationErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Dismiss existing feedback on user interaction
    if (submissionFeedback.type) {
      setSubmissionFeedback({ type: null, message: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Client-Side Field Validation
    const validationErrors = validateContactForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      notify.warning("Please check required fields", {
        description: "Please complete all required fields correctly before submitting.",
      });
      // Focus first error field for accessibility
      const firstErrorKey = Object.keys(validationErrors)[0];
      const element = document.getElementById(`contact-${firstErrorKey}`);
      if (element) {
        element.focus();
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    setSubmissionFeedback({ type: null, message: "" });

    try {
      // 2. Submission to Service Layer / Backend Boundary
      const result = await submitContactEnquiry(formData);

      if (result.status === "success") {
        setSubmissionFeedback({
          type: "success",
          message: result.message,
        });
        notify.success("Message sent successfully!", {
          description: "Our concierge team has received your message.",
        });
        // Reset form on success
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          message: "",
        });
      } else {
        setSubmissionFeedback({
          type: "error",
          message: result.message,
        });
        notify.error("Message could not be sent", {
          description: result.message,
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try reaching us directly.";
      setSubmissionFeedback({
        type: "error",
        message: msg,
      });
      notify.error("Message could not be sent", {
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const email = brandConfig.contactEmail || "contact@peralagae.com";
  const phone = defaultNavigationConfig.utility.phone || "+91 98765 43210";
  const telHref = defaultNavigationConfig.utility.phoneHref || `tel:${phone.replace(/\s+/g, "")}`;

  return (
    <div className="w-full">
      {/* Form Heading & Supporting Text */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-2xl sm:text-3xl font-serif font-normal text-[#111111] tracking-tight">
          Send Us a Message
        </h3>
        <p className="mt-1.5 text-sm text-[#666666] font-light">
          Share your enquiry and our team will get back to you.
        </p>
      </div>

      {/* Submission Feedback Notices */}
      {submissionFeedback.type === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 p-4 border border-[#2E7D32]/30 bg-[#2E7D32]/5 rounded-sm flex items-start gap-3 text-sm text-[#2E7D32]"
        >
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">{submissionFeedback.message}</p>
        </div>
      )}

      {submissionFeedback.type === "error" && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 p-4 border border-red-200 bg-red-50 rounded-sm flex items-start gap-3 text-sm text-red-700"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-500" aria-hidden="true" />
          <p className="leading-relaxed">{submissionFeedback.message}</p>
        </div>
      )}

      {/* Clean Rectangular Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
        {/* 1. Full Name */}
        <div>
          <label
            htmlFor="contact-fullName"
            className="block text-[11px] sm:text-xs font-medium uppercase tracking-wider text-[#555555] mb-1.5"
          >
            Full Name <span className="text-[#C5A572]">*</span>
          </label>
          <input
            id="contact-fullName"
            name="fullName"
            type="text"
            required
            disabled={isSubmitting}
            value={formData.fullName}
            onChange={handleChange}
            placeholder="e.g. Eleanor Vance"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            className={`w-full h-11 sm:h-12 px-4 text-sm text-[#111111] bg-white border transition-colors rounded-none placeholder:text-[#AAAAAA] focus:outline-none disabled:bg-[#FAFAFA] disabled:opacity-75 ${
              errors.fullName
                ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572]"
            }`}
          />
          {errors.fullName && (
            <p id="fullName-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{errors.fullName}</span>
            </p>
          )}
        </div>

        {/* 2. Row: Email Address & Phone Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* Email Address */}
          <div>
            <label
              htmlFor="contact-email"
              className="block text-[11px] sm:text-xs font-medium uppercase tracking-wider text-[#555555] mb-1.5"
            >
              Email Address <span className="text-[#C5A572]">*</span>
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              disabled={isSubmitting}
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={`w-full h-11 sm:h-12 px-4 text-sm text-[#111111] bg-white border transition-colors rounded-none placeholder:text-[#AAAAAA] focus:outline-none disabled:bg-[#FAFAFA] disabled:opacity-75 ${
                errors.email
                  ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572]"
              }`}
            />
            {errors.email && (
              <p id="email-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          {/* Phone Number (Optional) */}
          <div>
            <label
              htmlFor="contact-phone"
              className="block text-[11px] sm:text-xs font-medium uppercase tracking-wider text-[#555555] mb-1.5"
            >
              Phone Number <span className="text-[#999999] font-normal lowercase">(optional)</span>
            </label>
            <input
              id="contact-phone"
              name="phone"
              type="tel"
              disabled={isSubmitting}
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              className={`w-full h-11 sm:h-12 px-4 text-sm text-[#111111] bg-white border transition-colors rounded-none placeholder:text-[#AAAAAA] focus:outline-none disabled:bg-[#FAFAFA] disabled:opacity-75 ${
                errors.phone
                  ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572]"
              }`}
            />
            {errors.phone && (
              <p id="phone-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{errors.phone}</span>
              </p>
            )}
          </div>
        </div>

        {/* 3. Message */}
        <div>
          <label
            htmlFor="contact-message"
            className="block text-[11px] sm:text-xs font-medium uppercase tracking-wider text-[#555555] mb-1.5"
          >
            Message <span className="text-[#C5A572]">*</span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={4}
            required
            disabled={isSubmitting}
            value={formData.message}
            onChange={handleChange}
            placeholder="How can we assist with your fine jewellery enquiry?"
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "message-error" : undefined}
            className={`w-full p-4 text-sm text-[#111111] bg-white border transition-colors rounded-none placeholder:text-[#AAAAAA] focus:outline-none resize-none disabled:bg-[#FAFAFA] disabled:opacity-75 ${
              errors.message
                ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572]"
            }`}
          />
          {errors.message && (
            <p id="message-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{errors.message}</span>
            </p>
          )}
        </div>

        {/* 4. Full-Width Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 sm:h-13 bg-[#111111] text-white text-xs font-semibold uppercase tracking-[0.2em] transition-colors hover:bg-[#C5A572] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Sending Enquiry...</span>
              </>
            ) : (
              <span>SEND MESSAGE</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
