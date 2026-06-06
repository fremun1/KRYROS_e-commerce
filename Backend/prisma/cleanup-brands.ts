import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up corrupted brand data...');
  
  // 1. Update all products to remove brandId references
  const updatedProducts = await prisma.product.updateMany({
    data: {
      brandId: null
    }
  });
  console.log(`Updated ${updatedProducts.count} products to remove brand references.`);

  // 2. Delete all brands (they might have corrupted IDs)
  // We use raw query because prisma.brand.deleteMany() might fail if the IDs are inconsistent
  try {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "brands" RESTART IDENTITY CASCADE;');
    console.log('Truncated brands table and reset identity.');
  } catch (e) {
    console.error('Failed to truncate brands table with raw SQL, trying deleteMany...');
    const deletedBrands = await prisma.brand.deleteMany({});
    console.log(`Deleted ${deletedBrands.count} brands.`);
  }

  console.log('Cleanup complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
