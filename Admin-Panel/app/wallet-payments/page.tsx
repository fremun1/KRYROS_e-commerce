'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, FormField } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import {
  Wallet, Link2, CreditCard, TrendingUp, ChevronDown, Plus, Copy, Check,
  ExternalLink, Settings, Trash2, Edit2, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  getWalletTransactions, getPayments,
  getPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod, reorderPaymentMethods,
  createPaymentProvider, updatePaymentProvider, deletePaymentProvider,
  createPaymentNetwork, updatePaymentNetwork, deletePaymentNetwork,
} from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tx = { id:string; user:string; type:string; method:string; amount:string; fee:string; date:string; status:string; ref:string };
type PayLink = { id:string; name:string; url:string; amount:string; currency:string; note:string; clicks:string; status:string; created:string };
type PayNetwork = { id:string; name:string; isEnabled:boolean; sortOrder:number };
type PayProvider = { id:string; name:string; description?:string; isEnabled:boolean; sortOrder:number; config?:Record<string,string>; networks:PayNetwork[] };
type PayMethod  = { id:string; name:string; type:string; isEnabled:boolean; sortOrder:number; providers:PayProvider[] };

const METHOD_TYPES: { value:string; label:string }[] = [
  { value:'mobile_wallet', label:'Mobile Wallet' },
  { value:'card',          label:'Card Payment'  },
  { value:'bank',          label:'Bank Transfer' },
  { value:'cash',          label:'Cash'          },
  { value:'digital_wallet',label:'Digital Wallet'},
];

const FRONTEND_PAYMENT_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || "") + "/pay"; // Ensure this is set in environment

const STATUS_COLOR: Record<string,string> = {
  Completed:'#1FA89A', Active:'#1FA89A', Yes:'#1FA89A',
  Pending:'#FFC107', Failed:'#ef4444', Expired:'#ef4444', No:'#ef4444', Inactive:'#64748b',
};
const STATUS_BG: Record<string,string> = {
  Completed:'rgba(31,168,154,0.12)', Active:'rgba(31,168,154,0.12)', Yes:'rgba(31,168,154,0.12)',
  Pending:'rgba(255,193,7,0.12)', Failed:'rgba(185,28,28,0.12)', Expired:'rgba(185,28,28,0.12)',
  No:'rgba(185,28,28,0.12)', Inactive:'rgba(100,116,139,0.12)',
};

function StatusBadge({ value }: { value: string }) {
  return <span style={{ padding:'3px 10px', borderRadius:'20px', fontSize:'11.5px', fontWeight:600, background:STATUS_BG[value]??'rgba(100,116,139,0.12)', color:STATUS_COLOR[value]??'#64748b' }}>{value}</span>;
}

function FilterSelect({ value, onChange, options, placeholder, border, textMuted, surface, textMain }: {
  value:string; onChange:(v:string)=>void; options:string[]; placeholder:string; border:string; textMuted:string; surface:string; textMain:string;
}) {
  return (
    <div style={{ position:'relative', display:'inline-flex', alignItems:'center' }}>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ appearance:'none', background:surface, border:`1px solid ${border}`, borderRadius:'9px', padding:'0 32px 0 12px', height:'36px', color:value?textMain:textMuted, fontSize:'13px', cursor:'pointer', outline:'none', fontFamily:'var(--font-inter)' }}>
        <option value="">{placeholder}</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} color={textMuted} style={{ position:'absolute', right:'10px', pointerEvents:'none' }} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={()=>{ navigator.clipboard?.writeText(text).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),1500); }}
      style={{ display:'flex', alignItems:'center', gap:'4px', padding:'5px 10px', background:'rgba(31,168,154,0.1)', border:'1px solid rgba(31,168,154,0.3)', borderRadius:'7px', cursor:'pointer', color:'#1FA89A', fontSize:'12px', fontWeight:600, fontFamily:'var(--font-inter)' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>} {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function Toggle({ on, onChange }: { on:boolean; onChange:(v:boolean)=>void }) {
  return (
    <button onClick={()=>onChange(!on)}
      style={{ width:'40px', height:'22px', borderRadius:'11px', background:on?'#1FA89A':'#334155', border:'none', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <span style={{ position:'absolute', top:'3px', left:on?'20px':'3px', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
function WalletContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card      = isDark ? '#0D1523' : '#FFFFFF';
  const border    = isDark ? '#1E293B' : '#E2E8F0';
  const textMain  = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface   = isDark ? '#101826' : '#F1F5F9';

  type Tab = 'transactions' | 'links' | 'methods';
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [txData, setTxData] = useState<Tx[]>([]);
  const [payLinks, setPayLinks] = useState<PayLink[]>([]);
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Transaction / Link Modals ─────────────────────────────────────────────
  const [viewTx, setViewTx] = useState<Tx|null>(null);
  const [viewLink, setViewLink] = useState<PayLink|null>(null);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ name:'', amount:'', currency:'ZMW', note:'' });
  const [genLoading, setGenLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string|null>(null);

  // ── Payment Config State ──────────────────────────────────────────────────
  const [payMethods, setPayMethods] = useState<PayMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  // configure method modal
  const [configMethod, setConfigMethod] = useState<PayMethod|null>(null);

  // configure provider modal
  const [configProvider, setConfigProvider] = useState<PayProvider|null>(null);
  const [providerEditForm, setProviderEditForm] = useState<{ name:string; description:string; config:Record<string,string> }>({ name:'', description:'', config:{} });

  // add method modal
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [addMethodForm, setAddMethodForm] = useState({ name:'', type:'mobile_wallet' });
  const [savingMethod, setSavingMethod] = useState(false);

  // add provider modal
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [addProviderForm, setAddProviderForm] = useState({ name:'', description:'', accountName:'', accountNumber:'', bankName:'', apiKey:'' });
  const [savingProvider, setSavingProvider] = useState(false);

  // add network
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [newNetworkName, setNewNetworkName] = useState('');
  const [savingNetwork, setSavingNetwork] = useState(false);

  const inputStyle = { width:'100%', background:surface, border:`1px solid ${border}`, borderRadius:'9px', color:textMain, fontSize:'13.5px', fontFamily:'var(--font-inter)', outline:'none', padding:'10px 14px' };

  // ── Fetch payment methods ──────────────────────────────────────────────────
  const fetchMethods = () => {
    setLoadingMethods(true);
    getPaymentMethods()
      .then((res: any) => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setPayMethods(data);
      })
      .catch((err: any) => { console.error('Failed to fetch payment methods:', err); toast.error('Failed to load payment methods'); })
      .finally(() => setLoadingMethods(false));
  };

  // ── Fetch transactions ────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getWalletTransactions({ limit: 200 }).catch(() => ({ data: [] })),
      getPayments({ limit: 200 }).catch(() => ({ data: [] })),
    ]).then(([wRes, pRes]: any[]) => {
      const wRaw: any[] = Array.isArray(wRes.data?.data) ? wRes.data.data : Array.isArray(wRes.data) ? wRes.data : [];
      const pRaw: any[] = Array.isArray(pRes.data?.data) ? pRes.data.data : Array.isArray(pRes.data) ? pRes.data : [];
      const combined: Tx[] = [
        ...wRaw.map((t: any) => ({
          id: t.id?.slice(-8) || `W${Date.now().toString().slice(-5)}`,
          user: t.user ? (`${t.user.firstName||''} ${t.user.lastName||''}`.trim() || t.user.email || 'Customer') : 'Customer',
          type: t.type || 'Wallet', method: t.paymentMethod || t.method || 'Wallet',
          amount: t.amount ? `$${Number(t.amount).toLocaleString()}` : '$0',
          fee: t.fee ? `$${Number(t.fee).toLocaleString()}` : '$0',
          date: t.createdAt ? t.createdAt.split('T')[0] : '',
          status: t.status==='COMPLETED'||t.status==='SUCCESS' ? 'Completed' : t.status==='PENDING' ? 'Pending' : t.status==='FAILED' ? 'Failed' : (t.status||'Completed'),
          ref: t.reference || t.id || '',
        })),
        ...pRaw.map((p: any) => ({
          id: p.id?.slice(-8) || `P${Date.now().toString().slice(-5)}`,
          user: p.user ? (`${p.user.firstName||''} ${p.user.lastName||''}`.trim() || p.user.email || 'Customer') : 'Customer',
          type: 'Payment', method: p.provider || p.method || 'Mobile Money',
          amount: p.amount ? `$${Number(p.amount).toLocaleString()}` : '$0', fee: '$0',
          date: p.createdAt ? p.createdAt.split('T')[0] : '',
          status: p.status==='PAID'||p.status==='COMPLETED' ? 'Completed' : p.status==='PENDING' ? 'Pending' : p.status==='FAILED' ? 'Failed' : (p.status||'Pending'),
          ref: p.reference || p.id || '',
        })),
      ];
      setTxData(combined);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchMethods(); }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleGenerateLink = () => {
    if (!genForm.amount || isNaN(Number(genForm.amount)) || Number(genForm.amount) <= 0) { toast.error('Please enter a valid amount'); return; }
    setGenLoading(true);
    const ref = 'KRYROS-' + Date.now().toString(36).toUpperCase().slice(-8);
    const params = new URLSearchParams({ amount: genForm.amount, currency: genForm.currency, ref, ...(genForm.note ? { note: genForm.note } : {}) });
    const link = `${FRONTEND_PAYMENT_URL}?${params.toString()}`;
    setGeneratedLink(link);
    const newLink: PayLink = { id: ref, name: genForm.name || `Payment - ${genForm.currency}${Number(genForm.amount).toLocaleString()}`, url: link, amount: `${genForm.currency}${Number(genForm.amount).toLocaleString()}`, currency: genForm.currency, note: genForm.note, clicks: '0', status: 'Active', created: new Date().toISOString().split('T')[0] };
    setPayLinks(d => [newLink, ...d]);
    toast.success('Payment link generated!');
    setGenLoading(false);
  };

  // ── Payment Method handlers ────────────────────────────────────────────────
  const handleToggleMethod = async (id: string, enabled: boolean) => {
    try {
      await updatePaymentMethod(id, { isEnabled: enabled });
      setPayMethods(ms => ms.map(m => m.id===id ? { ...m, isEnabled:enabled } : m));
      if (configMethod?.id === id) setConfigMethod(cm => cm ? { ...cm, isEnabled:enabled } : cm);
      toast.success(enabled ? 'Method enabled' : 'Method disabled');
    } catch (err: any) {
      console.error('Toggle method error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to update';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (!confirm('Delete this payment method and all its providers?')) return;
    try {
      await deletePaymentMethod(id);
      setPayMethods(ms => ms.filter(m => m.id !== id));
      toast.success('Method deleted');
    } catch (err: any) {
      console.error('Delete method error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const moveMethod = async (idx: number, dir: -1|1) => {
    const list = [...payMethods];
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    const updated = list.map((m, i) => ({ ...m, sortOrder: i }));
    setPayMethods(updated);
    try {
      await reorderPaymentMethods(updated.map(m => ({ id: m.id, sortOrder: m.sortOrder })));
    } catch { toast.error('Failed to reorder'); fetchMethods(); }
  };

  const handleAddMethod = async () => {
    if (!addMethodForm.name.trim()) { toast.error('Enter a method name'); return; }
    setSavingMethod(true);
    try {
      const res: any = await createPaymentMethod({ name: addMethodForm.name.trim(), type: addMethodForm.type });
      // The backend returns the created object directly or inside { data: ... }
      const newMethod = res.data?.data || res.data || res;
      if (newMethod && newMethod.id) {
        toast.success('Method added!');
        setShowAddMethod(false);
        setAddMethodForm({ name:'', type:'mobile_wallet' });
        fetchMethods();
      } else {
        throw new Error('Invalid response');
      }
    } catch (err: any) {
      console.error('Add method error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to add method';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
    finally { setSavingMethod(false); }
  };

  // ── Provider handlers ──────────────────────────────────────────────────────
  const handleToggleProvider = async (pid: string, enabled: boolean) => {
    try {
      await updatePaymentProvider(pid, { isEnabled: enabled });
      const refreshed = (await getPaymentMethods()).data;
      const arr = Array.isArray(refreshed) ? refreshed : (refreshed?.data ?? []);
      setPayMethods(arr);
      if (configMethod) setConfigMethod((arr as PayMethod[]).find(m => m.id===configMethod.id) ?? null);
      toast.success(enabled ? 'Provider enabled' : 'Provider disabled');
    } catch (err: any) {
      console.error('Toggle provider error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to update';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleDeleteProvider = async (pid: string) => {
    if (!confirm('Delete this provider and all its networks?')) return;
    try {
      await deletePaymentProvider(pid);
      toast.success('Provider deleted');
      fetchMethods();
      if (configMethod) {
        setConfigMethod(cm => cm ? { ...cm, providers: cm.providers.filter(p => p.id !== pid) } : cm);
      }
    } catch (err: any) {
      console.error('Delete provider error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const openConfigProvider = (provider: PayProvider) => {
    setProviderEditForm({
      name: provider.name,
      description: provider.description || '',
      config: (provider.config as Record<string,string>) || {},
    });
    setConfigProvider(provider);
  };

  const handleSaveProvider = async () => {
    if (!configProvider) return;
    const configData: Record<string,string> = {};
    if (configMethod?.type === 'bank') {
      configData.accountName = providerEditForm.config.accountName || '';
      configData.accountNumber = providerEditForm.config.accountNumber || '';
      configData.bankName = providerEditForm.config.bankName || '';
    } else if (configMethod?.type === 'card') {
      configData.apiKey = providerEditForm.config.apiKey || '';
    }
    try {
      await updatePaymentProvider(configProvider.id, {
        name: providerEditForm.name,
        description: providerEditForm.description,
        config: configData,
      });
      toast.success('Provider saved!');
      fetchMethods();
      setConfigProvider(null);
      // re-sync configMethod
      getPaymentMethods().then((res: any) => {
        const arr: PayMethod[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setPayMethods(arr);
        if (configMethod) setConfigMethod(arr.find(m => m.id===configMethod.id) ?? null);
      });
    } catch { toast.error('Failed to save'); }
  };

  const handleAddProvider = async () => {
    if (!configMethod) return;
    if (!addProviderForm.name.trim()) { toast.error('Enter a provider name'); return; }
    setSavingProvider(true);
    const configData: Record<string,string> = {};
    if (configMethod.type === 'bank') {
      configData.accountName = addProviderForm.accountName;
      configData.accountNumber = addProviderForm.accountNumber;
      configData.bankName = addProviderForm.bankName;
    } else if (configMethod.type === 'card') {
      configData.apiKey = addProviderForm.apiKey;
    }
    try {
      const res: any = await createPaymentProvider({
        paymentMethodId: configMethod.id,
        name: addProviderForm.name.trim(),
        description: addProviderForm.description.trim(),
        config: configData,
      });
      const newProvider = res.data?.data || res.data || res;
      if (newProvider && newProvider.id) {
        toast.success('Provider added!');
        setShowAddProvider(false);
        setAddProviderForm({ name:'', description:'', accountName:'', accountNumber:'', bankName:'', apiKey:'' });
        const mRes = await getPaymentMethods();
        const arr: PayMethod[] = Array.isArray(mRes.data) ? mRes.data : (mRes.data?.data ?? []);
        setPayMethods(arr);
        setConfigMethod(arr.find(m => m.id===configMethod.id) ?? null);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err: any) {
      console.error('Add provider error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to add provider';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
    finally { setSavingProvider(false); }
  };

  // ── Network handlers ───────────────────────────────────────────────────────
  const handleToggleNetwork = async (nid: string, enabled: boolean) => {
    try {
      await updatePaymentNetwork(nid, { isEnabled: enabled });
      if (configProvider) {
        setConfigProvider(cp => cp ? { ...cp, networks: cp.networks.map(n => n.id===nid ? { ...n, isEnabled:enabled } : n) } : cp);
      }
      toast.success(enabled ? 'Network enabled' : 'Network disabled');
    } catch (err: any) {
      console.error('Toggle network error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to update';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleDeleteNetwork = async (nid: string) => {
    if (!confirm('Delete this network?')) return;
    try {
      await deletePaymentNetwork(nid);
      if (configProvider) {
        setConfigProvider(cp => cp ? { ...cp, networks: cp.networks.filter(n => n.id !== nid) } : cp);
      }
      toast.success('Network deleted');
    } catch (err: any) {
      console.error('Delete network error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleAddNetwork = async () => {
    if (!configProvider || !newNetworkName.trim()) { toast.error('Enter a network name'); return; }
    setSavingNetwork(true);
    try {
      const res: any = await createPaymentNetwork({ providerId: configProvider.id, name: newNetworkName.trim() });
      const netData = res.data?.data || res.data || res;
      if (netData && netData.id) {
        const newNet: PayNetwork = { id: netData.id, name: netData.name, isEnabled: netData.isEnabled ?? true, sortOrder: netData.sortOrder ?? 0 };
        setConfigProvider(cp => cp ? { ...cp, networks: [...cp.networks, newNet] } : cp);
        toast.success('Network added!');
        setShowAddNetwork(false);
        setNewNetworkName('');
      } else {
        throw new Error('Invalid response');
      }
    } catch (err: any) {
      console.error('Add network error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to add network';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
    finally { setSavingNetwork(false); }
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const txColumns: Column[] = [
    { key:'id', label:'Transaction', width:'110px', render:(v)=><code style={{fontSize:'11px',color:'#1FA89A',background:'rgba(31,168,154,0.1)',padding:'2px 7px',borderRadius:'4px'}}>{String(v)}</code> },
    { key:'user', label:'User', render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span> },
    { key:'amount', label:'Amount', render:(v)=><span style={{fontWeight:800,color:textMain,fontSize:'14px'}}>{String(v)}</span> },
    { key:'fee', label:'Fee', render:(v)=><span style={{color:textMuted}}>{String(v)}</span> },
    { key:'method', label:'Method' },
    { key:'status', label:'Status', render:(v)=><StatusBadge value={String(v)} /> },
    { key:'date', label:'Date' },
  ];
  const txFiltered = txData.filter(r => (!methodFilter || r.method === methodFilter) && (!statusFilter || r.status === statusFilter));
  const txFilterNode = (
    <>
      <FilterSelect value={methodFilter} onChange={setMethodFilter} options={['Mobile Money','Credit Card','Bank Transfer','Cash']} placeholder="All Methods" border={border} textMuted={textMuted} surface={surface} textMain={textMain} />
      <FilterSelect value={statusFilter} onChange={setStatusFilter} options={['Completed','Pending','Failed']} placeholder="All Status" border={border} textMuted={textMuted} surface={surface} textMain={textMain} />
    </>
  );

  const linkColumns: Column[] = [
    { key:'name', label:'Name', render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span> },
    { key:'amount', label:'Amount', render:(v)=><span style={{fontWeight:800,color:textMain}}>{String(v)}</span> },
    { key:'clicks', label:'Clicks', render:(v)=><span style={{color:textMuted,fontWeight:600}}>{String(v)}</span> },
    { key:'status', label:'Status', render:(v)=><StatusBadge value={String(v)} /> },
    { key:'created', label:'Created' },
    { key:'url', label:'Link', render:(v)=>(
      <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
        <CopyButton text={String(v)} />
        <a href={String(v)} target="_blank" rel="noreferrer" style={{color:'#1FA89A',display:'flex',alignItems:'center'}}><ExternalLink size={13} /></a>
      </div>
    )},
  ];

  const tabs: { id:Tab; label:string; icon:React.ComponentType<{size?:number}> }[] = [
    { id:'transactions', label:'Wallet Transactions', icon:TrendingUp },
    { id:'links',        label:'Payment Links',        icon:Link2 },
    { id:'methods',      label:'Checkout Methods',     icon:CreditCard },
  ];

  const totalDeposits = txData.filter(t=>t.type==='Deposit').reduce((a,t)=>a+parseInt(t.amount.replace(/[^0-9]/g,'')||'0'),0);
  const totalPayments = txData.filter(t=>t.type==='Payment').reduce((a,t)=>a+parseInt(t.amount.replace(/[^0-9]/g,'')||'0'),0);
  const totalPending  = txData.filter(t=>t.status==='Pending').reduce((a,t)=>a+parseInt(t.amount.replace(/[^0-9]/g,'')||'0'),0);

  // ── Method type label helper ────────────────────────────────────────────────
  const typeLabel = (t: string) => METHOD_TYPES.find(m=>m.value===t)?.label ?? t;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="Wallet & Payments" subtitle="Manage transactions, payment links and checkout methods" icon={Wallet} />

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'24px'}} className="sg">
        {[
          { label:'Total Deposits', val:`$${totalDeposits.toLocaleString()}`, color:'#1FA89A' },
          { label:'Total Payments', val:`$${totalPayments.toLocaleString()}`, color:'#6366f1' },
          { label:'Pending',        val:`$${totalPending.toLocaleString()}`,  color:'#FFC107' },
          { label:'Payment Links',  val:String(payLinks.length),              color:'#1FA89A' },
        ].map(s=>(
          <div key={s.label} style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'16px'}}>
            <div style={{fontSize:'12px',color:textMuted,marginBottom:'6px'}}>{s.label}</div>
            <div style={{fontSize:'22px',fontWeight:800,color:s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',overflow:'hidden'}}>
        <div style={{display:'flex',borderBottom:`1px solid ${border}`,padding:'0 8px',overflowX:'auto'}}>
          {tabs.map(tab=>{
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ display:'flex',alignItems:'center',gap:'7px',padding:'13px 16px',background:'transparent',border:'none',borderBottom:active?'2px solid #1FA89A':'2px solid transparent',color:active?'#1FA89A':textMuted,fontWeight:active?600:400,fontSize:'13.5px',cursor:'pointer',whiteSpace:'nowrap',marginBottom:'-1px',transition:'color 0.15s',fontFamily:'var(--font-inter)' }}>
                <Icon size={14} />{tab.label}
              </button>
            );
          })}
        </div>

        <div style={{padding:'16px'}}>
          {/* ── Transactions Tab ── */}
          {activeTab === 'transactions' && (
            <DataTable columns={txColumns} data={txFiltered as unknown as Record<string,unknown>[]} searchPlaceholder="Search transactions..." filterNode={txFilterNode} onView={(row)=>setViewTx(row as unknown as Tx)} />
          )}

          {/* ── Links Tab ── */}
          {activeTab === 'links' && (
            <>
              <div style={{marginBottom:'12px',display:'flex',justifyContent:'flex-end'}}>
                <button onClick={()=>{setShowGenModal(true);setGeneratedLink(null);setGenForm({name:'',amount:'',currency:'USD',note:''});}}
                  style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 16px',background:'linear-gradient(135deg,#1FA89A,#27B9AF)',border:'none',borderRadius:'9px',color:'white',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>
                  <Plus size={14} /> Generate Payment Link
                </button>
              </div>
              {payLinks.length === 0 ? (
                <div style={{padding:'48px',textAlign:'center',color:textMuted}}>
                  <Link2 size={36} color={textMuted} style={{margin:'0 auto 14px',display:'block'}} />
                  <div style={{fontSize:'14px',fontWeight:700,color:textMain,marginBottom:'6px'}}>No payment links yet</div>
                  <div style={{fontSize:'13px'}}>Click "Generate Payment Link" to create your first shareable payment link</div>
                </div>
              ) : (
                <DataTable columns={linkColumns} data={payLinks as unknown as Record<string,unknown>[]} searchPlaceholder="Search links..." onView={(row)=>setViewLink(row as unknown as PayLink)} />
              )}
            </>
          )}

          {/* ── Methods Tab ── */}
          {activeTab === 'methods' && (
            <div>
              {/* Header */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <div style={{fontSize:'13px',color:textMuted}}>
                  {loadingMethods ? 'Loading...' : `${payMethods.length} payment method${payMethods.length!==1?'s':''} configured`}
                </div>
                <button onClick={()=>setShowAddMethod(true)}
                  style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',background:'linear-gradient(135deg,#1FA89A,#27B9AF)',border:'none',borderRadius:'9px',color:'white',fontSize:'12.5px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>
                  <Plus size={13}/> Add Method
                </button>
              </div>

              {/* Methods list */}
              {loadingMethods ? (
                <div style={{padding:'32px',textAlign:'center',color:textMuted}}>Loading payment methods...</div>
              ) : payMethods.length === 0 ? (
                <div style={{padding:'48px',textAlign:'center',color:textMuted}}>
                  <CreditCard size={36} color={textMuted} style={{margin:'0 auto 14px',display:'block'}} />
                  <div style={{fontSize:'14px',fontWeight:700,color:textMain,marginBottom:'6px'}}>No payment methods yet</div>
                  <div style={{fontSize:'13px'}}>Click "Add Method" to configure your first payment method</div>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {payMethods.map((method, idx) => (
                    <div key={method.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'14px 16px',background:surface,border:`1px solid ${border}`,borderRadius:'10px'}}>
                      {/* Reorder */}
                      <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                        <button onClick={()=>moveMethod(idx,-1)} disabled={idx===0}
                          style={{background:'transparent',border:'none',cursor:idx===0?'default':'pointer',color:idx===0?'#334155':'#64748b',padding:'2px',lineHeight:1}}>
                          <ArrowUp size={13}/>
                        </button>
                        <button onClick={()=>moveMethod(idx,1)} disabled={idx===payMethods.length-1}
                          style={{background:'transparent',border:'none',cursor:idx===payMethods.length-1?'default':'pointer',color:idx===payMethods.length-1?'#334155':'#64748b',padding:'2px',lineHeight:1}}>
                          <ArrowDown size={13}/>
                        </button>
                      </div>

                      {/* Info */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,color:textMain,fontSize:'14px'}}>{method.name}</div>
                        <div style={{fontSize:'11.5px',color:textMuted,marginTop:'2px'}}>
                          {typeLabel(method.type)} &bull; {method.providers.length} provider{method.providers.length!==1?'s':''}
                          {method.type==='bank' && method.providers.length > 0 && (
                            <span> &bull; {method.providers.filter(p=>p.isEnabled).length} active account{method.providers.filter(p=>p.isEnabled).length!==1?'s':''}</span>
                          )}
                        </div>
                      </div>

                      {/* Toggle */}
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <span style={{fontSize:'11px',color:textMuted}}>{method.isEnabled?'On':'Off'}</span>
                        <Toggle on={method.isEnabled} onChange={(v)=>handleToggleMethod(method.id,v)} />
                      </div>

                      {/* Configure */}
                      <button onClick={()=>setConfigMethod(method)}
                        style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 12px',background:'rgba(31,168,154,0.1)',border:'1px solid rgba(31,168,154,0.3)',borderRadius:'7px',color:'#1FA89A',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)',whiteSpace:'nowrap'}}>
                        <Settings size={12}/> Configure
                      </button>

                      {/* Delete */}
                      <button onClick={()=>handleDeleteMethod(method.id)}
                        style={{background:'transparent',border:'none',cursor:'pointer',color:'#ef4444',padding:'6px'}}>
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════════ */}

      {/* Transaction Detail Modal */}
      <Modal open={!!viewTx} onClose={()=>setViewTx(null)} title="Transaction Details">
        {viewTx && <>
          <FormField label="Transaction ID" value={viewTx.id}   readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="User"           value={viewTx.user} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <FormField label="Type"   value={viewTx.type}   readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Method" value={viewTx.method} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <FormField label="Amount" value={viewTx.amount} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Fee"    value={viewTx.fee}    readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <FormField label="Status"    value={viewTx.status} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Reference" value={viewTx.ref}    readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <FormField label="Date" value={viewTx.date} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <button onClick={()=>setViewTx(null)} style={{width:'100%',padding:'10px',borderRadius:'9px',background:isDark?'#1E293B':'#F1F5F9',border:`1px solid ${border}`,color:textMain,fontSize:'13.5px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>Close</button>
        </>}
      </Modal>

      {/* Generate Payment Link Modal */}
      <Modal open={showGenModal} onClose={()=>setShowGenModal(false)} title="Generate Payment Link">
        <FormField label="Link Name / Description" value={genForm.name} onChange={v=>setGenForm(f=>({...f,name:v}))} placeholder="e.g. Order #1042 Payment" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'10px'}}>
          <FormField label="Amount *" value={genForm.amount} onChange={v=>setGenForm(f=>({...f,amount:v}))} placeholder="e.g. 500" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} type="number" />
          <div>
            <label style={{fontSize:'12px',fontWeight:600,color:textMuted,display:'block',marginBottom:'6px'}}>Currency</label>
            <select value={genForm.currency} onChange={e=>setGenForm(f=>({...f,currency:e.target.value}))} style={{...inputStyle,cursor:'pointer'}}>
              <option value="ZMW">ZMW</option>
              <option value="USD">USD</option>
              <option value="NGN">NGN</option>
            </select>
          </div>
        </div>
        <FormField label="Note / Reference (optional)" value={genForm.note} onChange={v=>setGenForm(f=>({...f,note:v}))} placeholder="e.g. Invoice #1042..." isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        {generatedLink ? (
          <div style={{padding:'14px',background:isDark?'rgba(31,168,154,0.08)':'rgba(31,168,154,0.05)',border:'1px solid rgba(31,168,154,0.25)',borderRadius:'10px'}}>
            <div style={{fontSize:'12px',fontWeight:700,color:'#1FA89A',marginBottom:'8px'}}>Payment link generated!</div>
            <div style={{fontSize:'11.5px',color:textMuted,wordBreak:'break-all',padding:'8px',background:surface,borderRadius:'7px',marginBottom:'10px'}}>{generatedLink}</div>
            <div style={{display:'flex',gap:'8px'}}><CopyButton text={generatedLink} /></div>
          </div>
        ) : (
          <button onClick={handleGenerateLink} disabled={genLoading} style={{width:'100%',padding:'11px',background:'linear-gradient(135deg,#1FA89A,#27B9AF)',border:'none',borderRadius:'9px',color:'white',fontSize:'13.5px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>
            <Link2 size={14} style={{marginRight:'6px'}} /> {genLoading ? 'Generating...' : 'Generate Link'}
          </button>
        )}
        <button onClick={()=>setShowGenModal(false)} style={{width:'100%',padding:'10px',borderRadius:'9px',background:isDark?'#1E293B':'#F1F5F9',border:`1px solid ${border}`,color:textMuted,fontSize:'13.5px',cursor:'pointer',fontFamily:'var(--font-inter)'}}>
          {generatedLink ? 'Done' : 'Cancel'}
        </button>
      </Modal>

      {/* Payment Link Detail Modal */}
      <Modal open={!!viewLink} onClose={()=>setViewLink(null)} title="Payment Link Details">
        {viewLink && <>
          <FormField label="Link Name" value={viewLink.name} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <div style={{padding:'10px 12px',background:surface,borderRadius:'9px',border:`1px solid ${border}`,marginBottom:'4px'}}>
            <div style={{fontSize:'11.5px',color:textMuted,marginBottom:'6px',fontWeight:600}}>Payment URL</div>
            <div style={{fontSize:'11px',color:'#1FA89A',wordBreak:'break-all',marginBottom:'8px'}}>{viewLink.url}</div>
            <div style={{display:'flex',gap:'8px'}}>
              <CopyButton text={viewLink.url} />
              <a href={viewLink.url} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'12px',color:'#6366f1',fontWeight:600,textDecoration:'none'}}><ExternalLink size={12}/> Open</a>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <FormField label="Amount" value={viewLink.amount} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Clicks" value={String(viewLink.clicks)} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <button onClick={()=>setViewLink(null)} style={{width:'100%',padding:'10px',borderRadius:'9px',background:isDark?'#1E293B':'#F1F5F9',border:`1px solid ${border}`,color:textMain,fontSize:'13.5px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>Close</button>
        </>}
      </Modal>

      {/* ── Add Method Modal ── */}
      <Modal open={showAddMethod} onClose={()=>setShowAddMethod(false)} title="Add Payment Method">
        <FormField label="Method Name *" value={addMethodForm.name} onChange={v=>setAddMethodForm(f=>({...f,name:v}))} placeholder="e.g. Mobile Money, Bank Transfer" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <div>
          <label style={{fontSize:'12px',fontWeight:600,color:textMuted,display:'block',marginBottom:'6px'}}>Type *</label>
          <select value={addMethodForm.type} onChange={e=>setAddMethodForm(f=>({...f,type:e.target.value}))} style={{...inputStyle,cursor:'pointer'}}>
            {METHOD_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button onClick={handleAddMethod} disabled={savingMethod} style={{width:'100%',padding:'11px',background:'linear-gradient(135deg,#1FA89A,#27B9AF)',border:'none',borderRadius:'9px',color:'white',fontSize:'13.5px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>
          {savingMethod ? 'Adding...' : 'Add Method'}
        </button>
        <button onClick={()=>setShowAddMethod(false)} style={{width:'100%',padding:'10px',borderRadius:'9px',background:isDark?'#1E293B':'#F1F5F9',border:`1px solid ${border}`,color:textMuted,fontSize:'13.5px',cursor:'pointer',fontFamily:'var(--font-inter)'}}>Cancel</button>
      </Modal>

      {/* ── Configure Method Modal ── */}
      <Modal open={!!configMethod} onClose={()=>setConfigMethod(null)} title={configMethod ? `Configure: ${configMethod.name}` : 'Configure'}>
        {configMethod && (
          <>
            {/* Enable toggle */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:surface,borderRadius:'9px',border:`1px solid ${border}`,marginBottom:'16px'}}>
              <div>
                <div style={{fontWeight:600,color:textMain,fontSize:'13.5px'}}>Enable this method</div>
                <div style={{fontSize:'11.5px',color:textMuted}}>When disabled, customers cannot use this payment method</div>
              </div>
              <Toggle on={configMethod.isEnabled} onChange={(v)=>handleToggleMethod(configMethod.id,v)} />
            </div>

            {/* Method type info */}
            <div style={{fontSize:'12px',color:textMuted,padding:'8px 12px',background:`rgba(31,168,154,0.06)`,border:'1px solid rgba(31,168,154,0.15)',borderRadius:'7px',marginBottom:'16px'}}>
              Type: <strong style={{color:textMain}}>{typeLabel(configMethod.type)}</strong>
              {configMethod.type === 'bank' && <span> &mdash; Add bank accounts with their details below</span>}
              {configMethod.type === 'mobile_wallet' && <span> &mdash; Add providers (e.g., 543, 503) then configure their networks</span>}
              {configMethod.type === 'card' && <span> &mdash; Add payment gateways (e.g., Flutterwave, Paystack) then configure accepted card types</span>}
            </div>

            {/* Providers section */}
            <div style={{marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontWeight:700,color:textMain,fontSize:'13.5px'}}>
                {configMethod.type === 'bank' ? 'Bank Accounts' : configMethod.type === 'card' ? 'Payment Gateways' : 'Providers'}
              </div>
              <button onClick={()=>{setAddProviderForm({name:'',description:'',accountName:'',accountNumber:'',bankName:'',apiKey:''});setShowAddProvider(true);}}
                style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 12px',background:'rgba(31,168,154,0.1)',border:'1px solid rgba(31,168,154,0.3)',borderRadius:'7px',color:'#1FA89A',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>
                <Plus size={12}/> Add {configMethod.type === 'bank' ? 'Account' : configMethod.type === 'card' ? 'Gateway' : 'Provider'}
              </button>
            </div>

            {configMethod.providers.length === 0 ? (
              <div style={{padding:'24px',textAlign:'center',color:textMuted,background:surface,borderRadius:'8px',border:`1px dashed ${border}`}}>
                No {configMethod.type === 'bank' ? 'bank accounts' : 'providers'} added yet.
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {configMethod.providers.map(provider => (
                  <div key={provider.id} style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'12px 14px',background:isDark?'#0A1220':'#F8FAFC',border:`1px solid ${border}`,borderRadius:'9px'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,color:textMain,fontSize:'13.5px'}}>{provider.name}</div>
                      {provider.description && <div style={{fontSize:'11.5px',color:textMuted}}>{provider.description}</div>}
                      {/* Bank: show account details */}
                      {configMethod.type === 'bank' && provider.config && (
                        <div style={{fontSize:'11.5px',color:textMuted,marginTop:'3px'}}>
                          {provider.config.accountName && <span>{provider.config.accountName}</span>}
                          {provider.config.accountNumber && <span style={{marginLeft:'8px',color:'#1FA89A',fontWeight:600}}>{provider.config.accountNumber}</span>}
                        </div>
                      )}
                      {/* Mobile/Card: show networks */}
                      {(configMethod.type === 'mobile_wallet' || configMethod.type === 'card') && provider.networks.length > 0 && (
                        <div style={{display:'flex',flexWrap:'wrap',gap:'4px',marginTop:'6px'}}>
                          {provider.networks.map(n=>(
                            <span key={n.id} style={{padding:'2px 8px',borderRadius:'12px',fontSize:'10.5px',fontWeight:600,
                              background:n.isEnabled?'rgba(31,168,154,0.15)':'rgba(100,116,139,0.15)',
                              color:n.isEnabled?'#1FA89A':'#64748b'}}>
                              {n.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Toggle on={provider.isEnabled} onChange={(v)=>handleToggleProvider(provider.id,v)} />
                    <button onClick={()=>openConfigProvider(provider)}
                      style={{background:'transparent',border:'none',cursor:'pointer',color:'#64748b',padding:'4px'}}>
                      <Edit2 size={14}/>
                    </button>
                    <button onClick={()=>handleDeleteProvider(provider.id)}
                      style={{background:'transparent',border:'none',cursor:'pointer',color:'#ef4444',padding:'4px'}}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={()=>setConfigMethod(null)} style={{width:'100%',marginTop:'16px',padding:'10px',borderRadius:'9px',background:isDark?'#1E293B':'#F1F5F9',border:`1px solid ${border}`,color:textMuted,fontSize:'13.5px',cursor:'pointer',fontFamily:'var(--font-inter)'}}>Close</button>
          </>
        )}
      </Modal>

      {/* ── Add Provider Modal ── */}
      <Modal open={showAddProvider} onClose={()=>setShowAddProvider(false)} title={configMethod ? `Add ${configMethod.type==='bank'?'Bank Account':configMethod.type==='card'?'Gateway':'Provider'}` : 'Add Provider'}>
        {configMethod && (
          <>
            <FormField
              label={configMethod.type==='bank'?'Bank Name *':configMethod.type==='card'?'Gateway Name *':'Provider Name *'}
              value={addProviderForm.name}
              onChange={v=>setAddProviderForm(f=>({...f,name:v}))}
              placeholder={configMethod.type==='bank'?'e.g. Stanbic Bank Zambia':configMethod.type==='card'?'e.g. Flutterwave':'e.g. 543'}
              isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
            />
            <FormField
              label="Description (optional)"
              value={addProviderForm.description}
              onChange={v=>setAddProviderForm(f=>({...f,description:v}))}
              placeholder="Short description..."
              isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
            />
            {configMethod.type === 'bank' && (
              <>
                <FormField label="Account Name *" value={addProviderForm.accountName} onChange={v=>setAddProviderForm(f=>({...f,accountName:v}))} placeholder="e.g. KRYROS LIMITED" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
                <FormField label="Account Number *" value={addProviderForm.accountNumber} onChange={v=>setAddProviderForm(f=>({...f,accountNumber:v}))} placeholder="e.g. 91200012345667" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
                <FormField label="Bank Name *" value={addProviderForm.bankName} onChange={v=>setAddProviderForm(f=>({...f,bankName:v}))} placeholder="e.g. Zanaco Bank" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
              </>
            )}
            {configMethod.type === 'card' && (
              <FormField label="API Key / Secret (optional)" value={addProviderForm.apiKey} onChange={v=>setAddProviderForm(f=>({...f,apiKey:v}))} placeholder="sk_live_..." isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            )}
            <button onClick={handleAddProvider} disabled={savingProvider}
              style={{width:'100%',padding:'11px',background:'linear-gradient(135deg,#1FA89A,#27B9AF)',border:'none',borderRadius:'9px',color:'white',fontSize:'13.5px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>
              {savingProvider ? 'Saving...' : 'Add'}
            </button>
            <button onClick={()=>setShowAddProvider(false)} style={{width:'100%',padding:'10px',borderRadius:'9px',background:isDark?'#1E293B':'#F1F5F9',border:`1px solid ${border}`,color:textMuted,fontSize:'13.5px',cursor:'pointer',fontFamily:'var(--font-inter)'}}>Cancel</button>
          </>
        )}
      </Modal>

      {/* ── Configure Provider Modal ── */}
      <Modal open={!!configProvider} onClose={()=>setConfigProvider(null)} title={configProvider ? `Edit: ${configProvider.name}` : 'Edit Provider'}>
        {configProvider && configMethod && (
          <>
            <FormField label="Provider Name *" value={providerEditForm.name} onChange={v=>setProviderEditForm(f=>({...f,name:v}))} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Description" value={providerEditForm.description} onChange={v=>setProviderEditForm(f=>({...f,description:v}))} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            {/* Bank-specific fields */}
            {configMethod.type === 'bank' && (
              <>
                <FormField label="Account Name" value={providerEditForm.config.accountName||''} onChange={v=>setProviderEditForm(f=>({...f,config:{...f.config,accountName:v}}))} placeholder="e.g. KRYROS LIMITED" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
                <FormField label="Account Number" value={providerEditForm.config.accountNumber||''} onChange={v=>setProviderEditForm(f=>({...f,config:{...f.config,accountNumber:v}}))} placeholder="e.g. 91200012345667" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
                <FormField label="Bank Name" value={providerEditForm.config.bankName||''} onChange={v=>setProviderEditForm(f=>({...f,config:{...f.config,bankName:v}}))} placeholder="e.g. Zanaco Bank" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
              </>
            )}
            {/* Card-specific fields */}
            {configMethod.type === 'card' && (
              <FormField label="API Key" value={providerEditForm.config.apiKey||''} onChange={v=>setProviderEditForm(f=>({...f,config:{...f.config,apiKey:v}}))} placeholder="sk_live_..." isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            )}
            {/* Networks (mobile_wallet / card) */}
            {(configMethod.type === 'mobile_wallet' || configMethod.type === 'card') && (
              <div style={{marginTop:'6px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <div style={{fontWeight:600,color:textMain,fontSize:'13px'}}>
                    {configMethod.type === 'card' ? 'Accepted Card Types' : 'Networks / Operators'}
                  </div>
                  <button onClick={()=>setShowAddNetwork(true)}
                    style={{display:'flex',alignItems:'center',gap:'4px',padding:'5px 10px',background:'rgba(31,168,154,0.1)',border:'1px solid rgba(31,168,154,0.3)',borderRadius:'6px',color:'#1FA89A',fontSize:'11.5px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>
                    <Plus size={11}/> Add {configMethod.type==='card'?'Card Type':'Network'}
                  </button>
                </div>
                {configProvider.networks.length === 0 ? (
                  <div style={{padding:'16px',textAlign:'center',color:textMuted,background:surface,borderRadius:'7px',border:`1px dashed ${border}`,fontSize:'12.5px'}}>
                    No {configMethod.type==='card'?'card types':'networks'} added yet
                  </div>
                ) : (
                  configProvider.networks.map(n=>(
                    <div key={n.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',borderBottom:`1px solid ${border}`}}>
                      <span style={{color:textMain,fontWeight:500,fontSize:'13.5px'}}>{n.name}</span>
                      <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                        <span style={{fontSize:'11px',color:textMuted}}>{n.isEnabled?'On':'Off'}</span>
                        <Toggle on={n.isEnabled} onChange={(v)=>handleToggleNetwork(n.id,v)} />
                        <button onClick={()=>handleDeleteNetwork(n.id)} style={{background:'transparent',border:'none',cursor:'pointer',color:'#ef4444',padding:'2px'}}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            <div style={{display:'flex',gap:'8px',marginTop:'16px'}}>
              <button onClick={handleSaveProvider} style={{flex:1,padding:'10px',background:'linear-gradient(135deg,#1FA89A,#27B9AF)',border:'none',borderRadius:'9px',color:'white',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>Save Changes</button>
              <button onClick={()=>setConfigProvider(null)} style={{padding:'10px 16px',borderRadius:'9px',background:isDark?'#1E293B':'#F1F5F9',border:`1px solid ${border}`,color:textMuted,fontSize:'13px',cursor:'pointer',fontFamily:'var(--font-inter)'}}>Cancel</button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Add Network Modal ── */}
      <Modal open={showAddNetwork} onClose={()=>setShowAddNetwork(false)} title={configMethod?.type==='card'?'Add Card Type':'Add Network'}>
        <FormField
          label={configMethod?.type==='card'?'Card Type Name *':'Network Name *'}
          value={newNetworkName}
          onChange={setNewNetworkName}
          placeholder={configMethod?.type==='card'?'e.g. Visa, MasterCard, Verve':'e.g. MTN, Airtel, Zamtel'}
          isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
        />
        <button onClick={handleAddNetwork} disabled={savingNetwork}
          style={{width:'100%',padding:'11px',background:'linear-gradient(135deg,#1FA89A,#27B9AF)',border:'none',borderRadius:'9px',color:'white',fontSize:'13.5px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>
          {savingNetwork ? 'Adding...' : 'Add'}
        </button>
        <button onClick={()=>setShowAddNetwork(false)} style={{width:'100%',padding:'10px',borderRadius:'9px',background:isDark?'#1E293B':'#F1F5F9',border:`1px solid ${border}`,color:textMuted,fontSize:'13.5px',cursor:'pointer',fontFamily:'var(--font-inter)'}}>Cancel</button>
      </Modal>

      <style>{`.sg{} @media(max-width:768px){.sg{grid-template-columns:1fr 1fr!important;}}`}</style>
    </div>
  );
}

export default function WalletPaymentsPage() {
  return <AdminShell><WalletContent /></AdminShell>;
}
