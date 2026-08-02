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

export function getCreditPaymentDetails(product: PurchaseModeProduct): {
  weeklyPayment: number;
  monthlyPayment: number;
  period: string;
} {
  const price = getProductDisplayPrice(product);
  const duration = product.creditDuration || 12;
  const durationType = product.creditDurationType || 'weeks';
  
  const weeklyPayment = durationType === 'weeks' ? price / duration : (price / duration) * 12 / 52;
  const monthlyPayment = durationType === 'months' ? price / duration : (price / duration) * 12 / 52;
  const period = `${duration} ${durationType}`;
  
  return {
    weeklyPayment: Math.round(weeklyPayment * 100) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    period
  };
}
