import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminContactPage from "@/app/admin/contact/page";
import * as contactService from "@/services/contact-service";
import * as adminAuthService from "@/services/admin-auth-service";

const mockEnquiries: contactService.ContactEnquiryRecord[] = [
  {
    id: "enq-1",
    name: "Eleanor Vance",
    email: "eleanor@example.com",
    phone: "+91 98765 43210",
    message: "Interested in bespoke engagement rings.",
    status: "non-contact",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "enq-2",
    name: "Aarav Sharma",
    email: "aarav@example.com",
    phone: null,
    message: "Enquiring about shipping to New Delhi.",
    status: "non-contact",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockContactedEnquiries: contactService.ContactEnquiryRecord[] = [
  {
    id: "enq-3",
    name: "Rohan Mehra",
    email: "rohan@example.com",
    phone: "+91 91234 56789",
    message: "Looking for 22k gold bangles.",
    status: "contact",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("Admin Contact Management Page Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(adminAuthService, "getAdminSession").mockResolvedValue({
      email: "admin@peralagae.com",
      role: "admin",
    });

    vi.spyOn(contactService, "fetchAdminContactEnquiries").mockImplementation(
      async (status) => {
        if (status === "contact") {
          return {
            enquiries: mockContactedEnquiries,
            counts: { newContacts: 2, contacted: 1, total: 3 },
            total: 1,
            page: 1,
            limit: 50,
          };
        }
        return {
          enquiries: mockEnquiries,
          counts: { newContacts: 2, contacted: 1, total: 3 },
          total: 2,
          page: 1,
          limit: 50,
        };
      }
    );

    vi.spyOn(contactService, "updateAdminContactStatus").mockResolvedValue({
      enquiry: { ...mockEnquiries[0], status: "contact" },
      counts: { newContacts: 1, contacted: 2, total: 3 },
    });
  });

  it("renders page title, breadcrumbs, and two tabs with database counts", async () => {
    render(<AdminContactPage />);

    // Header & Breadcrumb
    expect(screen.getByRole("heading", { level: 1, name: "Contact Management" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();

    // Two Tabs with Counts
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /New Contacts/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Contacted/i })).toBeInTheDocument();
      expect(screen.getByText("2", { selector: "span" })).toBeInTheDocument();
      expect(screen.getByText("1", { selector: "span" })).toBeInTheDocument();
    });
  });

  it("displays strictly the 5 required table columns: Name, Email Address, Phone Number, Message, Action", async () => {
    render(<AdminContactPage />);

    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Email Address" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Phone Number" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Message" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Action" })).toBeInTheDocument();
    });

    // Confirms forbidden metadata columns are completely absent
    expect(screen.queryByRole("columnheader", { name: /created date/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /updated date/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /ip address/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /browser/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /source/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /subject/i })).not.toBeInTheDocument();
  });

  it("renders customer records with action dropdown containing strictly 'Non-Contact' and 'Contact'", async () => {
    render(<AdminContactPage />);

    await waitFor(() => {
      expect(screen.getByText("Eleanor Vance")).toBeInTheDocument();
      expect(screen.getByText("eleanor@example.com")).toBeInTheDocument();
      expect(screen.getByText("+91 98765 43210")).toBeInTheDocument();
      expect(screen.getByText("Interested in bespoke engagement rings.")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Status for Eleanor Vance") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("non-contact");

    // Exactly two options
    expect(select.options.length).toBe(2);
    expect(select.options[0].value).toBe("non-contact");
    expect(select.options[0].text).toBe("Non-Contact");
    expect(select.options[1].value).toBe("contact");
    expect(select.options[1].text).toBe("Contact");
  });

  it("switching dropdown to 'Contact' triggers update and removes item from New Contacts", async () => {
    render(<AdminContactPage />);

    await waitFor(() => {
      expect(screen.getByText("Eleanor Vance")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Status for Eleanor Vance");
    fireEvent.change(select, { target: { value: "contact" } });

    // Verifies service was called with 'contact'
    expect(contactService.updateAdminContactStatus).toHaveBeenCalledWith("enq-1", "contact");

    // Optimistically removes row from current tab
    await waitFor(() => {
      expect(screen.queryByText("Eleanor Vance")).not.toBeInTheDocument();
    });
  });

  it("switching tabs displays contacted enquiries", async () => {
    render(<AdminContactPage />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Contacted/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: /Contacted/i }));

    await waitFor(() => {
      expect(contactService.fetchAdminContactEnquiries).toHaveBeenCalledWith("contact", 1, 100);
      expect(screen.getByText("Rohan Mehra")).toBeInTheDocument();
      expect(screen.getByText("rohan@example.com")).toBeInTheDocument();
      expect(screen.getByText("Looking for 22k gold bangles.")).toBeInTheDocument();
    });
  });
});
