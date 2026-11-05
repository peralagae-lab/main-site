import { prisma } from "../database/prisma.js";

async function main() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: {
      products: {
        where: { isAvailable: true },
        select: { id: true },
      },
    },
  });

  console.log("=== CATEGORIES & ACTIVE PRODUCT COUNTS ===");
  for (const c of categories) {
    console.log(`- ${c.name} (slug: ${c.slug}, id: ${c.id}, active: ${c.isActive}) -> ${c.products.length} active products`);
  }

  const products = await prisma.product.findMany({
    where: { isAvailable: true },
    include: {
      category: true,
      materialRef: true,
    },
  });

  console.log("\n=== TOTAL ACTIVE PRODUCTS ===", products.length);

  const materialsSet = new Set<string>();
  const sizesSet = new Set<string>();
  const prices: number[] = [];

  for (const p of products) {
    if (typeof p.priceInr === "number") prices.push(p.priceInr);

    if (p.materialRef?.name) materialsSet.add(p.materialRef.name);
    if (p.material) materialsSet.add(p.material);
    if (Array.isArray(p.materials)) {
      (p.materials as string[]).forEach((m) => {
        if (m && typeof m === "string") materialsSet.add(m.trim());
      });
    }
  }

  console.log("\n=== MATERIALS FOUND IN PRODUCTS ===", Array.from(materialsSet));
  console.log(`\n=== PRICE LIMITS === Min: ₹${Math.min(...prices)}, Max: ₹${Math.max(...prices)}`);

  // Also check admin Material definitions
  const dbMaterials = await prisma.material.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
  console.log("\n=== DB MATERIALS (ADMIN) ===", dbMaterials.map((m) => m.name));
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
