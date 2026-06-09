import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
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
  CreditCard,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { fetchProductById, fetchRelatedProducts, fetchStoreStatus } from "@/lib/api";
import type { Product } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCurrencyStore } from "@/store/currencyStore";
import UnifiedProductCard from "@/components/UnifiedProductCard";

const SLIDE_INTERVAL = 3500;

export default function ProductPage() {
  const [, params] = useRoute("/product/:slug");
  const id = params?.slug;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [openSection, setOpenSection] = useState<string | null>("description");

  const renderSpecs = (specs: string) => {
    if (!specs || specs === "[]" || specs === "{}") return "No specifications available.";
    
    // Try to parse if it's JSON
    try {
      const parsed = JSON.parse(specs);
      if (Array.isArray(parsed)) {
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
      // If not JSON, handle as "Key: Value" lines
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

  // Swipe / auto-slide refs
  const slideRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const addToCart = useCartStore((s) => s.addToCart);
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  const format = useCurrencyStore((s) => s.format);
  
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
    }).finally(() => setLoading(false));
    
    window.scrollTo(0, 0);
  }, [id]);

  const images = product
    ? product.additionalImages
      ? [product.image, ...product.additionalImages]
      : [product.image]
    : [];

  // Auto-slide effect
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
    // Restart auto-slide after manual interaction
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

  // Swipe handlers
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
      // Restart auto-slide if no meaningful swipe
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <Package className="w-16 h-16 text-muted-foreground mb-4" />
      <h1 className="text-xl font-bold mb-2">Product Not Found</h1>
      <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist or has been removed.</p>
      <Link href="/shop">
        <button className="bg-primary text-white px-8 py-3 rounded-2xl font-bold">Back to Shop</button>
      </Link>
    </div>
  );

  const handleAddToCart = () => {
    if (product.isWholesaleOnly && qty < (product.wholesaleMoq || 1)) {
      toast.error(`Minimum order quantity is ${product.wholesaleMoq}`);
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.isWholesaleOnly ? (product.wholesalePrice || product.price) : product.price,
      qty,
      image: product.image
    });
    toast.success(product.isWholesaleOnly ? "Added to wholesale request" : "Added to cart", { description: product.name });
  };

  const handleAction = () => {
    if (product.isWholesaleOnly && qty < (product.wholesaleMoq || 1)) {
      toast.error(`Minimum order quantity is ${product.wholesaleMoq}`);
      return;
    }
    
    addToCart({
      id: product.id,
      name: product.name,
      price: product.isWholesaleOnly ? (product.wholesalePrice || product.price) : product.price,
      qty,
      image: product.image
    });

    if (product.allowCredit) {
      window.location.href = "/apply-credit"; // Redirect to a specialized credit application flow
    } else if (product.isWholesaleOnly) {
      window.location.href = "/wholesale-checkout"; // Redirect to specialized wholesale checkout
    } else {
      window.location.href = "/checkout";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-[140px] md:pb-10">
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

      {/* LEFT COLUMN: image + thumbnails stay together in col 1 on desktop */}
      <div>

      {/* LEFT COL: Image Gallery — swipeable + auto-sliding */}
      <div
        ref={slideRef}
        className="bg-[#F1F1F1] dark:bg-[#101826] aspect-square relative overflow-hidden select-none lg:rounded-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={activeImg}
          alt={product.name}
          className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transition-opacity duration-300"
          draggable={false}
        />
        {product.discount > 0 && (
          <div className="absolute top-4 left-4 bg-[#B91C1C] text-white font-black px-3 py-1 rounded-xl text-sm shadow-lg z-10">
            -{product.discount}% OFF
          </div>
        )}

        {/* Dot indicators — only if multiple images */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`rounded-full transition-all ${
                  activeIndex === i
                    ? "w-5 h-1.5 bg-white shadow"
                    : "w-1.5 h-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip — only shown if multiple images */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 mt-4">
          {images.map((img, i) => (
            <button key={i} onClick={() => goToSlide(i)}
              className={`flex-shrink-0 w-20 h-20 rounded-2xl border-2 overflow-hidden transition-all bg-[#F1F1F1] dark:bg-[#101826] ${activeIndex === i ? "border-primary shadow-md scale-95" : "border-transparent"}`}>
              <img src={img} alt="" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
            </button>
          ))}
        </div>
      )}

      </div>{/* end left column wrapper */}

      {/* RIGHT COL on desktop */}
      <div className="px-4 mt-4 md:px-0 md:mt-0 space-y-4">
        {/* Title + stock */}
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl lg:text-2xl font-black text-foreground leading-snug flex-1">{product.name}</h1>
          <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-xl ${product.stock > 0 ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"}`}>
            {product.stock > 0 ? "In Stock" : "Out of Stock"}
          </span>
        </div>

        {/* Spec bar */}
        {(product.brand || product.category || product.specs) && (
          <p className="text-xs text-muted-foreground -mt-2">
            {[product.brand, product.specs].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Rating */}
        {product.rating > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating) ? "fill-[#FFC107] text-[#FFC107]" : "fill-gray-200 dark:fill-[#2B2F39] text-gray-200 dark:text-[#2B2F39]"}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-foreground">{product.rating}</span>
              {product.reviewCount > 0 && (
                <span className="text-xs text-muted-foreground">({product.reviewCount.toLocaleString()} reviews)</span>
              )}
            </div>
          </div>
        )}

        {/* Price & Specialized Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-3xl lg:text-4xl font-black text-foreground dark:text-white">
              {product.isWholesaleOnly && product.wholesalePrice ? format(product.wholesalePrice) : format(product.price)}
            </span>
            {product.oldPrice > product.price && (
              <span className="text-base text-muted-foreground dark:text-[#A9B4C7] line-through">
                {format(product.oldPrice)}
              </span>
            )}
            {product.discount > 0 && (
              <span className="text-xs font-bold text-[#B91C1C] bg-[#B91C1C]/10 px-2 py-0.5 rounded-lg">Save {product.discount}%</span>
            )}
          </div>

          {/* Wholesale Details */}
          {product.isWholesaleOnly && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Wholesale Exclusive</p>
                <p className="text-xs font-bold text-foreground">Minimum Order: {product.wholesaleMoq || 1} units</p>
              </div>
            </div>
          )}

          {/* Credit Details - Full Financial Breakdown */}
          {product.allowCredit && (
            <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-wider">Payment Breakdown</p>
                  <p className="text-xs font-bold text-foreground">{product.creditMessage || "Get Now, Pay Later"}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-primary/10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">Total Product Price</span>
                  <span className="text-sm font-bold text-foreground">{format(product.price)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">Initial Deposit Required</span>
                  <span className="text-sm font-black text-primary">{format(product.creditMinimum || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">Monthly Installment (12mo)</span>
                  <span className="text-sm font-bold text-foreground">{format((product.price - (product.creditMinimum || 0)) / 12)}/mo</span>
                </div>
              </div>

              <div className="bg-primary/10 p-2 rounded-xl flex items-start gap-2">
                <Info className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-[9px] text-primary/80 leading-tight">
                  This is an estimate based on a 12-month plan. Actual monthly payments may vary based on your selected credit plan during checkout.
                </p>
              </div>
            </div>
          )}
        </div>

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

        {/* Delivery row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Truck, title: "Free Delivery", sub: "On orders above minimum", subColor: "text-primary" },
            { icon: MapPin, title: "Pickup Available", sub: "at KRYROS Stations", subColor: "text-muted-foreground" },
            { icon: Shield, title: "Delivery Protection", sub: "Cover against loss or damage", subColor: "text-muted-foreground", arrow: true },
          ].map(({ icon: Icon, title, sub, subColor, arrow }) => (
            <div key={title} className="border border-border rounded-xl p-2.5 cursor-pointer hover:border-primary/30 transition-all">
              <Icon className="w-4 h-4 text-primary mb-1.5" />
              <p className="text-[10px] font-bold text-foreground leading-tight">{title}</p>
              <p className={`text-[9px] ${subColor} leading-snug mt-0.5`}>{sub}</p>
              {arrow && <ChevronRight className="w-3 h-3 text-muted-foreground mt-1" />}
            </div>
          ))}
        </div>

        {/* Expandable sections */}
        <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {[
            { id: "description", label: "Description", content: <div className="whitespace-pre-wrap">{product.description || "No description available."}</div> },
            { id: "specs", label: "Specifications", content: renderSpecs(product.specs) },
            { id: "reviews", label: "Reviews", extra: product.rating > 0 ? String(product.rating) : undefined, stars: product.rating > 0, content: product.reviewCount > 0 ? `${product.reviewCount.toLocaleString()} verified reviews` : "No reviews yet." },
          ].map(({ id, label, extra, stars, content }) => (
            <div key={id}>
              <button onClick={() => setOpenSection(openSection === id ? null : id)} className="w-full flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{label}</span>
                  {stars && extra && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold">{extra}</span>
                      <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}</div>
                    </div>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${openSection === id ? "rotate-90" : ""}`} />
              </button>
              {openSection === id && (
                <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {content}
                </div>
              )}
            </div>
          ))}
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

      </div>{/* end two-col wrapper */}

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border px-4 py-3 z-40 md:relative md:bottom-auto md:left-auto md:right-auto md:bg-transparent md:border-0 md:backdrop-blur-none md:p-0 md:mt-4">
        <div className="flex gap-3 max-w-lg mx-auto md:max-w-none">
          {storeStatus?.isStoreClosed ? (
            <button disabled
              className="flex-1 py-3.5 bg-muted text-muted-foreground rounded-2xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" /> Store Closed
            </button>
          ) : (
            <>
              {!product.allowCredit && (
                <button onClick={handleAddToCart} disabled={product.stock === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 lg:py-4 bg-primary text-white rounded-2xl font-bold text-sm lg:text-base hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50">
                  <ShoppingCart className="w-4 h-4" /> 
                  {product.isWholesaleOnly ? "Add to Bulk Request" : "Add to Cart"}
                </button>
              )}
              <button onClick={handleAction} disabled={product.stock === 0}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 lg:py-4 rounded-2xl font-bold text-sm lg:text-base hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 ${product.allowCredit ? 'bg-primary text-white w-full' : 'bg-foreground text-background'}`}>
                {product.allowCredit ? (
                  <><CreditCard className="w-4 h-4" /> Apply for Credit</>
                ) : product.isWholesaleOnly ? (
                  <><Package className="w-4 h-4" /> Request Bulk Quote</>
                ) : (
                  <><Zap className="w-4 h-4" /> Buy Now</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
