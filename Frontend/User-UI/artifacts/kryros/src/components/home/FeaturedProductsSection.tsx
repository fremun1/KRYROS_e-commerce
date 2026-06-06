import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { fetchProducts, fetchFlashSaleProducts } from "@/lib/api";
import type { Product } from "@/lib/api";
import UnifiedProductCard from "@/components/UnifiedProductCard";

const TABS = [
  { id: "flash",      label: "Flash Deals"  },
  { id: "trending",   label: "Trending"     },
  { id: "bestseller", label: "Best Sellers" },
  { id: "new",        label: "New Arrivals" },
];

const TAB_BADGE: Record<string, string | undefined> = {
  trending:   "🔥 Trending",
  bestseller: "⭐ Best Seller",
  new:        "✨ New",
};

export default function FeaturedProductsSection() {
  const [activeTab, setActiveTab] = useState("flash");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    let req: Promise<Product[]>;
    if (activeTab === "flash") {
      req = fetchFlashSaleProducts();
    } else if (activeTab === "trending") {
      req = fetchProducts({ popularity: "trending", take: 8 });
    } else if (activeTab === "bestseller") {
      req = fetchProducts({ popularity: "bestseller", take: 8 });
    } else {
      req = fetchProducts({ popularity: "new", take: 8 });
    }
    req.then((data) => {
      setProducts(data.slice(0, 8));
      setLoading(false);
    });
  }, [activeTab]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 mb-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-foreground">Featured Products</h2>
        <Link href="/shop">
          <span className="flex items-center gap-0.5 text-[11px] font-semibold whitespace-nowrap" style={{ color: "var(--kryros-primary)" }}>
            View All <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {/* Tab pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              activeTab === t.id
                ? "text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
            style={activeTab === t.id ? { background: "var(--kryros-primary)" } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Product cards — horizontal scroll, unified style */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {products.map((p) => (
          <UnifiedProductCard
            key={p.id}
            product={p}
            className="flex-shrink-0 w-[calc(50vw-16px)]"
            badge={TAB_BADGE[activeTab]}
          />
        ))}
      </div>
    </section>
  );
}
