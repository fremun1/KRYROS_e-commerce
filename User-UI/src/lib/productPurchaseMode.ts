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
  intervalLabel: string;
  installmentCount: number;
  installmentAmount: number;
  durationValue: number;
  durationUnit: string;
} {
  const price = getProductDisplayPrice(product);
  const duration = product.creditDuration && product.creditDuration > 0 ? product.creditDuration : 12;
  const durationType = product.creditDurationType === "months" ? "months" : "weeks";

  const frequency =
    product.creditInstallmentFrequency === "daily" ||
    product.creditInstallmentFrequency === "weekly" ||
    product.creditInstallmentFrequency === "monthly"
      ? product.creditInstallmentFrequency
      : durationType === "months"
        ? "monthly"
        : "weekly";

  const intervalLabel =
    frequency === "daily" ? "day" : frequency === "monthly" ? "month" : "week";

  const explicitInstallmentCount =
    product.creditInstallmentCount && product.creditInstallmentCount > 0
      ? product.creditInstallmentCount
      : undefined;

  const derivedInstallmentCount = (() => {
    if (explicitInstallmentCount) return explicitInstallmentCount;

    if (durationType === "months") {
      if (frequency === "daily") return duration * 30;
      if (frequency === "weekly") return duration * 4;
      return duration;
    }

    if (frequency === "daily") return duration * 7;
    if (frequency === "monthly") return Math.max(1, Math.round(duration / 4));
    return duration;
  })();

  const installmentCount = Math.max(1, derivedInstallmentCount);

  const installmentAmount =
    product.creditInstallmentAmount != null
      ? Number(product.creditInstallmentAmount)
      : Math.round(((price - (product.creditMinimum || 0)) / installmentCount) * 100) / 100;

  const period =
    product.creditDuration && product.creditDuration > 0
      ? `${duration} ${durationType === "months" ? (duration === 1 ? "month" : "months") : (duration === 1 ? "week" : "weeks")}`
      : `${installmentCount} ${installmentCount === 1 ? intervalLabel : `${intervalLabel}s`}`;

  // Derive weekly/monthly equivalents for legacy display
  let weeklyPayment: number;
  let monthlyPayment: number;
  switch (frequency) {
    case "daily":
      weeklyPayment = Math.round(installmentAmount * 7 * 100) / 100;
      monthlyPayment = Math.round(installmentAmount * 30 * 100) / 100;
      break;
    case "weekly":
      weeklyPayment = Math.round(installmentAmount * 100) / 100;
      monthlyPayment = Math.round(installmentAmount * 4 * 100) / 100;
      break;
    case "monthly":
      weeklyPayment = Math.round((installmentAmount / 4) * 100) / 100;
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
    intervalLabel,
    installmentCount,
    installmentAmount,
    durationValue: product.creditDuration && product.creditDuration > 0 ? duration : installmentCount,
    durationUnit:
      product.creditDuration && product.creditDuration > 0
        ? durationType
        : installmentCount === 1
          ? intervalLabel
          : `${intervalLabel}s`,
  };
}

/**
 * Format a payment breakdown summary string for the product card.
 */
export function getCreditBreakdownSummary(product: PurchaseModeProduct): string {
  const details = getCreditPaymentDetails(product);
  const freqLabel = details.intervalLabel.charAt(0).toUpperCase() + details.intervalLabel.slice(1);
  return `${freqLabel} ${details.installmentCount} × ${details.installmentAmount.toFixed(2)}`;
}
