import { Controller, Post, Get, Delete, Patch, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { NotificationsService } from './notifications.service';
import { MailerService } from './mailer.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SendNotificationDto, NotificationTargetType, NotificationTargetType as NTT } from './dto/notification-payload.dto';
import { UpdateTokenDto } from './dto/update-token.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly mailerService: MailerService,
  ) {}

  @Post('token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user FCM token (authenticated)' })
  async updateToken(@Request() req: any, @Body() body: UpdateTokenDto) {
    console.log(`[TOKEN_UPDATE] User: ${req.user.id}, Platform: ${body.platform || 'android'}, Token: ${body.token?.substring(0, 20)}...`);
    return this.notificationsService.updateToken(req.user.id, body.token, body.platform || 'android');
  }

  @Post('token/public')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Register FCM token without authentication' })
  async registerPublicToken(@Body() body: UpdateTokenDto & { isAdmin?: boolean }) {
    console.log(`[TOKEN_PUBLIC_REGISTER] Platform: ${body.platform || 'android'}, IsAdmin: ${body.isAdmin}, Token: ${body.token?.substring(0, 20)}...`);
    const result = await this.notificationsService.registerPublicToken(body.token, body.platform || 'android', body.isAdmin);
    console.log(`[TOKEN_REGISTERED_SUCCESS] Platform stored: ${result.platform}, IsAdmin: ${result.isAdmin}`);
    return result;
  }

  @Post('broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send broadcast notification (Admin only)' })
  async broadcast(@Body() body: { title: string; body: string; data?: any; url?: string; imageUrl?: string; isAdminAlert?: string }) {
    // Merge url and imageUrl into the data payload so the app can navigate on tap
    const mergedData = { 
      ...(body.data || {}), 
      ...(body.url ? { url: body.url } : {}), 
      ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
      ...(body.isAdminAlert ? { isAdminAlert: body.isAdminAlert } : {})
    };
    return this.notificationsService.sendToAll(body.title, body.body, mergedData);
  }

  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send targeted notification (Admin only)' })
  async sendTargeted(@Body() body: SendNotificationDto & { isAdminAlert?: string }) {
    // Merge url and imageUrl into the data payload so the app can navigate on tap
    const mergedData = {
      ...(body.data || {}),
      ...(body.url ? { url: body.url } : {}),
      ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
      ...(body.isAdminAlert ? { isAdminAlert: body.isAdminAlert } : {})
    };

    if (body.scheduledAt) {
      return this.notificationsService.scheduleNotification({ ...body, data: mergedData });
    }

    if (body.targetType === NotificationTargetType.ALL) {
      return this.notificationsService.sendToAll(body.title, body.body, mergedData);
    }

    if (body.targetType === NotificationTargetType.SINGLE && body.userId) {
      return this.notificationsService.sendToUser(body.userId, body.title, body.body, mergedData);
    }

    if (body.targetType === NotificationTargetType.BULK && body.orderIds) {
      return this.notificationsService.sendToOrders(body.orderIds, body.title, body.body, mergedData);
    }

    if (body.targetType === NotificationTargetType.STATUS_BASED && body.orderStatus) {
      return this.notificationsService.sendByOrderStatus(body.orderStatus, body.title, body.body, mergedData);
    }

    // Fallback: broadcast to all if no specific target
    return this.notificationsService.sendToAll(body.title, body.body, mergedData);
  }

  @Post('sms/send')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send direct SMS (Admin only) — max 10/min' })
  async sendSMS(@Body() body: { phoneNumber: string; message: string }) {
    return this.notificationsService.sendSMS(body.phoneNumber, body.message);
  }

  // ─── IMPORTANT: All static/named routes MUST come before :id wildcard routes ─

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Comprehensive check of all notification services (Admin only)' })
  async getSystemStatus() {
    const dbStatus = await this.notificationsService.checkDatabase();
    const pushStatus = await this.notificationsService.checkFirebase();
    const smsStatus = await this.notificationsService.checkBeem();
    const smtpStatus = await this.notificationsService.checkSmtp();

    return {
      database: dbStatus,
      push: pushStatus,
      sms: smsStatus,
      smtp: smtpStatus,
      serverTime: new Date().toISOString(),
    };
  }

  @Get('smtp/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check SMTP and SMS configuration status (Admin only)' })
  async getSmtpStatus() {
    return {
      smtp: {
        configured: this.mailerService.isConfigured,
        provider: 'Gmail SMTP',
      },
      sms: {
        configured: true,
        provider: 'Beem Africa',
        coverage: 'Zambia (ZM) + International',
      },
      push: {
        configured: this.notificationsService.isPushConfigured,
        provider: 'Firebase FCM',
        note: this.notificationsService.isPushConfigured ? 'Push notifications are active' : 'Configure FIREBASE_SERVICE_ACCOUNT_JSON to enable push notifications',
      },
    };
  }

  // ─── Device Management ────────────────────────────────────────────────────
  @Get('devices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all registered devices (Admin only)' })
  async getDevices() {
    return this.notificationsService.getDevices();
  }

  @Delete('devices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a registered device (Admin only)' })
  async deleteDevice(@Param('id') id: string) {
    return this.notificationsService.deleteDevice(id);
  }

  @Post('devices/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send push to specific device IDs (Admin only)' })
  async sendToDevices(@Body() body: { deviceIds: string[]; title: string; body: string; data?: any; url?: string; imageUrl?: string }) {
    const mergedData = { ...(body.data || {}), ...(body.url ? { url: body.url } : {}), ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}) };
    return this.notificationsService.sendToDeviceIds(body.deviceIds, body.title, body.body, mergedData);
  }

  // ─── SMS Contacts ─────────────────────────────────────────────────────────
  @Get('sms/contacts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all SMS contacts (Admin only)' })
  async getSmsContacts() {
    return this.notificationsService.getSmsContacts();
  }

  @Post('sms/contacts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually add an SMS contact (Admin only)' })
  async addSmsContact(@Body() body: { phone: string; name?: string; source?: string }) {
    return this.notificationsService.addSmsContact(body.phone, body.name, body.source || 'Manual');
  }

  @Post('sms/contacts/register')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Auto-register phone from checkout (public, max 3/min per IP)' })
  async registerSmsContact(@Body() body: { phone: string; name?: string; source?: string }) {
    return this.notificationsService.addSmsContact(body.phone, body.name, body.source || 'Checkout');
  }

  @Delete('sms/contacts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an SMS contact (Admin only)' })
  async deleteSmsContact(@Param('id') id: string) {
    return this.notificationsService.deleteSmsContact(id);
  }

  // ─── SMS Supported Countries ──────────────────────────────────────────────
  @Get('sms/countries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List SMS supported countries (Admin only)' })
  async getSmsCountries() {
    return this.notificationsService.getSmsCountries();
  }

  @Post('sms/countries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a supported SMS country (Admin only)' })
  async addSmsCountry(@Body() body: { name: string; dialCode: string; isoCode: string }) {
    return this.notificationsService.addSmsCountry(body.name, body.dialCode, body.isoCode);
  }

  @Patch('sms/countries/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle SMS country active/inactive (Admin only)' })
  async toggleSmsCountry(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.notificationsService.toggleSmsCountry(id, body.isActive);
  }

  @Delete('sms/countries/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a supported SMS country (Admin only)' })
  async deleteSmsCountry(@Param('id') id: string) {
    return this.notificationsService.deleteSmsCountry(id);
  }

  // ─── Email Contacts ───────────────────────────────────────────────────────────
  @Get('email/contacts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List email contacts (Admin only)' })
  async getEmailContacts() {
    return this.notificationsService.getEmailContacts();
  }

  @Post('email/contacts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an email contact (Admin only)' })
  async addEmailContact(@Body() body: { email: string; name?: string; source?: string }) {
    return this.notificationsService.addEmailContact(body.email, body.name, body.source);
  }

  @Delete('email/contacts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an email contact (Admin only)' })
  async deleteEmailContact(@Param('id') id: string) {
    return this.notificationsService.deleteEmailContact(id);
  }

  @Post('email/blast')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email blast to contacts (Admin only) — max 5/min' })
  async sendEmailBlast(@Body() body: { subject: string; body: string; emailIds?: string[] }) {
    return this.notificationsService.sendEmailBlast(body.subject, body.body, body.emailIds);
  }

  @Post('email/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send test email with branded template (Admin only)' })
  async sendTestEmail(@Body() body: { email: string; subject?: string; message?: string; firstName?: string }) {
    const html = this.mailerService.buildAnnouncementHtml({
      firstName: body.firstName || 'Admin',
      subject: body.subject || 'KRYROS Test Email',
      headline: '📧 Test Email — SMTP Working!',
      bodyHtml: `<p>${body.message || 'This is a test email sent from your KRYROS Admin Panel. Your SMTP connection is working correctly.'}</p>`,
    });
    return this.mailerService.sendMail(
      body.email,
      body.subject || 'KRYROS Test Email — SMTP Verified ✅',
      body.message || 'This is a test email. Your SMTP is working.',
      html,
    );
  }

  @Post('email/broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send broadcast email to all users or targeted list (Admin only)' })
  async sendBroadcastEmail(@Body() body: {
    emails?: string[];
    subject: string;
    headline: string;
    message: string;
    ctaText?: string;
    ctaUrl?: string;
    sendToAll?: boolean;
  }) {
    let targets: { email: string; firstName: string }[] = [];

    if (body.sendToAll) {
      const users = await this.notificationsService['prisma'].user.findMany({
        where: { isActive: true },
        select: { email: true, firstName: true },
        take: 500,
      });
      targets = users.map(u => ({ email: u.email, firstName: u.firstName || 'Customer' }));
    } else if (body.emails?.length) {
      targets = body.emails.map(e => ({ email: e, firstName: 'Customer' }));
    }

    let sent = 0;
    for (const t of targets) {
      try {
        await this.mailerService.sendAnnouncementEmail({
          to: t.email,
          firstName: t.firstName,
          subject: body.subject,
          headline: body.headline,
          bodyHtml: `<p>${body.message.replace(/\n/g, '<br>')}</p>`,
          ctaText: body.ctaText,
          ctaUrl: body.ctaUrl,
        });
        sent++;
      } catch {}
    }
    return { success: true, sent, total: targets.length };
  }

  @Post('email/order-status-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a test order status email to preview the template (Admin only)' })
  async sendOrderStatusTest(@Body() body: { email: string; orderNumber?: string; status?: string }) {
    return this.mailerService.sendOrderStatusEmail({
      to: body.email,
      firstName: 'Test Customer',
      orderNumber: body.orderNumber || 'TEST-001',
      status: body.status || 'SHIPPED',
    });
  }

  // ─── Public Payment Receipt ───────────────────────────────────────────────
  @Post('receipt')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Send payment receipt via SMS and/or email (public, max 5/min)' })
  async sendPaymentReceipt(@Body() body: {
    phone?: string;
    email?: string;
    orderRef: string;
    amount: string;
    currency: string;
    customerName?: string;
    paymentMethod?: string;
    status?: string;
    countryCode?: string;  // Optional: ZM for Zambia, otherwise defaults to email
  }) {
    const status = body.status || 'completed';
    const statusEmoji = status === 'failed' ? '❌' : '✅';
    const statusLabel = status === 'failed' ? 'FAILED' : 'SUCCESSFUL';
    const customerName = body.customerName || 'Customer';
    const paymentMethod = body.paymentMethod || 'Payment';
    const isZambia = body.countryCode === 'ZM';

    let smsSent = false;
    let emailSent = false;

    // Zambia: SMS for payment receipts
    if (isZambia && body.phone?.trim()) {
      try {
        const smsText =
          `${statusEmoji} KRYROS Payment ${statusLabel}\n` +
          `Ref: ${body.orderRef}\n` +
          `Amount: ${body.currency} ${body.amount}\n` +
          `Method: ${paymentMethod}\n` +
          `Thank you, ${customerName}! Shop again at KRYROS.`;
        await this.notificationsService.sendSMS(body.phone.trim(), smsText);
        smsSent = true;
      } catch { smsSent = false; }
    }

    // All countries: Email for payment receipts (primary for non-Zambia, secondary for Zambia)
    if (body.email?.trim()) {
      try {
        const subject = `${statusEmoji} KRYROS Payment ${statusLabel} — ${body.orderRef}`;
        const html = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
            <div style="background:#10b981;padding:32px 24px;text-align:center">
              <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">${status === 'failed' ? '✗' : '✓'}</div>
              <h2 style="color:#fff;margin:0;font-size:20px;font-weight:700">Payment ${statusLabel}</h2>
            </div>
            <div style="padding:24px">
              <p style="color:#374151;font-size:14px;margin-bottom:20px">Hi <strong>${customerName}</strong>, your payment details:</p>
              <table style="width:100%;border-collapse:collapse">
                <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:12px 0;color:#6b7280;font-size:13px">Order Ref</td><td style="padding:12px 0;font-weight:600;color:#111;font-size:13px;text-align:right">${body.orderRef}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:12px 0;color:#6b7280;font-size:13px">Amount</td><td style="padding:12px 0;font-weight:700;color:#10b981;font-size:15px;text-align:right">${body.currency} ${body.amount}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:12px 0;color:#6b7280;font-size:13px">Payment Method</td><td style="padding:12px 0;font-weight:600;color:#111;font-size:13px;text-align:right">${paymentMethod}</td></tr>
                <tr><td style="padding:12px 0;color:#6b7280;font-size:13px">Status</td><td style="padding:12px 0;font-weight:600;font-size:13px;text-align:right;color:${status === 'failed' ? '#ef4444' : '#10b981'}">${statusLabel}</td></tr>
              </table>
            </div>
            <div style="padding:16px 24px;text-align:center;background:#f9fafb;font-size:11px;color:#9ca3af">Powered by <strong style="color:#10b981">KRYROS</strong> &bull; Secure &bull; Encrypted &bull; Safe</div>
          </div>`;
        const plain = `KRYROS Payment ${statusLabel} | Ref: ${body.orderRef} | Amount: ${body.currency} ${body.amount} | Method: ${paymentMethod}`;
        await this.mailerService.sendMail(body.email.trim(), subject, plain, html);
        emailSent = true;
      } catch { emailSent = false; }
    }

    return { success: smsSent || emailSent, smsSent, emailSent };
  }

  // ─── Wildcard :id routes MUST come last ───────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent notifications for the current user' })
  async getNotifications(@Request() req: any) {
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER].includes(req.user.role);
    // Pass isAdmin flag so the service can filter appropriately
    return this.notificationsService.getRecentNotifications(req.user.id, 20, isAdmin);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notification count for the current user' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Post('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  async markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification details (Admin only)' })
  async getNotification(@Param('id') id: string) {
    return this.notificationsService.getNotification(id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Put(':id/read') // Also support PUT for markAsRead as the client might use it
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a notification as read (legacy support)' })
  async markAsReadLegacy(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a notification (Admin only)' })
  async deleteNotification(@Param('id') id: string) {
    return this.notificationsService.deleteNotification(id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear all notifications (Admin only)' })
  async clearAllNotifications(@Request() req: any) {
    return this.notificationsService.clearAllNotifications(req.user.id);
  }
}
