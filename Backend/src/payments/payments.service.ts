import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import axios from 'axios';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly testUrl = 'https://test.543.cgrate.co.zm:8443/Konik/KonikWs';
  private readonly prodUrl = 'https://543.cgrate.co.zm/Konik/KonikWs';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private get apiUrl() {
    const env = this.configService.get('CGRATE_ENV') || this.configService.get('NODE_ENV');
    const url = env === 'production' ? this.prodUrl : this.testUrl;
    this.logger.log(`Using 543 API URL: ${url} (mode: ${env})`);
    return url;
  }

  async process543Payment(orderId: string, phone: string, amountZMW: number) {
    const username = this.configService.get('CGRATE_USERNAME');
    const password = this.configService.get('CGRATE_PASSWORD');
    const transactionId = `KRYROS_${Date.now()}`;

    this.logger.log('=== Starting 543 Payment Process ===');
    this.logger.log(`Order ID: ${orderId}`);
    this.logger.log(`Phone (raw): ${phone}`);
    this.logger.log(`Amount (ZMW): ${amountZMW}`);
    this.logger.log(`Transaction ID: ${transactionId}`);
    this.logger.log(`Username configured: ${username ? 'Yes' : 'NO!'}`);
    this.logger.log(`Password configured: ${password ? 'Yes' : 'NO!'}`);

    if (!username || !password) {
      const errorMsg = 'Payment service is not configured. Please contact KRYROS support.';
      this.logger.error('CGRATE_USERNAME or CGRATE_PASSWORD not configured in environment variables!');
      throw new HttpException({ message: errorMsg }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Ensure phone format: 09XXXXXXXX or 07XXXXXXXX (Postman collection uses 0... format)
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('260')) {
      formattedPhone = '0' + formattedPhone.substring(3);
    } else if (!formattedPhone.startsWith('0')) {
      formattedPhone = '0' + formattedPhone;
    }

    // Ensure amount is formatted as a clean string (No decimals for round numbers, but support decimals if they exist)
    const formattedAmount = Number(amountZMW).toString();

    this.logger.log(`Formatted Phone: ${formattedPhone}`);
    this.logger.log(`Formatted Amount: ${formattedAmount}`);

    // Nuclear Fix: Exact Postman-matching XML structure with zero extra spaces
    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:kon="http://konik.cgrate.com"><soapenv:Header><wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" soapenv:mustUnderstand="1"><wsse:UsernameToken xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" wsu:Id="${username}"><wsse:Username>${username}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><kon:processCustomerPayment><transactionAmount>${formattedAmount}</transactionAmount><customerMobile>${formattedPhone}</customerMobile><paymentReference>${transactionId}</paymentReference></kon:processCustomerPayment></soapenv:Body></soapenv:Envelope>`;

    this.logger.log('SOAP Request being sent (Minified & Postman-Matched):');
    this.logger.log(soapRequest);

    try {
      this.logger.log(`Sending POST request to: ${this.apiUrl}`);
      
      const response = await axios.post(this.apiUrl, soapRequest, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': '',
          'Accept': 'text/xml',
        },
        timeout: 60000,
      });

      this.logger.log('=== 543 API Response Received ===');
      this.logger.log(`Response Status: ${response.status}`);
      this.logger.log(`Response Headers: ${JSON.stringify(response.headers)}`);
      this.logger.log(`Response Data (raw): ${response.data}`);

      const parser = new XMLParser({
        ignoreAttributes: true,
        removeNSPrefix: true,
      });
      const result = parser.parse(response.data);
      
      this.logger.log(`Parsed XML Result: ${JSON.stringify(result, null, 2)}`);
      
      const txReturn = result.Envelope?.Body?.processCustomerPaymentResponse?.return;

      if (!txReturn) {
        const errorMsg = 'Invalid SOAP response structure - return block not found!';
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      this.logger.log(`Transaction Return: ${JSON.stringify(txReturn, null, 2)}`);

      // responseCode 0 means prompt was successfully sent to the customer's phone.
      // We mark as PENDING here — the customer still needs to approve on their device.
      // Status will move to PAID only after polling confirms customer approval.
      const isSuccess = txReturn.responseCode === 0 || txReturn.responseCode === '0';
      const status = isSuccess ? 'PENDING' : 'FAILED';
      const reference = txReturn.paymentID || transactionId;
      const message = txReturn.responseMessage || 'No message provided';

      this.logger.log(`Payment Prompt Sent: ${isSuccess} (Code: ${txReturn.responseCode})`);
      this.logger.log(`Payment Reference: ${reference}`);
      this.logger.log(`Payment Message: ${message}`);

      // Update order status in DB — stays PENDING until customer approves on phone
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentReference: reference,
          paymentPhone: phone,
          paymentStatus: status as PaymentStatus,
        },
      });

      // Log the change
      await this.prisma.orderLog.create({
        data: {
          orderId: orderId,
          status: 'PENDING',
          notes: isSuccess
            ? `Mobile money prompt sent to customer phone. Awaiting customer approval.`
            : `Payment prompt failed to send. Status: ${message}`,
        },
      });

      this.logger.log('Order updated in database');

      return {
        success: isSuccess,
        status: status,
        reference: reference,
        message: message,
      };
    } catch (error) {
      this.logger.error('=== 543 Payment ERROR ===');
      if (axios.isAxiosError(error)) {
        this.logger.error(`Axios Error Message: ${error.message}`);
        this.logger.error(`Axios Error Code: ${error.code}`);
        if (error.response) {
          this.logger.error(`Error Response Status: ${error.response.status}`);
          this.logger.error(`Error Response Headers: ${JSON.stringify(error.response.headers)}`);
          this.logger.error(`Error Response Data: ${error.response.data}`);
        }
        if (error.request) {
          this.logger.error(`Error Request was sent but no response received`);
        }
      } else {
        this.logger.error(`Generic Error: ${error.message}`);
        this.logger.error(`Error Stack: ${error.stack}`);
      }
      
      try {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'FAILED' },
        });
        this.logger.log('Order marked as FAILED in database');
      } catch (dbError) {
        this.logger.error(`Failed to update order status to FAILED: ${dbError.message}`);
      }

      if (error instanceof HttpException) throw error;

      if (axios.isAxiosError(error)) {
        const msg = error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT'
          ? 'Could not reach the payment gateway. Please try again shortly.'
          : 'Payment gateway returned an error. Please try again.';
        throw new HttpException({ message: msg }, HttpStatus.BAD_GATEWAY);
      }

      throw new HttpException(
        { message: error.message || 'Payment failed. Please try again.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processDirectPayment(userId: string | null, phone: string, amountZMW: number, currency = 'ZMW', note?: string) {
    this.logger.log(`=== Direct Payment (no order) for user: ${userId} ===`);

    // Create a lightweight placeholder order so we can track the payment
    const orderNumber = `DIR-${Date.now().toString(36).toUpperCase()}`;
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        ...(userId ? { userId } : {}),
        paymentMethod: 'MOBILE_MONEY',
        paymentPhone: phone,
        subtotal: amountZMW,
        total: amountZMW,
        currencyCode: currency,
        currencySymbol: currency,
        notes: note || 'Direct payment via Pay page',
        paymentStatus: 'PENDING',
        status: 'PENDING',
      },
    });

    this.logger.log(`Created placeholder order: ${order.id} (${orderNumber})`);

    const result = await this.process543Payment(order.id, phone, amountZMW);
    return {
      orderId: order.id,
      orderNumber,
      ...result,
    };
  }

  async findAll() {
    return this.prisma.order.findMany({
      where: { paymentStatus: { not: 'PENDING' } },
      select: {
        id: true,
        orderNumber: true,
        paymentStatus: true,
        paymentReference: true,
        paymentPhone: true,
        total: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private mapStatus(status: string): any {
    switch (status) {
      case 'SUCCESS': return 'PAID';
      case 'FAILED': return 'FAILED';
      default: return 'PENDING';
    }
  }

  async checkStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !order.paymentReference) return null;

    // If already in a final state, no need to query CGRate again
    if (order.paymentStatus === 'PAID' || order.paymentStatus === 'FAILED') {
      return { status: order.paymentStatus, raw: 'Already in final state' };
    }

    const username = this.configService.get('CGRATE_USERNAME');
    const password = this.configService.get('CGRATE_PASSWORD');

    // Nuclear Fix: Exact Postman-matching XML structure for Status Query
    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:kon="http://konik.cgrate.com"><soapenv:Header><wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" soapenv:mustUnderstand="1"><wsse:UsernameToken xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" wsu:Id="${username}"><wsse:Username>${username}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><kon:queryCustomerPayment><paymentReference>${order.paymentReference}</paymentReference></kon:queryCustomerPayment></soapenv:Body></soapenv:Envelope>`;

    try {
      const response = await axios.post(this.apiUrl, soapRequest, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': '',
          'Accept': 'text/xml',
        },
      });

      const parser = new XMLParser({
        ignoreAttributes: true,
        removeNSPrefix: true,
      });
      const result = parser.parse(response.data);
      const txReturn = result.Envelope?.Body?.queryCustomerPaymentResponse?.return;

      if (txReturn) {
        this.logger.log(`Query Return: ${JSON.stringify(txReturn)}`);
        
        let newStatus = 'PENDING';
        const code = String(txReturn.responseCode);
        const msg = String(txReturn.responseMessage || '').toLowerCase();
        const rawStatus = String(txReturn.status || '').toUpperCase();
        
        // 0 = Success, 114 = Pending/Processing
        if (code === '0') {
           // If CGRate gives a specific status string, respect it. Otherwise, code 0 is PAID.
           if (rawStatus === 'FAILED' || msg.includes('fail') || msg.includes('cancel')) {
             newStatus = 'FAILED';
           } else if (rawStatus === 'PENDING' || msg.includes('pending') || msg.includes('processing')) {
             newStatus = 'PENDING';
           } else {
             newStatus = 'PAID';
           }
        } else if (code === '114' || rawStatus === 'PENDING' || msg.includes('pending') || msg.includes('processing') || msg.includes('not found')) {
           newStatus = 'PENDING';
        } else {
           newStatus = 'FAILED';
        }
        
        if (newStatus !== order.paymentStatus) {
          await this.prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: newStatus as PaymentStatus },
          });
        }
        return { status: newStatus, raw: txReturn };
      }
    } catch (error) {
      this.logger.error(`Status Check Error: ${error.message}`);
    }
    return { status: order.paymentStatus ?? 'PENDING' };
  }
}
