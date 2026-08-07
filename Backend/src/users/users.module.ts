import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { EmailModule } from '../common/email/email.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersManagementController } from './users-management.controller';
import { AuditService } from '../common/services/audit.service';
import { AccountStatusService } from '../common/services/account-status.service';
import { PasswordResetService } from '../auth/password-reset.service';

@Module({
  imports: [CloudinaryModule, EmailModule],
  providers: [UsersService, AuditService, AccountStatusService, PasswordResetService],
  controllers: [UsersController, UsersManagementController],
  exports: [UsersService, AuditService, AccountStatusService, PasswordResetService],
})
export class UsersModule {}
