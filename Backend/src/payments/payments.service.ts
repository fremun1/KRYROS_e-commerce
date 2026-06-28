import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { PaymentLinksService } from '../payment-links/payment-links.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly testUrl = 'https://test.543.cgrate.co.zm:8443/Konik/KonikWs';
  private readonly prodUrl = 'https://543.cgrate.co.zm/Konik/KonikWs';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private paymentLinksService: PaymentLinksService,
    private notificationsService: NotificationsService,
  ) {}

  private get apiUrl() {
    const env = this.configService.get('CGRATE_ENV') || this.configService.get('NODE_ENV');
    const url = env === 'production' ? this.prodUrl : this.testUrl;
    this.logger.log(`Using 543 API URL: ${url} (mode: ${env})`);
    return url;
  }

  private buildDirectPaymentTrackingLink(paymentNumber: string) {
    return `/track?order=${encodeURIComponent(paymentNumber)}`;
  }

  private formatDirectPaymentResponse(payment: any, overrideStatus?: string) {
    return {
      id: payment.id,
      amount: Number(payment.amount ?? 0),
      currency: payment.currency,
      status: String(overrideStatus || payment.status || 'PENDING').toLowerCase(),
      paymentNumber: payment.paymentNumber,
      paymentMethod: payment.paymentMethod,
      createdAt: payment.createdAt,
      trackingLink: payment.trackingLink,
      paymentReference: payment.paymentReference,
      receiptNumber: payment.receiptNumber,
      paidAt: payment.paidAt,
      customerName: payment.customerName,
      customerEmail: payment.customerEmail,
      paymentPhone: payment.paymentPhone,
    };
  }

  async process543Payment(orderId: string, phone: string, amountZMW: number) {
    const username = this.configService.get('CGRATE_USERNAME');
    const password = this.configService.get('CGRATE_PASSWORD');
    const transactionId = `KRYROS_${Date.now()}`;
    const paymentNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;


    this.logger.log('=== Starting 543 Payment Process ===');
    this.logger.log(`Order ID: ${orderId}`);
    this.logger.log(`Phone (raw): ${phone}`);
    this.logger.log(`Amount (ZMW): ${amountZMW}`);
    this.logger.log(`Transaction ID: ${transactionId}`);

    if (!username || !password) {
      const errorMsg = 'Payment service is not configured. Please contact KRYROS support.';
      this.logger.error('CGRATE_USERNAME or CGRATE_PASSWORD not configured in environment variables!');
      throw new HttpException({ message: errorMsg }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('260')) {
      formattedPhone = '0' + formattedPhone.substring(3);
    } else if (!formattedPhone.startsWith('0')) {
      formattedPhone = '0' + formattedPhone;
    }

    const formattedAmount = Number(amountZMW).toString();

    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:kon="http://konik.cgrate.com"><soapenv:Header><wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" soapenv:mustUnderstand="1"><wsse:UsernameToken xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" wsu:Id="${username}"><wsse:Username>${username}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><kon:processCustomerPayment><transactionAmount>${formattedAmount}</transactionAmount><customerMobile>${formattedPhone}</customerMobile><paymentReference>${transactionId}</paymentReference></kon:processCustomerPayment></soapenv:Body></soapenv:Envelope>`;

    try {
      const response = await axios.post(this.apiUrl, soapRequest, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': '',
          'Accept': 'text/xml',
        },
        timeout: 60000,
      });

      const parser = new XMLParser({
        ignoreAttributes: true,
        removeNSPrefix: true,
      });
      const result = parser.parse(response.data);
      const txReturn = result.Envelope?.Body?.processCustomerPaymentResponse?.return;

      if (!txReturn) {
        throw new Error('Invalid SOAP response structure');
      }

      const isSuccess = txReturn.responseCode === 0 || txReturn.responseCode === '0';
      const status = isSuccess ? 'PENDING' : 'FAILED';
      const reference = txReturn.paymentID || transactionId;
      const message = txReturn.responseMessage || 'No message provided';

      // Update order status in DB
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentReference: reference,
          paymentPhone: phone,
          paymentStatus: status as PaymentStatus,
          status: OrderStatus.PENDING,
        },
      });

      // Create or update DirectPayment record for this order
      await this.prisma.directPayment.upsert({
        where: { paymentNumber: paymentNumber },
        update: {
          status: status as PaymentStatus,
          paymentReference: reference,
          trackingLink: this.buildDirectPaymentTrackingLink(paymentNumber),
        },
        create: {
          paymentNumber: paymentNumber,
          userId: (await this.prisma.order.findUnique({ where: { id: orderId } }))?.userId,
          orderId: orderId,
          amount: amountZMW,
          currency: 'ZMW',
          paymentMethod: 'MOBILE_MONEY',
          paymentPhone: phone,
          paymentReference: reference,
          status: status as PaymentStatus,
          note: `Payment for order ${orderId}`,
          providerName: '543/cGrate',
          networkName: 'Mobile Money',
          trackingLink: this.buildDirectPaymentTrackingLink(paymentNumber),
        },
      });

      await this.prisma.orderLog.create({
        data: {
          orderId: orderId,
          status: 'PENDING',
          notes: isSuccess
            ? `Mobile money prompt sent to customer phone. Awaiting customer approval.`
            : `Payment prompt failed to send. Status: ${message}`,
        },
      });

      return { success: isSuccess, status: status, reference: reference, message: message };
    } catch (error) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      }).catch(() => {});
      throw error;
    }
  }

  async processDirectPayment(
    userId: string | null,
    phone: string | undefined,
    amountZMW: number,
    currency = 'ZMW',
    note?: string,
    paymentLinkId?: string,
    customerName?: string,
    customerEmail?: string,
  ) {
    this.logger.log(`=== Direct Payment (no order) for user: ${userId} ===`);

    if (paymentLinkId) {
      await this.paymentLinksService.validatePaymentLink(paymentLinkId);
    }

    const paymentNumber = `PAY-${Date.now().toString(36).toUpperCase()}`;
    const trackingLink = this.buildDirectPaymentTrackingLink(paymentNumber);

    const directPayment = await this.prisma.directPayment.create({
      data: {
        paymentNumber,
        ...(customerName ? { customerName } : {}),
        ...(customerEmail ? { customerEmail } : {}),
        ...(userId ? { userId } : {}),
        ...(paymentLinkId ? { paymentLinkId } : {}),
        amount: amountZMW,
        currency,
        note: note || 'Direct payment via Pay page',
        paymentMethod: 'MOBILE_MONEY',
        paymentPhone: phone,
        status: 'PENDING',
        providerName: '543/cGrate',
        networkName: 'Mobile Money',
        trackingLink: trackingLink,
      },
    });

    this.logger.log(`Created direct payment record: ${directPayment.id} (${paymentNumber})`);

    const result = await this.initiate543Direct(directPayment.id, phone, amountZMW);
    return {
      paymentId: directPayment.id,
      paymentNumber,
      trackingLink: trackingLink,
      ...result,
    };
  }

  private async initiate543Direct(paymentId: string, phone: string, amountZMW: number) {
    const username = this.configService.get('CGRATE_USERNAME');
    const password = this.configService.get('CGRATE_PASSWORD');
    const transactionId = `KRYROS_DP_${Date.now()}`;

    if (!username || !password) {
      throw new HttpException('Payment service not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('260')) {
      formattedPhone = '0' + formattedPhone.substring(3);
    } else if (!formattedPhone.startsWith('0')) {
      formattedPhone = '0' + formattedPhone;
    }

    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:kon="http://konik.cgrate.com"><soapenv:Header><wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" soapenv:mustUnderstand="1"><wsse:UsernameToken xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" wsu:Id="${username}"><wsse:Username>${username}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><kon:processCustomerPayment><transactionAmount>${amountZMW}</transactionAmount><customerMobile>${formattedPhone}</customerMobile><paymentReference>${transactionId}</paymentReference></kon:processCustomerPayment></soapenv:Body></soapenv:Envelope>`;

    try {
      const response = await axios.post(this.apiUrl, soapRequest, {
        headers: { 'Content-Type': 'text/xml;charset=UTF-8', 'SOAPAction': '', 'Accept': 'text/xml' },
        timeout: 60000,
      });

      const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
      const result = parser.parse(response.data);
      const txReturn = result.Envelope?.Body?.processCustomerPaymentResponse?.return;

      if (!txReturn) throw new Error('Invalid SOAP response');

      const isSuccess = txReturn.responseCode === 0 || txReturn.responseCode === '0';
      const status = isSuccess ? 'PENDING' : 'FAILED';
      const reference = txReturn.paymentID || transactionId;

      await this.prisma.directPayment.update({
        where: { id: paymentId },
        data: {
          paymentReference: reference,
          status: status as PaymentStatus,
        },
      });

      return { success: isSuccess, status: status, reference: reference };
    } catch (error) {
      await this.prisma.directPayment.update({
        where: { id: paymentId },
        data: { status: 'FAILED' },
      }).catch(() => {});
      throw error;
    }
  }

  async processWhatsAppPayment(
    userId: string | null,
    phone: string,
    amountZMW: number,
    currency = 'ZMW',
    note?: string,
    reference?: string,
    paymentLinkId?: string,
  ) {
    this.logger.log(`=== WhatsApp Direct Payment for user: ${userId}, ref: ${reference}`);

    if (paymentLinkId) {
      await this.paymentLinksService.validatePaymentLink(paymentLinkId);
    }

    const paymentNumber = `WA-${Date.now().toString(36).toUpperCase()}`;
    const trackingLink = this.buildDirectPaymentTrackingLink(paymentNumber);
    const directPayment = await this.prisma.directPayment.create({
      data: {
        paymentNumber,
        ...(userId ? { userId } : {}),
        ...(paymentLinkId ? { paymentLinkId } : {}),
        amount: amountZMW,
        currency,
        note: note || 'WhatsApp payment via Pay page',
        paymentMethod: 'WHATSAPP',
        paymentPhone: phone || '',
        paymentReference: reference,
        status: 'PENDING',
        providerName: 'WhatsApp',
        networkName: 'WhatsApp',
        trackingLink: trackingLink,
      },
    });

    return {
      paymentId: directPayment.id,
      paymentNumber,
      reference: reference || paymentNumber,
      status: 'PENDING',
      trackingLink: trackingLink,
    };
  }

  async findAllDirect() {
    return this.prisma.directPayment.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        paymentLink: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async updateDirectPaymentStatus(paymentId: string, status: PaymentStatus, adminNotes?: string) {
    const payment = await this.prisma.directPayment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new HttpException('Direct payment not found', HttpStatus.NOT_FOUND);
    }

    const updateData: Prisma.DirectPaymentUpdateInput = { status: status };
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }
    if (status === 'PAID' && !payment.paidAt) {
      updateData.paidAt = new Date();
      updateData.receiptNumber = `REC-${Date.now().toString(36).toUpperCase()}`;
    }

    const updatedPayment = await this.prisma.directPayment.update({
      where: { id: paymentId },
      data: updateData,
    });

    // If this direct payment is linked to an order, update the order status as well
    if (updatedPayment.orderId) {
      await this.prisma.order.update({
        where: { id: updatedPayment.orderId },
        data: {
          paymentStatus: status,
          status: status === 'PAID' ? OrderStatus.CONFIRMED : OrderStatus.PENDING,
        },
      });
    }

    // Send notification if payment is paid or failed
    if (status === 'PAID' || status === 'FAILED') {
      const user = updatedPayment.userId ? await this.prisma.user.findUnique({ where: { id: updatedPayment.userId } }) : null;
      const customerName =
        updatedPayment.customerName ||
        [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
        'Customer';
      const customerEmail = updatedPayment.customerEmail || user?.email;
      const customerPhone = updatedPayment.paymentPhone || user?.phone;

      if (customerEmail || customerPhone) {
        this.notificationsService.sendPaymentStatusNotification({
          email: customerEmail,
          phone: customerPhone,
          status: status,
          amount: updatedPayment.amount.toNumber(),
          currency: updatedPayment.currency,
          paymentNumber: updatedPayment.paymentNumber,
          paymentMethod: updatedPayment.paymentMethod || 'Direct Payment',
          customerName: customerName,
          receiptNumber: updatedPayment.receiptNumber,
          trackingLink: updatedPayment.trackingLink,
        });
      }
    }

    return updatedPayment;
  }

  async checkDirectStatus(paymentId: string) {
    const payment = await this.prisma.directPayment.findFirst({
      where: {
        OR: [
          { id: paymentId },
          { paymentNumber: paymentId },
        ],
      },
    });
    if (!payment) return null;

    // If it's a WhatsApp payment, status is manual
    if (payment.paymentMethod === 'WHATSAPP') {
      return this.formatDirectPaymentResponse(payment);
    }

    if (!payment.paymentReference) {
      return this.formatDirectPaymentResponse(payment);
    }

    if (payment.status === 'PAID' || payment.status === 'FAILED') {
      return this.formatDirectPaymentResponse(payment);
    }

    const username = this.configService.get('CGRATE_USERNAME');
    const password = this.configService.get('CGRATE_PASSWORD');
    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:kon="http://konik.cgrate.com"><soapenv:Header><wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" soapenv:mustUnderstand="1"><wsse:UsernameToken xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" wsu:Id="${username}"><wsse:Username>${username}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><kon:queryCustomerPayment><paymentReference>${payment.paymentReference}</paymentReference></kon:queryCustomerPayment></soapenv:Body></soapenv:Envelope>`;

    try {
      const response = await axios.post(this.apiUrl, soapRequest, {
        headers: { 'Content-Type': 'text/xml;charset=UTF-8', 'SOAPAction': '', 'Accept': 'text/xml' },
      });

      const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
      const result = parser.parse(response.data);
      const txReturn = result.Envelope?.Body?.queryCustomerPaymentResponse?.return;

      if (txReturn) {
        let newStatus = 'PENDING';
        const code = String(txReturn.responseCode);
        const msg = String(txReturn.responseMessage || '').toLowerCase();
        const rawStatus = String(txReturn.status || '').toUpperCase();
        
        if (code === '0') {
           if (rawStatus === 'FAILED' || msg.includes('fail') || msg.includes('cancel')) newStatus = 'FAILED';
           else if (rawStatus === 'PENDING' || msg.includes('pending')) newStatus = 'PENDING';
           else newStatus = 'PAID';
        } else if (code !== '114') {
           newStatus = 'FAILED';
        }
        
        if (newStatus !== payment.status) {
          const updateData: Prisma.DirectPaymentUpdateInput = { status: newStatus as PaymentStatus };
          if (newStatus === 'PAID' && !payment.paidAt) {
            updateData.paidAt = new Date();
            updateData.receiptNumber = `REC-${Date.now().toString(36).toUpperCase()}`;
          }
          const updatedPayment = await this.prisma.directPayment.update({
            where: { id: paymentId },
            data: updateData,
          });
          return this.formatDirectPaymentResponse(updatedPayment, newStatus);
        }
        return this.formatDirectPaymentResponse(payment, newStatus);
      }
    } catch (error) {
      this.logger.error(`Status Check Error: ${error.message}`);
    }
    return this.formatDirectPaymentResponse(payment);
  }

  async checkStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return null;

    // For order payments, we can also check the associated direct payment if it exists
    const directPayment = await this.prisma.directPayment.findFirst({ where: { orderId: orderId } });
    if (directPayment) {
      // If there's a direct payment, its status is more authoritative for direct payment methods
      return this.checkDirectStatus(directPayment.id);
    }

    if (!order.paymentReference) return null;

    if (order.paymentStatus === 'PAID' || order.paymentStatus === 'FAILED') {
      return { status: order.paymentStatus.toLowerCase() };
    }

    const username = this.configService.get('CGRATE_USERNAME');
    const password = this.configService.get('CGRATE_PASSWORD');
    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:kon="http://konik.cgrate.com"><soapenv:Header><wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" soapenv:mustUnderstand="1"><wsse:UsernameToken xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" wsu:Id="${username}"><wsse:Username>${username}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><kon:queryCustomerPayment><paymentReference>${order.paymentReference}</paymentReference></kon:queryCustomerPayment></soapenv:Body></soapenv:Envelope>`;

    try {
      const response = await axios.post(this.apiUrl, soapRequest, {
        headers: { 'Content-Type': 'text/xml;charset=UTF-8', 'SOAPAction': '', 'Accept': 'text/xml' },
      });

      const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
      const result = parser.parse(response.data);
      const txReturn = result.Envelope?.Body?.queryCustomerPaymentResponse?.return;

      if (txReturn) {
        let newStatus = 'PENDING';
        const code = String(txReturn.responseCode);
        const msg = String(txReturn.responseMessage || '').toLowerCase();
        const rawStatus = String(txReturn.status || '').toUpperCase();
        
        if (code === '0') {
           if (rawStatus === 'FAILED' || msg.includes('fail') || msg.includes('cancel')) newStatus = 'FAILED';
           else if (rawStatus === 'PENDING' || msg.includes('pending')) newStatus = 'PENDING';
           else newStatus = 'PAID';
        } else if (code !== '114') {
           newStatus = 'FAILED';
        }
        
        if (newStatus !== order.paymentStatus) {
          await this.prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: newStatus as PaymentStatus,
              status: newStatus === 'PAID' ? OrderStatus.CONFIRMED : OrderStatus.PENDING,
            },
          });
        }
        return { status: newStatus.toLowerCase() };
      }
    } catch (error) {
      this.logger.error(`Status Check Error: ${error.message}`);
    }
    return { status: order.paymentStatus.toLowerCase() };
  }
}
