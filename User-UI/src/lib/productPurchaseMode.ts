import type { Product } from "@/lib/api";

/**
 * A product has one storefront purchase presentation at a time. Wholesale
 * takes precedence when both legacy flags are present so its existing order
 * rules and price behavior remain intact.
 */
export type ProductPurchaseMode = "retail" | "wholesale" | "credit";

type PurchaseModeProduct = Pick<
  Product,
  "allowCredit" | "creditMessage" | "isWholesaleOnly" | "price" | "wholesalePrice" | "creditDuration" | "creditDurationType"
  | "creditInstallmentFrequency" | "creditInstallmentCount" | "creditInstallmentAmount" | "creditMinimum"
>;

export function getProductPurchaseMode(product: PurchaseModeProduct): ProductPurchaseMode {
  if (product.isWholesaleOnly) return "wholesale";
  if (product.allowCredit) return "credit";
  return "retail";
}

export function getProductDisplayPrice(product: PurchaseModeProduct): number {
  return getProductPurchaseMode(product) === "wholesale" && product.wholesalePrice != null
    ? product.wholesalePrice
    : product.price;
}

export function getCreditMessage(product: Pick<Product, "creditMessage">): string {
  return product.creditMessage?.trim() || "Credit available";
}

/**
 * Derive the credit payment breakdown from explicit installment fields
 * when available, falling back to the legacy duration-based calculation.
 */
export function getCreditPaymentDetails(product: PurchaseModeProduct): {
  weeklyPayment: number;
  monthlyPayment: number;
  period: string;
  frequency: string;
  installmentCount: number;
  installmentAmount: number;
} {
  const price = getProductDisplayPrice(product);
  const duration = product.creditDuration || 12;
  const durationType = product.creditDurationType || 'weeks';

  // If explicit installment fields are configured, use them directly
  if (product.creditInstallmentCount && product.creditInstallmentCount > 0) {
    const frequency = product.creditInstallmentFrequency || 'weekly';
    const installmentAmount = product.creditInstallmentAmount != null
      ? Number(product.creditInstallmentAmount)
      : Math.round(((price - (product.creditMinimum || 0)) / product.creditInstallmentCount) * 100) / 100;

    const period = `${product.creditInstallmentCount} ${frequency}`;

    // Derive weekly/monthly equivalents for legacy display
    let weeklyPayment: number;
    let monthlyPayment: number;
    switch (frequency) {
      case 'daily':
        weeklyPayment = Math.round(installmentAmount * 7 * 100) / 100;
        monthlyPayment = Math.round(installmentAmount * 30 * 100) / 100;
        break;
      case 'weekly':
        weeklyPayment = Math.round(installmentAmount * 100) / 100;
        monthlyPayment = Math.round(installmentAmount * 4 * 100) / 100;
        break;
      case 'monthly':
        weeklyPayment = Math.round(installmentAmount / 4 * 100) / 100;
        monthlyPayment = Math.round(installmentAmount * 100) / 100;
        break;
      default:
        weeklyPayment = Math.round(installmentAmount * 100) / 100;
        monthlyPayment = Math.round(installmentAmount * 4 * 100) / 100;
    }

    return {
      weeklyPayment,
      monthlyPayment,
      period,
      frequency,
      installmentCount: product.creditInstallmentCount,
      installmentAmount,
    };
  }

  // Fallback: legacy duration-based calculation
  const weeklyPayment = durationType === 'weeks' ? price / duration : (price / duration) * 12 / 52;
  const monthlyPayment = durationType === 'months' ? price / duration : (price / duration) * 12 / 52;
  const period = `${duration} ${durationType}`;

  return {
    weeklyPayment: Math.round(weeklyPayment * 100) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    period,
    frequency: durationType === 'weeks' ? 'weekly' : durationType === 'months' ? 'monthly' : 'weekly',
    installmentCount: duration,
    installmentAmount: durationType === 'weeks' ? weeklyPayment : monthlyPayment,
  };
}

/**
 * Format a payment breakdown summary string for the product card.
 */
export function getCreditBreakdownSummary(product: PurchaseModeProduct): string {
  const details = getCreditPaymentDetails(product);
  const freqLabel = details.frequency.charAt(0).toUpperCase() + details.frequency.slice(1);
  return `${freqLabel} ${details.installmentCount} × ${details.installmentAmount.toFixed(2)}`;
}
