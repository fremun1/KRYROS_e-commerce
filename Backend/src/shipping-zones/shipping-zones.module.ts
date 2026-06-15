import { Module } from '@nestjs/common';
import { ShippingZonesService } from './shipping-zones.service';
import { ShippingZonesController } from './shipping-zones.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShippingZonesController],
  providers: [ShippingZonesService],
  exports: [ShippingZonesService],
})
export class ShippingZonesModule {}
