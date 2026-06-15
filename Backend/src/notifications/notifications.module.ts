import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MailerService } from './mailer.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, MailerService],
  controllers: [NotificationsController],
  exports: [NotificationsService, MailerService],
})
export class NotificationsModule {}
