'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminShell from '@/components/admin/admin-shell';
import { useAuth } from '@/contexts/auth-context';
import {
  Search, X, ChevronRight, Package, Truck, MapPin,
  CheckCircle, RefreshCw, User, ArrowRight, Mail,
  Phone, ShoppingBag, Clock, AlertCircle, Ban, Trash2,
} from 'lucide-react';
import { getOrders, getOrder, updateOrderStatus, bulkUpdateOrderStatus, deleteOrder, bulkDeleteOrders } from '@/lib/api';
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

function shortOrderRef(value?: string | null) {
  const clean = value?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!clean) return 'ORD-UNKNOWN';
  return `ORD-${clean.slice(-6)}`;
}

function formatOrderRef(orderNumber?: string | null, fallbackId?: string | null) {
  if (orderNumber?.trim()) return orderNumber.trim();
  return shortOrderRef(fallbackId);
}

type TabDef = {
  key: string;
  label: string;
  color: string;
  filter: (o: OrderListItem) => boolean;
};

type DeleteTarget = {
  id: string;
  orderNumber: string;
};

// ─── Tab definitions ──────────────────────────────────────
const TABS: TabDef[] = [
  { key: 'all',        label: 'All Orders',  color: 'var(--text-muted)', filter: () => true },
  { key: 'pending',    label: 'Pending',     color: 'var(--gold)', filter: (o) => o.paymentStatus === 'PENDING' && o.status === 'PENDING' },
  { key: 'paid',       label: 'Paid',        color: 'var(--success)', filter: (o) => o.paymentStatus === 'PAID' && o.status === 'PENDING' },
  { key: 'confirmed',  label: 'Confirmed',   color: 'var(--secondary)', filter: (o) => o.status === 'CONFIRMED' },
  { key: 'shipped',    label: 'Shipped',     color: 'var(--secondary)', filter: (o) => o.status === 'SHIPPED' },
  { key: 'in_transit', label: 'In Transit',  color: 'var(--secondary)', filter: (o) => o.status === 'IN_TRANSIT' },
  { key: 'delivered',  label: 'Delivered',   color: 'var(--success)', filter: (o) => o.status === 'DELIVERED' },
  { key: 'collected',  label: 'Collected',   color: 'var(--success)', filter: (o) => o.status === 'COLLECTED' },
  { key: 'cancelled',  label: 'Cancelled',   color: 'var(--danger)', filter: (o) => o.status === 'CANCELLED' },
];

// ─── Status display config ────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Pending',    color: 'var(--gold)', bg: 'rgba(246,176,30,0.12)' },
  PROCESSING: { label: 'Processing', color: 'var(--secondary)', bg: 'rgba(52,74,100,0.12)' },
  CONFIRMED:  { label: 'Confirmed',  color: 'var(--secondary)', bg: 'rgba(52,74,100,0.12)' },
  SHIPPED:    { label: 'Shipped',    color: 'var(--secondary)', bg: 'rgba(52,74,100,0.12)' },
  IN_TRANSIT: { label: 'In Transit', color: 'var(--secondary)', bg: 'rgba(52,74,100,0.12)' },
  DELIVERED:  { label: 'Delivered',  color: 'var(--success)', bg: 'rgba(45,190,96,0.12)' },
  COLLECTED:  { label: 'Collected',  color: 'var(--success)', bg: 'rgba(45,190,96,0.12)' },
  CANCELLED:  { label: 'Cancelled',  color: 'var(--danger)', bg: 'rgba(214,48,49,0.12)' },
  REFUNDED:   { label: 'Refunded',   color: 'var(--warning)', bg: 'rgba(246,139,30,0.12)' },
  RETURNED:   { label: 'Returned',   color: 'var(--text-muted)', bg: 'rgba(83,83,87,0.12)' },
};

const PAY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:       { label: 'Unpaid',   color: 'var(--gold)', bg: 'rgba(246,176,30,0.12)' },
  PAID:          { label: 'Paid',     color: 'var(--success)', bg: 'rgba(45,190,96,0.12)' },
  FAILED:        { label: 'Failed',   color: 'var(--danger)', bg: 'rgba(214,48,49,0.12)' },
  REFUNDED:      { label: 'Refunded', color: 'var(--warning)', bg: 'rgba(246,139,30,0.12)' },
  PARTIALLY_PAID:{ label: 'Partial',  color: 'var(--gold)', bg: 'rgba(246,176,30,0.12)'  },
};

const METHOD_LABEL: Record<string, string> = {
  CARD: 'Card', MOBILE_MONEY: 'Mobile Money', BANK_TRANSFER: 'Bank Transfer',
  WHATSAPP: 'WhatsApp', WALLET: 'Wallet', CREDIT: 'Credit', CASH: 'Cash',
};

const MANUAL_METHODS = ['BANK_TRANSFER', 'WHATSAPP'];

// All valid order statuses for dropdown
const ALL_ORDER_STATUSES: OrderStatus[] = ['PENDING', 'PROCESSING', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COLLECTED', 'CANCELLED', 'REFUNDED', 'RETURNED'];
const ALL_PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_PAID'];

// ─── Helpers ──────────────────────────────────────────────
  const fmtDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
const fmtTime = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};
const fmtMoney = (amount: number, symbol = '$') =>
  `${symbol}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

// ─── Main Content ─────────────────────────────────────────
function OrdersContent() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const hasAutoOpened = useRef(false);
  const T = {
    card:    'var(--card)',
    border:  'var(--border)',
    text:    'var(--text-main)',
    muted:   'var(--text-muted)',
    surface: 'var(--surface)',
    hover:   'var(--surface)',
    panel:   'var(--card)',
    input:   'var(--card)',
  };

  const r = (user?.role || '').toUpperCase().replace(/[\s_]+/g, '');
  const canDelete = loading || r === 'ADMIN' || r === 'SUPERADMIN' || r === 'MANAGER';

  const [orders, setOrders]             = useState<OrderListItem[]>([]);
  const [ordersLoading, setOrdersLoading]         = useState(true);
  const [tab, setTab]                   = useState('all');
  const [search, setSearch]             = useState('');
  const [detail, setDetail]             = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [tracking, setTracking]         = useState('');
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<'single' | 'bulk' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<OrderStatus | ''>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus | ''>('');

  // Load order list
  const loadOrders = useCallback(() => {
    setOrdersLoading(true);
    (getOrders({ take: 500, skip: 0 }) as any)
      .then((r: any) => {
        const raw: any[] = Array.isArray(r.data?.data) ? r.data.data
          : Array.isArray(r.data) ? r.data : [];
        setOrders(raw.map((o: any): OrderListItem => ({
          id: o.id || '',
          orderNumber: formatOrderRef(o.orderNumber, o.id),
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
      .finally(() => setOrdersLoading(false));
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Open order detail panel
  const openDetail = useCallback(async (orderId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setTracking('');
    setSelectedOrderStatus('');
    setSelectedPaymentStatus('');
    setShowStatusDropdown(false);
    setShowPaymentDropdown(false);
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
      setSelectedOrderStatus(o.status);
      setSelectedPaymentStatus(o.paymentStatus);
    } catch {
      toast.error('Failed to load order details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Handle deep link from notification (?id=...)
  useEffect(() => {
    const orderId = searchParams.get('id');
    if (orderId && !hasAutoOpened.current && !ordersLoading) {
      hasAutoOpened.current = true;
      openDetail(orderId);
    }
  }, [searchParams, ordersLoading, openDetail]);

  // Execute status update
  const doAction = useCallback(async () => {
    if (!detail) return;
    setActionLoading(true);
    try {
      const payload: Record<string, string> = {};
      if (selectedOrderStatus && selectedOrderStatus !== detail.status) {
        payload.status = selectedOrderStatus;
      }
      if (selectedPaymentStatus && selectedPaymentStatus !== detail.paymentStatus) {
        payload.paymentStatus = selectedPaymentStatus;
      }
      if (tracking.trim()) payload.trackingNumber = tracking.trim();
      
      if (Object.keys(payload).length === 0) {
        toast.error('No changes to save');
        setActionLoading(false);
        return;
      }

      await (updateOrderStatus as any)(detail.id, payload);
      toast.success('Order updated successfully');
      loadOrders();
      await openDetail(detail.id);
      setShowStatusDropdown(false);
      setShowPaymentDropdown(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update order');
    } finally {
      setActionLoading(false);
    }
  }, [detail, selectedOrderStatus, selectedPaymentStatus, tracking, loadOrders, openDetail]);

  // Delete single order
  const doDeleteOrder = useCallback(async () => {
    const target = deleteTarget ?? (detail ? { id: detail.id, orderNumber: detail.orderNumber } : null);
    if (!target) return;
    setActionLoading(true);
    try {
      await (deleteOrder as any)(target.id);
      toast.success(`Order ${target.orderNumber} deleted successfully`);
      if (detail?.id === target.id) {
        setDetail(null);
      }
      setDeleteTarget(null);
      setDeleteConfirm(null);
      loadOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete order');
    } finally {
      setActionLoading(false);
    }
  }, [deleteTarget, detail, loadOrders]);

  const openSingleDeleteConfirm = useCallback((order: DeleteTarget) => {
    setDeleteTarget({ id: order.id, orderNumber: order.orderNumber });
    setDeleteConfirm('single');
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirm(null);
    setDeleteTarget(null);
  }, []);

  // Bulk status update
  const doBulkAction = useCallback(async (status: string) => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    try {
      const res: any = await (bulkUpdateOrderStatus as any)([...selectedIds], status);
      const { succeeded, failed } = res.data || res;
      if (succeeded > 0) toast.success(`Updated ${succeeded} orders to ${status}`);
      if (failed > 0) toast.error(`Failed to update ${failed} orders`);
      setSelectedIds(new Set());
      loadOrders();
    } catch {
      toast.error('Failed to perform bulk update');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, loadOrders]);

  // Bulk delete
  const doBulkDelete = useCallback(async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    try {
      const res: any = await (bulkDeleteOrders as any)([...selectedIds]);
      const { succeeded, failed } = res.data || res;
      if (succeeded > 0) toast.success(`Deleted ${succeeded} orders`);
      if (failed > 0) toast.error(`Failed to delete ${failed} orders`);
      setSelectedIds(new Set());
      setDeleteConfirm(null);
      loadOrders();
    } catch {
      toast.error('Failed to perform bulk delete');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, loadOrders]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)));
    }
  }, [orders, selectedIds]);

  const toggleSelectOne = useCallback((id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }, [selectedIds]);

  // Filter and Search
  const filteredOrders = useMemo(() => {
    let list = orders;
    const currentTab = TABS.find(t => t.key === tab);
    if (currentTab) list = list.filter(currentTab.filter);
    
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(o =>
        o.orderNumber.toLowerCase().includes(s) ||
        o.user?.email.toLowerCase().includes(s) ||
        o.user?.firstName.toLowerCase().includes(s) ||
        o.user?.lastName.toLowerCase().includes(s)
      );
    }
    return list;
  }, [orders, tab, search]);

  return (
    <div className="orders-page" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <div className="header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: T.text, marginBottom: '4px' }}>Orders</h1>
          <p style={{ color: T.muted, fontSize: '13px' }}>Manage and track all customer orders</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(192,21,27,0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(192,21,27,0.1)' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', marginRight: '8px' }}>{selectedIds.size} selected</span>
              <button
                onClick={() => setDeleteConfirm('bulk')}
                disabled={bulkLoading || !canDelete}
                style={{ padding: '8px', borderRadius: '6px', background: 'white', border: '1px solid var(--border)', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
        gap: '12px', 
        marginBottom: '24px' 
      }}>
        {[
          { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'var(--primary)' },
          { label: 'Pending Payment', value: orders.filter(o => o.paymentStatus === 'PENDING').length, icon: Clock, color: 'var(--gold)' },
          { label: 'To Ship', value: orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PROCESSING').length, icon: Package, color: 'var(--secondary)' },
          { label: 'Completed', value: orders.filter(o => o.status === 'DELIVERED' || o.status === 'COLLECTED').length, icon: CheckCircle, color: 'var(--success)' },
        ].map((s, i) => (
          <div key={i} style={{ 
            background: T.card, 
            padding: '16px', 
            borderRadius: '16px', 
            border: `1px solid ${T.border}`, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            minHeight: '80px'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${s.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
              <s.icon size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: T.muted, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</p>
              <p style={{ fontSize: '18px', fontWeight: '800', color: T.text, lineHeight: 1.2 }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="main-card" style={{ background: T.card, borderRadius: '20px', border: `1px solid ${T.border}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div className="card-toolbar" style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="tabs-container" style={{ width: '100%', overflowX: 'auto', paddingBottom: '4px' }}>
            <div className="tabs" style={{ display: 'inline-flex', gap: '4px', background: 'var(--surface)', padding: '4px', borderRadius: '10px', minWidth: 'max-content' }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer',
                    background: tab === t.key ? 'white' : 'transparent',
                    color: tab === t.key ? 'var(--primary)' : T.muted,
                    boxShadow: tab === t.key ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="search" style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
            <input
              type="text"
              placeholder="Search by order #, email, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '10px', border: `1px solid ${T.border}`, background: 'var(--surface)', fontSize: '14px', outline: 'none' }}
            />
          </div>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: '16px 20px', width: '40px' }}>
                  <input type="checkbox" checked={selectedIds.size === orders.length && orders.length > 0} onChange={toggleSelectAll} />
                </th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order</th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment</th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '16px 20px', width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr><td colSpan={8} style={{ padding: '100px', textAlign: 'center', color: T.muted }}>Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '100px', textAlign: 'center', color: T.muted }}>No orders found</td></tr>
              ) : (
                filteredOrders.map(o => (
                  <tr key={o.id} onClick={() => openDetail(o.id)} style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer', transition: 'background 0.2s' }} className="table-row-hover">
                    <td style={{ padding: '16px 20px' }} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleSelectOne(o.id)} />
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <p style={{ fontWeight: '700', color: T.text, fontSize: '14px', marginBottom: '2px' }}>#{o.orderNumber}</p>
                      <p style={{ fontSize: '12px', color: T.muted }}>{o._count.items} items</p>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <p style={{ fontWeight: '600', color: T.text, fontSize: '14px', marginBottom: '2px' }}>{o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Guest'}</p>
                      <p style={{ fontSize: '12px', color: T.muted }}>{o.user?.email || 'No email'}</p>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <p style={{ fontSize: '14px', color: T.text }}>{fmtDate(o.createdAt)}</p>
                      <p style={{ fontSize: '12px', color: T.muted }}>{fmtTime(o.createdAt)}</p>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <p style={{ fontWeight: '700', color: T.text, fontSize: '14px' }}>{fmtMoney(o.total, o.currencySymbol)}</p>
                      {o.totalZMW && <p style={{ fontSize: '11px', color: T.muted }}>≈ ZMW {o.totalZMW.toLocaleString()}</p>}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', color: PAY_CFG[o.paymentStatus]?.color, background: PAY_CFG[o.paymentStatus]?.bg }}>
                        {PAY_CFG[o.paymentStatus]?.label}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', color: STATUS_CFG[o.status]?.color, background: STATUS_CFG[o.status]?.bg }}>
                        {STATUS_CFG[o.status]?.label}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <ChevronRight size={18} color={T.muted} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Detail Panel ─────────────────────────────────── */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setDetail(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px', height: '100%', background: 'white', boxShadow: '-10px 0 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease-out' }}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: T.text }}>Order Details</h2>
                <p style={{ fontSize: '12px', color: T.muted }}>#{detail.orderNumber} • {fmtDate(detail.createdAt)}</p>
              </div>
              <button onClick={() => setDetail(null)} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', marginBottom: '12px' }}>Customer</p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: `1px solid ${T.border}` }}>
                      <User size={20} />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '700' }}>{detail.user ? `${detail.user.firstName} ${detail.user.lastName}` : 'Guest'}</p>
                      <p style={{ fontSize: '12px', color: T.muted }}>{detail.user?.email || 'No email'}</p>
                    </div>
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', marginBottom: '12px' }}>Payment</p>
                  <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{METHOD_LABEL[detail.paymentMethod] || detail.paymentMethod}</p>
                  <div style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', color: PAY_CFG[detail.paymentStatus]?.color, background: 'white', border: `1px solid ${PAY_CFG[detail.paymentStatus]?.color}20` }}>
                    {PAY_CFG[detail.paymentStatus]?.label}
                  </div>
                </div>
              </div>

              {detail.shippingAddress && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <MapPin size={16} color="var(--primary)" />
                    <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Shipping Address</h3>
                  </div>
                  <div style={{ padding: '16px', border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{detail.shippingAddress.firstName} {detail.shippingAddress.lastName}</p>
                    <p style={{ fontSize: '13px', color: T.muted, lineHeight: '1.5' }}>
                      {detail.shippingAddress.street}<br />
                      {detail.shippingAddress.city}, {detail.shippingAddress.state}<br />
                      {detail.shippingAddress.country}
                    </p>
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px dashed ${T.border}`, display: 'flex', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: T.muted }}>
                        <Phone size={14} /> {detail.shippingAddress.phone}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Package size={16} color="var(--primary)" />
                  <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Items ({detail.items.length})</h3>
                </div>
                <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                  {detail.items.map((item, idx) => (
                    <div key={item.id} style={{ padding: '12px', display: 'flex', gap: '12px', borderBottom: idx === detail.items.length - 1 ? 'none' : `1px solid ${T.border}`, background: idx % 2 === 0 ? 'white' : 'var(--surface)' }}>
                      <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', background: 'white', border: `1px solid ${T.border}` }}>
                        {item.product.images[0] ? (
                          <img src={item.product.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted }}><ShoppingBag size={20} /></div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: '700', color: T.text, marginBottom: '2px' }}>{item.product.name}</p>
                        <p style={{ fontSize: '11px', color: T.muted }}>{item.variant?.name}: {item.variant?.value} • Qty: {item.quantity}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '13px', fontWeight: '700' }}>{fmtMoney(item.total, detail.currencySymbol)}</p>
                        <p style={{ fontSize: '11px', color: T.muted }}>{fmtMoney(item.price, detail.currencySymbol)} ea</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: T.muted }}>
                  <span>Subtotal</span>
                  <span>{fmtMoney(detail.subtotal, detail.currencySymbol)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: T.muted }}>
                  <span>Shipping</span>
                  <span>{fmtMoney(detail.shipping, detail.currencySymbol)}</span>
                </div>
                {detail.tax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: T.muted }}>
                    <span>Tax</span>
                    <span>{fmtMoney(detail.tax, detail.currencySymbol)}</span>
                  </div>
                )}
                {detail.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--danger)' }}>
                    <span>Discount</span>
                    <span>-{fmtMoney(detail.discount, detail.currencySymbol)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${T.border}`, fontSize: '16px', fontWeight: '800', color: T.text }}>
                  <span>Total</span>
                  <span>{fmtMoney(detail.total, detail.currencySymbol)}</span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>Manage Order</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Order Status</label>
                    <button
                      onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowPaymentDropdown(false); }}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${T.border}`, background: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span style={{ color: STATUS_CFG[selectedOrderStatus || detail.status]?.color }}>{STATUS_CFG[selectedOrderStatus || detail.status]?.label}</span>
                      <ChevronRight size={16} style={{ transform: showStatusDropdown ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    {showStatusDropdown && (
                      <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '8px', background: 'white', border: `1px solid ${T.border}`, borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 60, padding: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                        {ALL_ORDER_STATUSES.map(s => (
                          <button key={s} onClick={() => { setSelectedOrderStatus(s); setShowStatusDropdown(false); }} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: selectedOrderStatus === s ? 'var(--surface)' : 'transparent', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: STATUS_CFG[s].color }}>
                            {STATUS_CFG[s].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Payment Status</label>
                    <button
                      onClick={() => { setShowPaymentDropdown(!showPaymentDropdown); setShowStatusDropdown(false); }}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${T.border}`, background: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span style={{ color: PAY_CFG[selectedPaymentStatus || detail.paymentStatus]?.color }}>{PAY_CFG[selectedPaymentStatus || detail.paymentStatus]?.label}</span>
                      <ChevronRight size={16} style={{ transform: showPaymentDropdown ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    {showPaymentDropdown && (
                      <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '8px', background: 'white', border: `1px solid ${T.border}`, borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 60, padding: '6px' }}>
                        {ALL_PAYMENT_STATUSES.map(s => (
                          <button key={s} onClick={() => { setSelectedPaymentStatus(s); setShowPaymentDropdown(false); }} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: selectedPaymentStatus === s ? 'var(--surface)' : 'transparent', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: PAY_CFG[s].color }}>
                            {PAY_CFG[s].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tracking Number</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <Truck size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
                      <input
                        type="text"
                        placeholder="Enter tracking number..."
                        value={tracking}
                        onChange={(e) => setTracking(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: `1px solid ${T.border}`, background: 'white', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={doAction}
                  disabled={actionLoading}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: actionLoading ? 0.7 : 1 }}
                >
                  {actionLoading ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  Save Changes
                </button>
              </div>

              <div style={{ paddingTop: '20px', borderTop: `1px solid ${T.border}` }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>Order Timeline</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {detail.logs.map((log, i) => (
                    <div key={log.id} style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: i === 0 ? 'var(--primary)' : T.border, marginTop: '4px' }} />
                        {i < detail.logs.length - 1 && <div style={{ width: '2px', flex: 1, background: T.border, margin: '4px 0' }} />}
                      </div>
                      <div style={{ paddingBottom: i < detail.logs.length - 1 ? '16px' : '0' }}>
                        <p style={{ fontSize: '13px', fontWeight: '700', color: T.text }}>{STATUS_CFG[log.status]?.label || log.status}</p>
                        <p style={{ fontSize: '12px', color: T.muted, marginBottom: '4px' }}>{log.notes}</p>
                        <p style={{ fontSize: '11px', color: T.muted }}>{fmtDate(log.createdAt)} • {fmtTime(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '20px', borderTop: `1px solid ${T.border}`, background: 'var(--surface)', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => openSingleDeleteConfirm({ id: detail.id, orderNumber: detail.orderNumber })}
                disabled={actionLoading || !canDelete}
                style={{ padding: '10px 16px', borderRadius: '8px', background: 'white', border: '1px solid var(--danger)', color: 'var(--danger)', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Trash2 size={16} /> Delete Order
              </button>
              <button onClick={() => setDetail(null)} style={{ padding: '10px 20px', borderRadius: '8px', background: 'white', border: `1px solid ${T.border}`, fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modals ───────────────────────────────────────── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={closeDeleteConfirm} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: 'white', width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '32px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(214,48,49,0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertCircle size={32} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>
              {deleteConfirm === 'single' ? 'Delete Order?' : `Delete ${selectedIds.size} Orders?`}
            </h2>
            <p style={{ color: T.muted, fontSize: '14px', lineHeight: '1.6', marginBottom: '32px' }}>
              {deleteConfirm === 'single' 
                ? `Are you sure you want to delete order #${deleteTarget?.orderNumber}? This action cannot be undone.`
                : `Are you sure you want to delete all selected orders? This will permanently remove them from the system.`}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={closeDeleteConfirm} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${T.border}`, background: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={deleteConfirm === 'single' ? doDeleteOrder : doBulkDelete}
                disabled={actionLoading || bulkLoading}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--danger)', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
              >
                {actionLoading || bulkLoading ? 'Deleting...' : 'Delete Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .table-row-hover:hover { background: var(--surface) !important; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AdminShell>
      <OrdersContent />
    </AdminShell>
  );
}
