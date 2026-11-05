import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { validateEnv } from "../src/config/env.js";
import { createApp } from "../src/app.js";
import { StoreDetailsService } from "../src/services/store-details-service.js";

describe("Store Details (Contact) Management API Test Suite", () => {
  const env = validateEnv();
  const app = createApp(env);

  let adminCookie: string;

  beforeAll(async () => {
    await StoreDetailsService.seedInitialData();
  }, 30000);

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

  describe("1. Public Storefront Endpoints", () => {
    it("GET /api/v1/store-details returns store details without authentication", async () => {
      const res = await request(app).get("/api/v1/store-details");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.phone).toBeDefined();
      expect(res.body.data.address).toBeDefined();
      expect(res.body.data.email).toBeDefined();
      expect(typeof res.body.data.phone).toBe("string");
      expect(typeof res.body.data.address).toBe("string");
      expect(typeof res.body.data.email).toBe("string");
    });

    it("GET /api/store-details and /api/v1/contact aliases return identical data", async () => {
      const res1 = await request(app).get("/api/store-details");
      const res2 = await request(app).get("/api/v1/contact");

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.data.phone).toBe(res2.body.data.phone);
      expect(res1.body.data.email).toBe(res2.body.data.email);
    });
  });

  describe("2. Security and Admin Authorization", () => {
    it("rejects unauthenticated GET /api/v1/store-details/admin with 401", async () => {
      const res = await request(app).get("/api/v1/store-details/admin");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects unauthenticated PUT /api/v1/store-details/admin with 401", async () => {
      const res = await request(app).put("/api/v1/store-details/admin").send({
        phone: "+91 98765 43210",
        address: "123 Regent Street, London",
        email: "concierge@peralagae.com",
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("3. Input Validation (Exactly Three Editable Fields)", () => {
    it("rejects invalid email formats with 400 validation error", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .put("/api/v1/store-details/admin")
        .set("Cookie", cookie)
        .send({
          phone: "+91 98765 43210",
          address: "123 Regent Street, London",
          email: "not-an-email",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects invalid phone numbers with 400 validation error", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .put("/api/v1/store-details/admin")
        .set("Cookie", cookie)
        .send({
          phone: "123", // too short
          address: "123 Regent Street, London",
          email: "concierge@peralagae.com",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects empty address with 400 validation error", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .put("/api/v1/store-details/admin")
        .set("Cookie", cookie)
        .send({
          phone: "+91 98765 43210",
          address: "",
          email: "concierge@peralagae.com",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("4. Admin Updates and Persistence", () => {
    it("allows authenticated admin to update phone, address, and email", async () => {
      const cookie = await getAdminCookie();
      const newDetails = {
        phone: "+91 99887 76655",
        address: "704 Luxury Boulevard, Mumbai, India",
        email: "concierge@peralagaeofficial.com",
      };

      const putRes = await request(app)
        .put("/api/v1/store-details/admin")
        .set("Cookie", cookie)
        .send(newDetails);

      expect(putRes.status).toBe(200);
      expect(putRes.body.success).toBe(true);
      expect(putRes.body.data.phone).toBe(newDetails.phone);
      expect(putRes.body.data.address).toBe(newDetails.address);
      expect(putRes.body.data.email).toBe(newDetails.email);

      // Verify public storefront endpoint immediately returns the updated values
      const publicRes = await request(app).get("/api/v1/store-details");
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.phone).toBe(newDetails.phone);
      expect(publicRes.body.data.address).toBe(newDetails.address);
      expect(publicRes.body.data.email).toBe(newDetails.email);

      // Verify top navbar settings endpoint also immediately returns the synchronized phone number
      const navbarRes = await request(app).get("/api/v1/navbar");
      expect(navbarRes.status).toBe(200);
      expect(navbarRes.body.data.secondNavbar.phone).toBe(newDetails.phone);
    });

    it("restores original baseline settings cleanly", async () => {
      const cookie = await getAdminCookie();
      const baseline = {
        phone: "123 45678 90",
        address: "502 New Design Str, Melbourne, Australia",
        email: "contact@peralagae.com",
      };

      const putRes = await request(app)
        .put("/api/v1/store-details/admin")
        .set("Cookie", cookie)
        .send(baseline);

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.phone).toBe(baseline.phone);
    });
  });
});
