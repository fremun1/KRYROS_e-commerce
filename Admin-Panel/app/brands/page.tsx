'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import CloudinaryUpload from '@/components/ui/file-upload';
import { useTheme } from '@/contexts/theme-context';
import { Award } from 'lucide-react';
import { createBrand, updateBrand, deleteBrand, getBrands } from '@/lib/api';
import toast from 'react-hot-toast';

type Brand = {
  id: string; name: string; slug: string; products: number; country: string;
  status: string; website: string; description: string; logo?: string;
};

const EMPTY_FORM = { name: '', slug: '', country: '', status: 'Active', website: '', description: '', logo: '' };
const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function BrandsPage() {
  const { theme } = useTheme();
  const isDark   = theme === 'dark';
  const bg       = isDark ? '#070E1A' : '#F8FAFC';
  const surface  = isDark ? '#101826' : '#F1F5F9';
  const border   = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted= isDark ? '#8E9AAF' : '#64748B';
  const accent   = '#1FA89A';

  const [brands,    setBrands]   = useState<Brand[]>([]);
  const [modalOpen, setModalOpen]= useState(false);
  const [editRow,   setEditRow]  = useState<Brand | null>(null);
  const [deleteRow, setDeleteRow]= useState<Brand | null>(null);
  const [deleting,  setDeleting] = useState(false);
  const [saving,    setSaving]   = useState(false);
  const [form,      setForm]     = useState({ ...EMPTY_FORM });

  const load = () => {
    getBrands().then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setBrands(raw.map((b: any) => ({
        id: String(b.id ?? b._id ?? ''),
        name: b.name ?? '',
        slug: b.slug ?? '',
        products: b._count?.products ?? b.products ?? 0,
        country: b.country ?? '',
        status: b.isActive === false ? 'Inactive' : 'Active',
        website: b.website ?? '',
        description: b.description ?? '',
        logo: b.logo ?? '',
      })));
    }).catch(() => {});
  };

  useEffect(load, []);

  const openAdd  = () => { setForm({ ...EMPTY_FORM }); setEditRow(null); setModalOpen(true); };
  const openEdit = (row: Brand) => {
    setForm({ name: row.name, slug: row.slug, country: row.country, status: row.status, website: row.website, description: row.description, logo: row.logo || '' });
    setEditRow(row); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Brand name is required'); return; }
    setSaving(true);
    try {
      const slug = toSlug(form.slug || form.name);
      const payload = { name: form.name.trim(), slug, country: form.country, isActive: form.status === 'Active', website: form.website, description: form.description, logo: form.logo };
      const existingBrand = !editRow
        ? brands.find((b) => toSlug(b.slug || b.name) === slug)
        : null;

      if (editRow) {
        await updateBrand(editRow.id, payload);
        toast.success('Brand updated');
      } else if (existingBrand) {
        await updateBrand(existingBrand.id, payload);
        toast.success('Brand already existed — details updated');
      } else {
        await createBrand(payload);
        toast.success('Brand created');
      }
      setModalOpen(false); load();
    } catch (e: any) { toast.error(e?.message ?? 'Save failed'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    try { await deleteBrand(deleteRow.id); toast.success('Brand deleted'); setDeleteRow(null); load(); }
    catch (e: any) { toast.error(e?.message ?? 'Delete failed'); }
    setDeleting(false);
  };

  const f = (k: keyof typeof form, v: string) =>
    setForm(p => ({ ...p, [k]: v, ...(k === 'name' && !editRow ? { slug: toSlug(v) } : {}) }));

  const COLS: Column[] = [
    { key: 'name', label: 'Brand Name', render: (_v, row) => {
      const r = row as any;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: isDark ? '#1e2a35' : '#f0f9ff', border: `1px solid ${border}`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Award size={14} color={accent} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', color: textMain }}>{r.name}</div>
            <div style={{ fontSize: '11px', color: textMuted }}>/{r.slug}</div>
          </div>
        </div>
      );
    }},
    { key: 'logo', label: 'Logo', render: (v, row) => {
      const r = row as Brand;
      return r.logo ? (
        <div style={{ width: '56px', height: '36px', borderRadius: '8px', border: `1px solid ${border}`, background: isDark ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
          <img
            src={r.logo}
            alt={`${r.name} logo`}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <span style={{ color: textMuted, fontSize: '12px' }}>No logo</span>
      );
    }},
    { key: 'products', label: 'Products', render: (v) => (
      <span style={{ background: isDark ? '#1e2a35' : '#f0f9ff', color: accent, fontWeight: 700, fontSize: '12px', padding: '2px 10px', borderRadius: '20px' }}>{String(v ?? 0)}</span>
    )},
    { key: 'country', label: 'Country', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v || '—')}</span> },
    { key: 'status', label: 'Status', render: (v) => {
      const active = v === 'Active';
      return <span style={{ background: active ? (isDark ? '#0d2e1a' : '#dcfce7') : (isDark ? '#2e1515' : '#fee2e2'), color: active ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize: '11px', padding: '2px 10px', borderRadius: '20px' }}>{String(v)}</span>;
    }},
    { key: 'slug', label: 'Shop Anchor', render: (v) => (
      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: accent, background: isDark ? '#0d1a2e' : '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>#{String(v)}</span>
    )},
  ];

  return (
    <AdminShell>
      <div style={{ padding: '24px', background: bg, minHeight: '100vh' }}>
        <PageHeader
          title="Brands"
          subtitle="Manage brands for product organisation and shop navigation"
          icon={Award}
          onAdd={openAdd}
          addLabel="Add Brand"
        />

        <DataTable
          columns={COLS}
          data={brands as unknown as Record<string, unknown>[]}
          onEdit={(row) => openEdit(row as unknown as Brand)}
          onDelete={(row) => setDeleteRow(row as unknown as Brand)}
        />

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editRow ? 'Edit Brand' : 'Add Brand'}>
          <FormField label="Brand Name *" value={form.name} onChange={(v) => f('name', v)} placeholder="e.g. Samsung" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <div style={{ marginBottom: '14px' }}>
            <FormField label="Shop Scroll Anchor" value={form.slug} onChange={(v) => f('slug', v)} placeholder="e.g. samsung" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <p style={{ fontSize: '11px', color: textMuted, marginTop: '4px', marginBottom: 0 }}>Auto-generated from name — scrolls to this brand section in the shop.</p>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: textMain, marginBottom: '6px' }}>Brand Logo</label>
            <CloudinaryUpload
              value={form.logo || ''}
              onChange={(url) => setForm(p => ({ ...p, logo: url }))}
              folder="kryros/brands"
              accept="image/*"
              isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Country" value={form.country} onChange={(v) => f('country', v)} placeholder="e.g. South Korea" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Status" type="select" value={form.status} onChange={(v) => f('status', v)} options={['Active', 'Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <FormField label="Website" value={form.website} onChange={(v) => f('website', v)} placeholder="https://samsung.com" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Description" type="textarea" value={form.description} onChange={(v) => f('description', v)} placeholder="Short description of this brand" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <ModalFooter onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving} submitLabel={editRow ? 'Save Changes' : 'Add Brand'} isDark={isDark} border={border} textMain={textMain} />
        </Modal>

        <ConfirmDialog open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} loading={deleting} title="Delete Brand" message={deleteRow ? `Delete "${deleteRow.name}" permanently?` : 'Delete this brand?'} />
      </div>
    </AdminShell>
  );
}
