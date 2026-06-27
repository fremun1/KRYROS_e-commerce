'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import {
  Wallet, Link2, CreditCard, TrendingUp, ChevronDown, Plus, Copy, Check,
  ExternalLink, Settings, Trash2, Edit2, ArrowUp, ArrowDown, RefreshCw,
  Search, Filter, MoreHorizontal, Eye, Smartphone, Building2,
} from 'lucide-react';
import {
  getDirectPayments, getPaymentLinks, createPaymentLink, deletePaymentLink,
  getPaymentMethods, updatePaymentMethod, deletePaymentMethod, reorderPaymentMethods,
  createPaymentMethod, createPaymentProvider, updatePaymentProvider, deletePaymentProvider,
  createPaymentNetwork, updatePaymentNetwork, deletePaymentNetwork,
} from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tx = { 
  id: string; 
  user: string; 
  type: string; 
  method: string; 
  amount: string; 
  date: string; 
  status: string; 
  ref: string;
  linkName?: string;
};

type PayLink = { 
  id: string; 
  name: string; 
  url: string; 
  amount: string; 
  currency: string; 
  note: string; 
  clicks: number; 
  status: string; 
  created: string; 
};

type PayNetwork = { id: string; name: string; isEnabled: boolean; sortOrder: number };
type PayProvider = { id: string; name: string; description?: string; isEnabled: boolean; sortOrder: number; config?: Record<string, string>; networks: PayNetwork[] };
type PayMethod = { id: string; name: string; type: string; isEnabled: boolean; sortOrder: number; providers: PayProvider[] };

const METHOD_TYPES = [
  { value: 'mobile_wallet', label: 'Mobile Wallet' },
  { value: 'card', label: 'Card Payment' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'digital_wallet', label: 'Digital Wallet' },
];

const FRONTEND_PAYMENT_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || "") + "/pay";

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#1FA89A', PAID: '#1FA89A', SUCCESS: '#1FA89A', ACTIVE: '#1FA89A', YES: '#1FA89A',
  PENDING: '#F59E0B', FAILED: '#EF4444', EXPIRED: '#EF4444', NO: '#EF4444', INACTIVE: '#64748B',
};

const STATUS_BG: Record<string, string> = {
  COMPLETED: 'rgba(31,168,154,0.1)', PAID: 'rgba(31,168,154,0.1)', SUCCESS: 'rgba(31,168,154,0.1)', ACTIVE: 'rgba(31,168,154,0.1)', YES: 'rgba(31,168,154,0.1)',
  PENDING: 'rgba(245,158,11,0.1)', FAILED: 'rgba(239,68,68,0.1)', EXPIRED: 'rgba(239,68,68,0.1)',
  NO: 'rgba(239,68,68,0.1)', INACTIVE: 'rgba(100,116,139,0.1)',
};

function StatusBadge({ value }: { value: string }) {
  const displayValue = (value || '').toUpperCase();
  return (
    <span style={{ 
      padding: '4px 10px', 
      borderRadius: '6px', 
      fontSize: '11px', 
      fontWeight: 700, 
      background: STATUS_BG[displayValue] ?? 'rgba(100,116,139,0.1)', 
      color: STATUS_COLOR[displayValue] ?? '#64748B',
      textTransform: 'uppercase',
      letterSpacing: '0.3px'
    }}>
      {value}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-inter)', transition: 'all 0.2s' }}>
      {copied ? <Check size={14} color="#1FA89A" /> : <Copy size={14} color="var(--text-muted)" />} {copied ? 'Copied' : 'Copy URL'}
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      style={{ width: '36px', height: '20px', borderRadius: '10px', background: on ? '#1FA89A' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: '3px', left: on ? '19px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

export default function DirectPaymentHub() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = 'var(--card)';
  const border = 'var(--border)';
  const textMain = 'var(--text-main)';
  const textMuted = 'var(--text-muted)';
  const surface = 'var(--surface)';

  type Tab = 'transactions' | 'links' | 'methods';
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [txData, setTxData] = useState<Tx[]>([]);
  const [payLinks, setPayLinks] = useState<PayLink[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [viewTx, setViewTx] = useState<Tx | null>(null);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ name: '', amount: '', currency: 'ZMW', note: '' });
  const [genLoading, setGenLoading] = useState(false);

  // ── Payment Config State ──────────────────────────────────────────────────
  const [payMethods, setPayMethods] = useState<PayMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [configMethod, setConfigMethod] = useState<PayMethod | null>(null);
  const [configProvider, setConfigProvider] = useState<PayProvider | null>(null);

  const [showAddMethod, setShowAddMethod] = useState(false);
  const [addMethodForm, setAddMethodForm] = useState({ name: '', type: 'mobile_wallet' });
  const [savingMethod, setSavingMethod] = useState(false);

  const [showAddProvider, setShowAddProvider] = useState(false);
  const [addProviderForm, setAddProviderForm] = useState({ name: '', description: '', accountName: '', accountNumber: '', bankName: '', apiKey: '' });
  const [savingProvider, setSavingProvider] = useState(false);

  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [newNetworkName, setNewNetworkName] = useState('');
  const [savingNetwork, setSavingNetwork] = useState(false);

  const inputStyle = { width: '100%', background: surface, border: `1px solid ${border}`, borderRadius: '9px', color: textMain, fontSize: '13.5px', fontFamily: 'var(--font-inter)', outline: 'none', padding: '10px 14px' };

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'transactions') {
        const res = await getDirectPayments({ limit: 200 });
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setTxData(raw.map((d: any) => ({
          id: d.paymentNumber || d.id?.slice(-8),
          user: d.user ? `${d.user.firstName || ''} ${d.user.lastName || ''}`.trim() || d.user.email : 'Guest Customer',
          type: 'Direct Payment',
          method: d.paymentMethod || 'Mobile Money',
          amount: `${d.currency} ${Number(d.amount).toLocaleString()}`,
          date: d.createdAt ? d.createdAt.split('T')[0] : '',
          status: d.status,
          ref: d.paymentReference || '',
          linkName: d.paymentLink?.name
        })));
      } else if (activeTab === 'links') {
        const res = await getPaymentLinks();
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setPayLinks(raw.map((l: any) => ({
          ...l,
          url: `${FRONTEND_PAYMENT_URL}/${l.id}`,
          amount: `${l.currency} ${Number(l.amount).toLocaleString()}`,
          created: l.createdAt ? l.createdAt.split('T')[0] : ''
        })));
      } else if (activeTab === 'methods') {
        setLoadingMethods(true);
        const res = await getPaymentMethods();
        setPayMethods(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
        setLoadingMethods(false);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load data. Please check API connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleGenerateLink = async () => {
    if (!genForm.name.trim()) { toast.error('Link name is required'); return; }
    if (!genForm.amount || isNaN(Number(genForm.amount))) { toast.error('Invalid amount'); return; }
    setGenLoading(true);
    try {
      await createPaymentLink({ ...genForm, amount: Number(genForm.amount) });
      toast.success('Payment link created!');
      setShowGenModal(false);
      setGenForm({ name: '', amount: '', currency: 'ZMW', note: '' });
      if (activeTab === 'links') fetchData();
    } catch (err) {
      toast.error('Failed to create link');
    } finally {
      setGenLoading(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Delete this payment link?')) return;
    try {
      await deletePaymentLink(id);
      setPayLinks(prev => prev.filter(l => l.id !== id));
      toast.success('Link deleted');
    } catch (err) {
      toast.error('Failed to delete link');
    }
  };

  const handleToggleMethod = async (id: string, enabled: boolean) => {
    try {
      await updatePaymentMethod(id, { isEnabled: enabled });
      setPayMethods(ms => ms.map(m => m.id === id ? { ...m, isEnabled: enabled } : m));
      if (configMethod?.id === id) setConfigMethod(m => m ? { ...m, isEnabled: enabled } : null);
      toast.success(enabled ? 'Method enabled' : 'Method disabled');
    } catch (err) {
      toast.error('Failed to update method');
    }
  };

  const handleAddMethod = async () => {
    if (!addMethodForm.name.trim()) return;
    setSavingMethod(true);
    try {
      await createPaymentMethod(addMethodForm);
      toast.success('Method added');
      setShowAddMethod(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to add method');
    } finally {
      setSavingMethod(false);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (!confirm('Delete this payment method and all its providers?')) return;
    try {
      await deletePaymentMethod(id);
      setPayMethods(ms => ms.filter(m => m.id !== id));
      toast.success('Method deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const moveMethod = async (idx: number, dir: -1 | 1) => {
    const list = [...payMethods];
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    const updated = list.map((m, i) => ({ ...m, sortOrder: i }));
    setPayMethods(updated);
    try {
      await reorderPaymentMethods(updated.map(m => ({ id: m.id, sortOrder: m.sortOrder })));
    } catch { toast.error('Failed to reorder'); fetchData(); }
  };

  // ── Provider Handlers ──────────────────────────────────────────────────────
  const handleToggleProvider = async (id: string, enabled: boolean) => {
    try {
      await updatePaymentProvider(id, { isEnabled: enabled });
      setConfigMethod(m => m ? { ...m, providers: m.providers.map(p => p.id === id ? { ...p, isEnabled: enabled } : p) } : null);
      setPayMethods(ms => ms.map(m => m.id === configMethod?.id ? { ...m, providers: m.providers.map(p => p.id === id ? { ...p, isEnabled: enabled } : p) } : m));
      toast.success(enabled ? 'Provider enabled' : 'Provider disabled');
    } catch { toast.error('Failed to update provider'); }
  };

  const handleAddProvider = async () => {
    if (!addProviderForm.name.trim() || !configMethod) return;
    setSavingProvider(true);
    try {
      const config: Record<string, string> = {};
      if (addProviderForm.accountName) config.accountName = addProviderForm.accountName;
      if (addProviderForm.accountNumber) config.accountNumber = addProviderForm.accountNumber;
      if (addProviderForm.bankName) config.bankName = addProviderForm.bankName;
      if (addProviderForm.apiKey) config.apiKey = addProviderForm.apiKey;

      const res = await createPaymentProvider({
        methodId: configMethod.id,
        name: addProviderForm.name,
        description: addProviderForm.description,
        config
      });
      const newP = res.data || res;
      setConfigMethod(m => m ? { ...m, providers: [...m.providers, newP] } : null);
      setShowAddProvider(false);
      setAddProviderForm({ name: '', description: '', accountName: '', accountNumber: '', bankName: '', apiKey: '' });
      toast.success('Provider added');
    } catch { toast.error('Failed to add provider'); }
    finally { setSavingProvider(false); }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Delete this provider?')) return;
    try {
      await deletePaymentProvider(id);
      setConfigMethod(m => m ? { ...m, providers: m.providers.filter(p => p.id !== id) } : null);
      toast.success('Provider deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // ── Network Handlers ───────────────────────────────────────────────────────
  const handleAddNetwork = async () => {
    if (!newNetworkName.trim() || !configProvider) return;
    setSavingNetwork(true);
    try {
      const res = await createPaymentNetwork({ providerId: configProvider.id, name: newNetworkName.trim() });
      const newN = res.data || res;
      setConfigProvider(p => p ? { ...p, networks: [...p.networks, newN] } : null);
      setConfigMethod(m => m ? { ...m, providers: m.providers.map(p => p.id === configProvider.id ? { ...p, networks: [...p.networks, newN] } : p) } : null);
      setNewNetworkName('');
      setShowAddNetwork(false);
      toast.success('Network added');
    } catch { toast.error('Failed to add network'); }
    finally { setSavingNetwork(false); }
  };

  const handleToggleNetwork = async (id: string, enabled: boolean) => {
    try {
      await updatePaymentNetwork(id, { isEnabled: enabled });
      setConfigProvider(p => p ? { ...p, networks: p.networks.map(n => n.id === id ? { ...n, isEnabled: enabled } : n) } : null);
      toast.success(enabled ? 'Network enabled' : 'Network disabled');
    } catch { toast.error('Failed to update network'); }
  };

  const handleDeleteNetwork = async (id: string) => {
    if (!confirm('Delete this network?')) return;
    try {
      await deletePaymentNetwork(id);
      setConfigProvider(p => p ? { ...p, networks: p.networks.filter(n => n.id !== id) } : null);
      toast.success('Network deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const txColumns: Column[] = [
    { key: 'id', label: 'ID', width: '80px' },
    { key: 'user', label: 'Customer' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge value={String(v || '')} /> },
    { key: 'linkName', label: 'Source', render: (v) => <span style={{fontSize:'12px', color:textMuted}}>{String(v || 'Direct')}</span> },
  ];

  const linkColumns: Column[] = [
    { key: 'name', label: 'Name' },
    { key: 'amount', label: 'Price' },
    { key: 'clicks', label: 'Clicks', width: '80px' },
    { key: 'url', label: 'Actions', render: (_, row) => (
      <div style={{display:'flex', gap:'8px', justifyContent: 'flex-end'}}>
        <CopyButton text={(row as PayLink).url} />
        <button onClick={() => handleDeleteLink((row as PayLink).id)} style={{width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}><Trash2 size={14}/></button>
      </div>
    )},
  ];

  return (
    <AdminShell>
      <div style={{ marginBottom: '24px' }}>
        <PageHeader title="Direct Payment Hub" subtitle="Manage standalone payments and unified config" />
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, padding: '0 12px', background: surface }}>
          {[
            { id: 'transactions', label: 'History', icon: TrendingUp },
            { id: 'links', label: 'Pay Pages', icon: Link2 },
            { id: 'methods', label: 'Methods', icon: CreditCard },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 20px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '3px solid #1FA89A' : '3px solid transparent', color: activeTab === tab.id ? '#1FA89A' : textMuted, fontWeight: activeTab === tab.id ? 700 : 500, cursor: 'pointer', fontSize: '13.5px', transition: 'all 0.2s' }}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>
          {activeTab === 'transactions' && (
            <DataTable columns={txColumns} data={txData as any} searchPlaceholder="Search history..." onView={(row) => setViewTx(row as any)} />
          )}

          {activeTab === 'links' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button onClick={() => setShowGenModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'linear-gradient(135deg, #1FA89A, #27B9AF)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(31,168,154,0.3)' }}>
                  <Plus size={18} /> Create New Page
                </button>
              </div>
              <DataTable columns={linkColumns} data={payLinks as any} searchPlaceholder="Search pages..." />
            </>
          )}

          {activeTab === 'methods' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button onClick={() => setShowAddMethod(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: `1px solid ${border}`, borderRadius: '10px', color: textMain, background: surface, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                  <Plus size={18} /> Add New Method
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {payMethods.map((m, i) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: surface, borderRadius: '12px', border: `1px solid ${border}`, transition: 'transform 0.2s' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button onClick={() => moveMethod(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === 0 ? 'transparent' : textMuted }}><ArrowUp size={16} /></button>
                      <button onClick={() => moveMethod(i, 1)} disabled={i === payMethods.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === payMethods.length - 1 ? 'transparent' : textMuted }}><ArrowDown size={16} /></button>
                    </div>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--card)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {m.type === 'mobile_wallet' ? <Smartphone size={20} color="#1FA89A" /> : <Building2 size={20} color="#6366f1" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: textMain, fontSize: '15px' }}>{m.name}</div>
                      <div style={{ fontSize: '12px', color: textMuted, marginTop: '2px' }}>{m.type.replace('_', ' ').toUpperCase()} • {m.providers.length} ACTIVE PROVIDERS</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <Toggle on={m.isEnabled} onChange={(v) => handleToggleMethod(m.id, v)} />
                      <button onClick={() => setConfigMethod(m)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--card)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textMuted, cursor: 'pointer' }}>
                        <Settings size={18} />
                      </button>
                      <button onClick={() => handleDeleteMethod(m.id)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal open={!!viewTx} onClose={() => setViewTx(null)} title="Payment Receipt">
        {viewTx && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ textAlign: 'center', padding: '20px 0', borderBottom: `1px dashed ${border}`, marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: textMuted, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Paid</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#1FA89A', marginTop: '4px' }}>{viewTx.amount}</div>
              <div style={{ marginTop: '12px' }}><StatusBadge value={viewTx.status} /></div>
            </div>
            <FormField label="Customer" value={viewTx.user} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Method" value={viewTx.method} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Reference" value={viewTx.ref} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Date" value={viewTx.date} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            {viewTx.linkName && <FormField label="Source" value={viewTx.linkName} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />}
          </div>
        )}
      </Modal>

      <Modal open={showGenModal} onClose={() => setShowGenModal(false)} title="New Payment Page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <FormField label="Page Name" value={genForm.name} onChange={v => setGenForm(f => ({ ...f, name: v }))} placeholder="e.g. Service Fee" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField label="Price" value={genForm.amount} onChange={v => setGenForm(f => ({ ...f, amount: v }))} type="number" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Currency" value={genForm.currency} onChange={v => setGenForm(f => ({ ...f, currency: v }))} options={['ZMW', 'USD']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <FormField label="Public Note" value={genForm.note} onChange={v => setGenForm(f => ({ ...f, note: v }))} type="textarea" placeholder="Displayed to customer..." isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <ModalFooter onClose={() => setShowGenModal(false)} onSubmit={handleGenerateLink} loading={genLoading} submitLabel="Create Page" isDark={isDark} border={border} textMain={textMain} />
        </div>
      </Modal>

      {/* ── Configure Method Modal ── */}
      <Modal open={!!configMethod} onClose={() => setConfigMethod(null)} title={`Config: ${configMethod?.name}`}>
        {configMethod && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: surface, borderRadius: '12px', border: `1px solid ${border}` }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: textMain }}>Active Status</div>
                <div style={{ fontSize: '12px', color: textMuted }}>Visible on Checkout & Pay Page</div>
              </div>
              <Toggle on={configMethod.isEnabled} onChange={(v) => handleToggleMethod(configMethod.id, v)} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Providers</div>
                <button onClick={() => setShowAddProvider(true)} style={{ fontSize: '12px', color: '#1FA89A', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>+ ADD NEW</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {configMethod.providers.map(p => (
                  <div key={p.id} style={{ padding: '14px', border: `1px solid ${border}`, borderRadius: '12px', background: 'var(--card)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: textMain }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: textMuted, marginTop: '2px' }}>{p.networks.length} SUPPORTED NETWORKS</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Toggle on={p.isEnabled} onChange={(v) => handleToggleProvider(p.id, v)} />
                        <button onClick={() => setConfigProvider(p)} style={{ width: '32px', height: '32px', borderRadius: '8px', color: textMuted, background: surface, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Settings size={14} /></button>
                        <button onClick={() => handleDeleteProvider(p.id)} style={{ width: '32px', height: '32px', borderRadius: '8px', color: '#ef4444', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {configMethod.providers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: textMuted, fontSize: '13px', border: `1px dashed ${border}`, borderRadius: '12px' }}>No providers added yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Configure Provider Modal ── */}
      <Modal open={!!configProvider} onClose={() => setConfigProvider(null)} title={`${configProvider?.name} Networks`}>
        {configProvider && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: textMuted, textTransform: 'uppercase' }}>Enabled Networks</div>
              <button onClick={() => setShowAddNetwork(true)} style={{ fontSize: '12px', color: '#1FA89A', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>+ ADD</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {configProvider.networks.map(n => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: `1px solid ${border}`, borderRadius: '10px', background: surface }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: textMain }}>{n.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Toggle on={n.isEnabled} onChange={(v) => handleToggleNetwork(n.id, v)} />
                    <button onClick={() => handleDeleteNetwork(n.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              {configProvider.networks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: textMuted, fontSize: '13px' }}>No networks defined.</div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add Provider Modal ── */}
      <Modal open={showAddProvider} onClose={() => setShowAddProvider(false)} title="Add Provider">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <FormField label="Provider Name" value={addProviderForm.name} onChange={v => setAddProviderForm(f => ({ ...f, name: v }))} placeholder="e.g. MTN Zambia" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Description" value={addProviderForm.description} onChange={v => setAddProviderForm(f => ({ ...f, description: v }))} placeholder="Optional details" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
            <FormField label="Acc Name" value={addProviderForm.accountName} onChange={v => setAddProviderForm(f => ({ ...f, accountName: v }))} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Acc Number" value={addProviderForm.accountNumber} onChange={v => setAddProviderForm(f => ({ ...f, accountNumber: v }))} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <FormField label="API Key (if automated)" value={addProviderForm.apiKey} onChange={v => setAddProviderForm(f => ({ ...f, apiKey: v }))} type="password" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          
          <ModalFooter onClose={() => setShowAddProvider(false)} onSubmit={handleAddProvider} loading={savingProvider} submitLabel="Add Provider" isDark={isDark} border={border} textMain={textMain} />
        </div>
      </Modal>

      {/* ── Add Network Modal ── */}
      <Modal open={showAddNetwork} onClose={() => setShowAddNetwork(false)} title="Add Network">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <FormField label="Network Name" value={newNetworkName} onChange={setNewNetworkName} placeholder="e.g. MTN" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <ModalFooter onClose={() => setShowAddNetwork(false)} onSubmit={handleAddNetwork} loading={savingNetwork} submitLabel="Add Network" isDark={isDark} border={border} textMain={textMain} />
        </div>
      </Modal>

      <Modal open={showAddMethod} onClose={() => setShowAddMethod(false)} title="Add Method">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <FormField label="Method Name" value={addMethodForm.name} onChange={v => setAddMethodForm(f => ({ ...f, name: v }))} placeholder="e.g. Mobile Money" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Category" value={addMethodForm.type} onChange={v => setAddMethodForm(f => ({ ...f, type: v }))} options={METHOD_TYPES.map(t => t.value)} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <ModalFooter onClose={() => setShowAddMethod(false)} onSubmit={handleAddMethod} loading={savingMethod} submitLabel="Add Method" isDark={isDark} border={border} textMain={textMain} />
        </div>
      </Modal>
    </AdminShell>
  );
}
