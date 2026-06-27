import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { UpdatePaymentLinkDto } from './dto/update-payment-link.dto';

@Injectable()
export class PaymentLinksService {
  private readonly logger = new Logger(PaymentLinksService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: CreatePaymentLinkDto, createdBy?: string) {
    this.logger.log(`Creating payment link: ${data.name}`);

    const paymentLink = await this.prisma.paymentLink.create({
      data: {
        name: data.name,
        amount: data.amount,
        currency: data.currency || 'ZMW',
        note: data.note,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy,
        isActive: true,
      },
    });

    this.logger.log(`Payment link created: ${paymentLink.id}`);
    return paymentLink;
  }

  async findAll(skip?: number, take?: number) {
    this.logger.log('Fetching all payment links');

    const paymentLinks = await this.prisma.paymentLink.findMany({
      where: { isActive: true },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return paymentLinks;
  }

  async findById(id: string) {
    this.logger.log(`Fetching payment link: ${id}`);

    const paymentLink = await this.prisma.paymentLink.findUnique({
      where: { id },
    });

    if (!paymentLink) {
      throw new NotFoundException(`Payment link not found: ${id}`);
    }

    // Increment click count
    await this.prisma.paymentLink.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });

    return paymentLink;
  }

  async update(id: string, data: UpdatePaymentLinkDto) {
    this.logger.log(`Updating payment link: ${id}`);

    const paymentLink = await this.prisma.paymentLink.findUnique({
      where: { id },
    });

    if (!paymentLink) {
      throw new NotFoundException(`Payment link not found: ${id}`);
    }

    const updated = await this.prisma.paymentLink.update({
      where: { id },
      data: {
        name: data.name ?? paymentLink.name,
        amount: data.amount ?? paymentLink.amount,
        currency: data.currency ?? paymentLink.currency,
        note: data.note ?? paymentLink.note,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : paymentLink.expiresAt,
        isActive: data.isActive !== undefined ? data.isActive : paymentLink.isActive,
      },
    });

    this.logger.log(`Payment link updated: ${id}`);
    return updated;
  }

  async delete(id: string) {
    this.logger.log(`Deleting payment link: ${id}`);

    const paymentLink = await this.prisma.paymentLink.findUnique({
      where: { id },
    });

    if (!paymentLink) {
      throw new NotFoundException(`Payment link not found: ${id}`);
    }

    // Soft delete by marking as inactive
    await this.prisma.paymentLink.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Payment link deleted (soft): ${id}`);
    return { success: true, message: 'Payment link deleted successfully' };
  }

  async validatePaymentLink(linkId: string, expectedAmount: number, expectedCurrency: string) {
    const paymentLink = await this.findById(linkId);

    if (!paymentLink.isActive) {
      throw new BadRequestException('Payment link is no longer active');
    }

    if (paymentLink.expiresAt && paymentLink.expiresAt < new Date()) {
      throw new BadRequestException('Payment link has expired');
    }

    if (Number(paymentLink.amount) !== expectedAmount) {
      throw new BadRequestException('Payment amount does not match the link');
    }

    if (paymentLink.currency !== expectedCurrency) {
      throw new BadRequestException('Payment currency does not match the link');
    }

    return paymentLink;
  }
}
