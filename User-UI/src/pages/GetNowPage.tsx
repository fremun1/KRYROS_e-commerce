import { useEffect, useState } from "react";
import { EFFECTIVE_API_BASE } from "@/lib/api";
import type { ApiCMSSection } from "@/lib/api";
import DynamicSectionRendererV2 from "@/components/home/DynamicSectionRendererV2";

import ErrorBoundary from "@/components/ErrorBoundary";

export default function GetNowPage() {
  const [sections, setSections] = useState<ApiCMSSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSections = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${EFFECTIVE_API_BASE}/api/cms/sections?pageSlug=get-now`,
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
      } catch (err) {
        console.error("Error fetching Get Now sections:", err);
        setError(err instanceof Error ? err.message : "Failed to load sections");
        setSections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  return (
    <ErrorBoundary pageName="Get Now">
      <div className="max-w-7xl mx-auto pb-6 md:pb-10">
        <div className="px-4 md:px-6 py-8 border-b border-border mb-6">
          <h1 className="text-3xl md:text-4xl font-black text-foreground">Get Now</h1>
          <p className="text-base text-muted-foreground mt-3 max-w-2xl">
            Buy now, pay in easy installments. Simple. Flexible. Hassle-free.
          </p>
        </div>

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

          {error && !loading && (
            <div className="px-4 md:px-6 py-12">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-red-800">Error Loading Sections</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {!loading && sections.length === 0 && !error && (
            <div className="px-4 md:px-6 py-12">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-blue-800">Get Now Not Configured</p>
                <p className="text-sm text-blue-700 mt-1">
                  Go to the Admin Panel → CMS → Get Now Page to configure sections.
                </p>
              </div>
            </div>
          )}

          {!loading && sections.length > 0 && (
            <DynamicSectionRendererV2 sections={sections} pageSlug="get-now" />
          )}
      </div>
    </ErrorBoundary>
  );
}
