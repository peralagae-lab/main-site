import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { z } from "zod";
import { ProductService, type ProductFilterInput } from "../services/product-service.js";
import { ProductMediaService } from "../services/product-media-service.js";
import { createAdminAuthMiddleware } from "../middleware/admin-auth.js";
import { logger } from "../utils/logger.js";
import type { EnvConfig } from "../config/env.js";

// Upload destinations for products
const BACKEND_UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "products");
const FRONTEND_UPLOADS_DIR = path.resolve(process.cwd(), "..", "frontend", "public", "uploads", "products");

// Ensure upload directories exist
for (const dir of [BACKEND_UPLOADS_DIR, FRONTEND_UPLOADS_DIR]) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Directory might be external or relative path differs in test
  }
}

// Multer storage for product images
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(BACKEND_UPLOADS_DIR)) {
      fs.mkdirSync(BACKEND_UPLOADS_DIR, { recursive: true });
    }
    cb(null, BACKEND_UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const uniqueId = crypto.randomBytes(12).toString("hex");
    cb(null, `prod-${Date.now()}-${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed."));
    }
  },
});

function validateImageMagicBytes(filePath: string): boolean {
  try {
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return true;
    }

    // WebP: RIFF ... WEBP
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    if (riff === "RIFF" && webp === "WEBP") {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(150, "Product name must not exceed 150 characters"),
  slug: z.string().trim().max(150).optional(),
  categoryId: z.string().trim().nullable().optional(),
  categoryKey: z.string().trim().nullable().optional(),
  priceInr: z.number().min(0, "Price must be greater than or equal to 0"),
  compareAtPriceInr: z.number().nullable().optional(),
  inStock: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  stockCount: z.number().int().min(0).optional(),
  imageUrl: z.string().trim().optional(),
  imageAlt: z.string().trim().optional(),
  images: z
    .array(
      z.union([
        z.string(),
        z.object({
          src: z.string(),
          alt: z.string().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
        }),
      ])
    )
    .optional(),
  description: z.string().trim().optional(),
  productOverview: z.string().trim().optional(),
  productDetails: z.string().trim().optional(),
  careInstructions: z.string().trim().optional(),
  additionalInfo: z.string().trim().optional(),
  descriptionParagraph1: z.string().trim().optional(),
  descriptionParagraph2: z.string().trim().optional(),
  specs: z
    .array(
      z.object({
        label: z.string().optional(),
        name: z.string().optional(),
        value: z.string(),
      })
    )
    .optional(),
  materialId: z.string().trim().nullable().optional(),
  material: z.string().trim().optional(),
  materials: z.array(z.string()).optional(),
  isHot: z.boolean().optional(),
  isNew: z.boolean().optional(),
});

const updateProductSchema = createProductSchema.partial();

export function createProductRouter(env: EnvConfig): Router {
  const router = Router();
  const adminAuth = createAdminAuthMiddleware(env);

  // ── Protected Admin Endpoints ─────────────────────────────────────────────
  // (Note: defined before /:slugOrId to prevent "admin" from being interpreted as a slug)

  /**
   * GET /api/v1/products/admin/list
   * Returns paginated products for admin management with filters and total count.
   */
  router.get("/admin/list", adminAuth, async (req: Request, res: Response) => {
    try {
      const { search, category, inStock, page, pageSize } = req.query;
      const result = await ProductService.getAllAdminProducts({
        search: typeof search === "string" ? search : undefined,
        categoryId: typeof category === "string" ? category : undefined,
        inStock: inStock === "true" ? true : inStock === "false" ? false : undefined,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: unknown) {
      logger.error({ err }, "Failed to fetch admin products list");
      return res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve products list" },
      });
    }
  });

  /**
   * GET /api/v1/products/admin/:id
   * Retrieves single product detail by ID for admin editing.
   */
  router.get("/admin/:id", adminAuth, async (req: Request, res: Response) => {
    try {
      const id = req.params["id"];
      if (typeof id !== "string" || !id) {
        return res.status(400).json({
          success: false,
          error: { code: "BAD_REQUEST", message: "Product ID is required" },
        });
      }

      const product = await ProductService.getProductBySlugOrId(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Product with ID "${id}" not found` },
        });
      }

      return res.status(200).json({
        success: true,
        data: product,
      });
    } catch (err) {
      logger.error({ err }, "Failed to fetch admin product detail");
      return res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve product detail" },
      });
    }
  });

  /**
   * POST /api/v1/products/admin/upload-image
   * Handles single product image upload with validation and MongoDB storage.
   */
  router.post(
    "/admin/upload-image",
    adminAuth,
    (req: Request, res: Response) => {
      upload.single("image")(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              error: { code: "FILE_TOO_LARGE", message: "Image exceeds 5MB size limit" },
            });
          }
          return res.status(400).json({
            success: false,
            error: { code: "UPLOAD_ERROR", message: err.message },
          });
        } else if (err) {
          return res.status(400).json({
            success: false,
            error: { code: "INVALID_FILE_TYPE", message: err.message },
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: { code: "NO_FILE", message: "No image file provided" },
          });
        }

        // Validate image magic bytes
        const isAuthentic = validateImageMagicBytes(req.file.path);
        if (!isAuthentic) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {}
          return res.status(400).json({
            success: false,
            error: {
              code: "INVALID_IMAGE_CONTENT",
              message: "Uploaded file content does not match genuine image magic bytes",
            },
          });
        }

        // Copy to frontend public directory if accessible
        try {
          if (fs.existsSync(FRONTEND_UPLOADS_DIR)) {
            const destPath = path.join(FRONTEND_UPLOADS_DIR, req.file.filename);
            fs.copyFileSync(req.file.path, destPath);
          }
        } catch {}

        // Persist raw binary to MongoDB for durable availability
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          await ProductMediaService.saveAsset(req.file.filename, req.file.mimetype, fileBuffer);
        } catch (dbErr) {
          logger.warn({ dbErr }, "Failed to persist product image to MongoDB");
        }

        const relativeUrl = `/uploads/products/${req.file.filename}`;
        return res.status(200).json({
          success: true,
          data: {
            url: relativeUrl,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
          },
        });
      });
    }
  );

  /**
   * POST /api/v1/products/admin/upload-images
   * Handles multiple product images upload simultaneously.
   */
  router.post(
    "/admin/upload-images",
    adminAuth,
    (req: Request, res: Response) => {
      upload.array("images", 50)(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              error: { code: "FILE_TOO_LARGE", message: "One or more images exceed 5MB size limit" },
            });
          }
          return res.status(400).json({
            success: false,
            error: { code: "UPLOAD_ERROR", message: err.message },
          });
        } else if (err) {
          return res.status(400).json({
            success: false,
            error: { code: "INVALID_FILE_TYPE", message: err.message },
          });
        }

        const files = req.files as Express.Multer.File[] | undefined;
        if (!files || files.length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: "NO_FILES", message: "No image files provided" },
          });
        }

        const uploadedResults: Array<{ url: string; filename: string; mimetype: string; size: number }> = [];

        for (const file of files) {
          if (!validateImageMagicBytes(file.path)) {
            try {
              fs.unlinkSync(file.path);
            } catch {}
            continue;
          }

          try {
            if (fs.existsSync(FRONTEND_UPLOADS_DIR)) {
              const destPath = path.join(FRONTEND_UPLOADS_DIR, file.filename);
              fs.copyFileSync(file.path, destPath);
            }
          } catch {}

          try {
            const fileBuffer = fs.readFileSync(file.path);
            await ProductMediaService.saveAsset(file.filename, file.mimetype, fileBuffer);
          } catch (dbErr) {
            logger.warn({ dbErr }, "Failed to persist product image to MongoDB");
          }

          uploadedResults.push({
            url: `/uploads/products/${file.filename}`,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
          });
        }

        return res.status(200).json({
          success: true,
          data: uploadedResults,
        });
      });
    }
  );

  /**
   * POST /api/v1/products/admin
   * Creates a new product in MongoDB.
   */
  router.post("/admin", adminAuth, async (req: Request, res: Response) => {
    const parseResult = createProductSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.errors[0]?.message || "Invalid product data",
        },
      });
    }

    try {
      const created = await ProductService.createProduct(parseResult.data);
      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create product";
      logger.error({ err }, "Error creating product");
      return res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: msg },
      });
    }
  });

  /**
   * PUT /api/v1/products/admin/:id
   * Updates an existing product in MongoDB.
   */
  router.put("/admin/:id", adminAuth, async (req: Request, res: Response) => {
    const id = req.params["id"];
    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        success: false,
        error: { code: "BAD_REQUEST", message: "Product ID is required" },
      });
    }

    const parseResult = updateProductSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.errors[0]?.message || "Invalid update data",
        },
      });
    }

    try {
      const updated = await ProductService.updateProduct(id, parseResult.data);
      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update product";
      if (msg.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: msg },
        });
      }
      logger.error({ err, id }, "Error updating product");
      return res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: msg },
      });
    }
  });

  /**
   * DELETE /api/v1/products/admin/:id
   * Permanently deletes product from MongoDB.
   */
  router.delete("/admin/:id", adminAuth, async (req: Request, res: Response) => {
    const id = req.params["id"];
    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        success: false,
        error: { code: "BAD_REQUEST", message: "Product ID is required" },
      });
    }

    try {
      const result = await ProductService.deleteProduct(id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete product";
      if (msg.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: msg },
        });
      }
      logger.error({ err, id }, "Error deleting product");
      return res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: msg },
      });
    }
  });

  // ── Public Storefront Endpoints ───────────────────────────────────────────

  /**
   * GET /api/v1/products
   * Retrieves paginated products with filters, sorting, and dynamic category counts
   * backed by MongoDB.
   */
  router.get("/", async (req: Request, res: Response) => {
    try {
      const {
        category,
        search,
        minPrice,
        maxPrice,
        material,
        materials,
        sort,
        page,
        pageSize,
        isNew,
        isHot,
        isAvailable,
      } = req.query;

      const filters: ProductFilterInput = {
        category: typeof category === "string" ? category : undefined,
        search: typeof search === "string" ? search : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        material: typeof material === "string" ? material : undefined,
        materials: Array.isArray(materials)
          ? (materials as string[])
          : typeof materials === "string"
          ? materials.split(",")
          : undefined,
        sort: typeof sort === "string" ? sort : undefined,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        isNew: isNew === "true" ? true : isNew === "false" ? false : undefined,
        isHot: isHot === "true" ? true : isHot === "false" ? false : undefined,
        isAvailable: isAvailable === "true" ? true : isAvailable === "false" ? false : undefined,
      };

      const result = await ProductService.getProducts(filters);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      logger.error({ err }, "Failed to fetch products from database");
      return res.status(500).json({
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to retrieve products from database",
        },
      });
    }
  });

  /**
   * GET /api/v1/products/:slugOrId
   * Retrieves single product detail by slug or ID.
   */
  router.get("/:slugOrId", async (req: Request, res: Response) => {
    try {
      const slugParam = req.params["slugOrId"];
      const slugOrId = Array.isArray(slugParam) ? slugParam[0] : slugParam;
      if (typeof slugOrId !== "string" || !slugOrId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAM",
            message: "Product slug or ID parameter is required",
          },
        });
      }

      const product = await ProductService.getProductBySlugOrId(slugOrId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: `Product with slug or ID '${slugOrId}' not found`,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: product,
      });
    } catch (err) {
      logger.error({ err }, "Failed to fetch product detail from database");
      return res.status(500).json({
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to retrieve product detail from database",
        },
      });
    }
  });

  /**
   * GET /api/v1/products/:slugOrId/adjacent
   * Retrieves adjacent products for product detail page navigation.
   */
  router.get("/:slugOrId/adjacent", async (req: Request, res: Response) => {
    try {
      const slugParam = req.params["slugOrId"];
      const slugOrId = Array.isArray(slugParam) ? slugParam[0] : slugParam;
      if (typeof slugOrId !== "string" || !slugOrId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAM",
            message: "Product slug or ID parameter is required",
          },
        });
      }

      const adjacent = await ProductService.getAdjacentProducts(slugOrId);
      if (!adjacent) {
        return res.status(404).json({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: `Adjacent products for '${slugOrId}' not found`,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: adjacent,
      });
    } catch (err) {
      logger.error({ err }, "Failed to fetch adjacent products from database");
      return res.status(500).json({
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to retrieve adjacent products from database",
        },
      });
    }
  });

  /**
   * GET /api/v1/products/:slugOrId/related
   * Retrieves dynamically related active in-stock products based on category/material.
   */
  router.get("/:slugOrId/related", async (req: Request, res: Response) => {
    try {
      const slugParam = req.params["slugOrId"];
      const slugOrId = Array.isArray(slugParam) ? slugParam[0] : slugParam;
      if (typeof slugOrId !== "string" || !slugOrId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAM",
            message: "Product slug or ID parameter is required",
          },
        });
      }

      const limit = Number(req.query["limit"]) || 4;
      const related = await ProductService.getRelatedProducts(slugOrId, limit);
      return res.status(200).json({
        success: true,
        data: related,
      });
    } catch (err) {
      logger.error({ err }, "Failed to fetch related products from database");
      return res.status(500).json({
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to retrieve related products",
        },
      });
    }
  });

  return router;
}
