'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import {
  Plus, Edit, Trash2, GripVertical, Eye, EyeOff, ChevronDown,
  Zap, Grid3x3, Image as ImageIcon, ShoppingBag, Users, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCmsSections, createCmsSection, updateCmsSection, deleteCmsSection, reorderCmsSections } from '@/lib/api';

// Section type definitions with their configuration schemas
const SECTION_TYPES: Record<string, any> = {
  FlashSale: {
    label: 'Flash Sale',
    icon: Zap,
    description: 'Time-limited product sale with countdown timer',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    fields: [
      { key: 'timerEndDate', label: 'Sale End Date & Time', type: 'datetime' },
      { key: 'timerLabel', label: 'Timer Label', type: 'text', default: 'TIME LEFT:' },
      { key: 'ctaText', label: 'Call-to-Action Text', type: 'text', default: 'See All' },
      { key: 'ctaLink', label: 'CTA Link', type: 'text', default: '/shop?isFlashSale=true' },
      { key: 'productLimit', label: 'Products to Show', type: 'number', default: 8 },
      { key: 'headerBgColor', label: 'Header Background Color', type: 'color', default: '#C1304B' },
    ]
  },
  ProductGrid: {
    label: 'Product Grid',
    icon: Grid3x3,
    description: 'Display products based on filters or categories',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    fields: [
      { key: 'productLimit', label: 'Products to Show', type: 'number', default: 8 },
      { key: 'filterType', label: 'Filter Type', type: 'select', options: ['Featured', 'Best Selling', 'New Arrivals', 'Category'], default: 'Featured' },
      { key: 'categoryId', label: 'Category (if applicable)', type: 'text' },
      { key: 'viewAllButtonText', label: 'View All Button Text', type: 'text', default: 'See All' },
      { key: 'viewAllLink', label: 'View All Link', type: 'text', default: '/shop' },
    ]
  },
  HeroBanner: {
    label: 'Hero Banner',
    icon: ImageIcon,
    description: 'Full-width hero banner with image and CTA',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    fields: [
      { key: 'imageUrl', label: 'Image URL', type: 'file' },
      { key: 'buttonText', label: 'Button Text', type: 'text' },
      { key: 'buttonLink', label: 'Button Link', type: 'text' },
      { key: 'duration', label: 'Display Duration (seconds)', type: 'number', default: 5 },
    ]
  },
  LimitedStockDeal: {
    label: 'Limited Stock Deal',
    icon: ShoppingBag,
    description: 'Highlight products with limited stock',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    fields: [
      { key: 'discountPercent', label: 'Discount Percentage', type: 'number', default: 70 },
      { key: 'discountText', label: 'Discount Badge Text', type: 'text', default: 'Up to 70% Off' },
      { key: 'productLimit', label: 'Products to Show', type: 'number', default: 8 },
      { key: 'ctaText', label: 'Call-to-Action Text', type: 'text', default: 'Shop Now' },
    ]
  },
  TopSelling: {
    label: 'Top Selling',
    icon: TrendingUp,
    description: 'Best-selling products based on order count',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    fields: [
      { key: 'productLimit', label: 'Products to Show', type: 'number', default: 8 },
      { key: 'ctaText', label: 'Call-to-Action Text', type: 'text', default: 'See All' },
      { key: 'ctaLink', label: 'CTA Link', type: 'text', default: '/shop' },
    ]
  },
  TopExpressDelivery: {
    label: 'Top Express Delivery',
    icon: TrendingUp,
    description: 'Fast delivery, trending products',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    fields: [
      { key: 'productLimit', label: 'Products to Show', type: 'number', default: 8 },
      { key: 'ctaText', label: 'Call-to-Action Text', type: 'text', default: 'View All' },
      { key: 'ctaLink', label: 'CTA Link', type: 'text', default: '/shop' },
    ]
  },
};

const PAGES = [
  { value: 'home', label: 'Home Page' },
  { value: 'shop', label: 'Shop Page' },
  { value: 'category', label: 'Category Pages' },
  { value: 'brand', label: 'Brand Pages' },
];

export default function DynamicSectionsPage() {
  const [sections, setSections] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState('home');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Fetch sections for selected page
  useEffect(() => {
    fetchSections();
  }, [selectedPage]);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const response = await getCmsSections(selectedPage);
      setSections(response.data || []);
    } catch (error) {
      toast.error('Failed to load sections');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = () => {
    setEditingSection(null);
    setSelectedType(null);
    setFormData({});
    setShowTypeSelector(true);
  };

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    setShowTypeSelector(false);
    setShowModal(true);
    setFormData({
      type,
      pageSlug: selectedPage,
      name: SECTION_TYPES[type].label,
      title: SECTION_TYPES[type].label,
      isActive: true,
      order: sections.length,
      config: {},
    });
  };

  const handleEditSection = (section: any) => {
    setEditingSection(section);
    setSelectedType(section.type);
    setFormData(section);
    setShowModal(true);
  };

  const handleSaveSection = async () => {
    try {
      if (editingSection) {
        await updateCmsSection(editingSection.id, formData);
        toast.success('Section updated successfully');
      } else {
        await createCmsSection(formData);
        toast.success('Section created successfully');
      }
      setShowModal(false);
      fetchSections();
    } catch (error) {
      toast.error('Failed to save section');
      console.error(error);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    try {
      await deleteCmsSection(id);
      toast.success('Section deleted successfully');
      fetchSections();
    } catch (error) {
      toast.error('Failed to delete section');
      console.error(error);
    }
  };

  const handleToggleActive = async (section: any) => {
    try {
      await updateCmsSection(section.id, { isActive: !section.isActive });
      toast.success(section.isActive ? 'Section disabled' : 'Section enabled');
      fetchSections();
    } catch (error) {
      toast.error('Failed to update section');
      console.error(error);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = sections.findIndex(s => s.id === draggedId);
    const targetIndex = sections.findIndex(s => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newSections = [...sections];
    const [draggedSection] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, draggedSection);

    setSections(newSections);
    setDraggedId(null);

    // Call reorder API
    try {
      const idsInOrder = newSections.map(s => s.id);
      await reorderCmsSections(selectedPage, idsInOrder);
      toast.success('Sections reordered');
    } catch (error) {
      toast.error('Failed to reorder sections');
      fetchSections(); // Refresh on error
    }
  };

  const currentType = selectedType ? SECTION_TYPES[selectedType] : null;
  const typeFields = currentType?.fields || [];

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          title="Dynamic Sections Manager"
          subtitle="Create, configure, and manage product sections across your store"
          icon={Grid3x3}
        />

        {/* Page Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Select Page:</label>
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {PAGES.map(page => (
              <option key={page.value} value={page.value}>
                {page.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddSection}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </div>

        {/* Sections List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading sections...</div>
          ) : sections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No sections yet. Create one to get started!</div>
          ) : (
            sections.map((section, index) => {
              const typeConfig = SECTION_TYPES[section.type];
              const Icon = typeConfig?.icon || Grid3x3;
              return (
                <div
                  key={section.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, section.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, section.id)}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition ${
                    draggedId === section.id ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                  <Icon className={`w-5 h-5 ${typeConfig?.color}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{section.title || section.name}</h3>
                    <p className="text-sm text-muted-foreground">{typeConfig?.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(section)}
                      className="p-2 hover:bg-gray-100 rounded transition"
                      title={section.isActive ? 'Disable' : 'Enable'}
                    >
                      {section.isActive ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEditSection(section)}
                      className="p-2 hover:bg-gray-100 rounded transition"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      className="p-2 hover:bg-gray-100 rounded transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Type Selector Modal */}
      {showTypeSelector && (
        <Modal isOpen={showTypeSelector} onClose={() => setShowTypeSelector(false)} title="Select Section Type">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {Object.entries(SECTION_TYPES).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectType(key)}
                  className={`p-4 border-2 rounded-lg text-left transition hover:border-primary ${config.bgColor}`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${config.color}`} />
                  <h3 className="font-semibold">{config.label}</h3>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Configuration Modal */}
      {showModal && currentType && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editingSection ? 'Edit' : 'Create'} ${currentType.label}`}>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Common Fields */}
            <FormField
              label="Section Name"
              value={formData.name || ''}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder="e.g., Homepage Flash Sales"
            />
            <FormField
              label="Display Title"
              value={formData.title || ''}
              onChange={(value) => setFormData({ ...formData, title: value })}
              placeholder="Title shown to customers"
            />
            <FormField
              label="Subtitle"
              value={formData.subtitle || ''}
              onChange={(value) => setFormData({ ...formData, subtitle: value })}
              placeholder="Optional subtitle"
            />
            <FormField
              label="Dedicated Page Slug"
              value={formData.dedicatedPageSlug || ''}
              onChange={(value) => setFormData({ ...formData, dedicatedPageSlug: value })}
              placeholder="e.g., flash-sales (for /shop/flash-sales)"
            />

            {/* Type-Specific Fields */}
            {typeFields.map(field => (
              <div key={field.key}>
                {field.type === 'text' && (
                  <FormField
                    label={field.label}
                    value={formData.config?.[field.key] || field.default || ''}
                    onChange={(value) => setFormData({
                      ...formData,
                      config: { ...formData.config, [field.key]: value }
                    })}
                    placeholder={field.default}
                  />
                )}
                {field.type === 'number' && (
                  <FormField
                    label={field.label}
                    type="number"
                    value={formData.config?.[field.key] || field.default || ''}
                    onChange={(value) => setFormData({
                      ...formData,
                      config: { ...formData.config, [field.key]: parseInt(value) }
                    })}
                  />
                )}
                {field.type === 'select' && (
                  <div>
                    <label className="text-sm font-medium">{field.label}</label>
                    <select
                      value={formData.config?.[field.key] || field.default || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, [field.key]: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                    >
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                )}
                {field.type === 'datetime' && (
                  <FormField
                    label={field.label}
                    type="datetime-local"
                    value={formData.config?.[field.key] || ''}
                    onChange={(value) => setFormData({
                      ...formData,
                      config: { ...formData.config, [field.key]: value }
                    })}
                  />
                )}
                {field.type === 'color' && (
                  <div>
                    <label className="text-sm font-medium">{field.label}</label>
                    <input
                      type="color"
                      value={formData.config?.[field.key] || field.default || '#000000'}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, [field.key]: e.target.value }
                      })}
                      className="w-full h-10 border rounded-lg mt-1 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive !== false}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium">Active</label>
            </div>
          </div>
          <ModalFooter
            onSave={handleSaveSection}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}
    </AdminShell>
  );
}
