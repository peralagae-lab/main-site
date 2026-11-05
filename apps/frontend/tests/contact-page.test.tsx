import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContactHero } from "@/components/contact/contact-hero";
import { ContactDetails } from "@/components/contact/contact-details";
import { ContactForm } from "@/components/contact/contact-form";
import { ContactPageContent } from "@/components/contact/contact-page-content";
import { validateContactForm } from "@/services/contact-service";

describe("PERALAGAE Contact Page Suite", () => {
  describe("1. ContactHero Component", () => {
    it("renders the luxury jewellery background banner, breadcrumb, title, and subtitle", () => {
      render(<ContactHero />);

      const banner = screen.getByTestId("contact-hero-banner");
      expect(banner).toBeInTheDocument();

      // Breadcrumb Navigation
      const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
      expect(breadcrumb).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
      expect(screen.getByText("Contact", { selector: "span" })).toBeInTheDocument();

      // Heading and Subtitle
      expect(screen.getByRole("heading", { level: 1, name: "Contact Us" })).toBeInTheDocument();
      expect(
        screen.getByText("We're here to help with your jewellery enquiries.")
      ).toBeInTheDocument();
    });
  });

  describe("2. ContactDetails Component (Minimal Left Column)", () => {
    it("renders eyebrow, heading, and description without clutter", () => {
      render(<ContactDetails />);

      expect(screen.getByText("GET IN TOUCH")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 2, name: "How Can We Help?" })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Have a question about a piece, a custom order, or your purchase\?/i)
      ).toBeInTheDocument();
    });

    it("displays strictly two authentic contact details: Email and Phone/WhatsApp", () => {
      render(<ContactDetails />);

      // 1. Email
      const emailLink = screen.getByRole("link", { name: "contact@peralagae.com" });
      expect(emailLink).toHaveAttribute("href", "mailto:contact@peralagae.com");

      // 2. Phone
      const phoneLink = screen.getByRole("link", { name: "+91 98765 43210" });
      expect(phoneLink).toHaveAttribute("href", "tel:+919876543210");

      // WhatsApp
      const whatsappLink = screen.getByRole("link", { name: /Chat on WhatsApp/i });
      expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("wa.me"));

      // Confirms old cluttered cards are completely absent
      expect(screen.queryByText("Flagship Boutique")).not.toBeInTheDocument();
      expect(screen.queryByText("Boutique Hours")).not.toBeInTheDocument();
      expect(screen.queryByText("Email Concierge")).not.toBeInTheDocument();
      expect(screen.queryByText("Bandra West, Mumbai 400050")).not.toBeInTheDocument();
    });
  });

  describe("3. ContactForm Validation & Interaction", () => {
    it("validates form fields with the validation service", () => {
      // Empty input validation
      const emptyErrors = validateContactForm({
        fullName: "",
        email: "",
        phone: "",
        message: "",
      });
      expect(emptyErrors.fullName).toBeDefined();
      expect(emptyErrors.email).toBeDefined();
      expect(emptyErrors.message).toBeDefined();

      // Invalid email validation
      const invalidEmailErrors = validateContactForm({
        fullName: "Eleanor Vance",
        email: "not-an-email",
        message: "I am interested in the diamond tennis bracelet.",
      });
      expect(invalidEmailErrors.email).toBe("Please enter a valid email address (e.g. name@example.com).");

      // Invalid optional phone (too few digits)
      const invalidPhoneErrors = validateContactForm({
        fullName: "Eleanor Vance",
        email: "eleanor@example.com",
        phone: "123",
        message: "I am interested in the diamond tennis bracelet.",
      });
      expect(invalidPhoneErrors.phone).toBe("Please enter a valid phone number (8–15 digits).");

      // Valid form data
      const validErrors = validateContactForm({
        fullName: "Eleanor Vance",
        email: "eleanor@example.com",
        phone: "+91 98765 43210",
        message: "I would like to inquire about bespoke solitaire rings.",
      });
      expect(Object.keys(validErrors)).toHaveLength(0);
    });

    it("displays inline validation errors when required fields are submitted empty", async () => {
      render(<ContactForm />);

      const submitButton = screen.getByRole("button", { name: "SEND MESSAGE" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Please enter your full name.")).toBeInTheDocument();
        expect(screen.getByText("Please enter your email address.")).toBeInTheDocument();
        expect(screen.getByText("Please share your enquiry or message.")).toBeInTheDocument();
      });
    });

    it("clears error message when user fills valid value into the field", async () => {
      render(<ContactForm />);

      const submitButton = screen.getByRole("button", { name: "SEND MESSAGE" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Please enter your full name.")).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/Full Name/i);
      fireEvent.change(nameInput, { target: { value: "Eleanor Vance" } });

      await waitFor(() => {
        expect(screen.queryByText("Please enter your full name.")).not.toBeInTheDocument();
      });
    });

    it("submits the form to the backend API, displays success confirmation, and resets form", async () => {
      render(<ContactForm />);

      // Fill valid values
      const nameInput = screen.getByLabelText(/Full Name/i);
      const emailInput = screen.getByLabelText(/Email Address/i);
      const phoneInput = screen.getByLabelText(/Phone Number/i);
      const messageInput = screen.getByLabelText(/Message/i);

      fireEvent.change(nameInput, {
        target: { value: "Aarav Sharma" },
      });
      fireEvent.change(emailInput, {
        target: { value: "aarav@example.com" },
      });
      fireEvent.change(phoneInput, {
        target: { value: "+91 98765 43210" },
      });
      fireEvent.change(messageInput, {
        target: { value: "I would like to schedule an appointment for bespoke earrings." },
      });

      const submitButton = screen.getByRole("button", { name: "SEND MESSAGE" });
      fireEvent.click(submitButton);

      // Verifies genuine success confirmation is displayed
      await waitFor(() => {
        expect(
          screen.getByText(/Thank you for contacting us. Our jewellery concierge team will respond shortly./i)
        ).toBeInTheDocument();
      });

      // Verifies form is reset
      expect(nameInput).toHaveValue("");
      expect(emailInput).toHaveValue("");
      expect(phoneInput).toHaveValue("");
      expect(messageInput).toHaveValue("");
    });
  });

  describe("4. Complete ContactPageContent Assembly", () => {
    it("renders both columns in a balanced layout", () => {
      render(<ContactPageContent />);

      // Hero banner
      expect(screen.getByTestId("contact-hero-banner")).toBeInTheDocument();

      // Left Column
      expect(screen.getByText("GET IN TOUCH")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "How Can We Help?" })).toBeInTheDocument();

      // Right Column
      expect(screen.getByRole("heading", { level: 3, name: "Send Us a Message" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "SEND MESSAGE" })).toBeInTheDocument();
    });
  });
});
