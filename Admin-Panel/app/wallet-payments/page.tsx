'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, FormField } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import {
  Wallet, Link2, CreditCard, TrendingUp, ChevronDown, Plus, Copy, Check,
  ExternalLink, Settings, Trash2, Edit2, ArrowUp, ArrowDown, RefreshCw,
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

const METHOD_TYPES: { value: string; label: string }[] = [
  { value: 'mobile_wallet', label: 'Mobile Wallet' },
  { value: 'card', label: 'Card Payment' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'digital_wallet', label: 'Digital Wallet' },
];

const FRONTEND_PAYMENT_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || "") + "/pay";

const STATUS_COLOR: Record<string, string> = {
  Completed: '#1FA89A', PAID: '#1FA89A', SUCCESS: '#1FA89A', Active: '#1FA89A', Yes: '#1FA89A',
  Pending: '#FFC107', PENDING: '#FFC107', Failed: '#ef4444', FAILED: '#ef4444', Expired: '#ef4444', No: '#ef4444', Inactive: '#64748b',
};

const STATUS_BG: Record<string, string> = {
  Completed: 'rgba(31,168,154,0.12)', PAID: 'rgba(31,168,154,0.12)', SUCCESS: 'rgba(31,168,154,0.12)', Active: 'rgba(31,168,154,0.12)', Yes: 'rgba(31,168,154,0.12)',
  Pending: 'rgba(255,193,7,0.12)', PENDING: 'rgba(255,193,7,0.12)', Failed: 'rgba(185,28,28,0.12)', FAILED: 'rgba(185,28,28,0.12)', Expired: 'rgba(185,28,28,0.12)',
  No: 'rgba(185,28,28,0.12)', Inactive: 'rgba(100,116,139,0.12)',
};

function StatusBadge({ value }: { value: string }) {
  const displayValue = (value || '').toUpperCase();
  return (
    <span style={{ 
      padding: '3px 10px', 
      borderRadius: '20px', 
      fontSize: '11.5px', 
      fontWeight: 600, 
      background: STATUS_BG[displayValue] ?? 'rgba(100,116,139,0.12)', 
      color: STATUS_COLOR[displayValue] ?? '#64748b' 
    }}>
      {value}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: 'rgba(31,168,154,0.1)', border: '1px solid rgba(31,168,154,0.3)', borderRadius: '7px', cursor: 'pointer', color: '#1FA89A', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-inter)' }}>
      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      style={{ width: '40px', height: '22px', borderRadius: '11px', background: on ? '#1FA89A' : '#334155', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: '3px', left: on ? '20px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </button>
  );
}

export default function DirectPaymentHub() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#101826' : '#F1F5F9';

  type Tab = 'transactions' | 'links' | 'methods';
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [txData, setTxData] = useState<Tx[]>([]);
  const [payLinks, setPayLinks] = useState<PayLink[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [viewTx, setViewTx] = useState<Tx | null>(null);
  const [viewLink, setViewLink] = useState<PayLink | null>(null);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ name: '', amount: '', currency: 'ZMW', note: '' });
  const [genLoading, setGenLoading] = useState(false);

  // ── Payment Config State ──────────────────────────────────────────────────
  const [payMethods, setPayMethods] = useState<PayMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [configMethod, setConfigMethod] = useState<PayMethod | null>(null);
  const [configProvider, setConfigProvider] = useState<PayProvider | null>(null);
  const [providerEditForm, setProviderEditForm] = useState<{ name: string; description: string; config: Record<string, string> }>({ name: '', description: '', config: {} });

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
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleGenerateLink = async () => {
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
    { key: 'id', label: 'Payment ID' },
    { key: 'user', label: 'Customer' },
    { key: 'amount', label: 'Amount' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge value={String(v || '')} /> },
    { key: 'linkName', label: 'Source Link', render: (v) => <span style={{fontSize:'12px', color:textMuted}}>{String(v || 'Direct/WhatsApp')}</span> },
  ];

  const linkColumns: Column[] = [
    { key: 'name', label: 'Link Name' },
    { key: 'amount', label: 'Amount' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'created', label: 'Created' },
    { key: 'url', label: 'Action', render: (_, row) => (
      <div style={{display:'flex', gap:'8px'}}>
        <CopyButton text={(row as PayLink).url} />
        <button onClick={() => handleDeleteLink((row as PayLink).id)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}><Trash2 size={14}/></button>
      </div>
    )},
  ];

  return (
    <AdminShell>
      <PageHeader title="Direct Payment & Management" subtitle="Manage pay pages, payment links, and unified configuration" />

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, padding: '0 16px' }}>
          {[
            { id: 'transactions', label: 'Transactions', icon: TrendingUp },
            { id: 'links', label: 'Payment Links', icon: Link2 },
            { id: 'methods', label: 'Payment Methods', icon: CreditCard },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #1FA89A' : '2px solid transparent', color: activeTab === tab.id ? '#1FA89A' : textMuted, fontWeight: activeTab === tab.id ? 600 : 400, cursor: 'pointer', fontSize: '14px' }}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px' }}>
          {activeTab === 'transactions' && (
            <DataTable columns={txColumns} data={txData as any} searchPlaceholder="Search payments..." onView={(row) => setViewTx(row as any)} />
          )}

          {activeTab === 'links' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button onClick={() => setShowGenModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#1FA89A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={16} /> Create Payment Link
                </button>
              </div>
              <DataTable columns={linkColumns} data={payLinks as any} searchPlaceholder="Search links..." />
            </>
          )}

          {activeTab === 'methods' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button onClick={() => setShowAddMethod(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', border: `1px solid ${border}`, borderRadius: '8px', color: textMain, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={16} /> Add Method
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {payMethods.map((m, i) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: surface, borderRadius: '10px', border: `1px solid ${border}` }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <button onClick={() => moveMethod(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted }}><ArrowUp size={14} /></button>
                      <button onClick={() => moveMethod(i, 1)} disabled={i === payMethods.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted }}><ArrowDown size={14} /></button>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: textMain }}>{m.name}</div>
                      <div style={{ fontSize: '12px', color: textMuted }}>{m.type.replace('_', ' ')} • {m.providers.length} Providers</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Toggle on={m.isEnabled} onChange={(v) => handleToggleMethod(m.id, v)} />
                      <button onClick={() => setConfigMethod(m)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'rgba(31,168,154,0.1)', border: '1px solid rgba(31,168,154,0.3)', borderRadius: '7px', color: '#1FA89A', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        <Settings size={14} /> Configure
                      </button>
                      <button onClick={() => handleDeleteMethod(m.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal open={!!viewTx} onClose={() => setViewTx(null)} title="Payment Details">
        {viewTx && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <FormField label="Payment ID" value={viewTx.id} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Customer" value={viewTx.user} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Amount" value={viewTx.amount} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Status" value={viewTx.status} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Reference" value={viewTx.ref} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            {viewTx.linkName && <FormField label="Source Link" value={viewTx.linkName} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />}
          </div>
        )}
      </Modal>

      <Modal open={showGenModal} onClose={() => setShowGenModal(false)} title="Create Payment Link">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FormField label="Link Name" value={genForm.name} onChange={v => setGenForm(f => ({ ...f, name: v }))} placeholder="e.g. Consulting Fee" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Amount" value={genForm.amount} onChange={v => setGenForm(f => ({ ...f, amount: v }))} type="number" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: textMuted, marginBottom: '4px', display: 'block' }}>Currency</label>
              <select value={genForm.currency} onChange={e => setGenForm(f => ({ ...f, currency: e.target.value }))} style={inputStyle}>
                <option value="ZMW">ZMW</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <FormField label="Note (Optional)" value={genForm.note} onChange={v => setGenForm(f => ({ ...f, note: v }))} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <button onClick={handleGenerateLink} disabled={genLoading} style={{ width: '100%', padding: '12px', background: '#1FA89A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '10px' }}>
            {genLoading ? 'Creating...' : 'Create Link'}
          </button>
        </div>
      </Modal>

      {/* ── Configure Method Modal ── */}
      <Modal open={!!configMethod} onClose={() => setConfigMethod(null)} title={`Configure ${configMethod?.name}`}>
        {configMethod && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: surface, borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: textMain }}>Enable Method</div>
                <div style={{ fontSize: '12px', color: textMuted }}>Turn this payment method on or off globally</div>
              </div>
              <Toggle on={configMethod.isEnabled} onChange={(v) => handleToggleMethod(configMethod.id, v)} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: textMain }}>Providers</div>
                <button onClick={() => setShowAddProvider(true)} style={{ fontSize: '12px', color: '#1FA89A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>+ Add Provider</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {configMethod.providers.map(p => (
                  <div key={p.id} style={{ padding: '12px', border: `1px solid ${border}`, borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: textMain }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: textMuted }}>{p.networks.length} Networks</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Toggle on={p.isEnabled} onChange={(v) => handleToggleProvider(p.id, v)} />
                        <button onClick={() => setConfigProvider(p)} style={{ padding: '6px', color: textMuted, background: 'none', border: 'none', cursor: 'pointer' }}><Settings size={14} /></button>
                        <button onClick={() => handleDeleteProvider(p.id)} style={{ padding: '6px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Configure Provider Modal ── */}
      <Modal open={!!configProvider} onClose={() => setConfigProvider(null)} title={`Provider: ${configProvider?.name}`}>
        {configProvider && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: textMain }}>Networks</div>
              <button onClick={() => setShowAddNetwork(true)} style={{ fontSize: '12px', color: '#1FA89A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>+ Add Network</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {configProvider.networks.map(n => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: '8px' }}>
                  <span style={{ fontSize: '13px', color: textMain }}>{n.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Toggle on={n.isEnabled} onChange={(v) => handleToggleNetwork(n.id, v)} />
                    <button onClick={() => handleDeleteNetwork(n.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add Provider Modal ── */}
      <Modal open={showAddProvider} onClose={() => setShowAddProvider(false)} title="Add Provider">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FormField label="Provider Name" value={addProviderForm.name} onChange={v => setAddProviderForm(f => ({ ...f, name: v }))} placeholder="e.g. MTN Zambia, Standard Chartered" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Description" value={addProviderForm.description} onChange={v => setAddProviderForm(f => ({ ...f, description: v }))} placeholder="Internal description" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          
          <div style={{ fontSize: '11px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', marginTop: '4px' }}>Configuration (Optional)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="Account Name" value={addProviderForm.accountName} onChange={v => setAddProviderForm(f => ({ ...f, accountName: v }))} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Account Number" value={addProviderForm.accountNumber} onChange={v => setAddProviderForm(f => ({ ...f, accountNumber: v }))} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <FormField label="API Key / Secret" value={addProviderForm.apiKey} onChange={v => setAddProviderForm(f => ({ ...f, apiKey: v }))} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          
          <button onClick={handleAddProvider} disabled={savingProvider} style={{ width: '100%', padding: '12px', background: '#1FA89A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '10px' }}>
            {savingProvider ? 'Saving...' : 'Add Provider'}
          </button>
        </div>
      </Modal>

      {/* ── Add Network Modal ── */}
      <Modal open={showAddNetwork} onClose={() => setShowAddNetwork(false)} title="Add Network">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FormField label="Network Name" value={newNetworkName} onChange={setNewNetworkName} placeholder="e.g. MTN, Airtel, Zamtel" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <button onClick={handleAddNetwork} disabled={savingNetwork} style={{ width: '100%', padding: '12px', background: '#1FA89A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '10px' }}>
            {savingNetwork ? 'Adding...' : 'Add Network'}
          </button>
        </div>
      </Modal>

      <Modal open={showAddMethod} onClose={() => setShowAddMethod(false)} title="Add Payment Method">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FormField label="Method Name" value={addMethodForm.name} onChange={v => setAddMethodForm(f => ({ ...f, name: v }))} placeholder="e.g. Airtel Money" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: textMuted, marginBottom: '4px', display: 'block' }}>Type</label>
            <select value={addMethodForm.type} onChange={e => setAddMethodForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
              {METHOD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <button onClick={handleAddMethod} disabled={savingMethod} style={{ width: '100%', padding: '12px', background: '#1FA89A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '10px' }}>
            {savingMethod ? 'Saving...' : 'Add Method'}
          </button>
        </div>
      </Modal>
    </AdminShell>
  );
}
