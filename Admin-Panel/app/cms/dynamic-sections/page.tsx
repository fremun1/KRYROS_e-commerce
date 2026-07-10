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
  moveCmsSection
} from '@/lib/api';

// Reusable template icons mapping
const TEMPLATE_ICONS: Record<string, any> = {
  ProductShelf: ShoppingBag,
  BannerSlot: ImageIcon,
  CategoryGrid: Grid3x3,
  CategoryGridShelf: Grid3x3,
  HeroSlider: Layout,
  FlashSale: Zap,
  Custom: Info
};

const PAGES = [
  { value: 'homepage', label: 'Home Page' },
  { value: 'shop', label: 'Shop Page' },
  { value: 'get-now', label: 'Get Now Page' },
  { value: 'wholesale', label: 'Wholesale Page' },
];

export default function DynamicSectionsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#0D1523' : '#FFFFFF';
  
  const [sections, setSections] = useState<any[]>([]);
  const [rulesGrouped, setRulesGrouped] = useState<Record<string, any[]>>({});
  const [selectedPage, setSelectedPage] = useState('homepage');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [editingSection, setEditingSection] = useState<any>(null);

  useEffect(() => {
    fetchSections();
    fetchRules();
  }, [selectedPage]);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const response = await getCmsSections(selectedPage);
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
    if (!confirm('Delete this section?')) return;
    try {
      await deleteCmsSection(id);
      toast.success('Section deleted');
      fetchSections();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    try {
      await moveCmsSection(id, direction, selectedPage);
      fetchSections();
    } catch (error) {
      toast.error('Failed to move');
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <PageHeader
          title="Dynamic Sections"
          subtitle="Manage banners, product shelves, and categories across all pages"
          icon={Layout}
        />

        {/* Page Filter & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-4 rounded-xl border">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Page:</span>
            <div className="flex bg-muted p-1 rounded-lg">
              {PAGES.map(page => (
                <button
                  key={page.value}
                  onClick={() => setSelectedPage(page.value)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                    selectedPage === page.value 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {page.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAddSection}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Add Dynamic Section
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
                <div key={section.id} className="group flex items-center gap-4 p-4 bg-card border rounded-2xl hover:border-primary/50 transition shadow-sm">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleMove(section.id, 'up')} disabled={index === 0} className="p-1 hover:bg-muted rounded disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button onClick={() => handleMove(section.id, 'down')} disabled={index === sections.length - 1} className="p-1 hover:bg-muted rounded disabled:opacity-30"><ChevronDown size={14} /></button>
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

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => handleEditSection(section)} className="p-2.5 hover:bg-blue-50 text-blue-600 rounded-xl transition"><Edit size={18} /></button>
                    <button onClick={() => handleDeleteSection(section.id)} className="p-2.5 hover:bg-red-50 text-red-600 rounded-xl transition"><Trash2 size={18} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
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
              </div>
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
