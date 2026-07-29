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
      const adminDevices = await this.prisma.userDevice.findMany({
        where: { OR: [{ user: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } }, { isAdmin: true }] },
        select: { fcmToken: true, userId: true },
      });
      const tokens = adminDevices.map(d => d.fcmToken);
      if (tokens.length > 0) await this.sendToTokens(tokens, title, body, { ...data, isAdminAlert: 'true' });
      const adminIds = [...new Set(adminDevices.map(d => d.userId).filter(Boolean))];
      for (const adminId of adminIds) {
        await this.prisma.notification.create({ data: { userId: adminId as string, title, message: body, data: { ...data, isAdminAlert: 'true' }, targetType: 'SINGLE', sent: true } });
      }
    } catch (error) {}
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
      const message: admin.messaging.MulticastMessage = {
        notification: { title, body },
        tokens,
        data: { ...stringifiedData, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        android: { priority: 'high', notification: { channelId: 'kryros_notifications', clickAction: 'FLUTTER_NOTIFICATION_CLICK', sound: 'default' } },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
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
    await this.prisma.userDevice.upsert({ where: { fcmToken: token }, update: { userId, platform, updatedAt: new Date() }, create: { userId, fcmToken: token, platform } });
  }

  async registerPublicToken(token: string, platform: string = 'android', isAdmin: boolean = false) {
    return this.prisma.userDevice.upsert({ where: { fcmToken: token }, update: { platform, updatedAt: new Date(), isAdmin }, create: { fcmToken: token, platform, isAdmin } });
  }

  async sendOrderPlacedNotification(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
    if (!order) return;
    const name = order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest';
    await this.sendToAdmins('New Order Received!', `${name} just placed order #${order.orderNumber}.`, { url: `/admin/orders/${orderId}`, orderId });
  }

  async sendUserRegisteredNotification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await this.sendToAdmins('New User Registered!', `${user.firstName} ${user.lastName} has joined KRYROS.`, { url: `/admin/users/${userId}`, userId });
  }

  async sendUserLoginNotification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await this.sendToAdmins('User Login Alert', `${user.firstName} has just logged into the platform.`, { userId });
  }

  async sendPaymentReceiptNotification(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    await this.sendToAdmins('Payment Received!', `Payment confirmed for order #${order.orderNumber}.`, { url: `/admin/orders/${orderId}`, orderId });
  }

  async sendOrderStatusNotification(orderId: string, status: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
    if (!order) return;
    if (order.userId) await this.sendToUser(order.userId, 'Order Update', `Your order ${order.orderNumber} status has changed to ${status}.`, { orderId, status });
  }

  async sendPaymentStatusNotification(payload: any) {
    const isPaid = String(payload.status).toUpperCase() === 'PAID';
    if (payload.email) await this.mailerService.sendMail(payload.email, `Payment ${isPaid ? 'Paid' : 'Failed'}`, `Payment ${payload.paymentNumber} ${isPaid ? 'Paid' : 'Failed'}`, '');
  }

  async getRecentNotifications(limit: number = 20) {
    return this.prisma.notification.findMany({ take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { firstName: true, lastName: true, email: true } } } });
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

  async checkDatabase() { return { status: 'OK' }; }
  async checkFirebase() { return { status: 'OK' }; }
  async checkBeem() { return { status: 'OK' }; }
  async checkSmtp() { return { status: 'OK' }; }
  async deleteDevice(id: string) { await this.prisma.userDevice.delete({ where: { id } }); }
  async getSmsCountries() { return this.prisma.smsSupportedCountry.findMany(); }
  async addSmsCountry(name: string, dialCode: string, isoCode: string) { return this.prisma.smsSupportedCountry.create({ data: { name, dialCode, isoCode } }); }
  async toggleSmsCountry(id: string, isActive: boolean) { return this.prisma.smsSupportedCountry.update({ where: { id }, data: { isActive } }); }
  async deleteSmsCountry(id: string) { await this.prisma.smsSupportedCountry.delete({ where: { id } }); }
  async getEmailContacts() { return this.prisma.emailContact.findMany(); }
  async addEmailContact(email: string, name: string, source: string) { return this.prisma.emailContact.create({ data: { email, name, source } }); }
  async deleteEmailContact(id: string) { await this.prisma.emailContact.delete({ where: { id } }); }
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
    if (!apiKey || !secretKey) return;
    const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
    try { await axios.post(this.beemBaseUrl, { source_addr: 'INFO', schedule_time: '', encoding: 0, message, recipients: [{ recipient_id: 1, dest_addr: phoneNumber }] }, { headers: { Authorization: `Basic ${auth}` } }); } catch {}
  }
}
