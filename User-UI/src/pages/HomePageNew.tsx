import { useState, useEffect } from 'react';
import { fetchPageSections } from '@/lib/api';
import DynamicSectionRenderer, { DynamicSection } from '@/components/home/DynamicSectionRenderer';
import NewsletterPopup from '@/components/NewsletterPopup';

/**
 * HomePageNew
 * 
 * Refactored homepage that dynamically renders sections from the CMS.
 * Instead of hardcoding section components, this page fetches section
 * configurations from the backend and renders them using DynamicSectionRenderer.
 * 
 * This approach allows admins to:
 * - Add/remove sections without code changes
 * - Reorder sections via drag-and-drop
 * - Configure each section's behavior and appearance
 * - Enable/disable sections without deployment
 */
export default function HomePageNew() {
  const [sections, setSections] = useState<DynamicSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSections = async () => {
      try {
        setLoading(true);
        const data = await fetchPageSections('home');
        // Filter to only active sections and sort by order
        const activeSections = (data || [])
          .filter((s: any) => s.isActive !== false)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setSections(activeSections);
        setError(null);
      } catch (err) {
        console.error('Failed to load sections:', err);
        setError('Failed to load page content');
        setSections([]);
      } finally {
        setLoading(false);
      }
    };

    loadSections();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading page...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Newsletter popup */}
      <NewsletterPopup />

      {/* Dynamic sections */}
      {sections.length > 0 ? (
        sections.map((section) => (
          <DynamicSectionRenderer key={section.id} section={section} />
        ))
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-muted-foreground">
            <p>No sections configured for this page yet.</p>
            <p className="text-sm mt-2">Visit the admin panel to add sections.</p>
          </div>
        </div>
      )}
    </div>
  );
}
