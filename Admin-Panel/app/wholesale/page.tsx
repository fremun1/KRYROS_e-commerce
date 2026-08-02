'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { Truck, Users, Star, Package, ChevronRight, ChevronLeft, X, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  getWholesaleAccounts, 
  updateWholesaleAccountStatus, 
  deleteWholesaleAccount, 
  updateWholesaleAccount, 
  getWholesaleDeals, 
  createWholesaleDeal, 
  updateWholesaleDeal, 
  deleteWholesaleDeal, 
  getCategories,
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getSettings,
  updateSettings,
  api
} from '@/lib/api';
import CloudinaryUpload from '@/components/ui/file-upload';

// ─── Types ────────────────────────────────────────────────
type Wholesale = { id:string; name:string; contact:string; phone:string; city:string; tier:string; credit:string; orders:number; totalSpent:string; status:string; joined:string };
type Application = { id:string; company:string; type:string; applicant:string; email:string; phone:string; status:string; date:string };
type Deal = { id:string; title:string; description:string; discount:string; minOrder:string; validUntil:string; status:string };
type WholesaleProduct = {
  id:string;
  name:string;
  sku:string;
  price:string;
  moq:string;
  category:string;
  status:string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  specifications?: string;
  rawPrice?: number;
  rawMoq?: number;
  stockTotal?: number;
  stockCurrent?: number;
  condition?: string;
  shippingFee?: string;
  estimatedDeliveryDays?: string;
  estimatedDeliveryMinDays?: string;
  estimatedDeliveryMaxDays?: string;
};

const TIERS = ['Bronze','Silver','Gold','Platinum'];
const PARTNER_STATUSES = ['Active','Inactive','Pending','Suspended'];
const APP_STATUSES = ['Pending', 'Approved', 'Rejected'];
const DEFAULT_WHOLESALE_CATEGORIES = ['Electronics', 'Audio', 'Wearables', 'Clothing', 'Food & Beverages', 'Sports'];
const DEFAULT_CONDITION_OPTIONS = ['New', 'Used', 'Refurbished'];
const toSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

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

function WholesaleContent() {
  const card = 'var(--card)';
  const border = 'var(--border)';
  const textMain = 'var(--text-main)';
  const textMuted = 'var(--text-muted)';
  const surface = 'var(--surface)';

  type Section = 'applications' | 'accounts' | 'deals' | 'inventory';
  const [section, setSection] = useState<Section>('applications');

  // Applications state
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  
  const loadApplications = () => {
    setLoadingApps(true);
    api.get('/api/wholesale/applications').then((r: any) => {
      const raw = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      setApplications(raw.map((a: any) => ({
        id: a.id,
        company: a.companyName,
        type: a.businessType,
        applicant: `${a.firstName} ${a.lastName}`,
        email: a.email,
        phone: a.phone,
        status: a.status.charAt(0) + a.status.slice(1).toLowerCase(),
        date: a.createdAt ? a.createdAt.split('T')[0] : '',
      })));
    }).finally(() => setLoadingApps(false));
  };

  useEffect(() => {
    if (section === 'applications') loadApplications();
  }, [section]);

  const [viewApp, setViewApp] = useState<any | null>(null);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [appStatus, setAppStatus] = useState('Pending');

  const handleUpdateAppStatus = async () => {
    if (!editApp) return;
    try {
      await api.put(`/api/wholesale/applications/${editApp.id}/status`, { status: appStatus.toUpperCase() });
      toast.success('Application status updated');
      setEditApp(null);
      loadApplications();
      if (appStatus === 'Approved') loadPartners();
    } catch (err: any) {
      toast.error('Failed to update application');
    }
  };

  // Partners state
  const [partners, setPartners] = useState<Wholesale[]>([]);
  const loadPartners = () => {
    getWholesaleAccounts({ limit: 200 }).then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      const normalized: Wholesale[] = raw.map((w: any) => ({
        id: w.id || '',
        name: w.companyName || w.businessName || (w.user ? [w.user.firstName, w.user.lastName].filter(Boolean).join(' ') : 'Partner'),
        contact: w.user?.email || w.contact || '',
        phone: w.user?.phone || w.phone || '',
        city: w.city || '',
        tier: w.tierName || (w.discountTier===1?'Bronze':w.discountTier===2?'Silver':w.discountTier===3?'Gold':'Platinum') || 'Bronze',
        credit: w.creditLimit ? `$${Number(w.creditLimit).toLocaleString()}` : '$0',
        orders: w._count?.orders ?? 0,
        totalSpent: '$0',
        status: w.status === 'ACTIVE' || w.status === 'APPROVED' ? 'Active' : w.status === 'PENDING' ? 'Pending' : 'Inactive',
        joined: w.createdAt ? w.createdAt.split('T')[0] : '',
      }));
      setPartners(normalized);
    }).catch(() => {});
  };

  useEffect(() => {
    if (section === 'accounts') loadPartners();
  }, [section]);

  const [editPartner, setEditPartner] = useState<Wholesale|null>(null);
  const [deletePartner, setDeletePartner] = useState<Wholesale|null>(null);
  const [viewPartner, setViewPartner] = useState<Wholesale|null>(null);
  const [pForm, setPForm] = useState({ name:'', contact:'', status:'Active', tier:'Bronze' });
  const pfp = (k:string) => (v:string) => setPForm(f=>({...f,[k]:v}));

  // Deals state
  const [deals, setDeals] = useState<Deal[]>([]);
  const loadDeals = () => {
    getWholesaleDeals().then((r: any) => {
      const raw = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      setDeals(raw.map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description || '',
        discount: d.discount ? `${d.discount}%` : '0%',
        minOrder: d.minOrder ? `$${Number(d.minOrder).toLocaleString()}` : '$0',
        validUntil: d.validUntil ? d.validUntil.split('T')[0] : 'Never',
        status: d.isActive ? 'Active' : 'Inactive',
      })));
    });
  };

  useEffect(() => {
    if (section === 'deals') loadDeals();
  }, [section]);

  const [addDealOpen, setAddDealOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal|null>(null);
  const [deleteDeal, setDeleteDeal] = useState<Deal|null>(null);
  const [dForm, setDForm] = useState({ title:'', description:'', discount:'', minOrder:'', validUntil:'', status:'Active' });
  const dfp = (k:string) => (v:string) => setDForm(f=>({...f,[k]:v}));

  // Inventory state
  const [inventory, setInventory] = useState<WholesaleProduct[]>([]);
  const [addInvOpen, setAddInvOpen] = useState(false);
  const [editInv, setEditInv] = useState<WholesaleProduct|null>(null);
  const [deleteInv, setDeleteInv] = useState<WholesaleProduct|null>(null);
  const [inventorySaving, setInventorySaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [iForm, setIForm] = useState({ 
    name:'', sku:'', price:'', moq:'', category:'Electronics', status:'Active',
    description: '', imageUrl: '', images: [] as string[], specifications: '',
    stockTotal: '100', stockCurrent: '100', condition: 'New',
    shippingFee: '', estimatedDeliveryDays: '3', estimatedDeliveryMinDays: '2', estimatedDeliveryMaxDays: '7'
  });
  const [invImages, setInvImages] = useState<string[]>([]);
  const [conditionOptions, setConditionOptions] = useState<string[]>(DEFAULT_CONDITION_OPTIONS);
  const [conditionSettingsOpen, setConditionSettingsOpen] = useState(false);
  const [conditionDraft, setConditionDraft] = useState(DEFAULT_CONDITION_OPTIONS.join('\n'));
  const [conditionSaving, setConditionSaving] = useState(false);
  const ifp = (k:string) => (v:string) => setIForm(f=>({...f,[k]:v}));

  useEffect(() => {
    loadConditionSettings();
    getCategories().then((r: any) => {
      const data = r?.data ?? r ?? [];
      const names = data.map((c: any) => c.name || c).filter(Boolean);
      if (names.length > 0) setCategories(names);
    }).catch(() => {});
  }, []);

  const loadConditionSettings = async () => {
    try {
      const r: any = await getSettings();
      const settings = Array.isArray(r.data) ? r.data : [];
      const conditionSetting = settings.find((s: any) => s?.key === 'product_condition_options');
      const nextOptions = parseConditionOptions(conditionSetting?.value);
      setConditionOptions(nextOptions);
      setConditionDraft(nextOptions.join('\n'));
      setIForm((current: any) => {
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

  const handleSaveConditionSettings = async () => {
    setConditionSaving(true);
    try {
      const parsed = parseConditionOptions(conditionDraft);
      await updateSettings({
        'product_condition_options': JSON.stringify(parsed)
      });
      setConditionOptions(parsed);
      setConditionSettingsOpen(false);
      toast.success('Condition options updated successfully');
    } catch (err: any) {
      toast.error('Failed to update condition options');
    } finally {
      setConditionSaving(false);
    }
  };

  const loadWholesaleProducts = () => {
    getProducts({ isWholesaleOnly: 'true', includeWholesale: 'true', take: 100 }).then(r => {
      const raw = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
      setInventory(raw.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.wholesalePrice ? `$${Number(p.wholesalePrice).toLocaleString()}` : (p.price ? `$${Number(p.price).toLocaleString()}` : '$0'),
        moq: `${p.wholesaleMoq || 1} units`,
        category: p.category?.name || 'General',
        status: p.isActive !== false ? 'Active' : 'Inactive',
        description: p.description || '',
        imageUrl: p.images?.[0]?.url || p.images?.[0] || '',
        images: Array.isArray(p.images) ? p.images.map((img: any) => img?.url || img || '').filter(Boolean) : [],
        specifications: p.specifications || '',
        rawPrice: p.wholesalePrice || p.price || 0,
        rawMoq: p.wholesaleMoq || 1,
        stockTotal: p.stockTotal ?? p.inventory?.stock ?? 0,
        stockCurrent: p.stockCurrent ?? p.inventory?.stock ?? 0,
        condition: p.condition || 'New',
        shippingFee: p.shippingFee != null ? String(Number(p.shippingFee)) : '',
        estimatedDeliveryDays: p.estimatedDeliveryDays != null ? String(Number(p.estimatedDeliveryDays)) : '3',
        estimatedDeliveryMinDays: p.estimatedDeliveryMinDays != null ? String(Number(p.estimatedDeliveryMinDays)) : '2',
        estimatedDeliveryMaxDays: p.estimatedDeliveryMaxDays != null ? String(Number(p.estimatedDeliveryMaxDays)) : '7'
      })));
    });
  };

  useEffect(() => {
    if (section === 'inventory') loadWholesaleProducts();
  }, [section]);

  const statusBadge = (s:string) => {
    const m: Record<string,{bg:string;color:string}> = {
      Active:{bg:'rgba(192,21,27,0.10)',color:'var(--primary)'},
      Approved:{bg:'rgba(192,21,27,0.10)',color:'var(--primary)'},
      Inactive:{bg:'rgba(100,116,139,0.1)',color:'var(--text-muted)'},
      Pending:{bg:'rgba(246,176,30,0.12)',color:'var(--gold)'},
      Rejected:{bg:'rgba(214,48,49,0.12)',color:'var(--danger)'},
      Suspended:{bg:'rgba(214,48,49,0.12)',color:'var(--danger)'},
    };
    const c = m[s] || m.Inactive;
    return <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:c.bg,color:c.color}}>{s}</span>;
  };

  const handleEditPartner = async () => {
    if (!editPartner) return;
    try {
      const tierNum = pForm.tier==='Bronze'?1:pForm.tier==='Silver'?2:pForm.tier==='Gold'?3:4;
      await updateWholesaleAccount(editPartner.id, { tierName: pForm.tier, discountTier: tierNum, status: pForm.status==='Active'?'ACTIVE':pForm.status==='Pending'?'PENDING':'INACTIVE' });
      toast.success('Partner updated'); setEditPartner(null);
      loadPartners();
    } catch { toast.error('Failed to update partner'); }
  };

  const handleAddDeal = async () => {
    if (!dForm.title.trim()) { toast.error('Deal title required'); return; }
    try {
      await createWholesaleDeal({
        title: dForm.title,
        description: dForm.description,
        discount: parseFloat(dForm.discount.replace('%', '')) || 0,
        minOrder: parseFloat(dForm.minOrder.replace('$', '').replace(/,/g, '')) || 0,
        validUntil: dForm.validUntil,
        isActive: dForm.status === 'Active'
      });
      toast.success('Deal added'); setAddDealOpen(false);
      loadDeals();
    } catch { toast.error('Failed to add deal'); }
  };

  const handleEditDeal = async () => {
    if (!editDeal) return;
    try {
      await updateWholesaleDeal(editDeal.id, {
        title: dForm.title,
        description: dForm.description,
        discount: parseFloat(dForm.discount.replace('%', '')) || 0,
        minOrder: parseFloat(dForm.minOrder.replace('$', '').replace(/,/g, '')) || 0,
        validUntil: dForm.validUntil,
        isActive: dForm.status === 'Active'
      });
      toast.success('Deal updated'); setEditDeal(null);
      loadDeals();
    } catch { toast.error('Failed to update deal'); }
  };

  const handleDeleteDeal = async () => {
    if (!deleteDeal) return;
    try {
      await deleteWholesaleDeal(deleteDeal.id);
      toast.success('Deal deleted'); setDeleteDeal(null);
      loadDeals();
    } catch { toast.error('Failed to delete deal'); }
  };

  const handleAddInv = async () => {
    if (!iForm.name.trim() || !iForm.sku.trim()) {
      toast.error('Product name and SKU are required');
      return;
    }
    setInventorySaving(true);
    try {
      await createProduct({
        name: iForm.name,
        sku: iForm.sku,
        price: Number(iForm.price) || 0,
        wholesalePrice: Number(iForm.price) || 0,
        wholesaleMoq: Number(iForm.moq) || 1,
        categorySlug: toSlug(iForm.category),
        isActive: iForm.status === 'Active',
        isWholesaleOnly: true,
        description: iForm.description,
        stockTotal: Number(iForm.stockTotal) || 0,
        stockCurrent: Number(iForm.stockCurrent) || 0,
        replaceImages: invImages.length > 0,
        imageDataUrls: invImages,
        condition: iForm.condition,
        specifications: iForm.specifications ? [{ key: 'Specifications', value: iForm.specifications }] : undefined,
        shippingFee: Number(iForm.shippingFee) || 0,
        estimatedDeliveryDays: Number(iForm.estimatedDeliveryDays) || 3,
        estimatedDeliveryMinDays: Number(iForm.estimatedDeliveryMinDays) || 2,
        estimatedDeliveryMaxDays: Number(iForm.estimatedDeliveryMaxDays) || 7
      });
      toast.success('Wholesale product added');
      setAddInvOpen(false);
      loadWholesaleProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : (msg || 'check the product data and API connection');
      toast.error(`Failed to add product: ${detail}`);
    } finally {
      setInventorySaving(false);
    }
  };

  const handleEditInv = async () => {
    if (!editInv) return;
    if (!iForm.name.trim() || !iForm.sku.trim()) {
      toast.error('Product name and SKU are required');
      return;
    }
    setInventorySaving(true);
    try {
      await updateProduct(editInv.id, {
        name: iForm.name,
        sku: iForm.sku,
        price: Number(iForm.price) || 0,
        wholesalePrice: Number(iForm.price) || 0,
        wholesaleMoq: Number(iForm.moq) || 1,
        categorySlug: toSlug(iForm.category),
        isActive: iForm.status === 'Active',
        isWholesaleOnly: true,
        description: iForm.description,
        stockTotal: Number(iForm.stockTotal) || 0,
        stockCurrent: Number(iForm.stockCurrent) || 0,
        replaceImages: invImages.length > 0,
        imageDataUrls: invImages,
        condition: iForm.condition,
        specifications: iForm.specifications ? [{ key: 'Specifications', value: iForm.specifications }] : [],
        shippingFee: Number(iForm.shippingFee) || 0,
        estimatedDeliveryDays: Number(iForm.estimatedDeliveryDays) || 3,
        estimatedDeliveryMinDays: Number(iForm.estimatedDeliveryMinDays) || 2,
        estimatedDeliveryMaxDays: Number(iForm.estimatedDeliveryMaxDays) || 7
      });
      toast.success('Wholesale product updated');
      setEditInv(null);
      loadWholesaleProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : (msg || 'check the product data and API connection');
      toast.error(`Failed to update product: ${detail}`);
    } finally {
      setInventorySaving(false);
    }
  };

  const handleDeleteInv = async () => {
    if (!deleteInv) return;
    setInventorySaving(true);
    try {
      await deleteProduct(deleteInv.id);
      toast.success('Wholesale product deleted');
      setDeleteInv(null);
      loadWholesaleProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : (msg || 'check the API connection');
      toast.error(`Failed to delete product: ${detail}`);
    } finally {
      setInventorySaving(false);
    }
  };

  const inventoryForm = (
    <div>
      <FormField label="Product Name" value={iForm.name} onChange={ifp('name')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Samsung Galaxy S24 Ultra" />
      <FormField label="SKU" value={iForm.sku} onChange={ifp('sku')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. SAM-S24U-WHS" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'12px' }}>
        <FormField label="Wholesale Price" value={iForm.price} onChange={ifp('price')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0.00" />
        <FormField label="MOQ" value={iForm.moq} onChange={ifp('moq')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="1" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'12px' }}>
        <FormField label="Category" value={iForm.category} onChange={ifp('category')} options={categories.length > 0 ? categories : DEFAULT_WHOLESALE_CATEGORIES} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Status" value={iForm.status} onChange={ifp('status')} options={['Active', 'Inactive']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'12px' }}>
        <FormField label="Total Stock" value={iForm.stockTotal} onChange={ifp('stockTotal')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="100" />
        <FormField label="Current Stock" value={iForm.stockCurrent} onChange={ifp('stockCurrent')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="100" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'12px' }}>
        <FormField label="Product Condition" value={iForm.condition} onChange={ifp('condition')} options={conditionOptions} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <FormField label="Shipping Fee" value={iForm.shippingFee} onChange={ifp('shippingFee')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0.00" />
          <button 
            onClick={() => setConditionSettingsOpen(true)}
            style={{
              padding:'8px 12px',
              borderRadius:'8px',
              fontSize:'12px',
              fontWeight:600,
              background:'var(--primary)',
              color:'#fff',
              border:'none',
              cursor:'pointer',
              whiteSpace:'nowrap'
            }}
          >
            Manage Conditions
          </button>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:'12px' }}>
        <FormField label="Est. Delivery Days" value={iForm.estimatedDeliveryDays} onChange={ifp('estimatedDeliveryDays')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="3" />
        <FormField label="Min Days" value={iForm.estimatedDeliveryMinDays} onChange={ifp('estimatedDeliveryMinDays')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="2" />
        <FormField label="Max Days" value={iForm.estimatedDeliveryMaxDays} onChange={ifp('estimatedDeliveryMaxDays')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="7" />
      </div>
      <FormField label="Description" value={iForm.description} onChange={ifp('description')} type="textarea" border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Describe the wholesale product..." />
      <FormField label="Specifications" value={iForm.specifications} onChange={ifp('specifications')} type="textarea" border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Color: Black | RAM: 8GB | Storage: 256GB" />

      <div style={{ marginBottom:'14px' }}>
        <label style={{ display:'block', fontSize:'11.5px', fontWeight:600, color:textMuted, marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.4px' }}>
          Product Images
        </label>
        {invImages.length > 0 && (
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'12px'}}>
            {invImages.map((img, idx) => (
              <div key={idx} style={{position:'relative',width:'80px',height:'80px',flexShrink:0}}>
                <img src={img} alt="" style={{width:'80px',height:'80px',objectFit:'cover',borderRadius:'8px',border:idx===0?'2px solid var(--primary)':`1px solid ${border}`}} />
                {idx===0 && <span style={{position:'absolute',bottom:'3px',left:'3px',background:'var(--primary)',color:'white',fontSize:'8px',fontWeight:700,padding:'1px 4px',borderRadius:'3px',letterSpacing:'0.3px'}}>MAIN</span>}
                <button type="button" onClick={() => setInvImages((imgs) => imgs.filter((_, imageIndex) => imageIndex !== idx))} style={{position:'absolute',top:'3px',right:'3px',width:'18px',height:'18px',borderRadius:'50%',background:'rgba(239,68,68,0.9)',border:'none',color:'white',cursor:'pointer',fontSize:'12px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:0,lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
        )}
        <CloudinaryUpload
          multiple
          onChange={(url) => { if (url) setInvImages((imgs) => imgs.includes(url) ? imgs : [...imgs, url]); }}
          accept="image/*"
          folder="kryros/wholesale-products"
          showUrlInput={true}
          border={border}
          surface={surface}
          textMuted={textMuted}
          textMain={textMain}
        />
      </div>
    </div>
  );

  const appCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'company', label:'Company', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'applicant', label:'Applicant' },
    { key:'email', label:'Email' },
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
    { key:'date', label:'Date' },
  ];

  const partnerCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'name', label:'Company', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'contact', label:'Contact' },
    { key:'tier', label:'Tier', render:(v)=>{ const c={Bronze:{bg:'rgba(246,139,30,0.12)',color:'var(--warning)'},Silver:{bg:'rgba(83,83,87,0.12)',color:'var(--dark-gray)'},Gold:{bg:'rgba(246,176,30,0.12)',color:'var(--gold)'},Platinum:{bg:'rgba(139,92,246,0.12)',color:'var(--secondary)'}}[String(v)] || {bg:'rgba(100,116,139,0.1)',color:'var(--text-muted)'}; return <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:c.bg,color:c.color}}>{String(v)}</span>; }},
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
  ];

  const dealCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'title', label:'Deal Title', render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span> },
    { key:'discount', label:'Discount', render:(v)=><span style={{fontWeight:700,color:'var(--primary)'}}>{String(v)}</span> },
    { key:'minOrder', label:'Min Order' },
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
  ];

  const invCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'name', label:'Product', render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span> },
    { key:'sku', label:'SKU', render:(v)=><code style={{fontSize:'12px',color:'var(--primary)',background:'rgba(31,168,154,0.1)',padding:'2px 6px',borderRadius:'4px'}}>{String(v)}</code> },
    { key:'price', label:'Price', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
  ];

  return (
    <AdminShell>
      <PageHeader title="Wholesale Management" subtitle="Manage applications, partners, deals and bulk inventory" icon={Truck} />

      <div style={{ display:'flex', gap:'12px', marginBottom:'24px', overflowX:'auto', paddingBottom:'4px' }}>
        {[
          { id:'applications', label:'Applications', icon:ClipboardList },
          { id:'accounts', label:'Wholesale Partners', icon:Users },
          { id:'deals', label:'Featured Deals', icon:Star },
          { id:'inventory', label:'Bulk Inventory', icon:Package }
        ].map(t => (
          <button key={t.id} onClick={() => setSection(t.id as Section)} style={{
            display:'flex', alignItems:'center', gap:'8px', padding:'10px 16px', borderRadius:'12px', fontSize:'13.5px', fontWeight:600,
            background: section === t.id ? 'rgba(31,168,154,0.1)' : card,
            color: section === t.id ? 'var(--primary)' : textMuted,
            border: `1px solid ${section === t.id ? 'var(--primary)' : border}`,
            cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.2s'
          }}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div style={{ background:card, border:`1px solid ${border}`, borderRadius:'16px', overflow:'hidden' }}>
        {section === 'applications' && (
          <DataTable columns={appCols} data={applications} 
            onView={(row) => setViewApp(row as unknown as Application)} 
            onEdit={(row) => setEditApp(row as unknown as Application)} />
        )}
        {section === 'accounts' && (
          <DataTable columns={partnerCols} data={partners} 
            onView={(row) => setViewPartner(row as unknown as Wholesale)} 
            onEdit={(row) => setEditPartner(row as unknown as Wholesale)} 
            onDelete={(row) => setDeletePartner(row as unknown as Wholesale)} />
        )}
        {section === 'deals' && (
          <div style={{ padding:'20px' }}>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'16px' }}>
              <button onClick={() => { setDForm({title:'',description:'',discount:'',minOrder:'',validUntil:'',status:'Active'}); setAddDealOpen(true); }}
                style={{ background:'var(--primary)', color:'white', border:'none', padding:'8px 16px', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>
                Add New Deal
              </button>
            </div>
            <DataTable columns={dealCols} data={deals} 
              onEdit={(row) => { 
                const d = row as unknown as Deal;
                setEditDeal(d); 
                setDForm({
                  title: d.title,
                  description: d.description,
                  discount: d.discount.replace('%', ''),
                  minOrder: d.minOrder.replace('$', '').replace(/,/g, ''),
                  validUntil: d.validUntil,
                  status: d.status
                }); 
              }} 
              onDelete={(row) => setDeleteDeal(row as unknown as Deal)} />
          </div>
        )}
        {section === 'inventory' && (
          <div style={{ padding:'20px' }}>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'16px' }}>
              <button onClick={() => { setIForm({name:'',sku:'',price:'',moq:'',category:'Electronics',status:'Active',description:'',imageUrl:'',images:[],specifications:'',stockTotal:'100',stockCurrent:'100',condition:conditionOptions[0] || 'New',shippingFee:'',estimatedDeliveryDays:'3',estimatedDeliveryMinDays:'2',estimatedDeliveryMaxDays:'7'}); setInvImages([]); setAddInvOpen(true); }}
                style={{ background:'var(--primary)', color:'white', border:'none', padding:'8px 16px', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>
                Add Wholesale Product
              </button>
            </div>
            <DataTable columns={invCols} data={inventory} 
              onEdit={(row) => { 
                const i = row as any;
                setEditInv(i); 
                setIForm({
                  name: i.name,
                  sku: i.sku,
                  price: String(i.rawPrice || ''),
                  moq: String(i.rawMoq || ''),
                  category: i.category,
                  status: i.status,
                  description: i.description || '',
                  imageUrl: i.imageUrl || '',
                  images: i.images || [],
                  specifications: i.specifications || '',
                  stockTotal: String(i.stockTotal || 100),
                  stockCurrent: String(i.stockCurrent || 100),
                  condition: i.condition || 'New',
                  shippingFee: i.shippingFee || '',
                  estimatedDeliveryDays: i.estimatedDeliveryDays || '3',
                  estimatedDeliveryMinDays: i.estimatedDeliveryMinDays || '2',
                  estimatedDeliveryMaxDays: i.estimatedDeliveryMaxDays || '7'
                }); 
                setInvImages(i.images || []); 
              }} 
              onDelete={(row) => setDeleteInv(row as unknown as WholesaleProduct)} />
          </div>
        )}
      </div>

      {/* Modals for Applications */}
      <Modal open={!!editApp} onClose={() => setEditApp(null)} title="Update Application Status">
        <div style={{ padding:'20px' }}>
          <FormField label="Status" value={appStatus} onChange={setAppStatus} options={APP_STATUSES} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <p style={{ fontSize:'12px', color:textMuted, marginTop:'12px' }}>Approving will automatically create a wholesale account for this user.</p>
        </div>
        <ModalFooter onClose={() => setEditApp(null)} onSubmit={handleUpdateAppStatus} loading={false} submitLabel="Update Status" border={border} textMain={textMain} />
      </Modal>

      {/* Deal Modal */}
      <Modal open={addDealOpen || !!editDeal} onClose={() => { setAddDealOpen(false); setEditDeal(null); }} title={editDeal ? "Edit Deal" : "Add New Deal"}>
        <div style={{ padding:'20px' }}>
          <FormField label="Title" value={dForm.title} onChange={v => setDForm(f=>({...f,title:v}))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Discount (%)" value={dForm.discount} onChange={v => setDForm(f=>({...f,discount:v}))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Min Order" value={dForm.minOrder} onChange={v => setDForm(f=>({...f,minOrder:v}))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Valid Until" value={dForm.validUntil} onChange={v => setDForm(f=>({...f,validUntil:v}))} type="date" border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        </div>
        <ModalFooter onClose={() => { setAddDealOpen(false); setEditDeal(null); }} onSubmit={editDeal ? handleEditDeal : handleAddDeal} loading={false} submitLabel={editDeal ? "Update Deal" : "Create Deal"} border={border} textMain={textMain} />
      </Modal>

      <Modal open={addInvOpen} onClose={() => setAddInvOpen(false)} title="Add Wholesale Product" maxWidth="680px">
        {inventoryForm}
        <ModalFooter onClose={() => setAddInvOpen(false)} onSubmit={handleAddInv} loading={inventorySaving} submitLabel="Create Product" border={border} textMain={textMain} />
      </Modal>

      <Modal open={!!editInv} onClose={() => setEditInv(null)} title={`Edit Wholesale Product${editInv?.name ? `: ${editInv.name}` : ''}`} maxWidth="680px">
        {inventoryForm}
        <ModalFooter onClose={() => setEditInv(null)} onSubmit={handleEditInv} loading={inventorySaving} submitLabel="Save Changes" border={border} textMain={textMain} />
      </Modal>

      {/* Condition Settings Modal */}
      <Modal open={conditionSettingsOpen} onClose={() => setConditionSettingsOpen(false)} title="Manage Product Conditions" maxWidth="500px">
        <div style={{ padding:'20px' }}>
          <p style={{ fontSize:'13px', color:textMuted, marginBottom:'12px' }}>
            Add one condition per line. These options will appear in the condition dropdown when creating products.
          </p>
          <textarea
            value={conditionDraft}
            onChange={(e) => setConditionDraft(e.target.value)}
            style={{
              width:'100%',
              minHeight:'120px',
              padding:'12px',
              borderRadius:'8px',
              border:`1px solid ${border}`,
              background:surface,
              color:textMain,
              fontSize:'13px',
              fontFamily:'inherit',
              resize:'vertical'
            }}
            placeholder="New&#10;Used&#10;Refurbished&#10;Open Box"
          />
          <div style={{ marginTop:'12px', fontSize:'12px', color:textMuted }}>
            Current options: {conditionOptions.join(', ')}
          </div>
        </div>
        <ModalFooter onClose={() => setConditionSettingsOpen(false)} onSubmit={handleSaveConditionSettings} loading={conditionSaving} submitLabel="Save Conditions" border={border} textMain={textMain} />
      </Modal>

      {/* Delete Dialogs */}
      <ConfirmDialog open={!!deleteDeal} title="Delete Deal" message="Are you sure you want to delete this deal?" onClose={() => setDeleteDeal(null)} onConfirm={handleDeleteDeal} />
      <ConfirmDialog open={!!deleteInv} title="Delete Wholesale Product" message={`Are you sure you want to delete "${deleteInv?.name || 'this product'}"?`} onClose={() => setDeleteInv(null)} onConfirm={handleDeleteInv} loading={inventorySaving} />
    </AdminShell>
  );
}

export default function WholesalePage() {
  return <WholesaleContent />;
}
