'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import { Star } from 'lucide-react';
import { updateReview, deleteReview, getReviews } from '@/lib/api';
import toast from 'react-hot-toast';

type Review = { id: string; product: string; customer: string; rating: number; comment: string; date: string; status: string };

// Review data loaded from API

function ReviewsContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#101826' : '#F1F5F9';

  const [data, setData] = useState<Review[]>([]);
  useEffect(() => {
    getReviews({ limit: 500 }).then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      const normalized: Review[] = raw.map((r: any) => ({
        id: r.id || '',
        product: r.product?.name || r.productId || '',
        customer: r.user ? [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || r.user.email : 'Customer',
        rating: Number(r.rating || 0),
        comment: r.comment || r.body || '',
        date: r.createdAt ? r.createdAt.split('T')[0] : '',
        status: r.isApproved ? 'Approved' : r.status || 'Pending',
      }));
      setData(normalized);
    }).catch(() => {});
  }, []);
  const [viewRow, setViewRow] = useState<Review | null>(null);
  const [editRow, setEditRow] = useState<Review | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [deleteRow, setDeleteRow] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);

  const openView = (row: Record<string, unknown>) => setViewRow(row as unknown as Review);
  const openEdit = (row: Record<string, unknown>) => { const r = row as unknown as Review; setEditStatus(r.status); setEditRow(r); };
  const openDelete = (row: Record<string, unknown>) => setDeleteRow(row as unknown as Review);

  const handleUpdateStatus = async () => {
    if (!editRow) return;
    setLoading(true);
    try {
      // Map admin status labels to backend DTO fields
      const statusMap: Record<string, { isApproved?: boolean; isFeatured?: boolean }> = {
        'Approved': { isApproved: true },
        'Rejected': { isApproved: false },
        'Featured': { isApproved: true, isFeatured: true },
        'Pending': { isApproved: false, isFeatured: false },
      };
      const payload = statusMap[editStatus] ?? { isApproved: editStatus !== 'Rejected' };
      await updateReview(editRow.id, payload);
      setData(d => d.map(r => r.id === editRow.id ? { ...r, status: editStatus } : r));
      toast.success('Review status updated');
      setEditRow(null);
    } catch { toast.error('Failed to update review — check your API connection'); }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setLoading(true);
    try {
      await deleteReview(deleteRow.id);
      setData(d => d.filter(r => r.id !== deleteRow.id));
      toast.success('Review deleted');
      setDeleteRow(null);
    } catch { toast.error('Failed to delete review — check your API connection'); }
    setLoading(false);
  };

  const Stars = ({ n, size = 14 }: { n: number; size?: number }) => (
    <div style={{ display: 'flex', gap: '1px' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: `${size}px`, color: i <= n ? '#FFC107' : (isDark ? '#1E293B' : '#D1D5DB') }}>&#9733;</span>
      ))}
    </div>
  );

  const badge = (status: string) => {
    const m: Record<string, { bg: string; color: string }> = {
      Published: { bg: 'rgba(31,168,154,0.12)', color: '#1FA89A' },
      Pending: { bg: 'rgba(255,193,7,0.12)', color: '#FFC107' },
      Rejected: { bg: 'rgba(185,28,28,0.12)', color: '#ef4444' },
    };
    const s = m[status] || m.Pending;
    return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600, background: s.bg, color: s.color }}>{status}</span>;
  };

  const columns: Column[] = [
    { key: 'id', label: 'ID', width: '90px' },
    { key: 'product', label: 'Product', render: (v) => <span style={{ fontWeight: 600, color: textMain }}>{String(v)}</span> },
    { key: 'customer', label: 'Customer' },
    { key: 'rating', label: 'Rating', render: (v) => <Stars n={Number(v)} /> },
    { key: 'comment', label: 'Comment', render: (v) => <span style={{ fontSize: '12.5px', color: textMuted, maxWidth: '180px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(v)}</span> },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status', render: (v) => badge(String(v)) },
  ];

  const stats = [
    { label: 'Total Reviews', val: String(data.length), color: '#1FA89A' },
    { label: 'Published', val: String(data.filter(r=>r.status==='Published').length), color: '#1FA89A' },
    { label: 'Pending', val: String(data.filter(r=>r.status==='Pending').length), color: '#FFC107' },
    { label: 'Rejected', val: String(data.filter(r=>r.status==='Rejected').length), color: '#ef4444' },
  ];

  return (
    <div>
      <PageHeader title="Reviews" subtitle="Manage customer product reviews" icon={Star} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }} className="stats-grid">
        {stats.map(s => (
          <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: textMuted, marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>
      <DataTable columns={columns} data={data as unknown as Record<string, unknown>[]} searchPlaceholder="Search reviews..." onView={openView} onEdit={openEdit} onDelete={openDelete} />

      {/* View Modal */}
      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Review Details">
        {viewRow && <>
          <FormField label="Product" value={viewRow.product} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Customer" value={viewRow.customer} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Rating</label>
            <Stars n={viewRow.rating} size={20} />
          </div>
          <FormField label="Comment" value={viewRow.comment} type="textarea" readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="Date" value={viewRow.date} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Status" value={viewRow.status} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <button onClick={() => setViewRow(null)} style={{ width: '100%', padding: '10px', borderRadius: '9px', marginTop: '6px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, color: textMain, fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>Close</button>
        </>}
      </Modal>

      {/* Edit Status Modal */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Moderate: ${editRow?.product ?? ''}`}>
        {editRow && <>
          <p style={{ fontSize: '13px', color: textMuted, marginBottom: '16px' }}>By <strong style={{ color: textMain }}>{editRow.customer}</strong> — {editRow.rating}★</p>
          <FormField label="Review Status" value={editStatus} onChange={setEditStatus} options={['Published', 'Pending', 'Rejected']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <ModalFooter onClose={() => setEditRow(null)} onSubmit={handleUpdateStatus} loading={loading} submitLabel="Update Status" isDark={isDark} border={border} textMain={textMain} />
        </>}
      </Modal>

      <ConfirmDialog open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} loading={loading} title="Delete Review" message={`Are you sure you want to delete this review by "${deleteRow?.customer}"?`} />

      <style>{`@media (max-width: 768px) { .stats-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </div>
  );
}

export default function ReviewsPage() {
  return <AdminShell><ReviewsContent /></AdminShell>;
}
