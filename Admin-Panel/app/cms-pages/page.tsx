'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import CloudinaryUpload from '@/components/ui/file-upload';
import { useTheme } from '@/contexts/theme-context';
import {
  Plus, Edit, Trash2, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown,
  Zap, ShoppingBag, Users, TrendingUp, Layout, MousePointer, Info, Image
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  getCmsSections, 
  createCmsSection, 
  updateCmsSection, 
  deleteCmsSection, 
  reorderCmsSections,
  getSectionRulesMetadataGrouped,
  moveCmsSection,
  getCmsPages
} from '@/lib/api';

// Reusable template icons mapping
const TEMPLATE_ICONS: Record<string, any> = {
  ProductShelf: ShoppingBag,
  BrandGrid: Users,
  FlashSale: Zap,
  BannerCarousel: Image,
  CategorySection: Layout,
  Custom: Info
};

const VIDEO_URL_REGEX = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i;

const isVideoMedia = (value?: string) =>
  Boolean(value) && (VIDEO_URL_REGEX.test(value || '') || value?.includes('/video/upload/'));

const getSlideMediaUrl = (slide: any) => slide?.videoUrl || slide?.image || '';

const updateSlideMedia = (slide: any, url: string, filename?: string) => {
  if (!url) {
    return {
      ...slide,
      image: '',
      videoUrl: '',
    };
  }

  const source = filename || url;
  if (isVideoMedia(source)) {
    return {
      ...slide,
      image: '',
      videoUrl: url,
    };
  }

  return {
    ...slide,
    image: url,
    videoUrl: '',
  };
};



export default function CMSPagesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#0D1523' : '#FFFFFF';
  
  const [sections, setSections] = useState<any[]>([]);
  const [rulesGrouped, setRulesGrouped] = useState<Record<string, any[]>>({});
  const [pages, setPages] = useState<{ value: string; label: string }[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [view, setView] = useState<'page-list' | 'page-sections'>('page-list');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [editingSection, setEditingSection] = useState<any>(null);

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (selectedPage && view === 'page-sections') {
      fetchSections();
      fetchRules();
    }
  }, [selectedPage, view]);

  const fetchPages = async () => {
    try {
      const response = await getCmsPages();
      const list = Array.isArray(response.data) ? response.data : (response.data as any)?.data || [];
      const mapped = list.map((p: any) => ({ value: p.slug, label: p.title || p.slug }));
      setPages(mapped);
    } catch {
      toast.error('Failed to load pages');
    }
  };

  const handleSelectPage = (pageSlug: string) => {
    setSelectedPage(pageSlug);
    setView('page-sections');
  };

  const handleBackToPages = () => {
    setView('page-list');
    setSelectedPage('');
    setSections([]);
  };

  // Normalize pageSlug: admin uses 'home' but backend stores as 'homepage'
  const normalizePageSlug = (slug: string) => {
    if (slug === 'home' || slug === '/' || slug === '') return 'homepage';
    return slug;
  };

  const fetchSections = async () => {
    try {
      setLoading(true);
      const normalizedSlug = normalizePageSlug(selectedPage);
      console.log('[CMS] Fetching sections for page:', selectedPage, 'Normalized:', normalizedSlug);
      const response = await getCmsSections(normalizedSlug);
      console.log('[CMS] Sections response:', response.data);
      setSections(response.data || []);
    } catch (error) {
      console.error('[CMS] Failed to load sections:', error);
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const response = await getSectionRulesMetadataGrouped();
      setRulesGrouped(response.data || {});
    } catch (error) {
      console.error('Failed to load rules', error);
    }
  };

  const handleAddSection = () => {
    setEditingSection(null);
    setFormData({
      pageSlug: selectedPage,
      isActive: true,
      order: sections.length,
      config: { limit: 8, layout: 'horizontal-scroll' }
    });
    setShowTypeSelector(true);
  };

  const handleSelectRule = (rule: any) => {
    setFormData({
      ...formData,
      templateType: rule.templateType,
      type: rule.templateType, // Backward compatibility
      dataSourceId: rule.id,
      title: rule.label,
      name: rule.label,
      config: { 
        ...formData.config,
        limit: (rule.templateType === 'CategorySection' || rule.templateType === 'ProductShelf' || rule.templateType === 'BrandGrid') ? 8 : undefined,
        slides: rule.templateType === 'BannerCarousel' ? [] : undefined,
        autoplay: rule.templateType === 'BannerCarousel' ? true : undefined,
        layout: rule.templateType === 'CategorySection' ? 'grid' : (rule.templateType === 'ProductShelf' ? 'horizontal-scroll' : undefined)
      }
    });
    setShowTypeSelector(false);
    setShowModal(true);
  };

  const handleEditSection = (section: any) => {
    setEditingSection(section);
    setFormData({ ...section });
    setShowModal(true);
  };

  const handleSaveSection = async () => {
    try {
      setSaving(true);
      const payload = {
        ...formData,
        pageSlug: normalizePageSlug(selectedPage)
      };
      console.log('[CMS] Saving section with payload:', payload);
      console.log('[CMS] Selected page:', selectedPage, 'Normalized:', normalizePageSlug(selectedPage));
      
      if (editingSection) {
        await updateCmsSection(editingSection.id, payload);
        toast.success('Section updated');
      } else {
        const response = await createCmsSection(payload);
        console.log('[CMS] Create section response:', response.data);
        toast.success('Section created');
      }
      setShowModal(false);
      fetchSections();
    } catch (error) {
      console.error('[CMS] Failed to save section:', error);
      toast.error('Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Delete this section? This cannot be undone.')) return;
    try {
      await deleteCmsSection(id);
      toast.success('Section deleted successfully');
      fetchSections();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete section');
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    try {
      const normalizedSlug = normalizePageSlug(selectedPage);
      await moveCmsSection(id, direction, normalizedSlug);
      fetchSections();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to move section');
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {view === 'page-list' ? (
          <>
            <PageHeader
              title="Pages"
              subtitle="Select a page to manage its sections"
              icon={Layout}
            />
            <div className="grid gap-4">
              {pages.length === 0 ? (
                <div className="text-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed">
                  <Layout className="mx-auto w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No pages configured yet.</p>
                </div>
              ) : (
                pages.map(page => (
                  <button
                    key={page.value}
                    onClick={() => handleSelectPage(page.value)}
                    className="flex items-center justify-between p-5 bg-card border rounded-2xl hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <Layout size={26} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-lg">{page.label}</h3>
                        <p className="text-sm text-muted-foreground">Click to manage sections • Drag & drop ordering</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">Manage →</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <button
                    onClick={handleBackToPages}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition"
                  >
                    <ChevronDown size={14} className="rotate-90" />
                    All Pages
                  </button>
                  <span className="text-muted-foreground">/</span>
                  <h1 className="text-2xl font-bold">{pages.find((p: any) => p.value === selectedPage)?.label || 'Page Sections'}</h1>
                </div>
                <p className="text-muted-foreground text-sm ml-1">{sections.length} section{sections.length !== 1 ? 's' : ''} • Drag to reorder</p>
              </div>
              <button
                onClick={handleAddSection}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition shadow-lg shadow-primary/20 active:scale-95"
              >
                <Plus size={18} />
                Add Section
              </button>
            </div>

            {/* Active Sections List */}
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
              ) : sections.length === 0 ? (
                <div className="text-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed">
                  <Layout className="mx-auto w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No sections configured for this page.</p>
                  <button onClick={handleAddSection} className="mt-4 text-primary font-bold hover:underline">Add your first section</button>
                </div>
              ) : (
                sections.map((section, index) => {
                  const Icon = TEMPLATE_ICONS[section.templateType || section.type] || Info;
                  return (
                    <div key={section.id} className="group flex items-center gap-4 p-4 bg-card border rounded-2xl hover:border-primary/50 hover:shadow-md transition-all">
                      {/* Always-visible reorder controls */}
                      <div className="flex flex-col gap-0.5">
                        <button 
                          onClick={() => handleMove(section.id, 'up')} 
                          disabled={index === 0} 
                          title="Move up" 
                          className="p-1 hover:bg-muted rounded disabled:opacity-25 transition"
                        ><ChevronUp size={14} /></button>
                        <button 
                          onClick={() => handleMove(section.id, 'down')} 
                          disabled={index === sections.length - 1} 
                          title="Move down" 
                          className="p-1 hover:bg-muted rounded disabled:opacity-25 transition"
                        ><ChevronDown size={14} /></button>
                      </div>
                      
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${section.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Icon size={24} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg truncate">{section.title || 'Untitled Section'}</h3>
                          {!section.isActive && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-bold uppercase">Hidden</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                          <span className="bg-muted px-2 py-0.5 rounded">
                            {({'BrandGrid':'Brand Section','BannerCarousel':'Banner Carousel','CategorySection':'Category Section','ProductShelf':'Product Shelf'} as Record<string,string>)[section.templateType||section.type||'']||(section.templateType||section.type)}
                          </span>
                          {section.templateType !== 'BrandGrid' && section.templateType !== 'CategorySection' && (
                            <span>Source: <span className="text-foreground">{section.dataSourceId || section.slotKey || 'Custom'}</span></span>
                          )}
                        </div>
                      </div>

                      {/* Always-visible edit & delete buttons */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEditSection(section)} 
                          className="p-2.5 hover:bg-blue-50 text-blue-600 rounded-xl transition" 
                          title="Edit section"
                        ><Edit size={18} /></button>
                        <button 
                          onClick={() => handleDeleteSection(section.id)} 
                          className="p-2.5 hover:bg-red-50 text-red-600 rounded-xl transition" 
                          title="Delete section"
                        ><Trash2 size={18} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Type Selector Modal */}
      {showTypeSelector && (
        <Modal open={showTypeSelector} onClose={() => setShowTypeSelector(false)} title="Add New Section">
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {Object.entries(rulesGrouped).map(([category, rules]) => {
              // Filter out the messy individual product rules if it's the 'products' category
              const displayRules = category === 'products' 
                ? rules.filter((r: any) => r.id === 'dynamic-query' || r.id === 'recently-viewed') 
                : rules;
              
              if (displayRules.length === 0) return null;

              return (
                <div key={category} className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">{category}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {displayRules.map((rule: any) => {
                      const Icon = TEMPLATE_ICONS[rule.templateType] || Info;
                      return (
                        <button
                          key={rule.id}
                          onClick={() => handleSelectRule(rule)}
                          className="flex items-start gap-3 p-4 border rounded-xl hover:border-primary hover:bg-primary/5 text-left transition group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition">
                            <Icon size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-sm">
                              {category === 'products' && rule.id === 'dynamic-query' ? 'Product Section' : rule.label}
                            </div>
                            <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                              {category === 'products' && rule.id === 'dynamic-query'
                                ? 'Add a powerful product section with custom filters and smart fetching.' 
                                : rule.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {showModal && (
        <Modal open={showModal} onClose={() => setShowModal(false)} title={`${editingSection ? 'Edit' : 'Configure'} Section`}>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField 
                label="Public Title" 
                value={formData.title || ''} 
                onChange={(v) => setFormData({...formData, title: v})} 
                placeholder="Visible to customers"
                isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
              />
              <FormField 
                label="Internal Name" 
                value={formData.name || ''} 
                onChange={(v) => setFormData({...formData, name: v})} 
                placeholder="For admin use"
                isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
              />
            </div>
            
            <FormField 
              label="Subtitle (Optional)" 
              value={formData.subtitle || ''} 
              onChange={(v) => setFormData({...formData, subtitle: v})}
              isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
            />
            
            <div className="p-4 bg-muted/30 rounded-xl border space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Configuration</h4>
              
              {/* Dynamic Query Builder for Products */}
              {formData.templateType === 'ProductShelf' && (
                <div className="space-y-4 pb-4 border-b border-border/50">
                  <h5 className="text-[11px] font-black text-primary uppercase tracking-widest">Dynamic Query Builder</h5>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Data Source</label>
                      <select 
                        value={formData.dataSourceId || 'dynamic-query'} 
                        onChange={(e) => setFormData({...formData, dataSourceId: e.target.value})}
                        className="w-full p-2.5 bg-background border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="dynamic-query">Custom Dynamic Filter</option>
                        <option value="top-selling">Top Selling</option>
                        <option value="new-arrivals">New Arrivals</option>
                        <option value="trending-products">Trending</option>
                        <option value="flash-sales">Flash Sales</option>
                        <option value="credit-eligible">Get Now (Credit)</option>
                        <option value="wholesale-products">Wholesale</option>
                      </select>
                    </div>

                    {formData.dataSourceId === 'dynamic-query' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Sort By</label>
                        <select 
                          value={formData.config?.sortBy || 'newest'} 
                          onChange={(e) => setFormData({...formData, config: {...formData.config, sortBy: e.target.value}})}
                          className="w-full p-2.5 bg-background border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="newest">Newest First</option>
                          <option value="price-asc">Price: Low to High</option>
                          <option value="price-desc">Price: High to Low</option>
                          <option value="popularity">Most Popular</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {formData.dataSourceId === 'dynamic-query' && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField 
                        label="Brand Slug" 
                        value={formData.config?.brandSlug || ''} 
                        onChange={(v) => setFormData({...formData, config: {...formData.config, brandSlug: v}})}
                        placeholder="e.g. apple"
                        isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                      />
                      <FormField 
                        label="Category Slug" 
                        value={formData.config?.categorySlug || ''} 
                        onChange={(v) => setFormData({...formData, config: {...formData.config, categorySlug: v}})}
                        placeholder="e.g. electronics"
                        isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                      />
                    </div>
                  )}

                  {formData.dataSourceId === 'dynamic-query' && (
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="filter-featured-dynamic"
                          checked={formData.config?.isFeatured} 
                          onChange={(e) => setFormData({...formData, config: {...formData.config, isFeatured: e.target.checked}})}
                        />
                        <label htmlFor="filter-featured-dynamic" className="text-[10px] font-bold text-muted-foreground uppercase">Featured</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="filter-credit-dynamic"
                          checked={formData.config?.allowCredit} 
                          onChange={(e) => setFormData({...formData, config: {...formData.config, allowCredit: e.target.checked}})}
                        />
                        <label htmlFor="filter-credit-dynamic" className="text-[10px] font-bold text-muted-foreground uppercase">Credit</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="filter-wholesale-dynamic"
                          checked={formData.config?.isWholesaleOnly} 
                          onChange={(e) => setFormData({...formData, config: {...formData.config, isWholesaleOnly: e.target.checked}})}
                        />
                        <label htmlFor="filter-wholesale-dynamic" className="text-[10px] font-bold text-muted-foreground uppercase">Wholesale</label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  label="Item Limit" 
                  type="number" 
                  value={String(formData.config?.limit || 8)} 
                  onChange={(v) => setFormData({...formData, config: {...formData.config, limit: parseInt(v)}})}
                  isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                />
                
                {/* Product Layout */}
                {formData.templateType === 'ProductShelf' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Layout</label>
                    <select 
                      value={formData.config?.layout || 'horizontal-scroll'} 
                      onChange={(e) => setFormData({...formData, config: {...formData.config, layout: e.target.value}})}
                      className="w-full p-2.5 bg-background border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="horizontal-scroll">Horizontal Scroll</option>
                      <option value="grid">Fixed Grid</option>
                    </select>
                  </div>
                )}

                {/* Brand Display Mode */}
                {formData.templateType === 'BrandGrid' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Display Mode</label>
                    <select 
                      value={formData.config?.displayMode || 'full'} 
                      onChange={(e) => setFormData({...formData, config: {...formData.config, displayMode: e.target.value}})}
                      className="w-full p-2.5 bg-background border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="full">Image + Name (Full)</option>
                      <option value="minimal">Name Only (Minimal)</option>
                    </select>
                  </div>
                )}
                {formData.templateType === 'BrandGrid' && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="auto-scroll"
                      checked={formData.config?.autoScroll !== false} 
                      onChange={(e) => setFormData({...formData, config: {...formData.config, autoScroll: e.target.checked}})}
                    />
                    <label htmlFor="auto-scroll" className="text-xs font-bold text-muted-foreground uppercase">Auto-Scroll</label>
                  </div>
                )}
              </div>

              {/* Color Options for ProductShelf */}
              {formData.templateType === 'ProductShelf' && (
                <div className="mt-4 space-y-3">
                  <h5 className="text-[11px] font-black text-primary uppercase tracking-widest">Color Customization</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Title & Button Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.config?.accentColor || '#000000'}
                          onChange={(e) => setFormData({...formData, config: {...formData.config, accentColor: e.target.value}})}
                          className="h-10 w-12 rounded border bg-background cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.config?.accentColor || ''}
                          onChange={(e) => setFormData({...formData, config: {...formData.config, accentColor: e.target.value}})}
                          placeholder="#000000"
                          className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Color for section title and "See All" button</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Header Background</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.config?.headerBgColor || '#ffffff'}
                          onChange={(e) => setFormData({...formData, config: {...formData.config, headerBgColor: e.target.value}})}
                          className="h-10 w-12 rounded border bg-background cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.config?.headerBgColor || ''}
                          onChange={(e) => setFormData({...formData, config: {...formData.config, headerBgColor: e.target.value}})}
                          placeholder="#ffffff"
                          className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Background color for section header</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Special Options for Products */}
              {formData.templateType === 'ProductShelf' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="show-timer"
                      checked={formData.config?.showTimer} 
                      onChange={(e) => setFormData({...formData, config: {...formData.config, showTimer: e.target.checked}})}
                    />
                    <label htmlFor="show-timer" className="text-xs font-bold text-muted-foreground uppercase">Show Countdown Timer</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="show-percent"
                      checked={formData.config?.showPercent} 
                      onChange={(e) => setFormData({...formData, config: {...formData.config, showPercent: e.target.checked}})}
                    />
                    <label htmlFor="show-percent" className="text-xs font-bold text-muted-foreground uppercase">Show % Off Badge</label>
                  </div>
                </div>
              )}

              {/* Flash Sale Timer */}
              {(formData.templateType === 'FlashSale' || formData.templateType === 'LimitedStockDeal') && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <FormField 
                    label="End Date" 
                    type="datetime-local"
                    value={formData.config?.endTime || formData.config?.timerEndDate || ''} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, endTime: v, timerEndDate: v}})}
                    isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                  <FormField 
                    label="Timer Label" 
                    value={formData.config?.countdownLabel || formData.config?.timerLabel || ''} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, countdownLabel: v, timerLabel: v}})}
                    placeholder="Ends in"
                    isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                  <FormField 
                    label="Discount Text" 
                    value={formData.config?.discountText || ''} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, discountText: v}})}
                    placeholder="Up to 50% OFF"
                    isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                  <FormField 
                    label="Discount %" 
                    type="number"
                    value={String(formData.config?.discountPercent || '')} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, discountPercent: parseInt(v)}})}
                    placeholder="50"
                    isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                </div>
              )}

              {/* Category Selection for Products */}
              {formData.templateType === 'ProductShelf' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <FormField 
                    label="Category ID" 
                    value={formData.config?.categoryId || ''} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, categoryId: v}})}
                    placeholder="Filter by category ID"
                    isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                  <FormField 
                    label="Category Slug" 
                    value={formData.config?.categorySlug || ''} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, categorySlug: v}})}
                    placeholder="electronics"
                    isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="filter-featured"
                      checked={formData.config?.filter_by === 'Featured' || formData.config?.filterType === 'Featured'} 
                      onChange={(e) => setFormData({...formData, config: {...formData.config, filter_by: e.target.checked ? 'Featured' : '', filterType: e.target.checked ? 'Featured' : ''}})}
                    />
                    <label htmlFor="filter-featured" className="text-xs font-bold text-muted-foreground uppercase">Featured Products Only</label>
                  </div>
                </div>
              )}

              {/* Category Section Configuration */}
              {formData.templateType === 'CategorySection' && (
                <div className="mt-4 space-y-4">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Category Layout</label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Grid option */}
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, config: {...formData.config, layout: 'grid'}})}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        (formData.config?.layout ?? 'grid') === 'grid'
                          ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30 shadow-md'
                          : 'border-muted/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}
                    >
                      {(formData.config?.layout ?? 'grid') === 'grid' && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                      )}
                      {/* Grid icon */}
                      <svg width="40" height="32" viewBox="0 0 40 32" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-80">
                        <rect x="2" y="2" width="16" height="13" rx="2"/>
                        <rect x="22" y="2" width="16" height="13" rx="2"/>
                        <rect x="2" y="19" width="16" height="11" rx="2"/>
                        <rect x="22" y="19" width="16" height="11" rx="2"/>
                      </svg>
                      <span className="text-xs font-semibold">Grid</span>
                      <span className="text-[10px] text-muted-foreground text-center">4 columns,<br/>multiple rows</span>
                    </button>

                    {/* Horizontal scroll option */}
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, config: {...formData.config, layout: 'horizontal-scroll'}})}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        formData.config?.layout === 'horizontal-scroll'
                          ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30 shadow-md'
                          : 'border-muted/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}
                    >
                      {formData.config?.layout === 'horizontal-scroll' && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                      )}
                      {/* Horizontal scroll icon */}
                      <svg width="40" height="32" viewBox="0 0 40 32" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-80">
                        <rect x="2" y="6" width="10" height="20" rx="2"/>
                        <rect x="15" y="6" width="10" height="20" rx="2"/>
                        <rect x="28" y="6" width="10" height="20" rx="2"/>
                        <path d="M36 16h3M1 16h-3" strokeLinecap="round"/>
                      </svg>
                      <span className="text-xs font-semibold">Horizontal Scroll</span>
                      <span className="text-[10px] text-muted-foreground text-center">Single row,<br/>swipe to browse</span>
                    </button>
                  </div>

                  {/* Max items */}
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Max Categories to Show
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={formData.config?.limit ?? 8}
                      onChange={e => setFormData({...formData, config: {...formData.config, limit: Number(e.target.value)}})}
                      className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Fetches from your category list (active categories only)</p>
                  </div>
                </div>
              )}

              {/* Banner Carousel Configuration */}
              {formData.templateType === 'BannerCarousel' && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Banner Slides</label>
                    <button
                      type="button"
                      onClick={() => {
                        const slides = [...(formData.config?.slides || [])];
                        slides.push({
                          image: '',
                          videoUrl: '',
                          title: '',
                          subtitle: '',
                          ctaText: 'Shop Now',
                          linkUrl: '',
                          buttonColor: '#ffffff',
                          buttonTextColor: '#000000',
                        });
                        setFormData({...formData, config: {...formData.config, slides}});
                      }}
                      className="text-xs font-bold text-primary hover:underline"
                    >+ Add Slide</button>
                  </div>
                  {(formData.config?.slides || []).map((slide: any, idx: number) => (
                    <div key={idx} className="p-3 bg-background border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground">Slide {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const slides = [...(formData.config?.slides || [])];
                            slides.splice(idx, 1);
                            setFormData({...formData, config: {...formData.config, slides}});
                          }}
                          className="text-xs text-red-500 hover:underline"
                        >Remove</button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Banner Media</label>
                        {getSlideMediaUrl(slide) && (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted border">
                            {slide.videoUrl ? (
                              <video
                                src={slide.videoUrl}
                                className="w-full h-full object-cover"
                                muted
                                controls
                                playsInline
                              />
                            ) : (
                              <img src={slide.image} alt={slide.title || 'Preview'} className="w-full h-full object-cover" />
                            )}
                          </div>
                        )}
                        <CloudinaryUpload
                          value={getSlideMediaUrl(slide)}
                          onChange={(url, filename) => {
                            const slides = [...(formData.config?.slides || [])];
                            slides[idx] = updateSlideMedia(slides[idx], url, filename);
                            setFormData({...formData, config: {...formData.config, slides}});
                          }}
                          accept="image/*,video/*"
                          folder="kryros/banners"
                          isDark={isDark} border={border} surface={surface} textMuted={textMuted} textMain={textMain}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Upload an image or video banner. Uploading a new file replaces the current banner media for this slide.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          label="Title (optional)"
                          value={slide.title || ''}
                          onChange={(v) => {
                            const slides = [...(formData.config?.slides || [])];
                            slides[idx] = {...slides[idx], title: v};
                            setFormData({...formData, config: {...formData.config, slides}});
                          }}
                          placeholder="Summer Sale"
                          isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                        />
                        <FormField
                          label="Subtitle (optional)"
                          value={slide.subtitle || ''}
                          onChange={(v) => {
                            const slides = [...(formData.config?.slides || [])];
                            slides[idx] = {...slides[idx], subtitle: v};
                            setFormData({...formData, config: {...formData.config, slides}});
                          }}
                          placeholder="Up to 50% off"
                          isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          label="CTA Text"
                          value={slide.ctaText || 'Shop Now'}
                          onChange={(v) => {
                            const slides = [...(formData.config?.slides || [])];
                            slides[idx] = {...slides[idx], ctaText: v};
                            setFormData({...formData, config: {...formData.config, slides}});
                          }}
                          placeholder="Shop Now"
                          isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                        />
                        <FormField
                          label="Link URL"
                          value={slide.linkUrl || ''}
                          onChange={(v) => {
                            const slides = [...(formData.config?.slides || [])];
                            slides[idx] = {...slides[idx], linkUrl: v};
                            setFormData({...formData, config: {...formData.config, slides}});
                          }}
                          placeholder="/shop/sale"
                          isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-muted-foreground uppercase">Button Background</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={slide.buttonColor || '#ffffff'}
                              onChange={(e) => {
                                const slides = [...(formData.config?.slides || [])];
                                slides[idx] = {...slides[idx], buttonColor: e.target.value};
                                setFormData({...formData, config: {...formData.config, slides}});
                              }}
                              className="h-10 w-12 rounded border bg-background cursor-pointer"
                            />
                            <input
                              type="text"
                              value={slide.buttonColor || '#ffffff'}
                              onChange={(e) => {
                                const slides = [...(formData.config?.slides || [])];
                                slides[idx] = {...slides[idx], buttonColor: e.target.value};
                                setFormData({...formData, config: {...formData.config, slides}});
                              }}
                              placeholder="#ffffff"
                              className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-muted-foreground uppercase">Button Text</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={slide.buttonTextColor || '#000000'}
                              onChange={(e) => {
                                const slides = [...(formData.config?.slides || [])];
                                slides[idx] = {...slides[idx], buttonTextColor: e.target.value};
                                setFormData({...formData, config: {...formData.config, slides}});
                              }}
                              className="h-10 w-12 rounded border bg-background cursor-pointer"
                            />
                            <input
                              type="text"
                              value={slide.buttonTextColor || '#000000'}
                              onChange={(e) => {
                                const slides = [...(formData.config?.slides || [])];
                                slides[idx] = {...slides[idx], buttonTextColor: e.target.value};
                                setFormData({...formData, config: {...formData.config, slides}});
                              }}
                              placeholder="#000000"
                              className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="banner-autoplay"
                      checked={formData.config?.autoplay !== false}
                      onChange={(e) => setFormData({...formData, config: {...formData.config, autoplay: e.target.checked}})}
                    />
                    <label htmlFor="banner-autoplay" className="text-xs font-bold text-muted-foreground uppercase">Auto-play</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase w-20">Duration</span>
                    <select
                      value={formData.config?.duration || 5}
                      onChange={(e) => setFormData({...formData, config: {...formData.config, duration: parseInt(e.target.value)}})}
                      className="p-1.5 bg-background border rounded text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value={2}>2 seconds</option>
                      <option value={3}>3 seconds</option>
                      <option value={5}>5 seconds</option>
                      <option value={7}>7 seconds</option>
                      <option value={10}>10 seconds</option>
                      <option value={15}>15 seconds</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="banner-dots"
                      checked={formData.config?.showDots !== false}
                      onChange={(e) => setFormData({...formData, config: {...formData.config, showDots: e.target.checked}})}
                    />
                    <label htmlFor="banner-dots" className="text-xs font-bold text-muted-foreground uppercase">Show dot indicators</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="banner-arrows"
                      checked={formData.config?.showArrows !== false}
                      onChange={(e) => setFormData({...formData, config: {...formData.config, showArrows: e.target.checked}})}
                    />
                    <label htmlFor="banner-arrows" className="text-xs font-bold text-muted-foreground uppercase">Show navigation arrows</label>
                  </div>
                </div>
              )}

              {/* Trust Badges Configuration */}
              {(formData.templateType === 'TrustBadges' || formData.templateType === 'Testimonials') && (
                <div className="mt-4 space-y-3">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Items (JSON Array)</label>
                  <textarea
                    value={JSON.stringify(formData.config?.items || [], null, 2)}
                    onChange={(e) => {
                      try {
                        setFormData({...formData, config: {...formData.config, items: JSON.parse(e.target.value)}});
                      } catch {
                        // Invalid JSON, don't update
                      }
                    }}
                    className="w-full p-3 bg-background border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 min-h-[150px]"
                    placeholder='[{"icon": "🛡️", "title": "Secure", "subtitle": "Safe checkout"}]'
                  />
                  <p className="text-[10px] text-muted-foreground">Enter JSON array of items with icon, title, subtitle fields</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <input 
                type="checkbox" 
                id="active-toggle"
                checked={formData.isActive} 
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
              />
              <label htmlFor="active-toggle" className="text-sm font-bold text-primary cursor-pointer">Visible on website</label>
            </div>
          </div>
          <ModalFooter
            onClose={() => setShowModal(false)}
            onSubmit={handleSaveSection}
            loading={saving}
            submitLabel={editingSection ? 'Save Changes' : 'Add Section'}
            isDark={isDark} border={border} textMain={textMain}
          />
        </Modal>
      )}
    </AdminShell>
  );
}
