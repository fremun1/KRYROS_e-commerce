'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import { Users } from 'lucide-react';
import { createUser, updateUser, deleteUser, getUsers } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import toast from 'react-hot-toast';

type User = { id: string; name: string; email: string; role: string; status: string; joined: string; orders: number };

const roles = [
  { name: 'Super Admin', permissions: 'Full Access', users: 1, color: '#ef4444' },
  { name: 'Admin', permissions: 'Dashboard, Orders, Products, Users', users: 3, color: '#f59e0b' },
  { name: 'Wholesale', permissions: 'Wholesale Orders, Products', users: 2, color: '#6366f1' },
  { name: 'Customer', permissions: 'View Products, Place Orders', users: 150, color: '#1FA89A' },
];

const EMPTY_FORM = { name: '', email: '', role: 'Customer', status: 'Active', password: '' };

function UsersContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#101826' : '#F1F5F9';

  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'Super Admin';

  const [data, setData] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load real users from API on mount
  useEffect(() => {
    setIsLoading(true);
    getUsers({ limit: 500 }).then(r => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      const normalized: User[] = raw.map((u: any) => ({
        id: u.id || '',
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email || '',
        email: u.email || '',
        role: u.role === 'SUPER_ADMIN' ? 'Super Admin' : u.role === 'ADMIN' ? 'Admin' : u.role === 'MANAGER' ? 'Manager' : u.role === 'WHOLESALE' ? 'Wholesale' : 'Customer',
        status: u.status === 'ACTIVE' ? 'Active' : u.status === 'INACTIVE' ? 'Inactive' : u.status === 'BLOCKED' ? 'Blocked' : (u.status || 'Active'),
        joined: u.createdAt ? u.createdAt.split('T')[0] : '',
        orders: u._count?.orders ?? 0,
      }));
      setData(normalized);
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<User | null>(null);
  const [deleteRow, setDeleteRow] = useState<User | null>(null);
  const [viewRow, setViewRow] = useState<User | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);

  const fp = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setAddOpen(true); };
  const openEdit = (row: Record<string, unknown>) => { const r = row as unknown as User; setForm({ name: r.name, email: r.email, role: r.role, status: r.status, password: '' }); setEditRow(r); };
  const openDelete = (row: Record<string, unknown>) => {
    const r = row as unknown as User;
    if (!isSuperAdmin) { toast.error('Only Super Admin can delete users'); return; }
    if (r.role === 'Admin' || r.role === 'Super Admin') { toast.error('Admin accounts cannot be deleted'); return; }
    setDeleteRow(r);
  };
  const openView = (row: Record<string, unknown>) => setViewRow(row as unknown as User);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error('Name and email are required'); return; }
    if (!(form as any).password?.trim()) { toast.error('Password is required'); return; }
    setLoading(true);
    try {
      const nameParts = form.name.trim().split(' ');
      const firstName = nameParts[0] || form.name;
      const lastName = nameParts.slice(1).join(' ') || '-';
      const roleMap: Record<string, string> = { 'Customer': 'CUSTOMER', 'Admin': 'ADMIN', 'Manager': 'MANAGER', 'Super Admin': 'SUPER_ADMIN' };
      await createUser({
        firstName,
        lastName,
        email: form.email,
        password: (form as any).password,
        role: roleMap[form.role] || 'CUSTOMER',
      });
      const newItem: User = { id: `USR${String(Date.now()).slice(-3)}`, ...form, joined: new Date().toISOString().split('T')[0], orders: 0 };
      setData(d => [...d, newItem]);
      toast.success('User added');
      setAddOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : (msg || 'check your API connection');
      toast.error(`Failed to add user — ${detail}`);
    }
    setLoading(false);
  };

  const handleEdit = async () => {
    if (!editRow) return;
    setLoading(true);
    try {
      const nameParts = form.name.trim().split(' ');
      const firstName = nameParts[0] || form.name;
      const lastName = nameParts.slice(1).join(' ') || '-';
      const roleMap: Record<string, string> = { 'Customer': 'CUSTOMER', 'Admin': 'ADMIN', 'Manager': 'MANAGER', 'Super Admin': 'SUPER_ADMIN' };
      const payload: Record<string, unknown> = {
        firstName,
        lastName,
        email: form.email,
        role: roleMap[form.role] || 'CUSTOMER',
      };
      // Only include password if provided
      if ((form as any).password?.trim()) {
        payload.password = (form as any).password;
      }
      await updateUser(editRow.id, payload);
      setData(d => d.map(u => u.id === editRow.id ? { ...u, ...form } : u));
      toast.success('User updated');
      setEditRow(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : (msg || 'check your API connection');
      toast.error(`Failed to update user — ${detail}`);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteRow || !isSuperAdmin) return;
    if (deleteRow.role === 'Admin' || deleteRow.role === 'Super Admin') {
      toast.error('Admin accounts cannot be deleted'); setDeleteRow(null); return;
    }
    setLoading(true);
    try {
      await deleteUser(deleteRow.id);
      setData(d => d.filter(u => u.id !== deleteRow.id));
      toast.success('User deleted');
      setDeleteRow(null);
    } catch { toast.error('Failed to delete user'); }
    setLoading(false);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      Active: { bg: 'rgba(31,168,154,0.12)', color: '#1FA89A' },
      Inactive: { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
      Blocked: { bg: 'rgba(185,28,28,0.12)', color: '#ef4444' },
    };
    const s = map[status] || map.Inactive;
    return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600, background: s.bg, color: s.color }}>{status}</span>;
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = { Admin: '#ef4444', 'Super Admin': '#ef4444', Wholesale: '#6366f1', Customer: '#1FA89A' };
    const color = map[role] || '#64748b';
    return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600, background: `${color}15`, color }}>{role}</span>;
  };

  const columns: Column[] = [
    { key: 'id', label: 'ID', width: '90px' },
    { key: 'name', label: 'Name', render: (v, row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(31,168,154,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#1FA89A', flexShrink: 0 }}>
          {String(v).charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: textMain }}>{String(v)}</div>
          <div style={{ fontSize: '11.5px', color: textMuted }}>{String(row.email)}</div>
        </div>
      </div>
    )},
    { key: 'role', label: 'Role', render: (v) => roleBadge(String(v)) },
    { key: 'status', label: 'Status', render: (v) => statusBadge(String(v)) },
    { key: 'orders', label: 'Orders', render: (v) => <span style={{ fontWeight: 700, color: textMain }}>{String(v)}</span> },
    { key: 'joined', label: 'Joined' },
  ];

  const modalFields = (
    <>
      <FormField label="Full Name" value={form.name} onChange={fp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. John Banda" />
      <FormField label="Email Address" value={form.email} onChange={fp('email')} type="email" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="john@example.com" />
      <FormField label="Password (leave blank to keep)" value={(form as any).password || ''} onChange={fp('password')} type="password" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Min 8 chars, upper+lower+number" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <FormField label="Role" value={form.role} onChange={fp('role')} options={isSuperAdmin ? ['Customer', 'Wholesale', 'Manager', 'Admin'] : ['Customer', 'Wholesale']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Status" value={form.status} onChange={fp('status')} options={['Active', 'Inactive', 'Blocked']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      </div>
    </>
  );

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="Manage users and their permissions" icon={Users} onAdd={openAdd} addLabel="Add User" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }} className="stats-grid">
        {[{ label: 'Total Users', val: String(data.length), color: '#1FA89A' }, { label: 'Active', val: String(data.filter(u=>u.status==='Active').length), color: '#1FA89A' }, { label: 'Inactive', val: String(data.filter(u=>u.status==='Inactive').length), color: '#64748b' }, { label: 'Blocked', val: String(data.filter(u=>u.status==='Blocked').length), color: '#ef4444' }].map((s) => (
          <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: textMuted, marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: textMain, marginBottom: '14px' }}>Roles Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }} className="roles-grid">
          {[
            { name: 'Super Admin', permissions: 'Full Access', users: data.filter(u=>u.role==='Super Admin').length, color: '#ef4444' },
            { name: 'Admin', permissions: 'Dashboard, Orders, Products, Users', users: data.filter(u=>u.role==='Admin').length, color: '#f59e0b' },
            { name: 'Wholesale', permissions: 'Wholesale Orders, Products', users: data.filter(u=>u.role==='Wholesale').length, color: '#6366f1' },
            { name: 'Customer', permissions: 'View Products, Place Orders', users: data.filter(u=>u.role==='Customer').length, color: '#1FA89A' },
          ].map((r) => (
            <div key={r.name} style={{ background: surface, border: `1px solid ${border}`, borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: textMain }}>{r.name}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: r.color }}>{r.users} users</span>
              </div>
              <div style={{ fontSize: '11.5px', color: textMuted }}>{r.permissions}</div>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '16px 0' }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{
              height: 52,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              borderRadius: 8, marginBottom: 8,
              animation: 'skeletonPulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.08}s`,
            }} />
          ))}
          <style>{`@keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
        </div>
      ) : (
      <DataTable columns={columns} data={data as unknown as Record<string, unknown>[]} searchPlaceholder="Search users..." onEdit={openEdit} onDelete={openDelete} onView={openView} />
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New User">
        {modalFields}
        <ModalFooter onClose={() => setAddOpen(false)} onSubmit={handleAdd} loading={loading} submitLabel="Add User" isDark={isDark} border={border} textMain={textMain} />
      </Modal>

      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name ?? ''}`}>
        {modalFields}
        <ModalFooter onClose={() => setEditRow(null)} onSubmit={handleEdit} loading={loading} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain} />
      </Modal>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="User Details">
        {viewRow && <>
          <FormField label="Full Name" value={viewRow.name} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Email" value={viewRow.email} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="Role" value={viewRow.role} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Status" value={viewRow.status} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="Joined" value={viewRow.joined} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Total Orders" value={String(viewRow.orders)} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <div style={{ marginTop: '6px' }}><button onClick={() => setViewRow(null)} style={{ width: '100%', padding: '10px', borderRadius: '9px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, color: textMain, fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>Close</button></div>
        </>}
      </Modal>

      <ConfirmDialog open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} loading={loading} title="Delete User (Super Admin Action)" message={`You are about to permanently delete "${deleteRow?.name}" (${deleteRow?.email}). This action cannot be undone and requires Super Admin authority.`} />

      <style>{`@media (max-width: 768px) { .stats-grid { grid-template-columns: 1fr 1fr !important; } .roles-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </div>
  );
}

export default function UsersPage() {
  return <AdminShell><UsersContent /></AdminShell>;
}
