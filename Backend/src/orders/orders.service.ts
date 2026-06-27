import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SettingsService } from '../settings/settings.service';
import { ShippingZonesService } from '../shipping-zones/shipping-zones.service';
import { Prisma, OrderStatus } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private shippingZonesService: ShippingZonesService,
    private paymentsService: PaymentsService,
    private notificationsService: NotificationsService,
  ) {}

  private convertToPaymentMethod(method: string): string {
    const validMethods = ['CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'WALLET', 'CREDIT', 'WHATSAPP'];
    const normalized = method?.toUpperCase();
    return validMethods.includes(normalized) ? normalized : 'CARD';
  }

  async findAll(userId?: string, params?: { skip?: number; take?: number; status?: string }) {
    const { skip = 0, take: rawTake = 20, status } = params || {};
    const take = Math.min(Math.max(1, Number(rawTake) || 20), 500); // Admin can fetch up to 500 orders
    const where: any = userId ? { userId } : {};
    if (status) where.status = status;
    // Exclude direct/whatsapp placeholder orders from main order list
    where.orderNumber = { not: { startsWith: 'DIR-' } };
    where.AND = [
      ...(where.AND || []),
      { orderNumber: { not: { startsWith: 'WA-' } } }
    ];

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          total: true,
          totalZMW: true,
          currencyCode: true,
          currencySymbol: true,
          createdAt: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          _count: { select: { items: true } }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data: orders, meta: { total, skip, take } };
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              }
            },
            variant: true,
          },
        },
        shippingAddress: true,
        billingAddress: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async trackOrder(orderNumber: string, email: string) {
    // 1. Find the order by orderNumber (which is the friendly ID like ORD-123)
    // We search by orderNumber or ID just in case
    const order = await this.prisma.order.findFirst({
      where: {
        AND: [
          {
            OR: [
              { orderNumber: { equals: orderNumber, mode: 'insensitive' } },
              { id: { equals: orderNumber, mode: 'insensitive' } }
            ]
          },
          {
            OR: [
              { user: { email: { equals: email, mode: 'insensitive' } } },
              { shippingAddress: { email: { equals: email, mode: 'insensitive' } } }
            ]
          }
        ]
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              }
            },
            variant: true,
          },
        },
        shippingAddress: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    }
  });

  if (!order) {
    throw new NotFoundException('Order not found with the provided details');
  }

  // Return more detailed tracking info
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    estimatedDays: order.estimatedDays,
    items: order.items.map(item => ({
      productId: item.productId,
      name: item.product.name,
      quantity: item.quantity,
      price: Number(item.price),
      total: Number(item.total),
      image: item.product.images?.find(i => i.isPrimary)?.url || item.product.images?.[0]?.url,
      variant: item.variant?.name || item.variant?.value
    })),
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    tax: Number(order.tax),
    discount: Number(order.discount),
    total: Number(order.total),
    customer: order.user || (order.shippingAddress ? {
      firstName: order.shippingAddress.firstName,
      lastName: order.shippingAddress.lastName,
      email: order.shippingAddress.email
    } : null),
    shippingAddress: order.shippingAddress ? {
      firstName: order.shippingAddress.firstName,
      lastName: order.shippingAddress.lastName,
      address: order.shippingAddress.street,
      city: order.shippingAddress.cityName || order.shippingAddress.city,
      state: order.shippingAddress.stateName || order.shippingAddress.state,
      country: order.shippingAddress.country,
      phone: order.shippingAddress.phone
    } : null,
    shippingStatus: order.status
  };
}

  async create(userId: string | undefined, data: CreateOrderDto) {
    const { items, shippingAddressId: providedShippingAddressId, billingAddressId: providedBillingAddressId, paymentMethod, notes, addressDetails } = data;
    
    if (!items || items.length === 0) {
      throw new BadRequestException('Order items are required');
    }

    // Check if store is closed
    const storeStatus = await this.settingsService.getByKey('is_store_closed_manual');
    const isStoreClosed = storeStatus?.value === 'true';
    
    if (isStoreClosed) {
      const closureMessage = await this.settingsService.getByKey('store_closed_message');
      throw new BadRequestException(
        closureMessage?.value || 'The store is currently closed. Please try again later.'
      );
    }

    // Convert string payment method to enum
    const paymentMethodEnum = this.convertToPaymentMethod(paymentMethod);

    // 1. Fetch user to check role and wholesale account
    const user = userId ? await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wholesaleAccount: true },
    }) : null;

    // Verify addresses if IDs provided
    if (providedShippingAddressId && userId) {
      const address = await this.prisma.address.findFirst({
        where: { id: providedShippingAddressId, userId },
      });
      if (!address) throw new BadRequestException('Invalid shipping address');
    }
    if (providedBillingAddressId && userId) {
      const address = await this.prisma.address.findFirst({
        where: { id: providedBillingAddressId, userId },
      });
      if (!address) throw new BadRequestException('Invalid billing address');
    }

    // 2. Fetch products and variants
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { 
        inventory: true, 
        variants: true,
        wholesalePrices: user?.wholesaleAccount ? {
          where: { 
            OR: [
              { accountId: user.wholesaleAccount.id },
              { accountId: null }
            ]
          }
        } : false
      },
    });

    // 3. Validation and Calculations
    let subtotal = 0;
    let totalDiscount = 0;
    const orderItemsData: any[] = [];
    const inventoryUpdates: any[] = [];

    // Aggregate quantities to check against total stock
    const quantityMap: Record<string, number> = {};
    const variantQuantityMap: Record<string, number> = {};

    for (const item of items) {
      quantityMap[item.productId] = (quantityMap[item.productId] || 0) + item.quantity;
      if (item.variantId) {
        variantQuantityMap[item.variantId] = (variantQuantityMap[item.variantId] || 0) + item.quantity;
      }
    }

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

      // 1. Check if product is wholesale-only
      if (product.isWholesaleOnly && (!user?.wholesaleAccount || user.wholesaleAccount.status !== 'APPROVED')) {
        throw new BadRequestException(`Product ${product.name} is for wholesale partners only. Please apply for a wholesale account.`);
      }

      // 2. Check MOQ (Minimum Order Quantity)
      const moq = product.wholesaleMoq || 1;
      if (item.quantity < moq) {
        throw new BadRequestException(`Minimum order quantity for ${product.name} is ${moq} units/packs.`);
      }

      const originalPrice = Number(product.price);
      let price = originalPrice;

      // ... price logic ...
      if (user?.wholesaleAccount) {
        // ... (wholesale price logic remains the same)
        let bestWholesalePrice: number | null = null;
        if (product.wholesalePrices?.length) {
          const applicableTier = product.wholesalePrices
            .filter((wp) => item.quantity >= wp.minQuantity)
            .sort((a, b) => b.minQuantity - a.minQuantity)[0];
          if (applicableTier) bestWholesalePrice = Number(applicableTier.price);
        }
        if (bestWholesalePrice === null && product.wholesalePrice) {
          bestWholesalePrice = Number(product.wholesalePrice);
        }
        if (bestWholesalePrice !== null) price = bestWholesalePrice;
      } else if (
        product.isFlashSale &&
        product.flashSalePrice &&
        product.flashSaleEnd &&
        new Date(product.flashSaleEnd) > new Date()
      ) {
        price = Number(product.flashSalePrice);
      } else if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found for product ${product.id}`);
        
        if (!user?.wholesaleAccount || !product.wholesalePrices?.length) {
          price = Number(variant.price);
        }
      } 
      // End of non-blocking stock check logic

      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
      totalDiscount += (originalPrice - price) * item.quantity;

      orderItemsData.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price,
        total: itemTotal,
      });

      inventoryUpdates.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity * (product.unitsPerPack || 1),
      });
    }

    // Tax and Shipping
    let shipping = 0;
    let estimatedDays = 3; // Default
    const isNewShippingEnabled = await this.shippingZonesService.isEnabled();

    // The subtotal here is always in USD (base currency)
    // We compare it against the threshold which should also be defined in USD
    if (isNewShippingEnabled && data.shippingMethodId) {
      const method = await this.prisma.locationShippingMethod.findUnique({
        where: { id: data.shippingMethodId }
      });
      if (method) {
        const threshold = Number(method.freeShippingThreshold || 0);
        const methodPrice = Number(method.price || 0);
        estimatedDays = method.estimatedDays ? parseInt(method.estimatedDays, 10) : 3;
        
        // Both subtotal and threshold are in USD (base currency)
        shipping = (threshold > 0 && subtotal >= threshold) ? 0 : methodPrice;
      }
    } else {
      const shippingConfig = await this.settingsService.getShippingConfig();
      shipping = subtotal >= shippingConfig.threshold ? 0 : shippingConfig.fee;
    }

    const feeRateSetting = await this.settingsService.getByKey('processing_fee_rate');
    const feeRate = Number(feeRateSetting?.value || 0) / 100;
    const tax = subtotal * feeRate;
    const total = subtotal + tax + shipping;

    // Backend Source of Truth for Currency
    const exchangeRate = Number(data.exchangeRate || 1);
    const currencyCode = data.currencyCode || 'USD';
    const currencySymbol = data.currencySymbol || '$';
    
    // Re-calculate local total on backend to prevent frontend manipulation
    let calculatedTotalLocal = total * exchangeRate;
    
    // Zambia Special Rule: No decimals, round to nearest 10
    if (currencyCode === 'ZMW') {
      calculatedTotalLocal = Math.ceil(calculatedTotalLocal / 10) * 10;
    }

    // Simplified Order ID: random 7-character alphanumeric string
    const orderNumber = Math.random().toString(36).substr(2, 7).toUpperCase();

    // 4. Prisma Transaction
    const order = await this.prisma.$transaction(async (tx) => {
      let finalShippingAddressId = providedShippingAddressId;
      let finalBillingAddressId = providedBillingAddressId;

      // Create address if details provided (for guest or new address)
      if (addressDetails) {
        const newAddress = await tx.address.create({
          data: {
            userId: userId || null,
            firstName: addressDetails.firstName,
            lastName: addressDetails.lastName,
            email: addressDetails.email,
            phone: addressDetails.phone,
            street: addressDetails.address,
            zipCode: addressDetails.zipCode,
            countryId: addressDetails.countryId,
            stateId: addressDetails.stateId,
            cityId: addressDetails.cityId,
            stateName: addressDetails.stateName,
            cityName: addressDetails.cityName,
            city: addressDetails.cityName, // Legacy field sync
            state: addressDetails.stateName, // Legacy field sync
            manual: addressDetails.manual || false,
            country: addressDetails.countryName || "Zambia",
            type: 'SHIPPING'
          }
        });
        finalShippingAddressId = newAddress.id;
        // For guest, use same address for billing if not provided
        if (!finalBillingAddressId) finalBillingAddressId = newAddress.id;
      }

      if (!finalShippingAddressId) {
        throw new BadRequestException('Shipping address is required');
      }

      // Create Order
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: userId || null,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: paymentMethodEnum,
          paymentPhone: data.paymentPhone,
          totalZMW: new Prisma.Decimal(calculatedTotalLocal),
          currencyCode: currencyCode,
          currencySymbol: currencySymbol,
          exchangeRate: new Prisma.Decimal(exchangeRate),
          subtotal: new Prisma.Decimal(subtotal),
          tax: new Prisma.Decimal(tax),
          shipping: new Prisma.Decimal(shipping),
          discount: new Prisma.Decimal(totalDiscount),
          total: new Prisma.Decimal(total),
          notes,
          estimatedDays,
          shippingAddressId: finalShippingAddressId,
          billingAddressId: finalBillingAddressId,
          items: {
            create: orderItemsData.map(item => ({
              ...item,
              price: new Prisma.Decimal(item.price),
              total: new Prisma.Decimal(item.total),
            })),
          },
          logs: {
            create: {
              status: 'PENDING',
              notes: 'Order placed',
            },
          },
        },
        include: { items: true },
      });

      // Update Inventory
      for (const update of inventoryUpdates) {
        if (update.variantId) {
          await tx.productVariant.update({
            where: { id: update.variantId },
            data: { stock: { decrement: update.quantity } },
          });
        }

        // Always update base inventory for tracking (if exists)
        const inventory = await tx.inventory.findUnique({ where: { productId: update.productId } });
        if (inventory) {
          await tx.inventory.update({
            where: { productId: update.productId },
            data: { stock: { decrement: update.quantity } },
          });

          // Record stock movement
          await tx.stockMovement.create({
            data: {
              inventoryId: inventory.id,
              type: 'OUT',
              quantity: update.quantity,
              reference: createdOrder.orderNumber,
              notes: `Order placement ${createdOrder.orderNumber}${inventory.stock - update.quantity < 0 ? ' (Backorder)' : ''}`,
            },
          });
        }
      }

      return createdOrder;
    });

    // Send "Order Placed" Notification (push + email + SMS — all non-blocking)
    this.notificationsService.sendOrderPlacedNotification(order.id)
      .catch(e => console.warn('Order placed notification failed:', e?.message));

    // If payment method is MOBILE_MONEY, initiate payment push
    if (paymentMethodEnum === 'MOBILE_MONEY' && data.paymentPhone && order.totalZMW) {
      try {
        await this.paymentsService.process543Payment(
          order.id,
          data.paymentPhone,
          Number(order.totalZMW),
        );
      } catch {
        // Payment push failed — order is already created, no action needed
      }
    }

    return order;
  }

  async updateStatus(id: string, status?: string, paymentStatus?: string, trackingNumber?: string, notes?: string) {
    const existingOrder = await this.findById(id);
    const order = await this.prisma.$transaction(async (tx) => {
      const data: any = {};

      if (status) {
        data.status = status as any;
        // Auto-set timestamps based on status transitions
        if (status === 'SHIPPED') data.shippedAt = new Date();
        if (status === 'DELIVERED') data.deliveredAt = new Date();
        if (trackingNumber) data.trackingNumber = trackingNumber;
      }
      if (paymentStatus) data.paymentStatus = paymentStatus as any;

      const updatedOrder = await tx.order.update({
        where: { id },
        data,
      });

      // Use the new status for the log, or existing status if only paymentStatus changed
      const logStatus = (status || existingOrder.status) as any;
      const autoNotes = [
        status ? `Status → ${status}` : null,
        paymentStatus ? `Payment → ${paymentStatus}` : null,
        trackingNumber ? `Tracking: ${trackingNumber}` : null,
      ].filter(Boolean).join(' | ');

      await tx.orderLog.create({
        data: {
          orderId: id,
          status: logStatus,
          notes: notes || autoNotes || 'Updated',
        },
      });

      return updatedOrder;
    });

    // Send notification to ALL customers (including guests) when status changes
    if (status) {
      this.notificationsService.sendOrderStatusNotification(order.id, status)
        .catch(e => console.warn('Status notification failed:', e?.message));
    }

    return order;
  }

  async bulkUpdateStatus(ids: string[], status: string) {
    const results = await Promise.allSettled(
      ids.map(id => this.updateStatus(id, status)),
    );
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    return { succeeded, failed, total: ids.length };
  }

  async deleteOrder(id: string) {
    const order = await this.findById(id);
    
    // Delete order and cascade to items and logs
    await this.prisma.order.delete({
      where: { id },
    });

    return { success: true, message: `Order ${order.orderNumber} deleted successfully` };
  }

  async bulkDeleteOrders(ids: string[]) {
    const results = await Promise.allSettled(
      ids.map(id => this.deleteOrder(id)),
    );
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    return { succeeded, failed, total: ids.length };
  }
}
