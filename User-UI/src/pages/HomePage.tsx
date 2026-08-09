import { useEffect, useState } from "react";
import { EFFECTIVE_API_BASE } from "@/lib/api";
import type { ApiCMSSection } from "@/lib/api";
import DynamicSectionRendererV2 from "@/components/home/DynamicSectionRendererV2";
import NewsletterPopup from "@/components/NewsletterPopup";

/**
 * HomePage.tsx - Fully Dynamic Home Page
 * 
 * This page now fetches all sections from the CMS API and renders them dynamically.
 * No hardcoded sections remain. All sections are driven by database configuration.
 * 
 * The DynamicSectionRendererV2 component handles:
 * - ProductShelf sections (Top Selling, Trending, New Arrivals, etc.)
 * - CategoryGridShelf sections (Category displays)
 * - BrandsSection sections (Brand displays)
 * - ContentSection sections (Rich text, FAQ, Contact forms, etc.)
 * - Legacy section types (for backward compatibility)
 * 
 * Sections are sorted by the `order` field and displayed in that sequence.
 */

export default function HomePage() {
  const [sections, setSections] = useState<ApiCMSSection[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("kryros_sections_homepage");
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error("Error reading homepage cache:", err);
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("kryros_sections_homepage");
        if (cached) {
          return false; // Skip showing skeleton if we have cached data for instant load
        }
      } catch (_) {}
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchSections = async () => {
      // If we don't have any cached sections, show the loading skeleton
      if (sections.length === 0) {
        setLoading(true);
      }
      setError(null);

      try {
        // Fetch all sections for the homepage from the CMS API
        const response = await fetch(
          `${EFFECTIVE_API_BASE}/api/cms/sections?pageSlug=homepage`,
          { 
            cache: "no-store",
            signal: controller.signal 
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch sections: ${response.statusText}`);
        }

        const data = await response.json();

        // Handle both array and { data } response formats
        const sectionList = Array.isArray(data) ? data : (data.data || []);

        // Filter active sections and sort by order
        const activeSections = sectionList
          .filter((s: any) => s.isActive !== false)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        setSections(activeSections);
        try {
          localStorage.setItem("kryros_sections_homepage", JSON.stringify(activeSections));
        } catch (cacheErr) {
          console.error("Error saving homepage cache:", cacheErr);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error("Error fetching homepage sections:", err);
        // Only show a giant blocking error if we don't have cached sections to show
        if (sections.length === 0) {
          setError(err instanceof Error ? err.message : "Failed to load sections");
          setSections([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
    return () => controller.abort();
  }, []);

  return (
    <div>
      {/* Newsletter popup */}
      <NewsletterPopup />

      {/* Loading state */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
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
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-red-800">Error Loading Sections</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && sections.length === 0 && !error && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-blue-800">No Sections Configured</p>
            <p className="text-sm text-blue-700 mt-1">
              Go to the Admin Panel → CMS → Home Page to configure sections.
            </p>
          </div>
        </div>
      )}

      {/* Render all sections dynamically */}
      {!loading && sections.length > 0 && (
        <DynamicSectionRendererV2 sections={sections} pageSlug="homepage" />
      )}
    </div>
  );
}
