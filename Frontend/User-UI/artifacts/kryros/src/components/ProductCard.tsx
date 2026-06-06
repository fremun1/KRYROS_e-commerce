// ProductCard.tsx — unified wrapper for backward compatibility
// All product sections now use UnifiedProductCard directly
import UnifiedProductCard from "@/components/UnifiedProductCard";
import type { Product } from "@/lib/api";

interface ProductCardProps {
  product: Product;
  index?: number;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  return <UnifiedProductCard product={product} className={className ?? "w-full"} />;
}
