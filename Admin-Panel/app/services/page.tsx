'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import { Wrench } from 'lucide-react';
import { getServices, createService, updateService, deleteService } from '@/lib/api';
import toast from 'react-hot-toast';

type Service = { id: string; name: string; category: string; price: string; duration: string; provider: string; bookings: number; status: string };

const INITIAL: Service[] = [
  { id: 'SRV001', name: 'Screen Repair', category: 'Repair', price: '$80.00', duration: '2 hours', provider: 'TechFix Zambia', bookings: 45, status: 'Active' },
  { id: 'SRV002', name: 'Battery Replacement', category: 'Repair', price: '$40.00', duration: '1 hour', provider: 'TechFix Zambia', bookings: 38, status: 'Active' },
  { id: 'SRV003', name: 'Device Setup', category: 'Setup', price: '$25.00', duration: '30 min', provider: 'Kryros Store', bookings: 62, status: 'Active' },
  { id: 'SRV004', name: 'Data Recovery', category: 'Recovery', price: '$120.00', duration: '24 hours', provider: 'DataSafe Ltd', bookings: 12, status: 'Active' },
  { id: 'SRV005', name: 'Software Installation', category: 'Setup', price: '$15.00', duration: '1 hour', provider: 'Kryros Store', bookings: 28, status: 'Active' },
  { id: 'SRV006', name: 'Network Setup', category: 'Setup', price: '$60.00', duration: '3 hours', provider: 'NetPro Zambia', bookings: 7, status: 'Inactive' },
];

const CATEGORIES = ['Repair', 'Setup', 'Recovery', 'Network'];
const EMPTY_FORM = { name: '', category: 'Repair', price: '', duration: '', provider: '', status: 'Active' };

function ServicesContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#101826' : '#F1F5F9';

  const [data, setData] = useState<Service[]>([]);
  useEffect(() => {
    getServices({ limit: 200 }).then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      const normalized: Service[] = raw.map((s: any) => ({
        id: s.id || '',
        name: s.name || '',
        category: s.category || s.serviceType || 'Repair',
        price: s.price ? `$${Number(s.price).toLocaleString()}` : '$0',
        duration: s.duration || s.estimatedTime || '',
        provider: s.provider || s.providerName || 'Kryros',
        bookings: s._count?.orders ?? s.bookings ?? 0,
        status: s.isActive !== false ? 'Active' : 'Inactive',
      }));
      setData(normalized);
    }).catch(() => {});
  }, []);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<Service | null>(null);
  const [deleteRow, setDeleteRow] = useState<Service | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);

  const fp = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setAddOpen(true); };
  const openEdit = (row: Record<string, unknown>) => { const r = row as unknown as Service; setForm({ name: r.name, category: r.category, price: r.price, duration: r.duration, provider: r.provider, status: r.status }); setEditRow(r); };
  const openDelete = (row: Record<string, unknown>) => setDeleteRow(row as unknown as Service);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Service name is required'); return; }
    setLoading(true);
    try {
      const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await createService({
        name: form.name,
        slug: toSlug(form.name),
        category: form.category,
        price: Number(form.price) || 0,
        duration: form.duration,
        isActive: form.status === 'Active',
      });
      const newItem: Service = { id: `SRV${String(Date.now()).slice(-3)}`, ...form, bookings: 0 };
      setData(d => [...d, newItem]);
      toast.success('Service added');
      setAddOpen(false);
    } catch { toast.error('Failed to add service — check your API connection'); }
    setLoading(false);
  };

  const handleEdit = async () => {
    if (!editRow) return;
    setLoading(true);
    try {
      await updateService(editRow.id, {
        name: form.name,
        category: form.category,
        price: Number(form.price) || 0,
        duration: form.duration,
        isActive: form.status === 'Active',
      });
      setData(d => d.map(s => s.id === editRow.id ? { ...s, ...form } : s));
      toast.success('Service updated');
      setEditRow(null);
    } catch { toast.error('Failed to update service — check your API connection'); }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setLoading(true);
    try {
      await deleteService(deleteRow.id);
      setData(d => d.filter(s => s.id !== deleteRow.id));
      toast.success('Service deleted');
      setDeleteRow(null);
    } catch { toast.error('Failed to delete service — check your API connection'); }
    setLoading(false);
  };

  const catColor = (c: string) => ({ Repair: '#ef4444', Setup: '#1FA89A', Recovery: '#f59e0b', Network: '#6366f1' }[c] || '#64748b');

  const columns: Column[] = [
    { key: 'id', label: 'ID', width: '90px' },
    { key: 'name', label: 'Service', render: (v) => <span style={{ fontWeight: 600, color: textMain }}>{String(v)}</span> },
    { key: 'category', label: 'Category', render: (v) => <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600, background: `${catColor(String(v))}18`, color: catColor(String(v)) }}>{String(v)}</span> },
    { key: 'price', label: 'Price', render: (v) => <span style={{ fontWeight: 700, color: textMain }}>{String(v)}</span> },
    { key: 'duration', label: 'Duration' },
    { key: 'provider', label: 'Provider' },
    { key: 'bookings', label: 'Bookings', render: (v) => <span style={{ fontWeight: 700, color: '#6366f1' }}>{String(v)}</span> },
    { key: 'status', label: 'Status', render: (v) => <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600, background: v === 'Active' ? 'rgba(31,168,154,0.12)' : 'rgba(100,116,139,0.12)', color: v === 'Active' ? '#1FA89A' : '#64748b' }}>{String(v)}</span> },
  ];

  const modalFields = (
    <>
      <FormField label="Service Name" value={form.name} onChange={fp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Screen Repair" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <FormField label="Category" value={form.category} onChange={fp('category')} options={CATEGORIES} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Status" value={form.status} onChange={fp('status')} options={['Active', 'Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <FormField label="Price" value={form.price} onChange={fp('price')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="$0.00" />
        <FormField label="Duration" value={form.duration} onChange={fp('duration')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 2 hours" />
      </div>
      <FormField label="Provider" value={form.provider} onChange={fp('provider')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. TechFix Zambia" />
    </>
  );

  const stats = [
    { label: 'Total Services', val: String(data.length), color: '#1FA89A' },
    { label: 'Active', val: String(data.filter(s=>s.status==='Active').length), color: '#1FA89A' },
    { label: 'Inactive', val: String(data.filter(s=>s.status==='Inactive').length), color: '#64748b' },
    { label: 'Total Bookings', val: String(data.reduce((a,s)=>a+s.bookings,0)), color: '#6366f1' },
  ];

  return (
    <div>
      <PageHeader title="Services" subtitle="Manage repair and support services" icon={Wrench} onAdd={openAdd} addLabel="Add Service" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }} className="stats-grid">
        {stats.map(s => (
          <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: textMuted, marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>
      <DataTable columns={columns} data={data as unknown as Record<string, unknown>[]} searchPlaceholder="Search services..." onEdit={openEdit} onDelete={openDelete} />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Service">
        {modalFields}
        <ModalFooter onClose={() => setAddOpen(false)} onSubmit={handleAdd} loading={loading} submitLabel="Add Service" isDark={isDark} border={border} textMain={textMain} />
      </Modal>

      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name ?? ''}`}>
        {modalFields}
        <ModalFooter onClose={() => setEditRow(null)} onSubmit={handleEdit} loading={loading} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain} />
      </Modal>

      <ConfirmDialog open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} loading={loading} title="Delete Service" message={`Are you sure you want to delete "${deleteRow?.name}"? This cannot be undone.`} />

      <style>{`@media (max-width: 768px) { .stats-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </div>
  );
}

export default function ServicesPage() {
  return <AdminShell><ServicesContent /></AdminShell>;
}
