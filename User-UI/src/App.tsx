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

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import AuthPage from "@/components/auth/AuthPage";

// ── Route-based code splitting ─────────────────────────────────────────────────
const HomePage = lazy(() => import("@/pages/HomePage"));
const ShopPage = lazy(() => import("@/pages/ShopPage"));
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

// ── WhatsApp Floating Button ───────────────────────────────────────────────────
function WhatsAppFloatingButton() {
  const [hovered, setHovered] = useState(false);
  const [location] = useLocation();
  const hide =
    ["/login", "/register", "/forgot-password"].includes(location) ||
    location === "/pay" ||
    location.startsWith("/pay/") ||
    location.startsWith("/track-payment/");
  if (hide) return null;

  const message = encodeURIComponent("Hi KRYROS! I need some help 👋");
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed bottom-20 right-4 z-50 flex items-center gap-2.5 group"
      aria-label="Chat on WhatsApp"
    >
      {hovered && (
        <span className="bg-white text-gray-800 text-sm font-medium px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
          Chat on WhatsApp
        </span>
      )}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200"
        style={{
          background:
            "linear-gradient(135deg, var(--kryros-primary-hover) 0%, var(--kryros-primary) 100%)",
          transform: hovered ? "scale(1.1)" : "scale(1)",
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </div>
    </a>
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
      {/* Thin teal progress bar at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: 3,
          background:
            "linear-gradient(90deg, var(--kryros-primary), var(--kryros-primary-hover))",
          borderRadius: "0 2px 2px 0",
          animation: visible ? "ktp-progress 1.3s ease-out forwards" : "none",
        }}
      />

      {/* Logo wrap with pulsing rings */}
      <div
        style={{
          position: "relative",
          width: 100,
          height: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              borderRadius: "50%",
              border: `1.5px solid rgba(var(--kryros-primary-rgb),${0.4 - i * 0.12})`,
              width: 46 + i * 24,
              height: 46 + i * 24,
              animation: `ktp-ring 1.6s ease-out ${(i - 1) * 0.3}s infinite`,
            }}
          />
        ))}
        <img
          src="/kryros-logo.png"
          alt="KRYROS"
          style={{
            width: 44,
            height: 44,
            objectFit: "contain",
            animation: "ktp-blink 1.4s ease-in-out infinite",
            zIndex: 1,
            position: "relative",
          }}
        />
      </div>

      {/* Bouncing dots */}
      <div style={{ display: "flex", gap: 6, marginTop: 18 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--kryros-primary)",
              animation: `ktp-dot 0.85s ease-in-out ${i * 0.16}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes ktp-progress {
          0%   { width: 0%; }
          40%  { width: 60%; }
          80%  { width: 85%; }
          100% { width: 100%; }
        }
        @keyframes ktp-ring {
          0%   { transform: scale(0.82); opacity: 0.85; }
          60%  { opacity: 0.3; }
          100% { transform: scale(1.22); opacity: 0; }
        }
        @keyframes ktp-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes ktp-dot {
          0%, 100% { transform: translateY(0);    opacity: 0.3; }
          50%       { transform: translateY(-7px); opacity: 1; }
        }
      `}</style>
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

// ── AppRoutes — handles both splash and page transitions ──────────────────────
function AppRoutes() {
  const { getMe } = useAuthStore();
  const { fetchCurrencies } = useCurrencyStore();
  const [location] = useLocation();
  const prevLocationRef = useRef(location);
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getMe();
    fetchCurrencies();
  }, []);

  // Trigger page transition overlay on every route change
  useEffect(() => {
    if (location !== prevLocationRef.current) {
      prevLocationRef.current = location;

      // Clear any in-flight transition timer
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

      // Show the overlay immediately
      setTransitioning(true);

      // Auto-dismiss after PAGE_TRANSITION_MS — by then the page data is loading
      transitionTimerRef.current = setTimeout(() => {
        setTransitioning(false);
      }, PAGE_TRANSITION_MS);
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
      "/get-now",
      "/apply-credit",
      "/wholesale-checkout",
    ].includes(location);

  return (
    <>
      <PageTransitionLoader visible={transitioning} />
      {!hideShell && <Header />}
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/shop" component={ShopPage} />
          <Route path="/product/:slug" component={ProductPage} />
          <Route path="/cart" component={CartPage} />
          <Route path="/checkout" component={CheckoutPage} />
          <Route path="/get-now" component={GetNowPage} />
          <Route path="/track-order" component={TrackOrderPage} />
          <Route path="/track" component={TrackOrderPage} />
          <Route path="/pickup-stations" component={PickupStationsPage} />
          <Route path="/wholesale" component={WholesalePage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route
            path="/login"
            component={() => <AuthPage initialTab="login" />}
          />
          <Route
            path="/register"
            component={() => <AuthPage initialTab="register" />}
          />
          <Route
            path="/forgot-password"
            component={() => <AuthPage initialTab="forgot" />}
          />
          <Route path="/about" component={AboutPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/refund" component={RefundPage} />
          <Route path="/help" component={HelpPage} />
          <Route path="/faq" component={FaqPage} />
          <Route path="/returns" component={ReturnsPage} />
          <Route path="/shipping" component={ShippingPage} />
          <Route path="/security" component={SecurityPage} />
          <Route path="/pay/:linkId" component={PayPage} />
          <Route path="/pay" component={PayPage} />
          <Route path="/track-payment/:paymentNumber" component={TrackPaymentPage} />
          <Route path="/wishlist" component={WishlistPage} />
          <Route path="/apply-credit" component={ApplyCreditPage} />
          <Route path="/wholesale-checkout" component={WholesaleCheckoutPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      {!hideShell && <Footer />}
      {!hideShell && <MobileBottomNav />}
      <WhatsAppFloatingButton />
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
