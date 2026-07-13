import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import type { ApiCMSSection } from "@/lib/api";
import DynamicSectionRendererV2 from "@/components/home/DynamicSectionRendererV2";

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
  const [sections, setSections] = useState<ApiCMSSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSections = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all sections for the shop page from the CMS API
        console.log('[ShopPage] Fetching sections with pageSlug=shop');
        const response = await fetch(
          `${API_BASE}/api/cms/sections?pageSlug=shop`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch sections: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[ShopPage] Sections response:', data);

        // Handle both array and { data } response formats
        const sectionList = Array.isArray(data) ? data : (data.data || []);
        console.log('[ShopPage] Section list:', sectionList);

        // Filter active sections and sort by order
        const activeSections = sectionList
          .filter((s: any) => s.isActive !== false)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        console.log('[ShopPage] Active sections:', activeSections);
        setSections(activeSections);
      } catch (err) {
        console.error("[ShopPage] Error fetching shop sections:", err);
        setError(err instanceof Error ? err.message : "Failed to load sections");
        setSections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  return (
    <div className="pb-24 md:pb-10 max-w-7xl mx-auto">
      {/* Loading state */}
      {loading && (
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

      {/* Error state */}
      {error && !loading && (
        <div className="px-4 md:px-6 py-12">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-red-800">Error Loading Sections</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && sections.length === 0 && !error && (
        <div className="px-4 md:px-6 py-12">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-blue-800">Shop Not Configured</p>
            <p className="text-sm text-blue-700 mt-1">
              Go to the Admin Panel → CMS → Shop Page to configure sections.
            </p>
          </div>
        </div>
      )}

      {/* Render all sections dynamically */}
      {!loading && sections.length > 0 && (
        <DynamicSectionRendererV2 sections={sections} pageSlug="shop" />
      )}
    </div>
  );
}
