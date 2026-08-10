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
  private readonly DEFAULT_PRIMARY_EXCHANGE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
  private readonly DEFAULT_FALLBACK_EXCHANGE_API = 'https://open.er-api.com/v6/latest/USD';

  private readonly CACHE_TTL = 600000;

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private readonly COUNTRIES_LIST_CACHE_KEY = '/api/countries';

  private async invalidateCountriesCache() {
    await this.cacheManager.del(this.COUNTRIES_LIST_CACHE_KEY);
  }

  async onModuleInit() {
    try {
      // Seed default exchange rate config if not exists
      await this.seedExchangeRateConfig();
      // Seed default USD and ZMW if not exists
      await this.seedDefaults();
      // Initial rate update
      await this.updateExchangeRates();
    } catch (error) {
      this.logger.error('Failed to initialize CountriesService. Database tables might be missing.', error.message);
    }
  }

  async seedExchangeRateConfig() {
    try {
      const existingConfig = await this.prisma.exchangeRateConfig.findFirst();
      if (!existingConfig) {
        await this.prisma.exchangeRateConfig.create({
          data: {
            providerName: 'exchangerate-api',
            primaryApiUrl: this.DEFAULT_PRIMARY_EXCHANGE_API,
            fallbackApiUrl: this.DEFAULT_FALLBACK_EXCHANGE_API,
            isActive: true,
            updateInterval: 3600000, // 1 hour
          },
        });
        this.logger.log('Seeded default exchange rate config');
      }
    } catch (error) {
      this.logger.error('Failed to seed exchange rate config:', error.message);
    }
  }

  async seedDefaults() {
    try {
      const existingDefault = await this.prisma.country.findFirst({
        where: { isDefault: true },
      });
      
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
            isDefault: !existingDefault,
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

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateExchangeRates() {
    // Get exchange rate configuration from database
    const config = await this.prisma.exchangeRateConfig.findFirst({
      where: { isActive: true }
    });

    if (!config) return;

    // Check if enough time has passed since last update based on updateInterval
    const now = new Date();
    const lastUpdate = config.lastUpdate ? new Date(config.lastUpdate) : new Date(0);
    const intervalMs = config.updateInterval || 3600000; // Default 1 hour

    if (now.getTime() - lastUpdate.getTime() < intervalMs) {
      // Not enough time passed, skip
      return;
    }

    this.logger.log(`Updating exchange rates (Dynamic Interval: ${intervalMs}ms)...`);

    const primaryApiUrl = config?.primaryApiUrl || this.DEFAULT_PRIMARY_EXCHANGE_API;
    const fallbackApiUrl = config?.fallbackApiUrl || this.DEFAULT_FALLBACK_EXCHANGE_API;
    
    let rates = null;
    
    // 1. Try Primary Provider
    try {
      this.logger.log(`Attempting to fetch rates from Primary Provider: ${primaryApiUrl}`);
      const response = await axios.get(primaryApiUrl);
      rates = response.data.rates;
      
      // Update last update timestamp
      if (config) {
        await this.prisma.exchangeRateConfig.update({
          where: { id: config.id },
          data: { lastUpdate: new Date() }
        });
      }
    } catch (primaryError) {
      this.logger.error('Primary Provider failed, attempting fallback...', primaryError.message);
      
      // 2. Try Fallback Provider
      try {
        this.logger.log(`Attempting to fetch rates from Fallback Provider: ${fallbackApiUrl}`);
        const response = await axios.get(fallbackApiUrl);
        rates = response.data.rates;
        
        // Update last update timestamp
        if (config) {
          await this.prisma.exchangeRateConfig.update({
            where: { id: config.id },
            data: { lastUpdate: new Date() }
          });
        }
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

          let newRate = rates[country.currencyCode];
          if (newRate) {
            // Apply markup if configured
            if (config?.rateMarkup && config.rateMarkup > 0) {
              const markupMultiplier = 1 + (config.rateMarkup / 100);
              newRate = newRate * markupMultiplier;
            }

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

        await this.invalidateCountriesCache();
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
      // Check if country already exists by name or code AND is active
      const existing = await this.prisma.country.findFirst({
        where: {
          status: true, // Only check active countries
          OR: [
            { name: countryData.name },
            { code: countryData.code },
          ],
        },
      });

      if (existing) {
        throw new BadRequestException(`Country with name "${countryData.name}" or code "${countryData.code}" already exists`);
      }

      // If a soft-deleted country with the same code exists, restore it
      const softDeleted = await this.prisma.country.findFirst({
        where: {
          status: false,
          code: countryData.code,
        },
      });

      if (softDeleted) {
        this.logger.log(`Restoring soft-deleted country: ${countryData.code}`);
        const restored = await this.prisma.country.update({
          where: { id: softDeleted.id },
          data: {
            ...countryData,
            status: true,
          },
          include: {
            paymentMethods: {
              where: { isActive: true },
            },
          },
        });

        await this.invalidateCountriesCache();
        return restored;
      }

      // If autoRate is enabled, or rate is 1.0, fetch the initial rate from the API immediately
      let initialRate = countryData.exchangeRate || 1.0;
      if (countryData.autoRate || initialRate === 1.0) {
        try {
          // Get exchange rate configuration from database
          const config = await this.prisma.exchangeRateConfig.findFirst({
            where: { isActive: true }
          });
          const primaryApiUrl = config?.primaryApiUrl || this.DEFAULT_PRIMARY_EXCHANGE_API;
          
          const response = await axios.get(primaryApiUrl);
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

      if (countryData.isDefault) {
        await this.prisma.country.updateMany({
          where: { id: { not: country.id }, isDefault: true },
          data: { isDefault: false },
        });
      }

      await this.invalidateCountriesCache();

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

  async findByCode(code: string) {
    return this.prisma.country.findUnique({
      where: { code },
      include: {
        paymentMethods: {
          where: { isActive: true },
        },
      },
    });
  }

  async getDefaultCountry() {
    const defaultCountry = await this.prisma.country.findFirst({
      where: { isDefault: true, status: true },
      include: {
        paymentMethods: {
          where: { isActive: true },
        },
      },
    });
    return defaultCountry;
  }

  async setDefaultCountry(currencyCode: string) {
    const target = await this.prisma.country.findFirst({
      where: { currencyCode: currencyCode.toUpperCase(), status: true },
    });
    if (!target) {
      throw new BadRequestException(`Country with currency code ${currencyCode} not found`);
    }

    await this.prisma.country.updateMany({
      where: { id: { not: target.id }, isDefault: true },
      data: { isDefault: false },
    });

    await this.prisma.country.update({
      where: { id: target.id },
      data: { isDefault: true },
    });

    await this.invalidateCountriesCache();

    return this.prisma.country.findUnique({
      where: { id: target.id },
      include: {
        paymentMethods: {
          where: { isActive: true },
        },
      },
    });
  }

  // ── Exchange Rate Config Management ─────────────────────────────────────
  async getExchangeRateConfig() {
    const config = await this.prisma.exchangeRateConfig.findFirst({
      where: { isActive: true }
    });
    
    if (!config) {
      // Return default config if none exists
      return {
        providerName: 'exchangerate-api',
        primaryApiUrl: this.DEFAULT_PRIMARY_EXCHANGE_API,
        fallbackApiUrl: this.DEFAULT_FALLBACK_EXCHANGE_API,
        isActive: true,
        updateInterval: 3600000,
        lastUpdate: null,
      };
    }
    
    return config;
  }

  async updateExchangeRateConfig(data: {
    providerName?: string;
    primaryApiUrl?: string;
    fallbackApiUrl?: string;
    isActive?: boolean;
    updateInterval?: number;
  }) {
    const config = await this.prisma.exchangeRateConfig.findFirst();
    
    if (config) {
      return this.prisma.exchangeRateConfig.update({
        where: { id: config.id },
        data
      });
    } else {
      return this.prisma.exchangeRateConfig.create({
        data: {
          providerName: data.providerName || 'exchangerate-api',
          primaryApiUrl: data.primaryApiUrl || this.DEFAULT_PRIMARY_EXCHANGE_API,
          fallbackApiUrl: data.fallbackApiUrl || this.DEFAULT_FALLBACK_EXCHANGE_API,
          isActive: data.isActive ?? true,
          updateInterval: data.updateInterval || 3600000,
        }
      });
    }
  }

  async triggerManualRateUpdate() {
    this.logger.log('Manual exchange rate update triggered');
    return this.updateExchangeRates();
  }

  // ── Country Management ────────────────────────────────────────────────────
  async update(id: string, updateCountryDto: UpdateCountryDto) {
    const { paymentMethods, ...countryData } = updateCountryDto;
    
    if (countryData.isDefault) {
      await this.prisma.country.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }
    
    // If updating payment methods, it's easier to handle them separately or use a more complex logic
    // For now, let's just update the country fields
    const updated = await this.prisma.country.update({
      where: { id },
      data: countryData,
      include: {
        paymentMethods: true,
      },
    });

    await this.invalidateCountriesCache();
    return updated;
  }

  async remove(id: string) {
    // Soft delete — preserves states, shipping zones, and payment methods
    const result = await this.prisma.country.update({
      where: { id },
      data: { status: false },
    });

    await this.invalidateCountriesCache();
    return result;
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
