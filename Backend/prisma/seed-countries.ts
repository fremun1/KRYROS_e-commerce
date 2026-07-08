import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const countries = [
  { name: 'Nigeria', code: 'NG', currencyCode: 'NGN', currencySymbol: '₦', flag: '🇳🇬' },
  { name: 'Zambia', code: 'ZM', currencyCode: 'ZMW', currencySymbol: 'K', flag: '🇿🇲' },
  { name: 'United States', code: 'US', currencyCode: 'USD', currencySymbol: '$', flag: '🇺🇸' },
  { name: 'Kenya', code: 'KE', currencyCode: 'KES', currencySymbol: 'KSh', flag: '🇰🇪' },
  { name: 'Ghana', code: 'GH', currencyCode: 'GHS', currencySymbol: 'GH₵', flag: '🇬🇭' },
  { name: 'South Africa', code: 'ZA', currencyCode: 'ZAR', currencySymbol: 'R', flag: '🇿🇦' },
  { name: 'United Kingdom', code: 'GB', currencyCode: 'GBP', currencySymbol: '£', flag: '🇬🇧' },
  { name: 'Uganda', code: 'UG', currencyCode: 'UGX', currencySymbol: 'USh', flag: '🇺🇬' },
  { name: 'Tanzania', code: 'TZ', currencyCode: 'TZS', currencySymbol: 'TSh', flag: '🇹🇿' },
  { name: 'Rwanda', code: 'RW', currencyCode: 'RWF', currencySymbol: 'RF', flag: '🇷🇼' },
  { name: 'Botswana', code: 'BW', currencyCode: 'BWP', currencySymbol: 'P', flag: '🇧🇼' },
  { name: 'Malawi', code: 'MW', currencyCode: 'MWK', currencySymbol: 'MK', flag: '🇲🇼' },
  { name: 'Zimbabwe', code: 'ZW', currencyCode: 'ZWL', currencySymbol: 'Z$', flag: '🇿🇼' },
  { name: 'Angola', code: 'AO', currencyCode: 'AOA', currencySymbol: 'Kz', flag: '🇦🇴' },
  { name: 'Mozambique', code: 'MZ', currencyCode: 'MZN', currencySymbol: 'MT', flag: '🇲🇿' },
  // Adding more common countries...
  { name: 'Canada', code: 'CA', currencyCode: 'CAD', currencySymbol: 'C$', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', currencyCode: 'AUD', currencySymbol: 'A$', flag: '🇦🇺' },
  { name: 'Germany', code: 'DE', currencyCode: 'EUR', currencySymbol: '€', flag: '🇩🇪' },
  { name: 'France', code: 'FR', currencyCode: 'EUR', currencySymbol: '€', flag: '🇫🇷' },
  { name: 'China', code: 'CN', currencyCode: 'CNY', currencySymbol: '¥', flag: '🇨🇳' },
  { name: 'India', code: 'IN', currencyCode: 'INR', currencySymbol: '₹', flag: '🇮🇳' },
  { name: 'United Arab Emirates', code: 'AE', currencyCode: 'AED', currencySymbol: 'د.إ', flag: '🇦🇪' },
];

async function main() {
  console.log('Seeding countries...');
  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: {
        name: country.name,
        code: country.code,
        currencyCode: country.currencyCode,
        currencySymbol: country.currencySymbol,
        flag: country.flag,
        exchangeRate: 1.0,
        status: false, // Disabled by default as requested
        isDefault: country.code === 'US',
      },
    });
  }
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
