'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import {
  Search, X, ChevronRight, Package, Truck, MapPin,
  CheckCircle, RefreshCw, User, ArrowRight, Mail,
  Phone, ShoppingBag, Clock, AlertCircle, Ban, Trash2,
  Link2, CreditCard, TrendingUp, Plus, Copy, Check,
  ExternalLink, Settings, Edit2, ArrowUp, ArrowDown,
  Smartphone, Building2, MoreHorizontal, Eye
} from 'lucide-react';
import {
  getDirectPayments, getPaymentLinks, createPaymentLink, deletePaymentLink,
  getPaymentMethods, updatePaymentMethod, deletePaymentMethod, reorderPaymentMethods,
  createPaymentMethod, createPaymentProvider, updatePaymentProvider, deletePaymentProvider,
  createPaymentNetwork, updatePaymentNetwork, deletePaymentNetwork,
} from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────
type Tx = { 
  id: string; 
  user: string; 
  userEmail?: string;
  type: string; 
  method: string; 
  amount: number; 
  currency: string;
  date: string; 
  status: string; 
  ref: string;
  linkName?: string;
  linkId?: string;
};

type PayLink = { 
  id: string; 
  name: string; 
  url: string; 
  amount: number; 
  currency: string; 
  note: string; 
  clicks: number; 
  status: string; 
  createdAt: string; 
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

// ─── Status display config ────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED: { label: 'Completed', color: '#1FA89A', bg: 'rgba(31,168,154,0.12)' },
  PAID:      { label: 'Paid',      color: '#1FA89A', bg: 'rgba(31,168,154,0.12)' },
  SUCCESS:   { label: 'Success',   color: '#1FA89A', bg: 'rgba(31,168,154,0.12)' },
  ACTIVE:    { label: 'Active',    color: '#1FA89A', bg: 'rgba(31,168,154,0.12)' },
  PENDING:   { label: 'Pending',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  FAILED:    { label: 'Failed',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  EXPIRED:   { label: 'Expired',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  INACTIVE:  { label: 'Inactive',  color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
};

// ─── Helpers ──────────────────────────────────────────────
const fmtDate = (iso: string) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtTime = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};
const fmtMoney = (amount: number, symbol = 'ZMW') =>
  `${symbol} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

// ─── Main Content ─────────────────────────────────────────
function WalletPaymentsContent() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const dark = theme === 'dark';
  const T = {
    card:    dark ? '#0D1523' : '#FFFFFF',
    border:  dark ? '#1E293B' : '#E2E8F0',
    text:    dark ? '#FFFFFF' : '#0F172A',
    muted:   dark ? '#8E9AAF' : '#64748B',
    surface: dark ? '#101826' : '#F1F5F9',
    hover:   dark ? '#152035' : '#F8FAFC',
    panel:   dark ? '#0A1220' : '#FFFFFF',
    input:   dark ? '#0D1523' : '#FFFFFF',
  };

  const r = (user?.role || '').toUpperCase().replace(/[\s_]+/g, '');
  const canDelete = r === 'ADMIN' || r === 'SUPERADMIN' || r === 'MANAGER';

  type Tab = 'transactions' | 'links' | 'methods';
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [txData, setTxData] = useState<Tx[]>([]);
  const [payLinks, setPayLinks] = useState<PayLink[]>([]);
  const [payMethods, setPayMethods] = useState<PayMethod[]>([]);
  
  const [detail, setDetail] = useState<Tx | null>(null);
  const [linkDetail, setLinkDetail] = useState<PayLink | null>(null);
  
  const [showGenModal, setShowGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ name: '', amount: '', currency: 'ZMW', note: '' });
  const [genLoading, setGenLoading] = useState(false);

  const [configMethod, setConfigMethod] = useState<PayMethod | null>(null);
  const [configProvider, setConfigProvider] = useState<PayProvider | null>(null);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [addMethodForm, setAddMethodForm] = useState({ name: '', type: 'mobile_wallet' });
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [addProviderForm, setAddProviderForm] = useState({ name: '', description: '', accountName: '', accountNumber: '', bankName: '', apiKey: '' });
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [newNetworkName, setNewNetworkName] = useState('');

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'transactions') {
        const res = await getDirectPayments({ limit: 500 });
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setTxData(raw.map((d: any) => ({
          id: d.id,
          user: d.user ? `${d.user.firstName || ''} ${d.user.lastName || ''}`.trim() || d.user.email : 'Guest Customer',
          userEmail: d.user?.email,
          type: 'Direct Payment',
          method: d.paymentMethod || 'Mobile Money',
          amount: Number(d.amount) || 0,
          currency: d.currency || 'ZMW',
          date: d.createdAt || '',
          status: d.status,
          ref: d.paymentReference || d.paymentNumber || '',
          linkName: d.paymentLink?.name,
          linkId: d.paymentLink?.id
        })));
      } else if (activeTab === 'links') {
        const res = await getPaymentLinks();
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setPayLinks(raw.map((l: any) => ({
          ...l,
          url: `${FRONTEND_PAYMENT_URL}/${l.id}`,
          amount: Number(l.amount) || 0,
          currency: l.currency || 'ZMW',
          createdAt: l.createdAt || ''
        })));
      } else if (activeTab === 'methods') {
        const res = await getPaymentMethods();
        setPayMethods(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered Lists ────────────────────────────────────────────────────────
  const filteredTx = useMemo(() => {
    if (!search.trim()) return txData;
    const q = search.toLowerCase();
    return txData.filter(t => 
      t.user.toLowerCase().includes(q) || 
      t.ref.toLowerCase().includes(q) || 
      (t.linkName || '').toLowerCase().includes(q)
    );
  }, [txData, search]);

  const filteredLinks = useMemo(() => {
    if (!search.trim()) return payLinks;
    const q = search.toLowerCase();
    return payLinks.filter(l => l.name.toLowerCase().includes(q));
  }, [payLinks, search]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleGenerateLink = async () => {
    if (!genForm.name.trim()) { toast.error('Link name is required'); return; }
    setGenLoading(true);
    try {
      await createPaymentLink({ ...genForm, amount: Number(genForm.amount) });
      toast.success('Payment link created!');
      setShowGenModal(false);
      setGenForm({ name: '', amount: '', currency: 'ZMW', note: '' });
      fetchData();
    } catch { toast.error('Failed to create link'); }
    finally { setGenLoading(false); }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Delete this payment link?')) return;
    try {
      await deletePaymentLink(id);
      fetchData();
      toast.success('Link deleted');
    } catch { toast.error('Failed to delete link'); }
  };

  const handleToggleMethod = async (id: string, enabled: boolean) => {
    try {
      await updatePaymentMethod(id, { isEnabled: enabled });
      setPayMethods(ms => ms.map(m => m.id === id ? { ...m, isEnabled: enabled } : m));
      toast.success(enabled ? 'Method enabled' : 'Method disabled');
    } catch { toast.error('Failed to update'); }
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

  return (
    <AdminShell noPadding>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: T.panel }}>
        
        {/* ── Top Header (Orders Style) ── */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${T.border}`, background: T.panel }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: T.text, margin: 0, letterSpacing: '-0.02em' }}>Direct Payment Hub</h1>
              <p style={{ fontSize: '0.75rem', color: T.muted, margin: '0.25rem 0 0 0' }}>Manage standalone payments, pay pages, and unified configuration</p>
            </div>
            {activeTab === 'links' && (
              <button onClick={() => setShowGenModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: '#00D4AA', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                <Plus size={16} /> Create Pay Page
              </button>
            )}
            {activeTab === 'methods' && (
              <button onClick={() => setShowAddMethod(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                <Plus size={16} /> Add Method
              </button>
            )}
          </div>

          {/* Tabs (Orders Style) */}
          <div style={{ display: 'flex', gap: '1.5rem', borderBottom: `1px solid ${T.border}`, marginBottom: '-1.25rem' }}>
            {[
              { id: 'transactions', label: 'Transactions', icon: TrendingUp },
              { id: 'links', label: 'Pay Pages', icon: Link2 },
              { id: 'methods', label: 'Payment Config', icon: CreditCard },
            ].map(t => (
              <button key={t.id} onClick={() => { setActiveTab(t.id as Tab); setSearch(''); }} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 0.25rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === t.id ? '2px solid #00D4AA' : '2px solid transparent', color: activeTab === t.id ? '#00D4AA' : T.muted, fontWeight: activeTab === t.id ? 700 : 500, cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.2s' }}>
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Search & Filter Bar (Orders Style) ── */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: '1rem', alignItems: 'center', background: T.panel }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={14} color={T.muted} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'transactions' ? "Search by reference, customer..." : "Search..."}
              style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.2rem', background: T.input, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.text, fontSize: '0.8rem', outline: 'none' }}
            />
          </div>
          <button onClick={() => fetchData()} style={{ padding: '0.55rem', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.input, color: T.muted, cursor: 'pointer' }}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </div>

        {/* ── Table / List Area (Orders Style) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: T.muted, fontSize: '0.85rem' }}>Loading data...</div>
          ) : (
            <>
              {activeTab === 'transactions' && (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.surface }}>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: T.muted, textTransform: 'uppercase', fontSize: '0.7rem' }}>Reference</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: T.muted, textTransform: 'uppercase', fontSize: '0.7rem' }}>Customer</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: T.muted, textTransform: 'uppercase', fontSize: '0.7rem' }}>Date</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: T.muted, textTransform: 'uppercase', fontSize: '0.7rem' }}>Method</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: T.muted, textTransform: 'uppercase', fontSize: '0.7rem' }}>Amount</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: T.muted, textTransform: 'uppercase', fontSize: '0.7rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: T.muted, textTransform: 'uppercase', fontSize: '0.7rem' }}>Source</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTx.map(t => {
                        const sc = STATUS_CFG[t.status?.toUpperCase()] || STATUS_CFG.PENDING;
                        return (
                          <tr key={t.id} onClick={() => setDetail(t)} style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = T.hover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: T.text }}>{t.ref}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: 600, color: T.text }}>{t.user}</div>
                              {t.userEmail && <div style={{ fontSize: '0.7rem', color: T.muted }}>{t.userEmail}</div>}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: T.muted }}>{fmtDate(t.date)}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: 'rgba(129,140,248,0.1)', color: '#818CF8' }}>{t.method}</span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: T.text }}>{fmtMoney(t.amount, t.currency)}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{ background: sc.bg, color: sc.color, fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px' }}>{sc.label}</span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: T.muted }}>{t.linkName || 'Direct'}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}><ChevronRight size={14} color={T.muted} /></td>
                          </tr>
                        );
                      })}
                      {filteredTx.length === 0 && <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: T.muted }}>No transactions found</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'links' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                  {filteredLinks.map(l => (
                    <div key={l.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }} onClick={() => setLinkDetail(l)} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(0,212,170,0.1)', color: '#00D4AA', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Link2 size={18} /></div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: T.muted }}>{fmtDate(l.createdAt)}</span>
                      </div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: T.text, margin: '0 0 0.25rem 0' }}>{l.name}</h3>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00D4AA', marginBottom: '1rem' }}>{fmtMoney(l.amount, l.currency)}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.65rem', color: T.muted, textTransform: 'uppercase', fontWeight: 700 }}>Clicks</div><div style={{ fontSize: '0.9rem', fontWeight: 700, color: T.text }}>{l.clicks}</div></div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => { navigator.clipboard.writeText(l.url); toast.success('Link copied'); }} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Copy size={12} /> Copy</button>
                          <button onClick={() => handleDeleteLink(l.id)} style={{ padding: '0.4rem', borderRadius: '6px', border: 'none', background: 'rgba(248,113,113,0.1)', color: '#F87171', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'methods' && (
                <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {payMethods.map((m, i) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: T.card, borderRadius: '12px', border: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => moveMethod(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === 0 ? 'transparent' : T.muted }}><ArrowUp size={14} /></button>
                        <button onClick={() => moveMethod(i, 1)} disabled={i === payMethods.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === payMethods.length - 1 ? 'transparent' : T.muted }}><ArrowDown size={14} /></button>
                      </div>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {m.type === 'mobile_wallet' ? <Smartphone size={20} color="#00D4AA" /> : <Building2 size={20} color="#818CF8" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: T.text, fontSize: '0.9rem' }}>{m.name}</div>
                        <div style={{ fontSize: '0.7rem', color: T.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{m.type.replace('_', ' ')} • {m.providers.length} Providers</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div onClick={() => handleToggleMethod(m.id, !m.isEnabled)} style={{ width: '36px', height: '20px', borderRadius: '10px', background: m.isEnabled ? '#00D4AA' : T.border, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                          <div style={{ position: 'absolute', top: '2px', left: m.isEnabled ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </div>
                        <button onClick={() => setConfigMethod(m)} style={{ padding: '0.5rem', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.surface, color: T.muted, cursor: 'pointer' }}><Settings size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Detail Slide-in Panel (Orders Style) ── */}
        {detail && (
          <>
            <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
            <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', maxWidth: '90vw', background: T.panel, borderLeft: `1px solid ${T.border}`, zIndex: 101, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 800, color: T.text, margin: 0 }}>Payment Details</h2>
                  <p style={{ fontSize: '0.7rem', color: T.muted, margin: '0.1rem 0 0 0' }}>Ref: {detail.ref}</p>
                </div>
                <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted }}><X size={18} /></button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: T.surface, borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: T.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Amount Received</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#00D4AA' }}>{fmtMoney(detail.amount, detail.currency)}</div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <span style={{ background: STATUS_CFG[detail.status?.toUpperCase()]?.bg || 'rgba(0,0,0,0.1)', color: STATUS_CFG[detail.status?.toUpperCase()]?.color || T.muted, fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: '6px' }}>{detail.status}</span>
                  </div>
                </div>
                
                <div style={{ background: T.surface, borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Customer Information</div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: T.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color={T.muted} /></div>
                    <div>
                      <div style={{ fontWeight: 700, color: T.text, fontSize: '0.9rem' }}>{detail.user}</div>
                      <div style={{ fontSize: '0.75rem', color: T.muted }}>{detail.userEmail || 'No email provided'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: T.surface, borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: T.muted, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Payment Source</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: T.muted }}>Method</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>{detail.method}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: T.muted }}>Origin</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>{detail.linkName || 'Direct'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: T.muted }}>Date</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>{fmtDate(detail.date)} {fmtTime(detail.date)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* ── Modals (Using existing styles) ── */}
      {showGenModal && (
        <>
          <div onClick={() => setShowGenModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', background: T.panel, border: `1px solid ${T.border}`, borderRadius: '16px', padding: '1.5rem', zIndex: 201 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: T.text, margin: '0 0 1.25rem 0' }}>Create Payment Page</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Page Name</label>
                <input value={genForm.name} onChange={e => setGenForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Consulting Fee" style={{ width: '100%', padding: '0.6rem 0.75rem', background: T.input, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.text, fontSize: '0.85rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Price</label>
                  <input type="number" value={genForm.amount} onChange={e => setGenForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={{ width: '100%', padding: '0.6rem 0.75rem', background: T.input, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.text, fontSize: '0.85rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Currency</label>
                  <select value={genForm.currency} onChange={e => setGenForm(f => ({ ...f, currency: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem', background: T.input, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.text, fontSize: '0.85rem', outline: 'none' }}>
                    <option value="ZMW">ZMW</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Note (Optional)</label>
                <textarea value={genForm.note} onChange={e => setGenForm(f => ({ ...f, note: e.target.value }))} placeholder="Visible to customer..." rows={3} style={{ width: '100%', padding: '0.6rem 0.75rem', background: T.input, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.text, fontSize: '0.85rem', outline: 'none', resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setShowGenModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: `1px solid ${T.border}`, background: 'none', color: T.text, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleGenerateLink} disabled={genLoading} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#00D4AA', color: '#000', fontWeight: 700, cursor: 'pointer', opacity: genLoading ? 0.6 : 1 }}>{genLoading ? 'Creating...' : 'Create Page'}</button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </AdminShell>
  );
}

export default function WalletPaymentsPage() {
  return <WalletPaymentsContent />;
}
