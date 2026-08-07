'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { Users } from 'lucide-react';
import { createUser, updateUser, deleteUser, getUsers } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import toast from 'react-hot-toast';

type User = { 
  id: string; 
  displayId: string; 
  name: string; 
  email: string; 
  role: string; 
  status: string; 
  joined: string; 
  orders: number;
  accountStatus?: string;
};

const roles = [
  { name: 'Super Admin', permissions: 'Full Access', users: 1, color: 'var(--danger)' },
  { name: 'Admin', permissions: 'User Management', users: 3, color: 'var(--gold)' },
  { name: 'Wholesale', permissions: 'Wholesale Orders, Products', users: 2, color: 'var(--secondary)' },
  { name: 'Customer', permissions: 'View Products, Place Orders', users: 150, color: 'var(--primary)' },
];

const EMPTY_FORM = { name: '', email: '', role: 'Customer', status: 'Active', password: '' };

function formatUserDisplayId(id?: string, email?: string) {
  const clean = id?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean) return `USR-${clean.slice(-6)}`;
  const emailPrefix = email?.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (emailPrefix) return `USR-${emailPrefix.slice(0, 6)}`;
  return 'USR-NEW';
}

function UsersContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const hasAutoOpened = useRef(false);
  const isSuperAdmin = (currentUser?.role || '').toUpperCase().replace(/[\s_]+/g, '') === 'SUPERADMIN';
  const isAdmin = isSuperAdmin || (currentUser?.role || '').toUpperCase().replace(/[\s_]+/g, '') === 'ADMIN';
  const currentUserRoleNorm = (currentUser?.role || '').toUpperCase().replace(/[\s_]+/g, '');
  const canDeleteUsers = currentUserRoleNorm === 'SUPERADMIN' || currentUserRoleNorm === 'ADMIN';
  const canManageRoles = isSuperAdmin;
  const card = 'var(--card)';
  const border = 'var(--border)';
  const textMain = 'var(--text-main)';
  const textMuted = 'var(--text-muted)';
  const surface = 'var(--surface)';

  const [data, setData] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionModal, setActionModal] = useState<'promote' | 'demote' | 'suspend' | 'restrict' | 'block' | null>(null);
  const [actionForm, setActionForm] = useState<any>({});

  const normalizeRole = (r: string) =>
    r === 'SUPER_ADMIN' ? 'Super Admin'
      : r === 'ADMIN' ? 'Admin'
      : r === 'MANAGER' ? 'Manager'
      : r === 'WHOLESALER' ? 'Wholesale'
      : r === 'WHOLESALE' ? 'Wholesale'
      : r === 'STAFF' ? 'Staff'
      : 'Customer';

  // Load real users from API on mount
  useEffect(() => {
    setIsLoading(true);
    getUsers({ limit: 500 }).then(r => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      const normalized: User[] = raw.map((u: any) => ({
        id: u.id || '',
        displayId: formatUserDisplayId(u.id, u.email),
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email || '',
        email: u.email || '',
        role: normalizeRole(u.role),
        status: u.status === 'ACTIVE' ? 'Active' : u.status === 'INACTIVE' ? 'Inactive' : u.status === 'BLOCKED' ? 'Blocked' : (u.status || 'Active'),
        joined: u.createdAt ? u.createdAt.split('T')[0] : '',
        orders: u._count?.orders ?? 0,
        accountStatus: u.accountStatus?.status || 'ACTIVE',
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
  const fap = (k: string) => (v: string) => setActionForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setAddOpen(true); };
  const openEdit = (row: Record<string, unknown>) => { const r = row as unknown as User; setForm({ name: r.name, email: r.email, role: r.role, status: r.status, password: '' }); setEditRow(r); };
  
  const openDelete = (row: Record<string, unknown>) => {
    const r = row as unknown as User;
    if (authLoading) { toast.error('Loading user session...'); return; }
    if (!canDeleteUsers) { toast.error('Only Admin or Super Admin can delete users'); return; }
    if (r.id === currentUser?.id) { toast.error('You cannot delete your own account'); return; }
    if ((r.role || '').toUpperCase().replace(/[\s_]+/g, '') === 'SUPERADMIN') { toast.error('Super Admin accounts cannot be deleted'); return; }
    if (!isSuperAdmin && ((r.role || '').toUpperCase().replace(/[\s_]+/g, '') === 'ADMIN' || (r.role || '').toUpperCase().replace(/[\s_]+/g, '') === 'MANAGER')) { toast.error('Only Super Admin can delete Admin or Manager accounts'); return; }
    setDeleteRow(r);
  };

  const openPromote = (row: Record<string, unknown>) => {
    const r = row as unknown as User;
    if (!isSuperAdmin) { toast.error('Only Super Admin can promote users'); return; }
    if ((r.role || '').toUpperCase().replace(/[\s_]+/g, '') === 'SUPERADMIN') { toast.error('Super Admin cannot be promoted'); return; }
    setSelectedUser(r);
    setActionForm({ newRole: 'Admin' });
    setActionModal('promote');
  };

  const openDemote = (row: Record<string, unknown>) => {
    const r = row as unknown as User;
    if (!isSuperAdmin) { toast.error('Only Super Admin can demote users'); return; }
    if ((r.role || '').toUpperCase().replace(/[\s_]+/g, '') === 'SUPERADMIN') { toast.error('Super Admin cannot be demoted'); return; }
    setSelectedUser(r);
    setActionForm({ newRole: 'Customer' });
    setActionModal('demote');
  };

  const openSuspend = (row: Record<string, unknown>) => {
    const r = row as unknown as User;
    if (!isSuperAdmin) { toast.error('Only Super Admin can suspend users'); return; }
    setSelectedUser(r);
    setActionForm({ durationHours: 24, reason: '' });
    setActionModal('suspend');
  };

  const openRestrict = (row: Record<string, unknown>) => {
    const r = row as unknown as User;
    if (!isSuperAdmin) { toast.error('Only Super Admin can restrict users'); return; }
    setSelectedUser(r);
    setActionForm({ durationHours: 6, reason: '' });
    setActionModal('restrict');
  };

  const openBlock = (row: Record<string, unknown>) => {
    const r = row as unknown as User;
    if (!isSuperAdmin) { toast.error('Only Super Admin can block users'); return; }
    setSelectedUser(r);
    setActionForm({ reason: '' });
    setActionModal('block');
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
      const roleMap: Record<string, string> = { 'Customer': 'CUSTOMER', 'Wholesale': 'WHOLESALE', 'Manager': 'MANAGER', 'Admin': 'ADMIN', 'Super Admin': 'SUPER_ADMIN', 'Staff': 'STAFF' };
      const createdUser = await createUser({
        firstName,
        lastName,
        email: form.email,
        password: (form as any).password,
        role: roleMap[form.role] || 'CUSTOMER',
      });
      const created = createdUser?.data || {};
      const newItem: User = {
        id: created.id || `local-${Date.now()}`,
        displayId: formatUserDisplayId(created.id, form.email),
        ...form,
        joined: created.createdAt ? String(created.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
        orders: 0,
      };
      setData(d => [...d, newItem]);
      toast.success('User added. Password reset link sent to email.');
      setAddOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : (msg || 'check your API connection');
      toast.error(`Failed to add user — ${detail}`);
    }
    setLoading(false);
  };

  const handlePromote = async () => {
    if (!selectedUser || !actionForm.newRole) return;
    setLoading(true);
    try {
      const roleMap: Record<string, string> = { 'Admin': 'ADMIN', 'Super Admin': 'SUPER_ADMIN', 'Manager': 'MANAGER' };
      await updateUser(selectedUser.id, { role: roleMap[actionForm.newRole] });
      setData(d => d.map(u => u.id === selectedUser.id ? { ...u, role: actionForm.newRole } : u));
      toast.success(`User promoted to ${actionForm.newRole}`);
      setActionModal(null);
    } catch (err: any) {
      toast.error('Failed to promote user');
    }
    setLoading(false);
  };

  const handleDemote = async () => {
    if (!selectedUser || !actionForm.newRole) return;
    setLoading(true);
    try {
      const roleMap: Record<string, string> = { 'Customer': 'CUSTOMER', 'Wholesale': 'WHOLESALE', 'Staff': 'STAFF' };
      await updateUser(selectedUser.id, { role: roleMap[actionForm.newRole] });
      setData(d => d.map(u => u.id === selectedUser.id ? { ...u, role: actionForm.newRole } : u));
      toast.success(`User demoted to ${actionForm.newRole}`);
      setActionModal(null);
    } catch (err: any) {
      toast.error('Failed to demote user');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteRow || !canDeleteUsers || authLoading) return;
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
      Active: { bg: 'rgba(192,21,27,0.10)', color: 'var(--primary)' },
      Inactive: { bg: 'rgba(83,83,87,0.12)', color: 'var(--text-muted)' },
      Blocked: { bg: 'rgba(185,28,28,0.12)', color: 'var(--danger)' },
      Suspended: { bg: 'rgba(255,193,7,0.12)', color: 'var(--gold)' },
      Restricted: { bg: 'rgba(255,152,0,0.12)', color: 'var(--secondary)' },
    };
    const s = map[status] || map.Inactive;
    return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600, background: s.bg, color: s.color }}>{status}</span>;
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = { Admin: 'var(--danger)', 'Super Admin': 'var(--danger)', Wholesale: 'var(--secondary)', Customer: 'var(--primary)' };
    const color = map[role] || 'var(--text-muted)';
    return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600, background: `${color}15`, color }}>{role}</span>;
  };

  const columns: Column[] = [
    { key: 'displayId', label: 'ID', width: '110px' },
    { key: 'name', label: 'Name', render: (v, row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(192,21,27,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
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
      <FormField label="Full Name" value={form.name} onChange={fp('name')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. John Banda" />
      <FormField label="Email Address" value={form.email} onChange={fp('email')} type="email" border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="john@example.com" />
      <FormField label="Password" value={(form as any).password || ''} onChange={fp('password')} type="password" border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Min 8 chars, upper+lower+number" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <FormField label="Role" value={form.role} onChange={fp('role')} options={isSuperAdmin ? ['Customer', 'Wholesale', 'Staff', 'Manager', 'Admin', 'Super Admin'] : ['Customer', 'Wholesale', 'Staff']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Status" value={form.status} onChange={fp('status')} options={['Active', 'Inactive']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      </div>
    </>
  );

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="Manage users and their permissions" icon={Users} onAdd={openAdd} addLabel="Add User" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }} className="stats-grid">
        {[{ label: 'Total Users', val: String(data.length), color: 'var(--primary)' }, { label: 'Active', val: String(data.filter(u=>u.status==='Active').length), color: 'var(--primary)' }, { label: 'Inactive', val: String(data.filter(u=>u.status==='Inactive').length), color: 'var(--text-muted)' }, { label: 'Blocked', val: String(data.filter(u=>u.status==='Blocked').length), color: 'var(--danger)' }].map((s) => (
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
            { name: 'Super Admin', permissions: 'Full Access', users: data.filter(u=>u.role==='Super Admin').length, color: 'var(--danger)' },
            { name: 'Admin', permissions: 'User Management', users: data.filter(u=>u.role==='Admin').length, color: 'var(--gold)' },
            { name: 'Wholesale', permissions: 'Wholesale Orders', users: data.filter(u=>u.role==='Wholesale').length, color: 'var(--secondary)' },
            { name: 'Customer', permissions: 'Place Orders', users: data.filter(u=>u.role==='Customer').length, color: 'var(--primary)' },
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
              background: 'var(--surface)',
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

      {/* Add User Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New User">
        {modalFields}
        <ModalFooter onCancel={() => setAddOpen(false)} onSubmit={handleAdd} loading={loading} />
      </Modal>

      {/* Action Modals for Super Admin */}
      {isSuperAdmin && selectedUser && (
        <>
          {/* Promote Modal */}
          <Modal open={actionModal === 'promote'} onClose={() => setActionModal(null)} title="Promote User">
            <div style={{ marginBottom: '16px', padding: '12px', background: surface, borderRadius: '8px', border: `1px solid ${border}` }}>
              <div style={{ fontSize: '12px', color: textMuted, marginBottom: '4px' }}>Current Role</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: textMain }}>{selectedUser.role}</div>
            </div>
            <FormField label="New Role" value={actionForm.newRole} onChange={fap('newRole')} options={['Admin', 'Super Admin', 'Manager']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <ModalFooter onCancel={() => setActionModal(null)} onSubmit={handlePromote} loading={loading} submitLabel="Promote" />
          </Modal>

          {/* Demote Modal */}
          <Modal open={actionModal === 'demote'} onClose={() => setActionModal(null)} title="Demote User">
            <div style={{ marginBottom: '16px', padding: '12px', background: surface, borderRadius: '8px', border: `1px solid ${border}` }}>
              <div style={{ fontSize: '12px', color: textMuted, marginBottom: '4px' }}>Current Role</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: textMain }}>{selectedUser.role}</div>
            </div>
            <FormField label="New Role" value={actionForm.newRole} onChange={fap('newRole')} options={['Customer', 'Wholesale', 'Staff']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <ModalFooter onCancel={() => setActionModal(null)} onSubmit={handleDemote} loading={loading} submitLabel="Demote" />
          </Modal>

          {/* Suspend Modal */}
          <Modal open={actionModal === 'suspend'} onClose={() => setActionModal(null)} title="Suspend User">
            <FormField label="Duration (hours)" value={String(actionForm.durationHours)} onChange={(v) => fap('durationHours')(v)} type="number" border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Reason (optional)" value={actionForm.reason} onChange={fap('reason')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Why is this user being suspended?" />
            <ModalFooter onCancel={() => setActionModal(null)} onSubmit={() => {}} loading={loading} submitLabel="Suspend" />
          </Modal>

          {/* Restrict Modal */}
          <Modal open={actionModal === 'restrict'} onClose={() => setActionModal(null)} title="Restrict User">
            <FormField label="Duration (hours)" value={String(actionForm.durationHours)} onChange={(v) => fap('durationHours')(v)} type="number" border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Reason (optional)" value={actionForm.reason} onChange={fap('reason')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Why is this user being restricted?" />
            <ModalFooter onCancel={() => setActionModal(null)} onSubmit={() => {}} loading={loading} submitLabel="Restrict" />
          </Modal>

          {/* Block Modal */}
          <Modal open={actionModal === 'block'} onClose={() => setActionModal(null)} title="Block User">
            <FormField label="Reason (optional)" value={actionForm.reason} onChange={fap('reason')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Why is this user being blocked?" />
            <ModalFooter onCancel={() => setActionModal(null)} onSubmit={() => {}} loading={loading} submitLabel="Block" />
          </Modal>
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog open={!!deleteRow} onClose={() => setDeleteRow(null)} title="Delete User" message={`Are you sure you want to delete ${deleteRow?.name}? This action cannot be undone.`} onConfirm={handleDelete} loading={loading} />
    </div>
  );
}

export default function UsersPage() {
  return <AdminShell><UsersContent /></AdminShell>;
}
