'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column, ActionBtn } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import {
  Users, ArrowUp, ArrowDown, ShieldAlert, UserMinus, Ban, CheckCircle,
} from 'lucide-react';
import {
  createUser, updateUser, deleteUser, getUsers,
  promoteUser, demoteUser, suspendUser, restrictUser, blockUser, unblockUser,
} from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
  id: string;
  displayId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  role: string;
  status: string;
  joined: string;
  orders: number;
  accountStatus?: string;
};

// ─── Role maps ────────────────────────────────────────────────────────────────

const ROLE_TO_API: Record<string, string> = {
  'Customer': 'CUSTOMER',
  'Wholesale': 'WHOLESALE',
  'Staff': 'STAFF',
  'Manager': 'MANAGER',
  'Admin': 'ADMIN',
  'Super Admin': 'SUPER_ADMIN',
};

const API_TO_ROLE = (r: string): string => {
  const norm = (r || '').toUpperCase().replace(/[\s_]+/g, '');
  if (norm === 'SUPERADMIN') return 'Super Admin';
  if (norm === 'ADMIN') return 'Admin';
  if (norm === 'MANAGER') return 'Manager';
  if (norm === 'WHOLESALER' || norm === 'WHOLESALE') return 'Wholesale';
  if (norm === 'STAFF') return 'Staff';
  return 'Customer';
};

const isAdminRole = (role: string) => {
  const n = (role || '').toUpperCase().replace(/[\s_]+/g, '');
  return n === 'SUPERADMIN' || n === 'ADMIN';
};

const isSuperAdminRole = (role: string) =>
  (role || '').toUpperCase().replace(/[\s_]+/g, '') === 'SUPERADMIN';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUserDisplayId(id?: string, email?: string) {
  const clean = id?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean) return `USR-${clean.slice(-6)}`;
  const emailPrefix = email?.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (emailPrefix) return `USR-${emailPrefix.slice(0, 6)}`;
  return 'USR-NEW';
}

// ─── Empty forms ──────────────────────────────────────────────────────────────

const EMPTY_USER_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  role: 'Customer',
  status: 'Active',
  password: '',
};

// Admin creation only needs email + role; a temp password is auto-generated
// and a reset link is emailed by the backend.
const EMPTY_ADMIN_FORM = {
  email: '',
  role: 'Admin',
};

// ─── Main component ───────────────────────────────────────────────────────────

function UsersContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const hasAutoOpened = useRef(false);

  const currentRole = currentUser?.role || '';
  const isSuperAdmin = isSuperAdminRole(currentRole);
  const isAdmin = isSuperAdmin || (currentRole || '').toUpperCase().replace(/[\s_]+/g, '') === 'ADMIN';

  // Style tokens
  const card = 'var(--card)';
  const border = 'var(--border)';
  const textMain = 'var(--text-main)';
  const textMuted = 'var(--text-muted)';
  const surface = 'var(--surface)';

  // ── Data ────────────────────────────────────────────────────────────────────

  const [data, setData] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getUsers({ take: 500, showInactive: true })
      .then(r => {
        const raw: any[] = Array.isArray(r.data?.data)
          ? r.data.data
          : Array.isArray(r.data)
          ? r.data
          : [];
        const normalized: User[] = raw.map((u: any) => ({
          id: u.id || '',
          displayId: formatUserDisplayId(u.id, u.email),
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email || '',
          email: u.email || '',
          phone: u.phone || u.phoneNumber || '',
          dateOfBirth: u.dateOfBirth ? String(u.dateOfBirth).split('T')[0] : '',
          role: API_TO_ROLE(u.role),
          status:
            u.status === 'ACTIVE'   ? 'Active'
            : u.status === 'INACTIVE' ? 'Inactive'
            : u.status === 'BLOCKED'  ? 'Blocked'
            : (u.status || 'Active'),
          joined: u.createdAt ? u.createdAt.split('T')[0] : '',
          orders: u._count?.orders ?? 0,
          accountStatus: u.accountStatus?.status || 'ACTIVE',
        }));
        setData(normalized);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // ── Modal state ─────────────────────────────────────────────────────────────

  // "Add User" modal (regular users — full form)
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ ...EMPTY_USER_FORM });

  // "Add Admin" modal (admin/super admin — email only, backend sends temp password)
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ ...EMPTY_ADMIN_FORM });

  // Edit modal
  const [editRow, setEditRow] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_USER_FORM });

  // View modal
  const [viewRow, setViewRow] = useState<User | null>(null);

  // Delete confirmation
  const [deleteRow, setDeleteRow] = useState<User | null>(null);

  // Action modals
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionModal, setActionModal] = useState<
    'promote' | 'demote' | 'suspend' | 'restrict' | 'block' | 'unblock' | null
  >(null);
  const [actionForm, setActionForm] = useState<any>({});

  const [loading, setLoading] = useState(false);

  // ── Auto-open from query param ───────────────────────────────────────────────

  useEffect(() => {
    if (!hasAutoOpened.current && searchParams.get('action') === 'add') {
      hasAutoOpened.current = true;
      setAddUserOpen(true);
    }
  }, [searchParams]);

  // ── Field setters ────────────────────────────────────────────────────────────

  const ufp = (k: string) => (v: string) =>
    setUserForm(f => ({ ...f, [k]: v }));
  const afp = (k: string) => (v: string) =>
    setAdminForm(f => ({ ...f, [k]: v }));
  const efp = (k: string) => (v: string) =>
    setEditForm(f => ({ ...f, [k]: v }));
  const acfp = (k: string) => (v: string) =>
    setActionForm((f: any) => ({ ...f, [k]: v }));

  // ── Open handlers ────────────────────────────────────────────────────────────

  const openAddUser = () => {
    setUserForm({ ...EMPTY_USER_FORM });
    setAddUserOpen(true);
  };

  const openAddAdmin = () => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admin can create admin accounts');
      return;
    }
    setAdminForm({ ...EMPTY_ADMIN_FORM });
    setAddAdminOpen(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    const r = row as unknown as User;
    setEditForm({
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      dateOfBirth: r.dateOfBirth,
      role: r.role,
      status: r.status,
      password: '',
    });
    setEditRow(r);
  };

  const openDelete = (row: Record<string, unknown>) => {
    const r = row as unknown as User;
    if (authLoading) { toast.error('Loading user session...'); return; }
    if (!isAdmin) { toast.error('Only Admin or Super Admin can delete users'); return; }
    if (r.id === currentUser?.id) { toast.error('You cannot delete your own account'); return; }
    if (isSuperAdminRole(r.role)) { toast.error('Super Admin accounts cannot be deleted via the UI'); return; }
    // Regular admins cannot delete other admins/managers
    if (!isSuperAdmin && isAdminRole(r.role)) {
      toast.error('Only Super Admin can delete Admin accounts');
      return;
    }
    setDeleteRow(r);
  };

  const openPromote = (row: Record<string, unknown>) => {
    const r = row as unknown as User;
    if (!isSuperAdmin) { toast.error('Only Super Admin can promote users'); return; }
    if (isSuperAdminRole(r.role)) { toast.error('Super Admin cannot be promoted further'); return; }
    setSelectedUser(r);
    setActionForm({ newRole: 'Admin' });
    setActionModal('promote');
  };

  const openDemote = (row: Record<string, unknown>) => {
    const r = row as unknown as User;
    if (!isSuperAdmin) { toast.error('Only Super Admin can demote users'); return; }
    if (isSuperAdminRole(r.role)) { toast.error('Super Admin cannot be demoted via the UI'); return; }
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

  const openUnblock = (row: Record<string, unknown>) => {
    const r = row as unknown as User;
    if (!isSuperAdmin) { toast.error('Only Super Admin can unblock users'); return; }
    setSelectedUser(r);
    setActionModal('unblock');
  };

  const openView = (row: Record<string, unknown>) =>
    setViewRow(row as unknown as User);

  // ── Submit handlers ──────────────────────────────────────────────────────────

  /** Create a regular user — all fields required */
  const handleAddUser = async () => {
    const { firstName, lastName, email, phone, dateOfBirth, role, status, password } = userForm;
    if (!firstName.trim()) { toast.error('First name is required'); return; }
    if (!lastName.trim()) { toast.error('Last name is required'); return; }
    if (!email.trim()) { toast.error('Email address is required'); return; }
    if (!phone.trim()) { toast.error('Phone number is required'); return; }
    if (!dateOfBirth.trim()) { toast.error('Date of birth is required'); return; }
    if (!password.trim()) { toast.error('Password is required'); return; }
    if (password.trim().length < 8) { toast.error('Password must be at least 8 characters'); return; }

    // Enforce: admins cannot create admin-level roles
    if (!isSuperAdmin && isAdminRole(role)) {
      toast.error('Only Super Admin can create admin accounts');
      return;
    }

    setLoading(true);
    try {
      const created = await createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth || undefined,
        password: password.trim(),
        role: ROLE_TO_API[role] || 'CUSTOMER',
        status: status.toUpperCase(),
      });
      const c = created?.data || {};
      const newItem: User = {
        id: c.id || `local-${Date.now()}`,
        displayId: formatUserDisplayId(c.id, email),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth,
        role,
        status,
        joined: c.createdAt ? String(c.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
        orders: 0,
      };
      setData(d => [...d, newItem]);
      toast.success('User created successfully.');
      setAddUserOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : (msg || 'check your API connection');
      toast.error(`Failed to create user — ${detail}`);
    }
    setLoading(false);
  };

  /**
   * Create an Admin or Super Admin.
   * Only requires email + role. The backend generates a random temporary password
   * and sends the user an email with the temp password AND a reset-password link.
   */
  const handleAddAdmin = async () => {
    const { email, role } = adminForm;
    if (!email.trim()) { toast.error('Email address is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!isSuperAdmin) {
      toast.error('Only Super Admin can create admin accounts');
      return;
    }

    setLoading(true);
    try {
      // Generate a secure temporary password on the client side.
      // The backend's PasswordResetService will also send a reset link.
      const tempPassword = generateTempPassword();

      const created = await createUser({
        email: email.trim(),
        // firstName/lastName can be set later by the admin themselves
        firstName: email.trim().split('@')[0],
        lastName: '',
        password: tempPassword,
        role: ROLE_TO_API[role] || 'ADMIN',
      });
      const c = created?.data || {};
      const newItem: User = {
        id: c.id || `local-${Date.now()}`,
        displayId: formatUserDisplayId(c.id, email),
        firstName: email.trim().split('@')[0],
        lastName: '',
        name: email.trim().split('@')[0],
        email: email.trim(),
        phone: '',
        dateOfBirth: '',
        role,
        status: 'Active',
        joined: c.createdAt ? String(c.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
        orders: 0,
      };
      setData(d => [...d, newItem]);
      toast.success(
        `${role} account created. A temporary password and reset link have been sent to ${email.trim()}.`,
        { duration: 6000 }
      );
      setAddAdminOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : (msg || 'check your API connection');
      toast.error(`Failed to create admin — ${detail}`);
    }
    setLoading(false);
  };

  const handleEditUser = async () => {
    if (!editRow) return;
    const { firstName, lastName, phone, dateOfBirth, role, status } = editForm;

    // Enforce: admins cannot assign admin-level roles
    if (!isSuperAdmin && isAdminRole(role)) {
      toast.error('Only Super Admin can assign admin roles');
      return;
    }

    setLoading(true);
    try {
      await updateUser(editRow.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth || undefined,
        role: ROLE_TO_API[role] || 'CUSTOMER',
        status: status.toUpperCase(),
      });
      const updatedName = `${firstName.trim()} ${lastName.trim()}`.trim();
      setData(d =>
        d.map(u =>
          u.id === editRow.id
            ? { ...u, firstName, lastName, name: updatedName, phone, dateOfBirth, role, status }
            : u
        )
      );
      toast.success('User updated successfully');
      setEditRow(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(`Failed to update user — ${Array.isArray(msg) ? msg.join(', ') : msg || 'error'}`);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteRow || !isAdmin || authLoading) return;
    setLoading(true);
    try {
      await deleteUser(deleteRow.id);
      setData(d => d.filter(u => u.id !== deleteRow.id));
      toast.success('User deleted successfully');
      setDeleteRow(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(`Failed to delete user — ${msg || 'error'}`);
    }
    setLoading(false);
  };

  const handlePromote = async () => {
    if (!selectedUser || !actionForm.newRole) return;
    setLoading(true);
    try {
      await promoteUser(selectedUser.id, ROLE_TO_API[actionForm.newRole] || actionForm.newRole);
      setData(d => d.map(u => u.id === selectedUser.id ? { ...u, role: actionForm.newRole } : u));
      toast.success(`User promoted to ${actionForm.newRole}`);
      setActionModal(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to promote user');
    }
    setLoading(false);
  };

  const handleDemote = async () => {
    if (!selectedUser || !actionForm.newRole) return;
    setLoading(true);
    try {
      await demoteUser(selectedUser.id, ROLE_TO_API[actionForm.newRole] || actionForm.newRole);
      setData(d => d.map(u => u.id === selectedUser.id ? { ...u, role: actionForm.newRole } : u));
      toast.success(`User demoted to ${actionForm.newRole}`);
      setActionModal(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to demote user');
    }
    setLoading(false);
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;
    const hours = Number(actionForm.durationHours);
    if (!hours || hours <= 0) { toast.error('Duration must be greater than 0'); return; }
    setLoading(true);
    try {
      await suspendUser(selectedUser.id, hours, actionForm.reason);
      setData(d => d.map(u => u.id === selectedUser.id ? { ...u, status: 'Suspended' } : u));
      toast.success(`User suspended for ${hours} hours`);
      setActionModal(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to suspend user');
    }
    setLoading(false);
  };

  const handleRestrict = async () => {
    if (!selectedUser) return;
    const hours = Number(actionForm.durationHours);
    if (!hours || hours <= 0) { toast.error('Duration must be greater than 0'); return; }
    setLoading(true);
    try {
      await restrictUser(selectedUser.id, hours, actionForm.reason);
      setData(d => d.map(u => u.id === selectedUser.id ? { ...u, status: 'Restricted' } : u));
      toast.success(`User restricted for ${hours} hours`);
      setActionModal(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to restrict user');
    }
    setLoading(false);
  };

  const handleBlock = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await blockUser(selectedUser.id, actionForm.reason);
      setData(d => d.map(u => u.id === selectedUser.id ? { ...u, status: 'Blocked' } : u));
      toast.success('User blocked successfully');
      setActionModal(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to block user');
    }
    setLoading(false);
  };

  const handleUnblock = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await unblockUser(selectedUser.id);
      setData(d => d.map(u => u.id === selectedUser.id ? { ...u, status: 'Active' } : u));
      toast.success('User unblocked successfully');
      setActionModal(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to unblock user');
    }
    setLoading(false);
  };

  // ── Badges ───────────────────────────────────────────────────────────────────

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      Active:     { bg: 'rgba(192,21,27,0.10)', color: 'var(--primary)' },
      Inactive:   { bg: 'rgba(83,83,87,0.12)',  color: 'var(--text-muted)' },
      Blocked:    { bg: 'rgba(185,28,28,0.12)', color: 'var(--danger)' },
      Suspended:  { bg: 'rgba(255,193,7,0.12)', color: 'var(--gold)' },
      Restricted: { bg: 'rgba(255,152,0,0.12)', color: 'var(--secondary)' },
    };
    const s = map[status] || map.Inactive;
    return (
      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600, background: s.bg, color: s.color }}>
        {status}
      </span>
    );
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      'Super Admin': 'var(--danger)',
      Admin: 'var(--danger)',
      Manager: 'var(--link)',
      Wholesale: 'var(--secondary)',
      Staff: 'var(--gold)',
      Customer: 'var(--primary)',
    };
    const color = map[role] || 'var(--text-muted)';
    return (
      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600, background: `${color}15`, color }}>
        {role}
      </span>
    );
  };

  // ── Table columns ─────────────────────────────────────────────────────────────

  const columns: Column[] = [
    { key: 'displayId', label: 'ID', width: '110px' },
    {
      key: 'name', label: 'Name',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(192,21,27,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
            {String(v).charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: textMain }}>{String(v)}</div>
            <div style={{ fontSize: '11.5px', color: textMuted }}>{String(row.email)}</div>
          </div>
        </div>
      ),
    },
    { key: 'role',   label: 'Role',   render: v => roleBadge(String(v)) },
    { key: 'status', label: 'Status', render: v => statusBadge(String(v)) },
    { key: 'orders', label: 'Orders', render: v => <span style={{ fontWeight: 700, color: textMain }}>{String(v)}</span> },
    { key: 'joined', label: 'Joined' },
  ];

  // ── Roles overview data ───────────────────────────────────────────────────────

  const roleStats = [
    { name: 'Super Admin', permissions: 'Full Access',          color: 'var(--danger)',    count: data.filter(u => isSuperAdminRole(u.role)).length },
    { name: 'Admin',       permissions: 'User Management',      color: 'var(--gold)',      count: data.filter(u => (u.role || '').toUpperCase().replace(/[\s_]+/g, '') === 'ADMIN').length },
    { name: 'Manager',     permissions: 'Inventory, Orders',    color: 'var(--link)',      count: data.filter(u => (u.role || '').toUpperCase().replace(/[\s_]+/g, '') === 'MANAGER').length },
    { name: 'Wholesale',   permissions: 'Wholesale Orders',     color: 'var(--secondary)', count: data.filter(u => ['WHOLESALE','WHOLESALER'].includes((u.role || '').toUpperCase().replace(/[\s_]+/g, ''))).length },
    { name: 'Staff',       permissions: 'Limited Access',       color: 'var(--gold)',      count: data.filter(u => (u.role || '').toUpperCase().replace(/[\s_]+/g, '') === 'STAFF').length },
    { name: 'Customer',    permissions: 'Place Orders',         color: 'var(--primary)',   count: data.filter(u => ['CUSTOMER',''].includes((u.role || '').toUpperCase().replace(/[\s_]+/g, ''))).length },
  ];

  // ── Role options per actor ────────────────────────────────────────────────────

  // Regular users (non-admin roles) that any admin can create
  const userRoleOptions = ['Customer', 'Wholesale', 'Staff', 'Manager'];
  // Admin roles only Super Admin can create
  const adminRoleOptions = ['Admin', 'Super Admin'];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Manage users and their permissions"
        icon={Users}
        onAdd={openAddUser}
        addLabel="Add User"
        // Extra button for Super Admin to create admin accounts
        extra={
          isSuperAdmin ? (
            <button
              onClick={openAddAdmin}
              style={{
                background: 'var(--danger)',
                color: 'white',
                border: 'none',
                borderRadius: '9px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              + Add Admin
            </button>
          ) : null
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }} className="stats-grid">
        {[
          { label: 'Total Users', val: String(data.length),                                   color: 'var(--primary)' },
          { label: 'Active',      val: String(data.filter(u => u.status === 'Active').length), color: 'var(--primary)' },
          { label: 'Inactive',    val: String(data.filter(u => u.status === 'Inactive').length), color: 'var(--text-muted)' },
          { label: 'Blocked',     val: String(data.filter(u => u.status === 'Blocked').length),  color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Roles overview */}
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: textMain, marginBottom: '14px' }}>Roles Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }} className="roles-grid">
          {roleStats.map(r => (
            <div key={r.name} style={{ background: surface, border: `1px solid ${border}`, borderRadius: '10px', padding: '14px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: textMain, whiteSpace: 'nowrap' }}>{r.name}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: r.color, whiteSpace: 'nowrap' }}>{r.count} users</span>
              </div>
              <div style={{ fontSize: '11.5px', color: textMuted }}>{r.permissions}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ padding: '16px 0' }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ height: 52, background: 'var(--surface)', borderRadius: 8, marginBottom: 8, animation: 'skeletonPulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
          ))}
          <style>{`@keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data as unknown as Record<string, unknown>[]}
          searchPlaceholder="Search users..."
          onEdit={openEdit}
          onDelete={openDelete}
          onView={openView}
          renderActions={row => {
            if (!isSuperAdmin) return null;
            const r = row as unknown as User;
            const isRowSuperAdmin = isSuperAdminRole(r.role);
            const isBlocked = r.status === 'Blocked';
            return (
              <>
                {!isRowSuperAdmin && <ActionBtn icon={ArrowUp}    color="var(--success)"   onClick={() => openPromote(row)} />}
                {!isRowSuperAdmin && <ActionBtn icon={ArrowDown}  color="var(--gold)"      onClick={() => openDemote(row)} />}
                {!isRowSuperAdmin && <ActionBtn icon={UserMinus}  color="var(--secondary)" onClick={() => openSuspend(row)} />}
                {!isRowSuperAdmin && <ActionBtn icon={ShieldAlert} color="var(--danger)"   onClick={() => openRestrict(row)} />}
                {!isRowSuperAdmin && !isBlocked && <ActionBtn icon={Ban}          color="var(--danger)"   onClick={() => openBlock(row)} />}
                {!isRowSuperAdmin && isBlocked  && <ActionBtn icon={CheckCircle} color="var(--success)"  onClick={() => openUnblock(row)} />}
              </>
            );
          }}
        />
      )}

      {/* ── Add User Modal ────────────────────────────────────────────────────── */}
      <Modal open={addUserOpen} onClose={() => setAddUserOpen(false)} title="Add New User">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <FormField label="First Name *" value={userForm.firstName} onChange={ufp('firstName')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. John" />
          <FormField label="Last Name *"  value={userForm.lastName}  onChange={ufp('lastName')}  border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Banda" />
        </div>
        <FormField label="Email Address *" value={userForm.email} onChange={ufp('email')} type="email" border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="john@example.com" />
        <FormField label="Phone Number *" value={userForm.phone} onChange={ufp('phone')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="+260 97X XXX XXX" />
        <FormField label="Date of Birth *" value={userForm.dateOfBirth} onChange={ufp('dateOfBirth')} type="date" border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Password *" value={userForm.password} onChange={ufp('password')} type="password" border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Min 8 chars" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <FormField
            label="Role"
            value={userForm.role}
            onChange={ufp('role')}
            options={userRoleOptions}
            border={border} textMain={textMain} textMuted={textMuted} surface={surface}
          />
          <FormField label="Status" value={userForm.status} onChange={ufp('status')} options={['Active', 'Inactive']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        </div>
        <ModalFooter onClose={() => setAddUserOpen(false)} onSubmit={handleAddUser} loading={loading} submitLabel="Create User" border={border} textMain={textMain} />
      </Modal>

      {/* ── Add Admin Modal (Super Admin only) ───────────────────────────────── */}
      <Modal open={addAdminOpen} onClose={() => setAddAdminOpen(false)} title="Add Admin Account">
        <div style={{ background: 'rgba(192,21,27,0.06)', border: '1px solid rgba(192,21,27,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '16px', fontSize: '13px', color: textMuted, lineHeight: 1.6 }}>
          <strong style={{ color: textMain }}>How admin creation works:</strong><br />
          Enter the person's email and select their role. The system will automatically generate a secure temporary password and send it to their email along with a password reset link. They can log in with the temporary password or use the reset link to set their own password immediately.
        </div>
        <FormField label="Email Address *" value={adminForm.email} onChange={afp('email')} type="email" border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="admin@example.com" />
        <FormField
          label="Admin Role"
          value={adminForm.role}
          onChange={afp('role')}
          options={adminRoleOptions}
          border={border} textMain={textMain} textMuted={textMuted} surface={surface}
        />
        <div style={{ fontSize: '12px', color: textMuted, marginTop: '4px', marginBottom: '8px' }}>
          The new admin will receive an email with their temporary password and a reset link.
        </div>
        <ModalFooter onClose={() => setAddAdminOpen(false)} onSubmit={handleAddAdmin} loading={loading} submitLabel="Create Admin & Send Email" border={border} textMain={textMain} />
      </Modal>

      {/* ── Edit User Modal ───────────────────────────────────────────────────── */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title="Edit User">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <FormField label="First Name" value={editForm.firstName} onChange={efp('firstName')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Last Name"  value={editForm.lastName}  onChange={efp('lastName')}  border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        </div>
        <FormField label="Email Address" value={editForm.email} onChange={efp('email')} type="email" border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Phone Number" value={editForm.phone} onChange={efp('phone')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Date of Birth" value={editForm.dateOfBirth} onChange={efp('dateOfBirth')} type="date" border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <FormField
            label="Role"
            value={editForm.role}
            onChange={efp('role')}
            options={isSuperAdmin ? [...userRoleOptions, ...adminRoleOptions] : userRoleOptions}
            border={border} textMain={textMain} textMuted={textMuted} surface={surface}
          />
          <FormField label="Status" value={editForm.status} onChange={efp('status')} options={['Active', 'Inactive']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        </div>
        <ModalFooter onClose={() => setEditRow(null)} onSubmit={handleEditUser} loading={loading} submitLabel="Save Changes" border={border} textMain={textMain} />
      </Modal>

      {/* ── View User Modal ───────────────────────────────────────────────────── */}
      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="User Details">
        {viewRow && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: surface, borderRadius: '8px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(192,21,27,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                {viewRow.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: textMain }}>{viewRow.name}</div>
                <div style={{ fontSize: '13px', color: textMuted }}>{viewRow.email}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><div style={{ fontSize: '11px', color: textMuted }}>ID</div><div style={{ fontWeight: 600 }}>{viewRow.displayId}</div></div>
              <div><div style={{ fontSize: '11px', color: textMuted }}>Joined</div><div style={{ fontWeight: 600 }}>{viewRow.joined}</div></div>
              <div><div style={{ fontSize: '11px', color: textMuted }}>Phone</div><div style={{ fontWeight: 600 }}>{viewRow.phone || '—'}</div></div>
              <div><div style={{ fontSize: '11px', color: textMuted }}>Date of Birth</div><div style={{ fontWeight: 600 }}>{viewRow.dateOfBirth || '—'}</div></div>
              <div><div style={{ fontSize: '11px', color: textMuted }}>Role</div><div>{roleBadge(viewRow.role)}</div></div>
              <div><div style={{ fontSize: '11px', color: textMuted }}>Status</div><div>{statusBadge(viewRow.status)}</div></div>
              <div><div style={{ fontSize: '11px', color: textMuted }}>Orders</div><div style={{ fontWeight: 600 }}>{viewRow.orders}</div></div>
            </div>
          </div>
        )}
        <ModalFooter onClose={() => setViewRow(null)} border={border} textMain={textMain} />
      </Modal>

      {/* ── Action Modals (Super Admin only) ─────────────────────────────────── */}
      {isSuperAdmin && selectedUser && (
        <>
          {/* Promote */}
          <Modal open={actionModal === 'promote'} onClose={() => setActionModal(null)} title="Promote User">
            <div style={{ marginBottom: '16px', padding: '12px', background: surface, borderRadius: '8px', border: `1px solid ${border}` }}>
              <div style={{ fontSize: '12px', color: textMuted, marginBottom: '4px' }}>Current Role</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: textMain }}>{selectedUser.role}</div>
            </div>
            <FormField label="New Role" value={actionForm.newRole} onChange={acfp('newRole')} options={['Manager', 'Admin', 'Super Admin']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <ModalFooter onClose={() => setActionModal(null)} onSubmit={handlePromote} loading={loading} submitLabel="Promote" border={border} textMain={textMain} />
          </Modal>

          {/* Demote */}
          <Modal open={actionModal === 'demote'} onClose={() => setActionModal(null)} title="Demote User">
            <div style={{ marginBottom: '16px', padding: '12px', background: surface, borderRadius: '8px', border: `1px solid ${border}` }}>
              <div style={{ fontSize: '12px', color: textMuted, marginBottom: '4px' }}>Current Role</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: textMain }}>{selectedUser.role}</div>
            </div>
            <FormField label="New Role" value={actionForm.newRole} onChange={acfp('newRole')} options={['Customer', 'Wholesale', 'Staff']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <ModalFooter onClose={() => setActionModal(null)} onSubmit={handleDemote} loading={loading} submitLabel="Demote" border={border} textMain={textMain} />
          </Modal>

          {/* Suspend */}
          <Modal open={actionModal === 'suspend'} onClose={() => setActionModal(null)} title="Suspend User">
            <div style={{ marginBottom: '12px', padding: '10px', background: surface, borderRadius: '8px', border: `1px solid ${border}` }}>
              <div style={{ fontSize: '12px', color: textMuted }}>Suspending: <strong style={{ color: textMain }}>{selectedUser.name}</strong></div>
            </div>
            <FormField label="Duration (hours) *" value={String(actionForm.durationHours)} onChange={v => acfp('durationHours')(v)} type="number" border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Reason (optional)" value={actionForm.reason} onChange={acfp('reason')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Why is this user being suspended?" />
            <ModalFooter onClose={() => setActionModal(null)} onSubmit={handleSuspend} loading={loading} submitLabel="Suspend User" border={border} textMain={textMain} />
          </Modal>

          {/* Restrict */}
          <Modal open={actionModal === 'restrict'} onClose={() => setActionModal(null)} title="Restrict User">
            <div style={{ marginBottom: '12px', padding: '10px', background: surface, borderRadius: '8px', border: `1px solid ${border}` }}>
              <div style={{ fontSize: '12px', color: textMuted }}>Restricting: <strong style={{ color: textMain }}>{selectedUser.name}</strong></div>
            </div>
            <FormField label="Duration (hours) *" value={String(actionForm.durationHours)} onChange={v => acfp('durationHours')(v)} type="number" border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Reason (optional)" value={actionForm.reason} onChange={acfp('reason')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Why is this user being restricted?" />
            <ModalFooter onClose={() => setActionModal(null)} onSubmit={handleRestrict} loading={loading} submitLabel="Restrict User" border={border} textMain={textMain} />
          </Modal>

          {/* Block */}
          <Modal open={actionModal === 'block'} onClose={() => setActionModal(null)} title="Block User">
            <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(185,28,28,0.06)', borderRadius: '8px', border: '1px solid rgba(185,28,28,0.2)' }}>
              <div style={{ fontSize: '12px', color: 'var(--danger)' }}>⚠️ Blocking <strong>{selectedUser.name}</strong> will permanently prevent them from accessing the system until unblocked.</div>
            </div>
            <FormField label="Reason (optional)" value={actionForm.reason} onChange={acfp('reason')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Why is this user being blocked?" />
            <ModalFooter onClose={() => setActionModal(null)} onSubmit={handleBlock} loading={loading} submitLabel="Block User" border={border} textMain={textMain} />
          </Modal>

          {/* Unblock */}
          <Modal open={actionModal === 'unblock'} onClose={() => setActionModal(null)} title="Unblock User">
            <div style={{ padding: '14px', background: 'rgba(34,197,94,0.06)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: textMain }}>Unblock <strong>{selectedUser.name}</strong>? They will regain full access to their account.</div>
            </div>
            <ModalFooter onClose={() => setActionModal(null)} onSubmit={handleUnblock} loading={loading} submitLabel="Unblock User" border={border} textMain={textMain} />
          </Modal>
        </>
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteRow}
        onClose={() => setDeleteRow(null)}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteRow?.name}? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}

// ─── Temp password generator ──────────────────────────────────────────────────

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%^&*';
  const all = upper + lower + digits + special;
  let pwd = '';
  // Guarantee at least one of each character class
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < 12; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  // Shuffle
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function UsersPage() {
  return <AdminShell><UsersContent /></AdminShell>;
}
