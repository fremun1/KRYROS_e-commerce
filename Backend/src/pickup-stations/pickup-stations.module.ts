import { Module } from '@nestjs/common';
import { PickupStationsController } from './pickup-stations.controller';
import { PickupStationsService } from './pickup-stations.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PickupStationsController],
  providers: [PickupStationsService],
  exports: [PickupStationsService],
})
export class PickupStationsModule {}
