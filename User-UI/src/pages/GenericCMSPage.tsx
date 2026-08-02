import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api';
import DynamicSectionRendererV2 from '@/components/home/DynamicSectionRendererV2';

type Section = {
  id: string;
  type?: string;
  templateType?: string;
  name?: string;
  title?: string;
  subtitle?: string;
  config?: Record<string, any>;
  order: number;
  isActive: boolean;
};

export default function GenericCMSPage({ slug, title }: { slug: string; title: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSections = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/cms/sections?pageSlug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || []);
        const active = list
          .filter((s: any) => s.isActive !== false)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setSections(active);
      } catch (err) {
        console.error(`Error fetching ${slug} sections:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load sections');
        setSections([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSections();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5 pb-6">
        <div className="w-full h-48 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5 pb-6">
        <h1 className="text-2xl font-black mb-2">{title}</h1>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {sections.length === 0 ? (
        <div className="max-w-2xl mx-auto px-4 py-5 pb-6">
          <h1 className="text-2xl font-black mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground">This page has no content configured yet.</p>
        </div>
      ) : (
        <DynamicSectionRendererV2 sections={sections} pageSlug={slug} />
      )}
    </div>
  );
}
