import { Injectable, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { PaymentLinksService } from '../payment-links/payment-links.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly testUrl = 'https://test.543.cgrate.co.zm:8443/Konik/KonikWs';
  private readonly prodUrl = 'https://543.cgrate.co.zm/Konik/KonikWs';
  private readonly valid543PhoneRegex = /^(260)(97|77|57|76|96|95|75)\d{7}$/;
  private readonly defaultGatewayTimeoutMs = this.getTimeoutConfig('CGRATE_TIMEOUT_MS', 120000);
  private readonly statusQueryTimeoutMs = this.getTimeoutConfig('CGRATE_STATUS_TIMEOUT_MS', 30000);

  // Country-specific phone validation patterns
  private readonly countryPhonePatterns: Record<string, { regex: RegExp; countryCode: string; description: string }> = {
    ZM: {
      regex: /^(260)(97|77|57|76|96|95|75)\d{7}$/,
      countryCode: '260',
      description: 'Zambian mobile number (260 + 9-digit number)',
    },
    NG: {
      regex: /^(234)(70|71|72|73|74|75|76|77|78|79|80|81|90|91)\d{8}$/,
      countryCode: '234',
      description: 'Nigerian mobile number (234 + 10-digit number)',
    },
    GH: {
      regex: /^(233)(20|24|25|26|27|28|50|51|52|53|54|55|56|57|58|59)\d{7}$/,
      countryCode: '233',
      description: 'Ghanaian mobile number (233 + 9-digit number)',
    },
    KE: {
      regex: /^(254)(7)\d{8}$/,
      countryCode: '254',
      description: 'Kenyan mobile number (254 + 9-digit number)',
    },
    TZ: {
      regex: /^(255)(6|7)\d{8}$/,
      countryCode: '255',
      description: 'Tanzanian mobile number (255 + 9-digit number)',
    },
    UG: {
      regex: /^(256)(7)\d{8}$/,
      countryCode: '256',
      description: 'Ugandan mobile number (256 + 9-digit number)',
    },
  };

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
    return `/track-payment/${encodeURIComponent(paymentNumber)}`;
  }

  private assertValidPaymentAmount(amountZMW: number) {
    if (!Number.isFinite(amountZMW) || amountZMW <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }
  }

  private generateGatewayReference(prefix: string, identifier?: string) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const identifierSuffix = String(identifier || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(-8)
      .toUpperCase();

    return [prefix, timestamp, randomSuffix, identifierSuffix].filter(Boolean).join('_');
  }

  private buildGatewayMessage(responseCode: unknown, responseMessage: unknown) {
    const code = String(responseCode ?? '').trim();
    const message = String(responseMessage ?? 'No message provided').trim();

    if (!code) {
      return message;
    }

    return `[${code}] ${message}`;
  }

  private getTimeoutConfig(key: string, fallback: number) {
    const rawValue = this.configService.get<string | number>(key);
    const parsedValue = Number(rawValue);

    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      return parsedValue;
    }

    if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
      this.logger.warn(`Invalid ${key} value "${rawValue}". Falling back to ${fallback}ms.`);
    }

    return fallback;
  }

  private getGatewayTimeoutMessage(operation: string, timeoutMs: number) {
    const timeoutSeconds = Math.round(timeoutMs / 1000);
    return `The 543 payment service did not respond within ${timeoutSeconds} seconds while ${operation}. Please try again.`;
  }

  private toGatewayHttpException(error: unknown, fallbackMessage: string) {
    if (error instanceof HttpException) {
      return error;
    }

    if (axios.isAxiosError(error) && (error.code === 'ECONNABORTED' || /timeout/i.test(error.message))) {
      return new HttpException({ message: fallbackMessage }, HttpStatus.GATEWAY_TIMEOUT);
    }

    return new HttpException({ message: fallbackMessage }, HttpStatus.BAD_GATEWAY);
  }

  /**
   * Normalize phone number for a specific country
   * Supports multiple African countries with their respective phone formats
   */
  private normalizePhoneForCountry(phone: string, countryCode?: string): { formatted: string; country: string } {
    // Strip all non-digits, including the '+' sign which the gateway doesn't like
    let digits = String(phone || '').replace(/\D/g, '');

    // Try to detect country from phone number if not provided
    let detectedCountry = countryCode?.trim().toUpperCase();

    if (detectedCountry && !this.countryPhonePatterns[detectedCountry]) {
      this.logger.warn(
        `Unsupported payment country code "${detectedCountry}" received. Falling back to phone auto-detect/default country.`,
      );
      detectedCountry = undefined;
    }

    if (!detectedCountry) {
      // Try to match against known country codes
      for (const [country, pattern] of Object.entries(this.countryPhonePatterns)) {
        const countryDialCode = pattern.countryCode;
        if (digits.startsWith(countryDialCode)) {
          detectedCountry = country;
          break;
        }
      }
    }

    // If still not detected, default to Zambia for backward compatibility
    if (!detectedCountry) {
      detectedCountry = 'ZM';
    }

    const pattern = this.countryPhonePatterns[detectedCountry];

    // Normalize the phone number
    if (digits.startsWith(`${pattern.countryCode}0`)) {
      // Handles numbers entered as +260097xxxxxxx where the local leading 0
      // was kept after adding the country code in the UI.
      digits = `${pattern.countryCode}${digits.substring(pattern.countryCode.length + 1)}`;
    } else if (digits.startsWith(pattern.countryCode)) {
      // Already in international format
    } else if (digits.startsWith('0')) {
      // Local format starting with 0
      digits = `${pattern.countryCode}${digits.substring(1)}`;
    } else if (digits.length === 9 || digits.length === 10) {
      // Just the local number without country code
      digits = `${pattern.countryCode}${digits}`;
    } else {
      // Try to prepend country code
      digits = `${pattern.countryCode}${digits}`;
    }

    // Validate against the country's pattern
    if (!pattern.regex.test(digits)) {
      throw new HttpException(
        {
          message: `Invalid ${detectedCountry} mobile number. ${pattern.description}. You provided: ${phone}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return { formatted: digits, country: detectedCountry };
  }

  /**
   * Normalize phone for 543 payment gateway (Zambia-specific)
   * Kept for backward compatibility
   */
  private normalizePhoneFor543(phone: string) {
    const { formatted } = this.normalizePhoneForCountry(phone, 'ZM');
    return formatted;
  }

  private log543Error(context: string, error: unknown) {
    if (axios.isAxiosError(error)) {
      const errorCode = error.code ? ` [${error.code}]` : '';
      this.logger.error(`${context}${errorCode}: ${error.message}`);
      if (error.response?.status) {
        this.logger.error(`${context} status: ${error.response.status}`);
      }
      if (error.response?.data) {
        this.logger.error(
          `${context} body: ${typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)}`,
        );
      }
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${message}`);
  }

  private formatDirectPaymentResponse(payment: any, overrideStatus?: string) {
    const metadata = payment.metadata as any;
    return {
      id: payment.id,
      amount: Number(payment.amount ?? 0),
      currency: payment.currency,
      originalAmount: metadata?.originalAmount ? Number(metadata.originalAmount) : Number(payment.amount ?? 0),
      originalCurrency: metadata?.originalCurrency || payment.currency,
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
      note: payment.note,
      message: payment.note,
    };
  }

  private async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(`Payment gateway request attempt ${attempt}/${maxRetries}`);
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const waitTime = delayMs * Math.pow(2, attempt - 1);
          this.logger.debug(`Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    this.logger.error(`All ${maxRetries} attempts failed`);
    throw lastError;
  }

  private async postGatewaySoapRequest(soapAction: string, soapRequest: string, timeoutMs = this.defaultGatewayTimeoutMs) {
    this.logger.log(`Calling 543 SOAP action "${soapAction}" with timeout ${timeoutMs}ms to ${this.apiUrl}`);

    return this.retryRequest(async () => {
      try {
        const response = await axios.post(this.apiUrl, soapRequest, {
          headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            'SOAPAction': soapAction,
            'Accept': 'text/xml',
          },
          timeout: timeoutMs,
          // Add retry logic and better error handling
          validateStatus: (status) => status >= 200 && status < 300,
          // Disable IPv6 if needed - some environments have issues with IPv6 connectivity
          family: 4,
        });
        this.logger.log(`Received response from gateway (status ${response.status}):`);
        this.logger.log(`Response headers: ${JSON.stringify(response.headers)}`);
        this.logger.log(`Response data: ${typeof response.data === 'string' ? response.data : JSON.stringify(response.data)}`);
        return response;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          this.logger.error(`Gateway error - Status: ${error.response?.status}`);
          this.logger.error(`Response headers: ${JSON.stringify(error.response?.headers)}`);
          this.logger.error(`Response data: ${typeof error.response?.data === 'string' ? error.response.data : JSON.stringify(error.response?.data)}`);
          this.logger.error(`Error message: ${error.message}`);
        }
        throw error;
      }
    });
  }

  async process543Payment(orderId: string, phone: string, amountZMW: number, countryCode?: string) {
    const username = this.configService.get('CGRATE_USERNAME');
    const password = this.configService.get('CGRATE_PASSWORD');
    const transactionId = this.generateGatewayReference('KRYROS', orderId);
    const paymentNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    this.logger.log('=== Starting 543 Payment Process ===');
    this.logger.log(`Order ID: ${orderId}`);
    this.logger.log(`Phone (raw): ${phone}`);
    this.logger.log(`Amount (ZMW): ${amountZMW}`);
    this.logger.log(`Country Code: ${countryCode || 'auto-detect'}`);
    this.logger.log(`Transaction ID: ${transactionId}`);

    if (!username || !password) {
      const errorMsg = 'Payment service is not configured. Please contact KRYROS support.';
      this.logger.error('CGRATE_USERNAME or CGRATE_PASSWORD not configured in environment variables!');
      throw new HttpException({ message: errorMsg }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Normalize phone for the specified or detected country
    let formattedPhone: string;
    try {
      const result = this.normalizePhoneForCountry(phone, countryCode);
      formattedPhone = result.formatted;
      this.logger.log(`Phone (normalized for ${result.country}): ${formattedPhone}`);
    } catch (error) {
      throw error;
    }

    const formattedAmount = Number(amountZMW).toFixed(2);

    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:kon="http://konik.cgrate.com"><soapenv:Header><wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" soapenv:mustUnderstand="1"><wsse:UsernameToken xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" wsu:Id="${username}"><wsse:Username>${username}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><kon:processCustomerPayment><transactionAmount>${formattedAmount}</transactionAmount><customerMobile>${formattedPhone}</customerMobile><paymentReference>${transactionId}</paymentReference></kon:processCustomerPayment></soapenv:Body></soapenv:Envelope>`;
    this.logger.log(`Generated SOAP request for processCustomerPayment (amount=${formattedAmount}, phone=${formattedPhone}, ref=${transactionId})`);
    this.logger.log(`Full SOAP Request XML (JSON stringified): ` + JSON.stringify(soapRequest));

    try {
      const response = await this.postGatewaySoapRequest('processCustomerPayment', soapRequest);

      const parser = new XMLParser({
        ignoreAttributes: true,
        removeNSPrefix: true,
      });
      const result = parser.parse(response.data);
      const txReturn = result.Envelope?.Body?.processCustomerPaymentResponse?.return;

      if (!txReturn) {
        throw new Error('Invalid SOAP response structure');
      }

      const responseCode = String(txReturn.responseCode ?? '');
      const isSuccess = responseCode === '0';
      const status = isSuccess ? 'PENDING' : 'FAILED';
      const reference = txReturn.paymentID || transactionId;
      const message = this.buildGatewayMessage(txReturn.responseCode, txReturn.responseMessage);

      // Update order status in DB
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentReference: reference,
          paymentPhone: formattedPhone,
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
          paymentPhone: formattedPhone,
          paymentReference: reference,
          status: status as PaymentStatus,
          note: isSuccess
            ? `Payment for order ${orderId}`
            : `Payment prompt failed: ${message}`,
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

      return { success: isSuccess, status: status, reference: reference, message: message, code: responseCode };
    } catch (error) {
      this.log543Error('543 payment init failed', error);
      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      }).catch(() => {});
      throw this.toGatewayHttpException(
        error,
        this.getGatewayTimeoutMessage('starting the payment prompt', this.defaultGatewayTimeoutMs),
      );
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
    originalAmount?: number,
    originalCurrency?: string,
    countryCode?: string,
  ) {
    this.logger.log(`=== Direct Payment (no order) for user: ${userId} ===`);

    this.assertValidPaymentAmount(amountZMW);

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
        currency: 'ZMW',
        note: note || 'Direct payment via Pay page',
        paymentMethod: 'MOBILE_MONEY',
        paymentPhone: phone,
        status: 'PENDING',
        providerName: '543/cGrate',
        networkName: 'Mobile Money',
        trackingLink: trackingLink,
        metadata: {
          originalAmount: originalAmount || amountZMW,
          originalCurrency: originalCurrency || currency,
          countryCode: countryCode,
        }
      },
    });

    this.logger.log(`Created direct payment record: ${directPayment.id} (${paymentNumber})`);

    const result = await this.initiate543Direct(directPayment.id, phone, amountZMW, countryCode);
    return {
      paymentId: directPayment.id,
      paymentNumber,
      trackingLink: trackingLink,
      ...result,
    };
  }

  private async initiate543Direct(paymentId: string, phone: string, amountZMW: number, countryCode?: string) {
    const username = this.configService.get('CGRATE_USERNAME');
    const password = this.configService.get('CGRATE_PASSWORD');
    const transactionId = this.generateGatewayReference('KRYROS_DP', paymentId);

    if (!username || !password) {
      throw new HttpException('Payment service not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Normalize phone for the specified or detected country
    let formattedPhone: string;
    try {
      const result = this.normalizePhoneForCountry(phone, countryCode);
      formattedPhone = result.formatted;
      this.logger.log(`Direct payment phone (normalized for ${result.country}): ${formattedPhone}`);
    } catch (error) {
      throw error;
    }

    const formattedAmount = Number(amountZMW).toFixed(2);
    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:kon="http://konik.cgrate.com"><soapenv:Header><wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" soapenv:mustUnderstand="1"><wsse:UsernameToken xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" wsu:Id="${username}"><wsse:Username>${username}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><kon:processCustomerPayment><transactionAmount>${formattedAmount}</transactionAmount><customerMobile>${formattedPhone}</customerMobile><paymentReference>${transactionId}</paymentReference></kon:processCustomerPayment></soapenv:Body></soapenv:Envelope>`;
    this.logger.log(`Generated SOAP request for direct payment (amount=${formattedAmount}, phone=${formattedPhone}, ref=${transactionId})`);
    this.logger.log(`Full SOAP Request XML (JSON stringified): ` + JSON.stringify(soapRequest));

    try {
      const response = await this.postGatewaySoapRequest('processCustomerPayment', soapRequest);

      const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
      const result = parser.parse(response.data);
      const txReturn = result.Envelope?.Body?.processCustomerPaymentResponse?.return;

      if (!txReturn) throw new Error('Invalid SOAP response');

      const responseCode = String(txReturn.responseCode ?? '');
      const isSuccess = responseCode === '0';
      const status = isSuccess ? 'PENDING' : 'FAILED';
      const reference = txReturn.paymentID || transactionId;
      const message = this.buildGatewayMessage(txReturn.responseCode, txReturn.responseMessage);

      await this.prisma.directPayment.update({
        where: { id: paymentId },
        data: {
          paymentReference: reference,
          paymentPhone: formattedPhone,
          status: status as PaymentStatus,
          note: isSuccess
            ? 'Mobile money prompt sent. Waiting for customer approval on phone.'
            : `Payment prompt failed: ${message}`,
        },
      });

      return { success: isSuccess, status: status, reference: reference, message, code: responseCode };
    } catch (error) {
      this.log543Error('543 direct payment init failed', error);
      const failureMessage =
        axios.isAxiosError(error) && (error.code === 'ECONNABORTED' || /timeout/i.test(error.message))
          ? this.getGatewayTimeoutMessage('starting the payment prompt', this.defaultGatewayTimeoutMs)
          : error instanceof Error
            ? error.message
            : 'Payment initialization failed';
      await this.prisma.directPayment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
          note: `Payment initialization failed: ${failureMessage}`,
        },
      }).catch(() => {});
      throw this.toGatewayHttpException(
        error,
        this.getGatewayTimeoutMessage('starting the payment prompt', this.defaultGatewayTimeoutMs),
      );
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
    originalAmount?: number,
    originalCurrency?: string,
    countryCode?: string,
  ) {
    this.logger.log(`=== WhatsApp Direct Payment for user: ${userId}, ref: ${reference}`);

    this.assertValidPaymentAmount(amountZMW);

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
        metadata: {
          originalAmount: originalAmount || amountZMW,
          originalCurrency: originalCurrency || currency,
          countryCode: countryCode,
        }
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDirectPayment(id: string) {
    return this.prisma.directPayment.delete({
      where: { id },
    });
  }

  async findDirectById(id: string) {
    return this.prisma.directPayment.findUnique({
      where: { id },
    });
  }

  async findDirectByPaymentNumber(paymentNumber: string) {
    return this.prisma.directPayment.findUnique({
      where: { paymentNumber },
    });
  }

  private async findDirectPaymentByIdentifier(identifier: string) {
    return (
      (await this.prisma.directPayment.findUnique({
        where: { id: identifier },
      })) ||
      (await this.prisma.directPayment.findUnique({
        where: { paymentNumber: identifier },
      }))
    );
  }

  async updateDirectPaymentStatus(id: string, status: PaymentStatus, adminNotes?: string) {
    return this.prisma.directPayment.update({
      where: { id },
      data: { 
        status, 
        ...(adminNotes ? { note: adminNotes } : {}),
        ...(status === 'PAID' ? { paidAt: new Date() } : {})
      },
    });
  }

  async checkDirectStatus(paymentId: string) {
    const payment = await this.findDirectPaymentByIdentifier(paymentId);
    if (!payment) return null;

    if (!payment.paymentReference || payment.status === 'PAID' || payment.status === 'FAILED') {
      return this.formatDirectPaymentResponse(payment);
    }

    const username = this.configService.get('CGRATE_USERNAME');
    const password = this.configService.get('CGRATE_PASSWORD');
    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:kon="http://konik.cgrate.com"><soapenv:Header><wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" soapenv:mustUnderstand="1"><wsse:UsernameToken xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" wsu:Id="${username}"><wsse:Username>${username}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><kon:queryCustomerPayment><paymentReference>${payment.paymentReference}</paymentReference></kon:queryCustomerPayment></soapenv:Body></soapenv:Envelope>`;

    try {
      const response = await this.postGatewaySoapRequest(
        'queryCustomerPayment',
        soapRequest,
        this.statusQueryTimeoutMs,
      );

      const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
      const result = parser.parse(response.data);
      const txReturn = result.Envelope?.Body?.queryCustomerPaymentResponse?.return;

      if (txReturn) {
        let newStatus = 'PENDING';
        const code = String(txReturn.responseCode);
        const msg = String(txReturn.responseMessage || '').toLowerCase();
        const rawStatus = String(txReturn.status || '').toUpperCase();
        
        this.logger.log(`Direct payment status check - Code: ${code}, RawStatus: ${rawStatus}, Message: ${msg}, CurrentStatus: ${payment.status}`);
        
        if (code === '0') {
           if (rawStatus === 'FAILED' || msg.includes('fail') || msg.includes('cancel')) newStatus = 'FAILED';
           else if (rawStatus === 'PENDING' || msg.includes('pending')) newStatus = 'PENDING';
           else newStatus = 'PAID';
        } else if (code === '114') {
           // Code 114 means transaction not found - keep current status
           newStatus = payment.status;
        } else {
           // For other error codes, check if the message indicates success
           if (rawStatus === 'PAID' || rawStatus === 'SUCCESS' || msg.includes('success') || msg.includes('complete') || msg.includes('approved')) {
             newStatus = 'PAID';
           } else if (rawStatus === 'FAILED' || msg.includes('fail') || msg.includes('cancel') || msg.includes('error')) {
             newStatus = 'FAILED';
           } else {
             // For ambiguous codes, keep current status to avoid false failures
             this.logger.warn(`Ambiguous payment response code ${code}: ${msg}. Keeping current status: ${payment.status}`);
             newStatus = payment.status;
           }
        }
        
        if (newStatus !== payment.status) {
          const updateData: Prisma.DirectPaymentUpdateInput = {
            status: newStatus as PaymentStatus,
          };
          if (newStatus === 'FAILED' && txReturn.responseMessage) {
            updateData.note = `Payment failed: ${this.buildGatewayMessage(txReturn.responseCode, txReturn.responseMessage)}`;
          }
          if (newStatus === 'PAID' && !payment.paidAt) {
            updateData.paidAt = new Date();
            updateData.receiptNumber = `REC-${Date.now().toString(36).toUpperCase()}`;
            updateData.note = 'Payment approved successfully.';
          }
          const updatedPayment = await this.prisma.directPayment.update({
            where: { id: payment.id },
            data: updateData,
          });

          // Send notifications (non-blocking)
          if (newStatus === 'PAID' || newStatus === 'FAILED') {
            this.notificationsService.sendPaymentStatusNotification({
              userId: updatedPayment.userId,  // Include userId so service can determine country
              email: updatedPayment.customerEmail,
              phone: updatedPayment.paymentPhone,
              status: newStatus,
              amount: Number(updatedPayment.amount),
              currency: updatedPayment.currency,
              paymentNumber: updatedPayment.paymentNumber,
              paymentMethod: updatedPayment.paymentMethod,
              customerName: updatedPayment.customerName,
              receiptNumber: updatedPayment.receiptNumber,
              trackingLink: updatedPayment.trackingLink,
            }).catch(e => this.logger.warn(`sendPaymentStatusNotification failed for ${updatedPayment.paymentNumber}: ${e.message}`));
          }

          return this.formatDirectPaymentResponse(updatedPayment, newStatus);
        }
        return this.formatDirectPaymentResponse(payment, newStatus);
      }
    } catch (error) {
      this.log543Error('Status Check Error', error);
    }
    return this.formatDirectPaymentResponse(payment);
  }

  /**
   * Automatically check and update status for all pending automated payments
   * Runs every 30 seconds via cron job
   */
  @Cron('*/30 * * * * *')
  async autoUpdatePendingPayments() {
    this.logger.log('=== Auto-updating pending automated payments ===');
    
    // Find all pending payments that have a paymentReference (automated payments)
    const pendingPayments = await this.prisma.directPayment.findMany({
      where: {
        status: 'PENDING',
        paymentReference: { not: null },
        paymentMethod: { in: ['MOBILE_MONEY'] } // Only automated payments
      },
      take: 50, // Limit to avoid overwhelming the gateway
    });

    this.logger.log(`Found ${pendingPayments.length} pending automated payments to check`);

    let updatedCount = 0;
    for (const payment of pendingPayments) {
      try {
        const result = await this.checkDirectStatus(payment.id);
        if (result && (result.status === 'PAID' || result.status === 'FAILED')) {
          updatedCount++;
          this.logger.log(`Updated payment ${payment.paymentNumber} to ${result.status}`);
        }
      } catch (error) {
        this.logger.error(`Failed to check payment ${payment.paymentNumber}:`, error);
      }
    }

    this.logger.log(`Auto-update complete: ${updatedCount} payments updated`);
    return { checked: pendingPayments.length, updated: updatedCount };
  }

  async checkStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return null;

    const directPayment = await this.prisma.directPayment.findFirst({ where: { orderId: orderId } });
    if (directPayment) {
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
      const response = await this.postGatewaySoapRequest(
        'queryCustomerPayment',
        soapRequest,
        this.statusQueryTimeoutMs,
      );

      const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
      const result = parser.parse(response.data);
      const txReturn = result.Envelope?.Body?.queryCustomerPaymentResponse?.return;

      if (txReturn) {
        let newStatus = 'PENDING';
        const code = String(txReturn.responseCode);
        const msg = String(txReturn.responseMessage || '').toLowerCase();
        const rawStatus = String(txReturn.status || '').toUpperCase();
        
        this.logger.log(`Order payment status check - Code: ${code}, RawStatus: ${rawStatus}, Message: ${msg}, CurrentStatus: ${order.paymentStatus}`);
        
        if (code === '0') {
           if (rawStatus === 'FAILED' || msg.includes('fail') || msg.includes('cancel')) newStatus = 'FAILED';
           else if (rawStatus === 'PENDING' || msg.includes('pending')) newStatus = 'PENDING';
           else newStatus = 'PAID';
        } else if (code === '114') {
           // Code 114 means transaction not found - keep current status
           newStatus = order.paymentStatus;
        } else {
           // For other error codes, check if the message indicates success
           if (rawStatus === 'PAID' || rawStatus === 'SUCCESS' || msg.includes('success') || msg.includes('complete') || msg.includes('approved')) {
             newStatus = 'PAID';
           } else if (rawStatus === 'FAILED' || msg.includes('fail') || msg.includes('cancel') || msg.includes('error')) {
             newStatus = 'FAILED';
           } else {
             // For ambiguous codes, keep current status to avoid false failures
             this.logger.warn(`Ambiguous payment response code ${code}: ${msg}. Keeping current status: ${order.paymentStatus}`);
             newStatus = order.paymentStatus;
           }
        }
        
        if (newStatus !== order.paymentStatus) {
          const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: newStatus as PaymentStatus,
              status: newStatus === 'PAID' ? OrderStatus.CONFIRMED : OrderStatus.PENDING,
            },
          });

          // Send order status notification if payment status changed to PAID/FAILED
          if (newStatus === 'PAID' || newStatus === 'FAILED') {
            this.notificationsService.sendOrderStatusNotification(orderId, newStatus === 'PAID' ? 'CONFIRMED' : 'PENDING')
              .catch(e => this.logger.warn(`sendOrderStatusNotification failed for ${orderId}: ${e.message}`));
          }
        }
        return {
          status: newStatus.toLowerCase(),
          message: newStatus === 'FAILED'
            ? this.buildGatewayMessage(txReturn.responseCode, txReturn.responseMessage)
            : undefined,
        };
      }
    } catch (error) {
      this.log543Error('Order Status Check Error', error);
    }
    return { status: order.paymentStatus.toLowerCase() };
  }
}
