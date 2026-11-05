import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { validateEnv } from "../src/config/env.js";
import { createApp } from "../src/app.js";
import { prisma } from "../src/database/prisma.js";

describe("Customer Contact Enquiry Management API Test Suite", () => {
  const env = validateEnv();
  const app = createApp(env);

  let adminCookie: string;
  let testEnquiryId: string;

  async function getAdminCookie(): Promise<string> {
    if (adminCookie) return adminCookie;
    const loginRes = await request(app).post("/api/admin/auth/login").send({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
    });
    const setCookie = loginRes.headers["set-cookie"];
    adminCookie = Array.isArray(setCookie) ? setCookie[0] : (setCookie as string);
    return adminCookie;
  }

  describe("1. Public Form Submission (POST /api/v1/contact)", () => {
    it("successfully creates a new contact enquiry with default 'non-contact' status", async () => {
      const payload = {
        fullName: "Lady Eleanor Vance",
        email: "eleanor.vance@example.com",
        phone: "+91 98765 43210",
        message: "I would like to enquire about bespoke bridal necklace sizing.",
      };

      const res = await request(app).post("/api/v1/contact").send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe("Lady Eleanor Vance");
      expect(res.body.data.email).toBe("eleanor.vance@example.com");
      expect(res.body.data.phone).toBe("+91 98765 43210");
      expect(res.body.data.message).toBe("I would like to enquire about bespoke bridal necklace sizing.");
      expect(res.body.data.status).toBe("non-contact");

      testEnquiryId = res.body.data.id;
    });

    it("rejects submission with missing required full name", async () => {
      const res = await request(app).post("/api/v1/contact").send({
        email: "no-name@example.com",
        message: "Hello PERALAGAE team.",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/name/i);
    });

    it("rejects submission with invalid email format", async () => {
      const res = await request(app).post("/api/v1/contact").send({
        fullName: "Test User",
        email: "not-an-email",
        message: "Hello PERALAGAE team.",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/email/i);
    });

    it("rejects submission with message shorter than 5 characters", async () => {
      const res = await request(app).post("/api/v1/contact").send({
        fullName: "Test User",
        email: "valid@example.com",
        message: "Hi",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("2. Admin Enquiry Retrieval & Filtering (GET /api/v1/contact)", () => {
    it("rejects unauthenticated admin enquiry queries with 401", async () => {
      const res = await request(app).get("/api/v1/contact?status=non-contact");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("allows authenticated admin to retrieve enquiries and counts", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .get("/api/v1/contact?status=non-contact")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.counts).toBeDefined();
      expect(typeof res.body.counts.newContacts).toBe("number");
      expect(typeof res.body.counts.contacted).toBe("number");

      // All returned records must have status 'non-contact'
      res.body.data.forEach((item: { status: string }) => {
        expect(item.status).toBe("non-contact");
      });
    });

    it("GET /api/v1/contact/counts returns live database counts", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .get("/api/v1/contact/counts")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.newContacts).toBe("number");
      expect(typeof res.body.data.contacted).toBe("number");
      expect(typeof res.body.data.total).toBe("number");
    });
  });

  describe("3. Status Update Lifecycle (PATCH /api/v1/contact/:id/status)", () => {
    it("rejects unauthenticated status update with 401", async () => {
      const res = await request(app)
        .patch(`/api/v1/contact/${testEnquiryId}/status`)
        .send({ status: "contact" });

      expect(res.status).toBe(401);
    });

    it("rejects unauthorized status values like 'pending' or 'resolved'", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .patch(`/api/v1/contact/${testEnquiryId}/status`)
        .set("Cookie", cookie)
        .send({ status: "pending" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("updates status from 'non-contact' to 'contact'", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .patch(`/api/v1/contact/${testEnquiryId}/status`)
        .set("Cookie", cookie)
        .send({ status: "contact" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("contact");

      // Verify in database directly
      const inDb = await prisma.contactEnquiry.findUnique({ where: { id: testEnquiryId } });
      expect(inDb?.status).toBe("contact");
    });

    it("updates status back from 'contact' to 'non-contact'", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .patch(`/api/v1/contact/${testEnquiryId}/status`)
        .set("Cookie", cookie)
        .send({ status: "non-contact" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("non-contact");

      // Verify in database directly
      const inDb = await prisma.contactEnquiry.findUnique({ where: { id: testEnquiryId } });
      expect(inDb?.status).toBe("non-contact");
    });
  });

  afterAll(async () => {
    // Cleanup test record
    if (testEnquiryId) {
      await prisma.contactEnquiry.deleteMany({ where: { id: testEnquiryId } });
    }
  });
});
