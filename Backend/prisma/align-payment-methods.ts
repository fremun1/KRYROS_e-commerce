import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting payment method alignment...');

  // 1. Get all legacy payment methods
  const legacyMethods = await prisma.paymentMethod.findMany();
  
  // 2. Get all checkout methods
  const checkoutMethods = await prisma.checkoutMethod.findMany();

  console.log(`Found ${legacyMethods.length} legacy methods and ${checkoutMethods.length} checkout methods.`);

  // 3. Align legacy methods to new checkout methods
  // For each legacy method, if a checkout method with the same name doesn't exist, create it
  for (const legacy of legacyMethods) {
    const existing = checkoutMethods.find(c => c.name === legacy.name);
    
    if (!existing) {
      console.log(`Creating new checkout method for legacy: ${legacy.name}`);
      
      // Determine type based on name or code
      let type = 'card';
      if (legacy.code.includes('MOBILE') || legacy.name.toLowerCase().includes('money')) type = 'mobile_wallet';
      if (legacy.code.includes('BANK') || legacy.name.toLowerCase().includes('transfer')) type = 'bank';
      if (legacy.name.toLowerCase().includes('whatsapp')) type = 'whatsapp';

      const newMethod = await prisma.checkoutMethod.create({
        data: {
          name: legacy.name,
          type: type,
          isEnabled: legacy.isActive,
          // Note: countryId remains null (Global) by default
        }
      });

      // Create a provider for this method
      await prisma.checkoutProvider.create({
        data: {
          checkoutMethodId: newMethod.id,
          name: legacy.name,
          description: legacy.description || `Legacy ${legacy.name} payment provider`,
          isEnabled: true,
          config: legacy.config || {},
        }
      });
    }
  }

  // 4. Handle Country-Specific Alignment
  // If a legacy method was linked to specific countries, we should create country-specific checkout methods
  const countryLinks = await prisma.countryPaymentMethod.findMany({
    include: {
      country: true,
      paymentMethod: true
    }
  });

  for (const link of countryLinks) {
    console.log(`Aligning ${link.paymentMethod.name} for country ${link.country.code}`);
    
    // Check if a checkout method for this country already exists
    const existing = await prisma.checkoutMethod.findFirst({
      where: {
        name: link.paymentMethod.name,
        countryId: link.countryId
      }
    });

    if (!existing) {
      console.log(`Creating country-specific checkout method for ${link.country.code}`);
      
      let type = 'card';
      if (link.paymentMethod.code.includes('MOBILE') || link.paymentMethod.name.toLowerCase().includes('money')) type = 'mobile_wallet';
      
      const newMethod = await prisma.checkoutMethod.create({
        data: {
          name: link.paymentMethod.name,
          type: type,
          isEnabled: link.isActive,
          countryId: link.countryId
        }
      });

      await prisma.checkoutProvider.create({
        data: {
          checkoutMethodId: newMethod.id,
          name: link.paymentMethod.name,
          isEnabled: true,
          config: link.paymentMethod.config || {},
        }
      });
    }
  }

  console.log('Alignment completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
