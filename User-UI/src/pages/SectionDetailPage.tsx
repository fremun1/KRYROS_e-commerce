import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { fetchHomepageSections, fetchPageSections, fetchProductsPage } from '@/lib/api';
import type { Product } from '@/lib/api';
import UnifiedProductCard from '@/components/UnifiedProductCard';
import { ChevronLeft } from 'lucide-react';

/**
 * SectionDetailPage
 * 
 * Displays all products for a specific section.
 * Accessed via /shop/{dedicatedPageSlug}
 * 
 * This page:
 * - Fetches the section configuration from CMS
 * - Applies the section's product filters
 * - Displays products in a paginated grid
 * - Provides breadcrumb navigation
 */
export default function SectionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [section, setSection] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const itemsPerPage = 12;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all sections for shop and homepage
        const [cmsSections, homepageSections] = await Promise.all([
          fetchPageSections('shop'),
          fetchHomepageSections(),
        ]);
        const allSections = [...(cmsSections || []), ...(homepageSections || [])];
        
        // Find section matching the slug
        const matchedSection = allSections?.find(
          (s: any) =>
            s.dedicatedPageSlug === slug ||
            s.config?.sectionSlug === slug ||
            s.id === slug ||
            (slug === "flash-sale" && s.type === "FlashSale")
        );

        if (!matchedSection) {
          setError('Section not found');
          setSection(null);
          setProducts([]);
          return;
        }

        setSection(matchedSection);

        // Build product query params based on section config
        const params: any = {
          skip: (page - 1) * itemsPerPage,
          take: itemsPerPage,
        };

        // Apply section-specific filters
        const config = matchedSection.config || {};
        
        // Spread all config values first (handles categoryId, categorySlug, popularity, etc.)
        Object.assign(params, config);

        // Normalize filterType to query params
        if (config.filterType === 'Featured' || config.filter_by === 'Featured') {
          params.featured = true;
        } else if (config.filterType === 'Best Selling') {
          params.popularity = 'bestseller';
        } else if (config.filterType === 'New Arrivals') {
          params.popularity = 'new';
        } else if (config.filterType === 'Trending') {
          params.popularity = 'trending';
        }

        // Handle special section types
        const sType = matchedSection.type || '';
        if (sType === 'FlashSale' || config.isFlashSale === true || config.isFlashSale === 'true') {
          params.isFlashSale = true;
        } else if (sType === 'TopSelling' || sType === 'BestSellers') {
          if (!params.popularity) params.popularity = 'bestseller';
        } else if (sType === 'Trending') {
          if (!params.popularity) params.popularity = 'trending';
        } else if (sType === 'NewestArrivals') {
          if (!params.popularity) params.popularity = 'new';
        } else if (sType === 'FeaturedProducts') {
          params.featured = true;
        }

        const result = await fetchProductsPage(params);
        setProducts(result.data || []);
        setTotal(Number(result.meta?.total || result.data?.length || 0));
      } catch (err) {
        console.error('Failed to load section:', err);
        setError('Failed to load section');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug, page]);

  const totalPages = Math.ceil(total / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading section...</p>
        </div>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Section not found'}</p>
          <a href="/shop" className="inline-flex items-center gap-2 text-primary hover:underline">
            <ChevronLeft className="w-4 h-4" />
            Back to Shop
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Home</a>
        <span>/</span>
        <a href="/shop" className="hover:text-foreground">Shop</a>
        <span>/</span>
        <span className="text-foreground">{section.title || section.name}</span>
      </div>

      {/* Section Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{section.title || section.name}</h1>
        {section.subtitle && (
          <p className="text-lg text-muted-foreground">{section.subtitle}</p>
        )}
        {section.description && (
          <p className="text-muted-foreground mt-2">{section.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-4">
          Showing {products.length > 0 ? (page - 1) * itemsPerPage + 1 : 0} to {Math.min(page * itemsPerPage, total)} of {total} products
        </p>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {products.map((product) => (
              <div key={product.id}>
                <UnifiedProductCard product={product} className="w-full" />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-2 rounded-lg ${
                    page === p
                      ? 'bg-primary text-white'
                      : 'border hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No products found in this section.</p>
        </div>
      )}

      {/* Back to Shop */}
      <div className="mt-8 text-center">
        <a href="/shop" className="inline-flex items-center gap-2 text-primary hover:underline">
          <ChevronLeft className="w-4 h-4" />
          Back to Shop
        </a>
      </div>
    </div>
  );
}
