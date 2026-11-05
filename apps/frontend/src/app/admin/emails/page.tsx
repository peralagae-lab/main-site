import { redirect } from "next/navigation";

/**
 * Admin Emails Page — PERALAGAE
 *
 * Email logs UI has been removed as per production administration cleanup.
 * Preserves core SMTP, transactional notifications, and newsletter emailing.
 * Directs any obsolete navigation safely to the main Admin Dashboard.
 */
export default function AdminEmailsPage() {
  redirect("/admin/dashboard");
  return null;
}
