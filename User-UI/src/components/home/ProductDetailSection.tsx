import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import ProductShelf from "./ProductShelf";

interface ProductDetailSectionProps {
  title?: string;
  subtitle?: string;
  layout?: 'gallery' | 'related-products';
  productId?: string;
  limit?: number;
  images?: string[];
}

export default function ProductDetailSection({
  title,
  subtitle,
  layout = 'related-products',
  productId,
  limit = 6,
  images,
}: ProductDetailSectionProps) {

  // ── GALLERY LAYOUT ──
  if (layout === 'gallery') {
    const galleryImages = images || [];
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h3 className="text-lg font-bold mb-4">{title || 'Gallery'}</h3>
        {galleryImages.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {galleryImages.map((img, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-muted rounded-xl" />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── RELATED PRODUCTS LAYOUT ──
  return (
    <ProductShelf
      key={`related-${productId || 'default'}`}
      title={title || 'You May Also Like'}
      subtitle={subtitle}
      dataSourceId="top-selling"
      limit={limit}
      layout="horizontal-scroll"
      viewAllHref="/shop"
      viewAllText="View All"
    />
  );
}
