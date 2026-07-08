import { Module } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { CountriesController } from './countries.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { GeolocationService } from '../common/services/geolocation.service';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [CountriesController],
  providers: [CountriesService, GeolocationService],
  exports: [CountriesService, GeolocationService],
})
export class CountriesModule {}
