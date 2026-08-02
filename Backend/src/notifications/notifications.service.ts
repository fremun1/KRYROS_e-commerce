import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as admin from 'firebase-admin';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { readFileSync } from 'fs';
import { resolve } from 'path';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly beemBaseUrl = 'https://apisms.beem.africa/v1/send';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mailerService: MailerService,
  ) {}

  onModuleInit() {
    const serviceAccountJson = this.configService.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) return;
    try {
      let config: any;
      try { config = JSON.parse(serviceAccountJson); } catch {
        const filePath = resolve(process.cwd(), serviceAccountJson);
        const fileContent = readFileSync(filePath, 'utf-8');
        config = JSON.parse(fileContent);
      }
      if (config.private_key && config.client_email) {
        admin.initializeApp({ credential: admin.credential.cert(config) });
      }
    } catch (error) {}
  }

  get isPushConfigured(): boolean { try { return admin.apps.length > 0; } catch { return false; } }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications() {
    const now = new Date();
    const scheduled = await this.prisma.notification.findMany({ where: { sent: false, scheduledAt: { lte: now } } });
    for (const notification of scheduled) {
      try {
        if (notification.userId) await this.sendToUser(notification.userId, notification.title, notification.message, notification.data);
        else await this.sendToAll(notification.title, notification.message, notification.data);
        await this.prisma.notification.update({ where: { id: notification.id }, data: { sent: true } });
      } catch (error) {}
    }
  }

  async sendToUser(userId: string, title: string, body: string, data?: any) {
    const devices = await this.prisma.userDevice.findMany({ where: { userId }, select: { fcmToken: true } });
    if (devices.length > 0) await this.sendToTokens(devices.map(d => d.fcmToken), title, body, data);
    await this.prisma.notification.create({ data: { userId, title, message: body, data: data || {}, targetType: 'SINGLE', sent: true } });
  }

  async sendToAdmins(title: string, body: string, data?: any) {
    try {
      // 1. Find all devices that are explicitly marked as isAdmin OR belong to an Admin/SuperAdmin/Manager user
      const adminDevices = await this.prisma.userDevice.findMany({
        where: { 
          OR: [
            { isAdmin: true }, 
            { user: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'MANAGER'] } } }
          ] 
        },
        select: { fcmToken: true, userId: true },
      });

      // 2. Also find all users with admin roles who might NOT have a device registered yet
      // so we can still create the in-app notification for their dashboard.
      const adminUsers = await this.prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'MANAGER'] } },
        select: { id: true }
      });

      const tokens = [...new Set(adminDevices.map(d => d.fcmToken))];
      const adminIds = [...new Set([
        ...adminDevices.map(d => d.userId).filter(Boolean),
        ...adminUsers.map(u => u.id)
      ])];

      // Send push to all admin devices
      if (tokens.length > 0) {
        await this.sendToTokens(tokens, title, body, { ...data, isAdminAlert: 'true' });
      }

      // Create in-app notification records for all admin users
      for (const adminId of adminIds) {
        await this.prisma.notification.create({ 
          data: { 
            userId: adminId as string, 
            title, 
            message: body, 
            data: { ...data, isAdminAlert: 'true' }, 
            targetType: 'SINGLE', 
            sent: true 
          } 
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send notifications to admins: ${error.message}`);
    }
  }

  async sendToAll(title: string, body: string, data?: any) {
    const devices = await this.prisma.userDevice.findMany({ where: { OR: [{ user: { role: 'CUSTOMER' } }, { userId: null }] }, select: { fcmToken: true } });
    const tokens = devices.map(d => d.fcmToken);
    if (tokens.length > 0) {
      for (let i = 0; i < tokens.length; i += 500) await this.sendToTokens(tokens.slice(i, i + 500), title, body, data);
    }
    await this.prisma.notification.create({ data: { title, message: body, data: data || {}, targetType: 'BULK', sent: true } });
  }

  private async sendToTokens(tokens: string[], title: string, body: string, data?: any): Promise<string[]> {
    if (tokens.length === 0 || !this.isPushConfigured) return [];
    try {
      const stringifiedData: Record<string, string> = {};
      if (data) {
        for (const [k, v] of Object.entries(data)) {
          if (v !== null && v !== undefined) stringifiedData[k] = typeof v === 'string' ? v : JSON.stringify(v);
        }
      }
      const imageUrl = data?.imageUrl;

      const message: admin.messaging.MulticastMessage = {
        notification: { 
          title, 
          body,
          ...(imageUrl ? { image: imageUrl } : {})
        },
        tokens,
        data: { ...stringifiedData, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        android: { 
          priority: 'high', 
          notification: { 
            channelId: 'kryros_notifications', 
            clickAction: 'FLUTTER_NOTIFICATION_CLICK', 
            sound: 'default',
            title,
            body,
            ...(imageUrl ? { imageUrl } : {})
          } 
        },
        apns: { 
          payload: { 
            aps: { 
              sound: 'default', 
              badge: 1,
              alert: { title, body },
              ...(imageUrl ? { 'mutable-content': 1 } : {})
            } 
          },
          ...(imageUrl ? { fcmOptions: { imageUrl } } : {})
        },
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      const failedTokens: string[] = [];
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success && (resp.error?.code === 'messaging/invalid-registration-token' || resp.error?.code === 'messaging/registration-token-not-registered')) {
            failedTokens.push(tokens[idx]);
          }
        });
        if (failedTokens.length > 0) await this.prisma.userDevice.deleteMany({ where: { fcmToken: { in: failedTokens } } });
      }
      return failedTokens;
    } catch (error) { return []; }
  }

  async updateToken(userId: string, token: string, platform: string = 'android') {
    const validPlatforms = ['android', 'ios', 'web'];
    let finalPlatform = String(platform || '').toLowerCase() || 'android';
    
    // Normalize common legacy or incorrect values
    if (finalPlatform === 'admin_android') finalPlatform = 'android';
    if (finalPlatform === 'website' || finalPlatform === 'web_view') finalPlatform = 'web';
    
    if (!validPlatforms.includes(finalPlatform)) {
      console.warn(`[PLATFORM_VALIDATION_FAILED] Invalid platform '${platform}' for user ${userId}, defaulting to 'android'`);
      finalPlatform = 'android';
    }

    // Check if the user is an admin to set the isAdmin flag correctly
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isUserAdmin = user && ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role);

    const result = await this.prisma.userDevice.upsert({
      where: { fcmToken: token },
      update: { 
        userId, 
        platform: finalPlatform, 
        updatedAt: new Date(),
        // If the logging in user is an admin, ensure the device is marked as admin
        ...(isUserAdmin ? { isAdmin: true } : {})
      },
      create: { 
        userId, 
        fcmToken: token, 
        platform: finalPlatform, 
        isAdmin: isUserAdmin || false 
      },
    });
    return result;
  }

  async registerPublicToken(token: string, platform: string = 'android', isAdmin: boolean = false) {
    const validPlatforms = ['android', 'ios', 'web'];
    let finalPlatform = String(platform || '').toLowerCase() || 'android';
    
    // Normalize common legacy or incorrect values
    if (finalPlatform === 'admin_android') finalPlatform = 'android';
    if (finalPlatform === 'website' || finalPlatform === 'web_view') finalPlatform = 'web';
    
    if (!validPlatforms.includes(finalPlatform)) {
      console.warn(`[PLATFORM_VALIDATION_FAILED] Invalid platform '${platform}' received, defaulting to 'android'`);
      finalPlatform = 'android';
    }
    const result = await this.prisma.userDevice.upsert({ where: { fcmToken: token }, update: { platform: finalPlatform, updatedAt: new Date(), isAdmin }, create: { fcmToken: token, platform: finalPlatform, isAdmin } });
    return result;
  }

  async sendOrderPlacedNotification(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
    if (!order) return;
    
    const name = order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest';
    
    // 1. Notify Admins
    await this.sendToAdmins(
      'New Order Received! 🛒',
      `${name} just placed order #${order.orderNumber}.`,
      { type: 'NEW_ORDER', orderId: order.id, orderNumber: order.orderNumber, url: `/orders?id=${order.id}` }
    );

    // 2. Notify User (Customer)
    if (order.userId) {
      await this.sendToUser(
        order.userId,
        'Order Placed! ✅',
        `Your order #${order.orderNumber} has been placed successfully.`,
        { type: 'ORDER_PLACED', orderId: order.id, orderNumber: order.orderNumber, url: `/orders/${order.id}` }
      );
    } else if (order.guestFcmToken) {
      // Handle guest push if token exists
      await this.sendToTokens(
        [order.guestFcmToken],
        'Order Placed! ✅',
        `Your order #${order.orderNumber} has been placed successfully.`,
        { type: 'ORDER_PLACED', orderId: order.id, orderNumber: order.orderNumber, url: `/track?orderNumber=${order.orderNumber}` }
      );
    }
  }

  async sendUserRegisteredNotification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // 1. Notify Admins
    await this.sendToAdmins(
      'New User Registered! 🆕',
      `${user.firstName} ${user.lastName} has joined KRYROS.`,
      { type: 'USER_REGISTER', userId: user.id, url: `/users?id=${user.id}` }
    );

    // 2. Welcome Notification to User
    await this.sendToUser(
      user.id,
      'Welcome to KRYROS! 🎉',
      `Hi ${user.firstName}, thank you for joining us. Start exploring our products today!`,
      { type: 'WELCOME', userId: user.id }
    );
  }

  async sendUserLoginNotification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await this.sendToAdmins('User Login Alert', `${user.firstName} has just logged into the platform.`, { userId });
  }

  async sendPaymentReceiptNotification(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    await this.sendToAdmins('Payment Received!', `Payment confirmed for order #${order.orderNumber}.`, { url: `/orders?id=${orderId}`, orderId });
  }

  async sendOrderStatusNotification(orderId: string, status: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
    if (!order) return;

    const title = 'Order Update 📦';
    const body = `Your order #${order.orderNumber} status is now ${status}.`;
    // Ensure the URL is correctly formatted for the mobile app's router
    const data = { 
      type: 'ORDER_UPDATE', 
      orderId: order.id, 
      orderNumber: order.orderNumber, 
      status, 
      url: `/orders?id=${order.id}`,
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    };

    // Send push notification
    if (order.userId) {
      await this.sendToUser(order.userId, title, body, data);
    } else if (order.guestFcmToken) {
      await this.sendToTokens([order.guestFcmToken], title, body, { ...data, url: `/track?orderNumber=${order.orderNumber}` });
    }

    // Order/shipping updates use EMAIL for ALL customers, including Zambia
    // SMS is reserved for payment-result notifications only
    const email = order.user?.email;
    if (email) {
      await this.mailerService.sendOrderStatusEmail({
        to: email,
        firstName: order.user?.firstName || 'Customer',
        orderNumber: order.orderNumber,
        status: status,
        trackingUrl: `${this.configService.get('FRONTEND_URL')}/orders?id=${order.id}`
      });
    }
  }

  async sendPaymentStatusNotification(payload: any) {
    const isPaid = String(payload.status).toUpperCase() === 'PAID';
    
    // Try to get user information to determine country
    let userCountry = null;
    if (payload.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { country: true, email: true, phone: true }
      });
      if (user) {
        userCountry = user.country;
        // Update payload with user contact info if not provided
        if (!payload.email && user.email) payload.email = user.email;
        if (!payload.phone && user.phone) payload.phone = user.phone;
      }
    }

    const isZambia = userCountry === 'ZM' || userCountry?.toLowerCase() === 'zambia';

    // Zambia: Send SMS for payment status
    if (isZambia && payload.phone) {
      try {
        const message = `Payment ${payload.paymentNumber} ${isPaid ? 'successful' : 'failed'}. ${isPaid ? 'Thank you for your payment!' : 'Please try again or contact support.'}`;
        await this.sendSMS(payload.phone, message);
        this.logger.log(`Payment status SMS sent to ${payload.phone}`);
      } catch (error) {
        this.logger.error(`Failed to send payment status SMS: ${error.message}`);
        // Fallback to email if SMS fails
        if (payload.email) {
          await this.mailerService.sendAnnouncementEmail({
            to: payload.email,
            firstName: '',
            subject: `Payment ${isPaid ? 'Paid' : 'Failed'}`,
            headline: `Payment ${isPaid ? 'Successful' : 'Failed'}`,
            bodyHtml: `<p>Payment <strong>${payload.paymentNumber}</strong> for your order has been <strong>${isPaid ? 'successfully processed' : 'failed'}</strong>.</p>
                       <p>${isPaid ? 'Thank you for your payment! We are now processing your order.' : 'Please try again or contact our support team for assistance.'}</p>`,
            ctaText: 'View Order Status',
            ctaUrl: `${this.configService.get('FRONTEND_URL')}/dashboard`
          });
        }
      }
    } else if (payload.email) {
      // Send email for non-Zambia users or if phone is missing
      await this.mailerService.sendAnnouncementEmail({
        to: payload.email,
        firstName: '',
        subject: `Payment ${isPaid ? 'Paid' : 'Failed'}`,
        headline: `Payment ${isPaid ? 'Successful' : 'Failed'}`,
        bodyHtml: `<p>Payment <strong>${payload.paymentNumber}</strong> for your order has been <strong>${isPaid ? 'successfully processed' : 'failed'}</strong>.</p>
                   <p>${isPaid ? 'Thank you for your payment! We are now processing your order.' : 'Please try again or contact our support team for assistance.'}</p>`,
        ctaText: 'View Order Status',
        ctaUrl: `${this.configService.get('FRONTEND_URL')}/dashboard`
      });
    }
  }

  async getRecentNotifications(userId?: string, limit: number = 20, isAdmin: boolean = false) {
    const where: any = {};
    
    if (isAdmin && userId) {
      // For admins, show their own notifications OR any notification marked as an admin alert
      where.OR = [
        { userId: userId },
        { data: { path: ['isAdminAlert'], equals: 'true' } }
      ];
    } else if (userId) {
      // For regular users, only show their own
      where.userId = userId;
    }

    return this.prisma.notification.findMany({ 
      where,
      take: limit, 
      orderBy: { createdAt: 'desc' }, 
      include: { user: { select: { firstName: true, lastName: true, email: true } } } 
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false }
    });
  }

  async sendToDeviceIds(deviceIds: string[], title: string, body: string, data?: any) {
    const devices = await this.prisma.userDevice.findMany({ where: { id: { in: deviceIds } }, select: { fcmToken: true } });
    if (devices.length > 0) await this.sendToTokens(devices.map(d => d.fcmToken), title, body, data);
  }

  async scheduleNotification(params: any) {
    return this.prisma.notification.create({ data: { userId: params.userId, title: params.title, message: params.body, targetType: params.targetType, data: params.data || {}, scheduledAt: new Date(params.scheduledAt), sent: false } });
  }

  async sendToOrders(orderIds: string[], title: string, body: string, data?: any) {
    const orders = await this.prisma.order.findMany({ where: { id: { in: orderIds } }, select: { userId: true } });
    for (const userId of [...new Set(orders.map(o => o.userId).filter(Boolean))]) {
      await this.sendToUser(userId as string, title, body, data);
    }
  }

  async sendByOrderStatus(status: string, title: string, body: string, data?: any) {
    const orders = await this.prisma.order.findMany({ where: { status: status as any }, select: { userId: true } });
    for (const userId of [...new Set(orders.map(o => o.userId).filter(Boolean))]) {
      await this.sendToUser(userId as string, title, body, data);
    }
  }

  async checkDatabase() {
    try {
      const count = await this.prisma.notification.count();
      return { status: 'OK', message: `Database connected. ${count} notifications in system.` };
    } catch (error) {
      return { status: 'ERROR', message: `Database connection failed: ${(error as any).message}` };
    }
  }

  async checkFirebase() {
    try {
      if (!this.isPushConfigured) {
        return { status: 'UNCONFIGURED', message: 'Firebase not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON to enable push notifications.' };
      }
      return { status: 'OK', message: 'Firebase FCM is configured and ready.' };
    } catch (error) {
      return { status: 'ERROR', message: `Firebase check failed: ${(error as any).message}` };
    }
  }

  async checkBeem() {
    const apiKey = this.configService.get('BEEM_API_KEY');
    const secretKey = this.configService.get('BEEM_SECRET_KEY');
    if (!apiKey || !secretKey) {
      return { status: 'UNCONFIGURED', message: 'SMS provider (Beem Africa) not configured. Set BEEM_API_KEY and BEEM_SECRET_KEY.' };
    }
    return { status: 'OK', message: 'SMS provider (Beem Africa) credentials configured. Zambia + International coverage.' };
  }

  async checkSmtp() {
    const host = this.configService.get('SMTP_HOST');
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');
    if (!user || !pass) {
      return { status: 'UNCONFIGURED', message: 'SMTP not configured. Set SMTP_USER and SMTP_PASS to enable email delivery.' };
    }
    return { status: 'OK', message: `SMTP configured (${host}). Email delivery ready.` };
  }
  async deleteDevice(id: string) { await this.prisma.userDevice.delete({ where: { id } }); }
  async getSmsCountries() { return this.prisma.smsSupportedCountry.findMany(); }
  async addSmsCountry(name: string, dialCode: string, isoCode: string) { return this.prisma.smsSupportedCountry.create({ data: { name, dialCode, isoCode } }); }
  async toggleSmsCountry(id: string, isActive: boolean) { return this.prisma.smsSupportedCountry.update({ where: { id }, data: { isActive } }); }
  async deleteSmsCountry(id: string) { await this.prisma.smsSupportedCountry.delete({ where: { id } }); }
  async getEmailContacts() { return this.prisma.emailContact.findMany(); }
  async addEmailContact(email: string, name: string, source: string) { return this.prisma.emailContact.create({ data: { email, name, source } }); }
  async deleteEmailContact(id: string) { await this.prisma.emailContact.delete({ where: { id } }); }

  async markAsRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  async deleteNotification(id: string) {
    return this.prisma.notification.delete({ where: { id } });
  }

  async clearAllNotifications(userId: string) {
    return this.prisma.notification.deleteMany({ where: { userId } });
  }

  async getNotification(id: string) {
    return this.prisma.notification.findUnique({ where: { id }, include: { user: { select: { firstName: true, lastName: true, email: true } } } });
  }

  async getSmsContacts() { return this.prisma.smsContact.findMany(); }
  async addSmsContact(phone: string, name: string, source: string) { return this.prisma.smsContact.create({ data: { phone, name, source } }); }
  async deleteSmsContact(id: string) { await this.prisma.smsContact.delete({ where: { id } }); }
  async getDevices() { return this.prisma.userDevice.findMany({ include: { user: true } }); }

  async sendEmailBlast(subject: string, body: string, emailIds?: string[]) {
    const contacts = await this.prisma.emailContact.findMany({ where: { isActive: true, ...(emailIds?.length ? { id: { in: emailIds } } : {}) } });
    let sent = 0;
    for (const contact of contacts) {
      try { await this.mailerService.sendNewsletterEmail(contact.email, subject, body); sent++; } catch {}
    }
    return { success: sent > 0, sent, total: contacts.length };
  }

  async sendSMS(phoneNumber: string, message: string) {
    const apiKey = this.configService.get('BEEM_API_KEY');
    const secretKey = this.configService.get('BEEM_SECRET_KEY');
    
    if (!apiKey || !secretKey) {
      this.logger.error(`SMS FAILED: Beem Africa not configured. Missing BEEM_API_KEY or BEEM_SECRET_KEY`);
      throw new Error('SMS service not configured. Please contact administrator.');
    }

    // Beem Africa expects phone numbers in international format without the '+' sign
    // Ensure the number starts with country code (e.g., 260 for Zambia)
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // If number doesn't start with country code, try to add Zambia default
    if (cleanPhone.length === 9 && !cleanPhone.startsWith('260')) {
      cleanPhone = '260' + cleanPhone;
      this.logger.warn(`Phone number appears to be local format, adding Zambia country code: ${cleanPhone}`);
    }
    
    // Validate phone number length (should be 12-15 digits for international format)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      this.logger.error(`SMS FAILED: Invalid phone number format: ${cleanPhone} (length: ${cleanPhone.length})`);
      throw new Error('Invalid phone number format');
    }
    
    const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
    const sourceAddr = this.configService.get('BEEM_SOURCE_ADDR', 'KRYROS');
    
    try {
      this.logger.log(`Attempting to send SMS to ${cleanPhone} via Beem...`);
      const response = await axios.post(
        this.beemBaseUrl,
        {
          source_addr: sourceAddr,
          schedule_time: '',
          encoding: 0,
          message,
          recipients: [{ recipient_id: 1, dest_addr: cleanPhone }]
        },
        {
          headers: { 
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      // Check if the response indicates success
      if (response.data && response.data.response_code === '200') {
        this.logger.log(`SMS sent successfully to ${cleanPhone}. Response: ${JSON.stringify(response.data)}`);
        return { success: true, response: response.data };
      } else {
        this.logger.error(`SMS API returned error: ${JSON.stringify(response.data)}`);
        throw new Error(`SMS API error: ${response.data?.response_message || 'Unknown error'}`);
      }
    } catch (error) {
      this.logger.error(`SMS failure for ${cleanPhone}: ${error.message}`);
      if (error.response) {
        this.logger.error(`Beem API Error Details: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }
}
