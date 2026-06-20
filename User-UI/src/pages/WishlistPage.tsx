import { useEffect, useState } from "react";
import { Link } from "wouter";
import { PackageSearch } from "lucide-react";
import { useWishlistStore } from "@/store/wishlistStore";
import { useAuthStore } from "@/store/authStore";
import { API_BASE } from "@/lib/api";
import type { Product } from "@/lib/api";
import AccountLayout from "@/components/layout/AccountLayout";
import UnifiedProductCard from "@/components/UnifiedProductCard";

interface WishlistProduct {
  id: string;
  name: string;
  price: number;
  comparePrice?: number;
  images: { url: string; isPrimary: boolean }[];
  slug?: string;
}

interface ApiWishlistItem {
  id: string;
  productId: string;
  product: WishlistProduct;
}

function getImage(p: WishlistProduct): string {
  const primary = p.images?.find((i) => i.isPrimary);
  return (
    primary?.url ??
    p.images?.[0]?.url ??
    "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80"
  );
}

/** Map wishlist product shape → UnifiedProductCard Product shape */
function adaptProduct(p: WishlistProduct): Product {
  const discount =
    p.comparePrice && p.comparePrice > p.price
      ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
      : 0;
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    oldPrice: p.comparePrice ?? p.price,
    discount,
    image: getImage(p),
    stock: 1,
    rating: 0,
    reviewCount: 0,
    isWholesaleOnly: false,
    allowCredit: false,
    specs: "",
    creditMessage: "",
    wholesalePrice: 0,
    wholesaleMoq: 0,
    slug: p.slug ?? p.id,
  } as Product;
}

export default function WishlistPage() {
  const { items: wishlistIds, _hasHydrated } = useWishlistStore();
  const { token } = useAuthStore();

  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [apiWishlistIds, setApiWishlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!token;

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      fetch(`${API_BASE}/api/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          const list: ApiWishlistItem[] = Array.isArray(data) ? data : [];
          setApiWishlistIds(list.map((item) => item.productId ?? item.id));
          setProducts(list.map((item) => item.product).filter(Boolean));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      if (wishlistIds.length === 0) {
        setProducts([]);
        return;
      }
      setLoading(true);
      Promise.all(
        wishlistIds.map((id) =>
          fetch(`${API_BASE}/api/products/${id}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      )
        .then((results) => {
          setProducts(results.filter(Boolean) as WishlistProduct[]);
        })
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, token, wishlistIds.join(",")]);

  const activeIds = isAuthenticated ? apiWishlistIds : wishlistIds;

  const showSkeleton = isAuthenticated ? loading : !_hasHydrated;
  const isEmpty = isAuthenticated
    ? !loading && products.length === 0
    : _hasHydrated && wishlistIds.length === 0;

  return (
    <AccountLayout>
      <div className="max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground">My Wishlist</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeIds.length === 0
              ? "Your wishlist is empty"
              : `${activeIds.length} saved item${activeIds.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {showSkeleton ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl bg-muted animate-pulse h-64" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-5">
              <PackageSearch className="w-9 h-9 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-black text-foreground mb-2">Nothing saved yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Tap the heart icon on any product to save it here for later.
            </p>
            <Link href="/shop">
              <button className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors">
                Browse Products
              </button>
            </Link>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {(activeIds.length > 0 ? activeIds : [1, 2]).map((id) => (
              <div key={id} className="rounded-2xl bg-muted animate-pulse h-64" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {products.map((product) => (
              <UnifiedProductCard
                key={product.id}
                product={adaptProduct(product)}
                className="w-full"
              />
            ))}
          </div>
        )}

        {products.length > 0 && (
          <div className="mt-8 text-center">
            <Link href="/shop">
              <button className="px-6 py-3 border border-border text-foreground rounded-2xl font-bold text-sm hover:bg-muted transition-colors">
                Continue Shopping
              </button>
            </Link>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
