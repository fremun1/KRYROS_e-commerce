'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import {
  Plus, Edit, Trash2, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown,
  Zap, Grid3x3, ImageIcon, ShoppingBag, Users, TrendingUp, Layout, MousePointer, Info
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
  BannerSlot: ImageIcon,
  CategoryGrid: Grid3x3,
  CategoryGridShelf: Grid3x3,
  BrandGrid: Users,
  HeroSlider: Layout,
  FlashSale: Zap,
  Custom: Info
};



export default function DynamicSectionsPage() {
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
      const response = await getCmsSections(normalizedSlug);
      setSections(response.data || []);
    } catch (error) {
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
      slotKey: rule.templateType === 'BannerSlot' ? rule.id : undefined,
      title: rule.label,
      name: rule.label,
      config: { 
        ...formData.config,
        limit: rule.templateType === 'CategoryGrid' ? 12 : 8,
        layout: rule.templateType === 'ProductShelf' ? 'horizontal-scroll' : (rule.templateType === 'CategoryGrid' ? 'grid' : undefined),
        displayMode: rule.templateType === 'BrandGrid' ? 'full' : undefined,
        autoScroll: rule.templateType === 'BrandGrid' ? true : undefined
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
      if (editingSection) {
        await updateCmsSection(editingSection.id, formData);
        toast.success('Section updated');
      } else {
        await createCmsSection(formData);
        toast.success('Section created');
      }
      setShowModal(false);
      fetchSections();
    } catch (error) {
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
                    className="flex items-center justify-between p-6 bg-card border rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition shadow-sm group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                        <Layout size={24} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-lg">{page.label}</h3>
                        <p className="text-sm text-muted-foreground">Manage sections for this page</p>
                      </div>
                    </div>
                    <div className="text-primary opacity-0 group-hover:opacity-100 transition">
                      <ChevronDown size={20} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">{pages.find((p: any) => p.value === selectedPage)?.label || 'Page Sections'}</h1>
                <p className="text-muted-foreground text-sm">Manage sections for this page</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBackToPages}
                  className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium transition"
                >
                  <ChevronDown size={16} className="rotate-90" />
                  Back to Pages
                </button>
                <button
                  onClick={handleAddSection}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition shadow-lg shadow-primary/20"
                >
                  <Plus size={18} />
                  Add Section
                </button>
              </div>
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
                    <div key={section.id} className="group flex items-center gap-4 p-4 bg-card border rounded-2xl hover:border-primary/50 transition shadow-sm">
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
                          <span className="bg-muted px-2 py-0.5 rounded">{section.templateType || section.type}</span>
                          <span>Source: <span className="text-foreground">{section.dataSourceId || section.slotKey || 'Custom'}</span></span>
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
            {Object.entries(rulesGrouped).map(([category, rules]) => (
              <div key={category} className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">{category}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rules.map((rule: any) => {
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
                          <div className="font-bold text-sm">{rule.label}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{rule.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
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

                {/* Category Layout */}
                {formData.templateType === 'CategoryGrid' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Layout</label>
                    <select 
                      value={formData.config?.layout || 'grid'} 
                      onChange={(e) => setFormData({...formData, config: {...formData.config, layout: e.target.value}})}
                      className="w-full p-2.5 bg-background border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="grid">Grid</option>
                      <option value="horizontal">Horizontal Scroll</option>
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

              {/* Banner Image Upload */}
              {(formData.templateType === 'HeroBanner' || formData.templateType === 'HeroSlider' || formData.templateType === 'PromoBanner' || formData.templateType === 'BannerSlot') && (
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <FormField 
                    label="Image URL" 
                    value={formData.config?.image || formData.config?.media || ''} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, image: v, media: v}})}
                    placeholder="https://example.com/image.jpg"
                    isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                  <FormField 
                    label="Background Color" 
                    value={formData.config?.bgColor || formData.config?.gradient || ''} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, bgColor: v, gradient: v}})}
                    placeholder="#000000 or linear-gradient(...)"
                    isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                  <FormField 
                    label="CTA Link" 
                    value={formData.config?.ctaLink || formData.config?.href || formData.config?.link || ''} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, ctaLink: v, href: v, link: v}})}
                    placeholder="/shop or https://..."
                    isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                  <FormField 
                    label="CTA Text" 
                    value={formData.config?.ctaText || formData.config?.button_text || formData.config?.linkText || ''} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, ctaText: v, button_text: v, linkText: v}})}
                    placeholder="Shop Now"
                    isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
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
