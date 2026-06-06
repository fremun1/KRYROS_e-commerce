import { useState, useEffect } from "react";
import { Heart, ShoppingCart, Zap, Package, Clock } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { fetchStoreStatus } from "@/lib/api";
import type { Product } from "@/lib/api";

interface UnifiedProductCardProps {
  product: Product;
  /** Outer div class — "w-full" for grid, "w[calc(50vw-16px)]" for scroll */
  className?: string;
  /** Optional extra badge text e.g. "🔥 Trending" */
  badge?: string;
  /**
   * Controls how the product image fills the 4:5 portrait wrapper.
   * - 'cover' (default) — fills the frame edge-to-edge, cropping if needed.
   *   Best for all product types — no white space, image always fills box.
   * - 'contain'            — full image visible with 12px safety padding.
   *   Use for electronics / isolated product cuts with transparent backgrounds.
   */
  imageStyle?: "cover" | "contain";
}

/** Strip specs that are empty JSON artifacts like "[]" or blank strings */
function validSpecs(specs: string | undefined | null): string {
  if (!specs) return "";
  const t = specs.trim();
  if (t === "" || t === "[]" || t === "{}" || t === "null") return "";
  return t;
}

export default function UnifiedProductCard({
  product,
  className = "w-full",
  badge,
  imageStyle = "cover",
}: UnifiedProductCardProps) {
  const [imgErr, setImgErr] = useState(false);
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
  const wishlisted = isWishlisted(product.id);

  useEffect(() => {
    fetchStoreStatus().then(setStoreStatus);
  }, []);

  const monthlyText = product.creditMessage || `${format(product.price / 12)}/mo`;
  const specs = validSpecs(product.specs);
  const inStock = product.stock > 0;
  const isStoreClosed = storeStatus?.isStoreClosed ?? false;
  const canPurchase = inStock && !isStoreClosed;

  return (
    <div
      className={`${className} bg-card border border-border rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow flex flex-col`}
      onClick={() => (window.location.href = `/product/${product.id}`)}
    >
      {/*
       * ── .product-image-wrapper ──────────────────────────────────────────
       * Square 1:1 aspect ratio — compact, balanced; prevents layout shift (CLS) before
       * the image loads. overflow-hidden clips the hover zoom animation.
       * rounded-xl (12px) applies border-radius directly to this container.
       * The `group` class enables the child img's group-hover zoom target.
       */}
      <div className="relative group aspect-square rounded-xl overflow-hidden bg-[#F1F1F1] dark:bg-[#101826]">
        {!imgErr && product.image ? (
          <img
            src={product.image}
            alt={product.name}
            /*
             * Hardware-accelerated micro-zoom on hover.
             * transform: scale(1.04) — subtle, non-disorienting zoom.
             * transition: 400ms cubic-bezier(0.25, 1, 0.5, 1) — fast-in, smooth-out.
             *
             * imageStyle="contain" (default) → object-contain + 12px safety padding
             *   + mix-blend-multiply to remove white halos on transparent product cuts.
             * imageStyle="cover"             → object-cover object-center, fills frame.
             */
            className={`w-full h-full transition-transform duration-[400ms] [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.04] ${
              imageStyle === "cover"
                ? "object-cover object-center"
                : "object-contain p-3 mix-blend-multiply dark:mix-blend-normal"
            }`}
            loading="lazy"
            decoding="async"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}

        {/* Discount badge — top: 12px; left: 12px; z-index: 10 */}
        {product.discount > 0 && (
          <span className="absolute top-3 left-3 bg-[#B91C1C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg z-10 shadow-sm">
            -{product.discount}%
          </span>
        )}
        {product.isWholesaleOnly && (
          <span className="absolute top-3 left-3 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg z-10">
            Wholesale
          </span>
        )}
        {badge && (
          <span className="absolute bottom-3 left-3 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg z-10">
            {badge}
          </span>
        )}

        {/* Wishlist heart button — top: 12px; right: 12px; z-index: 10 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
            toast.success(wishlisted ? "Removed from wishlist" : "Added to wishlist", { description: product.name });
          }}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 dark:bg-[#2B2F39]/80 backdrop-blur-sm flex items-center justify-center z-10 shadow-sm border border-transparent dark:border-white/10"
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${wishlisted ? "fill-red-500 text-red-500" : "text-muted-foreground dark:text-[#A9B4C7]"}`} />
        </button>
      </div>

      {/* ── Info: Reduced padding to shorten height ── */}
      <div className="p-2 flex flex-col flex-1">

        {/* Name */}
        <h3 className="text-[11px] font-semibold text-foreground leading-tight line-clamp-1 mb-0.5">
          {product.name}
        </h3>

        {/* Specs */}
        {specs && (
          <p className="text-[9px] text-muted-foreground truncate mb-0.5">{specs}</p>
        )}

        {/* Price + old price */}
        <div className="flex items-center flex-wrap gap-x-1 mb-0.5">
          <span className="text-[13px] font-bold text-foreground dark:text-white">{format(product.price)}</span>
          {product.oldPrice > product.price && (
            <span className="text-[9px] text-muted-foreground dark:text-[#A9B4C7] line-through">{format(product.oldPrice)}</span>
          )}
        </div>

        {/* Stock badge FIRST, then stars/reviews */}
        <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mb-1">
          {/* 1. Stock badge — always first for non-wholesale */}
          {!product.isWholesaleOnly && (
            inStock ? (
              <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                In Stock
              </span>
            ) : (
              <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                Out of Stock
              </span>
            )
          )}

          {/* 2. Stars + review count — after stock badge */}
          {product.rating > 0 && !product.isWholesaleOnly && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-3 h-3 flex-shrink-0 ${
                    star <= Math.round(product.rating)
                      ? "fill-[#FFC107] text-[#FFC107]"
                      : "fill-gray-300 dark:fill-[#2B2F39] text-gray-300 dark:text-[#2B2F39]"
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-[11px] font-medium text-muted-foreground dark:text-[#94A3B8] ml-0.5">({product.reviewCount})</span>
            </div>
          )}

          {/* 3. Credit text */}
          {product.allowCredit && inStock && !isStoreClosed && (
            <span className="text-[10px] text-primary font-bold whitespace-nowrap truncate">
              {monthlyText}
            </span>
          )}

          {/* 4. Wholesale details */}
          {product.isWholesaleOnly && (
            <>
              {product.wholesalePrice && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
                  W: {format(product.wholesalePrice)}
                </span>
              )}
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 whitespace-nowrap">
                <Package className="w-2.5 h-2.5" />
                Min {product.wholesaleMoq || 1}pc
              </span>
            </>
          )}
        </div>

        {/* Store Closed Status — Detailed Box */}
        {isStoreClosed && (
          <div className="bg-secondary/50 border border-border rounded-xl shadow-sm overflow-hidden h-[40px] grid grid-cols-[30px_1fr_50px] items-center mb-1.5">
            {/* Left: Icon */}
            <div className="flex justify-center border-r border-border h-full items-center">
              <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center">
                <Clock className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
              </div>
            </div>

            {/* Middle: Status & Hours */}
            <div className="flex flex-col justify-center px-1.5 min-w-0">
              <span className="text-[7px] font-black text-destructive leading-none mb-0.5 uppercase tracking-tighter whitespace-nowrap">CLOSED NOW</span>
              <div className="flex flex-col whitespace-nowrap overflow-hidden">
                <span className="text-[6px] font-bold text-foreground leading-none mb-0.5 truncate">{storeStatus?.operatingDays}</span>
                <span className="text-[6px] font-medium text-muted-foreground leading-none truncate">{storeStatus?.openingTime} - {storeStatus?.closingTime}</span>
              </div>
            </div>

            {/* Right: Next Opening */}
            <div className="flex flex-col items-end justify-center border-l border-border pr-1.5 h-full">
              <span className="text-[8px] font-black text-primary leading-none mb-0.5 whitespace-nowrap">{storeStatus?.nextOpeningTime}</span>
              <span className="text-[6px] font-bold text-muted-foreground leading-none whitespace-nowrap">{storeStatus?.nextOpeningDay}</span>
            </div>
          </div>
        )}

        {/* Buttons — only show if NOT store closed, or if we want a different UI */}
        {!isStoreClosed && (
          <div className="flex items-center gap-1.5 mt-auto pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!inStock) return;
                addToCart({ id: product.id, name: product.name, price: product.price, qty: 1, image: product.image });
                toast.success("Added to cart", { description: product.name });
              }}
              disabled={!inStock}
              className={`w-8 h-7 flex items-center justify-center border rounded-lg flex-shrink-0 transition-colors ${
                inStock
                  ? "border-primary text-primary hover:bg-primary/10 cursor-pointer"
                  : "border-border text-muted-foreground opacity-40 cursor-not-allowed"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/product/${product.id}`;
              }}
              disabled={!inStock}
              className={`flex-1 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
                inStock
                  ? "bg-primary text-white hover:bg-primary/90 cursor-pointer"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              <Zap className="w-3 h-3" />
              {product.allowCredit ? "Get Now" : "Buy Now"}
            </button>
          </div>
        )}
        
        {isStoreClosed && (
          <div className="mt-auto pt-1">
             <button
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/product/${product.id}`;
              }}
              className="w-full h-7 rounded-lg text-[10px] font-bold flex items-center justify-center bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              View Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
