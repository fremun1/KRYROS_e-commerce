import { Link } from "wouter";
import { Clock, ChevronRight } from "lucide-react";
import { useRecentlyViewedStore } from "@/store/recentlyViewedStore";
import UnifiedProductCard from "@/components/UnifiedProductCard";

export default function RecentlyViewedSection() {
  const { items, clear } = useRecentlyViewedStore();

  if (items.length === 0) return null;

  return (
    <section className="py-4 md:py-6">
      <div className="px-3 md:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-base md:text-xl font-black text-foreground">Recently Viewed</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clear}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Clear
            </button>
            <Link href="/shop">
              <span className="text-xs md:text-sm text-primary font-semibold cursor-pointer hover:underline flex items-center gap-0.5 whitespace-nowrap">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:overflow-visible">
          {items.map((product) => (
            <UnifiedProductCard
              key={product.id}
              product={product}
              className="flex-shrink-0 w-[calc(50vw-16px)] md:w-full"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
