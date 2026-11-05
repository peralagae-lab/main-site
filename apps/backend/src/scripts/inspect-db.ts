import { prisma } from "../lib/prisma.js";

async function inspect() {
  const materials = await prisma.material.findMany({
    orderBy: { order: "asc" },
  });

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      materialId: true,
      material: true,
      materials: true,
      isAvailable: true,
      inStock: true,
    },
  });

  console.log("=== DB MATERIALS (" + materials.length + ") ===");
  for (const m of materials) {
    console.log(`[${m.id}] ${m.name} (slug: ${m.slug}, active: ${m.isActive})`);
  }

  console.log("\n=== DB PRODUCTS (" + products.length + ") ===");
  for (const p of products) {
    console.log(
      `[${p.id}] ${p.name} | materialId: ${p.materialId} | material: "${p.material}" | materials: ${JSON.stringify(p.materials)} | isAvailable: ${p.isAvailable}`
    );
  }

  await prisma.$disconnect();
}

inspect().catch((err) => {
  console.error(err);
  process.exit(1);
});
