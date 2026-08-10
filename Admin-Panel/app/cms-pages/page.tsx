'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import CloudinaryUpload from '@/components/ui/file-upload';
import {
  Plus, Edit, Trash2, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown,
  Zap, ShoppingBag, Users, TrendingUp, Layout, MousePointer, Info, Image, Palette, Save, RefreshCw
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
  getCmsPages,
  getBrands,
  getCategories,
  getSettings,
  updateSettings
} from '@/lib/api';
import { THEME_COLOR_CATALOG, THEME_COLOR_CATEGORIES } from '@/lib/theme-catalog';

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

type ProductSourceMode = 'all' | 'category' | 'brand' | 'brand-category';

const getProductSourceMode = (config?: any): ProductSourceMode => {
  const hasBrand = Boolean(config?.brandSlug);
  const hasCategory = Boolean(config?.categorySlug || config?.categoryId);

  if (hasBrand && hasCategory) return 'brand-category';
  if (hasCategory) return 'category';
  if (hasBrand) return 'brand';
  return 'all';
};

const applyProductSourceMode = (config: any, mode: ProductSourceMode) => {
  const nextConfig = { ...(config || {}) };

  if (mode === 'all') {
    delete nextConfig.brandSlug;
    delete nextConfig.categorySlug;
    delete nextConfig.categoryId;
    return nextConfig;
  }

  if (mode === 'category') {
    delete nextConfig.brandSlug;
    return nextConfig;
  }

  if (mode === 'brand') {
    delete nextConfig.categorySlug;
    delete nextConfig.categoryId;
    return nextConfig;
  }

  return nextConfig;
};

const resolveOptionLabel = (
  options: Array<{ value: string; label: string }>,
  value?: string,
) => {
  if (!value) return '';
  return options.find((option) => option.value === value)?.label || value;
};



export default function CMSPagesPage() {
  const border = 'var(--border)';
  const textMain = 'var(--text-main)';
  const textMuted = 'var(--text-muted)';
  const surface = 'var(--card)';
  const card = 'var(--card)';
  const inputStyle = { width:'100%', background:surface, border:`1px solid ${border}`, borderRadius:'9px', color:textMain, fontSize:'13.5px', fontFamily:'var(--font-inter)', outline:'none', padding:'10px 14px' };

  // Top-level tab: 'cms' | 'theme'
  const [mainTab, setMainTab] = useState<'cms' | 'theme'>('cms');

  // Theme Colors state
  const [themeColors, setThemeColors] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    THEME_COLOR_CATALOG.forEach(t => { init[t.key] = t.defaultValue; });
    return init;
  });
  const [themePreviewActive, setThemePreviewActive] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);

  const [sections, setSections] = useState<any[]>([]);
  const [rulesGrouped, setRulesGrouped] = useState<Record<string, any[]>>({});
  const [pages, setPages] = useState<{ value: string; label: string }[]>([]);
  const [brands, setBrands] = useState<{ value: string; label: string }[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
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
    fetchBrands();
    fetchCategories();
    // Load saved theme colors from settings
    getSettings().then((r: any) => {
      const list = Array.isArray(r.data) ? r.data : [];
      const sMap: Record<string, string> = {};
      list.forEach((s: any) => { if (s?.key) sMap[s.key] = s.value; });
      const colorUpdates: Record<string, string> = {};
      THEME_COLOR_CATALOG.forEach(t => {
        if (sMap[t.key]) colorUpdates[t.key] = sMap[t.key];
      });
      if (Object.keys(colorUpdates).length > 0) {
        setThemeColors(prev => ({ ...prev, ...colorUpdates }));
      }
    }).catch(() => {});
  }, []);

  const handleSaveTheme = async () => {
    setThemeSaving(true);
    try {
      await updateSettings({ ...themeColors });
      toast.success('Theme colors saved successfully');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'check connection';
      toast.error(`Failed to save theme colors — ${msg}`);
    }
    setThemeSaving(false);
  };

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

  const fetchBrands = async () => {
    try {
      const response = await getBrands();
      const list = Array.isArray(response.data) ? response.data : (response.data as any)?.data || [];
      const mapped = list.map((b: any) => ({ value: b.slug, label: b.name || b.slug }));
      setBrands(mapped);
    } catch {
      toast.error('Failed to load brands');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      const list = Array.isArray(response.data) ? response.data : (response.data as any)?.data || [];
      const mapped = list.map((c: any) => ({ value: c.slug, label: c.name || c.slug }));
      setCategories(mapped);
    } catch {
      toast.error('Failed to load categories');
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
      console.log('[CMS] Config brandSlug:', formData.config?.brandSlug);
      console.log('[CMS] Config categorySlug:', formData.config?.categorySlug);
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
        {/* Top-level Tab Bar */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-2xl border w-fit">
          <button
            onClick={() => setMainTab('cms')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mainTab === 'cms'
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layout size={16} />
            CMS & Pages
          </button>
          <button
            onClick={() => setMainTab('theme')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mainTab === 'theme'
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Palette size={16} />
            Theme Colors
          </button>
        </div>

        {/* ── THEME COLORS TAB ── */}
        {mainTab === 'theme' && (
          <div>
            <PageHeader
              title="Theme Colors"
              subtitle="All CSS color variables used across the storefront. Changes are saved to the database and applied dynamically at runtime — no code deployment needed."
              icon={Palette}
            />

            {/* Live Preview Toggle */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:card, border:`1px solid ${border}`, borderRadius:'12px', marginBottom:'24px' }}>
              <div>
                <div style={{ fontSize:'13.5px', fontWeight:700, color:textMain }}>Live Preview in Admin</div>
                <div style={{ fontSize:'12px', color:textMuted, marginTop:'2px' }}>Apply color changes instantly in this panel to preview them before saving</div>
              </div>
              <button
                onClick={() => {
                  const next = !themePreviewActive;
                  setThemePreviewActive(next);
                  if (next) {
                    THEME_COLOR_CATALOG.forEach(t => {
                      document.documentElement.style.setProperty(t.cssVar, themeColors[t.key] ?? t.defaultValue);
                    });
                  } else {
                    THEME_COLOR_CATALOG.forEach(t => {
                      document.documentElement.style.removeProperty(t.cssVar);
                    });
                  }
                }}
                style={{ width:'44px', height:'24px', borderRadius:'12px', background:themePreviewActive?'var(--primary)':'rgba(100,116,139,0.3)', border:'none', cursor:'pointer', padding:'2px', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:themePreviewActive?'flex-end':'flex-start', flexShrink:0 }}
              >
                <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>

            {/* Color groups */}
            {THEME_COLOR_CATEGORIES.map(cat => {
              const tokens = THEME_COLOR_CATALOG.filter(t => t.category === cat.id);
              if (tokens.length === 0) return null;
              return (
                <div key={cat.id} style={{ marginBottom:'32px' }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:textMuted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'14px', paddingBottom:'8px', borderBottom:`1px solid ${border}` }}>
                    {cat.label}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'14px' }}>
                    {tokens.map(token => {
                      const isSimpleColor = /^#[0-9a-fA-F]{3,8}$/.test(themeColors[token.key] ?? token.defaultValue);
                      const currentVal = themeColors[token.key] ?? token.defaultValue;
                      return (
                        <div key={token.key} style={{ background:card, border:`1px solid ${border}`, borderRadius:'12px', padding:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>
                          {/* Swatch + label */}
                          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                            <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:currentVal, border:`1px solid ${border}`, flexShrink:0, boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:'12.5px', fontWeight:700, color:textMain, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{token.label}</div>
                              <div style={{ fontSize:'10.5px', color:textMuted, fontFamily:'monospace', marginTop:'1px' }}>{token.cssVar}</div>
                            </div>
                            {/* Color picker — only for simple hex values */}
                            {isSimpleColor && (
                              <input
                                type="color"
                                value={currentVal.length === 7 ? currentVal : '#000000'}
                                onChange={e => {
                                  const v = e.target.value;
                                  setThemeColors(prev => ({ ...prev, [token.key]: v }));
                                  if (themePreviewActive) document.documentElement.style.setProperty(token.cssVar, v);
                                }}
                                style={{ width:'28px', height:'28px', border:'none', padding:0, cursor:'pointer', borderRadius:'6px', background:'transparent', flexShrink:0 }}
                                title="Pick color"
                              />
                            )}
                          </div>
                          {/* Hex / value input */}
                          <input
                            style={{ ...inputStyle, fontSize:'12px', padding:'7px 10px', fontFamily:'monospace' }}
                            value={currentVal}
                            onChange={e => {
                              const v = e.target.value;
                              setThemeColors(prev => ({ ...prev, [token.key]: v }));
                              if (themePreviewActive) document.documentElement.style.setProperty(token.cssVar, v);
                            }}
                            placeholder={token.defaultValue}
                          />
                          {/* Reset to default */}
                          {currentVal !== token.defaultValue && (
                            <button
                              onClick={() => {
                                setThemeColors(prev => ({ ...prev, [token.key]: token.defaultValue }));
                                if (themePreviewActive) document.documentElement.style.setProperty(token.cssVar, token.defaultValue);
                              }}
                              style={{ fontSize:'11px', color:textMuted, background:'transparent', border:`1px solid ${border}`, borderRadius:'6px', padding:'3px 8px', cursor:'pointer', alignSelf:'flex-start' }}
                            >
                              Reset to default
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Save Button */}
            <div style={{ marginTop:'32px', paddingTop:'24px', borderTop:`1px solid ${border}`, display:'flex', justifyContent:'flex-end' }}>
              <button
                onClick={handleSaveTheme}
                disabled={themeSaving}
                style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:'10px', padding:'12px 24px', fontSize:'14px', fontWeight:700, cursor:themeSaving?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:'8px', boxShadow:'0 4px 12px rgba(192,21,27,0.15)', opacity:themeSaving?0.7:1 }}
              >
                {themeSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                {themeSaving ? 'Saving...' : 'Save Theme Colors'}
              </button>
            </div>
          </div>
        )}

        {/* ── CMS PAGES TAB ── */}
        {mainTab === 'cms' && view === 'page-list' ? (
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
        ) : mainTab === 'cms' ? (
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
                  const productSourceSummary =
                    (section.templateType || section.type) === 'ProductShelf'
                      ? [
                          section.dataSourceId ? `Preset: ${section.dataSourceId}` : '',
                          section.config?.categorySlug
                            ? `Category: ${resolveOptionLabel(categories, section.config.categorySlug)}`
                            : '',
                          section.config?.brandSlug
                            ? `Brand: ${resolveOptionLabel(brands, section.config.brandSlug)}`
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' • ')
                      : '';
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
                          {section.templateType !== 'BrandGrid' && section.templateType !== 'CategorySection' && !productSourceSummary && (
                            <span>Source: <span className="text-foreground">{section.dataSourceId || section.slotKey || 'Custom'}</span></span>
                          )}
                          {productSourceSummary && <span>{productSourceSummary}</span>}
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
        ) : null}
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
                border={border} textMain={textMain} textMuted={textMuted} surface={surface}
              />
              <FormField 
                label="Internal Name" 
                value={formData.name || ''} 
                onChange={(v) => setFormData({...formData, name: v})} 
                placeholder="For admin use"
                border={border} textMain={textMain} textMuted={textMuted} surface={surface}
              />
            </div>
            
            <FormField 
              label="Subtitle (Optional)" 
              value={formData.subtitle || ''} 
              onChange={(v) => setFormData({...formData, subtitle: v})}
              border={border} textMain={textMain} textMuted={textMuted} surface={surface}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Title Alignment</label>
                <select
                  value={formData.config?.titleAlign || 'left'}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {
                      ...(formData.config || {}),
                      titleAlign: e.target.value
                    }
                  })}
                  className="w-full p-2.5 bg-background border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="left">Left Aligned</option>
                  <option value="center">Centered</option>
                  <option value="right">Right Aligned</option>
                </select>
              </div>

              <div className="flex items-center gap-3 h-full pt-6">
                <input
                  type="checkbox"
                  id="show-see-all-toggle"
                  checked={formData.config?.showSeeAll !== false}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {
                      ...(formData.config || {}),
                      showSeeAll: e.target.checked
                    }
                  })}
                  className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
                />
                <label htmlFor="show-see-all-toggle" className="text-sm font-bold text-muted-foreground cursor-pointer uppercase select-none">Show "See All" Link</label>
              </div>
            </div>
            
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Brand (Optional)</label>
                        <select 
                          value={formData.config?.brandSlug || ''} 
                          onChange={(e) => setFormData({...formData, config: {...formData.config, brandSlug: e.target.value}})}
                          className="w-full p-2.5 bg-background border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">All Brands</option>
                          {brands.map((brand) => (
                            <option key={brand.value} value={brand.value}>{brand.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Category (Optional)</label>
                        <select 
                          value={formData.config?.categorySlug || ''} 
                          onChange={(e) => setFormData({
                            ...formData,
                            config: {
                              ...formData.config,
                              categorySlug: e.target.value,
                              categoryId: undefined,
                            },
                          })}
                          className="w-full p-2.5 bg-background border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">All Categories</option>
                          {categories.map((category) => (
                            <option key={category.value} value={category.value}>{category.label}</option>
                          ))}
                        </select>
                      </div>
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
                  border={border} textMain={textMain} textMuted={textMuted} surface={surface}
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
                    border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                  <FormField 
                    label="Timer Label" 
                    value={formData.config?.countdownLabel || formData.config?.timerLabel || ''} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, countdownLabel: v, timerLabel: v}})}
                    placeholder="Ends in"
                    border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                  <FormField 
                    label="Discount Text" 
                    value={formData.config?.discountText || ''} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, discountText: v}})}
                    placeholder="Up to 50% OFF"
                    border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                  <FormField 
                    label="Discount %" 
                    type="number"
                    value={String(formData.config?.discountPercent || '')} 
                    onChange={(v) => setFormData({...formData, config: {...formData.config, discountPercent: parseInt(v)}})}
                    placeholder="50"
                    border={border} textMain={textMain} textMuted={textMuted} surface={surface}
                  />
                </div>
              )}

              {/* Product Target Summary */}
              {formData.templateType === 'ProductShelf' && (
                <div className="mt-4 rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  <div className="font-semibold text-foreground">Section feed preview</div>
                  <div className="mt-1">
                    {[
                      formData.dataSourceId ? `Preset: ${formData.dataSourceId}` : 'Preset: dynamic-query',
                      formData.config?.categorySlug ? `Category: ${resolveOptionLabel(categories, formData.config.categorySlug)}` : '',
                      formData.config?.brandSlug ? `Brand: ${resolveOptionLabel(brands, formData.config.brandSlug)}` : '',
                      formData.config?.isFeatured ? 'Featured only' : '',
                      formData.config?.allowCredit ? 'Credit enabled' : '',
                      formData.config?.isWholesaleOnly ? 'Wholesale only' : '',
                    ]
                      .filter(Boolean)
                      .join(' • ')}
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
                          border={border} surface={surface} textMuted={textMuted} textMain={textMain}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Upload an image or video banner. Uploading a new file replaces the current banner media for this slide.
                        </p>
                        {slide.videoUrl && (
                          <div className="grid grid-cols-2 gap-3 py-2 bg-muted/40 px-3 rounded-lg border border-border/50 mt-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`enableControls-${idx}`}
                                checked={slide.enableControls === true}
                                onChange={(e) => {
                                  const slides = [...(formData.config?.slides || [])];
                                  slides[idx] = {...slides[idx], enableControls: e.target.checked};
                                  setFormData({...formData, config: {...formData.config, slides}});
                                }}
                                className="w-3.5 h-3.5"
                              />
                              <label htmlFor={`enableControls-${idx}`} className="text-[10px] font-bold text-muted-foreground uppercase cursor-pointer select-none">
                                Playback Controls
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`enableSound-${idx}`}
                                checked={slide.enableSound === true}
                                onChange={(e) => {
                                  const slides = [...(formData.config?.slides || [])];
                                  slides[idx] = {...slides[idx], enableSound: e.target.checked};
                                  setFormData({...formData, config: {...formData.config, slides}});
                                }}
                                className="w-3.5 h-3.5"
                              />
                              <label htmlFor={`enableSound-${idx}`} className="text-[10px] font-bold text-muted-foreground uppercase cursor-pointer select-none">
                                Enable Sound
                              </label>
                            </div>
                          </div>
                        )}
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
                          border={border} textMain={textMain} textMuted={textMuted} surface={surface}
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
                          border={border} textMain={textMain} textMuted={textMuted} surface={surface}
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
                          border={border} textMain={textMain} textMuted={textMuted} surface={surface}
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
                          border={border} textMain={textMain} textMuted={textMuted} surface={surface}
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
            border={border} textMain={textMain}
          />
        </Modal>
      )}
    </AdminShell>
  );
}
