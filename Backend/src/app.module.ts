import { Module, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CategoriesModule } from './categories/categories.module';
import { CreditModule } from './credit/credit.module';
import { WalletModule } from './wallet/wallet.module';
import { WholesaleModule } from './wholesale/wholesale.module';
import { ServicesModule } from './services/services.module';
import { CMSModule } from './cms/cms.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { PickupStationsModule } from './pickup-stations/pickup-stations.module';
import { SettingsModule } from './settings/settings.module';
import { ShippingModule } from './shipping/shipping.module';
import { BrandsModule } from './brands/brands.module';
import { CountriesModule } from './countries/countries.module';
import { StatesModule } from './states/states.module';
import { CitiesModule } from './cities/cities.module';
import { ShippingZonesModule } from './shipping-zones/shipping-zones.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { PaymentConfigModule } from './payment-config/payment-config.module';
import { PaymentLinksModule } from './payment-links/payment-links.module';

const logger = new Logger('AppModule');

/**
 * Build the ThrottlerModule config.
 * Uses Redis-backed storage when REDIS_URL is set (production-safe across restarts and
 * multiple instances). Falls back to in-memory storage in development.
 */
function buildThrottlerConfig() {
  const throttlers = [{ name: 'default', ttl: 60000, limit: 60 }];

  if (process.env.REDIS_URL) {
    logger.log('ThrottlerGuard: using Redis storage (REDIS_URL detected)');
    return {
      throttlers,
      storage: new ThrottlerStorageRedisService(process.env.REDIS_URL),
    };
  }

  logger.warn(
    'ThrottlerGuard: REDIS_URL not set — using in-memory storage. ' +
    'Set REDIS_URL in production to persist rate-limit state across restarts.',
  );
  return { throttlers };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),

    // ── Rate Limiting ────────────────────────────────────────────────────────
    // Redis-backed when REDIS_URL is set → survives restarts + horizontal scaling
    ThrottlerModule.forRoot(buildThrottlerConfig()),

    // ── Cache (used by auth lockout + application caching) ───────────────────
    // Redis-backed when REDIS_URL is set → ensures brute-force lockouts persist
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (): Promise<any> => {
        if (process.env.REDIS_URL) {
          try {
            // Dynamic import so the package is optional in dev without Redis
            const { redisStore } = await import('cache-manager-redis-yet');
            const store = await redisStore({
              url: process.env.REDIS_URL,
              socket: { reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000) },
            });
            logger.log('CacheModule: using Redis store (REDIS_URL detected)');
            return { store, ttl: 5 * 60 * 1000 }; // 5-min TTL — safe for public read-heavy data
          } catch (err) {
            logger.error(`CacheModule: Redis store failed, falling back to memory — ${err}`);
          }
        }
        logger.warn(
          'CacheModule: REDIS_URL not set — using in-memory store. ' +
          'Auth lockouts will reset on server restart. Set REDIS_URL in production.',
        );
        return { ttl: 5 * 60 * 1000, max: 500 }; // 5-min in-memory cache, 500 entries max
      },
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    CategoriesModule,
    CreditModule,
    WalletModule,
    WholesaleModule,
    ServicesModule,
    CMSModule,
    PaymentsModule,
    ReportsModule,
    WishlistModule,
    PickupStationsModule,
    SettingsModule,
    ShippingModule,
    BrandsModule,
    CountriesModule,
    StatesModule,
    CitiesModule,
    ShippingZonesModule,
    NotificationsModule,
    ReviewsModule,
    NewsletterModule,
    PaymentConfigModule,
    PaymentLinksModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
