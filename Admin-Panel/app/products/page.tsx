'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { Package, Settings2 } from 'lucide-react';
import { createProduct, updateProduct, deleteProduct, getProducts, getBrands, getCategories, getSettings, updateSettings } from '@/lib/api';
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
  creditDuration: string;
  creditDurationType: string;
  creditInstallmentFrequency: string;
  creditInstallmentCount: string;
  creditInstallmentAmount: string;
  isWholesaleOnly: boolean;
  wholesalePrice: string;
  wholesaleMoq: string;
  unitsPerPack: string;
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
  name: '', slug: '', sku: '', description: '', category: 'General', brand: 'Apple',
  price: '', salePrice: '', stock: '0', weight: '', status: 'Active',
  featured: 'No',
  isNew: 'No',
  isFlashSale: 'No', flashSalePrice: '', flashSaleEnd: '',
  allowCredit: 'No', creditMessage: '', creditMinimum: '', creditDuration: '12', creditDurationType: 'weeks', creditInstallmentFrequency: 'weekly', creditInstallmentCount: '13', creditInstallmentAmount: '',
  isWholesaleOnly: 'No', wholesalePrice: '', wholesaleMoq: '', unitsPerPack: '1',
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
  const searchParams = useSearchParams();
  const hasAutoOpened = useRef(false);
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
        category: p.category?.name || 'General',
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
        creditDuration: p.creditDuration != null ? String(Number(p.creditDuration)) : '12',
        creditDurationType: p.creditDurationType || 'weeks',
        creditInstallmentFrequency: p.creditInstallmentFrequency || 'weekly',
        creditInstallmentCount: p.creditInstallmentCount != null ? String(Number(p.creditInstallmentCount)) : '',
        creditInstallmentAmount: p.creditInstallmentAmount != null ? String(Number(p.creditInstallmentAmount)) : '',
        isWholesaleOnly: !!p.isWholesaleOnly,
        wholesalePrice: p.wholesalePrice != null ? String(Number(p.wholesalePrice)) : '',
        wholesaleMoq: p.wholesaleMoq != null ? String(Number(p.wholesaleMoq)) : '',
        unitsPerPack: p.unitsPerPack != null ? String(Number(p.unitsPerPack)) : '1',
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

  // Handle deep link from notification (?id=...)
  useEffect(() => {
    const productId = searchParams.get('id');
    if (productId && !hasAutoOpened.current && !isLoading && data.length > 0) {
      const targetProduct = data.find(p => p.id === productId);
      if (targetProduct) {
        hasAutoOpened.current = true;
        setViewRow(targetProduct);
      }
    }
  }, [searchParams, isLoading, data]);

  useEffect(() => {
    loadConditionSettings();
    getBrands().then(r => {
      const data = r?.data ?? r ?? [];
      const names = data.map((b: any) => b.name || b).filter(Boolean);
      if (names.length > 0) setBrands(names);
    }).catch(() => {});
    getCategories().then(r => {
      const data = r?.data ?? r ?? [];
      const options = data
        .map((c: any) => ({ name: c?.name || '', slug: c?.slug || toSlug(c?.name || '') }))
        .filter((c: { name: string; slug: string }) => c.name && c.slug);
      if (options.length > 0) setCategories(options);
    }).catch(() => {});
  }, []);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<Product | null>(null);
  const [deleteRow, setDeleteRow] = useState<Product | null>(null);
  const [viewRow, setViewRow] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
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
      category: r.category || 'General', brand: r.brand || 'Apple', price: r.price, salePrice: r.salePrice || '',
      stock: String(r.stock), weight: r.weight || '',       status: r.status,
      featured: boolToStr(r.featured),
      isNew: boolToStr(r.isNew),
      isFlashSale: boolToStr(r.isFlashSale),
      flashSalePrice: r.flashSalePrice || '',
      flashSaleEnd: r.flashSaleEnd || '',
      allowCredit: boolToStr(r.allowCredit),
      creditMessage: r.creditMessage || '',
      creditMinimum: r.creditMinimum || '',
      creditDuration: r.creditDuration || '12',
      creditDurationType: r.creditDurationType || 'weeks',
      creditInstallmentFrequency: r.creditInstallmentFrequency || 'weekly',
      creditInstallmentCount: r.creditInstallmentCount != null ? String(r.creditInstallmentCount) : '',
      creditInstallmentAmount: r.creditInstallmentAmount != null ? String(r.creditInstallmentAmount) : '',
      isWholesaleOnly: boolToStr(r.isWholesaleOnly),
      wholesalePrice: r.wholesalePrice || '',
      wholesaleMoq: r.wholesaleMoq || '',
      unitsPerPack: r.unitsPerPack || '1',
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
    const selectedCategory = categories.find((category) => category.name === form.category);
    const payload: Record<string, unknown> = {
      name: form.name,
      slug: form.slug || undefined,
      sku: form.sku || undefined,
      description: form.description || undefined,
      price: form.price ? Number(form.price) : 0,
      salePrice: form.salePrice ? Number(form.salePrice) : null,
      weight: form.weight || undefined,
      stockTotal: Number(form.stock),
      stockCurrent: Number(form.stock),
      isActive: form.status !== 'Inactive',
      isFeatured: strToBool(form.featured),
      isNew: strToBool(form.isNew),
      isFlashSale: strToBool(form.isFlashSale),
      allowCredit: strToBool(form.allowCredit),
      creditMessage: strToBool(form.allowCredit) ? (form.creditMessage || undefined) : undefined,
      categorySlug: selectedCategory?.slug || toSlug(form.category || 'general'),
      creditMinimum: strToBool(form.allowCredit)
        ? (form.creditMinimum ? Number(form.creditMinimum) : 0)
        : undefined,
      creditDuration: strToBool(form.allowCredit)
        ? (form.creditDuration ? Number(form.creditDuration) : 12)
        : undefined,
      creditDurationType: strToBool(form.allowCredit) ? (form.creditDurationType || 'weeks') : undefined,
      creditInstallmentFrequency: strToBool(form.allowCredit) ? (form.creditInstallmentFrequency || 'weekly') : undefined,
      creditInstallmentCount: strToBool(form.allowCredit)
        ? (form.creditInstallmentCount ? Number(form.creditInstallmentCount) : undefined)
        : undefined,
      creditInstallmentAmount: strToBool(form.allowCredit)
        ? (form.creditInstallmentAmount ? Number(form.creditInstallmentAmount) : undefined)
        : undefined,
      flashSalePrice: strToBool(form.isFlashSale) && form.flashSalePrice ? Number(form.flashSalePrice) : null,
      flashSaleEnd: strToBool(form.isFlashSale) && form.flashSaleEnd ? form.flashSaleEnd : null,
      hasFiveYearGuarantee: strToBool(form.showGuaranteeBadge),
      hasFreeReturns: strToBool(form.showReturnsBadge),
      brandSlug: toSlug(form.brand),
      isWholesaleOnly: strToBool(form.isWholesaleOnly),
      wholesalePrice: strToBool(form.isWholesaleOnly) && form.wholesalePrice ? Number(form.wholesalePrice) : undefined,
      wholesaleMoq: strToBool(form.isWholesaleOnly) && form.wholesaleMoq ? Number(form.wholesaleMoq) : undefined,
      unitsPerPack: form.unitsPerPack ? Number(form.unitsPerPack) : undefined,
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
        isWholesaleOnly: strToBool(form.isWholesaleOnly),
        wholesalePrice: form.wholesalePrice,
        wholesaleMoq: form.wholesaleMoq,
        unitsPerPack: form.unitsPerPack,
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
        isWholesaleOnly: strToBool(form.isWholesaleOnly),
        wholesalePrice: form.wholesalePrice,
        wholesaleMoq: form.wholesaleMoq,
        unitsPerPack: form.unitsPerPack,
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
      Active: { bg: 'rgba(192,21,27,0.10)', color: 'var(--primary)' },
      Inactive: { bg: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)' },
      'Low Stock': { bg: 'rgba(246,176,30,0.12)', color: 'var(--gold)' },
      'Out of Stock': { bg: 'rgba(214,48,49,0.12)', color: 'var(--danger)' },
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
        <div style={{ fontSize: '11px', color: textMuted, marginTop: '2px' }}>{String((row as unknown as Product).sku)} · {String((row as unknown as Product).brand)} · {String((row as unknown as Product).category)}</div>
      </div>
    )},
    { key: 'price', label: 'Price', render: (v, row) => {
      const r = row as unknown as Product;
      return (
        <div>
          <div style={{ fontWeight: 700, color: textMain }}>{String(v)}</div>
          {r.salePrice && <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '1px' }}>Sale: {r.salePrice}</div>}
        </div>
      );
    }},
    { key: 'stock', label: 'Stock', render: (v) => <span style={{ fontWeight: 700, color: Number(v) === 0 ? 'var(--danger)' : Number(v) < 10 ? 'var(--gold)' : 'var(--primary)' }}>{String(v)}</span> },
    { key: 'featured', label: 'Featured', render: (v) => <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: v ? 'rgba(99,102,241,0.12)' : 'rgba(100,116,139,0.08)', color: v ? 'var(--secondary)' : 'var(--text-muted)' }}>{v ? 'Yes' : 'No'}</span> },
    { key: 'status', label: 'Status', render: (v) => statusBadge(String(v)) },
  ];

  const sectionLabel = (label: string) => (
    <div style={{ fontSize: '11px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 0 4px', borderBottom: `1px solid ${border}`, marginBottom: '12px' }}>{label}</div>
  );

  const formFields = (
    <>
      {sectionLabel('Basic Information')}
      <FormField label="Product Name *" value={form.name} onChange={fp('name')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Samsung Galaxy S24 Ultra" />
      <FormField label="URL Slug" value={form.slug} onChange={fp('slug')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="auto-generated from name" />
      <FormField label="SKU / Product Code *" value={form.sku} onChange={fp('sku')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. SAM-S24U-BLK" />
      <FormField label="Description" value={form.description} onChange={fp('description')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Describe this product in detail — features, what's in the box, warranty info..." type="textarea" />

      {sectionLabel('Pricing & Inventory')}
      <FormField label="Price (USD) *" value={form.price} onChange={fp('price')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0.00" />
      <FormField label="Sale Price (optional)" value={form.salePrice} onChange={fp('salePrice')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Optional — leave blank if no sale" />
      <FormField label="Stock Qty" value={form.stock} onChange={fp('stock')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0" />
      <FormField label="Weight (KG)" value={form.weight} onChange={fp('weight')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 0.5" />

      {sectionLabel('Categorization')}
      <FormField label="Category" value={form.category} onChange={fp('category')} options={categories.length > 0 ? categories.map((category) => category.name) : ['General']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Brand" value={form.brand} onChange={fp('brand')} options={brands.length > 0 ? brands : ['Apple', 'Samsung', 'Sony', 'Beats', 'Bose', 'Dell', 'LG', 'Huawei', 'Other']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />

      {sectionLabel('Product Images')}
      <div>
        {productImages.length > 0 && (
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'12px'}}>
            {productImages.map((img, idx) => (
              <div key={idx} style={{position:'relative',width:'80px',height:'80px',flexShrink:0}}>
                <img src={img} alt="" style={{width:'80px',height:'80px',objectFit:'cover',borderRadius:'8px',border:idx===0?'2px solid var(--primary)':`1px solid ${border}`}} onError={(e:any)=>{e.target.style.opacity='0.3';}} />
                {idx===0 && <span style={{position:'absolute',bottom:'3px',left:'3px',background:'var(--primary)',color:'white',fontSize:'8px',fontWeight:700,padding:'1px 4px',borderRadius:'3px',letterSpacing:'0.3px'}}>MAIN</span>}
                <button type="button" onClick={()=>setProductImages(imgs=>imgs.filter((_,i)=>i!==idx))} style={{position:'absolute',top:'3px',right:'3px',width:'18px',height:'18px',borderRadius:'50%',background:'rgba(239,68,68,0.9)',border:'none',color:'white',cursor:'pointer',fontSize:'12px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:0,lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
        )}
        <CloudinaryUpload
          multiple
          onChange={(url) => { if (url) setProductImages(imgs => imgs.includes(url) ? imgs : [...imgs, url]); }}
          accept="image/*"
          folder="kryros/products"
          showUrlInput={true}
          border={border}
          surface={surface}
          textMuted={textMuted}
          textMain={textMain}
        />
        <div style={{fontSize:'11px',color:textMuted,marginTop:'4px'}}>First image = main listing image (marked MAIN). Click × to remove. You can upload a file or paste an image URL above.</div>
      </div>

      {sectionLabel('Specifications')}
      <FormField label="Specifications" value={form.specifications} onChange={fp('specifications')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Color: Black | RAM: 8GB | Storage: 256GB | Screen: 6.7 inch (or one per line)" type="textarea" />

      {sectionLabel('Tags')}
      <FormField label="Tags (comma-separated)" value={form.tags} onChange={fp('tags')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. apple, iphone, smartphone, 5G" />

      {sectionLabel('SEO Meta')}
      <FormField label="Meta Title" value={form.metaTitle} onChange={fp('metaTitle')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Leave blank to use product name" />
      <FormField label="Meta Description" value={form.metaDescription} onChange={fp('metaDescription')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Short description for search engines (max 160 chars)" type="textarea" />

      {sectionLabel('Visibility & Status')}
      <FormField label="Status" value={form.status} onChange={fp('status')} options={STATUSES} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Featured on Homepage" value={form.featured} onChange={fp('featured')} options={BOOL_OPTS} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Mark as New Arrival" value={form.isNew} onChange={fp('isNew')} options={BOOL_OPTS} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />

      {sectionLabel('Flash Sale')}
      <FormField label="Enable Flash Sale" value={form.isFlashSale} onChange={fp('isFlashSale')} options={BOOL_OPTS} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      {strToBool(form.isFlashSale) && (
        <>
          <FormField label="Flash Sale Price" value={form.flashSalePrice} onChange={fp('flashSalePrice')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Discounted price during flash sale" />
          <FormField label="Flash Sale End Date & Time" value={form.flashSaleEnd} onChange={fp('flashSaleEnd')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} type="datetime-local" />
        </>
      )}

      {sectionLabel('Credit / Get Now')}
      <FormField label="Allow Credit Purchase" value={form.allowCredit} onChange={fp('allowCredit')} options={BOOL_OPTS} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      {strToBool(form.allowCredit) && (
        <>
          <FormField label="Credit Message" value={form.creditMessage} onChange={fp('creditMessage')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Get Now, Pay Later" />
          <FormField label="Minimum Deposit (Initial Payment)" value={form.creditMinimum} onChange={fp('creditMinimum')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 200" />
          <div style={{ fontSize: '11px', color: textMuted, padding: '6px 0 8px' }}>
            Configure the payment plan breakdown. The per-installment amount will be auto-calculated as (Price − Deposit) ÷ Number of Installments, or you can override it manually.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <FormField label="Payment Duration" value={form.creditDuration} onChange={fp('creditDuration')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="12" />
            <FormField label="Duration Unit" value={form.creditDurationType} onChange={fp('creditDurationType')} options={['weeks', 'months']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <FormField label="Payment Frequency" value={form.creditInstallmentFrequency} onChange={fp('creditInstallmentFrequency')} options={['daily', 'weekly', 'monthly']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Number of Installments" value={form.creditInstallmentCount} onChange={fp('creditInstallmentCount')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 13" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <FormField label="Per-Installment Amount" value={form.creditInstallmentAmount} onChange={fp('creditInstallmentAmount')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Auto-calculated or enter manually" />
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  const price = Number(form.price) || 0;
                  const deposit = Number(form.creditMinimum) || 0;
                  const count = Number(form.creditInstallmentCount) || 1;
                  if (count > 0 && price > 0) {
                    const amount = ((price - deposit) / count).toFixed(2);
                    setForm(f => ({ ...f, creditInstallmentAmount: amount }));
                    toast.success(`Auto-calculated: ${(price - deposit).toFixed(2)} ÷ ${count} = ${amount}`);
                  } else {
                    toast.error('Enter price, deposit, and installment count first');
                  }
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Auto-Calculate
              </button>
            </div>
          </div>
        </>
      )}

      {sectionLabel('Trust & Guarantee Badges')}
      <FormField label="Show Guarantee Badge" value={form.showGuaranteeBadge} onChange={fp('showGuaranteeBadge')} options={BOOL_OPTS} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Show Free Returns Badge" value={form.showReturnsBadge} onChange={fp('showReturnsBadge')} options={BOOL_OPTS} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />

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
      <FormField label="Product Condition" value={form.condition} onChange={fp('condition')} options={productConditionOptions} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Shipping Fee (USD, optional)" value={form.shippingFee} onChange={fp('shippingFee')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Leave blank for free shipping" />
      <FormField label="Estimated Delivery Days (Min)" value={form.estimatedDeliveryMinDays} onChange={fp('estimatedDeliveryMinDays')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="2" />
      <FormField label="Estimated Delivery Days (Max)" value={form.estimatedDeliveryMaxDays} onChange={fp('estimatedDeliveryMaxDays')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="7" />
      <FormField label="Product Card Promo Text (shown before stock status on the frontend)" value={form.popularItemText} onChange={fp('popularItemText')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Express Checkout, Jumia Express, Fast Delivery, Pay Small Small" />
      <FormField label="Easy Returns Text (optional)" value={form.easyReturnsText} onChange={fp('easyReturnsText')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g., 30-day returns accepted" />
      <FormField label="Guarantee Text (optional)" value={form.fiveYearGuaranteeText} onChange={fp('fiveYearGuaranteeText')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g., Protected" />
      <FormField label="Free Returns Text (optional)" value={form.freeReturnsText} onChange={fp('freeReturnsText')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g., Returns accepted" />
      <FormField label="Free Returns Description (optional)" value={form.freeReturnsDescription} onChange={fp('freeReturnsDescription')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g., Easy 30-day returns" />
      <FormField label="Protection Description (optional)" value={form.protectionDescription} onChange={fp('protectionDescription')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g., Delivery cover against loss or damage" />
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
              background: 'var(--surface)',
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
        <ModalFooter onClose={() => setAddOpen(false)} onSubmit={handleAdd} loading={loading} submitLabel="Create Product" border={border} textMain={textMain} />
      </Modal>

      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name ?? ''}`}>
        {formFields}
        <ModalFooter onClose={() => setEditRow(null)} onSubmit={handleEdit} loading={loading} submitLabel="Save Changes" border={border} textMain={textMain} />
      </Modal>

      {viewRow && (
        <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Product Details">
          <FormField label="Name" value={viewRow.name} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="SKU" value={viewRow.sku} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Category" value={viewRow.category || '—'} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Brand" value={viewRow.brand} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Price" value={viewRow.price} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Sale Price" value={viewRow.salePrice || '—'} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Stock" value={String(viewRow.stock)} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Weight (KG)" value={viewRow.weight || '—'} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Description" value={viewRow.description || '—'} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Specifications" value={viewRow.specifications || '—'} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Tags" value={viewRow.tags || '—'} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Status" value={viewRow.status} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
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
                   border={border}
          textMain={textMain}
        />
      </Modal>
    </div>
  );
}

export default function ProductsPage() { return <AdminShell><ProductsContent /></AdminShell>; }
