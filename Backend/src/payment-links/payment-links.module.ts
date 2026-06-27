import { Module } from '@nestjs/common';
import { PaymentLinksService } from './payment-links.service';
import { PaymentLinksController } from './payment-links.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PaymentLinksService],
  controllers: [PaymentLinksController],
  exports: [PaymentLinksService],
})
export class PaymentLinksModule {}
