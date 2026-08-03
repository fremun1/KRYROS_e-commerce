import axios from "axios";

export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/api$/, "");
if (import.meta.env.PROD && !API_BASE) {
  console.error("CRITICAL: VITE_API_URL is not set in production environment. API calls will fail.");
  // Fallback to relative path for same-origin requests
  console.warn("Using relative path as fallback - this only works if frontend and backend are on same origin.");
}

// Ensure API_BASE is never empty
export const EFFECTIVE_API_BASE = API_BASE || window.location.origin;

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface Product {
  id: string;
  name: string;
  brand: string;
  brandId?: number;
  brandSlug?: string;
  category: string;
  categoryId?: string;
  categorySlug?: string;
  price: number;
  oldPrice: number;
  discount: number;
  rating: number;
  reviewCount: number;
  stock: number;
  specs: string;
  description: string;
  image: string;
  images: string[];
  additionalImages?: string[];
  badge?: string;
  isNew?: boolean;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  isFlashSale?: boolean;
  flashSalePrice?: number | null;
  flashSaleEnd?: string | null;
  stockTotal?: number;
  stockCurrent?: number;
  // Credit / Get Now
  allowCredit?: boolean;
  creditMessage?: string | null;
  creditMinimum?: number | null;
  creditDuration?: number;
  creditDurationType?: 'weeks' | 'months';
  creditInstallmentFrequency?: string;
  creditInstallmentCount?: number;
  creditInstallmentAmount?: number | null;
  // Wholesale
  isWholesaleOnly?: boolean;
  wholesalePrice?: number | null;
  wholesaleMoq?: number;
  // New fields for this update
  condition?: string;
  shippingFee?: number;
  estimatedDeliveryDays?: number;
  estimatedDeliveryMinDays?: number;
  estimatedDeliveryMaxDays?: number;
  popularItemText?: string;
  easyReturnsText?: string;
  fiveYearGuaranteeText?: string;
  freeReturnsText?: string;
  freeReturnsDescription?: string;
  protectionDescription?: string;
}

export interface ApiBrand {
  id: number;
  name: string;
  slug?: string;
  logo?: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  slug?: string;
  image?: string;
  icon?: string;
  parentId?: string | null;
  parent?: { id: string; name: string; slug?: string } | null;
  children?: Array<{ id: string; name: string; slug?: string; parentId?: string | null }>;
  isActive?: boolean;
  showOnHome?: boolean;
  _count?: { products: number };
}

export interface ApiBanner {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  videoUrl?: string;
  mediaType?: string;
  duration?: number;
  link?: string;
  linkText?: string;
  badge?: string;
  tag?: string;
  isActive: boolean;
  position?: number;
}

export interface ApiSiteConfig {
  key: string;
  value: Record<string, unknown>;
}

export interface ApiCMSSection {
  id: string;
  type: string;
  templateType?: string;
  title?: string;
  subtitle?: string;
  isActive: boolean;
  order?: number;
  pageSlug?: string;
  dataSourceId?: string;
  slotKey?: string;
  config?: Record<string, unknown>;
}
export interface ApiBrandBanner {
  id: string;
  brandSlug: string;
  brandName: string;
  tagline?: string;
  description?: string;
  bgColor?: string;
  bgGradient?: string;  // repurposed as brand accent/text color
  ctaText?: string;
  ctaLink?: string;
  isActive?: boolean;
  imageUrl?: string;
}

export interface ApiOrder {
  id: string;
  orderNumber?: string;
  trackingNumber?: string;
  status: string;
  paymentStatus?: string;
  createdAt: string;
  deliveredAt?: string | null;
  estimatedDelivery?: string;
  estimatedDays?: number;
  total?: number;
  totalZMW?: number;
  currencyCode?: string;
  currencySymbol?: string;
  items?: {
    name?: string;
    image?: string;
    specs?: string;
    estimatedDeliveryDays?: number;
    estimatedDeliveryMinDays?: number;
    estimatedDeliveryMaxDays?: number;
    product?: {
      name?: string;
      specs?: string;
      images?: { url: string; isPrimary?: boolean }[] | string[];
      estimatedDeliveryDays?: number;
      estimatedDeliveryMinDays?: number;
      estimatedDeliveryMaxDays?: number;
    };
    quantity?: number;
  }[];
}

export interface ApiShippingMethod {
  id: string;
  name: string;
  description?: string;
  fee: number | string;
  minThreshold?: number | string;
  estimatedDays?: string;
  isActive: boolean;
  sortOrder?: number;
}

export interface ApiShippingZone {
  id: string;
  name: string;
  type?: string;
  address?: string;
  city?: string;
  country?: string;
  operatingHours?: string;
  isActive?: boolean;
  image?: string;
  isRecommended?: boolean;
}

export interface ApiHomepageSection {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  link?: string;
  linkText?: string;
  isActive: boolean;
  config?: Record<string, unknown>;
  order?: number;
}

export function normalizeProduct(p: any): Product {
  const basePrice = Number(p.price || 0);
  const salePrice = p.salePrice ? Number(p.salePrice) : 0;
  const flashPrice = p.flashSalePrice ? Number(p.flashSalePrice) : 0;
  const effectivePrice = flashPrice > 0 ? flashPrice : salePrice > 0 ? salePrice : basePrice;
  const originalPrice = basePrice > effectivePrice ? basePrice : effectivePrice;
  const discount =
    originalPrice > effectivePrice
      ? Math.round((1 - effectivePrice / originalPrice) * 100)
      : Number(p.discount || 0);

  const imageList: string[] = (p.images || [])
    .map((img: any) => (typeof img === "string" ? img : img?.url || ""))
    .filter(Boolean);

  const mainImage = imageList[0] || p.imageUrl || p.image || "";

  return {
    id: p.id || "",
    name: p.name || "",
    brand: p.brand?.name || p.brandName || "",
    brandId: p.brand?.id,
    brandSlug: p.brand?.slug || p.brandSlug || "",
    category: p.category?.name || p.categoryName || "",
    categoryId: p.category?.id || p.categoryId || "",
    categorySlug: p.category?.slug || p.categorySlug || "",
    price: effectivePrice,
    oldPrice: originalPrice,
    discount,
    rating: Number(p.rating || 0),
    reviewCount: Number(p.reviewCount || p._count?.reviews || 0),
    stock: p.stockCurrent ?? p.inventory?.stock ?? p.stock ?? 0,
    description: p.description || '',
    specs: (() => {
      // Prefer structured specifications array from backend
      if (Array.isArray(p.specifications) && p.specifications.length > 0) {
        return p.specifications
          .map((s: any) => {
            const key = String(s?.key || "").trim();
            const value = String(s?.value || "").trim();
            return key && key.toLowerCase() !== "specifications" ? `${key}: ${value}` : value;
          })
          .filter(Boolean)
          .join(' · ');
      }
      // Try to parse specifications JSON string
      if (typeof p.specifications === 'string' && p.specifications.trim()) {
        try {
          const parsed = JSON.parse(p.specifications);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
              .map((s: any) => {
                const key = String(s?.key || "").trim();
                const value = String(s?.value || "").trim();
                return key && key.toLowerCase() !== "specifications" ? `${key}: ${value}` : value;
              })
              .filter(Boolean)
              .join(' · ');
          }
        } catch {}
        // Plain string specs
        return p.specifications.replace(/^specifications?\s*:\s*/i, '').trim();
      }
      // No specs — show nothing (description is only on product detail page)
      return '';
    })(),
    image: mainImage,
    images: imageList,
    additionalImages: imageList.length > 1 ? imageList.slice(1) : undefined,
    badge: discount > 0 ? `-${discount}%` : undefined,
    isNew: !!(p.isNew),
    isTrending: !!(p.isTrending),
    isBestSeller: !!(p.isBestSeller),
    isFeatured: !!(p.isFeatured),
    isFlashSale: !!(p.isFlashSale),
    flashSalePrice: p.flashSalePrice != null ? Number(p.flashSalePrice) : null,
    flashSaleEnd: p.flashSaleEnd ?? null,
    stockTotal: p.stockTotal != null ? Number(p.stockTotal) : undefined,
    stockCurrent: p.stockCurrent != null ? Number(p.stockCurrent) : undefined,
    // Credit
    allowCredit: !!(p.allowCredit),
    creditMessage: p.creditMessage ?? null,
    creditMinimum: p.creditMinimum ? Number(p.creditMinimum) : null,
    creditDuration: p.creditDuration ? Number(p.creditDuration) : undefined,
    creditDurationType: p.creditDurationType || 'weeks',
    creditInstallmentFrequency: p.creditInstallmentFrequency || 'weekly',
    creditInstallmentCount: p.creditInstallmentCount ? Number(p.creditInstallmentCount) : undefined,
    creditInstallmentAmount: p.creditInstallmentAmount ? Number(p.creditInstallmentAmount) : null,
    // Wholesale
    isWholesaleOnly: !!(p.isWholesaleOnly),
    wholesalePrice: p.wholesalePrice ? Number(p.wholesalePrice) : null,
    wholesaleMoq: p.wholesaleMoq ? Number(p.wholesaleMoq) : 1,
    // New fields
    condition: p.condition,
    shippingFee: p.shippingFee != null ? Number(p.shippingFee) : undefined,
    estimatedDeliveryDays: p.estimatedDeliveryDays ? Number(p.estimatedDeliveryDays) : undefined,
    estimatedDeliveryMinDays: p.estimatedDeliveryMinDays ? Number(p.estimatedDeliveryMinDays) : undefined,
    estimatedDeliveryMaxDays: p.estimatedDeliveryMaxDays ? Number(p.estimatedDeliveryMaxDays) : undefined,
    popularItemText: p.popularItemText,
    easyReturnsText: p.easyReturnsText,
    fiveYearGuaranteeText: p.fiveYearGuaranteeText,
    freeReturnsText: p.freeReturnsText,
    freeReturnsDescription: p.freeReturnsDescription,
    protectionDescription: p.protectionDescription,
  };
}

async function apiFetch<T>(path: string, token?: string): Promise<T | null> {
  try {
    const url = `${EFFECTIVE_API_BASE}${path}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`API fetch failed: ${url} - Status: ${res.status} ${res.statusText}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`API fetch error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export interface ProductQueryParams {
  take?: number;
  skip?: number;
  categoryId?: string;
  categorySlug?: string;
  brandId?: number;
  brandSlug?: string;
  search?: string;
  featured?: boolean;
  isFeatured?: boolean; // alias for featured
  isFlashSale?: boolean;
  popularity?: "trending" | "bestseller" | "new" | "hot" | "sale";
  allowCredit?: boolean;
  isWholesaleOnly?: boolean;
  lowStock?: boolean;
}

export async function fetchProductsPage(
  params: ProductQueryParams = {}
): Promise<{ data: Product[]; meta: Record<string, any> }> {
  const qs = new URLSearchParams();
  if (params.take !== undefined) qs.set("take", String(params.take));
  if (params.skip !== undefined) qs.set("skip", String(params.skip));
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.categorySlug) qs.set("categorySlug", params.categorySlug);
  if (params.brandId) qs.set("brandId", String(params.brandId));
  if (params.brandSlug) qs.set("brandSlug", params.brandSlug);
  if (params.search) qs.set("search", params.search);
  const isFeatured = params.isFeatured !== undefined ? params.isFeatured : params.featured;
  if (isFeatured !== undefined) qs.set("featured", String(isFeatured));
  if (params.isFlashSale !== undefined) qs.set("isFlashSale", String(params.isFlashSale));
  if (params.popularity) qs.set("popularity", params.popularity);
  if (params.allowCredit !== undefined) qs.set("allowCredit", String(params.allowCredit));
  if (params.lowStock !== undefined) qs.set("lowStock", String(params.lowStock));
  // Default: exclude wholesale-only products from regular listings unless caller explicitly sets isWholesaleOnly
  qs.set("isWholesaleOnly", params.isWholesaleOnly !== undefined ? String(params.isWholesaleOnly) : "false");

  const result = await apiFetch<{ data: any[]; meta: any }>(`/api/products?${qs.toString()}`);
  if (!result?.data) return { data: [], meta: {} };
  return {
    data: result.data.map(normalizeProduct),
    meta: result.meta ?? {},
  };
}

export async function fetchProducts(
  params: ProductQueryParams = {}
): Promise<Product[]> {
  const result = await fetchProductsPage(params);
  return result.data;
}

export async function fetchFlashSaleProducts(): Promise<Product[]> {
  const result = await apiFetch<any[]>("/api/products/flash-sales");
  if (!Array.isArray(result)) return [];
  return result.map(normalizeProduct);
}

export async function fetchFeaturedProducts(take?: number): Promise<Product[]> {
  const qs = take ? `?take=${take}` : "";
  const result = await apiFetch<any[]>(`/api/products/featured${qs}`);
  if (!Array.isArray(result)) return [];
  return result.map(normalizeProduct);
}

export async function fetchProductById(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${EFFECTIVE_API_BASE}/api/products/${id}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`fetchProductById failed for ID ${id}: ${res.status} ${res.statusText}`);
      return null;
    }
    const result = await res.json();
    if (!result || !result.id) {
      console.error(`fetchProductById: Invalid response for ID ${id}`);
      return null;
    }
    return normalizeProduct(result);
  } catch (err) {
    console.error(`fetchProductById error for ID ${id}:`, err);
    return null;
  }
}

export async function fetchRelatedProducts(id: string | number): Promise<Product[]> {
  const result = await apiFetch<any[]>(`/api/products/${id}/related`);
  if (!Array.isArray(result)) return [];
  return result.map(normalizeProduct);
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  const result = await apiFetch<ApiCategory[]>("/api/categories");
  if (!Array.isArray(result)) return [];
  return result;
}

export async function fetchHomepageCategories(): Promise<ApiCategory[]> {
  const result = await apiFetch<ApiCategory[]>("/api/categories/homepage");
  if (!Array.isArray(result)) return [];
  return result;
}

export async function fetchBrands(): Promise<ApiBrand[]> {
  const result = await apiFetch<ApiBrand[]>("/api/brands");
  if (!Array.isArray(result)) return [];
  return result;
}

export async function fetchBanners(): Promise<ApiBanner[]> {
  try {
    const res = await fetch(`${EFFECTIVE_API_BASE}/api/cms/banners`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const result = (await res.json()) as ApiBanner[];
    if (!Array.isArray(result)) return [];
    return result.filter((b) => b.isActive);
  } catch {
    return [];
  }
}

export async function fetchOrders(token: string): Promise<ApiOrder[]> {
  const result = await apiFetch<any>("/api/orders/my-orders", token);
  if (!result) return [];
  const list = Array.isArray(result) ? result : result.data ?? result.orders ?? [];
  return list as ApiOrder[];
}

export async function trackOrder(orderNumber: string, email?: string): Promise<ApiOrder | null> {
  const qs = new URLSearchParams({ orderNumber: orderNumber.trim() });
  if (email?.trim()) qs.set("email", email.trim());
  const result = await apiFetch<ApiOrder>(`/api/orders/track?${qs.toString()}`);
  return result ?? null;
}

export async function fetchShippingZones(type?: string): Promise<ApiShippingZone[]> {
  const qs = type ? `?type=${type}` : "";
  const result = await apiFetch<any[]>(`/api/shipping-zones${qs}`);
  if (!Array.isArray(result)) return [];
  return result;
}

export async function fetchShippingMethods(): Promise<ApiShippingMethod[]> {
  const result = await apiFetch<ApiShippingMethod[]>("/api/shipping/active");
  if (!Array.isArray(result)) return [];
  return result.map((m) => ({
    ...m,
    fee: Number(m.fee ?? 0),
    minThreshold: Number(m.minThreshold ?? 0),
  }));
}

export async function fetchMatchingShippingMethods(params: {
  countryId?: string;
  stateId?: string;
  cityId?: string;
  manual?: boolean;
  stateName?: string;
  cityName?: string;
}): Promise<ApiShippingMethod[]> {
  const qs = new URLSearchParams();
  if (params.countryId) qs.set("countryId", params.countryId);
  if (params.stateId) qs.set("stateId", params.stateId);
  if (params.cityId) qs.set("cityId", params.cityId);
  if (params.manual) qs.set("manual", "true");
  if (params.stateName) qs.set("stateName", params.stateName);
  if (params.cityName) qs.set("cityName", params.cityName);

  const result = await apiFetch<any[]>(`/api/shipping-zones/matching?${qs.toString()}`);
  if (!Array.isArray(result)) return [];
  return result.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    fee: Number(m.price ?? 0),
    minThreshold: Number(m.freeShippingThreshold ?? 0),
    estimatedDays: m.estimatedDays,
    isActive: m.status !== false,
    sortOrder: m.sortOrder ?? 0,
  }));
}

export async function fetchHomepageSections(type?: string): Promise<ApiHomepageSection[]> {
  const qs = type ? `?type=${type}` : "";
  const result = await apiFetch<any[]>(`/api/cms/homepage-sections${qs}`);
  if (!Array.isArray(result)) return [];
  return result.filter((s) => s.isActive !== false);
}

export async function fetchSectionByIdOrSlug(idOrSlug: string, pageSlug?: string): Promise<ApiCMSSection | null> {
  try {
    const qs = pageSlug ? `?pageSlug=${encodeURIComponent(pageSlug)}` : "";
    return await apiFetch<ApiCMSSection>(`/api/cms/sections/${idOrSlug}${qs}`);
  } catch {
    return null;
  }
}

export async function fetchAllBrandBanners(): Promise<ApiBrandBanner[]> {
  try {
    const res = await fetch(`${EFFECTIVE_API_BASE}/api/cms/brand-banners`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchBrandBannerBySlug(slug: string): Promise<ApiBrandBanner | null> {
  try {
    const res = await fetch(`${EFFECTIVE_API_BASE}/api/cms/brand-banners/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch CMS sections for a non-homepage page.
 * Calls GET /api/cms/sections?pageSlug={pageSlug}
 * Auto-seeds from backend defaults on first call (no manual DB seeding needed).
 */
export async function fetchPageSections(pageSlug: string): Promise<ApiCMSSection[]> {
  try {
    const res = await fetch(`${EFFECTIVE_API_BASE}/api/cms/sections?pageSlug=${encodeURIComponent(pageSlug)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const sections = Array.isArray(data) ? data : data?.data || [];
    return Array.isArray(sections)
      ? sections.filter((s: ApiCMSSection) => s.isActive !== false)
      : [];
  } catch {
    return [];
  }
}

/**
 * Fetch a site-config entry by key from the CMS.
 * Calls GET /api/cms/site-config/{key}
 * Returns the config value, or null if not found.
 * Auto-seeds backend defaults on first access.
 */
export async function fetchSiteConfig<T = Record<string, unknown>>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`${EFFECTIVE_API_BASE}/api/cms/site-config/${encodeURIComponent(key)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data: ApiSiteConfig | null = await res.json();
    return (data?.value as T) ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch store status settings (open/closed state and message).
 * Returns { isStoreClosed: boolean, message: string, openingTime: string, closingTime: string }
 */
export async function fetchStoreStatus(): Promise<{
  isStoreClosed: boolean;
  message: string;
  openingTime: string;
  closingTime: string;
  operatingDays?: string;
  nextOpeningTime?: string;
  nextOpeningDay?: string;
} | null> {
  try {
    const res = await fetch(`${EFFECTIVE_API_BASE}/api/settings/store-status`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch all public settings.
 */
export async function fetchSettings(): Promise<any[]> {
  try {
    const res = await fetch(`${EFFECTIVE_API_BASE}/api/settings`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data?.data || [];
  } catch {
    return [];
  }
}

// ─── Notifications ───────────────────────────────────────────────────────────
export interface ApiNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export async function fetchNotifications(token: string, limit: number = 20): Promise<ApiNotification[]> {
  const result = await apiFetch<any>(`/api/notifications?limit=${limit}`, token);
  if (!result) return [];
  const list = Array.isArray(result) ? result : result.data ?? [];
  return list as ApiNotification[];
}

export async function fetchUnreadNotificationCount(token: string): Promise<number> {
  const result = await apiFetch<{ count: number }>("/api/notifications/unread-count", token);
  return result?.count ?? 0;
}

export async function markNotificationRead(id: string, token: string): Promise<void> {
  try {
    const url = `${EFFECTIVE_API_BASE}/api/notifications/${id}/read`;
    await fetch(url, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
  }
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  try {
    const url = `${EFFECTIVE_API_BASE}/api/notifications/read-all`;
    await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
  }
}
