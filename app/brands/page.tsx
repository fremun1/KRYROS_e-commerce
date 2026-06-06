'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import { Award } from 'lucide-react';
import { createBrand, updateBrand, deleteBrand, getBrands, getCmsBrandBanners, createCmsBrandBanner } from '@/lib/api';
import toast from 'react-hot-toast';

type Brand = {
  id: string; name: string; slug: string; products: number; country: string;
  status: string; website: string; description: string;
};

const EMPTY_FORM = { name: '', slug: '', country: '', status: 'Active', website: '', description: '' };
const EMPTY_BANNER = { tagline: '', bannerDesc: '', bgColor: '#f5f5f5', brandColor: '#1FA89A', ctaText: '', ctaLink: '' };
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
  const [bannerForm, setBannerForm] = useState({ ...EMPTY_BANNER });
  const [allBanners, setAllBanners] = useState<Record<string, any>>({});

  const load = () => {
    getCmsBrandBanners().then((r: any) => {
      const bannersArr: any[] = Array.isArray(r.data) ? r.data : Array.isArray(r.data?.data) ? r.data.data : [];
      const bySlug: Record<string, any> = {};
      bannersArr.forEach((b: any) => { bySlug[b.brandSlug] = b; });
      setAllBanners(bySlug);
    }).catch(() => {});
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
      })));
    }).catch(() => {});
  };

  useEffect(load, []);

  const openAdd  = () => { setForm({ ...EMPTY_FORM }); setBannerForm({ ...EMPTY_BANNER }); setEditRow(null); setModalOpen(true); };
  const openEdit = (row: Brand) => {
    setForm({ name: row.name, slug: row.slug, country: row.country, status: row.status, website: row.website, description: row.description });
    const existing = allBanners[row.slug];
    setBannerForm(existing ? { tagline: existing.tagline || '', bannerDesc: existing.description || '', bgColor: existing.bgColor || '#f5f5f5', brandColor: existing.bgGradient || '#1FA89A', ctaText: existing.ctaText || '', ctaLink: existing.ctaLink || '' } : { ...EMPTY_BANNER });
    setEditRow(row); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Brand name is required'); return; }
    setSaving(true);
    try {
      const slug = form.slug || toSlug(form.name);
      const payload = { name: form.name.trim(), slug, country: form.country, isActive: form.status === 'Active', website: form.website, description: form.description };
      if (editRow) { await updateBrand(editRow.id, payload); toast.success('Brand updated'); }
      else         { await createBrand(payload);             toast.success('Brand created'); }
      // Save promotional banner if any banner field is filled
      if (bannerForm.tagline || bannerForm.bannerDesc || bannerForm.ctaText || bannerForm.ctaLink) {
        await createCmsBrandBanner({ brandSlug: slug, brandName: form.name.trim(), tagline: bannerForm.tagline, description: bannerForm.bannerDesc, bgColor: bannerForm.bgColor, bgGradient: bannerForm.brandColor, ctaText: bannerForm.ctaText, ctaLink: bannerForm.ctaLink, isActive: true });
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Country" value={form.country} onChange={(v) => f('country', v)} placeholder="e.g. South Korea" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Status" type="select" value={form.status} onChange={(v) => f('status', v)} options={['Active', 'Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <FormField label="Website" value={form.website} onChange={(v) => f('website', v)} placeholder="https://samsung.com" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Description" type="textarea" value={form.description} onChange={(v) => f('description', v)} placeholder="Short description of this brand" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          {/* ── Promotional Banner Section ── */}
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: '16px', marginTop: '4px' }}>
            <p style={{ fontSize: '11.5px', fontWeight: 700, color: '#1FA89A', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>Shop Page — Promotional Banner</p>
            <p style={{ fontSize: '11px', color: textMuted, marginBottom: '12px' }}>When a user taps this brand in the shop, this banner appears above their products.</p>
            <FormField label="Pre-text / Tagline (e.g. Innovate with)" value={bannerForm.tagline} onChange={(v) => setBannerForm(f => ({ ...f, tagline: v }))} placeholder="e.g. Innovate with" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Banner Description / Subtitle" type="textarea" value={bannerForm.bannerDesc} onChange={(v) => setBannerForm(f => ({ ...f, bannerDesc: v }))} placeholder="e.g. Galaxy experience.&#10;Bold tech, smarter life." isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Background Color</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="color" value={bannerForm.bgColor} onChange={(e) => setBannerForm(f => ({ ...f, bgColor: e.target.value }))} style={{ width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${border}`, cursor: 'pointer', padding: '2px' }} />
                  <input type="text" value={bannerForm.bgColor} onChange={(e) => setBannerForm(f => ({ ...f, bgColor: e.target.value }))} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: surface, border: `1px solid ${border}`, color: textMain, fontSize: '12px', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Brand Text/Accent Color</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="color" value={bannerForm.brandColor} onChange={(e) => setBannerForm(f => ({ ...f, brandColor: e.target.value }))} style={{ width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${border}`, cursor: 'pointer', padding: '2px' }} />
                  <input type="text" value={bannerForm.brandColor} onChange={(e) => setBannerForm(f => ({ ...f, brandColor: e.target.value }))} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: surface, border: `1px solid ${border}`, color: textMain, fontSize: '12px', outline: 'none' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <FormField label="Button Text" value={bannerForm.ctaText} onChange={(v) => setBannerForm(f => ({ ...f, ctaText: v }))} placeholder="e.g. Shop Samsung" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
              <FormField label="Button Link (URL)" value={bannerForm.ctaLink} onChange={(v) => setBannerForm(f => ({ ...f, ctaLink: v }))} placeholder="/shop?brand=Samsung" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            </div>
          </div>
          <ModalFooter onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving} submitLabel={editRow ? 'Save Changes' : 'Add Brand'} isDark={isDark} border={border} textMain={textMain} />
        </Modal>

        <ConfirmDialog open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} loading={deleting} title="Delete Brand" message={deleteRow ? `Delete "${deleteRow.name}" permanently?` : 'Delete this brand?'} />
      </div>
    </AdminShell>
  );
}
