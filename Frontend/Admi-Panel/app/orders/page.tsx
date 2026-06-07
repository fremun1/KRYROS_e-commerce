'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import { useTheme } from '@/contexts/theme-context';
import {
  Search, X, ChevronRight, Package, Truck, MapPin,
  CheckCircle, RefreshCw, User, ArrowRight, Mail,
  Phone, ShoppingBag, Clock, AlertCircle, Ban,
} from 'lucide-react';
import { getOrders, getOrder, updateOrderStatus } from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────
type OrderStatus =
  | 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'SHIPPED'
  | 'IN_TRANSIT' | 'DELIVERED' | 'COLLECTED'
  | 'CANCELLED' | 'REFUNDED' | 'RETURNED';
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_PAID';

type OrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  total: number;
  totalZMW: number | null;
  currencyCode: string;
  currencySymbol: string;
  createdAt: string;
  user: { id: string; email: string; firstName: string; lastName: string } | null;
  _count: { items: number };
};

type OrderItem = {
  id: string;
  product: { name: string; images: Array<{ url: string; isPrimary: boolean }> };
  variant: { name?: string; value?: string } | null;
  quantity: number;
  price: number;
  total: number;
};

type OrderLog = { id: string; status: OrderStatus; notes: string; createdAt: string };

type OrderDetail = OrderListItem & {
  items: OrderItem[];
  shippingAddress: {
    firstName: string; lastName: string; street: string;
    city: string; state: string; country: string; phone: string;
  } | null;
  trackingNumber: string | null;
  notes: string | null;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  estimatedDays: number | null;
  logs: OrderLog[];
};

type TabDef = {
  key: string;
  label: string;
  color: string;
  filter: (o: OrderListItem) => boolean;
};

type ActionDef = {
  label: string;
  description: string;
  newStatus?: OrderStatus;
  newPaymentStatus?: PaymentStatus;
  variant: 'primary' | 'danger';
  requiresTracking?: boolean;
};

// ─── Tab definitions ──────────────────────────────────────
const TABS: TabDef[] = [
  { key: 'all',        label: 'All Orders',  color: '#8E9AAF', filter: () => true },
  { key: 'pending',    label: 'Pending',     color: '#F59E0B', filter: (o) => o.paymentStatus === 'PENDING' && o.status === 'PENDING' },
  { key: 'paid',       label: 'Paid',        color: '#00D4AA', filter: (o) => o.paymentStatus === 'PAID' && o.status === 'PENDING' },
  { key: 'confirmed',  label: 'Confirmed',   color: '#818CF8', filter: (o) => o.status === 'CONFIRMED' },
  { key: 'shipped',    label: 'Shipped',     color: '#60A5FA', filter: (o) => o.status === 'SHIPPED' },
  { key: 'in_transit', label: 'In Transit',  color: '#C084FC', filter: (o) => o.status === 'IN_TRANSIT' },
  { key: 'delivered',  label: 'Delivered',   color: '#34D399', filter: (o) => o.status === 'DELIVERED' },
  { key: 'collected',  label: 'Collected',   color: '#10B981', filter: (o) => o.status === 'COLLECTED' },
  { key: 'cancelled',  label: 'Cancelled',   color: '#F87171', filter: (o) => o.status === 'CANCELLED' },
];

// ─── Status display config ────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Pending',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  PROCESSING: { label: 'Processing', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  CONFIRMED:  { label: 'Confirmed',  color: '#818CF8', bg: 'rgba(129,140,248,0.12)' },
  SHIPPED:    { label: 'Shipped',    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  IN_TRANSIT: { label: 'In Transit', color: '#C084FC', bg: 'rgba(192,132,252,0.12)' },
  DELIVERED:  { label: 'Delivered',  color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  COLLECTED:  { label: 'Collected',  color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  CANCELLED:  { label: 'Cancelled',  color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  REFUNDED:   { label: 'Refunded',   color: '#FB923C', bg: 'rgba(251,146,60,0.12)' },
  RETURNED:   { label: 'Returned',   color: '#A1A1AA', bg: 'rgba(161,161,170,0.12)' },
};

const PAY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:       { label: 'Unpaid',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  PAID:          { label: 'Paid',     color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  FAILED:        { label: 'Failed',   color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  REFUNDED:      { label: 'Refunded', color: '#FB923C', bg: 'rgba(251,146,60,0.12)' },
  PARTIALLY_PAID:{ label: 'Partial',  color: '#FCD34D', bg: 'rgba(252,211,77,0.12)'  },
};

const METHOD_LABEL: Record<string, string> = {
  CARD: 'Card', MOBILE_MONEY: 'Mobile Money', BANK_TRANSFER: 'Bank Transfer',
  WHATSAPP: 'WhatsApp', WALLET: 'Wallet', CREDIT: 'Credit', CASH: 'Cash',
};

const MANUAL_METHODS = ['BANK_TRANSFER', 'WHATSAPP'];

// ─── Next actions per status ──────────────────────────────
function getNextActions(status: OrderStatus, payStatus: PaymentStatus): ActionDef[] {
  if (status === 'PENDING' && payStatus === 'PENDING') return [
    { label: 'Mark as Paid',   description: 'Confirm manual payment received', newPaymentStatus: 'PAID',      variant: 'primary' },
    { label: 'Cancel Order',   description: 'Cancel this order',               newStatus: 'CANCELLED',        variant: 'danger'  },
  ];
  if (status === 'PENDING' && payStatus === 'PAID') return [
    { label: 'Confirm Order',  description: 'Confirm order for fulfillment',   newStatus: 'CONFIRMED',        variant: 'primary' },
    { label: 'Cancel & Refund',description: 'Cancel and refund payment',       newStatus: 'CANCELLED', newPaymentStatus: 'REFUNDED', variant: 'danger' },
  ];
  if (status === 'CONFIRMED') return [
    { label: 'Mark as Shipped',description: 'Order dispatched to courier',     newStatus: 'SHIPPED',          variant: 'primary', requiresTracking: true },
    { label: 'Cancel & Refund',description: 'Cancel and refund',               newStatus: 'CANCELLED', newPaymentStatus: 'REFUNDED', variant: 'danger' },
  ];
  if (status === 'SHIPPED')    return [{ label: 'Mark In Transit',  description: 'Order is en route to pickup station', newStatus: 'IN_TRANSIT', variant: 'primary' }];
  if (status === 'IN_TRANSIT') return [{ label: 'Mark as Delivered', description: 'Order arrived at pickup station/park', newStatus: 'DELIVERED', variant: 'primary' }];
  if (status === 'DELIVERED')  return [{ label: 'Mark as Collected', description: 'Customer has picked up the order',    newStatus: 'COLLECTED', variant: 'primary' }];
  return [];
}

// ─── Helpers ──────────────────────────────────────────────
const fmtDate = (iso: string) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};
const fmtTime = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};
const fmtMoney = (amount: number, symbol = '$') =>
  `${symbol}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

// ─── Main Content ─────────────────────────────────────────
function OrdersContent() {
  const { theme } = useTheme();
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

  const [orders, setOrders]             = useState<OrderListItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState('all');
  const [search, setSearch]             = useState('');
  const [detail, setDetail]             = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [tracking, setTracking]         = useState('');

  // Load order list
  const loadOrders = useCallback(() => {
    setLoading(true);
    (getOrders({ take: 500, skip: 0 }) as any)
      .then((r: any) => {
        const raw: any[] = Array.isArray(r.data?.data) ? r.data.data
          : Array.isArray(r.data) ? r.data : [];
        setOrders(raw.map((o: any): OrderListItem => ({
          id: o.id || '',
          orderNumber: o.orderNumber || o.id || '',
          status: o.status || 'PENDING',
          paymentStatus: o.paymentStatus || 'PENDING',
          paymentMethod: o.paymentMethod || '',
          total: Number(o.total) || 0,
          totalZMW: o.totalZMW != null ? Number(o.totalZMW) : null,
          currencyCode: o.currencyCode || 'USD',
          currencySymbol: o.currencySymbol || '$',
          createdAt: o.createdAt || '',
          user: o.user || null,
          _count: o._count || { items: 0 },
        })));
      })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Open order detail panel
  const openDetail = useCallback(async (orderId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setTracking('');
    try {
      const res: any = await getOrder(orderId);
      const o = res.data;
      setDetail({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod || '',
        total: Number(o.total) || 0,
        totalZMW: o.totalZMW != null ? Number(o.totalZMW) : null,
        currencyCode: o.currencyCode || 'USD',
        currencySymbol: o.currencySymbol || '$',
        createdAt: o.createdAt,
        user: o.user || null,
        _count: { items: o.items?.length || 0 },
        items: (o.items || []).map((item: any): OrderItem => ({
          id: item.id,
          product: { name: item.product?.name || 'Unknown', images: item.product?.images || [] },
          variant: item.variant || null,
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
        })),
        shippingAddress: o.shippingAddress ? {
          firstName: o.shippingAddress.firstName || '',
          lastName:  o.shippingAddress.lastName  || '',
          street:    o.shippingAddress.street    || '',
          city:      o.shippingAddress.cityName  || o.shippingAddress.city  || '',
          state:     o.shippingAddress.stateName || o.shippingAddress.state || '',
          country:   o.shippingAddress.country   || '',
          phone:     o.shippingAddress.phone     || '',
        } : null,
        trackingNumber: o.trackingNumber || null,
        notes: o.notes || null,
        subtotal: Number(o.subtotal) || 0,
        shipping: Number(o.shipping) || 0,
        tax:      Number(o.tax)      || 0,
        discount: Number(o.discount) || 0,
        estimatedDays: o.estimatedDays || null,
        logs: (o.logs || []).map((l: any): OrderLog => ({
          id: l.id, status: l.status, notes: l.notes || '', createdAt: l.createdAt,
        })),
      });
      if (o.trackingNumber) setTracking(o.trackingNumber);
    } catch {
      toast.error('Failed to load order details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Execute status update
  const doAction = useCallback(async (newStatus?: string, newPayStatus?: string) => {
    if (!detail) return;
    setActionLoading(true);
    try {
      const payload: Record<string, string> = {};
      if (newStatus)    payload.status = newStatus;
      if (newPayStatus) payload.paymentStatus = newPayStatus;
      if (tracking.trim()) payload.trackingNumber = tracking.trim();
      await (updateOrderStatus as any)(detail.id, payload);
      toast.success('Order updated successfully');
      loadOrders();
      await openDetail(detail.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update order');
    } finally {
      setActionLoading(false);
    }
  }, [detail, tracking, loadOrders, openDetail]);

  // Filtered + searched list
  const activeDef = TABS.find(t => t.key === tab) || TABS[0];
  const shown = useMemo(() => {
    let list = orders.filter(activeDef.filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.user ? `${o.user.firstName} ${o.user.lastName} ${o.user.email}`.toLowerCase() : '').includes(q)
      );
    }
    return list;
  }, [orders, activeDef, search]);

  // Tab counts
  const counts = useMemo(() =>
    Object.fromEntries(TABS.map(t => [t.key, orders.filter(t.filter).length])),
  [orders]);

  const nextActions = detail ? getNextActions(detail.status, detail.paymentStatus) : [];

  return (
    <AdminShell>
      <div style={{ paddingBottom: '2rem' }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ color: T.text, fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Order Management</h1>
            <p style={{ color: T.muted, fontSize: '0.8rem', marginTop: '0.2rem' }}>
              {orders.length} total &middot; {counts['pending'] || 0} awaiting payment &middot; {counts['paid'] || 0} awaiting confirmation
            </p>
          </div>
          <button onClick={loadOrders} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1rem', borderRadius: '8px',
            border: `1px solid ${T.border}`, background: 'transparent',
            color: T.muted, fontSize: '0.8rem', cursor: 'pointer',
          }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* ── Search + Tabs + Table card ── */}
        <div style={{ background: T.card, borderRadius: '12px', border: `1px solid ${T.border}` }}>

          {/* Search */}
          <div style={{ padding: '0.7rem 1rem', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Search size={14} color={T.muted} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by order #, customer name or email..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: T.text, fontSize: '0.84rem', fontFamily: 'inherit' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', overflowX: 'auto', padding: '0 0.25rem', borderBottom: `1px solid ${T.border}`, scrollbarWidth: 'none' as const }}>
            {TABS.map(t => (
              <button
                key={t.key} onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.7rem 0.8rem', whiteSpace: 'nowrap' as const,
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
                  color: tab === t.key ? t.color : T.muted,
                  fontWeight: tab === t.key ? 700 : 400,
                  fontSize: '0.79rem', marginBottom: '-1px', transition: 'all 0.15s',
                }}
              >
                {t.label}
                {(counts[t.key] || 0) > 0 && (
                  <span style={{
                    background: tab === t.key ? `${t.color}20` : T.surface,
                    color: tab === t.key ? t.color : T.muted,
                    fontSize: '0.63rem', fontWeight: 700,
                    padding: '1px 5px', borderRadius: '8px',
                  }}>{counts[t.key]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' as const, color: T.muted, fontSize: '0.85rem' }}>Loading orders…</div>
          ) : shown.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' as const, color: T.muted }}>
              <Package size={28} color={T.muted} style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: T.text, marginTop: 0 }}>No orders</p>
              <p style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                {search ? 'No results for your search.' : `No orders in "${activeDef.label}".`}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.81rem' }}>
                <thead>
                  <tr style={{ background: T.surface }}>
                    {['Order #', 'Customer', 'Date', 'Items', 'Payment', 'Total', 'Pay Status', 'Order Status', ''].map(h => (
                      <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left' as const, color: T.muted, fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((o, i) => {
                    const sc  = STATUS_CFG[o.status]       || STATUS_CFG.PENDING;
                    const psc = PAY_CFG[o.paymentStatus]   || PAY_CFG.PENDING;
                    const isManual = MANUAL_METHODS.includes(o.paymentMethod?.toUpperCase());
                    const customer = o.user
                      ? (`${o.user.firstName} ${o.user.lastName}`.trim() || o.user.email)
                      : 'Guest';
                    return (
                      <tr
                        key={o.id}
                        onClick={() => openDetail(o.id)}
                        style={{
                          borderTop: `1px solid ${T.border}`, cursor: 'pointer',
                          background: i % 2 === 0 ? 'transparent' : (dark ? 'rgba(255,255,255,0.012)' : 'rgba(0,0,0,0.01)'),
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : (dark ? 'rgba(255,255,255,0.012)' : 'rgba(0,0,0,0.01)'))}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: T.text, fontFamily: 'monospace', fontSize: '0.77rem' }}>
                          #{o.orderNumber}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: T.text }}>{customer}</div>
                          {o.user?.email && <div style={{ color: T.muted, fontSize: '0.7rem' }}>{o.user.email}</div>}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: T.muted, whiteSpace: 'nowrap' as const }}>{fmtDate(o.createdAt)}</td>
                        <td style={{ padding: '0.75rem 1rem', color: T.muted }}>{o._count.items}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: '4px',
                            background: isManual ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                            color: isManual ? '#F59E0B' : '#818CF8',
                          }}>
                            {METHOD_LABEL[o.paymentMethod?.toUpperCase()] || o.paymentMethod || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: T.text, whiteSpace: 'nowrap' as const }}>
                          {fmtMoney(o.total, o.currencySymbol)}
                          {o.totalZMW != null && <div style={{ fontSize: '0.68rem', color: T.muted }}>ZMW {Number(o.totalZMW).toLocaleString()}</div>}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ background: psc.bg, color: psc.color, fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' as const }}>{psc.label}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ background: sc.bg, color: sc.color, fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' as const }}>{sc.label}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}><ChevronRight size={13} color={T.muted} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Detail Panel ── */}
        {(detail || detailLoading) && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => { setDetail(null); setDetailLoading(false); }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', zIndex: 40, backdropFilter: 'blur(2px)' }}
            />
            {/* Slide-in panel */}
            <div style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: 510, maxWidth: '96vw',
              background: T.panel, borderLeft: `1px solid ${T.border}`,
              zIndex: 50, overflowY: 'auto', display: 'flex', flexDirection: 'column',
            }}>
              {/* Panel header */}
              <div style={{
                padding: '1rem 1.2rem', borderBottom: `1px solid ${T.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, background: T.panel, zIndex: 1,
              }}>
                <div>
                  <h2 style={{ color: T.text, fontWeight: 700, fontSize: '0.98rem', margin: 0 }}>
                    {detail ? `Order #${detail.orderNumber}` : 'Loading…'}
                  </h2>
                  {detail && (
                    <p style={{ color: T.muted, fontSize: '0.72rem', margin: '0.1rem 0 0 0' }}>
                      {fmtDate(detail.createdAt)} at {fmtTime(detail.createdAt)}
                    </p>
                  )}
                </div>
                <button onClick={() => { setDetail(null); setDetailLoading(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', padding: '0.25rem' }}>
                  <X size={17} />
                </button>
              </div>

              {detailLoading && !detail ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: '0.84rem' }}>
                  Loading details…
                </div>
              ) : detail ? (
                <div style={{ flex: 1, padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

                  {/* Status badges row */}
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {(() => {
                      const sc  = STATUS_CFG[detail.status]       || STATUS_CFG.PENDING;
                      const psc = PAY_CFG[detail.paymentStatus]   || PAY_CFG.PENDING;
                      const isManual = MANUAL_METHODS.includes(detail.paymentMethod?.toUpperCase());
                      return (
                        <>
                          <span style={{ background: sc.bg, color: sc.color, fontSize: '0.73rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>Order: {sc.label}</span>
                          <span style={{ background: psc.bg, color: psc.color, fontSize: '0.73rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>Payment: {psc.label}</span>
                          <span style={{
                            background: isManual ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                            color: isManual ? '#F59E0B' : '#818CF8',
                            fontSize: '0.73rem', fontWeight: 600, padding: '3px 10px', borderRadius: '6px',
                          }}>{METHOD_LABEL[detail.paymentMethod?.toUpperCase()] || detail.paymentMethod}</span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Customer */}
                  <Section title="Customer" T={T}>
                    {detail.user ? (
                      <>
                        <Row icon={<User size={13} color={T.muted} />} T={T}>
                          <span style={{ color: T.text, fontWeight: 600 }}>{detail.user.firstName} {detail.user.lastName}</span>
                        </Row>
                        <Row icon={<Mail size={13} color={T.muted} />} T={T}>
                          <span style={{ color: T.muted, fontSize: '0.79rem' }}>{detail.user.email}</span>
                        </Row>
                      </>
                    ) : (
                      <span style={{ color: T.muted, fontSize: '0.8rem' }}>Guest order</span>
                    )}
                  </Section>

                  {/* Shipping */}
                  {detail.shippingAddress && (
                    <Section title="Delivery Address" T={T}>
                      <Row icon={<MapPin size={13} color={T.muted} />} T={T}>
                        <div style={{ color: T.muted, fontSize: '0.79rem', lineHeight: 1.55 }}>
                          <strong style={{ color: T.text }}>{detail.shippingAddress.firstName} {detail.shippingAddress.lastName}</strong><br />
                          {detail.shippingAddress.street}, {detail.shippingAddress.city}<br />
                          {detail.shippingAddress.state}, {detail.shippingAddress.country}
                        </div>
                      </Row>
                      <Row icon={<Phone size={13} color={T.muted} />} T={T}>
                        <span style={{ color: T.muted, fontSize: '0.79rem' }}>{detail.shippingAddress.phone}</span>
                      </Row>
                      {detail.trackingNumber && (
                        <div style={{ marginTop: '0.6rem', padding: '0.45rem 0.75rem', background: 'rgba(99,102,241,0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Truck size={13} color="#818CF8" />
                          <span style={{ color: '#818CF8', fontSize: '0.77rem', fontWeight: 600 }}>Tracking: {detail.trackingNumber}</span>
                        </div>
                      )}
                    </Section>
                  )}

                  {/* Items */}
                  <Section title={`Items (${detail._count.items})`} T={T}>
                    {detail.items.map((item, i) => {
                      const img = item.product.images?.find(im => im.isPrimary)?.url || item.product.images?.[0]?.url;
                      return (
                        <div key={item.id} style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', paddingTop: i > 0 ? '0.7rem' : 0, borderTop: i > 0 ? `1px solid ${T.border}` : 'none', marginTop: i > 0 ? '0.7rem' : 0 }}>
                          {img
                            ? <img src={img} alt={item.product.name} style={{ width: 42, height: 42, borderRadius: '6px', objectFit: 'cover', flexShrink: 0, border: `1px solid ${T.border}` }} />
                            : <div style={{ width: 42, height: 42, borderRadius: '6px', background: T.border, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={15} color={T.muted} /></div>
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: T.text, fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
                            {item.variant && <div style={{ color: T.muted, fontSize: '0.7rem' }}>{item.variant.value || item.variant.name}</div>}
                            <div style={{ color: T.muted, fontSize: '0.7rem' }}>&times;{item.quantity}</div>
                          </div>
                          <div style={{ color: T.text, fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{fmtMoney(item.total, detail.currencySymbol)}</div>
                        </div>
                      );
                    })}
                  </Section>

                  {/* Summary */}
                  <Section title="Order Summary" T={T}>
                    {([['Subtotal', detail.subtotal], ['Shipping', detail.shipping], ['Tax (VAT)', detail.tax], ...(detail.discount > 0 ? [['Discount', -detail.discount]] : [])] as [string, number][]).map(([lbl, val]) => (
                      <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.79rem', color: T.muted, marginBottom: '0.3rem' }}>
                        <span>{lbl}</span>
                        <span>{val < 0 ? '-' : ''}{fmtMoney(Math.abs(val), detail.currencySymbol)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: `1px solid ${T.border}`, marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.88rem', color: T.text }}>
                      <span>Total</span>
                      <span>{fmtMoney(detail.total, detail.currencySymbol)}</span>
                    </div>
                    {detail.totalZMW != null && (
                      <div style={{ textAlign: 'right', color: T.muted, fontSize: '0.69rem', marginTop: '0.2rem' }}>
                        &asymp; ZMW {Number(detail.totalZMW).toLocaleString()}
                      </div>
                    )}
                  </Section>

                  {/* Status History */}
                  {detail.logs.length > 0 && (
                    <Section title="Status History" T={T}>
                      {detail.logs.map((log, i) => {
                        const sc = STATUS_CFG[log.status] || STATUS_CFG.PENDING;
                        return (
                          <div key={log.id} style={{ display: 'flex', gap: '0.7rem', marginBottom: i < detail.logs.length - 1 ? '0.7rem' : 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc.color, marginTop: 4 }} />
                              {i < detail.logs.length - 1 && <div style={{ flex: 1, width: 1, background: T.border, marginTop: 4 }} />}
                            </div>
                            <div style={{ flex: 1, paddingBottom: i < detail.logs.length - 1 ? '0.7rem' : 0 }}>
                              <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ color: sc.color, fontWeight: 700, fontSize: '0.73rem' }}>{sc.label}</span>
                                <span style={{ color: T.muted, fontSize: '0.68rem' }}>{fmtDate(log.createdAt)} {fmtTime(log.createdAt)}</span>
                              </div>
                              {log.notes && <div style={{ color: T.muted, fontSize: '0.7rem', marginTop: '0.12rem' }}>{log.notes}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </Section>
                  )}

                  {/* Status Actions */}
                  {nextActions.length > 0 ? (
                    <Section title="Update Status" T={T}>
                      {/* Tracking input for CONFIRMED → SHIPPED */}
                      {detail.status === 'CONFIRMED' && (
                        <div style={{ marginBottom: '0.8rem' }}>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: T.muted, marginBottom: '0.3rem' }}>
                            Tracking Number <span style={{ color: T.muted, fontWeight: 400 }}>(optional)</span>
                          </label>
                          <input
                            value={tracking} onChange={e => setTracking(e.target.value)}
                            placeholder="e.g. TRK-2024-001"
                            style={{
                              width: '100%', padding: '0.55rem 0.75rem', boxSizing: 'border-box',
                              background: T.input, border: `1px solid ${T.border}`, borderRadius: '7px',
                              color: T.text, fontSize: '0.81rem', outline: 'none', fontFamily: 'inherit',
                            }}
                          />
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {nextActions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => doAction(action.newStatus, action.newPaymentStatus)}
                            disabled={actionLoading}
                            style={{
                              padding: '0.6rem 1rem', borderRadius: '8px', border: 'none',
                              cursor: actionLoading ? 'wait' : 'pointer', fontFamily: 'inherit',
                              background: action.variant === 'primary' ? '#00D4AA' : 'rgba(239,68,68,0.1)',
                              color: action.variant === 'primary' ? '#000' : '#F87171',
                              fontWeight: 700, fontSize: '0.82rem',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              opacity: actionLoading ? 0.65 : 1,
                            }}
                          >
                            <div>
                              <div>{actionLoading ? 'Updating…' : action.label}</div>
                              <div style={{ fontSize: '0.68rem', fontWeight: 400, opacity: 0.7, marginTop: '1px' }}>{action.description}</div>
                            </div>
                            {action.variant === 'primary' && <ArrowRight size={14} />}
                            {action.variant === 'danger'  && <Ban size={14} />}
                          </button>
                        ))}
                      </div>
                    </Section>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1rem', background: T.surface, borderRadius: '10px', color: T.muted, fontSize: '0.79rem' }}>
                      <CheckCircle size={18} color={detail.status === 'COLLECTED' ? '#10B981' : T.muted} style={{ marginBottom: '0.4rem' }} />
                      <p style={{ margin: 0 }}>
                        {detail.status === 'COLLECTED' ? 'Order complete — customer has collected their item.' :
                         detail.status === 'CANCELLED' ? 'This order has been cancelled.' :
                         'No further actions available.'}
                      </p>
                    </div>
                  )}

                </div>
              ) : null}
            </div>
          </>
        )}

      </div>
    </AdminShell>
  );
}

// ─── Small reusable sub-components ────────────────────────
function Section({ title, children, T }: { title: string; children: React.ReactNode; T: Record<string, string> }) {
  return (
    <div style={{ background: T.surface, borderRadius: '10px', padding: '0.9rem 1rem' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginBottom: '0.7rem' }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ icon, children, T }: { icon: React.ReactNode; children: React.ReactNode; T: Record<string, string> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
      <span style={{ marginTop: '2px', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

export default function OrdersPage() {
  return <OrdersContent />;
}
