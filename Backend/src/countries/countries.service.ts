import { Injectable, Logger, OnModuleInit, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCountryDto, SymbolPosition } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import axios from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CountriesService implements OnModuleInit {
  private readonly logger = new Logger(CountriesService.name);
  private readonly PRIMARY_EXCHANGE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
  private readonly FALLBACK_EXCHANGE_API = 'https://open.er-api.com/v6/latest/USD';

  private readonly CACHE_TTL = 600000;

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    try {
      // Seed default USD and ZMW if not exists
      await this.seedDefaults();
      // Initial rate update
      await this.updateExchangeRates();
    } catch (error) {
      this.logger.error('Failed to initialize CountriesService. Database tables might be missing.', error.message);
    }
  }

  async seedDefaults() {
    try {
      const usd = await this.prisma.country.findUnique({ where: { code: 'US' } });
      if (!usd) {
        await this.prisma.country.create({
          data: {
            name: 'United States',
            code: 'US',
            currencyCode: 'USD',
            currencySymbol: '$',
            symbolPosition: SymbolPosition.BEFORE,
            exchangeRate: 1.0,
            autoRate: false,
            isDefault: true,
            flag: '🇺🇸',
          },
        });
        this.logger.log('Seeded default country: US');
      }

      const zmw = await this.prisma.country.findUnique({ where: { code: 'ZM' } });
      if (!zmw) {
        const country = await this.prisma.country.create({
          data: {
            name: 'Zambia',
            code: 'ZM',
            currencyCode: 'ZMW',
            currencySymbol: 'ZK',
            symbolPosition: SymbolPosition.BEFORE,
            exchangeRate: 27.2,
            autoRate: true,
            flag: '🇿🇲',
          },
        });

        // Add default payment methods for Zambia
        const defaultMethods = [
          { name: 'MTN Mobile Money', code: 'MTN_ZM' },
          { name: 'Airtel Money', code: 'AIRTEL_ZM' },
          { name: 'Zambian Bank Transfer', code: 'BANK_ZM' },
        ];

        for (const methodData of defaultMethods) {
          const pm = await this.prisma.paymentMethod.upsert({
            where: { code: methodData.code },
            update: {},
            create: {
              name: methodData.name,
              code: methodData.code,
              isActive: true,
            },
          });

          await this.prisma.countryPaymentMethod.upsert({
            where: {
              countryId_paymentMethodId: {
                countryId: country.id,
                paymentMethodId: pm.id,
              },
            },
            update: {},
            create: {
              countryId: country.id,
              paymentMethodId: pm.id,
              isActive: true,
            },
          });
        }
        this.logger.log('Seeded default country: ZM with payment methods');
      }

      return { message: 'Seed completed' };
    } catch (error) {
      this.logger.error('Seed operation failed:', error.message);
      throw new BadRequestException(`Seed failed: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateExchangeRates() {
    this.logger.log('Updating exchange rates (Hourly Cron)...');
    
    let rates = null;
    
    // 1. Try Primary Provider
    try {
      this.logger.log(`Attempting to fetch rates from Primary Provider: ${this.PRIMARY_EXCHANGE_API}`);
      const response = await axios.get(this.PRIMARY_EXCHANGE_API);
      rates = response.data.rates;
    } catch (primaryError) {
      this.logger.error('Primary Provider failed, attempting fallback...', primaryError.message);
      
      // 2. Try Fallback Provider
      try {
        this.logger.log(`Attempting to fetch rates from Fallback Provider: ${this.FALLBACK_EXCHANGE_API}`);
        const response = await axios.get(this.FALLBACK_EXCHANGE_API);
        rates = response.data.rates;
      } catch (fallbackError) {
        this.logger.error('All exchange rate providers failed.', fallbackError.message);
        return { success: false, error: 'All providers failed' };
      }
    }

    if (rates) {
      // Update ALL countries that have a currency code in the rates list
      // This ensures even newly added countries without autoRate: true get an initial rate
      try {
        const allCountries = await this.prisma.country.findMany();
        let updatedCount = 0;

        for (const country of allCountries) {
          // Skip USD as it's the base
          if (country.currencyCode === 'USD') continue;

          const newRate = rates[country.currencyCode];
          if (newRate) {
            await this.prisma.country.update({
              where: { id: country.id },
              data: {
                exchangeRate: parseFloat(newRate.toFixed(4)),
                lastRateUpdate: new Date(),
              },
            });
            updatedCount++;
            this.logger.log(`Updated rate for ${country.currencyCode}: ${newRate}`);
          }
        }
        return { success: true, updated: updatedCount };
      } catch (dbError) {
        this.logger.error('Failed to save updated rates to database', dbError.message);
        return { success: false, error: `Failed to save rates: ${dbError.message}` };
      }
    }
    return { success: false, error: 'No rates data' };
  }

  async create(createCountryDto: CreateCountryDto) {
    const { paymentMethods, ...countryData } = createCountryDto;

    try {
      // Check if country already exists by name or code
      const existing = await this.prisma.country.findFirst({
        where: {
          OR: [
            { name: countryData.name },
            { code: countryData.code },
          ],
        },
      });

      if (existing) {
        throw new BadRequestException(`Country with name "${countryData.name}" or code "${countryData.code}" already exists`);
      }

      // If autoRate is enabled, or rate is 1.0, fetch the initial rate from the API immediately
      let initialRate = countryData.exchangeRate || 1.0;
      if (countryData.autoRate || initialRate === 1.0) {
        try {
          const response = await axios.get(this.PRIMARY_EXCHANGE_API);
          const rate = response.data.rates[countryData.currencyCode];
          if (rate) {
            initialRate = parseFloat(rate.toFixed(4));
            this.logger.log(`Fetched initial rate for ${countryData.currencyCode}: ${initialRate}`);
          }
        } catch (apiError) {
          this.logger.warn(`Failed to fetch initial rate for ${countryData.currencyCode}, using provided/default rate.`, apiError.message);
        }
      }

      const country = await this.prisma.country.create({
        data: {
          ...countryData,
          exchangeRate: initialRate,
          lastRateUpdate: countryData.autoRate ? new Date() : null,
        },
      });

      if (paymentMethods && paymentMethods.length > 0) {
        for (const pmData of paymentMethods) {
          const pm = await this.prisma.paymentMethod.upsert({
            where: { code: pmData.name.toUpperCase().replace(/\s+/g, '_') },
            update: {},
            create: {
              name: pmData.name,
              code: pmData.name.toUpperCase().replace(/\s+/g, '_'),
              isActive: pmData.isActive ?? true,
            },
          });

          await this.prisma.countryPaymentMethod.create({
            data: {
              countryId: country.id,
              paymentMethodId: pm.id,
              isActive: pmData.isActive ?? true,
            },
          });
        }
      }

      return this.findOne(country.id);
    } catch (error) {
      this.logger.error('Error creating country:', error.message);
      throw error;
    }
  }

  async findAll() {
    return this.prisma.country.findMany({
      where: { status: true },
      include: {
        paymentMethods: {
          where: { isActive: true },
        },
      },
      orderBy: { isDefault: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.country.findUnique({
      where: { id },
      include: {
        paymentMethods: true,
      },
    });
  }

  async update(id: string, updateCountryDto: UpdateCountryDto) {
    const { paymentMethods, ...countryData } = updateCountryDto;
    
    // If updating payment methods, it's easier to handle them separately or use a more complex logic
    // For now, let's just update the country fields
    return this.prisma.country.update({
      where: { id },
      data: countryData,
      include: {
        paymentMethods: true,
      },
    });
  }

  async remove(id: string) {
    // Soft delete — preserves states, shipping zones, and payment methods
    return this.prisma.country.update({
      where: { id },
      data: { status: false },
    });
  }

  async addPaymentMethod(countryId: string, data: any) {
    const { name, isActive } = data;
    const pm = await this.prisma.paymentMethod.upsert({
      where: { code: name.toUpperCase().replace(/\s+/g, '_') },
      update: {},
      create: {
        name,
        code: name.toUpperCase().replace(/\s+/g, '_'),
        isActive: isActive ?? true,
      },
    });

    return this.prisma.countryPaymentMethod.create({
      data: {
        countryId,
        paymentMethodId: pm.id,
        isActive: isActive ?? true,
      },
    });
  }

  async updatePaymentMethod(id: string, data: any) {
    return this.prisma.countryPaymentMethod.update({
      where: { id },
      data,
    });
  }

  async removePaymentMethod(id: string) {
    return this.prisma.countryPaymentMethod.delete({
      where: { id },
    });
  }
}
