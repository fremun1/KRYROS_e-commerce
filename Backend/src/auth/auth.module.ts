import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { EmailModule } from '../common/email/email.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TwoFactorService } from './two-factor.service';
import { PasswordResetService } from './password-reset.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CountriesModule } from '../countries/countries.module';
import { RegionRestrictionGuard } from '../common/guards/region-restriction.guard';


@Module({
  imports: [
    UsersModule,
    PrismaModule,
    PassportModule,
    CloudinaryModule,
    EmailModule,
    CountriesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is not set. Server cannot start.');
        }
        return {
          secret,
          signOptions: {
            expiresIn: '15m',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, TwoFactorService, PasswordResetService, JwtStrategy, LocalStrategy, RegionRestrictionGuard],
  controllers: [AuthController],
  exports: [AuthService, TwoFactorService, PasswordResetService],
})
export class AuthModule {}