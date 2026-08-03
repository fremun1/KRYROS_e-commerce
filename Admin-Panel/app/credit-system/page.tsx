'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { CreditCard, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getCreditAccounts, getCreditPlans, createCreditPlan, updateCreditPlan, deleteCreditPlan, getProducts, createProduct, updateProduct, deleteProduct, getSettings, updateSettings } from '@/lib/api';
import CloudinaryUpload from '@/components/ui/file-upload';

// ─── Types ────────────────────────────────────────────────
type Credit = { id:string; customer:string; phone:string; limit:string; used:string; available:string; due:string; status:string; plan:string; outstanding:string };
type Application = { id:string; user:string; email:string; product:string; plan:string; amount:string; status:string; date:string };
type Plan = { id:string; name:string; months:number; interest:string; minAmount:string; maxAmount:string; status:string };
type InstProduct = { 
  id:string; 
  name:string; 
  sku:string; 
  price:string; 
  plans:string; 
  status:string; 
  condition?: string;
  description?: string;
  specifications?: string;
  creditMessage?: string;
  creditMinimum?: string;
  images?: string[];
  rawPrice?: number;
  stockTotal?: number;
  stockCurrent?: number;
  shippingFee?: string;
  estimatedDeliveryDays?: string;
  estimatedDeliveryMinDays?: string;
  estimatedDeliveryMaxDays?: string;
  creditDuration?: string;
  creditDurationType?: string;
  creditInstallmentFrequency?: string;
  creditInstallmentCount?: string;
  creditInstallmentAmount?: string;
};

// ─── Initial Data ─────────────────────────────────────────
// Credits loaded from API
// Applications loaded from API
// Plans loaded from API
// InstProducts loaded from API

const APP_STATUSES = ['Pending', 'Approved', 'Rejected'];
const PLAN_STATUSES = ['Active', 'Inactive'];
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

function CreditContent() {
  const card = 'var(--card)';
  const border = 'var(--border)';
  const textMain = 'var(--text-main)';
  const textMuted = 'var(--text-muted)';
  const surface = 'var(--surface)';

  type Tab = 'applications' | 'plans' | 'products' | 'accounts';
  const [activeTab, setActiveTab] = useState<Tab>('applications');

  // Credit Accounts state
  const [credits, setCredits] = useState<Credit[]>([]);
  useEffect(() => {
    getCreditAccounts({ limit: 200 }).then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      const normalized: Credit[] = raw.map((c: any) => ({
        id: c.id || '',
        customer: c.user ? [c.user.firstName, c.user.lastName].filter(Boolean).join(' ') || c.user.email : 'Customer',
        phone: c.user?.phone || '',
        limit: c.amount ? `$${Number(c.amount).toLocaleString()}` : '$0',
        used: c.usedAmount ? `$${Number(c.usedAmount).toLocaleString()}` : '$0',
        available: c.remainingAmount ? `$${Number(c.remainingAmount).toLocaleString()}` : '$0',
        due: c.dueDate ? c.dueDate.split('T')[0] : '',
        status: c.status === 'ACTIVE' ? 'Active' : c.status === 'DEFAULTED' ? 'Defaulted' : c.status === 'PAID' ? 'Paid' : (c.status || 'Active'),
        plan: c.plan?.name || c.planName || '',
        outstanding: c.remainingAmount ? `$${Number(c.remainingAmount).toLocaleString()}` : '$0',
      }));
      setCredits(normalized);
    }).catch(() => {});
  }, []);
  const [viewCredit, setViewCredit] = useState<Credit|null>(null);
  const [editCredit, setEditCredit] = useState<Credit|null>(null);
  const [creditForm, setCreditForm] = useState({ status:'Active' });

  // Applications state
  const [applications, setApplications] = useState<Application[]>([]);
  const loadApplications = () => {
    api.get('/api/credit/applications').then((r: any) => {
      const raw = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      setApplications(raw.map((a: any) => ({
        id: a.id,
        user: `${a.user?.firstName} ${a.user?.lastName}`,
        email: a.user?.email || '',
        product: a.product?.name || 'Product',
        plan: a.creditPlan?.name || 'Plan',
        amount: `$${Number(a.amount).toLocaleString()}`,
        status: a.status.charAt(0) + a.status.slice(1).toLowerCase(),
        date: a.createdAt ? a.createdAt.split('T')[0] : '',
      })));
    }).catch(() => {});
  };
  useEffect(() => {
    loadApplications();
  }, []);
  const [viewApp, setViewApp] = useState<Application|null>(null);
  const [editApp, setEditApp] = useState<Application|null>(null);
  const [appStatus, setAppStatus] = useState('Pending');

  // Plans state
  const [plans, setPlans] = useState<Plan[]>([]);

  // Load credit plans from API
  useEffect(() => {
    getCreditPlans().then(r => {
      const raw = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      setPlans(raw.map((p: any) => ({
        id: p.id,
        name: p.name,
        months: p.duration,
        interest: `${p.interestRate}%`,
        minAmount: String(p.minimumAmount),
        maxAmount: String(p.maximumAmount),
        status: p.isActive !== false ? 'Active' : 'Inactive',
      })));
    }).catch(() => {});
  }, []);
  const [addPlanOpen, setAddPlanOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan|null>(null);
  const [deletePlan, setDeletePlan] = useState<Plan|null>(null);
  const [planForm, setPlanForm] = useState({ name:'', months:'3', interest:'0%', minAmount:'', maxAmount:'', status:'Active' });

  // Installment Products state
  const [instProducts, setInstProducts] = useState<InstProduct[]>([]);
  const [addProdOpen, setAddProdOpen] = useState(false);
  const [editProd, setEditProd] = useState<InstProduct|null>(null);
  const [deleteProd, setDeleteProd] = useState<InstProduct|null>(null);
  const [prodSaving, setProdSaving] = useState(false);
  const [prodForm, setProdForm] = useState({ 
    name:'', sku:'', price:'', status:'Active', 
    description:'', specifications:'', creditMessage:'', creditMinimum:'',
    stockTotal: '100', stockCurrent: '100', condition: 'New',
    shippingFee: '', estimatedDeliveryDays: '3', estimatedDeliveryMinDays: '2', estimatedDeliveryMaxDays: '7',
    creditDuration: '12', creditDurationType: 'weeks',
    creditInstallmentFrequency: 'weekly', creditInstallmentCount: '13', creditInstallmentAmount: ''
  });
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [conditionOptions, setConditionOptions] = useState<string[]>(DEFAULT_CONDITION_OPTIONS);
  const [conditionSettingsOpen, setConditionSettingsOpen] = useState(false);
  const [conditionDraft, setConditionDraft] = useState(DEFAULT_CONDITION_OPTIONS.join('\n'));
  const [conditionSaving, setConditionSaving] = useState(false);

  const appendUploadedImage = (url?: string) => {
    if (!url) return;
    setProdImages(prev => prev.includes(url) ? prev : [...prev, url]);
  };

  const parseSpecifications = (value: string) => {
    const entries = value
      .split(/\n|\|/)
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => {
        const separatorIndex = item.indexOf(':');
        if (separatorIndex === -1) {
          return { key: 'Specifications', value: item };
        }

        return {
          key: item.slice(0, separatorIndex).trim(),
          value: item.slice(separatorIndex + 1).trim(),
        };
      })
      .filter(item => item.key && item.value);

    return entries.length > 0 ? entries : undefined;
  };

  const loadCreditProducts = () => {
    getProducts({ allowCredit: 'true', includeCredit: 'true', take: 100 }).then(r => {
      const raw = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
      setInstProducts(raw.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price ? `$${Number(p.price).toLocaleString()}` : '$0',
        plans: p.allowCredit ? 'Credit Enabled' : 'Disabled',
        status: p.isActive !== false ? 'Active' : 'Inactive',
        // Extra for editing
        description: p.description || '',
        specifications: p.specifications || '',
        creditMessage: p.creditMessage || '',
        creditMinimum: String(p.creditMinimum || ''),
        images: Array.isArray(p.images) ? p.images.map((img: any) => img?.url || img || '').filter(Boolean) : [],
        rawPrice: p.price || 0,
        stockTotal: p.stockTotal ?? p.inventory?.stock ?? 0,
        stockCurrent: p.stockCurrent ?? p.inventory?.stock ?? 0,
        condition: p.condition || 'New',
        shippingFee: p.shippingFee != null ? String(Number(p.shippingFee)) : '',
        estimatedDeliveryDays: p.estimatedDeliveryDays != null ? String(Number(p.estimatedDeliveryDays)) : '3',
        estimatedDeliveryMinDays: p.estimatedDeliveryMinDays != null ? String(Number(p.estimatedDeliveryMinDays)) : '2',
        estimatedDeliveryMaxDays: p.estimatedDeliveryMaxDays != null ? String(Number(p.estimatedDeliveryMaxDays)) : '7',
        creditDuration: p.creditDuration != null ? String(Number(p.creditDuration)) : '12',
        creditDurationType: p.creditDurationType || 'weeks',
        creditInstallmentFrequency: p.creditInstallmentFrequency || 'weekly',
        creditInstallmentCount: p.creditInstallmentCount != null ? String(Number(p.creditInstallmentCount)) : '',
        creditInstallmentAmount: p.creditInstallmentAmount != null ? String(Number(p.creditInstallmentAmount)) : ''
      })));
    });
  };

  useEffect(() => {
    if (activeTab === 'products') loadCreditProducts();
  }, [activeTab]);

  useEffect(() => {
    loadConditionSettings();
  }, []);

  const loadConditionSettings = async () => {
    try {
      const r: any = await getSettings();
      const settings = Array.isArray(r.data) ? r.data : [];
      const conditionSetting = settings.find((s: any) => s?.key === 'product_condition_options');
      const nextOptions = parseConditionOptions(conditionSetting?.value);
      setConditionOptions(nextOptions);
      setConditionDraft(nextOptions.join('\n'));
      setProdForm((current: any) => {
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

  const handleAddProd = async () => {
    if (!prodForm.name.trim() || !prodForm.sku.trim()) {
      toast.error('Product name and SKU are required');
      return;
    }
    setProdSaving(true);
    try {
      await createProduct({
        name: prodForm.name,
        sku: prodForm.sku.trim(),
        price: Number(prodForm.price) || 0,
        isActive: prodForm.status === 'Active',
        allowCredit: true,
        categorySlug: 'general',
        description: prodForm.description,
        creditMessage: prodForm.creditMessage,
        creditMinimum: Number(prodForm.creditMinimum) || 0,
        stockTotal: Number(prodForm.stockTotal) || 0,
        stockCurrent: Number(prodForm.stockCurrent) || 0,
        imageDataUrls: prodImages,
        replaceImages: prodImages.length > 0,
        specifications: parseSpecifications(prodForm.specifications),
        condition: prodForm.condition,
        shippingFee: Number(prodForm.shippingFee) || 0,
        estimatedDeliveryDays: Number(prodForm.estimatedDeliveryDays) || 3,
        estimatedDeliveryMinDays: Number(prodForm.estimatedDeliveryMinDays) || 2,
        estimatedDeliveryMaxDays: Number(prodForm.estimatedDeliveryMaxDays) || 7,
        creditDuration: Number(prodForm.creditDuration) || 12,
        creditDurationType: prodForm.creditDurationType || 'weeks',
        creditInstallmentFrequency: prodForm.creditInstallmentFrequency || 'weekly',
        creditInstallmentCount: prodForm.creditInstallmentCount ? Number(prodForm.creditInstallmentCount) : undefined,
        creditInstallmentAmount: prodForm.creditInstallmentAmount ? Number(prodForm.creditInstallmentAmount) : undefined,
      });
      toast.success('Credit product added');
      setAddProdOpen(false);
      loadCreditProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to add product'));
    } finally {
      setProdSaving(false);
    }
  };

  const handleEditProd = async () => {
    if (!editProd) return;
    if (!prodForm.name.trim() || !prodForm.sku.trim()) {
      toast.error('Product name and SKU are required');
      return;
    }
    setProdSaving(true);
    try {
      await updateProduct(editProd.id, {
        name: prodForm.name,
        sku: prodForm.sku.trim(),
        price: Number(prodForm.price) || 0,
        isActive: prodForm.status === 'Active',
        allowCredit: true,
        description: prodForm.description,
        creditMessage: prodForm.creditMessage,
        creditMinimum: Number(prodForm.creditMinimum) || 0,
        stockTotal: Number(prodForm.stockTotal) || 0,
        stockCurrent: Number(prodForm.stockCurrent) || 0,
        imageDataUrls: prodImages,
        replaceImages: prodImages.length > 0,
        specifications: parseSpecifications(prodForm.specifications),
        condition: prodForm.condition,
        shippingFee: Number(prodForm.shippingFee) || 0,
        estimatedDeliveryDays: Number(prodForm.estimatedDeliveryDays) || 3,
        estimatedDeliveryMinDays: Number(prodForm.estimatedDeliveryMinDays) || 2,
        estimatedDeliveryMaxDays: Number(prodForm.estimatedDeliveryMaxDays) || 7,
        creditDuration: Number(prodForm.creditDuration) || 12,
        creditDurationType: prodForm.creditDurationType || 'weeks',
        creditInstallmentFrequency: prodForm.creditInstallmentFrequency || 'weekly',
        creditInstallmentCount: prodForm.creditInstallmentCount ? Number(prodForm.creditInstallmentCount) : undefined,
        creditInstallmentAmount: prodForm.creditInstallmentAmount ? Number(prodForm.creditInstallmentAmount) : undefined,
      });
      toast.success('Credit product updated');
      setEditProd(null);
      loadCreditProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to update product'));
    } finally {
      setProdSaving(false);
    }
  };

  const handleDeleteProd = async () => {
    if (!deleteProd) return;
    try {
      await deleteProduct(deleteProd.id);
      toast.success('Product removed');
      setDeleteProd(null);
      loadCreditProducts();
    } catch { toast.error('Failed to delete product'); }
  };

  // ── Handlers ──
  const handleEditCredit = () => {
    if (!editCredit) return;
    setCredits(d => d.map(c => c.id===editCredit.id ? {...c, status:creditForm.status} : c));
    toast.success('Credit account updated'); setEditCredit(null);
  };
  const handleEditApp = async () => {
    if (!editApp) return;
    try {
      await api.put(`/api/credit/applications/${editApp.id}/status`, { status: appStatus.toUpperCase() });
      toast.success('Application updated'); 
      setEditApp(null);
      loadApplications();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update application');
    }
  };
  const handleAddPlan = async () => {
    if (!planForm.name.trim()) { toast.error('Plan name required'); return; }
    try {
      const interestVal = parseFloat(String(planForm.interest).replace(/[^0-9.]/g, '')) || 0;
      const minVal = parseFloat(String(planForm.minAmount).replace(/[^0-9.]/g, '')) || 0;
      const maxVal = parseFloat(String(planForm.maxAmount).replace(/[^0-9.]/g, '')) || 999999;
      
      const resp = await createCreditPlan({
        name: planForm.name,
        duration: Number(planForm.months),
        interestRate: interestVal,
        minimumAmount: minVal,
        maximumAmount: maxVal,
        isActive: planForm.status === 'Active',
      });
      const p: Plan = { id: resp.data?.id || `PLN${Date.now()}`, ...planForm, months: Number(planForm.months) };
      setPlans(d => [...d, p]);
      toast.success('Plan added'); setAddPlanOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to add plan'));
    }
  };
  const handleEditPlan = async () => {
    if (!editPlan) return;
    try {
      const interestVal = parseFloat(String(planForm.interest).replace(/[^0-9.]/g, '')) || 0;
      const minVal = parseFloat(String(planForm.minAmount).replace(/[^0-9.]/g, '')) || 0;
      const maxVal = parseFloat(String(planForm.maxAmount).replace(/[^0-9.]/g, '')) || 999999;

      await updateCreditPlan(editPlan.id, {
        name: planForm.name,
        duration: Number(planForm.months),
        interestRate: interestVal,
        minimumAmount: minVal,
        maximumAmount: maxVal,
        isActive: planForm.status === 'Active',
      });
      setPlans(d => d.map(p => p.id===editPlan.id ? {...p, ...planForm, months:Number(planForm.months)} : p));
      toast.success('Plan updated'); setEditPlan(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to update plan'));
    }
  };
  const handleDeletePlan = async () => {
    if (!deletePlan) return;
    try {
      await deleteCreditPlan(deletePlan.id);
      setPlans(d => d.filter(p => p.id!==deletePlan.id));
      toast.success('Plan deleted'); setDeletePlan(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete plan');
    }
  };

  // ── Status badge helpers ──
  const appBadge = (s: string) => {
    const m: Record<string,{bg:string;color:string}> = {
      Approved:{bg:'rgba(192,21,27,0.10)',color:'var(--primary)'},
      Pending:{bg:'rgba(246,176,30,0.12)',color:'var(--gold)'},
      Rejected:{bg:'rgba(214,48,49,0.12)',color:'var(--danger)'},
    };
    const c = m[s] || m.Pending;
    return <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:c.bg,color:c.color}}>{s}</span>;
  };
  const statusBadge = (s: string) => {
    const active = s === 'Active';
    return <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:active?'rgba(192,21,27,0.10)':'rgba(100,116,139,0.1)',color:active?'var(--primary)':'var(--text-muted)'}}>{s}</span>;
  };

  // ── Tab bar ──
  const TABS: { key: Tab; label: string; count: number }[] = [
    { key:'applications', label:'Applications', count:applications.length },
    { key:'plans', label:'Manage Plans', count:plans.length },
    { key:'products', label:'Installment Products', count:instProducts.length },
    { key:'accounts', label:'Credit Accounts', count:credits.length },
  ];

  // ── Columns ──
  const appCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'user', label:'User', render:(v,row)=>(
      <div><div style={{fontWeight:600,color:textMain}}>{String(v)}</div><div style={{fontSize:'11.5px',color:textMuted}}>{String(row.email)}</div></div>
    )},
    { key:'product', label:'Product', render:(v)=><span style={{fontWeight:500,color:textMain}}>{String(v)}</span> },
    { key:'plan', label:'Plan', render:(v)=><span style={{fontSize:'12px',color:'var(--secondary)',background:'rgba(52,74,100,0.10)',padding:'2px 8px',borderRadius:'8px',fontWeight:600}}>{String(v)}</span> },
    { key:'amount', label:'Amount', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'status', label:'Status', render:(v)=>appBadge(String(v)) },
  ];
  const planCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'name', label:'Plan Name', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'months', label:'Duration', render:(v)=><span style={{color:'var(--secondary)',fontWeight:600}}>{String(v)} months</span> },
    { key:'interest', label:'Interest Rate', render:(v)=><span style={{fontWeight:600,color:v==='0%'?'var(--primary)':'var(--gold)'}}>{String(v)}</span> },
    { key:'minAmount', label:'Min Amount' },
    { key:'maxAmount', label:'Max Amount' },
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
  ];
  const instProdCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'name', label:'Product', render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span> },
    { key:'sku', label:'SKU', render:(v)=><code style={{fontSize:'12px',color:'var(--primary)',background:'rgba(31,168,154,0.1)',padding:'2px 6px',borderRadius:'4px'}}>{String(v)}</code> },
    { key:'price', label:'Price', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'plans', label:'Available Plans', render:(v)=><span style={{fontSize:'12px',color:textMuted}}>{String(v)}</span> },
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
  ];
  const creditCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'customer', label:'Customer', render:(v)=><span style={{fontWeight:600,color:textMain,fontSize:'13.5px'}}>{String(v)}</span> },
    { key:'phone', label:'Phone', render:(v)=><span style={{fontSize:'12px',color:textMuted}}>{String(v)}</span> },
    { key:'plan', label:'Plan', render:(v)=><span style={{fontSize:'12px',color:'var(--secondary)',background:'rgba(52,74,100,0.10)',padding:'2px 8px',borderRadius:'8px',fontWeight:600}}>{String(v)}</span> },
    { key:'limit', label:'Limit', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'used', label:'Used', render:(v)=><span style={{color:'var(--gold)',fontWeight:600}}>{String(v)}</span> },
    { key:'outstanding', label:'Outstanding', render:(v)=><span style={{fontWeight:700,color:'var(--danger)'}}>{String(v)}</span> },
    { key:'due', label:'Due Date' },
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
  ];

  const planFormFields = (
    <>
      <FormField label="Plan Name *" value={planForm.name} onChange={v=>setPlanForm(f=>({...f,name:v}))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder='e.g. Pay in 3' />
      <FormField label="Duration (months)" value={planForm.months} onChange={v=>setPlanForm(f=>({...f,months:v}))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder='3' />
      <FormField label="Interest Rate" value={planForm.interest} onChange={v=>setPlanForm(f=>({...f,interest:v}))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder='e.g. 0% or 2.5%' />
      <FormField label="Minimum Amount" value={planForm.minAmount} onChange={v=>setPlanForm(f=>({...f,minAmount:v}))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder='e.g. $100' />
      <FormField label="Maximum Amount" value={planForm.maxAmount} onChange={v=>setPlanForm(f=>({...f,maxAmount:v}))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder='e.g. $5,000' />
      <FormField label="Status" value={planForm.status} onChange={v=>setPlanForm(f=>({...f,status:v}))} options={PLAN_STATUSES} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
    </>
  );

  return (
    <div>
      <PageHeader
        title="Credit System"
        subtitle="Manage installment applications, plans and credit accounts"
        icon={CreditCard}
        onAdd={
          activeTab === 'plans' ? () => { setPlanForm({name:'',months:'3',interest:'0%',minAmount:'',maxAmount:'',status:'Active'}); setAddPlanOpen(true); } : 
          activeTab === 'products' ? () => { setProdForm({name:'',sku:'',price:'',status:'Active',description:'',specifications:'',creditMessage:'',creditMinimum:'',stockTotal:'100',stockCurrent:'100',condition:conditionOptions[0] || 'New',shippingFee:'',estimatedDeliveryDays:'3',estimatedDeliveryMinDays:'2',estimatedDeliveryMaxDays:'7',creditDuration:'12',creditDurationType:'weeks',creditInstallmentFrequency:'weekly',creditInstallmentCount:'13',creditInstallmentAmount:''}); setProdImages([]); setAddProdOpen(true); } :
          undefined
        }
        addLabel={activeTab === 'plans' ? "Add Plan" : "Add Product"}
      />

      {/* ── Summary stats ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}} className="cg">
        {[
          {label:'Total Applications', val:String(applications.length), color:'var(--secondary)'},
          {label:'Approved', val:String(applications.filter(a=>a.status==='Approved').length), color:'var(--primary)'},
          {label:'Pending', val:String(applications.filter(a=>a.status==='Pending').length), color:'var(--gold)'},
          {label:'Credit Accounts', val:String(credits.length), color:'var(--primary)'},
        ].map(s=>(
          <div key={s.label} style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'14px'}}>
            <div style={{fontSize:'12px',color:textMuted,marginBottom:'4px'}}>{s.label}</div>
            <div style={{fontSize:'22px',fontWeight:800,color:s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div style={{display:'flex',gap:'4px',marginBottom:'20px',background:surface,padding:'4px',borderRadius:'10px',border:`1px solid ${border}`,overflowX:'auto'}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{
            flex:'1 0 auto', padding:'8px 14px', borderRadius:'8px', border:'none', cursor:'pointer',
            background:activeTab===t.key?'var(--primary)':'transparent',
            color:activeTab===t.key?'white':textMuted,
            fontSize:'13px', fontWeight:600, fontFamily:'var(--font-inter)',
            display:'flex', alignItems:'center', gap:'6px', justifyContent:'center', whiteSpace:'nowrap',
            transition:'all 0.15s',
          }}>
            {t.label}
            <span style={{
              fontSize:'10px', fontWeight:700, padding:'1px 6px', borderRadius:'10px',
              background:activeTab===t.key?'rgba(255,255,255,0.25)':'rgba(99,102,241,0.12)',
              color:activeTab===t.key?'white':'var(--secondary)',
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'applications' && (
        <DataTable
          columns={appCols}
          data={applications as unknown as Record<string,unknown>[]}
          searchPlaceholder="Search user or email..."
          onEdit={row=>{ const r=row as unknown as Application; setAppStatus(r.status); setEditApp(r); }}
          onView={row=>setViewApp(row as unknown as Application)}
        />
      )}

      {activeTab === 'plans' && (
        <DataTable
          columns={planCols}
          data={plans as unknown as Record<string,unknown>[]}
          searchPlaceholder="Search plans..."
          onEdit={row=>{ const r=row as unknown as Plan; setPlanForm({name:r.name,months:String(r.months),interest:r.interest,minAmount:r.minAmount,maxAmount:r.maxAmount,status:r.status}); setEditPlan(r); }}
          onDelete={row=>setDeletePlan(row as unknown as Plan)}
        />
      )}

      {activeTab === 'products' && (
        <DataTable
          columns={instProdCols}
          data={instProducts as unknown as Record<string,unknown>[]}
          searchPlaceholder="Search installment products..."
          onEdit={row => {
            const r = row as any;
            setProdForm({
              name: r.name, sku: r.sku, price: String(r.rawPrice || ''), status: r.status,
              description: r.description, specifications: r.specifications,
              creditMessage: r.creditMessage, creditMinimum: r.creditMinimum,
              stockTotal: String(r.stockTotal || 0), stockCurrent: String(r.stockCurrent || 0),
              condition: r.condition || 'New',
              shippingFee: r.shippingFee || '',
              estimatedDeliveryDays: r.estimatedDeliveryDays || '3',
              estimatedDeliveryMinDays: r.estimatedDeliveryMinDays || '2',
              estimatedDeliveryMaxDays: r.estimatedDeliveryMaxDays || '7',
              creditDuration: r.creditDuration || '12',
              creditDurationType: r.creditDurationType || 'weeks',
              creditInstallmentFrequency: r.creditInstallmentFrequency || 'weekly',
              creditInstallmentCount: r.creditInstallmentCount ? String(r.creditInstallmentCount) : '',
              creditInstallmentAmount: r.creditInstallmentAmount ? String(r.creditInstallmentAmount) : ''
            });
            setProdImages(r.images || []);
            setEditProd(r);
          }}
          onDelete={row => setDeleteProd(row as unknown as InstProduct)}
        />
      )}

      {activeTab === 'accounts' && (
        <DataTable
          columns={creditCols}
          data={credits as unknown as Record<string,unknown>[]}
          searchPlaceholder="Search users..."
          onEdit={row=>{ const r=row as unknown as Credit; setCreditForm({status:r.status}); setEditCredit(r); }}
          onView={row=>setViewCredit(row as unknown as Credit)}
        />
      )}

      {/* ── Modals: Applications ── */}
      {editApp && (
        <Modal open={!!editApp} onClose={()=>setEditApp(null)} title="Update Application Status">
          <FormField label="Application" value={editApp.user + ' — ' + editApp.product} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Plan" value={editApp.plan} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Amount" value={editApp.amount} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Status" value={appStatus} onChange={setAppStatus} options={APP_STATUSES} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <ModalFooter onClose={()=>setEditApp(null)} onSubmit={handleEditApp} loading={false} submitLabel="Update Status" border={border} textMain={textMain} />
        </Modal>
      )}
      {viewApp && (
        <Modal open={!!viewApp} onClose={()=>setViewApp(null)} title="Application Details">
          <FormField label="User" value={viewApp.user} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Email" value={viewApp.email} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Product" value={viewApp.product} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Plan" value={viewApp.plan} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Amount" value={viewApp.amount} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Status" value={viewApp.status} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Date" value={viewApp.date} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <button onClick={()=>setViewApp(null)} style={{width:'100%',padding:'10px',borderRadius:'9px',background:'var(--surface)',border:`1px solid ${border}`,color:textMain,fontSize:'13.5px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>Close</button>
        </Modal>
      )}

      {/* ── Modals: Plans ── */}
      <Modal open={addPlanOpen} onClose={()=>setAddPlanOpen(false)} title="Add New Plan">
        {planFormFields}
        <ModalFooter onClose={()=>setAddPlanOpen(false)} onSubmit={handleAddPlan} loading={false} submitLabel="Add Plan" border={border} textMain={textMain} />
      </Modal>
      {editPlan && (
        <Modal open={!!editPlan} onClose={()=>setEditPlan(null)} title={`Edit Plan: ${editPlan.name}`}>
          {planFormFields}
          <ModalFooter onClose={()=>setEditPlan(null)} onSubmit={handleEditPlan} loading={false} submitLabel="Save Changes" border={border} textMain={textMain} />
        </Modal>
      )}
      <ConfirmDialog open={!!deletePlan} onClose={()=>setDeletePlan(null)} onConfirm={handleDeletePlan} loading={false} title="Delete Plan" message={`Delete "${deletePlan?.name}" permanently?`} />

      {/* ── Modals: Installment Products ── */}
      <Modal open={addProdOpen} onClose={() => setAddProdOpen(false)} title="Add Credit Product">
        <FormField label="Product Name *" value={prodForm.name} onChange={v => setProdForm(f => ({ ...f, name: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Product name" />
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>Product Images</label>
          <CloudinaryUpload
            multiple
            onChange={(url) => appendUploadedImage(url)}
            showUrlInput={true}
            folder="kryros/products"
            border={border}
            surface={surface}
            textMuted={textMuted}
            textMain={textMain}
          />
        </div>
        <FormField label="Description" value={prodForm.description} onChange={v => setProdForm(f => ({ ...f, description: v }))} type="textarea" border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Detailed product description..." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="SKU" value={prodForm.sku} onChange={v => setProdForm(f => ({ ...f, sku: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. CRD-PRD-001" />
          <FormField label="Price" value={prodForm.price} onChange={v => setProdForm(f => ({ ...f, price: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 1500" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Total Stock" value={prodForm.stockTotal} onChange={v => setProdForm(f => ({ ...f, stockTotal: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 100" />
          <FormField label="Current Stock" value={prodForm.stockCurrent} onChange={v => setProdForm(f => ({ ...f, stockCurrent: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 50" />
        </div>
        <FormField label="Credit Message" value={prodForm.creditMessage} onChange={v => setProdForm(f => ({ ...f, creditMessage: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Get now, pay later" />
        <FormField label="Credit Minimum Deposit" value={prodForm.creditMinimum} onChange={v => setProdForm(f => ({ ...f, creditMinimum: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 500" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          <FormField label="Credit Duration" value={prodForm.creditDuration} onChange={v => setProdForm(f => ({ ...f, creditDuration: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="12" />
          <FormField label="Duration Type" value={prodForm.creditDurationType} onChange={v => setProdForm(f => ({ ...f, creditDurationType: v }))} options={['weeks', 'months']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          <FormField label="Payment Frequency" value={prodForm.creditInstallmentFrequency} onChange={v => setProdForm(f => ({ ...f, creditInstallmentFrequency: v }))} options={['daily', 'weekly', 'monthly']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Number of Installments" value={prodForm.creditInstallmentCount} onChange={v => setProdForm(f => ({ ...f, creditInstallmentCount: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 13" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          <FormField label="Per-Installment Amount" value={prodForm.creditInstallmentAmount} onChange={v => setProdForm(f => ({ ...f, creditInstallmentAmount: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Auto-calculated or enter manually" />
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                const price = Number(prodForm.price) || 0;
                const deposit = Number(prodForm.creditMinimum) || 0;
                const count = Number(prodForm.creditInstallmentCount) || 1;
                if (count > 0 && price > 0) {
                  const amount = ((price - deposit) / count).toFixed(2);
                  setProdForm(f => ({ ...f, creditInstallmentAmount: amount }));
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          <FormField label="Product Condition" value={prodForm.condition} onChange={v => setProdForm(f => ({ ...f, condition: v }))} options={conditionOptions} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FormField label="Shipping Fee" value={prodForm.shippingFee} onChange={v => setProdForm(f => ({ ...f, shippingFee: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0.00" />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
          <FormField label="Est. Delivery Days" value={prodForm.estimatedDeliveryDays} onChange={v => setProdForm(f => ({ ...f, estimatedDeliveryDays: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="3" />
          <FormField label="Min Days" value={prodForm.estimatedDeliveryMinDays} onChange={v => setProdForm(f => ({ ...f, estimatedDeliveryMinDays: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="2" />
          <FormField label="Max Days" value={prodForm.estimatedDeliveryMaxDays} onChange={v => setProdForm(f => ({ ...f, estimatedDeliveryMaxDays: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="7" />
        </div>
        <FormField label="Specifications" value={prodForm.specifications} onChange={v => setProdForm(f => ({ ...f, specifications: v }))} type="textarea" border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Key: Value (one per line)" />
        <FormField label="Status" value={prodForm.status} onChange={v => setProdForm(f => ({ ...f, status: v }))} options={['Active', 'Inactive']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <ModalFooter onClose={() => setAddProdOpen(false)} onSubmit={handleAddProd} loading={prodSaving} submitLabel="Add Product" border={border} textMain={textMain} />
      </Modal>

      {editProd && (
        <Modal open={!!editProd} onClose={() => setEditProd(null)} title={`Edit: ${editProd.name}`}>
          <FormField label="Product Name *" value={prodForm.name} onChange={v => setProdForm(f => ({ ...f, name: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Product name" />
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>Product Images</label>
            
            {/* Image Previews */}
            {prodImages.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                {prodImages.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${border}` }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      onClick={() => setProdImages(prev => prev.filter((_, i) => i !== idx))}
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={10} color="white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <CloudinaryUpload
              multiple
              onChange={(url) => appendUploadedImage(url)}
              showUrlInput={true}
              folder="kryros/products"
              border={border}
              surface={surface}
              textMuted={textMuted}
              textMain={textMain}
            />
          </div>
          <FormField label="Description" value={prodForm.description} onChange={v => setProdForm(f => ({ ...f, description: v }))} type="textarea" border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Detailed product description..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="SKU" value={prodForm.sku} onChange={v => setProdForm(f => ({ ...f, sku: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. CRD-PRD-001" />
            <FormField label="Price" value={prodForm.price} onChange={v => setProdForm(f => ({ ...f, price: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 1500" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Total Stock" value={prodForm.stockTotal} onChange={v => setProdForm(f => ({ ...f, stockTotal: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 100" />
            <FormField label="Current Stock" value={prodForm.stockCurrent} onChange={v => setProdForm(f => ({ ...f, stockCurrent: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 50" />
          </div>
          <FormField label="Credit Message" value={prodForm.creditMessage} onChange={v => setProdForm(f => ({ ...f, creditMessage: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Get now, pay later" />
          <FormField label="Credit Minimum Deposit" value={prodForm.creditMinimum} onChange={v => setProdForm(f => ({ ...f, creditMinimum: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 500" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <FormField label="Credit Duration" value={prodForm.creditDuration} onChange={v => setProdForm(f => ({ ...f, creditDuration: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="12" />
            <FormField label="Duration Type" value={prodForm.creditDurationType} onChange={v => setProdForm(f => ({ ...f, creditDurationType: v }))} options={['weeks', 'months']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <FormField label="Payment Frequency" value={prodForm.creditInstallmentFrequency} onChange={v => setProdForm(f => ({ ...f, creditInstallmentFrequency: v }))} options={['daily', 'weekly', 'monthly']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Number of Installments" value={prodForm.creditInstallmentCount} onChange={v => setProdForm(f => ({ ...f, creditInstallmentCount: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 13" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <FormField label="Per-Installment Amount" value={prodForm.creditInstallmentAmount} onChange={v => setProdForm(f => ({ ...f, creditInstallmentAmount: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Auto-calculated or enter manually" />
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  const price = Number(prodForm.price) || 0;
                  const deposit = Number(prodForm.creditMinimum) || 0;
                  const count = Number(prodForm.creditInstallmentCount) || 1;
                  if (count > 0 && price > 0) {
                    const amount = ((price - deposit) / count).toFixed(2);
                    setProdForm(f => ({ ...f, creditInstallmentAmount: amount }));
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <FormField label="Product Condition" value={prodForm.condition} onChange={v => setProdForm(f => ({ ...f, condition: v }))} options={conditionOptions} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FormField label="Shipping Fee" value={prodForm.shippingFee} onChange={v => setProdForm(f => ({ ...f, shippingFee: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0.00" />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
            <FormField label="Est. Delivery Days" value={prodForm.estimatedDeliveryDays} onChange={v => setProdForm(f => ({ ...f, estimatedDeliveryDays: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="3" />
            <FormField label="Min Days" value={prodForm.estimatedDeliveryMinDays} onChange={v => setProdForm(f => ({ ...f, estimatedDeliveryMinDays: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="2" />
            <FormField label="Max Days" value={prodForm.estimatedDeliveryMaxDays} onChange={v => setProdForm(f => ({ ...f, estimatedDeliveryMaxDays: v }))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="7" />
          </div>
          <FormField label="Specifications" value={prodForm.specifications} onChange={v => setProdForm(f => ({ ...f, specifications: v }))} type="textarea" border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Key: Value (one per line)" />
          <FormField label="Status" value={prodForm.status} onChange={v => setProdForm(f => ({ ...f, status: v }))} options={['Active', 'Inactive']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <ModalFooter onClose={() => setEditProd(null)} onSubmit={handleEditProd} loading={prodSaving} submitLabel="Save Changes" border={border} textMain={textMain} />
        </Modal>
      )}

      <ConfirmDialog open={!!deleteProd} onClose={() => setDeleteProd(null)} onConfirm={handleDeleteProd} loading={false} title="Remove Product" message={`Remove "${deleteProd?.name}" from credit products?`} />

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

      {/* ── Modals: Credit Accounts ── */}
      {editCredit && (
        <Modal open={!!editCredit} onClose={()=>setEditCredit(null)} title="Edit Credit Account">
          <FormField label="Customer" value={editCredit.customer} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Plan" value={editCredit.plan} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Status" value={creditForm.status} onChange={v=>setCreditForm(f=>({...f,status:v}))} options={['Active','Inactive','Defaulted','Paid']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <ModalFooter onClose={()=>setEditCredit(null)} onSubmit={handleEditCredit} loading={false} submitLabel="Save Changes" border={border} textMain={textMain} />
        </Modal>
      )}
      {viewCredit && (
        <Modal open={!!viewCredit} onClose={()=>setViewCredit(null)} title="Credit Account Details">
          <FormField label="Customer" value={viewCredit.customer} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Phone" value={viewCredit.phone} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Plan" value={viewCredit.plan} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Credit Limit" value={viewCredit.limit} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Used" value={viewCredit.used} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Outstanding" value={viewCredit.outstanding} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Due Date" value={viewCredit.due} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Status" value={viewCredit.status} readOnly border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <button onClick={()=>setViewCredit(null)} style={{width:'100%',padding:'10px',borderRadius:'9px',background:'var(--surface)',border:`1px solid ${border}`,color:textMain,fontSize:'13.5px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>Close</button>
        </Modal>
      )}

      <style>{`.cg{} @media(max-width:768px){.cg{grid-template-columns:repeat(2,1fr)!important;}}`}</style>
    </div>
  );
}

export default function CreditSystemPage() { return <AdminShell><CreditContent /></AdminShell>; }
