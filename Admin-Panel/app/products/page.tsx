'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import { Package, Settings2 } from 'lucide-react';
import { createProduct, updateProduct, deleteProduct, getProducts, getCategories, getBrands, getSettings, updateSettings } from '@/lib/api';
import toast from 'react-hot-toast';
import CloudinaryUpload from '@/components/ui/file-upload';

type Product = {
  id: string; name: string; slug: string; sku: string; description: string;
  category: string; brand: string; price: string; salePrice: string;
  stock: number; weight: string; sold: number; status: string;
  featured: boolean;
  isNew: boolean;
  isFlashSale: boolean; flashSalePrice: string; flashSaleEnd: string;
  showGuaranteeBadge: boolean; showReturnsBadge: boolean;
  tags: string; metaTitle: string; metaDescription: string; imageUrl: string; specifications: string;
  images: string[];
  allowCredit: boolean;
  creditMessage: string;
  creditMinimum: string;
  condition: string;
  shippingFee: string;
  estimatedDeliveryDays: string;
  estimatedDeliveryMinDays: string;
  estimatedDeliveryMaxDays: string;
  popularItemText: string;
  easyReturnsText: string;
  fiveYearGuaranteeText: string;
  freeReturnsText: string;
  freeReturnsDescription: string;
  protectionDescription: string;
};

// Products loaded from API

const CATEGORIES = ['Electronics', 'Audio', 'Wearables', 'Clothing', 'Food & Beverages', 'Sports'];
const BRANDS = ['Apple', 'Samsung', 'Sony', 'Beats', 'Bose', 'Dell', 'LG', 'Huawei', 'Other'];
const STATUSES = ['Active', 'Inactive', 'Low Stock', 'Out of Stock'];
const BOOL_OPTS = ['No', 'Yes'];
const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const DEFAULT_CONDITION_OPTIONS = ['New', 'Used', 'Refurbished'];

const parseConditionOptions = (raw?: string | null): string[] => {
  if (!raw || !raw.trim()) return DEFAULT_CONDITION_OPTIONS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed
        .map((item) => String(item || '').trim())
        .filter(Boolean);
      return cleaned.length > 0 ? Array.from(new Set(cleaned)) : DEFAULT_CONDITION_OPTIONS;
    }
  } catch {}

  const cleaned = raw
    .split(/\r?\n|,|\|/)
    .map((item) => item.trim())
    .filter(Boolean);

  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : DEFAULT_CONDITION_OPTIONS;
};

const EMPTY_FORM = {
  name: '', slug: '', sku: '', description: '', category: 'Electronics', brand: 'Apple',
  price: '', salePrice: '', stock: '0', weight: '', status: 'Active',
  featured: 'No',
  isNew: 'No',
  isFlashSale: 'No', flashSalePrice: '', flashSaleEnd: '',
  allowCredit: 'No', creditMessage: '', creditMinimum: '',
  showGuaranteeBadge: 'No', showReturnsBadge: 'No',
  tags: '', metaTitle: '', metaDescription: '', imageUrl: '', specifications: '',
  condition: 'New',
  shippingFee: '',
  estimatedDeliveryDays: '3',
  estimatedDeliveryMinDays: '2',
  estimatedDeliveryMaxDays: '7',
  popularItemText: '',
  easyReturnsText: '',
  fiveYearGuaranteeText: '',
  freeReturnsText: '',
  freeReturnsDescription: '',
  protectionDescription: '',
};

function ProductsContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  // CSS variables — single source of truth from globals.css
  const card = 'var(--card)'; const border = 'var(--border)';
  const textMain = 'var(--text-main)'; const textMuted = 'var(--text-muted)';
  const surface = 'var(--surface)';

  const PAGE_SIZE = 25;
  const [data, setData] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadProducts = (page: number) => {
    setIsLoading(true);
    getProducts({ take: PAGE_SIZE, skip: page * PAGE_SIZE }).then(r => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      const normalized: Product[] = raw.map((p: any) => ({
        id: p.id || '',
        name: p.name || '',
        slug: p.slug || '',
        sku: p.sku || '',
        description: p.description || '',
        category: p.category?.name || '',
        brand: p.brand?.name || '',
        price: p.price != null ? String(Number(p.price)) : '',
        salePrice: p.salePrice != null && p.salePrice !== 0 ? String(Number(p.salePrice)) : '',
        stock: p.stockCurrent ?? p.inventory?.stock ?? p.stock ?? 0,
        weight: String(p.weight || ''),
        sold: p._count?.orderItems ?? 0,
        status: p.isActive !== false ? 'Active' : 'Inactive',
        featured: !!p.isFeatured,
        isNew: !!p.isNew,
        isFlashSale: !!p.isFlashSale,
        flashSalePrice: p.flashSalePrice != null ? String(Number(p.flashSalePrice)) : '',
        flashSaleEnd: p.flashSaleEnd ? new Date(p.flashSaleEnd).toISOString().slice(0, 16) : '',
        showGuaranteeBadge: !!p.showGuaranteeBadge,
        showReturnsBadge: !!p.showReturnsBadge,
        tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
        metaTitle: p.metaTitle || '',
        metaDescription: p.metaDescription || '',
        imageUrl: p.images?.[0]?.url || p.images?.[0] || '',
        images: Array.isArray(p.images) ? p.images.map((img: any) => img?.url || img || '').filter(Boolean) : [],
        allowCredit: !!p.allowCredit,
        creditMessage: p.creditMessage || '',
        creditMinimum: p.creditMinimum != null ? String(Number(p.creditMinimum)) : '',
        specifications: p.specifications || '',
        condition: p.condition || 'New',
        shippingFee: p.shippingFee != null ? String(Number(p.shippingFee)) : '',
        estimatedDeliveryDays: p.estimatedDeliveryDays != null ? String(Number(p.estimatedDeliveryDays)) : '3',
        estimatedDeliveryMinDays: p.estimatedDeliveryMinDays != null ? String(Number(p.estimatedDeliveryMinDays)) : '2',
        estimatedDeliveryMaxDays: p.estimatedDeliveryMaxDays != null ? String(Number(p.estimatedDeliveryMaxDays)) : '7',
        popularItemText: p.popularItemText || '',
        easyReturnsText: p.easyReturnsText || '',
        fiveYearGuaranteeText: p.fiveYearGuaranteeText || '',
        freeReturnsText: p.freeReturnsText || '',
        freeReturnsDescription: p.freeReturnsDescription || '',
        protectionDescription: p.protectionDescription || '',
      }));
      setData(normalized);
      // Update total from meta
      const meta = r.data?.meta;
      if (meta?.total !== undefined) setTotalCount(meta.total);
    }).catch((err: any) => {
      console.error('Failed to load products', err);
      setData([]);
      setTotalCount(0);
      const msg = err?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : (msg || 'check backend logs for the products endpoint');
      toast.error(`Failed to load products — ${detail}`);
    }).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadProducts(currentPage);
  }, [currentPage]);

  useEffect(() => {
    loadConditionSettings();
    getCategories().then(r => {
      const data = r?.data ?? r ?? [];
      const names = data.map((c: any) => c.name || c).filter(Boolean);
      if (names.length > 0) setCategories(names);
    }).catch(() => {});
    getBrands().then(r => {
      const data = r?.data ?? r ?? [];
      const names = data.map((b: any) => b.name || b).filter(Boolean);
      if (names.length > 0) setBrands(names);
    }).catch(() => {});
  }, []);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<Product | null>(null);
  const [deleteRow, setDeleteRow] = useState<Product | null>(null);
  const [viewRow, setViewRow] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [conditionOptions, setConditionOptions] = useState<string[]>(DEFAULT_CONDITION_OPTIONS);
  const [conditionSettingsOpen, setConditionSettingsOpen] = useState(false);
  const [conditionDraft, setConditionDraft] = useState(DEFAULT_CONDITION_OPTIONS.join('\n'));
  const [conditionSaving, setConditionSaving] = useState(false);

  const productConditionOptions = Array.from(new Set([
    ...(form.condition ? [form.condition] : []),
    ...conditionOptions,
  ]));

  const loadConditionSettings = async () => {
    try {
      const r: any = await getSettings();
      const settings = Array.isArray(r.data) ? r.data : [];
      const conditionSetting = settings.find((s: any) => s?.key === 'product_condition_options');
      const nextOptions = parseConditionOptions(conditionSetting?.value);
      setConditionOptions(nextOptions);
      setConditionDraft(nextOptions.join('\n'));
      setForm((current) => {
        if (!current.condition || !nextOptions.includes(current.condition)) {
          return { ...current, condition: nextOptions[0] };
        }
        return current;
      });
    } catch {
      setConditionOptions(DEFAULT_CONDITION_OPTIONS);
      setConditionDraft(DEFAULT_CONDITION_OPTIONS.join('\n'));
    }
  };

  const fp = (k: string) => (v: string) => setForm(f => {
    const updated = { ...f, [k]: v };
    if (k === 'name') updated.slug = toSlug(v);
    return updated;
  });

  const boolToStr = (v: boolean) => v ? 'Yes' : 'No';

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, condition: conditionOptions[0] || DEFAULT_CONDITION_OPTIONS[0] });
    setProductImages([]);
    setAddOpen(true);
  };
  const openEdit = (row: Record<string, unknown>) => {
    const r = row as unknown as Product;
    setForm({
      name: r.name, slug: r.slug || toSlug(r.name), sku: r.sku, description: r.description || '',
      category: r.category, brand: r.brand || 'Apple', price: r.price, salePrice: r.salePrice || '',
      stock: String(r.stock), weight: r.weight || '',       status: r.status,
      featured: boolToStr(r.featured),
      isNew: boolToStr(r.isNew),
      isFlashSale: boolToStr(r.isFlashSale),
      flashSalePrice: r.flashSalePrice || '',
      flashSaleEnd: r.flashSaleEnd || '',
      allowCredit: boolToStr(r.allowCredit),
      creditMessage: r.creditMessage || '',
      creditMinimum: r.creditMinimum || '',
      showGuaranteeBadge: boolToStr(r.showGuaranteeBadge),
      showReturnsBadge: boolToStr(r.showReturnsBadge),
      tags: r.tags || '', metaTitle: r.metaTitle || '', metaDescription: r.metaDescription || '',
      imageUrl: r.imageUrl || '', specifications: r.specifications || '',
      condition: r.condition || conditionOptions[0] || DEFAULT_CONDITION_OPTIONS[0],
      shippingFee: r.shippingFee || '',
      estimatedDeliveryDays: r.estimatedDeliveryDays || '3',
      estimatedDeliveryMinDays: r.estimatedDeliveryMinDays || '2',
      estimatedDeliveryMaxDays: r.estimatedDeliveryMaxDays || '7',
      popularItemText: r.popularItemText || '',
      easyReturnsText: r.easyReturnsText || '',
      fiveYearGuaranteeText: r.fiveYearGuaranteeText || '',
      freeReturnsText: r.freeReturnsText || '',
      freeReturnsDescription: r.freeReturnsDescription || '',
      protectionDescription: r.protectionDescription || '',
    });
    setProductImages(r.images && r.images.length > 0 ? r.images : r.imageUrl ? [r.imageUrl] : []);
    setEditRow(r);
  };
  const openDelete = (row: Record<string, unknown>) => setDeleteRow(row as unknown as Product);
  const openView = (row: Record<string, unknown>) => setViewRow(row as unknown as Product);

  const strToBool = (v: string) => v === 'Yes';


  // Build backend-compatible specifications array from textarea text
  const buildSpecsPayload = (specsStr: string): { key: string; value: string }[] | undefined => {
    if (!specsStr || !specsStr.trim()) return undefined;

    try {
      const parsed = JSON.parse(specsStr);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => ({
            key: String(item?.key ?? '').trim(),
            value: String(item?.value ?? '').trim(),
          }))
          .filter((item) => item.key && item.value);
      }
    } catch {}

    const entries = specsStr
      .split(/\n|\|/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    const pairs = entries
      .map((entry) => {
        const ci = entry.indexOf(':');
        if (ci === -1) {
          return { key: 'Specifications', value: entry };
        }
        return {
          key: entry.substring(0, ci).trim(),
          value: entry.substring(ci + 1).trim(),
        };
      })
      .filter((item) => item.key && item.value);

    return pairs.length > 0 ? pairs : undefined;
  };

  // Build the payload that matches the backend UpdateProductDto / CreateProductDto
  const buildProductPayload = (productImages: string[]) => {
    const payload: Record<string, unknown> = {
      name: form.name,
      slug: form.slug || undefined,
      sku: form.sku || undefined,
      description: form.description || undefined,
      price: form.price ? Number(form.price) : undefined,
      salePrice: form.salePrice ? Number(form.salePrice) : undefined,
      weight: form.weight || undefined,
      stockTotal: Number(form.stock),
      stockCurrent: Number(form.stock),
      isActive: form.status !== 'Inactive',
      isFeatured: strToBool(form.featured),
      isNew: strToBool(form.isNew),
      isFlashSale: strToBool(form.isFlashSale),
      allowCredit: strToBool(form.allowCredit),
      creditMessage: strToBool(form.allowCredit) ? (form.creditMessage || undefined) : undefined,
      creditMinimum: strToBool(form.allowCredit)
        ? (form.creditMinimum ? Number(form.creditMinimum) : 0)
        : undefined,
      flashSalePrice: strToBool(form.isFlashSale) && form.flashSalePrice ? Number(form.flashSalePrice) : null,
      flashSaleEnd: strToBool(form.isFlashSale) && form.flashSaleEnd ? form.flashSaleEnd : null,
      hasFiveYearGuarantee: strToBool(form.showGuaranteeBadge),
      hasFreeReturns: strToBool(form.showReturnsBadge),
      categorySlug: toSlug(form.category),
      brandSlug: toSlug(form.brand),
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      condition: form.condition,
      shippingFee: form.shippingFee ? Number(form.shippingFee) : undefined,
      estimatedDeliveryDays: form.estimatedDeliveryDays ? Number(form.estimatedDeliveryDays) : undefined,
      estimatedDeliveryMinDays: form.estimatedDeliveryMinDays ? Number(form.estimatedDeliveryMinDays) : undefined,
      estimatedDeliveryMaxDays: form.estimatedDeliveryMaxDays ? Number(form.estimatedDeliveryMaxDays) : undefined,
      popularItemText: form.popularItemText || undefined,
      easyReturnsText: form.easyReturnsText || undefined,
      fiveYearGuaranteeText: form.fiveYearGuaranteeText || undefined,
      freeReturnsText: form.freeReturnsText || undefined,
      freeReturnsDescription: form.freeReturnsDescription || undefined,
      protectionDescription: form.protectionDescription || undefined,
    };
    if (productImages.length > 0) {
      payload.imageDataUrls = productImages;
      payload.replaceImages = true;
    }
    const specs = buildSpecsPayload(form.specifications);
    if (specs) payload.specifications = specs;
    return payload;
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.sku.trim()) { toast.error('Name and SKU are required'); return; }
    setLoading(true);
    try {
      await createProduct(buildProductPayload(productImages));
      const newItem: Product = {
        id: `PRD${String(Date.now()).slice(-3)}`, ...form,
        imageUrl: productImages[0] || '',
        images: productImages,
        stock: Number(form.stock), sold: 0,
        featured: strToBool(form.featured),
        isNew: strToBool(form.isNew),
        isFlashSale: strToBool(form.isFlashSale),
        allowCredit: strToBool(form.allowCredit),
        creditMessage: form.creditMessage,
        creditMinimum: form.creditMinimum,
        showGuaranteeBadge: strToBool(form.showGuaranteeBadge),
        showReturnsBadge: strToBool(form.showReturnsBadge),
      };
      setData(d => [...d, newItem]);
      toast.success('Product added'); setAddOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : (msg || 'check your API connection');
      toast.error(`Failed to add product — ${detail}`);
    }
    setLoading(false);
  };

  const handleEdit = async () => {
    if (!editRow) return;
    setLoading(true);
    try {
      await updateProduct(editRow.id, buildProductPayload(productImages));
      setData(d => d.map(p => p.id === editRow.id ? {
        ...p, ...form,
        imageUrl: productImages[0] || p.imageUrl,
        images: productImages,
        stock: Number(form.stock),
        featured: strToBool(form.featured),
        isNew: strToBool(form.isNew),
        isFlashSale: strToBool(form.isFlashSale),
        allowCredit: strToBool(form.allowCredit),
        creditMessage: form.creditMessage,
        creditMinimum: form.creditMinimum,
        showGuaranteeBadge: strToBool(form.showGuaranteeBadge),
        showReturnsBadge: strToBool(form.showReturnsBadge),
      } : p));
      toast.success('Product updated'); setEditRow(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : (msg || 'check your API connection');
      toast.error(`Failed to update product — ${detail}`);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setLoading(true);
    try {
      await deleteProduct(deleteRow.id);
      setData(d => d.filter(p => p.id !== deleteRow.id));
      toast.success('Product deleted'); setDeleteRow(null);
    } catch { toast.error('Failed to delete product — check your API connection'); }
    setLoading(false);
  };

  const handleSaveConditionOptions = async () => {
    const nextOptions = parseConditionOptions(conditionDraft);
    if (nextOptions.length === 0) {
      toast.error('Add at least one product condition option');
      return;
    }

    setConditionSaving(true);
    try {
      await updateSettings({
        product_condition_options: JSON.stringify(nextOptions),
      });
      setConditionOptions(nextOptions);
      setConditionDraft(nextOptions.join('\n'));
      setForm((current) => ({
        ...current,
        condition: nextOptions.includes(current.condition) ? current.condition : nextOptions[0],
      }));
      toast.success('Product condition options updated');
      setConditionSettingsOpen(false);
    } catch {
      toast.error('Failed to save condition options');
    }
    setConditionSaving(false);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      Active: { bg: 'rgba(31,168,154,0.12)', color: '#1FA89A' },
      Inactive: { bg: 'rgba(100,116,139,0.1)', color: '#8E9AAF' },
      'Low Stock': { bg: 'rgba(255,193,7,0.12)', color: '#FFC107' },
      'Out of Stock': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    };
    const s = map[status] || map.Inactive;
    return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: s.bg, color: s.color }}>{status}</span>;
  };

  const columns: Column[] = [
    { key: 'id', label: 'ID', width: '90px' },
    { key: 'imageUrl', label: 'Image', width: '60px', render: (v) => {
      const url = String(v || '');
      return url ? (
        <img src={url} alt="" style={{width:42,height:42,borderRadius:'8px',objectFit:'cover',border:`1px solid ${border}`,display:'block'}} onError={(e:any)=>{e.target.style.opacity='0.2';}} />
      ) : (
        <div style={{width:42,height:42,borderRadius:'8px',background:surface,border:`1px solid ${border}`,display:'flex',alignItems:'center',justifyContent:'center',color:textMuted}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
        </div>
      );
    }},
    { key: 'name', label: 'Product', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600, color: textMain }}>{String(v)}</div>
        <div style={{ fontSize: '11px', color: textMuted, marginTop: '2px' }}>{String((row as unknown as Product).sku)} · {String((row as unknown as Product).brand)}</div>
      </div>
    )},
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price', render: (v, row) => {
      const r = row as unknown as Product;
      return (
        <div>
          <div style={{ fontWeight: 700, color: textMain }}>{String(v)}</div>
          {r.salePrice && <div style={{ fontSize: '11px', color: '#1FA89A', marginTop: '1px' }}>Sale: {r.salePrice}</div>}
        </div>
      );
    }},
    { key: 'stock', label: 'Stock', render: (v) => <span style={{ fontWeight: 700, color: Number(v) === 0 ? '#ef4444' : Number(v) < 10 ? '#FFC107' : '#1FA89A' }}>{String(v)}</span> },
    { key: 'featured', label: 'Featured', render: (v) => <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: v ? 'rgba(99,102,241,0.12)' : 'rgba(100,116,139,0.08)', color: v ? '#6366f1' : '#8E9AAF' }}>{v ? 'Yes' : 'No'}</span> },
    { key: 'status', label: 'Status', render: (v) => statusBadge(String(v)) },
  ];

  const sectionLabel = (label: string) => (
    <div style={{ fontSize: '11px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 0 4px', borderBottom: `1px solid ${border}`, marginBottom: '12px' }}>{label}</div>
  );

  const formFields = (
    <>
      {sectionLabel('Basic Information')}
      <FormField label="Product Name *" value={form.name} onChange={fp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Samsung Galaxy S24 Ultra" />
      <FormField label="URL Slug" value={form.slug} onChange={fp('slug')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="auto-generated from name" />
      <FormField label="SKU / Product Code *" value={form.sku} onChange={fp('sku')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. SAM-S24U-BLK" />
      <FormField label="Description" value={form.description} onChange={fp('description')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Describe this product in detail — features, what's in the box, warranty info..." type="textarea" />

      {sectionLabel('Pricing & Inventory')}
      <FormField label="Price (USD) *" value={form.price} onChange={fp('price')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0.00" />
      <FormField label="Sale Price (optional)" value={form.salePrice} onChange={fp('salePrice')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Optional — leave blank if no sale" />
      <FormField label="Stock Qty" value={form.stock} onChange={fp('stock')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0" />
      <FormField label="Weight (KG)" value={form.weight} onChange={fp('weight')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 0.5" />

      {sectionLabel('Categorization')}
      <FormField label="Category" value={form.category} onChange={fp('category')} options={categories.length > 0 ? categories : ['Electronics', 'Audio', 'Wearables', 'Clothing', 'Food & Beverages', 'Sports']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Brand" value={form.brand} onChange={fp('brand')} options={brands.length > 0 ? brands : ['Apple', 'Samsung', 'Sony', 'Beats', 'Bose', 'Dell', 'LG', 'Huawei', 'Other']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />

      {sectionLabel('Product Images')}
      <div>
        {productImages.length > 0 && (
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'12px'}}>
            {productImages.map((img, idx) => (
              <div key={idx} style={{position:'relative',width:'80px',height:'80px',flexShrink:0}}>
                <img src={img} alt="" style={{width:'80px',height:'80px',objectFit:'cover',borderRadius:'8px',border:idx===0?'2px solid #1FA89A':`1px solid ${border}`}} onError={(e:any)=>{e.target.style.opacity='0.3';}} />
                {idx===0 && <span style={{position:'absolute',bottom:'3px',left:'3px',background:'#1FA89A',color:'white',fontSize:'8px',fontWeight:700,padding:'1px 4px',borderRadius:'3px',letterSpacing:'0.3px'}}>MAIN</span>}
                <button type="button" onClick={()=>setProductImages(imgs=>imgs.filter((_,i)=>i!==idx))} style={{position:'absolute',top:'3px',right:'3px',width:'18px',height:'18px',borderRadius:'50%',background:'rgba(239,68,68,0.9)',border:'none',color:'white',cursor:'pointer',fontSize:'12px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:0,lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
        )}
        <CloudinaryUpload
          multiple
          onChange={(url) => setProductImages(imgs => [...imgs, url])}
          accept="image/*"
          folder="kryros/products"
          showUrlInput={false}
          isDark={isDark}
          border={border}
          surface={surface}
          textMuted={textMuted}
          textMain={textMain}
        />
        <div style={{fontSize:'11px',color:textMuted,marginTop:'4px'}}>First image = main listing image (marked MAIN). Click × to remove. Drag to reorder coming soon.</div>
      </div>

      {sectionLabel('Specifications')}
      <FormField label="Specifications" value={form.specifications} onChange={fp('specifications')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Color: Black | RAM: 8GB | Storage: 256GB | Screen: 6.7 inch (or one per line)" type="textarea" />

      {sectionLabel('Tags')}
      <FormField label="Tags (comma-separated)" value={form.tags} onChange={fp('tags')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. apple, iphone, smartphone, 5G" />

      {sectionLabel('SEO Meta')}
      <FormField label="Meta Title" value={form.metaTitle} onChange={fp('metaTitle')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Leave blank to use product name" />
      <FormField label="Meta Description" value={form.metaDescription} onChange={fp('metaDescription')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Short description for search engines (max 160 chars)" type="textarea" />

      {sectionLabel('Visibility & Status')}
      <FormField label="Status" value={form.status} onChange={fp('status')} options={STATUSES} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Featured on Homepage" value={form.featured} onChange={fp('featured')} options={BOOL_OPTS} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Mark as New Arrival" value={form.isNew} onChange={fp('isNew')} options={BOOL_OPTS} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />

      {sectionLabel('Flash Sale')}
      <FormField label="Enable Flash Sale" value={form.isFlashSale} onChange={fp('isFlashSale')} options={BOOL_OPTS} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      {strToBool(form.isFlashSale) && (
        <>
          <FormField label="Flash Sale Price" value={form.flashSalePrice} onChange={fp('flashSalePrice')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Discounted price during flash sale" />
          <FormField label="Flash Sale End Date & Time" value={form.flashSaleEnd} onChange={fp('flashSaleEnd')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} type="datetime-local" />
        </>
      )}

      {sectionLabel('Credit / Get Now')}
      <FormField label="Allow Credit Purchase" value={form.allowCredit} onChange={fp('allowCredit')} options={BOOL_OPTS} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      {strToBool(form.allowCredit) && (
        <>
          <FormField label="Credit Message" value={form.creditMessage} onChange={fp('creditMessage')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Get Now, Pay Later" />
          <FormField label="Minimum Deposit" value={form.creditMinimum} onChange={fp('creditMinimum')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 200" />
        </>
      )}

      {sectionLabel('Trust & Guarantee Badges')}
      <FormField label="Show Guarantee Badge" value={form.showGuaranteeBadge} onChange={fp('showGuaranteeBadge')} options={BOOL_OPTS} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Show Free Returns Badge" value={form.showReturnsBadge} onChange={fp('showReturnsBadge')} options={BOOL_OPTS} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />

      {sectionLabel('Product Condition & Shipping')}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', marginBottom:'8px' }}>
        <div style={{ fontSize:'12px', color:textMuted }}>
          Change the available product conditions from the same place the upload form uses.
        </div>
        <button
          type="button"
          onClick={() => setConditionSettingsOpen(true)}
          style={{
            display:'inline-flex',
            alignItems:'center',
            gap:'6px',
            padding:'8px 12px',
            borderRadius:'8px',
            border:`1px solid ${border}`,
            background:surface,
            color:textMain,
            cursor:'pointer',
            fontSize:'12px',
            fontWeight:600,
            whiteSpace:'nowrap',
          }}
        >
          <Settings2 size={14} />
          Edit Conditions
        </button>
      </div>
      <FormField label="Product Condition" value={form.condition} onChange={fp('condition')} options={productConditionOptions} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Shipping Fee (USD, optional)" value={form.shippingFee} onChange={fp('shippingFee')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Leave blank for free shipping" />
      <FormField label="Estimated Delivery Days (Min)" value={form.estimatedDeliveryMinDays} onChange={fp('estimatedDeliveryMinDays')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="2" />
      <FormField label="Estimated Delivery Days (Max)" value={form.estimatedDeliveryMaxDays} onChange={fp('estimatedDeliveryMaxDays')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="7" />
      <FormField label="Product Card Promo Text (shown before stock status on the frontend)" value={form.popularItemText} onChange={fp('popularItemText')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Express Checkout, Jumia Express, Fast Delivery, Pay Small Small" />
      <FormField label="Easy Returns Text (optional)" value={form.easyReturnsText} onChange={fp('easyReturnsText')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g., 30-day returns accepted" />
      <FormField label="Guarantee Text (optional)" value={form.fiveYearGuaranteeText} onChange={fp('fiveYearGuaranteeText')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g., Protected" />
      <FormField label="Free Returns Text (optional)" value={form.freeReturnsText} onChange={fp('freeReturnsText')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g., Returns accepted" />
      <FormField label="Free Returns Description (optional)" value={form.freeReturnsDescription} onChange={fp('freeReturnsDescription')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g., Easy 30-day returns" />
      <FormField label="Protection Description (optional)" value={form.protectionDescription} onChange={fp('protectionDescription')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g., Delivery cover against loss or damage" />
    </>
  );

  return (
    <div>
      <PageHeader title="Products" subtitle="Manage your product catalogue" icon={Package} onAdd={openAdd} addLabel="Add Product" />
      {isLoading ? (
        <div style={{ padding: '16px 0' }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{
              height: 52,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              borderRadius: 8,
              marginBottom: 8,
              animation: 'skeletonPulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.08}s`,
            }} />
          ))}
          <style>{`@keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={data as unknown as Record<string, unknown>[]} searchPlaceholder="Search products..." onEdit={openEdit} onDelete={openDelete} onView={openView} />
          {/* Pagination Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '12px 0', borderTop: `1px solid ${border}` }}>
            <span style={{ fontSize: 13, color: textMuted }}>
              {totalCount > 0 ? `Showing ${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} of ${totalCount} products` : `${data.length} products`}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: `1px solid ${border}`,
                  background: surface, color: textMain,
                  cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 0 ? 0.4 : 1, fontSize: 13,
                }}
              >← Prev</button>
              <span style={{ padding: '6px 12px', fontSize: 13, color: textMuted, background: card, border: `1px solid ${border}`, borderRadius: 6 }}>
                Page {currentPage + 1}{totalCount > 0 ? ` of ${Math.ceil(totalCount / PAGE_SIZE)}` : ''}
              </span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={data.length < PAGE_SIZE && totalCount > 0 ? (currentPage + 1) * PAGE_SIZE >= totalCount : data.length < PAGE_SIZE}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: `1px solid ${border}`,
                  background: surface, color: textMain,
                  cursor: 'pointer', fontSize: 13,
                  opacity: data.length < PAGE_SIZE ? 0.4 : 1,
                }}
              >Next →</button>
            </div>
          </div>
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Product">
        {formFields}
        <ModalFooter onClose={() => setAddOpen(false)} onSubmit={handleAdd} loading={loading} submitLabel="Create Product" isDark={isDark} border={border} textMain={textMain} />
      </Modal>

      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name ?? ''}`}>
        {formFields}
        <ModalFooter onClose={() => setEditRow(null)} onSubmit={handleEdit} loading={loading} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain} />
      </Modal>

      {viewRow && (
        <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Product Details">
          <FormField label="Name" value={viewRow.name} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="SKU" value={viewRow.sku} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Brand" value={viewRow.brand} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Category" value={viewRow.category} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Price" value={viewRow.price} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Sale Price" value={viewRow.salePrice || '—'} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Stock" value={String(viewRow.stock)} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Weight (KG)" value={viewRow.weight || '—'} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Description" value={viewRow.description || '—'} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Specifications" value={viewRow.specifications || '—'} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Tags" value={viewRow.tags || '—'} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Status" value={viewRow.status} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <button onClick={() => setViewRow(null)} style={{ width: '100%', padding: '10px', borderRadius: '9px', background: surface, border: `1px solid ${border}`, color: textMain, fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter)', marginTop: '8px' }}>Close</button>
        </Modal>
      )}

      <ConfirmDialog open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} loading={loading} title="Delete Product" message={`Delete "${deleteRow?.name}" permanently?`} />

      <Modal open={conditionSettingsOpen} onClose={() => setConditionSettingsOpen(false)} title="Edit Product Conditions" maxWidth="560px">
        <div style={{ fontSize:'13px', color:textMuted, lineHeight:1.6, marginBottom:'14px' }}>
          Add one condition per line. These options will appear in the product upload form, and whatever you choose for a product will be saved and shown on the frontend.
        </div>
        <FormField
          label="Condition Options"
          value={conditionDraft}
          onChange={setConditionDraft}
          type="textarea"
          isDark={isDark}
          border={border}
          textMain={textMain}
          textMuted={textMuted}
          surface={surface}
          placeholder={'New\nUsed\nRefurbished\nOpen Box'}
        />
        <ModalFooter
          onClose={() => setConditionSettingsOpen(false)}
          onSubmit={handleSaveConditionOptions}
          loading={conditionSaving}
          submitLabel="Save Conditions"
          isDark={isDark}
          border={border}
          textMain={textMain}
        />
      </Modal>
    </div>
  );
}

export default function ProductsPage() { return <AdminShell><ProductsContent /></AdminShell>; }
