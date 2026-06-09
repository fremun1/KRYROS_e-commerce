export const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, "")
  : "";

export interface Product {
  id: string;
  name: string;
  brand: string;
  brandId?: number;
  category: string;
  categoryId?: string;
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
  // Credit / Get Now
  allowCredit?: boolean;
  creditMessage?: string | null;
  creditMinimum?: number | null;
  // Wholesale
  isWholesaleOnly?: boolean;
  wholesalePrice?: number | null;
  wholesaleMoq?: number;
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
  title?: string;
  subtitle?: string;
  isActive: boolean;
  order?: number;
  pageSlug?: string;
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
  status: string;
  createdAt: string;
  estimatedDelivery?: string;
  total?: number;
  items?: {
    product?: {
      name?: string;
      specs?: string;
      images?: { url: string; isPrimary?: boolean }[] | string[];
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
  isActive: boolean;
  config?: Record<string, unknown>;
  order?: number;
}

function normalizeProduct(p: any): Product {
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
    category: p.category?.name || p.categoryName || "",
    categoryId: p.category?.id || p.categoryId || "",
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
          .map((s: any) => `${s.key}: ${s.value}`)
          .join(' · ');
      }
      // Try to parse specifications JSON string
      if (typeof p.specifications === 'string' && p.specifications.trim()) {
        try {
          const parsed = JSON.parse(p.specifications);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((s: any) => `${s.key}: ${s.value}`).join(' · ');
          }
        } catch {}
        // Plain string specs
        return p.specifications;
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
    // Credit
    allowCredit: !!(p.allowCredit),
    creditMessage: p.creditMessage ?? null,
    creditMinimum: p.creditMinimum ? Number(p.creditMinimum) : null,
    // Wholesale
    isWholesaleOnly: !!(p.isWholesaleOnly),
    wholesalePrice: p.wholesalePrice ? Number(p.wholesalePrice) : null,
    wholesaleMoq: p.wholesaleMoq ? Number(p.wholesaleMoq) : 1,
  };
}

async function apiFetch<T>(path: string, token?: string): Promise<T | null> {
  try {
    const url = `${API_BASE}${path}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchProducts(
  params: {
    take?: number;
    skip?: number;
    categoryId?: string;
    categorySlug?: string;
    search?: string;
    featured?: boolean;
    isFlashSale?: boolean;
    popularity?: "trending" | "bestseller" | "new" | "hot" | "sale";
    allowCredit?: boolean;
    isWholesaleOnly?: boolean;
  } = {}
): Promise<Product[]> {
  const qs = new URLSearchParams();
  if (params.take !== undefined) qs.set("take", String(params.take));
  if (params.skip !== undefined) qs.set("skip", String(params.skip));
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.categorySlug) qs.set("categorySlug", params.categorySlug);
  if (params.search) qs.set("search", params.search);
  if (params.featured !== undefined) qs.set("featured", String(params.featured));
  if (params.isFlashSale !== undefined) qs.set("isFlashSale", String(params.isFlashSale));
  if (params.popularity) qs.set("popularity", params.popularity);
  if (params.allowCredit !== undefined) qs.set("allowCredit", String(params.allowCredit));
  // Default: exclude wholesale-only products from regular listings unless caller explicitly sets isWholesaleOnly
  qs.set("isWholesaleOnly", params.isWholesaleOnly !== undefined ? String(params.isWholesaleOnly) : "false");

  const result = await apiFetch<{ data: any[]; meta: any }>(`/api/products?${qs.toString()}`);
  if (!result?.data) return [];
  return result.data.map(normalizeProduct);
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
  const result = await apiFetch<any>(`/api/products/${id}`);
  if (!result || !result.id) return null;
  return normalizeProduct(result);
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
  const result = await apiFetch<ApiBanner[]>("/api/cms/banners");
  if (!Array.isArray(result)) return [];
  return result.filter((b) => b.isActive);
}

export async function fetchOrders(token: string): Promise<ApiOrder[]> {
  const result = await apiFetch<any>("/api/orders/my-orders", token);
  if (!result) return [];
  const list = Array.isArray(result) ? result : result.data ?? result.orders ?? [];
  return list as ApiOrder[];
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

export async function fetchAllBrandBanners(): Promise<ApiBrandBanner[]> {
  try {
    const res = await fetch(`${API_BASE}/api/cms/brand-banners`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchBrandBannerBySlug(slug: string): Promise<ApiBrandBanner | null> {
  try {
    const res = await fetch(`${API_BASE}/api/cms/brand-banners/${slug}`, { cache: "no-store" });
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
    const res = await fetch(`${API_BASE}/api/cms/sections?pageSlug=${encodeURIComponent(pageSlug)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter((s: ApiCMSSection) => s.isActive !== false) : [];
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
    const res = await fetch(`${API_BASE}/api/cms/site-config/${encodeURIComponent(key)}`, { cache: "no-store" });
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
    const res = await fetch(`${API_BASE}/api/settings/store-status`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
