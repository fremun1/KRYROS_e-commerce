import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { EFFECTIVE_API_BASE, fetchProductsPage } from "@/lib/api";
import type { ApiCMSSection, Product } from "@/lib/api";
import DynamicSectionRendererV2 from "@/components/home/DynamicSectionRendererV2";
import UnifiedProductCard from "@/components/UnifiedProductCard";

/**
 * ShopPage.tsx - Fully Dynamic Shop Page
 * 
 * This page now fetches all sections from the CMS API and renders them dynamically.
 * No hardcoded sections remain. All sections are driven by database configuration.
 * 
 * The DynamicSectionRendererV2 component handles:
 * - ProductShelf sections (product listings by category, popularity, etc.)
 * - CategoryGridShelf sections (category carousels)
 * - BrandsSection sections (brand displays)
 * - ContentSection sections (Rich text, FAQ, Contact forms, etc.)
 * - Legacy section types (for backward compatibility)
 * 
 * Sections are sorted by the `order` field and displayed in that sequence.
 */

export default function ShopPage() {
  const [location] = useLocation();
  const [sections, setSections] = useState<ApiCMSSection[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("kryros_sections_shop");
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error("Error reading shop cache:", err);
      }
    }
    return [];
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("kryros_sections_shop");
        if (cached) {
          return false; // Skip loading if we have cached data for instant load
        }
      } catch (_) {}
    }
    return true;
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchQuery = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("search")?.trim() ?? "";
  }, [location]);

  const isSearching = searchQuery.length > 0;

  useEffect(() => {
    const fetchSections = async () => {
      if (sections.length === 0) {
        setSectionsLoading(true);
      }
      setSectionsError(null);

      try {
        const response = await fetch(
          `${EFFECTIVE_API_BASE}/api/cms/sections?pageSlug=shop`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch sections: ${response.statusText}`);
        }

        const data = await response.json();

        const sectionList = Array.isArray(data) ? data : (data.data || []);

        const activeSections = sectionList
          .filter((s: any) => s.isActive !== false)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        setSections(activeSections);
        try {
          localStorage.setItem("kryros_sections_shop", JSON.stringify(activeSections));
        } catch (cacheErr) {
          console.error("Error saving shop cache:", cacheErr);
        }
      } catch (err) {
        console.error("Error fetching shop sections:", err);
        if (sections.length === 0) {
          setSectionsError(err instanceof Error ? err.message : "Failed to load sections");
          setSections([]);
        }
      } finally {
        setSectionsLoading(false);
      }
    };

    fetchSections();
  }, []);

  useEffect(() => {
    if (!isSearching) {
      setProducts([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;

    const fetchSearchResults = async () => {
      setSearchLoading(true);
      setSearchError(null);

      try {
        const result = await fetchProductsPage({ search: searchQuery, take: 24, skip: 0 });
        if (cancelled) return;
        setProducts(result.data);
      } catch (err) {
        if (cancelled) return;
        setSearchError(err instanceof Error ? err.message : "Failed to load search results");
        setProducts([]);
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    };

    fetchSearchResults();

    return () => {
      cancelled = true;
    };
  }, [isSearching, searchQuery]);

  return (
    <div className="pb-6 md:pb-10 max-w-7xl mx-auto">
      {isSearching && (
        <div className="px-4 md:px-6 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">Search results</h1>
              <p className="text-sm text-muted-foreground">
                Results for &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          </div>

          {searchLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[0.78] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {searchError && !searchLoading && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm font-semibold text-red-800">Search Error</p>
              <p className="text-sm text-red-700 mt-1">{searchError}</p>
            </div>
          )}

          {!searchLoading && !searchError && products.length === 0 && (
            <div className="bg-muted/40 border border-border rounded-2xl p-6 text-center">
              <p className="text-sm font-semibold text-foreground">No products found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try a different product name, brand, or category.
              </p>
            </div>
          )}

          {!searchLoading && !searchError && products.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {products.length} product{products.length === 1 ? "" : "s"} found
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map((product) => (
                  <UnifiedProductCard
                    key={product.id}
                    product={product}
                    className="w-full"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!isSearching && sectionsLoading && (
        <div className="px-4 md:px-6 py-12">
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-full h-64 bg-muted rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {!isSearching && sectionsError && !sectionsLoading && (
        <div className="px-4 md:px-6 py-12">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-red-800">Error Loading Sections</p>
            <p className="text-sm text-red-700 mt-1">{sectionsError}</p>
          </div>
        </div>
      )}

      {!isSearching && !sectionsLoading && sections.length === 0 && !sectionsError && (
        <div className="px-4 md:px-6 py-12">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-blue-800">Shop Not Configured</p>
            <p className="text-sm text-blue-700 mt-1">
              Go to the Admin Panel → CMS → Shop Page to configure sections.
            </p>
          </div>
        </div>
      )}

      {!isSearching && !sectionsLoading && sections.length > 0 && (
        <DynamicSectionRendererV2 sections={sections} pageSlug="shop" />
      )}
    </div>
  );
}
