import { Module, Global } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';

@Global()
@Module({
  providers: [BrandsService],
  controllers: [BrandsController],
  exports: [BrandsService],
})
export class BrandsModule {}
