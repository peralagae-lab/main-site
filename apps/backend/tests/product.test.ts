import { describe, it, expect } from "vitest";
import request from "supertest";
import { validateEnv } from "../src/config/env.js";
import { createApp } from "../src/app.js";

describe("Product Catalogue Database-Driven API Test Suite", () => {
  const env = validateEnv();
  const app = createApp(env);

  let adminCookie: string;

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

  describe("1. Public Products Catalogue Endpoint (GET /api/v1/products)", () => {
    it("returns 200 with products list, price bounds, and dynamic category counts from MongoDB", async () => {
      const res = await request(app).get("/api/v1/products");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const { products, total, minCataloguePrice, maxCataloguePrice, categoryCounts } = res.body.data;
      expect(Array.isArray(products)).toBe(true);
      expect(total).toBeGreaterThanOrEqual(20);
      expect(typeof minCataloguePrice).toBe("number");
      expect(typeof maxCataloguePrice).toBe("number");
      expect(maxCataloguePrice).toBeGreaterThan(minCataloguePrice);

      // Verify dynamic category counts are present for all active categories
      expect(categoryCounts).toBeDefined();
      expect(typeof categoryCounts["necklaces"]).toBe("number");
      expect(typeof categoryCounts["rings"]).toBe("number");
    });

    it("filters products correctly by category slug", async () => {
      const res = await request(app).get("/api/v1/products?category=necklaces");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { products, total } = res.body.data;
      expect(total).toBeGreaterThan(0);
      products.forEach((p: any) => {
        expect(p.category.toUpperCase()).toContain("NECKLACE");
      });
    });

    it("returns empty product array for active category with zero products without failing", async () => {
      const listRes = await request(app).get("/api/v1/products");
      const zeroCatSlug = Object.entries(listRes.body.data.categoryCounts).find(([_, count]) => count === 0)?.[0] || "empty-cat-test";
      const res = await request(app).get(`/api/v1/products?category=${zeroCatSlug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { products, total } = res.body.data;
      expect(total).toBe(0);
      expect(products).toEqual([]);
    });

    it("filters products by price range", async () => {
      const res = await request(app).get("/api/v1/products?minPrice=20000&maxPrice=30000");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { products } = res.body.data;
      products.forEach((p: any) => {
        expect(p.priceInr).toBeGreaterThanOrEqual(20000);
        expect(p.priceInr).toBeLessThanOrEqual(30000);
      });
    });

    it("filters products by search keyword", async () => {
      const res = await request(app).get("/api/v1/products?search=solitaire");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { products, total } = res.body.data;
      expect(total).toBeGreaterThan(0);
      products.forEach((p: any) => {
        const matches =
          p.name.toLowerCase().includes("solitaire") ||
          (p.description && p.description.toLowerCase().includes("solitaire")) ||
          p.category.toLowerCase().includes("solitaire");
        expect(matches).toBe(true);
      });
    });

    it("supports sorting by price low-to-high", async () => {
      const res = await request(app).get("/api/v1/products?sort=price-low-to-high");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { products } = res.body.data;
      for (let i = 1; i < products.length; i++) {
        expect(products[i].priceInr).toBeGreaterThanOrEqual(products[i - 1].priceInr);
      }
    });
  });

  describe("2. Single Product Detail Endpoint with Structured Descriptions (GET /api/v1/products/:slugOrId)", () => {
    it("returns 200 with enriched product details, 6 description sections, and dynamic specs", async () => {
      const res = await request(app).get("/api/v1/products/solitaire-diamond-pendant-necklace");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const product = res.body.data;
      expect(product.slug).toBe("solitaire-diamond-pendant-necklace");
      expect(product.name).toBe("Solitaire Diamond Pendant Necklace");
      expect(product.image).toBeDefined();
      expect(product.image.src).toBeDefined();
      expect(Array.isArray(product.images)).toBe(true);
      expect(Array.isArray(product.specs)).toBe(true);
      expect(Array.isArray(product.reviews)).toBe(true);

      // Verify the new 6-section description fields are returned
      expect(typeof product.description).toBe("string");
      expect(typeof product.productOverview).toBe("string");
      if (product.productDetails !== undefined) {
        expect(typeof product.productDetails).toBe("string");
      }
    });

    it("returns 404 for non-existent product slug", async () => {
      const res = await request(app).get("/api/v1/products/non-existent-luxury-item");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("PRODUCT_NOT_FOUND");
    });
  });

  describe("3. Adjacent Products Endpoint (GET /api/v1/products/:slugOrId/adjacent)", () => {
    it("returns prev and next products in catalogue sequence", async () => {
      const res = await request(app).get("/api/v1/products/solitaire-diamond-pendant-necklace/adjacent");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.prev).toBeDefined();
      expect(res.body.data.next).toBeDefined();
    });
  });

  describe("4. Admin Product CRUD Workflows", () => {
    let createdProductId: string;
    const testTimestamp = Date.now();

    it("creates product via POST /api/v1/products/admin with 6 description sections", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .post("/api/v1/products/admin")
        .set("Cookie", cookie)
        .send({
          name: `Imperial Sapphire Choker ${testTimestamp}`,
          priceInr: 345000,
          compareAtPriceInr: 380000,
          inStock: true,
          stockCount: 8,
          description: "An authentic royal sapphire choker handcrafted in 18k solid gold.",
          productOverview: "Inspired by timeless dynasties, each natural sapphire is hand-faceted.",
          productDetails: "Crafted in 18k yellow gold with micro pavé diamond halo frames.",
          careInstructions: "Store inside suede pouch. Keep clear of harsh perfumes.",
          additionalInfo: "Complimentary luxury jewellery vault box and laser assay certificate.",
          specs: [
            { label: "Precious Metal", value: "18k Solid Yellow Gold (750 Purity)" },
            { label: "Gemstone", value: "Natural Ceylon Blue Sapphire" },
          ],
          images: [
            { src: "/images/test-sapphire.jpg", alt: "Imperial Sapphire Choker" },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.productOverview).toContain("Inspired by timeless dynasties");
      expect(res.body.data.productDetails).toContain("Crafted in 18k yellow gold");
      expect(res.body.data.careInstructions).toContain("Store inside suede pouch");

      createdProductId = res.body.data.id;
    });

    it("fetches single product for dedicated edit page via GET /api/v1/products/admin/:id", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .get(`/api/v1/products/admin/${createdProductId}`)
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdProductId);
      expect(res.body.data.name).toContain("Imperial Sapphire Choker");
    });

    it("updates product via PUT /api/v1/products/admin/:id while preserving slug", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .put(`/api/v1/products/admin/${createdProductId}`)
        .set("Cookie", cookie)
        .send({
          priceInr: 360000,
          careInstructions: "Updated care instructions: Clean using gentle silk cloth only.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.priceInr).toBe(360000);
      expect(res.body.data.careInstructions).toContain("Clean using gentle silk cloth only.");
    });

    it("deletes product permanently via DELETE /api/v1/products/admin/:id", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .delete(`/api/v1/products/admin/${createdProductId}`)
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion
      const checkRes = await request(app)
        .get(`/api/v1/products/admin/${createdProductId}`)
        .set("Cookie", cookie);
      expect(checkRes.status).toBe(404);
    });
  });

  describe("5. Storefront Tags & Database-Driven Collections (isNew and isHot)", () => {
    let testProductId: string;
    const uniqueStamp = Date.now();

    it("filters public products by isNew=true correctly from MongoDB", async () => {
      const res = await request(app).get("/api/v1/products?isNew=true");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { products, total } = res.body.data;
      expect(total).toBeGreaterThan(0);
      products.forEach((p: any) => {
        expect(p.isNew).toBe(true);
        expect(p.isAvailable).toBe(true);
      });
    });

    it("filters public products by isHot=true correctly from MongoDB", async () => {
      const res = await request(app).get("/api/v1/products?isHot=true");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { products, total } = res.body.data;
      expect(total).toBeGreaterThan(0);
      products.forEach((p: any) => {
        expect(p.isHot).toBe(true);
        expect(p.isAvailable).toBe(true);
      });
    });

    it("creates a product with both isNew=true and isHot=true and appears in both collections", async () => {
      const cookie = await getAdminCookie();
      const res = await request(app)
        .post("/api/v1/products/admin")
        .set("Cookie", cookie)
        .send({
          name: `Heritage Dual Tagged Bangles ${uniqueStamp}`,
          priceInr: 125000,
          imageUrl: "/uploads/products/bangles-test.jpg",
          inStock: true,
          isNew: true,
          isHot: true,
          description: "Dual-tagged luxury bangles for new arrivals and trending collections.",
          productOverview: "Handcrafted in 18k solid yellow gold with delicate laser filigree.",
          productDetails: "Features a double-safety concealed hinge clasp for daily confidence.",
          careInstructions: "Store in anti-tarnish suede pouch. Clean with dry lint-free cloth.",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isNew).toBe(true);
      expect(res.body.data.isHot).toBe(true);
      testProductId = res.body.data.id;

      // Verify product appears in New Arrivals
      const newRes = await request(app).get("/api/v1/products?isNew=true&pageSize=100");
      expect(newRes.status).toBe(200);
      const foundInNew = newRes.body.data.products.find((p: any) => p.id === testProductId);
      expect(foundInNew).toBeDefined();

      // Verify product appears in Hot / Trending
      const hotRes = await request(app).get("/api/v1/products?isHot=true&pageSize=100");
      expect(hotRes.status).toBe(200);
      const foundInHot = hotRes.body.data.products.find((p: any) => p.id === testProductId);
      expect(foundInHot).toBeDefined();
    });

    it("disables isHot flag and removes product only from Hot / Trending while keeping it in New Arrivals", async () => {
      const cookie = await getAdminCookie();
      const updateRes = await request(app)
        .put(`/api/v1/products/admin/${testProductId}`)
        .set("Cookie", cookie)
        .send({
          isHot: false,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.isHot).toBe(false);
      expect(updateRes.body.data.isNew).toBe(true);

      // Verify removed from Hot
      const hotRes = await request(app).get("/api/v1/products?isHot=true&pageSize=100");
      const foundInHot = hotRes.body.data.products.find((p: any) => p.id === testProductId);
      expect(foundInHot).toBeUndefined();

      // Verify still present in New Arrivals
      const newRes = await request(app).get("/api/v1/products?isNew=true&pageSize=100");
      const foundInNew = newRes.body.data.products.find((p: any) => p.id === testProductId);
      expect(foundInNew).toBeDefined();
    });

    it("does not show unpublished products (isAvailable=false) in public collections even if tagged", async () => {
      const cookie = await getAdminCookie();
      // Set product as unavailable/unpublished
      await request(app)
        .put(`/api/v1/products/admin/${testProductId}`)
        .set("Cookie", cookie)
        .send({
          isAvailable: false,
        });

      // Check New Arrivals collection
      const newRes = await request(app).get("/api/v1/products?isNew=true&pageSize=100");
      const foundInNew = newRes.body.data.products.find((p: any) => p.id === testProductId);
      expect(foundInNew).toBeUndefined();

      // Cleanup: delete the test product
      await request(app)
        .delete(`/api/v1/products/admin/${testProductId}`)
        .set("Cookie", cookie);
    });
  });
});
