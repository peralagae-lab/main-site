import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { validateEnv } from "../src/config/env.js";
import { createApp } from "../src/app.js";
import { MaterialService } from "../src/services/material-service.js";
import { prisma } from "../src/database/prisma.js";

describe("Materials & Storefront Filter Synchronization Integration Test Suite", () => {
  const env = validateEnv();
  const app = createApp(env);

  let adminCookie: string;

  beforeAll(async () => {
    await MaterialService.seedInitialData();
  }, 60000);

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

  describe("1. Admin and Storefront Count Parity & Source of Truth", () => {
    it("Admin assigned-product counts match Storefront materialCounts for all database materials", async () => {
      const cookie = await getAdminCookie();

      // 1. Fetch materials from Admin API
      const adminRes = await request(app)
        .get("/api/v1/materials/admin")
        .set("Cookie", cookie);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);
      const adminMaterials = adminRes.body.data;
      expect(adminMaterials.length).toBeGreaterThanOrEqual(5);

      // 2. Fetch catalogue from Storefront Products API
      const storeRes = await request(app).get("/api/v1/products?pageSize=200");
      expect(storeRes.status).toBe(200);
      expect(storeRes.body.success).toBe(true);

      const { availableMaterials, materialCounts, products } = storeRes.body.data;
      expect(Array.isArray(availableMaterials)).toBe(true);
      expect(materialCounts).toBeDefined();

      // 3. Verify each active material has matching counts between Admin and Storefront
      for (const mat of adminMaterials) {
        if (!mat.isActive) continue;

        // Must be in storefront availableMaterials
        expect(availableMaterials).toContain(mat.name);

        // Storefront count for material name
        const storefrontCount = materialCounts[mat.name] ?? 0;

        // Admin count for material
        const adminCount = mat.productCount;

        // Must match exactly
        expect(adminCount).toBe(storefrontCount);

        // If productCount > 0, filtering by this material must return exactly that number of products
        if (storefrontCount > 0) {
          const filterRes = await request(app).get(`/api/v1/products?materials=${encodeURIComponent(mat.name)}&pageSize=200`);
          expect(filterRes.status).toBe(200);
          expect(filterRes.body.data.total).toBe(storefrontCount);
        }
      }
    });

    it("Zero-product materials appear in storefront availableMaterials with count 0", async () => {
      const cookie = await getAdminCookie();
      const adminRes = await request(app)
        .get("/api/v1/materials/admin")
        .set("Cookie", cookie);

      const zeroMaterials = adminRes.body.data.filter((m: any) => m.isActive && m.productCount === 0);
      if (zeroMaterials.length > 0) {
        const storeRes = await request(app).get("/api/v1/products?pageSize=1");
        const { availableMaterials, materialCounts } = storeRes.body.data;

        for (const zm of zeroMaterials) {
          expect(availableMaterials).toContain(zm.name);
          expect(materialCounts[zm.name]).toBe(0);
        }
      }
    });
  });

  describe("2. Material Lifecycle, Product Association & Deletion Protection", () => {
    let createdMaterialId: string;
    let createdMaterialSlug: string;
    let createdProductId: string;

    const testMaterialName = `Zirconium Sync Test ${Date.now()}`;
    const testProductName = `Sync Test Pendant ${Date.now()}`;

    it("Admin creates a new material and it immediately appears in storefront filters with count 0", async () => {
      const cookie = await getAdminCookie();

      const createRes = await request(app)
        .post("/api/v1/materials/admin")
        .set("Cookie", cookie)
        .send({
          name: testMaterialName,
          description: "Temporary sync test material for validation",
          isActive: true,
          displayOrder: 99,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.name).toBe(testMaterialName);
      createdMaterialId = createRes.body.data.id;
      createdMaterialSlug = createRes.body.data.slug;

      // Storefront must immediately include it in availableMaterials with count 0
      const storeRes = await request(app).get("/api/v1/products?pageSize=1");
      expect(storeRes.status).toBe(200);
      expect(storeRes.body.data.availableMaterials).toContain(testMaterialName);
      expect(storeRes.body.data.materialCounts[testMaterialName]).toBe(0);
    });

    it("Creating a product with the new material updates counts across Admin and Storefront", async () => {
      const cookie = await getAdminCookie();

      // Fetch a valid category
      const catRes = await request(app).get("/api/v1/categories");
      const categoryId = catRes.body.data[0]?.id;
      expect(categoryId).toBeDefined();

      const prodRes = await request(app)
        .post("/api/v1/products/admin")
        .set("Cookie", cookie)
        .send({
          name: testProductName,
          slug: `sync-test-pendant-${Date.now()}`,
          categoryId,
          materialId: createdMaterialId,
          material: testMaterialName,
          materials: [testMaterialName, "Gold"],
          sizes: ["7", "8"],
          priceInr: 45000,
          stockCount: 5,
          inStock: true,
          isAvailable: true,
          imageUrl: "/images/collections/collection-necklaces.jpg",
          description: "Automated test item",
        });

      expect(prodRes.status).toBe(201);
      expect(prodRes.body.success).toBe(true);
      createdProductId = prodRes.body.data.id;

      // Check Admin API productCount for this material
      const adminRes = await request(app)
        .get(`/api/v1/materials/admin/${createdMaterialId}`)
        .set("Cookie", cookie);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.productCount).toBe(1);

      // Check Storefront API productCount for this material
      const storeRes = await request(app).get("/api/v1/products?pageSize=200");
      expect(storeRes.status).toBe(200);
      expect(storeRes.body.data.materialCounts[testMaterialName]).toBe(1);

      // Filtering by this material returns the test product
      const filterRes = await request(app).get(`/api/v1/products?materials=${encodeURIComponent(testMaterialName)}`);
      expect(filterRes.status).toBe(200);
      expect(filterRes.body.data.total).toBe(1);
      expect(filterRes.body.data.products[0].id).toBe(createdProductId);
    });

    it("Combined filters (category + material + price + size) work consistently together", async () => {
      const filterRes = await request(app).get(
        `/api/v1/products?materials=${encodeURIComponent(testMaterialName)}&sizes=7&minPrice=40000&maxPrice=50000`
      );

      expect(filterRes.status).toBe(200);
      expect(filterRes.body.data.total).toBe(1);
      expect(filterRes.body.data.products[0].name).toBe(testProductName);

      // If price does not match, returns 0
      const noMatchRes = await request(app).get(
        `/api/v1/products?materials=${encodeURIComponent(testMaterialName)}&minPrice=60000`
      );
      expect(noMatchRes.status).toBe(200);
      expect(noMatchRes.body.data.total).toBe(0);
    });

    it("Prevents deleting a material when products are still assigned to it", async () => {
      const cookie = await getAdminCookie();

      const deleteRes = await request(app)
        .delete(`/api/v1/materials/admin/${createdMaterialId}`)
        .set("Cookie", cookie);

      expect(deleteRes.status).toBe(409);
      expect(deleteRes.body.success).toBe(false);
      expect(deleteRes.body.error.code).toBe("MATERIAL_IN_USE");
    });

    it("After deleting the test product, the material can be safely deleted", async () => {
      const cookie = await getAdminCookie();

      // 1. Delete test product
      const deleteProdRes = await request(app)
        .delete(`/api/v1/products/admin/${createdProductId}`)
        .set("Cookie", cookie);

      expect(deleteProdRes.status).toBe(200);

      // 2. Material count drops back to 0
      const adminMatRes = await request(app)
        .get(`/api/v1/materials/admin/${createdMaterialId}`)
        .set("Cookie", cookie);

      expect(adminMatRes.body.data.productCount).toBe(0);

      // 3. Delete material now succeeds
      const deleteMatRes = await request(app)
        .delete(`/api/v1/materials/admin/${createdMaterialId}`)
        .set("Cookie", cookie);

      expect(deleteMatRes.status).toBe(200);
      expect(deleteMatRes.body.success).toBe(true);

      // 4. Material no longer exists in Admin or Storefront
      const verifyAdminRes = await request(app)
        .get(`/api/v1/materials/admin/${createdMaterialId}`)
        .set("Cookie", cookie);
      expect(verifyAdminRes.status).toBe(404);

      const verifyStoreRes = await request(app).get("/api/v1/products?pageSize=1");
      expect(verifyStoreRes.body.data.availableMaterials).not.toContain(testMaterialName);
    });
  });
});
