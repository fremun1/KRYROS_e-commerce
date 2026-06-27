'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import {
  Search, X, ChevronRight, RefreshCw, User, Trash2,
  Link2, CreditCard, TrendingUp, Plus, Copy,
  Settings, Edit2, ArrowUp, ArrowDown, Smartphone, Building2,
} from 'lucide-react';
import {
  getDirectPayments, getPaymentLinks, createPaymentLink, deletePaymentLink,
  getPaymentMethods, updatePaymentMethod, deletePaymentMethod, reorderPaymentMethods,
  createPaymentMethod, createPaymentProvider, updatePaymentProvider, deletePaymentProvider,
  createPaymentNetwork, updatePaymentNetwork, deletePaymentNetwork,
} from '@/lib/api';
import toast from 'react-hot-toast';

type Tx = {
  id: string;
  user: string;
  userEmail?: string;
  method: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  ref: string;
  linkName?: string;
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
type PayProvider = {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  sortOrder: number;
  config?: Record<string, string>;
  networks: PayNetwork[];
};
type PayMethod = {
  id: string;
  name: string;
  type: string;
  isEnabled: boolean;
  sortOrder: number;
  providers: PayProvider[];
};

type MethodForm = { name: string; type: string; isEnabled: boolean };
type ProviderForm = {
  name: string;
  description: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  apiKey: string;
  isEnabled: boolean;
};
type NetworkForm = { name: string; isEnabled: boolean };

const METHOD_TYPES = [
  { value: 'mobile_wallet', label: 'Mobile Wallet' },
  { value: 'card', label: 'Card Payment' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'digital_wallet', label: 'Digital Wallet' },
];

const FRONTEND_PAYMENT_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || '') + '/pay';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED: { label: 'Completed', color: '#1FA89A', bg: 'rgba(31,168,154,0.12)' },
  PAID: { label: 'Paid', color: '#1FA89A', bg: 'rgba(31,168,154,0.12)' },
  SUCCESS: { label: 'Success', color: '#1FA89A', bg: 'rgba(31,168,154,0.12)' },
  ACTIVE: { label: 'Active', color: '#1FA89A', bg: 'rgba(31,168,154,0.12)' },
  PENDING: { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  FAILED: { label: 'Failed', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  EXPIRED: { label: 'Expired', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  INACTIVE: { label: 'Inactive', color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
};

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
const normalizeRole = (role?: string) => (role || '').toUpperCase().replace(/[\s_]+/g, '');
const maskValue = (value?: string) => {
  if (!value) return 'Not set';
  if (value.length <= 4) return value;
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
};

function WalletPaymentsContent() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const dark = theme === 'dark';
  const T = {
    card: dark ? '#0D1523' : '#FFFFFF',
    border: dark ? '#1E293B' : '#E2E8F0',
    text: dark ? '#FFFFFF' : '#0F172A',
    muted: dark ? '#8E9AAF' : '#64748B',
    surface: dark ? '#101826' : '#F1F5F9',
    hover: dark ? '#152035' : '#F8FAFC',
    panel: dark ? '#0A1220' : '#FFFFFF',
    input: dark ? '#0D1523' : '#FFFFFF',
  };

  const role = normalizeRole(user?.role);
  const canManage = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'MANAGER';

  type Tab = 'transactions' | 'links' | 'methods';
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [txData, setTxData] = useState<Tx[]>([]);
  const [payLinks, setPayLinks] = useState<PayLink[]>([]);
  const [payMethods, setPayMethods] = useState<PayMethod[]>([]);
  const [detail, setDetail] = useState<Tx | null>(null);

  const [showGenModal, setShowGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ name: '', amount: '', currency: 'ZMW', note: '' });
  const [genLoading, setGenLoading] = useState(false);

  const [showMethodModal, setShowMethodModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PayMethod | null>(null);
  const [methodForm, setMethodForm] = useState<MethodForm>({ name: '', type: 'mobile_wallet', isEnabled: true });

  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<PayProvider | null>(null);
  const [providerMethod, setProviderMethod] = useState<PayMethod | null>(null);
  const [providerForm, setProviderForm] = useState<ProviderForm>({
    name: '',
    description: '',
    accountName: '',
    accountNumber: '',
    bankName: '',
    apiKey: '',
    isEnabled: true,
  });

  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<PayNetwork | null>(null);
  const [networkMethod, setNetworkMethod] = useState<PayMethod | null>(null);
  const [networkProvider, setNetworkProvider] = useState<PayProvider | null>(null);
  const [networkForm, setNetworkForm] = useState<NetworkForm>({ name: '', isEnabled: true });

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
          method: d.paymentMethod || 'Mobile Money',
          amount: Number(d.amount) || 0,
          currency: d.currency || 'ZMW',
          date: d.createdAt || '',
          status: d.status || 'PENDING',
          ref: d.paymentReference || d.paymentNumber || '',
          linkName: d.paymentLink?.name,
        })));
      } else if (activeTab === 'links') {
        const res = await getPaymentLinks();
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setPayLinks(raw.map((l: any) => ({
          ...l,
          url: `${FRONTEND_PAYMENT_URL}/${l.id}`,
          amount: Number(l.amount) || 0,
          currency: l.currency || 'ZMW',
          createdAt: l.createdAt || '',
        })));
      } else {
        const res = await getPaymentMethods();
        setPayMethods(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredTx = useMemo(() => {
    if (!search.trim()) return txData;
    const q = search.toLowerCase();
    return txData.filter((t) =>
      t.user.toLowerCase().includes(q) ||
      t.ref.toLowerCase().includes(q) ||
      (t.linkName || '').toLowerCase().includes(q) ||
      t.method.toLowerCase().includes(q),
    );
  }, [txData, search]);

  const filteredLinks = useMemo(() => {
    if (!search.trim()) return payLinks;
    const q = search.toLowerCase();
    return payLinks.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      (l.note || '').toLowerCase().includes(q),
    );
  }, [payLinks, search]);

  const filteredMethods = useMemo(() => {
    if (!search.trim()) return payMethods;
    const q = search.toLowerCase();
    return payMethods.filter((method) =>
      method.name.toLowerCase().includes(q) ||
      method.type.toLowerCase().includes(q) ||
      method.providers.some((provider) =>
        provider.name.toLowerCase().includes(q) ||
        (provider.description || '').toLowerCase().includes(q) ||
        provider.networks.some((network) => network.name.toLowerCase().includes(q)),
      ),
    );
  }, [payMethods, search]);

  const actionButton = (variant: 'primary' | 'default' | 'danger' = 'default') => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.55rem 0.85rem',
    borderRadius: '8px',
    border: variant === 'primary' ? 'none' : `1px solid ${variant === 'danger' ? 'rgba(248,113,113,0.22)' : T.border}`,
    background:
      variant === 'primary'
        ? '#00D4AA'
        : variant === 'danger'
          ? 'rgba(248,113,113,0.1)'
          : T.surface,
    color:
      variant === 'primary'
        ? '#04130F'
        : variant === 'danger'
          ? '#F87171'
          : T.text,
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  });

  const handleGenerateLink = async () => {
    if (!genForm.name.trim()) {
      toast.error('Link name is required');
      return;
    }
    setGenLoading(true);
    try {
      await createPaymentLink({ ...genForm, amount: Number(genForm.amount) });
      toast.success('Payment link created');
      setShowGenModal(false);
      setGenForm({ name: '', amount: '', currency: 'ZMW', note: '' });
      fetchData();
    } catch {
      toast.error('Failed to create payment link');
    } finally {
      setGenLoading(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Delete this payment link?')) return;
    try {
      await deletePaymentLink(id);
      toast.success('Payment link deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete payment link');
    }
  };

  const handleToggleMethod = async (method: PayMethod, enabled: boolean) => {
    try {
      await updatePaymentMethod(method.id, { isEnabled: enabled });
      setPayMethods((current) => current.map((item) => item.id === method.id ? { ...item, isEnabled: enabled } : item));
      toast.success(enabled ? 'Method enabled' : 'Method disabled');
    } catch {
      toast.error('Failed to update method');
    }
  };

  const handleToggleProvider = async (provider: PayProvider, enabled: boolean) => {
    try {
      await updatePaymentProvider(provider.id, { isEnabled: enabled });
      setPayMethods((current) => current.map((method) => ({
        ...method,
        providers: method.providers.map((item) => item.id === provider.id ? { ...item, isEnabled: enabled } : item),
      })));
      toast.success(enabled ? 'Provider enabled' : 'Provider disabled');
    } catch {
      toast.error('Failed to update provider');
    }
  };

  const handleToggleNetwork = async (network: PayNetwork, enabled: boolean) => {
    try {
      await updatePaymentNetwork(network.id, { isEnabled: enabled });
      setPayMethods((current) => current.map((method) => ({
        ...method,
        providers: method.providers.map((provider) => ({
          ...provider,
          networks: provider.networks.map((item) => item.id === network.id ? { ...item, isEnabled: enabled } : item),
        })),
      })));
      toast.success(enabled ? 'Network enabled' : 'Network disabled');
    } catch {
      toast.error('Failed to update network');
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
      await reorderPaymentMethods(updated.map((m) => ({ id: m.id, sortOrder: m.sortOrder })));
      toast.success('Method order updated');
    } catch {
      toast.error('Failed to reorder methods');
      fetchData();
    }
  };

  const openMethodModal = (method?: PayMethod) => {
    setEditingMethod(method || null);
    setMethodForm({
      name: method?.name || '',
      type: method?.type || 'mobile_wallet',
      isEnabled: method?.isEnabled ?? true,
    });
    setShowMethodModal(true);
  };

  const saveMethod = async () => {
    if (!methodForm.name.trim()) {
      toast.error('Method name is required');
      return;
    }
    try {
      if (editingMethod) {
        await updatePaymentMethod(editingMethod.id, methodForm);
        toast.success('Payment method updated');
      } else {
        await createPaymentMethod(methodForm);
        toast.success('Payment method added');
      }
      setShowMethodModal(false);
      setEditingMethod(null);
      setMethodForm({ name: '', type: 'mobile_wallet', isEnabled: true });
      fetchData();
    } catch {
      toast.error('Failed to save payment method');
    }
  };

  const handleDeleteMethod = async (method: PayMethod) => {
    if (!confirm(`Delete "${method.name}" and all of its providers?`)) return;
    try {
      await deletePaymentMethod(method.id);
      toast.success('Payment method deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete payment method');
    }
  };

  const openProviderModal = (method: PayMethod, provider?: PayProvider) => {
    setProviderMethod(method);
    setEditingProvider(provider || null);
    setProviderForm({
      name: provider?.name || '',
      description: provider?.description || '',
      accountName: String(provider?.config?.accountName || ''),
      accountNumber: String(provider?.config?.accountNumber || ''),
      bankName: String(provider?.config?.bankName || ''),
      apiKey: String(provider?.config?.apiKey || ''),
      isEnabled: provider?.isEnabled ?? true,
    });
    setShowProviderModal(true);
  };

  const saveProvider = async () => {
    if (!providerMethod) return;
    if (!providerForm.name.trim()) {
      toast.error('Provider name is required');
      return;
    }
    const config = Object.fromEntries(
      Object.entries({
        accountName: providerForm.accountName,
        accountNumber: providerForm.accountNumber,
        bankName: providerForm.bankName,
        apiKey: providerForm.apiKey,
      }).filter(([, value]) => value.trim()),
    );

    try {
      if (editingProvider) {
        await updatePaymentProvider(editingProvider.id, {
          name: providerForm.name,
          description: providerForm.description,
          isEnabled: providerForm.isEnabled,
          config,
        });
        toast.success('Provider updated');
      } else {
        await createPaymentProvider({
          paymentMethodId: providerMethod.id,
          name: providerForm.name,
          description: providerForm.description,
          config,
        });
        if (!providerForm.isEnabled) {
          const refreshed = await getPaymentMethods();
          const methods = Array.isArray(refreshed.data) ? refreshed.data : (refreshed.data?.data ?? []);
          const addedMethod = methods.find((item: PayMethod) => item.id === providerMethod.id);
          const addedProvider = addedMethod?.providers?.[addedMethod.providers.length - 1];
          if (addedProvider) await updatePaymentProvider(addedProvider.id, { isEnabled: false });
        }
        toast.success('Provider added');
      }
      setShowProviderModal(false);
      setEditingProvider(null);
      setProviderMethod(null);
      fetchData();
    } catch {
      toast.error('Failed to save provider');
    }
  };

  const handleDeleteProvider = async (provider: PayProvider) => {
    if (!confirm(`Delete provider "${provider.name}"?`)) return;
    try {
      await deletePaymentProvider(provider.id);
      toast.success('Provider deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete provider');
    }
  };

  const openNetworkModal = (method: PayMethod, provider: PayProvider, network?: PayNetwork) => {
    setNetworkMethod(method);
    setNetworkProvider(provider);
    setEditingNetwork(network || null);
    setNetworkForm({ name: network?.name || '', isEnabled: network?.isEnabled ?? true });
    setShowNetworkModal(true);
  };

  const saveNetwork = async () => {
    if (!networkProvider) return;
    if (!networkForm.name.trim()) {
      toast.error('Network name is required');
      return;
    }
    try {
      if (editingNetwork) {
        await updatePaymentNetwork(editingNetwork.id, networkForm);
        toast.success('Network updated');
      } else {
        await createPaymentNetwork({ providerId: networkProvider.id, name: networkForm.name });
        if (!networkForm.isEnabled) {
          const refreshed = await getPaymentMethods();
          const methods = Array.isArray(refreshed.data) ? refreshed.data : (refreshed.data?.data ?? []);
          const addedMethod = methods.find((item: PayMethod) => item.id === networkMethod?.id);
          const addedProvider = addedMethod?.providers.find((item: PayProvider) => item.id === networkProvider.id);
          const addedNetwork = addedProvider?.networks?.[addedProvider.networks.length - 1];
          if (addedNetwork) await updatePaymentNetwork(addedNetwork.id, { isEnabled: false });
        }
        toast.success('Network added');
      }
      setShowNetworkModal(false);
      setEditingNetwork(null);
      setNetworkProvider(null);
      setNetworkMethod(null);
      setNetworkForm({ name: '', isEnabled: true });
      fetchData();
    } catch {
      toast.error('Failed to save network');
    }
  };

  const handleDeleteNetwork = async (network: PayNetwork) => {
    if (!confirm(`Delete network "${network.name}"?`)) return;
    try {
      await deletePaymentNetwork(network.id);
      toast.success('Network deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete network');
    }
  };

  return (
    <AdminShell noPadding>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', background: T.panel }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${T.border}`, background: T.panel }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: T.text, margin: 0, letterSpacing: '-0.02em' }}>Wallet & Payments</h1>
              <p style={{ fontSize: '0.78rem', color: T.muted, margin: '0.35rem 0 0 0', maxWidth: '720px', lineHeight: 1.5 }}>
                Manage direct payments, payment pages, and checkout method configuration from one place.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {activeTab === 'links' && (
                <button onClick={() => setShowGenModal(true)} style={actionButton('primary')}>
                  <Plus size={15} /> Create Pay Page
                </button>
              )}
              {activeTab === 'methods' && canManage && (
                <button onClick={() => openMethodModal()} style={actionButton('default')}>
                  <Plus size={15} /> Add Method
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', borderBottom: `1px solid ${T.border}`, marginBottom: '-1.25rem', flexWrap: 'wrap' }}>
            {[
              { id: 'transactions', label: 'Transactions', icon: TrendingUp },
              { id: 'links', label: 'Pay Pages', icon: Link2 },
              { id: 'methods', label: 'Payment Config', icon: CreditCard },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id as Tab); setSearch(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 0.25rem 1rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === t.id ? '2px solid #00D4AA' : '2px solid transparent',
                  color: activeTab === t.id ? '#00D4AA' : T.muted,
                  fontWeight: activeTab === t.id ? 700 : 500,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '0.75rem 1.5rem', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: '1rem', alignItems: 'center', background: T.panel, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: activeTab === 'methods' ? '540px' : '400px' }}>
            <Search size={14} color={T.muted} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'transactions'
                  ? 'Search by reference, customer, or method...'
                  : activeTab === 'links'
                    ? 'Search pay pages...'
                    : 'Search methods, providers, or networks...'
              }
              style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem', background: T.input, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.text, fontSize: '0.8rem', outline: 'none' }}
            />
          </div>
          <button onClick={() => fetchData()} style={{ ...actionButton('default'), padding: '0.55rem 0.7rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px', color: T.muted, fontSize: '0.85rem' }}>
              Loading data...
            </div>
          ) : (
            <>
              {activeTab === 'transactions' && (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.surface }}>
                        <th style={tableHead}>Reference</th>
                        <th style={tableHead}>Customer</th>
                        <th style={tableHead}>Date</th>
                        <th style={tableHead}>Method</th>
                        <th style={tableHead}>Amount</th>
                        <th style={tableHead}>Status</th>
                        <th style={tableHead}>Source</th>
                        <th style={tableHead}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTx.map((t) => {
                        const sc = STATUS_CFG[t.status?.toUpperCase()] || STATUS_CFG.PENDING;
                        return (
                          <tr
                            key={t.id}
                            onClick={() => setDetail(t)}
                            style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = T.hover; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <td style={tableCellStrong}>{t.ref}</td>
                            <td style={tableCell}>
                              <div style={{ fontWeight: 600, color: T.text }}>{t.user}</div>
                              {t.userEmail && <div style={{ fontSize: '0.72rem', color: T.muted }}>{t.userEmail}</div>}
                            </td>
                            <td style={tableCellMuted}>{fmtDate(t.date)}</td>
                            <td style={tableCell}>
                              <span style={pillStyle('#818CF8', 'rgba(129,140,248,0.1)')}>{t.method}</span>
                            </td>
                            <td style={tableCellStrong}>{fmtMoney(t.amount, t.currency)}</td>
                            <td style={tableCell}>
                              <span style={pillStyle(sc.color, sc.bg)}>{sc.label}</span>
                            </td>
                            <td style={tableCellMuted}>{t.linkName || 'Direct'}</td>
                            <td style={{ ...tableCell, textAlign: 'right' }}><ChevronRight size={14} color={T.muted} /></td>
                          </tr>
                        );
                      })}
                      {filteredTx.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: T.muted }}>No transactions found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'links' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {filteredLinks.map((link) => (
                    <div key={link.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', minWidth: 0 }}>
                          <div style={{ background: 'rgba(0,212,170,0.1)', color: '#00D4AA', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Link2 size={18} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.96rem', fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.name}</div>
                            <div style={{ fontSize: '0.74rem', color: T.muted }}>{fmtDate(link.createdAt)}</div>
                          </div>
                        </div>
                        <span style={pillStyle('#00D4AA', 'rgba(0,212,170,0.1)')}>{link.currency}</span>
                      </div>

                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#00D4AA' }}>{fmtMoney(link.amount, link.currency)}</div>
                      {link.note && <div style={{ color: T.muted, fontSize: '0.78rem', lineHeight: 1.5 }}>{link.note}</div>}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', padding: '0.9rem', background: T.surface, borderRadius: '12px' }}>
                        <Stat label="Clicks" value={String(link.clicks)} T={T} />
                        <Stat label="Status" value={STATUS_CFG[link.status?.toUpperCase()]?.label || link.status || 'Active'} T={T} />
                      </div>

                      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <button onClick={() => { navigator.clipboard.writeText(link.url); toast.success('Link copied'); }} style={actionButton('default')}>
                          <Copy size={13} /> Copy link
                        </button>
                        <button onClick={() => handleDeleteLink(link.id)} style={actionButton('danger')}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredLinks.length === 0 && <EmptyCard title="No pay pages found" T={T} />}
                </div>
              )}

              {activeTab === 'methods' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '1100px', margin: '0 auto' }}>
                  {!canManage && (
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '1rem 1.15rem', color: T.muted, fontSize: '0.82rem' }}>
                      This section is visible only to admin roles. If the buttons are missing on your live server, the account logged into the admin panel is likely not an `Admin`, `Super Admin`, or `Manager`.
                    </div>
                  )}

                  {filteredMethods.map((method, idx) => (
                    <div key={method.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '0.9rem', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingTop: '0.15rem' }}>
                            <button onClick={() => moveMethod(idx, -1)} disabled={idx === 0} style={iconButton(T, idx === 0)}>
                              <ArrowUp size={14} />
                            </button>
                            <button onClick={() => moveMethod(idx, 1)} disabled={idx === payMethods.length - 1} style={iconButton(T, idx === payMethods.length - 1)}>
                              <ArrowDown size={14} />
                            </button>
                          </div>

                          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {method.type === 'mobile_wallet'
                              ? <Smartphone size={20} color="#00D4AA" />
                              : <Building2 size={20} color="#818CF8" />}
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: T.text }}>{method.name}</div>
                              <span style={pillStyle(method.isEnabled ? '#00D4AA' : T.muted, method.isEnabled ? 'rgba(0,212,170,0.12)' : 'rgba(100,116,139,0.12)')}>
                                {method.isEnabled ? 'Enabled' : 'Disabled'}
                              </span>
                              <span style={pillStyle('#818CF8', 'rgba(129,140,248,0.1)')}>
                                {METHOD_TYPES.find((item) => item.value === method.type)?.label || method.type}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: T.muted, marginTop: '0.35rem' }}>
                              {method.providers.length} provider{method.providers.length === 1 ? '' : 's'} configured
                            </div>
                          </div>
                        </div>

                        {canManage && (
                          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                            <button onClick={() => handleToggleMethod(method, !method.isEnabled)} style={actionButton('default')}>
                              <Settings size={13} /> {method.isEnabled ? 'Disable' : 'Enable'}
                            </button>
                            <button onClick={() => openMethodModal(method)} style={actionButton('default')}>
                              <Edit2 size={13} /> Edit
                            </button>
                            <button onClick={() => openProviderModal(method)} style={actionButton('default')}>
                              <Plus size={13} /> Add Provider
                            </button>
                            <button onClick={() => handleDeleteMethod(method)} style={actionButton('danger')}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.9rem' }}>
                        {method.providers.map((provider) => (
                          <div key={provider.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, color: T.text, fontSize: '0.9rem' }}>{provider.name}</div>
                                {provider.description && <div style={{ fontSize: '0.76rem', color: T.muted, marginTop: '0.2rem', lineHeight: 1.45 }}>{provider.description}</div>}
                              </div>
                              <span style={pillStyle(provider.isEnabled ? '#00D4AA' : T.muted, provider.isEnabled ? 'rgba(0,212,170,0.12)' : 'rgba(100,116,139,0.12)')}>
                                {provider.isEnabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.55rem' }}>
                              <ConfigItem label="Account name" value={provider.config?.accountName || 'Not set'} T={T} />
                              <ConfigItem label="Account number" value={maskValue(provider.config?.accountNumber)} T={T} />
                              <ConfigItem label="Bank" value={provider.config?.bankName || 'Not set'} T={T} />
                              <ConfigItem label="API key" value={maskValue(provider.config?.apiKey)} T={T} />
                            </div>

                            <div>
                              <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.muted, marginBottom: '0.45rem' }}>
                                Networks
                              </div>
                              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                                {provider.networks.map((network) => (
                                  <div key={network.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.55rem', borderRadius: '999px', border: `1px solid ${network.isEnabled ? 'rgba(0,212,170,0.22)' : T.border}`, background: network.isEnabled ? 'rgba(0,212,170,0.08)' : T.card }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: network.isEnabled ? '#00D4AA' : T.text }}>{network.name}</span>
                                    {canManage && (
                                      <>
                                        <button onClick={() => handleToggleNetwork(network, !network.isEnabled)} style={chipIconButton(T)}>
                                          <Settings size={11} />
                                        </button>
                                        <button onClick={() => openNetworkModal(method, provider, network)} style={chipIconButton(T)}>
                                          <Edit2 size={11} />
                                        </button>
                                        <button onClick={() => handleDeleteNetwork(network)} style={chipDangerButton()}>
                                          <Trash2 size={11} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ))}
                                {provider.networks.length === 0 && (
                                  <div style={{ fontSize: '0.75rem', color: T.muted }}>No networks added yet.</div>
                                )}
                              </div>
                            </div>

                            {canManage && (
                              <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                                <button onClick={() => handleToggleProvider(provider, !provider.isEnabled)} style={actionButton('default')}>
                                  <Settings size={13} /> {provider.isEnabled ? 'Disable' : 'Enable'}
                                </button>
                                <button onClick={() => openProviderModal(method, provider)} style={actionButton('default')}>
                                  <Edit2 size={13} /> Edit
                                </button>
                                <button onClick={() => openNetworkModal(method, provider)} style={actionButton('default')}>
                                  <Plus size={13} /> Add Network
                                </button>
                                <button onClick={() => handleDeleteProvider(provider)} style={actionButton('danger')}>
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {method.providers.length === 0 && (
                        <div style={{ border: `1px dashed ${T.border}`, borderRadius: '12px', padding: '1rem', color: T.muted, fontSize: '0.8rem', textAlign: 'center' }}>
                          No providers configured for this method yet.
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredMethods.length === 0 && <EmptyCard title="No payment methods found" T={T} />}
                </div>
              )}
            </>
          )}
        </div>

        {detail && (
          <>
            <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
            <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px', maxWidth: '92vw', background: T.panel, borderLeft: `1px solid ${T.border}`, zIndex: 101, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}>
              <div style={{ padding: '1.2rem 1.4rem', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 800, color: T.text, margin: 0 }}>Payment Details</h2>
                  <p style={{ fontSize: '0.72rem', color: T.muted, margin: '0.15rem 0 0 0' }}>Ref: {detail.ref}</p>
                </div>
                <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted }}><X size={18} /></button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: T.surface, borderRadius: '14px', padding: '1.35rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: T.muted, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.45rem' }}>Amount Received</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#00D4AA' }}>{fmtMoney(detail.amount, detail.currency)}</div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <span style={pillStyle(STATUS_CFG[detail.status?.toUpperCase()]?.color || T.muted, STATUS_CFG[detail.status?.toUpperCase()]?.bg || 'rgba(100,116,139,0.12)')}>
                      {STATUS_CFG[detail.status?.toUpperCase()]?.label || detail.status}
                    </span>
                  </div>
                </div>

                <div style={{ background: T.surface, borderRadius: '14px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: T.muted, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Customer</div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: T.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color={T.muted} /></div>
                    <div>
                      <div style={{ fontWeight: 700, color: T.text, fontSize: '0.9rem' }}>{detail.user}</div>
                      <div style={{ fontSize: '0.75rem', color: T.muted }}>{detail.userEmail || 'No email provided'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: T.surface, borderRadius: '14px', padding: '1rem', display: 'grid', gap: '0.6rem' }}>
                  <ConfigRow label="Method" value={detail.method} T={T} />
                  <ConfigRow label="Origin" value={detail.linkName || 'Direct'} T={T} />
                  <ConfigRow label="Date" value={`${fmtDate(detail.date)} ${fmtTime(detail.date)}`} T={T} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showGenModal && (
        <ModalShell onClose={() => setShowGenModal(false)} T={T}>
          <ModalTitle title="Create Payment Page" subtitle="Generate a payment page customers can open directly." T={T} />
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <Field label="Page name" T={T}>
              <input value={genForm.name} onChange={(e) => setGenForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Consulting Fee" style={inputStyle(T)} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
              <Field label="Amount" T={T}>
                <input type="number" value={genForm.amount} onChange={(e) => setGenForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={inputStyle(T)} />
              </Field>
              <Field label="Currency" T={T}>
                <select value={genForm.currency} onChange={(e) => setGenForm((f) => ({ ...f, currency: e.target.value }))} style={inputStyle(T)}>
                  <option value="ZMW">ZMW</option>
                  <option value="USD">USD</option>
                </select>
              </Field>
            </div>
            <Field label="Note" T={T}>
              <textarea value={genForm.note} onChange={(e) => setGenForm((f) => ({ ...f, note: e.target.value }))} rows={3} placeholder="Visible to the customer..." style={{ ...inputStyle(T), resize: 'vertical' as const }} />
            </Field>
            <ModalActions>
              <button onClick={() => setShowGenModal(false)} style={modalButton(T, 'default')}>Cancel</button>
              <button onClick={handleGenerateLink} disabled={genLoading} style={modalButton(T, 'primary')}>
                {genLoading ? 'Creating...' : 'Create Page'}
              </button>
            </ModalActions>
          </div>
        </ModalShell>
      )}

      {showMethodModal && (
        <ModalShell onClose={() => setShowMethodModal(false)} T={T}>
          <ModalTitle title={editingMethod ? 'Edit Payment Method' : 'Add Payment Method'} subtitle="Keep names short so the action buttons stay on one line." T={T} />
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <Field label="Method name" T={T}>
              <input value={methodForm.name} onChange={(e) => setMethodForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Mobile Money" style={inputStyle(T)} />
            </Field>
            <Field label="Method type" T={T}>
              <select value={methodForm.type} onChange={(e) => setMethodForm((f) => ({ ...f, type: e.target.value }))} style={inputStyle(T)}>
                {METHOD_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
            <ToggleField label="Enabled" checked={methodForm.isEnabled} onChange={(checked) => setMethodForm((f) => ({ ...f, isEnabled: checked }))} T={T} />
            <ModalActions>
              <button onClick={() => setShowMethodModal(false)} style={modalButton(T, 'default')}>Cancel</button>
              <button onClick={saveMethod} style={modalButton(T, 'primary')}>{editingMethod ? 'Save Changes' : 'Add Method'}</button>
            </ModalActions>
          </div>
        </ModalShell>
      )}

      {showProviderModal && (
        <ModalShell onClose={() => setShowProviderModal(false)} T={T}>
          <ModalTitle title={editingProvider ? 'Edit Provider' : 'Add Provider'} subtitle={providerMethod ? `Method: ${providerMethod.name}` : ''} T={T} />
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <Field label="Provider name" T={T}>
              <input value={providerForm.name} onChange={(e) => setProviderForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. MTN" style={inputStyle(T)} />
            </Field>
            <Field label="Description" T={T}>
              <textarea value={providerForm.description} onChange={(e) => setProviderForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional helper text" style={{ ...inputStyle(T), resize: 'vertical' as const }} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
              <Field label="Account name" T={T}>
                <input value={providerForm.accountName} onChange={(e) => setProviderForm((f) => ({ ...f, accountName: e.target.value }))} style={inputStyle(T)} />
              </Field>
              <Field label="Account number" T={T}>
                <input value={providerForm.accountNumber} onChange={(e) => setProviderForm((f) => ({ ...f, accountNumber: e.target.value }))} style={inputStyle(T)} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
              <Field label="Bank / operator" T={T}>
                <input value={providerForm.bankName} onChange={(e) => setProviderForm((f) => ({ ...f, bankName: e.target.value }))} style={inputStyle(T)} />
              </Field>
              <Field label="API key" T={T}>
                <input value={providerForm.apiKey} onChange={(e) => setProviderForm((f) => ({ ...f, apiKey: e.target.value }))} style={inputStyle(T)} />
              </Field>
            </div>
            <ToggleField label="Enabled" checked={providerForm.isEnabled} onChange={(checked) => setProviderForm((f) => ({ ...f, isEnabled: checked }))} T={T} />
            <ModalActions>
              <button onClick={() => setShowProviderModal(false)} style={modalButton(T, 'default')}>Cancel</button>
              <button onClick={saveProvider} style={modalButton(T, 'primary')}>{editingProvider ? 'Save Provider' : 'Add Provider'}</button>
            </ModalActions>
          </div>
        </ModalShell>
      )}

      {showNetworkModal && (
        <ModalShell onClose={() => setShowNetworkModal(false)} T={T}>
          <ModalTitle title={editingNetwork ? 'Edit Network' : 'Add Network'} subtitle={networkProvider ? `Provider: ${networkProvider.name}` : ''} T={T} />
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <Field label="Network name" T={T}>
              <input value={networkForm.name} onChange={(e) => setNetworkForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Airtel" style={inputStyle(T)} />
            </Field>
            <ToggleField label="Enabled" checked={networkForm.isEnabled} onChange={(checked) => setNetworkForm((f) => ({ ...f, isEnabled: checked }))} T={T} />
            <ModalActions>
              <button onClick={() => setShowNetworkModal(false)} style={modalButton(T, 'default')}>Cancel</button>
              <button onClick={saveNetwork} style={modalButton(T, 'primary')}>{editingNetwork ? 'Save Network' : 'Add Network'}</button>
            </ModalActions>
          </div>
        </ModalShell>
      )}

      <style jsx>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </AdminShell>
  );
}

const tableHead = {
  padding: '0.75rem 1rem',
  textAlign: 'left' as const,
  fontWeight: 800,
  color: '#64748B',
  textTransform: 'uppercase' as const,
  fontSize: '0.7rem',
};

const tableCell = {
  padding: '0.8rem 1rem',
};

const tableCellMuted = {
  ...tableCell,
  color: '#64748B',
};

const tableCellStrong = {
  ...tableCell,
  fontWeight: 700,
  color: '#0F172A',
};

function pillStyle(color: string, bg: string) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.7rem',
    fontWeight: 800,
    padding: '0.28rem 0.55rem',
    borderRadius: '999px',
    color,
    background: bg,
    whiteSpace: 'nowrap' as const,
  };
}

function iconButton(T: Record<string, string>, disabled: boolean) {
  return {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    border: `1px solid ${T.border}`,
    background: T.surface,
    color: disabled ? 'transparent' : T.muted,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.45 : 1,
  };
}

function chipIconButton(T: Record<string, string>) {
  return {
    width: '18px',
    height: '18px',
    borderRadius: '999px',
    border: `1px solid ${T.border}`,
    background: 'transparent',
    color: T.muted,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };
}

function chipDangerButton() {
  return {
    width: '18px',
    height: '18px',
    borderRadius: '999px',
    border: '1px solid rgba(248,113,113,0.22)',
    background: 'rgba(248,113,113,0.08)',
    color: '#F87171',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };
}

function ConfigItem({ label, value, T }: { label: string; value: string; T: Record<string, string> }) {
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: '10px', padding: '0.65rem 0.75rem', background: T.card }}>
      <div style={{ fontSize: '0.65rem', color: T.muted, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '0.78rem', color: T.text, fontWeight: 600, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function ConfigRow({ label, value, T }: { label: string; value: string; T: Record<string, string> }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
      <span style={{ color: T.muted, fontSize: '0.82rem' }}>{label}</span>
      <span style={{ color: T.text, fontSize: '0.82rem', fontWeight: 700, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function Stat({ label, value, T }: { label: string; value: string; T: Record<string, string> }) {
  return (
    <div>
      <div style={{ fontSize: '0.68rem', color: T.muted, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: T.text, marginTop: '0.25rem' }}>{value}</div>
    </div>
  );
}

function EmptyCard({ title, T }: { title: string; T: Record<string, string> }) {
  return (
    <div style={{ background: T.card, border: `1px dashed ${T.border}`, borderRadius: '14px', padding: '2.25rem', textAlign: 'center', color: T.muted, fontSize: '0.84rem' }}>
      {title}
    </div>
  );
}

function ModalShell({ children, onClose, T }: { children: React.ReactNode; onClose: () => void; T: Record<string, string> }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(560px, calc(100vw - 24px))', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: T.panel, border: `1px solid ${T.border}`, borderRadius: '18px', padding: '1.35rem', zIndex: 201 }}>
        {children}
      </div>
    </>
  );
}

function ModalTitle({ title, subtitle, T }: { title: string; subtitle?: string; T: Record<string, string> }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: T.text, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: '0.75rem', color: T.muted, margin: '0.3rem 0 0 0' }}>{subtitle}</p>}
    </div>
  );
}

function Field({ label, children, T }: { label: string; children: React.ReactNode; T: Record<string, string> }) {
  return (
    <label style={{ display: 'grid', gap: '0.38rem' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      {children}
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  T,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  T: Record<string, string>;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0.9rem', border: `1px solid ${T.border}`, borderRadius: '12px', background: T.surface }}>
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: T.text }}>{label}</div>
        <div style={{ fontSize: '0.72rem', color: T.muted }}>Choose whether this item should be available immediately.</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{ width: '42px', height: '24px', borderRadius: '999px', border: 'none', background: checked ? '#00D4AA' : T.border, position: 'relative', cursor: 'pointer', flexShrink: 0 }}
      >
        <span style={{ position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </button>
    </div>
  );
}

function inputStyle(T: Record<string, string>) {
  return {
    width: '100%',
    padding: '0.7rem 0.8rem',
    background: T.input,
    border: `1px solid ${T.border}`,
    borderRadius: '10px',
    color: T.text,
    fontSize: '0.85rem',
    outline: 'none',
  };
}

function ModalActions({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>{children}</div>;
}

function modalButton(T: Record<string, string>, variant: 'primary' | 'default') {
  return {
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: variant === 'primary' ? 'none' : `1px solid ${T.border}`,
    background: variant === 'primary' ? '#00D4AA' : T.surface,
    color: variant === 'primary' ? '#04130F' : T.text,
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  };
}

export default function WalletPaymentsPage() {
  return <WalletPaymentsContent />;
}
