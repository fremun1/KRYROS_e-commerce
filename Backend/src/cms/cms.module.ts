import { Module } from '@nestjs/common';
import { CMSService } from './cms.service';
import { CMSController } from './cms.controller';
import { SectionDataSourceService } from './section-data-source.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [PrismaModule, ProductsModule],
  providers: [CMSService, SectionDataSourceService],
  controllers: [CMSController],
  exports: [CMSService, SectionDataSourceService],
})
export class CMSModule {}
