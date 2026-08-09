import {
  Switch,
  Route,
  Router as WouterRouter,
  useLocation,
  Redirect,
} from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { MessageCircle } from "lucide-react";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import AuthPage from "@/components/auth/AuthPage";

// ── Route-based code splitting ─────────────────────────────────────────────────
const HomePage = lazy(() => import("@/pages/HomePage"));
const ShopPage = lazy(() => import("@/pages/ShopPage"));
const ShopSectionPage = lazy(() => import("@/pages/ShopSectionPage"));
const ProductPage = lazy(() => import("@/pages/ProductPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const GetNowPage = lazy(() => import("@/pages/GetNowPage"));
const TrackOrderPage = lazy(() => import("@/pages/TrackOrderPage"));
const PickupStationsPage = lazy(() => import("@/pages/PickupStationsPage"));
const WholesalePage = lazy(() => import("@/pages/WholesalePage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const RefundPage = lazy(() => import("@/pages/RefundPage"));
const HelpPage = lazy(() => import("@/pages/HelpPage"));
const FaqPage = lazy(() => import("@/pages/FaqPage"));
const ReturnsPage = lazy(() => import("@/pages/ReturnsPage"));
const ShippingPage = lazy(() => import("@/pages/ShippingPage"));
const SecurityPage = lazy(() => import("@/pages/SecurityPage"));
const PayPage = lazy(() => import("@/pages/PayPage"));
const TrackPaymentPage = lazy(() => import("@/pages/TrackPaymentPage"));
const WishlistPage = lazy(() => import("@/pages/WishlistPage"));
const ApplyCreditPage = lazy(() => import("@/pages/ApplyCreditPage"));
const WholesaleCheckoutPage = lazy(
  () => import("@/pages/WholesaleCheckoutPage"),
);
const NotFound = lazy(() => import("@/pages/not-found"));
const AllCategoriesPage = lazy(() => import("@/pages/AllCategoriesPage"));
const BrowsePage = lazy(() => import("@/pages/BrowsePage"));
const GenericCMSPage = lazy(() => import("@/pages/GenericCMSPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));

import SplashScreen from "@/components/SplashScreen";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";

// ── QueryClient ────────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "260969597029";

// ── Floating Support Buttons ───────────────────────────────────────────────────
function SupportFloatingButtons() {
  const [location] = useLocation();
  const hide = location !== "/";

  useEffect(() => {
    // Control Zoho SalesIQ visibility - show only on homepage
    if (typeof (window as any).$zoho !== 'undefined' && (window as any).$zoho.salesiq && (window as any).$zoho.salesiq.floatbutton) {
      if (location === "/") {
        (window as any).$zoho.salesiq.floatbutton.visible("show");
      } else {
        (window as any).$zoho.salesiq.floatbutton.visible("hide");
      }
    }

    if (hide) return;

    const zohoSelector = [
      '[id*="zsiq"]',
      '[class*="zsiq"]',
      '[id*="zoho"]',
      '[class*="zoho"]',
      'iframe[src*="salesiq"]',
      'iframe[src*="zoho"]',
    ].join(", ");

    const positionZohoLauncher = () => {
      const isDesktop = window.innerWidth >= 768;
      const bottomOffset = isDesktop ? 140 : 128;
      const rightOffset = 16;

      document.querySelectorAll<HTMLElement>(zohoSelector).forEach((element) => {
        const rect = element.getBoundingClientRect();
        const computed = window.getComputedStyle(element);
        const signature = `${element.id} ${element.className} ${element.tagName}`.toLowerCase();
        const isZohoElement =
          signature.includes("zsiq") ||
          signature.includes("zoho") ||
          signature.includes("salesiq") ||
          element.tagName.toLowerCase() === "iframe";

        const isLauncherLike =
          computed.position === "fixed" &&
          rect.width >= 24 &&
          rect.width <= 120 &&
          rect.height >= 24 &&
          rect.height <= 120;

        if (!isZohoElement || !isLauncherLike) return;

        element.style.setProperty("right", `${rightOffset}px`, "important");
        element.style.setProperty("left", "auto", "important");
        element.style.setProperty("bottom", `${bottomOffset}px`, "important");
        element.style.setProperty("top", "auto", "important");
        element.style.setProperty("z-index", "48", "important");
        element.style.setProperty("box-shadow", "0 10px 28px rgba(15, 23, 42, 0.14)", "important");
        element.style.setProperty("filter", "none", "important");
        element.style.setProperty("border", "0", "important");
      });
    };

    const observer = new MutationObserver(() => {
      positionZohoLauncher();
    });

    positionZohoLauncher();
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    const intervalId = window.setInterval(positionZohoLauncher, 1500);
    window.addEventListener("resize", positionZohoLauncher);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
      window.removeEventListener("resize", positionZohoLauncher);
    };
  }, [location]);

  if (hide) return null;

  const message = encodeURIComponent("Hi KRYROS! I need some help 👋");
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  const buttonBaseClass =
    "w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95";

  return (
    <div className="fixed right-4 bottom-16 md:bottom-20 z-50 flex flex-col items-end gap-4" style={{ right: '16px' }}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonBaseClass}
        aria-label="Chat on WhatsApp"
        style={{
          background: "transparent",
          color: "var(--kryros-header-navy)",
          boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
          border: "0",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        }}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 01 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}

// ── Page Transition Loader — shown between route changes ──────────────────────
// Shows while the next page's data loads in the background.
// Auto-dismisses after PAGE_TRANSITION_MS so the page reveals with content ready.
const PAGE_TRANSITION_MS = 1400;

function PageTransitionLoader({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "hsl(var(--background))",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.35s ease",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "4px solid var(--border)",
        borderTop: "4px solid var(--kryros-primary)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Lightweight Suspense fallback (JS chunk loading) ──────────────────────────
function PageLoader() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid var(--kryros-light-border)",
          borderTop: "3px solid var(--kryros-primary)",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function LoginRoute() {
  return <AuthPage />;
}

function RegisterRoute() {
  return <AuthPage />;
}

function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
}

// ── AppRoutes — handles both splash and page transitions ──────────────────────
function AppRoutes() {
  const { getMe } = useAuthStore();
  const { fetchCurrenciesByLocation } = useCurrencyStore();
  const [location] = useLocation();
  const prevLocationRef = useRef(location);
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getMe();
    // Use location-based currency detection instead of manual selection
    fetchCurrenciesByLocation();
    
    // Initial notification setup for both guests and authenticated users
    // This allows public device registration on first visit
    const token = useAuthStore.getState().token;
    // We use a small delay to ensure Firebase is ready and not blocking initial render
    setTimeout(() => {
      import('@/store/authStore').then(m => {
        m.hydrateNotifications(token);
      });
    }, 2000);
  }, []);

  // Trigger page transition overlay on every route change
  useEffect(() => {
    if (location !== prevLocationRef.current) {
      prevLocationRef.current = location;

      // Clear any in-flight transition timer
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

      // Show the overlay briefly for smooth transition
      setTransitioning(true);

      // Stay visible for 1.5 seconds to ensure content loads smoothly in the background
      transitionTimerRef.current = setTimeout(() => {
        setTransitioning(false);
      }, 1500);
    }
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [location]);

  const hideShell =
    location === "/pay" ||
    location.startsWith("/pay/") ||
    location.startsWith("/track-payment/") ||
    [
      "/checkout",
      "/dashboard",
      "/cart",
      "/apply-credit",
      "/wholesale-checkout",
      "/track",
      "/track-order",
      "/login",
      "/register",
      "/forgot-password",
    ].includes(location);

  return (
    <>
      {/* Page transition overlay — shows every time the user navigates to a new page */}
      <PageTransitionLoader visible={transitioning} />
      {!hideShell && <Header />}
      <Suspense fallback={<PageLoader />}>
        <div className="pb-0">
          <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/shop" component={ShopPage} />
          <Route path="/wholesale" component={WholesalePage} />
          <Route path="/get-now" component={GetNowPage} />

          {/* Static Routes First */}
          <Route path="/cart" component={CartPage} />
          <Route path="/checkout" component={CheckoutPage} />
          <Route path="/track-order" component={TrackOrderPage} />
          <Route path="/track" component={TrackOrderPage} />
          <Route path="/pickup-stations" component={PickupStationsPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/login" component={LoginRoute} />
          <Route path="/register" component={RegisterRoute} />
          <Route path="/forgot-password" component={ForgotPasswordRoute} />
          
          {/* Context-aware Category/Brand routes */}
          <Route path="/homepage/category/:slug" component={BrowsePage} />
          <Route path="/homepage/brand/:slug" component={BrowsePage} />
          <Route path="/shop/category/:slug" component={BrowsePage} />
          <Route path="/shop/brand/:slug" component={BrowsePage} />
          <Route path="/wholesale/category/:slug" component={BrowsePage} />
          <Route path="/wholesale/brand/:slug" component={BrowsePage} />
          <Route path="/get-now/category/:slug" component={BrowsePage} />
          <Route path="/get-now/brand/:slug" component={BrowsePage} />

          {/* Context-aware Section routes */}
          <Route path="/homepage/section/:slug" component={ShopSectionPage} />
          <Route path="/shop/section/:slug" component={ShopSectionPage} />
          <Route path="/wholesale/section/:slug" component={ShopSectionPage} />
          <Route path="/get-now/section/:slug" component={ShopSectionPage} />

          <Route path="/product/:slug" component={ProductPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/refund" component={RefundPage} />
          <Route path="/help" component={() => <GenericCMSPage slug="help" title="Help Center" />} />
          <Route path="/faq" component={() => <GenericCMSPage slug="faq" title="FAQ" />} />
          <Route path="/returns" component={() => <GenericCMSPage slug="returns" title="Returns Policy" />} />
          <Route path="/shipping" component={() => <GenericCMSPage slug="shipping" title="Shipping Policy" />} />
          <Route path="/security" component={() => <GenericCMSPage slug="security" title="Security" />} />
          <Route path="/pay/:linkId" component={PayPage} />
          <Route path="/pay" component={PayPage} />
          <Route path="/track-payment/:paymentNumber" component={TrackPaymentPage} />
          <Route path="/wishlist" component={WishlistPage} />
          <Route path="/apply-credit" component={ApplyCreditPage} />
          <Route path="/wholesale-checkout" component={WholesaleCheckoutPage} />
          <Route path="/categories" component={AllCategoriesPage} />
          <Route component={NotFound} />
        </Switch>
        </div>
      </Suspense>
      {!hideShell && <Footer />}
      {/* Spacer for MobileBottomNav — only on mobile, sits after footer */}
      {!hideShell && <div className="md:hidden" style={{ height: "calc(56px + env(safe-area-inset-bottom, 0px))" }} />}
      {!hideShell && <MobileBottomNav />}
      {!hideShell && <SupportFloatingButtons />}
    </>
  );
}

// ── Root App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
        <WouterRouter>
          <AppRoutes />
        </WouterRouter>
        <PwaInstallPrompt />
        <Toaster position="top-center" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
