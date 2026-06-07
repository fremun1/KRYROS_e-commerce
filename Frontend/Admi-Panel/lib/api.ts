import axios from "axios";
import { logout } from "./auth";

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: "",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor ───────────────────────────────────────────────────────
// No Authorization header injection needed here.
// proxy.ts reads the httpOnly 'kryros_token' cookie server-side and injects
// the Authorization: Bearer header into every request forwarded to the backend.
// This keeps the token 100% invisible to JavaScript.
api.interceptors.request.use((config) => config);

// ── Response interceptor — silent auto-refresh on 401 ────────────────────────
//
// Flow:
//   401 received → POST /api/bff/refresh (reads httpOnly refresh cookie server-side)
//              → BFF issues new httpOnly access + refresh cookies
//              → original request retried (proxy picks up new kryros_token cookie)
//
// The token is NEVER visible in JavaScript at any point in this flow.
// Concurrent 401s are queued so only ONE refresh call is made.

let _isRefreshing = false;
type QueueCb = () => void;
let _queue: QueueCb[] = [];

function _drainQueue() { _queue.forEach((cb) => cb()); _queue = []; }
function _flushQueue() { _queue = []; }

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config as typeof err.config & { _retry?: boolean };

    // Skip retry logic for BFF auth endpoints (prevents infinite loops)
    const isBff = orig?.url?.includes("/bff/");
    if (err.response?.status !== 401 || orig._retry || isBff) {
      return Promise.reject(err);
    }

    // Queue this request if a refresh is already in progress
    if (_isRefreshing) {
      return new Promise((resolve) => {
        _queue.push(() => resolve(api(orig)));
      });
    }

    orig._retry = true;
    _isRefreshing = true;

    try {
      // Call BFF refresh — no body or token needed from JS side.
      // The BFF reads the httpOnly 'kryros_refresh' cookie server-side.
      await axios.post("/api/bff/refresh");

      _drainQueue();

      // Retry the original request — proxy will inject the new kryros_token cookie
      return api(orig);
    } catch {
      _flushQueue();
      logout(); // refresh failed — session over, redirect to login
      return Promise.reject(err);
    } finally {
      _isRefreshing = false;
    }
  }
);

export default api;



// ── Auth ──────────────────────────────────────────────────
export const adminLogin = (identifier: string, password: string) =>
  api.post("/api/auth/login", { identifier, password });

// ── Reports / Dashboard ───────────────────────────────────
export const getReportsSummary = (range = "year") =>
  api.get(`/api/reports/summary?range=${range}`);

// ── Dashboard helpers ─────────────────────────────────────
export const getRecentOrders = (limit = 5) =>
  api.get(`/api/orders?limit=${limit}&skip=0`);
export const getTopProducts = (limit = 5) =>
  api.get(`/api/products?limit=${limit}`);
export const getRecentCustomers = (limit = 5) =>
  api.get(`/api/users?limit=${limit}&role=CUSTOMER`);

// ── Orders ────────────────────────────────────────────────
export const getOrders = (params?: Record<string, unknown>) =>
  api.get("/api/orders", { params });
export const getOrder = (id: string) =>
  api.get(`/api/orders/${id}`);
export const updateOrder = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/orders/${id}`, data);

// Correct endpoint for status updates (admin only)
export const updateOrderStatus = (
  id: string,
  data: { status?: string; paymentStatus?: string; trackingNumber?: string; notes?: string }
) => api.put(`/api/orders/${id}/status`, data);

export const bulkUpdateOrderStatus = (
  ids: string[],
  status: string,
) => api.put('/api/orders/bulk-status', { ids, status });

// ── Products ──────────────────────────────────────────────
export const getProducts = (params?: Record<string, unknown>) =>
  api.get("/api/products", { params });
export const getProduct = (id: string) =>
  api.get(`/api/products/${id}`);
export const createProduct = (data: Record<string, unknown>) =>
  api.post("/api/products", data);
export const updateProduct = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/products/${id}`, data);
export const deleteProduct = (id: string) =>
  api.delete(`/api/products/${id}`);

// ── Users ─────────────────────────────────────────────────
export const getUsers = (params?: Record<string, unknown>) =>
  api.get("/api/users", { params });
export const getUser = (id: string) =>
  api.get(`/api/users/${id}`);
export const createUser = (data: Record<string, unknown>) =>
  api.post("/api/users", data);
export const updateUser = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/users/${id}`, data);
export const deleteUser = (id: string) =>
  api.delete(`/api/users/${id}`);

// ── Categories ────────────────────────────────────────────
export const getCategories = (params?: Record<string, unknown>) =>
  api.get("/api/categories", { params });
export const createCategory = (data: Record<string, unknown>) =>
  api.post("/api/categories", data);
export const updateCategory = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/categories/${id}`, data);
export const deleteCategory = (id: string) =>
  api.delete(`/api/categories/${id}`);

// ── Brands ────────────────────────────────────────────────
export const getBrands = (params?: Record<string, unknown>) =>
  api.get("/api/brands", { params });
export const createBrand = (data: Record<string, unknown>) =>
  api.post("/api/brands", data);
export const updateBrand = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/brands/${id}`, data);
export const deleteBrand = (id: string) =>
  api.delete(`/api/brands/${id}`);

// ── Reviews ───────────────────────────────────────────────
export const getReviews = (params?: Record<string, unknown>) =>
  api.get("/api/reviews", { params });
export const updateReview = (id: string, data: Record<string, unknown>) =>
  api.patch(`/api/reviews/${id}/status`, data);
export const deleteReview = (id: string) =>
  api.delete(`/api/reviews/${id}`);

// ── Services ──────────────────────────────────────────────
export const getServices = (params?: Record<string, unknown>) =>
  api.get("/api/services", { params });
export const createService = (data: Record<string, unknown>) =>
  api.post("/api/services", data);
export const updateService = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/services/${id}`, data);
export const deleteService = (id: string) =>
  api.delete(`/api/services/${id}`);

// ── CMS — Banners ─────────────────────────────────────────
export const getCmsBanners = () =>
  api.get("/api/cms/banners/manage");
export const createCmsBanner = (data: Record<string, unknown>) =>
  api.post("/api/cms/banners", data);
export const updateCmsBanner = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/cms/banners/${id}`, data);
export const deleteCmsBanner = (id: string) =>
  api.delete(`/api/cms/banners/${id}`);

// ── CMS — Pages ───────────────────────────────────────────
export const getCmsPages = () =>
  api.get("/api/cms/pages");
export const createCmsPage = (data: Record<string, unknown>) =>
  api.post("/api/cms/pages", data);
export const updateCmsPage = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/cms/pages/${id}`, data);
export const deleteCmsPage = (id: string) =>
  api.delete(`/api/cms/pages/${id}`);
export const seedAllCmsPages = () =>
  api.post("/api/cms/pages/seed-all");

// ── CMS — Sections (per-page) ─────────────────────────────
export const getCmsSections = (pageSlug?: string) =>
  api.get(`/api/cms/sections/manage${pageSlug ? `?pageSlug=${pageSlug}` : ""}`);
export const createCmsSection = (data: Record<string, unknown>) =>
  api.post("/api/cms/sections", data);
export const updateCmsSection = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/cms/sections/${id}`, data);
export const deleteCmsSection = (id: string) =>
  api.delete(`/api/cms/sections/${id}`);
export const seedCmsSections = () =>
  api.post("/api/cms/sections/seed");
export const resetSeedCmsSections = (slug: string) =>
  api.post("/api/cms/sections/reset-seed", { slug });

// ── CMS — Homepage Sections ───────────────────────────────
export const getCmsHomepageSections = () =>
  api.get("/api/cms/homepage-sections/manage");
export const createCmsHomepageSection = (data: Record<string, unknown>) =>
  api.post("/api/cms/homepage-sections", data);
export const updateCmsHomepageSection = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/cms/homepage-sections/${id}`, data);
export const deleteCmsHomepageSection = (id: string) =>
  api.delete(`/api/cms/homepage-sections/${id}`);
export const seedCmsHomepageSections = () =>
  api.post("/api/cms/homepage-sections/seed");
export const resetSeedCmsHomepageSections = () =>
  api.post("/api/cms/homepage-sections/reset-seed");

// ── CMS — Footer ──────────────────────────────────────────
export const getCmsFooterConfig = () =>
  api.get("/api/cms/footer/config");
export const updateCmsFooterConfig = (data: Record<string, unknown>) =>
  api.put("/api/cms/footer/config", data);
export const getCmsFooterSections = () =>
  api.get("/api/cms/footer/sections/manage");
export const createCmsFooterSection = (data: Record<string, unknown>) =>
  api.post("/api/cms/footer/sections", data);
export const updateCmsFooterSection = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/cms/footer/sections/${id}`, data);
export const deleteCmsFooterSection = (id: string) =>
  api.delete(`/api/cms/footer/sections/${id}`);
export const createCmsFooterLink = (data: Record<string, unknown>) =>
  api.post("/api/cms/footer/links", data);
export const updateCmsFooterLink = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/cms/footer/links/${id}`, data);
export const deleteCmsFooterLink = (id: string) =>
  api.delete(`/api/cms/footer/links/${id}`);
export const seedCmsFooter = () =>
  api.post("/api/cms/footer/seed");

// ── CMS — Site Config ─────────────────────────────────────
export const getCmsSiteConfigs = () =>
  api.get("/api/cms/site-config");
export const upsertCmsSiteConfig = (key: string, value: unknown) =>
  api.put(`/api/cms/site-config/${key}`, { value });
export const seedCmsSiteConfigs = () =>
  api.post("/api/cms/site-config/seed");

// ── CMS — Brand Banners ───────────────────────────────────
export const getCmsBrandBanners = () =>
  api.get("/api/cms/brand-banners/manage");
export const createCmsBrandBanner = (data: Record<string, unknown>) =>
  api.post("/api/cms/brand-banners", data);
export const updateCmsBrandBanner = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/cms/brand-banners/${id}`, data);
export const deleteCmsBrandBanner = (id: string) =>
  api.delete(`/api/cms/brand-banners/${id}`);

// ── Settings ──────────────────────────────────────────────
export const getSettings = (params?: Record<string, unknown>) =>
  api.get("/api/settings", { params });
export const updateSettings = (data: Record<string, unknown>) =>
  api.put("/api/settings", data);

// ── Shipping ──────────────────────────────────────────────
export const getShippingZones = (params?: Record<string, unknown>) =>
  api.get("/api/shipping-zones", { params });
export const createShippingZone = (data: Record<string, unknown>) =>
  api.post("/api/shipping-zones", data);
export const updateShippingZone = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/shipping-zones/${id}`, data);
export const deleteShippingZone = (id: string) =>
  api.delete(`/api/shipping-zones/${id}`);
export const getShipping = (params?: Record<string, unknown>) =>
  api.get("/api/shipping", { params });

// ── Locations ─────────────────────────────────────────────
export const getCountries = () =>
  api.get("/api/countries");
export const updateCountry = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/countries/${id}`, data);
export const createCountry = (data: Record<string, unknown>) =>
  api.post("/api/countries", data);

// ── Credit ────────────────────────────────────────────────
export const getCreditAccounts = (params?: Record<string, unknown>) =>
  api.get("/api/credit", { params });
export const updateCreditAccount = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/credit/${id}`, data);

// ── Wallet ────────────────────────────────────────────────
export const getWalletTransactions = (params?: Record<string, unknown>) =>
  api.get("/api/wallet", { params });

// ── Wholesale ─────────────────────────────────────────────
export const getWholesaleOrders = (params?: Record<string, unknown>) =>
  api.get("/api/wholesale", { params });
export const updateWholesaleOrder = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/wholesale/${id}`, data);

// ── Wishlist ──────────────────────────────────────────────
export const getWishlists = (params?: Record<string, unknown>) =>
  api.get("/api/wishlist", { params });

// ── Notifications ─────────────────────────────────────────
export const getNotifications = (params?: Record<string, unknown>) =>
  api.get("/api/notifications", { params });
export const markNotificationRead = (id: string) =>
  api.put(`/api/notifications/${id}/read`, {});

// ── Newsletter ────────────────────────────────────────────
export const getNewsletterSubscribers = (params?: Record<string, unknown>) =>
  api.get("/api/newsletter/list", { params });

export const getActiveNewsletterSubscribers = () =>
  api.get("/api/newsletter/active");

export const sendNewsletterEmail = (payload: {
  subject: string;
  body: string;
  emails?: string[];
}) => api.post("/api/newsletter/send", payload);

// ── Payments ──────────────────────────────────────────────
export const getPayments = (params?: Record<string, unknown>) =>
  api.get("/api/payments", { params });
export const getPayment = (id: string) =>
  api.get(`/api/payments/${id}`);

// ── Payment Links ──────────────────────────────────────────
export const createPaymentLink = (data: Record<string, unknown>) =>
  api.post("/api/pay-links", data);
export const getPaymentLinks = (params?: Record<string, unknown>) =>
  api.get("/api/pay-links", { params });
export const deletePaymentLink = (id: string) =>
  api.delete(`/api/pay-links/${id}`);

// ── Direct Payment ─────────────────────────────────────────
export const initiateDirectPayment = (data: Record<string, unknown>) =>
  api.post("/api/payments/direct", data);


// ── Payment Config ──────────────────────────────────────────────────────────
export const getPaymentMethods = () =>
  api.get('/api/payment-config/methods');
export const createPaymentMethod = (data: Record<string, unknown>) =>
  api.post('/api/payment-config/methods', data);
export const updatePaymentMethod = (id: string, data: Record<string, unknown>) =>
  api.patch(`/api/payment-config/methods/${id}`, data);
export const deletePaymentMethod = (id: string) =>
  api.delete(`/api/payment-config/methods/${id}`);
export const reorderPaymentMethods = (orders: { id: string; sortOrder: number }[]) =>
  api.patch('/api/payment-config/methods/reorder', { orders });

export const getPaymentProviders = (methodId: string) =>
  api.get(`/api/payment-config/providers/${methodId}`);
export const createPaymentProvider = (data: Record<string, unknown>) =>
  api.post('/api/payment-config/providers', data);
export const updatePaymentProvider = (id: string, data: Record<string, unknown>) =>
  api.patch(`/api/payment-config/providers/${id}`, data);
export const deletePaymentProvider = (id: string) =>
  api.delete(`/api/payment-config/providers/${id}`);

export const getPaymentNetworks = (providerId: string) =>
  api.get(`/api/payment-config/networks/${providerId}`);
export const createPaymentNetwork = (data: Record<string, unknown>) =>
  api.post('/api/payment-config/networks', data);
export const updatePaymentNetwork = (id: string, data: Record<string, unknown>) =>
  api.patch(`/api/payment-config/networks/${id}`, data);
export const deletePaymentNetwork = (id: string) =>
  api.delete(`/api/payment-config/networks/${id}`);

// ── Credit Plans ──────────────────────────────────────────
export const getCreditPlans = () =>
  api.get('/api/credit/plans');
export const createCreditPlan = (data: Record<string, unknown>) =>
  api.post('/api/credit/plans', data);
export const updateCreditPlan = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/credit/plans/${id}`, data);
export const deleteCreditPlan = (id: string) =>
  api.delete(`/api/credit/plans/${id}`);

// ── Shipping Methods (Global) ─────────────────────────────
export const getShippingMethods = (params?: Record<string, unknown>) =>
  api.get('/api/shipping', { params });
export const createShippingMethod = (data: Record<string, unknown>) =>
  api.post('/api/shipping', data);
export const updateShippingMethod = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/shipping/${id}`, data);
export const deleteShippingMethod = (id: string) =>
  api.delete(`/api/shipping/${id}`);

// ── States ────────────────────────────────────────────────
export const getStates = (countryId?: string) =>
  api.get('/api/states', { params: countryId ? { countryId } : {} });
export const createState = (data: Record<string, unknown>) =>
  api.post('/api/states', data);
export const updateState = (id: string, data: Record<string, unknown>) =>
  api.patch(`/api/states/${id}`, data);
export const deleteState = (id: string) =>
  api.delete(`/api/states/${id}`);

// ── Cities ────────────────────────────────────────────────
export const getCities = (stateId?: string) =>
  api.get('/api/cities', { params: stateId ? { stateId } : {} });
export const createCity = (data: Record<string, unknown>) =>
  api.post('/api/cities', data);
export const updateCity = (id: string, data: Record<string, unknown>) =>
  api.patch(`/api/cities/${id}`, data);
export const deleteCity = (id: string) =>
  api.delete(`/api/cities/${id}`);

// ── Pickup Stations ───────────────────────────────────────
export const getPickupStations = (params?: Record<string, unknown>) =>
  api.get('/api/pickup-stations', { params });
export const createPickupStation = (data: Record<string, unknown>) =>
  api.post('/api/pickup-stations', data);
export const updatePickupStation = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/pickup-stations/${id}`, data);
export const togglePickupStation = (id: string, isActive: boolean) =>
  api.patch(`/api/pickup-stations/${id}/status`, { isActive });
export const deletePickupStation = (id: string) =>
  api.delete(`/api/pickup-stations/${id}`);

// ── Wholesale Accounts (Admin) ────────────────────────────
export const getWholesaleAccounts = (params?: Record<string, unknown>) =>
  api.get('/api/wholesale/accounts', { params });
export const updateWholesaleAccount = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/wholesale/accounts/${id}`, data);
export const updateWholesaleAccountStatus = (id: string, status: string, notes?: string) =>
  api.put(`/api/wholesale/accounts/${id}/status`, { status, notes });
export const deleteWholesaleAccount = (id: string) =>
  api.delete(`/api/wholesale/accounts/${id}`);

// ── Wholesale Deals ───────────────────────────────────────
export const getWholesaleDeals = (params?: Record<string, unknown>) =>
  api.get('/api/wholesale/deals', { params });
export const createWholesaleDeal = (data: Record<string, unknown>) =>
  api.post('/api/wholesale/deals', data);
export const updateWholesaleDeal = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/wholesale/deals/${id}`, data);
export const deleteWholesaleDeal = (id: string) =>
  api.delete(`/api/wholesale/deals/${id}`);

// ── Country Payment Methods ───────────────────────────────
export const addCountryPaymentMethod = (countryId: string, data: Record<string, unknown>) =>
  api.post(`/api/countries/${countryId}/payment-methods`, data);
export const updateCountryPaymentMethod = (methodId: string, data: Record<string, unknown>) =>
  api.patch(`/api/countries/payment-methods/${methodId}`, data);
export const removeCountryPaymentMethod = (methodId: string) =>
  api.delete(`/api/countries/payment-methods/${methodId}`);

// ─── SMS Contacts ─────────────────────────────────────────────────────────────
export const getSmsContacts = () =>
  api.get('/api/notifications/sms/contacts');

export const addSmsContact = (payload: { phone: string; name?: string; source?: string }) =>
  api.post('/api/notifications/sms/contacts', payload);

export const deleteSmsContact = (id: string) =>
  api.delete(`/api/notifications/sms/contacts/${id}`);

// ─── SMS Supported Countries ──────────────────────────────────────────────────
export const getSmsCountries   = ()                                                    => api.get('/api/notifications/sms/countries');
export const addSmsCountry     = (data: { name: string; dialCode: string; isoCode: string }) => api.post('/api/notifications/sms/countries', data);
export const toggleSmsCountry  = (id: string, isActive: boolean)                      => api.patch(`/api/notifications/sms/countries/${id}`, { isActive });
export const deleteSmsCountry  = (id: string)                                          => api.delete(`/api/notifications/sms/countries/${id}`);

// ─── Push Devices ─────────────────────────────────────────────────────────────
export const getDevices = () =>
  api.get('/api/notifications/devices');

export const deleteDevice = (id: string) =>
  api.delete(`/api/notifications/devices/${id}`);

export const sendToDevices = (payload: { deviceIds: string[]; title: string; body: string; data?: any }) =>
  api.post('/api/notifications/devices/send', payload);

// ─── Email Contacts ────────────────────────────────────────────────────────────
export const getEmailContacts = () =>
  api.get('/api/notifications/email/contacts');

export const addEmailContact = (payload: { email: string; name?: string; source?: string }) =>
  api.post('/api/notifications/email/contacts', payload);

export const deleteEmailContact = (id: string) =>
  api.delete(`/api/notifications/email/contacts/${id}`);

export const sendEmailBlast = (payload: { subject: string; body: string; emailIds?: string[] }) =>
  api.post('/api/notifications/email/blast', payload);

