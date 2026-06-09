'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import { Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getShippingZones, createShippingZone, updateShippingZone, deleteShippingZone,
  getShippingMethods, createShippingMethod, updateShippingMethod, deleteShippingMethod,
} from '@/lib/api';

type Zone = { id: string; name: string; region: string; countries: string; method: string; rate: string; minOrder: string; days: string; status: string };
type ShippingMethod = { id: string; name: string; description: string; fee: string; minThreshold: string; estimatedDays: string; sortOrder: string; status: string };

const EMPTY_ZONE   = { name: '', region: '', countries: '', method: 'Standard', rate: '0', minOrder: '0', days: '', status: 'Active' };
const EMPTY_METHOD = { name: '', description: '', fee: '0', minThreshold: '0', estimatedDays: '', sortOrder: '0', status: 'Active' };
const METHODS_LIST = ['Standard', 'Express', 'International', 'Free', 'Pickup'];

function ShippingContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const border    = isDark ? '#1E293B' : '#E2E8F0';
  const textMain  = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface   = isDark ? '#101826' : '#F1F5F9';

  type Tab = 'zones' | 'methods';
  const [tab, setTab] = useState<Tab>('zones');

  // ── ZONES ─────────────────────────────────────────────────
  const [zones, setZones] = useState<Zone[]>([]);
  const [addZoneOpen, setAddZoneOpen] = useState(false);
  const [editZone,    setEditZone]    = useState<Zone | null>(null);
  const [deleteZone,  setDeleteZone]  = useState<Zone | null>(null);
  const [zoneForm, setZoneForm]       = useState({ ...EMPTY_ZONE });
  const [loadingZone, setLoadingZone] = useState(false);
  const zfp = (k: string) => (v: string) => setZoneForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (tab !== 'zones') return;
    getShippingZones({ limit: 200 }).then((r: any) => {
      const raw = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setZones(raw.map((z: any) => ({
        id: z.id || '', name: z.name || '', region: z.region || z.type || '',
        countries: Array.isArray(z.countries) ? z.countries.join(', ') : (z.countries || ''),
        method: z.shippingMethod || z.method || 'Standard',
        rate: z.rate ? String(z.rate) : '0', minOrder: z.minOrder ? String(z.minOrder) : '0',
        days: z.estimatedDays || z.days || '', status: z.isActive !== false ? 'Active' : 'Inactive',
      })));
    }).catch(() => {});
  }, [tab]);

  const handleAddZone = async () => {
    if (!zoneForm.name.trim()) { toast.error('Zone name required'); return; }
    setLoadingZone(true);
    try {
      const res: any = await createShippingZone({ name: zoneForm.name, isActive: zoneForm.status === 'Active', region: zoneForm.region || undefined, shippingMethod: zoneForm.method || undefined, rate: zoneForm.rate ? Number(zoneForm.rate) : undefined, minOrder: zoneForm.minOrder ? Number(zoneForm.minOrder) : undefined });
      const id = res?.data?.id || String(Date.now());
      setZones(d => [...d, { id, ...zoneForm }]);
      toast.success('Zone added');
      setAddZoneOpen(false);
      setZoneForm({ ...EMPTY_ZONE });
    } catch { toast.error('Failed to add zone'); }
    setLoadingZone(false);
  };

  const handleEditZone = async () => {
    if (!editZone) return;
    setLoadingZone(true);
    try {
      await updateShippingZone(editZone.id, { name: zoneForm.name, isActive: zoneForm.status === 'Active', region: zoneForm.region || undefined, shippingMethod: zoneForm.method || undefined, rate: zoneForm.rate ? Number(zoneForm.rate) : undefined, minOrder: zoneForm.minOrder ? Number(zoneForm.minOrder) : undefined });
      setZones(d => d.map(z => z.id === editZone.id ? { ...z, ...zoneForm } : z));
      toast.success('Zone updated');
      setEditZone(null);
    } catch { toast.error('Failed to update zone'); }
    setLoadingZone(false);
  };

  const handleDeleteZone = async () => {
    if (!deleteZone) return;
    setLoadingZone(true);
    try {
      await deleteShippingZone(deleteZone.id);
      setZones(d => d.filter(z => z.id !== deleteZone.id));
      toast.success('Zone deleted');
      setDeleteZone(null);
    } catch { toast.error('Failed to delete zone'); }
    setLoadingZone(false);
  };

  // ── SHIPPING METHODS ────────────────────────────────────────
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [editMethod,    setEditMethod]    = useState<ShippingMethod | null>(null);
  const [deleteMethod,  setDeleteMethod]  = useState<ShippingMethod | null>(null);
  const [methodForm, setMethodForm]       = useState({ ...EMPTY_METHOD });
  const [loadingMethod, setLoadingMethod] = useState(false);
  const mfp = (k: string) => (v: string) => setMethodForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (tab !== 'methods') return;
    getShippingMethods().then((r: any) => {
      const raw = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setMethods(raw.map((m: any) => ({
        id: m.id || '', name: m.name || '', description: m.description || '',
        fee: String(m.fee || 0), minThreshold: String(m.minThreshold || 0),
        estimatedDays: m.estimatedDays || '', sortOrder: String(m.sortOrder || 0),
        status: m.isActive !== false ? 'Active' : 'Inactive',
      })));
    }).catch(() => {});
  }, [tab]);

  const handleAddMethod = async () => {
    if (!methodForm.name.trim()) { toast.error('Method name required'); return; }
    setLoadingMethod(true);
    try {
      const res: any = await createShippingMethod({ name: methodForm.name, description: methodForm.description || undefined, fee: Number(methodForm.fee) || 0, minThreshold: Number(methodForm.minThreshold) || 0, estimatedDays: methodForm.estimatedDays || undefined, isActive: methodForm.status === 'Active', sortOrder: Number(methodForm.sortOrder) || 0 });
      const id = res?.data?.id || String(Date.now());
      setMethods(d => [...d, { id, ...methodForm }]);
      toast.success('Shipping method added');
      setAddMethodOpen(false);
      setMethodForm({ ...EMPTY_METHOD });
    } catch { toast.error('Failed to add method'); }
    setLoadingMethod(false);
  };

  const handleEditMethod = async () => {
    if (!editMethod) return;
    setLoadingMethod(true);
    try {
      await updateShippingMethod(editMethod.id, { name: methodForm.name, description: methodForm.description || undefined, fee: Number(methodForm.fee), minThreshold: Number(methodForm.minThreshold), estimatedDays: methodForm.estimatedDays || undefined, isActive: methodForm.status === 'Active', sortOrder: Number(methodForm.sortOrder) });
      setMethods(d => d.map(m => m.id === editMethod.id ? { ...m, ...methodForm } : m));
      toast.success('Method updated');
      setEditMethod(null);
    } catch { toast.error('Failed to update method'); }
    setLoadingMethod(false);
  };

  const handleDeleteMethod = async () => {
    if (!deleteMethod) return;
    setLoadingMethod(true);
    try {
      await deleteShippingMethod(deleteMethod.id);
      setMethods(d => d.filter(m => m.id !== deleteMethod.id));
      toast.success('Method deleted');
      setDeleteMethod(null);
    } catch { toast.error('Failed to delete method'); }
    setLoadingMethod(false);
  };

  // ── Columns ────────────────────────────────────────────────
  const zoneColumns: Column[] = [
    { key: 'name',     label: 'Zone Name', render: (v) => <span style={{ fontWeight: 600, color: textMain }}>{String(v)}</span> },
    { key: 'region',   label: 'Region', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v) || '—'}</span> },
    { key: 'method',   label: 'Method', render: (v) => <span style={{ color: textMain, fontSize: '12px' }}>{String(v) || '—'}</span> },
    { key: 'rate',     label: 'Rate', render: (v) => <span style={{ fontWeight: 600, color: '#1FA89A' }}>${String(v)}</span> },
    { key: 'minOrder', label: 'Min Order', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>${String(v)}</span> },
    { key: 'days',     label: 'Est. Days', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v) || '—'}</span> },
    { key: 'status',   label: 'Status', render: (v) => <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: v === 'Active' ? 'rgba(31,168,154,0.12)' : 'rgba(100,116,139,0.1)', color: v === 'Active' ? '#1FA89A' : '#8E9AAF' }}>{String(v)}</span> },
  ];

  const methodColumns: Column[] = [
    { key: 'name',         label: 'Name', render: (v) => <span style={{ fontWeight: 600, color: textMain }}>{String(v)}</span> },
    { key: 'description',  label: 'Description', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v).slice(0, 40) || '—'}</span> },
    { key: 'fee',          label: 'Fee', render: (v) => <span style={{ fontWeight: 600, color: '#1FA89A' }}>${String(v)}</span> },
    { key: 'minThreshold', label: 'Free Ship Above', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{Number(v) > 0 ? `$${v}` : '—'}</span> },
    { key: 'estimatedDays', label: 'Est. Days', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v) || '—'}</span> },
    { key: 'status',       label: 'Status', render: (v) => <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: v === 'Active' ? 'rgba(31,168,154,0.12)' : 'rgba(100,116,139,0.1)', color: v === 'Active' ? '#1FA89A' : '#8E9AAF' }}>{String(v)}</span> },
  ];

  const tabStyle = (active: boolean) => ({
    padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    background: active ? '#1FA89A' : 'transparent', color: active ? '#fff' : textMuted, border: 'none',
  });

  const ADD_LABELS   = { zones: 'Add Zone', methods: 'Add Method' };
  const ADD_HANDLERS = {
    zones:   () => { setZoneForm({ ...EMPTY_ZONE }); setAddZoneOpen(true); },
    methods: () => { setMethodForm({ ...EMPTY_METHOD }); setAddMethodOpen(true); },
  };

  return (
    <div>
      <PageHeader
        title="Shipping"
        subtitle="Manage shipping zones and delivery methods"
        icon={Truck}
        onAdd={ADD_HANDLERS[tab]}
        addLabel={ADD_LABELS[tab]}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        <button style={tabStyle(tab === 'zones')}   onClick={() => setTab('zones')}>Shipping Zones ({zones.length})</button>
        <button style={tabStyle(tab === 'methods')} onClick={() => setTab('methods')}>Shipping Methods ({methods.length})</button>
      </div>

      {/* ── ZONES ── */}
      {tab === 'zones' && (
        <>
          <DataTable
            columns={zoneColumns}
            data={zones as unknown as Record<string, unknown>[]}
            searchPlaceholder="Search zones..."
            onEdit={(row) => { const z = row as unknown as Zone; setZoneForm({ name: z.name, region: z.region, countries: z.countries, method: z.method, rate: z.rate, minOrder: z.minOrder, days: z.days, status: z.status }); setEditZone(z); }}
            onDelete={(row) => setDeleteZone(row as unknown as Zone)}
          />
          <Modal open={addZoneOpen} onClose={() => setAddZoneOpen(false)} title="Add Shipping Zone">
            <FormField label="Zone Name *" value={zoneForm.name} onChange={zfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Lusaka Zone" />
            <FormField label="Region / Area" value={zoneForm.region} onChange={zfp('region')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Central Province" />
            <FormField label="Countries Covered (comma-separated)" value={zoneForm.countries} onChange={zfp('countries')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Zambia" />
            <FormField label="Default Shipping Method" value={zoneForm.method} onChange={zfp('method')} options={METHODS_LIST} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Shipping Rate ($)" value={zoneForm.rate} onChange={zfp('rate')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0" />
            <FormField label="Minimum Order ($)" value={zoneForm.minOrder} onChange={zfp('minOrder')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0" />
            <FormField label="Estimated Delivery Days" value={zoneForm.days} onChange={zfp('days')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 2-3 days" />
            <FormField label="Status" value={zoneForm.status} onChange={zfp('status')} options={['Active', 'Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <ModalFooter onClose={() => setAddZoneOpen(false)} onSubmit={handleAddZone} loading={loadingZone} submitLabel="Add Zone" isDark={isDark} border={border} textMain={textMain} />
          </Modal>
          <Modal open={!!editZone} onClose={() => setEditZone(null)} title={`Edit Zone: ${editZone?.name ?? ''}`}>
            <FormField label="Zone Name *" value={zoneForm.name} onChange={zfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Region / Area" value={zoneForm.region} onChange={zfp('region')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Countries Covered" value={zoneForm.countries} onChange={zfp('countries')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Default Shipping Method" value={zoneForm.method} onChange={zfp('method')} options={METHODS_LIST} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Shipping Rate ($)" value={zoneForm.rate} onChange={zfp('rate')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Minimum Order ($)" value={zoneForm.minOrder} onChange={zfp('minOrder')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Estimated Delivery Days" value={zoneForm.days} onChange={zfp('days')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Status" value={zoneForm.status} onChange={zfp('status')} options={['Active', 'Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <ModalFooter onClose={() => setEditZone(null)} onSubmit={handleEditZone} loading={loadingZone} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain} />
          </Modal>
          <ConfirmDialog open={!!deleteZone} onClose={() => setDeleteZone(null)} onConfirm={handleDeleteZone} loading={loadingZone} title="Delete Zone" message={`Delete "${deleteZone?.name}" permanently?`} />
        </>
      )}

      {/* ── SHIPPING METHODS ── */}
      {tab === 'methods' && (
        <>
          <DataTable
            columns={methodColumns}
            data={methods as unknown as Record<string, unknown>[]}
            searchPlaceholder="Search methods..."
            onEdit={(row) => { const m = row as unknown as ShippingMethod; setMethodForm({ name: m.name, description: m.description, fee: m.fee, minThreshold: m.minThreshold, estimatedDays: m.estimatedDays, sortOrder: m.sortOrder, status: m.status }); setEditMethod(m); }}
            onDelete={(row) => setDeleteMethod(row as unknown as ShippingMethod)}
          />
          <Modal open={addMethodOpen} onClose={() => setAddMethodOpen(false)} title="Add Shipping Method">
            <FormField label="Method Name *" value={methodForm.name} onChange={mfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Standard Delivery" />
            <FormField label="Description" value={methodForm.description} onChange={mfp('description')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Brief description" />
            <FormField label="Fee ($)" value={methodForm.fee} onChange={mfp('fee')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0" />
            <FormField label="Free Shipping Above ($)" value={methodForm.minThreshold} onChange={mfp('minThreshold')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0 = never free" />
            <FormField label="Estimated Delivery Days" value={methodForm.estimatedDays} onChange={mfp('estimatedDays')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 2-3 business days" />
            <FormField label="Sort Order" value={methodForm.sortOrder} onChange={mfp('sortOrder')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0" />
            <FormField label="Status" value={methodForm.status} onChange={mfp('status')} options={['Active', 'Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <ModalFooter onClose={() => setAddMethodOpen(false)} onSubmit={handleAddMethod} loading={loadingMethod} submitLabel="Add Method" isDark={isDark} border={border} textMain={textMain} />
          </Modal>
          <Modal open={!!editMethod} onClose={() => setEditMethod(null)} title={`Edit: ${editMethod?.name ?? ''}`}>
            <FormField label="Method Name *" value={methodForm.name} onChange={mfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Description" value={methodForm.description} onChange={mfp('description')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Fee ($)" value={methodForm.fee} onChange={mfp('fee')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Free Shipping Above ($)" value={methodForm.minThreshold} onChange={mfp('minThreshold')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Estimated Delivery Days" value={methodForm.estimatedDays} onChange={mfp('estimatedDays')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Sort Order" value={methodForm.sortOrder} onChange={mfp('sortOrder')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Status" value={methodForm.status} onChange={mfp('status')} options={['Active', 'Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <ModalFooter onClose={() => setEditMethod(null)} onSubmit={handleEditMethod} loading={loadingMethod} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain} />
          </Modal>
          <ConfirmDialog open={!!deleteMethod} onClose={() => setDeleteMethod(null)} onConfirm={handleDeleteMethod} loading={loadingMethod} title="Delete Method" message={`Delete "${deleteMethod?.name}" permanently?`} />
        </>
      )}
    </div>
  );
}

export default function ShippingPage() { return <AdminShell><ShippingContent /></AdminShell>; }
