import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding checkout payment configuration...');

  // ── 1. Mobile Money ──────────────────────────────────────────────────────
  const mobile = await prisma.checkoutMethod.upsert({
    where: { id: 'seed-mobile' },
    update: {},
    create: {
      id: 'seed-mobile',
      name: 'Mobile Money',
      type: 'mobile_wallet',
      sortOrder: 0,
      isEnabled: true,
    },
  });

  const provider543 = await prisma.checkoutProvider.upsert({
    where: { id: 'seed-543' },
    update: {},
    create: {
      id: 'seed-543',
      checkoutMethodId: mobile.id,
      name: '543',
      description: 'cGrate / 543 Mobile Money',
      sortOrder: 0,
      isEnabled: true,
    },
  });

  for (const [i, name] of ['MTN', 'Airtel', 'Zamtel'].entries()) {
    await prisma.checkoutNetwork.upsert({
      where: { id: `seed-net-${name.toLowerCase()}` },
      update: {},
      create: {
        id: `seed-net-${name.toLowerCase()}`,
        providerId: provider543.id,
        name,
        sortOrder: i,
        isEnabled: true,
      },
    });
  }
  console.log('  ✔ Mobile Money (543: MTN, Airtel, Zamtel)');

  // ── 2. Credit/Debit Card ─────────────────────────────────────────────────
  await prisma.checkoutMethod.upsert({
    where: { id: 'seed-card' },
    update: {},
    create: {
      id: 'seed-card',
      name: 'Credit/Debit Card',
      type: 'card',
      sortOrder: 1,
      isEnabled: true,
    },
  });
  console.log('  ✔ Credit/Debit Card');

  // ── 3. Bank Transfer (Stanbic Bank — the hardcoded account extracted) ────
  const bank = await prisma.checkoutMethod.upsert({
    where: { id: 'seed-bank' },
    update: {},
    create: {
      id: 'seed-bank',
      name: 'Bank Transfer',
      type: 'bank',
      sortOrder: 2,
      isEnabled: true,
    },
  });

  await prisma.checkoutProvider.upsert({
    where: { id: 'seed-stanbic' },
    update: {},
    create: {
      id: 'seed-stanbic',
      checkoutMethodId: bank.id,
      name: 'Stanbic Bank Zambia',
      sortOrder: 0,
      isEnabled: true,
      config: {
        accountName: 'KRYROS LIMITED',
        accountNumber: '91200012345667',
      },
    },
  });
  console.log('  ✔ Bank Transfer (Stanbic Bank Zambia - KRYROS LIMITED)');

  // ── 4. Cash on Delivery ──────────────────────────────────────────────────
  await prisma.checkoutMethod.upsert({
    where: { id: 'seed-cash' },
    update: {},
    create: {
      id: 'seed-cash',
      name: 'Cash on Delivery',
      type: 'cash',
      sortOrder: 3,
      isEnabled: true,
    },
  });
  console.log('  ✔ Cash on Delivery');

  // ── 5. PayPal (disabled by default) ─────────────────────────────────────
  await prisma.checkoutMethod.upsert({
    where: { id: 'seed-paypal' },
    update: {},
    create: {
      id: 'seed-paypal',
      name: 'PayPal',
      type: 'digital_wallet',
      sortOrder: 4,
      isEnabled: false,
    },
  });
  console.log('  ✔ PayPal (disabled)');

  // ── 6. Default Credit Plans ──────────────────────────────────────────────
  const creditPlans = [
    {
      id: 'seed-plan-3',
      name: 'Pay in 3 Months',
      duration: 3,
      interestRate: 0,
      minimumAmount: 100,
      maximumAmount: 10000,
      isActive: true,
      description: 'Spread your payment over 3 months with 0% interest.',
    },
    {
      id: 'seed-plan-6',
      name: 'Pay in 6 Months',
      duration: 6,
      interestRate: 5,
      minimumAmount: 500,
      maximumAmount: 20000,
      isActive: true,
      description: 'Flexible 6-month plan with low interest.',
    },
    {
      id: 'seed-plan-12',
      name: 'Pay in 12 Months',
      duration: 12,
      interestRate: 10,
      minimumAmount: 1000,
      maximumAmount: 50000,
      isActive: true,
      description: 'Long-term 12-month financing plan.',
    },
  ];

  for (const plan of creditPlans) {
    await prisma.creditPlan.upsert({
      where: { id: plan.id },
      update: {},
      create: plan,
    });
  }
  console.log('  ✔ Default Credit Plans seeded');

  console.log('\n✅ All configurations seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
