import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Heart, Package, Clock, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import type { Product } from "@/lib/api";
import { getCreditMessage, getProductDisplayPrice, getProductPurchaseMode, getCreditPaymentDetails } from "@/lib/productPurchaseMode";

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
  /** Whether to show the discount percentage badge. Defaults to true. */
  showDiscountBadge?: boolean;
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
  showDiscountBadge = true,
}: UnifiedProductCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const [, setLocation] = useLocation();
  const storeStatus = useStoreStatus();
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  const format = useCurrencyStore((s) => s.format);
  const wishlisted = isWishlisted(product.id);

  const purchaseMode = getProductPurchaseMode(product);
  const isCreditProduct = purchaseMode === "credit";
  const isWholesaleProduct = purchaseMode === "wholesale";
  const displayPrice = getProductDisplayPrice(product);
  const creditMessage = getCreditMessage(product);
  const creditPaymentDetails = getCreditPaymentDetails(product);
  const specs = validSpecs(product.specs);
  const inStock = product.stock > 0;
  const isStoreClosed = storeStatus?.isStoreClosed ?? false;
  const totalPriceLabel = isCreditProduct ? (
    <div className="mb-1">
      <span className="text-[9px] md:text-xs text-muted-foreground">
        Total: {format(product.price)}
      </span>
    </div>
  ) : null;

  return (
    <div
      className={`${className} bg-card border border-border rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow flex flex-col`}
      onClick={() => (setLocation(`/product/${product.id}`))}
    >
      {/*
       * ── .product-image-wrapper ──────────────────────────────────────────
       * Square 1:1 aspect ratio — compact, balanced; prevents layout shift (CLS) before
       * the image loads. overflow-hidden clips the hover zoom animation.
       * rounded-xl (12px) applies border-radius directly to this container.
       * The `group` class enables the child img's group-hover zoom target.
       */}
      <div className="relative group aspect-square rounded-xl overflow-hidden bg-muted">
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
                : "object-contain p-3 mix-blend-multiply"
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
        {showDiscountBadge && product.discount > 0 && (
          <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-lg z-10 shadow-sm">
            -{product.discount}%
          </span>
        )}
        {isWholesaleProduct && (
          <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-lg z-10">
            Wholesale
          </span>
        )}
        {badge && (
          <span className="absolute bottom-3 left-3 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-lg z-10">
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
          className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border-0 bg-transparent shadow-[0_8px_24px_rgba(15,23,42,0.14)] transition-all hover:scale-105 hover:shadow-[0_10px_28px_rgba(15,23,42,0.18)] active:scale-95 focus:outline-none md:h-8 md:w-8"
        >
          <Heart className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-colors ${wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
        </button>
      </div>

      {/* ── Info: Reduced padding to shorten height ── */}
      <div className="p-2 md:p-3 flex flex-col flex-1">

        {/* Name */}
        <h3 className="text-[11px] md:text-xs font-semibold md:font-bold text-foreground leading-tight line-clamp-1 mb-0.5">
          {product.name}
        </h3>

        {/* Specs */}
        {specs && (
          <p className="text-[9px] md:text-[11px] text-muted-foreground truncate mb-0.5">{specs}</p>
        )}

        {/* Price display */}
        {isCreditProduct ? (
          <div className="mb-0.5">
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-[9px] md:text-[10px] font-semibold text-primary uppercase tracking-wide">
                Deposit
              </span>
              <span className="text-[13px] md:text-[15px] font-bold text-foreground">
                {format(product.creditMinimum || 0)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center flex-wrap gap-x-1 mb-0.5">
            <span className="text-[13px] md:text-[15px] font-bold text-foreground">
              {format(displayPrice)}
            </span>
            {product.oldPrice > displayPrice && (
              <span className="text-[9px] md:text-xs text-muted-foreground line-through">{format(product.oldPrice)}</span>
            )}
          </div>
        )}

        {/* Product card labels, condition, then stars/reviews */}
        <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mb-1">
          {/* 1. Custom promo text from product form */}
          {!!product.popularItemText && !isWholesaleProduct && !isCreditProduct && (
            <span className="text-[9px] md:text-[10px] font-semibold tracking-[0.01em] text-primary bg-primary/10 px-2 md:px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 border border-primary/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              {product.popularItemText}
            </span>
          )}

          {/* 2. Condition badge */}
          {!!product.condition && !isWholesaleProduct && !isCreditProduct && (
            <span className="text-[9px] md:text-[10px] font-bold tracking-[0.01em] px-2.5 md:px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 shadow-sm" style={{ background:'var(--kryros-primary)', color:'var(--kryros-white-text)' }}>
              {product.condition}
            </span>
          )}

          {/* 3. Stars + review count */}
          {product.rating > 0 && !isWholesaleProduct && !isCreditProduct && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-3 h-3 flex-shrink-0 ${
                    star <= Math.round(product.rating)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-muted text-muted-foreground"
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-[11px] font-medium text-muted-foreground ml-0.5">({product.reviewCount})</span>
            </div>
          )}

          {/* 4. Credit details — show installment amount + duration on cards. */}
          {isCreditProduct && (
            <>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[9px] text-primary font-semibold flex items-center gap-0.5 whitespace-nowrap">
                  <Clock className="w-2.5 h-2.5" />
                  {format(creditPaymentDetails.installmentAmount)} / {creditPaymentDetails.intervalLabel}
                </span>
                <span className="text-[9px] text-primary font-semibold flex items-center gap-0.5 whitespace-nowrap">
                  <CalendarDays className="w-2.5 h-2.5" />
                  {creditPaymentDetails.period}
                </span>
              </div>
            </>
          )}

          {/* 5. Wholesale details */}
          {isWholesaleProduct && (
            <>
              {product.wholesalePrice && (
                <span className="text-[10px] text-primary font-semibold whitespace-nowrap">
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

        {totalPriceLabel}

        {/* Buttons — only show if NOT store closed */}
        {!isStoreClosed && (
          <div className="mt-auto pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/product/${product.id}`);
              }}
              disabled={!inStock}
              className={`w-full h-9 md:h-10 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center transition-colors ${
                inStock
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              SHOP NOW
            </button>
          </div>
        )}
        
        {isStoreClosed && (
          <div className="mt-auto pt-1">
             <button
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/product/${product.id}`);
              }}
              className="w-full h-7 rounded-lg text-[10px] font-bold flex items-center justify-center bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              Shop Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
