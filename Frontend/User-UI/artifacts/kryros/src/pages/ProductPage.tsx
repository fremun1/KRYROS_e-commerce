import { useState, useEffect } from "react";
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
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { fetchProductById, fetchRelatedProducts, fetchStoreStatus } from "@/lib/api";
import type { Product } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCurrencyStore } from "@/store/currencyStore";
import UnifiedProductCard from "@/components/UnifiedProductCard";

export default function ProductPage() {
  const [, params] = useRoute("/product/:slug");
  const id = params?.slug;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState("");
  const [openSection, setOpenSection] = useState<string | null>("description");
  const [storeStatus, setStoreStatus] = useState<{
    isStoreClosed: boolean;
    message: string;
    openingTime: string;
    closingTime: string;
    operatingDays?: string;
    nextOpeningTime?: string;
    nextOpeningDay?: string;
  } | null>(null);

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
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      qty,
      image: product.image
    });
    toast.success("Added to cart", { description: product.name });
  };

  const handleBuyNow = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      qty,
      image: product.image
    });
    window.location.href = "/checkout";
  };

  const images = product.additionalImages ? [product.image, ...product.additionalImages] : [product.image];

  return (
    <div className="min-h-screen bg-background pb-[140px]">
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

      {/* Image Gallery */}
      <div className="bg-[#F1F1F1] dark:bg-[#101826] aspect-square relative overflow-hidden">
        <img src={activeImg} alt={product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
        {product.discount > 0 && (
          <div className="absolute top-4 left-4 bg-[#B91C1C] text-white font-black px-3 py-1 rounded-xl text-sm shadow-lg z-10">
            -{product.discount}% OFF
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 mt-4">
          {images.map((img, i) => (
            <button key={i} onClick={() => setActiveImg(img)} 
              className={`flex-shrink-0 w-20 h-20 rounded-2xl border-2 overflow-hidden transition-all bg-[#F1F1F1] dark:bg-[#101826] ${activeImg === img ? "border-primary shadow-md scale-95" : "border-transparent"}`}>
              <img src={img} alt="" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
            </button>
          ))}
        </div>
      )}

      <div className="px-4 mt-4 space-y-4">
        {/* Title + stock */}
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-black text-foreground leading-snug flex-1">{product.name}</h1>
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

        {/* Price */}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-3xl font-black text-foreground dark:text-white">
              {format(product.price)}
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

        {/* Store Closed Status — Detailed Box */}
        {storeStatus?.isStoreClosed && (
          <div className="bg-secondary/50 border border-border rounded-xl shadow-sm overflow-hidden h-[50px] grid grid-cols-[35px_1fr_60px] items-center">
            {/* Left: Icon */}
            <div className="flex justify-center border-r border-border h-full items-center">
              <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
              </div>
            </div>

            {/* Middle: Status & Hours */}
            <div className="flex flex-col justify-center px-2 min-w-0">
              <span className="text-[8px] font-black text-destructive leading-none mb-0.5 uppercase tracking-tighter whitespace-nowrap">CLOSED NOW</span>
              <div className="flex flex-col whitespace-nowrap overflow-hidden">
                <span className="text-[7px] font-bold text-foreground leading-none mb-0.5 truncate">{storeStatus?.operatingDays}</span>
                <span className="text-[7px] font-medium text-muted-foreground leading-none truncate">{storeStatus?.openingTime} - {storeStatus?.closingTime}</span>
              </div>
            </div>

            {/* Right: Next Opening */}
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
            { id: "description", label: "Description", content: product.description || "No description available." },
            { id: "specs", label: "Specifications", content: product.specs || "No specifications available." },
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
            <div className="grid grid-cols-2 gap-2">
              {related.map((p) => (
                <UnifiedProductCard key={p.id} product={p} className="w-full" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom CTA — fixed at bottom-0; nav (z-50) slides over it on scroll */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border px-4 py-3 z-40">
        <div className="flex gap-3 max-w-lg mx-auto">
          {storeStatus?.isStoreClosed ? (
            <button disabled
              className="flex-1 py-3.5 bg-muted text-muted-foreground rounded-2xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" /> Store Closed
            </button>
          ) : (
            <>
              <button onClick={handleAddToCart} disabled={product.stock === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50">
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>
              <button onClick={handleBuyNow} disabled={product.stock === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-foreground text-background rounded-2xl font-bold text-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                <Zap className="w-4 h-4" /> {product.allowCredit ? "Get Now" : "Buy Now"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
