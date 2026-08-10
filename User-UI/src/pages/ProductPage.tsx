import { useState, useEffect, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { 
  ChevronLeft, 
  Heart, 
  Share2, 
  Star, 
  ShoppingCart, 
  Zap, 
  Truck, 
  Shield, 
  RefreshCcw, 
  Minus, 
  Plus, 
  BarChart2, 
  MapPin,
  Package,
  Clock,
  ChevronRight,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { fetchProductById, fetchRelatedProducts, fetchStoreStatus } from "@/lib/api";
import { useRecentlyViewedStore } from "@/store/recentlyViewedStore";
import type { Product } from "@/lib/api";
import { formatDeliveryDuration, formatDeliveryWindow, resolveDeliveryWindow } from "@/lib/delivery";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCurrencyStore } from "@/store/currencyStore";
import UnifiedProductCard from "@/components/UnifiedProductCard";
import { getCreditMessage, getProductDisplayPrice, getProductPurchaseMode, getCreditPaymentDetails } from "@/lib/productPurchaseMode";

const SLIDE_INTERVAL = 3500;

export default function ProductPage() {
  const [, params] = useRoute("/product/:slug");
  const [, setLocation] = useLocation();
  const id = params?.slug;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelayedLoader, setShowDelayedLoader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [openSection, setOpenSection] = useState<string | null>("description");

  const renderSpecs = (specs: string) => {
    if (!specs || specs === "[]" || specs === "{}") return "No specifications available.";
    try {
      const parsed = JSON.parse(specs);
      if (Array.isArray(parsed)) {
        const genericOnly = parsed.length === 1 && String(parsed[0]?.key || "").trim().toLowerCase() === "specifications";
        if (genericOnly) {
          return <div className="whitespace-pre-wrap">{parsed[0]?.value || "No details available."}</div>;
        }
        return (
          <div className="space-y-2">
            {parsed.map((s: any, i: number) => (
              <div key={i} className="flex border-b border-border/50 pb-2 last:border-0">
                <span className="w-1/3 font-bold text-foreground">{s.key || s.label}:</span>
                <span className="w-2/3 text-muted-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        );
      }
    } catch (e) {
      const lines = specs.split('\n').filter(l => l.includes(':'));
      if (lines.length > 0) {
        return (
          <div className="space-y-2">
            {lines.map((line, i) => {
              const [key, ...val] = line.split(':');
              return (
                <div key={i} className="flex border-b border-border/50 pb-2 last:border-0">
                  <span className="w-1/3 font-bold text-foreground">{key.trim()}:</span>
                  <span className="w-2/3 text-muted-foreground">{val.join(':').trim()}</span>
                </div>
              );
            })}
          </div>
        );
      }
    }
    return <div className="whitespace-pre-wrap">{specs}</div>;
  };

  const [storeStatus, setStoreStatus] = useState<{
    isStoreClosed: boolean;
    message: string;
    openingTime: string;
    closingTime: string;
    operatingDays?: string;
    nextOpeningTime?: string;
    nextOpeningDay?: string;
  } | null>(null);

  const slideRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const addToCart = useCartStore((s) => s.addToCart);
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  const format = useCurrencyStore((s) => s.format);
  const addProduct = useRecentlyViewedStore((s) => s.addProduct);
  
  const wishlisted = product ? isWishlisted(product.id) : false;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchProductById(id),
      fetchRelatedProducts(id),
      fetchStoreStatus()
    ]).then(([p, r, s]) => {
      setProduct(p);
      setRelated(r);
      setStoreStatus(s);
      if (p?.image) setActiveImg(p.image);
    }).catch((err) => {
      console.error("Error loading product:", err);
      setError(err instanceof Error ? err.message : "Failed to load product details");
    }).finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!loading) {
      setShowDelayedLoader(false);
      return;
    }

    const loaderTimer = window.setTimeout(() => {
      setShowDelayedLoader(true);
    }, 1500);

    return () => {
      window.clearTimeout(loaderTimer);
    };
  }, [loading]);

  const images = product
    ? product.additionalImages
      ? [product.image, ...product.additionalImages]
      : [product.image]
    : [];

  useEffect(() => {
    if (images.length <= 1) return;
    autoRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % images.length;
        setActiveImg(images[next]);
        return next;
      });
    }, SLIDE_INTERVAL);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [images.length, product]);

  const goToSlide = (index: number) => {
    if (autoRef.current) clearInterval(autoRef.current);
    setActiveIndex(index);
    setActiveImg(images[index]);
    if (images.length > 1) {
      autoRef.current = setInterval(() => {
        setActiveIndex((prev) => {
          const next = (prev + 1) % images.length;
          setActiveImg(images[next]);
          return next;
        });
      }, SLIDE_INTERVAL);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    if (autoRef.current) clearInterval(autoRef.current);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      const dir = diff > 0 ? 1 : -1;
      const next = (activeIndex + dir + images.length) % images.length;
      goToSlide(next);
    } else {
      if (images.length > 1) {
        autoRef.current = setInterval(() => {
          setActiveIndex((prev) => {
            const n = (prev + 1) % images.length;
            setActiveImg(images[n]);
            return n;
          });
        }, SLIDE_INTERVAL);
      }
    }
  };

  // Track this product in recently viewed
  useEffect(() => {
    if (product) {
      addProduct(product);
    }
  }, [product, addProduct]);

  if (loading && showDelayedLoader) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div
        className="w-12 h-12 rounded-full animate-spin"
        style={{
          border: "4px solid var(--border)",
          borderTop: "4px solid var(--kryros-primary)",
        }}
      />
    </div>
  );

  if (loading) return null;

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <h1 className="text-xl font-bold mb-2 text-foreground">Something went wrong</h1>
      <p className="text-muted-foreground mb-2">{error}</p>
      <button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold mt-4">
        Try Again
      </button>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <Package className="w-16 h-16 text-muted-foreground mb-4" />
      <h1 className="text-xl font-bold mb-2">Product Not Found</h1>
      <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist or has been removed.</p>
      <button 
        onClick={() => window.history.back()} 
        className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold"
      >
        Go Back
      </button>
    </div>
  );

  const purchaseMode = getProductPurchaseMode(product);
  const isCreditProduct = purchaseMode === "credit";
  const isWholesaleProduct = purchaseMode === "wholesale";
  const displayPrice = getProductDisplayPrice(product);
  const creditMessage = getCreditMessage(product);
  const creditPaymentDetails = getCreditPaymentDetails(product);

  const handleAddToCart = () => {
    if (isWholesaleProduct && qty < (product.wholesaleMoq || 1)) {
      toast.error(`Minimum order quantity is ${product.wholesaleMoq}`);
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: displayPrice,
      qty,
      image: product.image,
      shippingFee: product.shippingFee,
      estimatedDeliveryDays: product.estimatedDeliveryDays,
      estimatedDeliveryMinDays: product.estimatedDeliveryMinDays,
      estimatedDeliveryMaxDays: product.estimatedDeliveryMaxDays,
      condition: product.condition,
      allowCredit: isCreditProduct,
      creditMinimum: product.creditMinimum ?? undefined,
      isWholesaleOnly: isWholesaleProduct,
      wholesalePrice: product.wholesalePrice ?? undefined,
      wholesaleMoq: product.wholesaleMoq
    });
    toast.success(isWholesaleProduct ? "Added to wholesale request" : "Added to cart", { description: product.name });
  };

  const handleAction = () => {
    if (isWholesaleProduct && qty < (product.wholesaleMoq || 1)) {
      toast.error(`Minimum order quantity is ${product.wholesaleMoq}`);
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: displayPrice,
      qty,
      image: product.image,
      shippingFee: product.shippingFee,
      estimatedDeliveryDays: product.estimatedDeliveryDays,
      estimatedDeliveryMinDays: product.estimatedDeliveryMinDays,
      estimatedDeliveryMaxDays: product.estimatedDeliveryMaxDays,
      condition: product.condition,
      allowCredit: isCreditProduct,
      creditMinimum: product.creditMinimum ?? undefined,
      isWholesaleOnly: isWholesaleProduct,
      wholesalePrice: product.wholesalePrice ?? undefined,
      wholesaleMoq: product.wholesaleMoq
    });
    // All products (credit, wholesale, normal) go to regular checkout
    setLocation("/checkout");
  };

  const deliveryWindow = resolveDeliveryWindow({
    minDays: product.estimatedDeliveryMinDays,
    maxDays: product.estimatedDeliveryMaxDays,
    fallbackDays: product.estimatedDeliveryDays ?? 3,
  });
  const shippingLabel = product.shippingFee != null && product.shippingFee > 0
    ? `${format(product.shippingFee)} shipping`
    : "Free shipping";
  const deliveryRangeText = deliveryWindow ? formatDeliveryDuration(deliveryWindow) : "Delivery estimate unavailable";
  const estimatedByText = deliveryWindow
    ? formatDeliveryWindow(new Date(), deliveryWindow, { weekday: 'short', month: 'short', day: 'numeric' })
    : "—";

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-muted rounded-full transition-colors"><Share2 className="w-5 h-5" /></button>
          <button onClick={() => { toggleWishlist(product.id); toast.success(wishlisted ? "Removed" : "Saved to wishlist!"); }} 
            className="p-2 hover:bg-muted rounded-full transition-colors">
            <Heart className={`w-5 h-5 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Desktop: two-column layout wrapper */}
      <div className="md:max-w-7xl md:mx-auto md:px-6 md:py-8 lg:px-12 lg:py-12 md:grid md:grid-cols-2 md:gap-12 lg:gap-16 md:items-start">

      {/* LEFT COLUMN: image + thumbnails */}
      <div>
        <div
          ref={slideRef}
          className="bg-muted aspect-square relative overflow-hidden select-none lg:rounded-2xl"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={activeImg}
            alt={product.name}
            className="w-full h-full object-contain mix-blend-multiply transition-opacity duration-300"
            draggable={false}
          />
          {product.discount > 0 && (
            <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground font-black px-3 py-1 rounded-xl text-sm shadow-lg z-10">
              -{product.discount}% OFF
            </div>
          )}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`rounded-full transition-all ${
                    activeIndex === i ? "w-5 h-1.5 bg-primary shadow" : "w-1.5 h-1.5 bg-primary/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 mt-4">
            {images.map((img, i) => (
              <button key={i} onClick={() => goToSlide(i)}
                className={`flex-shrink-0 w-20 h-20 rounded-2xl border-2 overflow-hidden transition-all bg-muted ${activeIndex === i ? "border-primary shadow-md scale-95" : "border-transparent"}`}>
                <img src={img} alt="" className="w-full h-full object-contain mix-blend-multiply" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT COL on desktop */}
      <div className="px-4 mt-4 md:px-0 md:mt-0 space-y-4">

        {/* Title + stock */}
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl lg:text-2xl font-black text-foreground leading-snug flex-1">{product.name}</h1>
          <span className={`flex-shrink-0 text-[11px] font-bold px-3 py-1 rounded-full border ${product.stock > 0 ? "border-green-600 text-green-600" : "border-destructive text-destructive"}`}>
            {product.stock > 0 ? "In Stock" : "Out of Stock"}
          </span>
        </div>

        {/* Category · Specs subtitle */}
        {(product.brand || product.category || product.specs) && (
          <p className="text-xs text-muted-foreground -mt-2">
            {[product.category, product.specs].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Price row — for credit products, show deposit as main price */}
        {isCreditProduct ? (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Initial Deposit</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-3xl lg:text-4xl font-black text-primary">
                {format(product.creditMinimum || 0)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-3xl lg:text-4xl font-black text-foreground">
              {format(displayPrice)}
            </span>
            {product.oldPrice > displayPrice && (
              <span className="text-base text-muted-foreground line-through">
                {format(product.oldPrice)}
              </span>
            )}
            {product.discount > 0 && (
              <span className="text-xs font-bold text-destructive bg-destructive/10 px-2.5 py-1 rounded-lg">Save {product.discount}%</span>
            )}
          </div>
        )}

        {/* Wholesale Details */}
        {isWholesaleProduct && (
          <div className="bg-primary/5 border border-primary/10 p-3 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-wider">Wholesale Exclusive</p>
              <p className="text-xs font-bold text-foreground">Minimum Order: {product.wholesaleMoq || 1} units</p>
            </div>
          </div>
        )}

        {/* Credit Details — payment breakdown without redundant labels */}
        {isCreditProduct && (
          <div className="bg-primary/5 border border-primary/10 p-3 rounded-2xl">
            <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-primary/10">
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Installment</p>
                <p className="font-bold text-primary">{format(creditPaymentDetails.installmentAmount)}</p>
                <p className="text-[9px] text-muted-foreground capitalize">every {creditPaymentDetails.intervalLabel}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Payments</p>
                <p className="font-bold text-primary">{creditPaymentDetails.installmentCount}</p>
                <p className="text-[9px] text-muted-foreground">installments</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Duration</p>
                <p className="font-bold text-primary">{creditPaymentDetails.period}</p>
                <p className="text-[9px] text-muted-foreground">total plan</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-primary/10 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Price:</span>
              <span className="text-sm font-black text-foreground">{format(displayPrice)}</span>
            </div>
          </div>
        )}

        {/* Quantity + Wishlist + Compare */}
        <div className="flex items-center gap-4 py-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Quantity</span>
            <div className="flex items-center border border-border rounded-xl overflow-hidden">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          <button onClick={() => { toggleWishlist(product.id); toast.success(wishlisted ? "Removed" : "Saved to wishlist!"); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
            <Heart className={`w-4 h-4 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} /> Wishlist
          </button>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
            <BarChart2 className="w-4 h-4" /> Compare
          </button>
        </div>

        {/* Delivery info */}
        <div className="space-y-2">
          <span className="text-sm font-bold text-primary">{shippingLabel}</span>
          <p className="text-xs font-semibold text-foreground">
            {deliveryRangeText}
          </p>
          <p className="text-xs text-foreground">
            Estimated by {estimatedByText}
          </p>
        </div>

        {/* Condition row */}
        <div className="py-3 border-t border-border">
          <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold shadow-sm" style={{ background:'var(--kryros-primary)', color:'var(--kryros-white-text)' }}>
            {product.condition || "New"}
          </span>
        </div>

        {/* Store Closed Status */}
        {storeStatus?.isStoreClosed && (
          <div className="bg-secondary/50 border border-border rounded-xl shadow-sm overflow-hidden h-[50px] grid grid-cols-[35px_1fr_60px] items-center">
            <div className="flex justify-center border-r border-border h-full items-center">
              <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex flex-col justify-center px-2 min-w-0">
              <span className="text-[8px] font-black text-destructive leading-none mb-0.5 uppercase tracking-tighter whitespace-nowrap">CLOSED NOW</span>
              <div className="flex flex-col whitespace-nowrap overflow-hidden">
                <span className="text-[7px] font-bold text-foreground leading-none mb-0.5 truncate">{storeStatus?.operatingDays}</span>
                <span className="text-[7px] font-medium text-muted-foreground leading-none truncate">{storeStatus?.openingTime} - {storeStatus?.closingTime}</span>
              </div>
            </div>
            <div className="flex flex-col items-end justify-center border-l border-border pr-2 h-full">
              <span className="text-[10px] font-black text-primary leading-none mb-0.5 whitespace-nowrap">{storeStatus?.nextOpeningTime}</span>
              <span className="text-[7px] font-bold text-muted-foreground leading-none whitespace-nowrap">{storeStatus?.nextOpeningDay}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {storeStatus?.isStoreClosed ? (
            <button disabled
              className="w-full py-3.5 bg-muted text-muted-foreground rounded-full font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" /> Store Closed
            </button>
          ) : (
            <>
              {/* Buy It Now — solid primary */}
              <button onClick={handleAction} disabled={product.stock === 0 || (isWholesaleProduct && qty < (product.wholesaleMoq || 1))}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-full font-bold text-sm hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                {isCreditProduct ? (
                  <><CreditCard className="w-4 h-4" /> Shop Now</>
                ) : isWholesaleProduct ? (
                  <><Package className="w-4 h-4" /> Request Bulk Quote</>
                ) : (
                  "Shop Now"
                )}
              </button>

              {/* Add to Cart — outlined */}
              {!isCreditProduct && (
                <button onClick={handleAddToCart} disabled={product.stock === 0 || (isWholesaleProduct && qty < (product.wholesaleMoq || 1))}
                  className="w-full py-3.5 border border-primary text-primary rounded-full font-bold text-sm hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isWholesaleProduct ? "Add to Bulk Request" : "Add to cart"}
                </button>
              )}

              {/* Add to Wishlist — outlined */}
              <button onClick={() => { toggleWishlist(product.id); toast.success(wishlisted ? "Removed from wishlist" : "Saved to wishlist!"); }}
                className="w-full py-3.5 border border-border text-foreground rounded-full font-bold text-sm hover:bg-muted transition-all active:scale-95 flex items-center justify-center gap-2">
                <Heart className={`w-4 h-4 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
                {wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              </button>
            </>
          )}
        </div>

        {/* Accordion sections */}
        <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {/* About this item */}
          <div>
            <button onClick={() => setOpenSection(openSection === "description" ? null : "description")}
              className="w-full flex items-center justify-between px-4 py-4 text-left">
              <div>
                <p className="text-sm font-bold text-foreground">About this item</p>
                <p className="text-xs text-muted-foreground mt-0.5">Condition, quantity, item details and more.</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${openSection === "description" ? "rotate-90" : ""}`} />
            </button>
            {openSection === "description" && (
              <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
                <div className="whitespace-pre-wrap">{product.description || "No description available."}</div>
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <button onClick={() => setOpenSection(openSection === "specs" ? null : "specs")}
              className="w-full flex items-center justify-between px-4 py-4 text-left">
              <div>
                <p className="text-sm font-bold text-foreground">Details</p>
                <p className="text-xs text-muted-foreground mt-0.5">Product details configured for this item.</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${openSection === "specs" ? "rotate-90" : ""}`} />
            </button>
            {openSection === "specs" && (
              <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border pt-3 space-y-3">
                {renderSpecs(product.specs)}
                
                {/* Dynamically show additional info if it exists but isn't in specs */}
                {isWholesaleProduct && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="font-bold text-foreground mb-1">Wholesale Information</p>
                    <div className="grid grid-cols-2 gap-y-1">
                      <span>Minimum Order:</span>
                      <span className="font-semibold">{product.wholesaleMoq || 1} units</span>
                      <span>Wholesale Price:</span>
                      <span className="font-semibold text-blue-600">{format(product.wholesalePrice || product.price)}</span>
                    </div>
                  </div>
                )}
                
                {isCreditProduct && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="font-bold text-foreground mb-1">Credit Information</p>
                    <div className="grid grid-cols-2 gap-y-1">
                      <span>Credit Option:</span>
                      <span className="font-semibold text-primary">{creditMessage}</span>
                      <span>Initial Deposit:</span>
                      <span className="font-semibold text-primary">{format(product.creditMinimum || 0)}</span>
                      <span>Payment Frequency:</span>
                      <span className="font-semibold text-primary capitalize">{creditPaymentDetails.frequency}</span>
                      <span>Per-Installment:</span>
                      <span className="font-semibold text-primary">{format(creditPaymentDetails.installmentAmount)}</span>
                      <span>Number of Payments:</span>
                      <span className="font-semibold text-primary">{creditPaymentDetails.installmentCount}</span>
                      <span>Total Duration:</span>
                      <span className="font-semibold text-primary">{creditPaymentDetails.period}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div>
            <button onClick={() => setOpenSection(openSection === "reviews" ? null : "reviews")}
              className="w-full flex items-center justify-between px-4 py-4 text-left">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">Reviews</p>
                  {product.rating > 0 && (
                    <>
                      <span className="text-sm font-bold text-foreground">{product.rating}</span>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5" style={{ fill: i < Math.floor(product.rating) ? "var(--kryros-star-filled)" : "var(--kryros-border)", color: i < Math.floor(product.rating) ? "var(--kryros-star-filled)" : "var(--kryros-border)" }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Customer reviews and ratings.</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${openSection === "reviews" ? "rotate-90" : ""}`} />
            </button>
            {openSection === "reviews" && (
              <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
                {product.reviewCount > 0 ? `${product.reviewCount.toLocaleString()} verified reviews` : "No reviews yet."}
              </div>
            )}
          </div>
        </div>

        {/* Trust badges */}
        <div className="space-y-3 pt-1">
          {(product as any).soldCount > 0 && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-foreground">
                <span className="font-bold">{product.popularItemText || "Popular item."} </span>
                {(product as any).soldCount ? `${(product as any).soldCount} have already sold.` : ""}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-foreground">
              <span className="font-bold">{product.freeReturnsText || product.easyReturnsText || "Breathe easy."} </span>
              {product.freeReturnsDescription || "Returns accepted."}
            </p>
          </div>
          <div>
            <p className="text-sm text-foreground">
              <span className="font-bold">{product.fiveYearGuaranteeText || "Protected."} </span>
              {product.protectionDescription || "Delivery cover against loss or damage."}
            </p>
          </div>
        </div>

        {related.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">You May Also Like</h2>
              <Link href="/shop"><span className="text-xs text-primary font-semibold">View all</span></Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {related.map((p) => (
                <UnifiedProductCard key={p.id} product={p} className="w-full" />
              ))}
            </div>
          </div>
        )}
      </div>

      </div>
    </div>
  );
}
