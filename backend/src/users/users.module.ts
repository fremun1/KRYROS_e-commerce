import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [CloudinaryModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
