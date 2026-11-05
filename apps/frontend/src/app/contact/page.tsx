import type { Metadata } from "next";
import { ContactPageContent } from "@/components/contact/contact-page-content";
import { brandConfig } from "@/config/brand";
import { fetchPublicStoreDetails } from "@/services/store-details-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Contact Us | ${brandConfig.name}`,
  description:
    "We're here to help with your jewellery enquiries. Reach out to the PERALAGAE customer care team for assistance with pieces, custom orders, or purchases.",
  openGraph: {
    title: `Contact Us | ${brandConfig.name}`,
    description:
      "We're here to help with your jewellery enquiries. Reach out to the PERALAGAE customer care team for assistance with pieces, custom orders, or purchases.",
    type: "website",
  },
};

export default async function ContactPage() {
  const storeDetails = await fetchPublicStoreDetails();
  return <ContactPageContent initialStoreDetails={storeDetails} />;
}
