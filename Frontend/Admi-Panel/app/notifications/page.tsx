'use client';
import AdminShell from '@/components/admin/admin-shell';
import PageHeader from '@/components/admin/page-header';
import { useTheme } from '@/contexts/theme-context';
import { Bell, Send, Globe, Smartphone, Mail, Users, CheckCircle2, Loader2, Plus, Trash2, MessageSquare, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getNotifications, getNewsletterSubscribers, sendNewsletterEmail,
  getSmsContacts, addSmsContact, deleteSmsContact,
  getSmsCountries, addSmsCountry, toggleSmsCountry, deleteSmsCountry,
  getDevices, deleteDevice, sendToDevices,
  getEmailContacts, addEmailContact, deleteEmailContact, sendEmailBlast,
} from '@/lib/api';
import api from '@/lib/api';

type NotifRecord = { id:string; title:string; message:string; target:string; channel:string; sent:number; opened:number; date:string; status:string };
type SmsContact  = { id:string; phone:string; name?:string; source:string; isActive:boolean; createdAt:string };
type NLSubscriber   = { id: string; email: string; isActive: boolean; createdAt: string };
type SmsCountry     = { id: string; name: string; dialCode: string; isoCode: string; isActive: boolean; createdAt: string };
type EmailContact   = { id: string; email: string; name?: string; source: string; isActive: boolean; createdAt: string };

// ─── Shared theme hook ───────────────────────────────────────────────────────
function useColors() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return {
    isDark,
    card:      isDark ? '#0D1523' : '#FFFFFF',
    border:    isDark ? '#1E293B' : '#E2E8F0',
    textMain:  isDark ? '#FFFFFF' : '#0F172A',
    textMuted: isDark ? '#8E9AAF' : '#64748B',
    surface:   isDark ? '#101826' : '#F1F5F9',
    primary:   '#1FA89A',
  };
}

// ─── Push Tab ────────────────────────────────────────────────────────────────
function PushContent() {
  const { card, border, textMain, textMuted, surface, primary } = useColors();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  const loadDevices = () => {
    setLoading(true);
    getDevices()
      .then((r: any) => {
        const raw = Array.isArray(r.data) ? r.data : [];
        setDevices(raw);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDevices(); }, []);

  const filtered = devices.filter(d => {
    if (!search) return true;
    const email = d.user?.email || '';
    const name = `${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim();
    return email.toLowerCase().includes(search.toLowerCase()) ||
           name.toLowerCase().includes(search.toLowerCase()) ||
           d.platform.toLowerCase().includes(search.toLowerCase());
  });

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () => {
    if (selectAll) { setSelected([]); setSelectAll(false); }
    else { setSelected(filtered.map(d => d.id)); setSelectAll(true); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDevice(id);
      setDevices(prev => prev.filter(d => d.id !== id));
      setSelected(prev => prev.filter(x => x !== id));
      toast.success('Device removed');
    } catch { toast.error('Failed to remove device'); }
  };

  const handleSend = async () => {
    if (!pushTitle.trim() || !pushMessage.trim()) { toast.error('Title and message are required'); return; }
    setSending(true);
    try {
      if (selected.length > 0) {
        // Send to specific selected devices
        await sendToDevices({ deviceIds: selected, title: pushTitle.trim(), body: pushMessage.trim() });
        toast.success(`Push sent to ${selected.length} device${selected.length > 1 ? 's' : ''}`);
      } else {
        // Broadcast to all
        await api.post('/api/notifications/broadcast', { title: pushTitle.trim(), body: pushMessage.trim() });
        toast.success(`Push broadcast to all ${devices.length} devices`);
      }
      setPushTitle(''); setPushMessage(''); setSelected([]); setSelectAll(false);
    } catch {
      toast.error('Failed to send push notification');
    }
    setSending(false);
  };

  const platformColors: Record<string, string> = {
    android: '#22c55e', ios: '#3b82f6', web: '#f59e0b',
  };
  const platformLabel = (p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();

  const recipientLabel = selected.length > 0
    ? `${selected.length} selected device${selected.length > 1 ? 's' : ''}`
    : `All ${devices.length} registered devices`;

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${border}`, background: surface, color: textMain, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Devices', value: devices.length, color: primary },
          { label: 'Android', value: devices.filter(d => d.platform === 'android').length, color: '#22c55e' },
          { label: 'iOS / Web', value: devices.filter(d => d.platform !== 'android').length, color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="push-device-grid">
        {/* Device List */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: textMain, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Smartphone style={{ width: 15, height: 15, color: primary }} /> Registered Devices
            </span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${border}`, background: surface, color: textMain, fontSize: 11, outline: 'none', width: 130 }} />
          </div>

          {/* Select all row */}
          <div style={{ padding: '8px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10, background: surface }}>
            <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} style={{ accentColor: primary, width: 14, height: 14 }} />
            <span style={{ fontSize: 11, color: textMuted }}>{selectAll ? 'Deselect all' : `Select all (${filtered.length})`}</span>
            {selected.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 11, color: primary, fontWeight: 600 }}>{selected.length} selected</span>}
          </div>

          {/* Device rows */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: textMuted, fontSize: 12 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: textMuted, fontSize: 12 }}>
                {search ? 'No matching devices' : 'No registered devices yet — installs the app or PWA to register'}
              </div>
            ) : filtered.map(d => (
              <div key={d.id} style={{ padding: '10px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => toggleSelect(d.id)}>
                <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleSelect(d.id)} onClick={e => e.stopPropagation()} style={{ accentColor: primary, width: 14, height: 14, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.user?.email || d.user?.firstName ? `${d.user.firstName || ''} ${d.user.lastName || ''}`.trim() || d.user.email : 'Unknown user'}
                  </div>
                  {d.user?.email && <div style={{ fontSize: 10, color: textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.user.email}</div>}
                  <div style={{ fontSize: 10, color: textMuted }}>{new Date(d.createdAt).toLocaleDateString()}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${platformColors[d.platform] || '#888'}20`, color: platformColors[d.platform] || '#888', border: `1px solid ${platformColors[d.platform] || '#888'}44`, flexShrink: 0 }}>
                  {platformLabel(d.platform)}
                </span>
                <button onClick={e => { e.stopPropagation(); handleDelete(d.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ef4444', flexShrink: 0 }}>
                  <Trash2 style={{ width: 13, height: 13 }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Compose Push */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell style={{ width: 15, height: 15, color: primary }} />
            <span style={{ fontWeight: 700, color: textMain, fontSize: 14 }}>Compose Push</span>
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Recipient indicator */}
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', fontSize: 11, color: textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 style={{ width: 12, height: 12, color: primary }} />
              Sending to: <strong style={{ color: textMain }}>{recipientLabel}</strong>
            </div>

            {/* Title */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: textMuted, display: 'block', marginBottom: 5 }}>Title *</label>
              <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="e.g. New Arrivals — Just for You!" style={inputStyle} />
            </div>

            {/* Message */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: textMuted, display: 'block', marginBottom: 5 }}>Message *</label>
              <textarea value={pushMessage} onChange={e => setPushMessage(e.target.value)} placeholder="Write your push notification message here..." rows={6} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, display: 'block' }} />
            </div>

            {/* Send Button */}
            <button onClick={handleSend} disabled={sending || !pushTitle.trim() || !pushMessage.trim()} style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: (!sending && pushTitle.trim() && pushMessage.trim()) ? 'linear-gradient(135deg,#1FA89A,#27B9AF)' : border, color: '#fff', fontWeight: 700, fontSize: 13, cursor: sending ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!pushTitle.trim() || !pushMessage.trim()) ? 0.5 : 1 }}>
              {sending ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Sending...</> : <><Send style={{ width: 13, height: 13 }} /> Send Push</>}
            </button>

            <p style={{ fontSize: 10, color: textMuted, textAlign: 'center' }}>
              {selected.length === 0 ? `Will broadcast to all ${devices.length} registered devices` : `Will send to ${selected.length} selected device${selected.length > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media(max-width:700px){.push-device-grid{grid-template-columns:1fr!important;}}
      `}</style>
    </div>
  );
}

// ─── SMS Tab ─────────────────────────────────────────────────────────────────
// ─── SMS Countries Section ───────────────────────────────────────────────────
function SmsCountriesSection() {
  const { card, border, textMain, textMuted, surface, primary } = useColors();
  const [countries, setCountries]   = useState<SmsCountry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [newName, setNewName]       = useState('');
  const [newDial, setNewDial]       = useState('');
  const [newIso,  setNewIso]        = useState('');
  const [saving,  setSaving]        = useState(false);

  const load = () => {
    setLoading(true);
    getSmsCountries()
      .then((r: any) => setCountries(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleSmsCountry(id, !current);
      setCountries(prev => prev.map(c => c.id === id ? { ...c, isActive: !current } : c));
    } catch { toast.error('Could not update country'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSmsCountry(id);
      setCountries(prev => prev.filter(c => c.id !== id));
      toast.success('Country removed');
    } catch { toast.error('Could not remove country'); }
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newDial.trim() || !newIso.trim()) { toast.error('All fields are required'); return; }
    setSaving(true);
    try {
      await addSmsCountry({ name: newName.trim(), dialCode: newDial.trim().replace(/\D/g,''), isoCode: newIso.trim().toUpperCase() });
      toast.success('Country added');
      setNewName(''); setNewDial(''); setNewIso(''); setShowAdd(false);
      load();
    } catch { toast.error('Could not add country — dial code may already exist'); }
    finally { setSaving(false); }
  };

  const flagEmoji = (iso: string) => {
    try {
      return iso.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
    } catch { return '🌍'; }
  };

  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginTop: 20 }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontWeight: 700, color: textMain, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Globe style={{ width: 15, height: 15, color: primary }} /> SMS Supported Countries
        </span>
        <button
          onClick={() => setShowAdd(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, background: showAdd ? surface : primary, color: showAdd ? textMuted : '#fff', border: `1px solid ${showAdd ? border : primary}`, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
        >
          {showAdd ? <><X style={{ width: 12, height: 12 }} /> Cancel</> : <><Plus style={{ width: 12, height: 12 }} /> Add Country</>}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, background: surface, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: textMuted, marginBottom: 4 }}>Country Name</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Nigeria" style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${border}`, background: card, color: textMain, fontSize: 12, outline: 'none', boxSizing: 'border-box' as const }} />
          </div>
          <div style={{ flex: 1, minWidth: 90 }}>
            <div style={{ fontSize: 11, color: textMuted, marginBottom: 4 }}>Dial Code (no +)</div>
            <input value={newDial} onChange={e => setNewDial(e.target.value)} placeholder="e.g. 234" style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${border}`, background: card, color: textMain, fontSize: 12, outline: 'none', boxSizing: 'border-box' as const }} />
          </div>
          <div style={{ flex: 1, minWidth: 80 }}>
            <div style={{ fontSize: 11, color: textMuted, marginBottom: 4 }}>ISO Code</div>
            <input value={newIso} onChange={e => setNewIso(e.target.value)} placeholder="e.g. NG" maxLength={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${border}`, background: card, color: textMain, fontSize: 12, outline: 'none', boxSizing: 'border-box' as const, textTransform: 'uppercase' }} />
          </div>
          <button
            onClick={handleAdd} disabled={saving}
            style={{ padding: '8px 16px', borderRadius: 7, background: primary, color: '#fff', border: 'none', fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1, whiteSpace: 'nowrap' }}
          >
            {saving ? 'Saving...' : 'Save Country'}
          </button>
        </div>
      )}

      {/* Country list */}
      <div>
        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: textMuted, fontSize: 12 }}>Loading...</div>
        ) : countries.length === 0 ? (
          <div style={{ padding: '24px 18px', textAlign: 'center', color: textMuted, fontSize: 12 }}>
            No countries configured yet — SMS will be skipped for all orders. Add Zambia (+260) to get started.
          </div>
        ) : countries.map(c => (
          <div key={c.id} style={{ padding: '12px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>{flagEmoji(c.isoCode)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: textMain, fontSize: 13 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: textMuted }}>+{c.dialCode} &middot; {c.isoCode.toUpperCase()}</div>
            </div>
            {/* Active toggle */}
            <div
              onClick={() => handleToggle(c.id, c.isActive)}
              style={{ width: 36, height: 20, borderRadius: 10, background: c.isActive ? primary : border, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <div style={{ position: 'absolute', top: 3, left: c.isActive ? 18 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 11, color: c.isActive ? '#22c55e' : textMuted, fontWeight: 600, minWidth: 46 }}>{c.isActive ? 'Active' : 'Off'}</span>
            <button
              onClick={() => handleDelete(c.id)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, borderRadius: 5, display: 'flex', alignItems: 'center' }}
              title="Remove country"
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 18px', borderTop: countries.length > 0 ? `1px solid ${border}` : undefined }}>
        <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>
          SMS is only delivered to phone numbers matching an <strong style={{ color: textMain }}>active</strong> country dial code. Non-matching numbers are silently skipped — no errors, no charges.
        </p>
      </div>
    </div>
  );
}

function SmsContent() {
  const { card, border, textMain, textMuted, surface, primary } = useColors();
  const [contacts, setContacts] = useState<SmsContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  // Add contact modal
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [adding, setAdding] = useState(false);

  const loadContacts = () => {
    setLoading(true);
    getSmsContacts()
      .then((r: any) => {
        const raw = Array.isArray(r.data) ? r.data : [];
        setContacts(raw);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadContacts(); }, []);

  const filtered = contacts.filter(c =>
    !search || c.phone.includes(search) || (c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () => {
    if (selectAll) { setSelected([]); setSelectAll(false); }
    else { setSelected(filtered.map(c => c.id)); setSelectAll(true); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSmsContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      setSelected(prev => prev.filter(x => x !== id));
      toast.success('Contact removed');
    } catch { toast.error('Failed to remove contact'); }
  };

  const handleAddContact = async () => {
    if (!newPhone.trim()) { toast.error('Phone number is required'); return; }
    setAdding(true);
    try {
      await addSmsContact({ phone: newPhone.trim(), name: newName.trim() || undefined, source: 'Manual' });
      toast.success('Contact added');
      setNewName(''); setNewPhone(''); setShowAdd(false);
      loadContacts();
    } catch { toast.error('Failed to add contact'); }
    finally { setAdding(false); }
  };

  const handleSendSms = async () => {
    if (!smsMessage.trim()) { toast.error('Message is required'); return; }
    const targets = selected.length > 0
      ? contacts.filter(c => selected.includes(c.id))
      : contacts.filter(c => c.isActive);
    if (targets.length === 0) { toast.error('No contacts to send to'); return; }
    setSending(true);
    let sent = 0;
    for (const t of targets) {
      try {
        await api.post('/api/notifications/sms/send', { phoneNumber: t.phone, message: smsMessage });
        sent++;
      } catch {}
    }
    toast.success(`SMS sent to ${sent}/${targets.length} contacts`);
    setSmsMessage(''); setSelected([]); setSelectAll(false);
    setSending(false);
  };

  const sourceColors: Record<string, string> = {
    Checkout: '#22c55e', Manual: '#3b82f6', WhatsApp: '#25D366',
  };

  const inputStyle = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${border}`, background:surface, color:textMain, fontSize:13, outline:'none', boxSizing:'border-box' as const, fontFamily:'inherit' };
  const recipientLabel = selected.length > 0
    ? `${selected.length} selected contact${selected.length > 1 ? 's' : ''}`
    : `All ${contacts.filter(c=>c.isActive).length} active contacts`;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label: 'Total Contacts', value: contacts.length, color: primary },
          { label: 'From Checkout', value: contacts.filter(c=>c.source==='Checkout').length, color: '#22c55e' },
          { label: 'Manual', value: contacts.filter(c=>c.source==='Manual').length, color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }} className="sms-grid">
        {/* Contact List */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontWeight:700, color:textMain, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
              <Smartphone style={{ width:15, height:15, color:primary }} /> Contacts
            </span>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${border}`, background:surface, color:textMain, fontSize:11, outline:'none', width:120 }} />
              <button onClick={()=>setShowAdd(true)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:6, background:'linear-gradient(135deg,#1FA89A,#27B9AF)', border:'none', color:'white', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                <Plus style={{ width:12, height:12 }} /> Add
              </button>
            </div>
          </div>

          {/* Select all */}
          <div style={{ padding:'8px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:10, background:surface }}>
            <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} style={{ accentColor:primary, width:14, height:14 }} />
            <span style={{ fontSize:11, color:textMuted }}>{selectAll ? 'Deselect all' : `Select all (${filtered.length})`}</span>
            {selected.length > 0 && <span style={{ marginLeft:'auto', fontSize:11, color:primary, fontWeight:600 }}>{selected.length} selected</span>}
          </div>

          {/* Contact rows */}
          <div style={{ maxHeight:360, overflowY:'auto' }}>
            {loading ? (
              <div style={{ padding:'32px 0', textAlign:'center', color:textMuted, fontSize:12 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:'32px 0', textAlign:'center', color:textMuted, fontSize:12 }}>
                {search ? 'No matching contacts' : 'No contacts yet — add one or wait for checkout registrations'}
              </div>
            ) : filtered.map(c => (
              <div key={c.id} style={{ padding:'10px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={()=>toggleSelect(c.id)}>
                <input type="checkbox" checked={selected.includes(c.id)} onChange={()=>toggleSelect(c.id)} onClick={e=>e.stopPropagation()} style={{ accentColor:primary, width:14, height:14, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:textMain }}>{c.name || c.phone}</div>
                  {c.name && <div style={{ fontSize:10, color:textMuted }}>{c.phone}</div>}
                  <div style={{ fontSize:10, color:textMuted }}>{new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${sourceColors[c.source] || '#888'}20`, color: sourceColors[c.source] || '#888', border:`1px solid ${sourceColors[c.source] || '#888'}44`, flexShrink:0 }}>
                  {c.source}
                </span>
                <button onClick={e=>{ e.stopPropagation(); handleDelete(c.id); }} style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:'#ef4444', flexShrink:0 }}>
                  <Trash2 style={{ width:13, height:13 }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Compose SMS */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:8 }}>
            <MessageSquare style={{ width:15, height:15, color:primary }} />
            <span style={{ fontWeight:700, color:textMain, fontSize:14 }}>Compose SMS</span>
          </div>
          <div style={{ padding:18, display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:surface, border:`1px solid ${border}`, borderRadius:8, padding:'8px 12px', fontSize:11, color:textMuted, display:'flex', alignItems:'center', gap:6 }}>
              <CheckCircle2 style={{ width:12, height:12, color:primary }} />
              Sending to: <strong style={{ color:textMain }}>{recipientLabel}</strong>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:textMuted, display:'block', marginBottom:5 }}>Message *</label>
              <textarea value={smsMessage} onChange={e=>setSmsMessage(e.target.value)} placeholder="Write your SMS message here..." rows={6} style={{ ...inputStyle, resize:'vertical', lineHeight:1.6, display:'block' }} />
              <div style={{ fontSize:10, color:textMuted, marginTop:4 }}>{smsMessage.length} / 160 chars (1 SMS)</div>
            </div>
            <button onClick={handleSendSms} disabled={sending || !smsMessage.trim()} style={{ width:'100%', padding:'11px', borderRadius:8, border:'none', background:(!sending && smsMessage.trim()) ? 'linear-gradient(135deg,#1FA89A,#27B9AF)' : border, color:'#fff', fontWeight:700, fontSize:13, cursor:sending?'wait':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:!smsMessage.trim()?0.5:1 }}>
              {sending ? <><Loader2 style={{ width:14, height:14, animation:'spin 1s linear infinite' }} /> Sending...</> : <><Send style={{ width:13, height:13 }} /> Send SMS</>}
            </button>
            <p style={{ fontSize:10, color:textMuted, textAlign:'center' }}>
              {selected.length === 0 ? `Will send to all ${contacts.filter(c=>c.isActive).length} active contacts` : `Will send to ${selected.length} selected contact${selected.length>1?'s':''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={()=>setShowAdd(false)}>
          <div style={{ background:card, border:`1px solid ${border}`, borderRadius:14, padding:24, width:'100%', maxWidth:360 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <span style={{ fontWeight:700, color:textMain, fontSize:15 }}>Add SMS Contact</span>
              <button onClick={()=>setShowAdd(false)} style={{ background:'none', border:'none', cursor:'pointer', color:textMuted }}><X size={18} /></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:textMuted, display:'block', marginBottom:5 }}>Name (optional)</label>
                <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. John Banda" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:textMuted, display:'block', marginBottom:5 }}>Phone Number *</label>
                <input value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="+260 97X XXX XXX" type="tel" style={inputStyle} />
              </div>
              <button onClick={handleAddContact} disabled={adding || !newPhone.trim()} style={{ width:'100%', padding:'11px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#1FA89A,#27B9AF)', color:'#fff', fontWeight:700, fontSize:13, cursor:adding?'wait':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                {adding ? <><Loader2 style={{ width:14, height:14, animation:'spin 1s linear infinite' }} /> Adding...</> : <><Plus style={{ width:13, height:13 }} /> Add Contact</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Supported Countries Management */}
      <SmsCountriesSection />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 700px) { .sms-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

// ─── Newsletter Tab ───────────────────────────────────────────────────────────
function NewsletterContent() {
  const { card, border, textMain, textMuted, surface, primary } = useColors();
  const [subscribers, setSubscribers] = useState<NLSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    getNewsletterSubscribers()
      .then((r: any) => { setSubscribers(Array.isArray(r.data) ? r.data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = subscribers.filter(s => !searchQuery || s.email.toLowerCase().includes(searchQuery.toLowerCase()));
  const active = subscribers.filter(s => s.isActive);

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => {
    if (selectAll) { setSelected([]); setSelectAll(false); }
    else { setSelected(filtered.map(s => s.id)); setSelectAll(true); }
  };

  const handleSend = async () => {
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!body.trim()) { toast.error('Message body is required'); return; }
    let emailsToSend: string[] = [];
    if (selected.length > 0) emailsToSend = subscribers.filter(s => selected.includes(s.id) && s.isActive).map(s => s.email);
    setSending(true);
    try {
      const res: any = await sendNewsletterEmail({ subject: subject.trim(), body: body.trim(), emails: emailsToSend });
      const result = res.data;
      toast.success(`Newsletter sent! ${result?.sent ?? 0} delivered${result?.failed ? `, ${result.failed} failed` : ''}`);
      setSubject(''); setBody(''); setSelected([]); setSelectAll(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send newsletter');
    } finally { setSending(false); }
  };

  const recipientLabel = selected.length > 0 ? `${selected.length} selected subscriber${selected.length > 1 ? 's' : ''}` : `All ${active.length} active subscribers`;

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label: 'Total Subscribers', value: subscribers.length, color: primary },
          { label: 'Active', value: active.length, color: '#22c55e' },
          { label: 'Unsubscribed', value: subscribers.length - active.length, color: '#ef4444' },
        ].map(stat => (
          <div key={stat.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }} className="nl-grid">
        {/* Subscriber List */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
            <span style={{ fontWeight:700, color:textMain, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
              <Users style={{ width:15, height:15, color:primary }} /> Subscribers
            </span>
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search email..." style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${border}`, background:surface, color:textMain, fontSize:11, outline:'none', width:150 }} />
          </div>
          <div style={{ padding:'8px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:10, background:surface }}>
            <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} style={{ accentColor:primary, width:14, height:14 }} />
            <span style={{ fontSize:11, color:textMuted }}>{selectAll ? 'Deselect all' : `Select all (${filtered.length})`}</span>
            {selected.length > 0 && <span style={{ marginLeft:'auto', fontSize:11, color:primary, fontWeight:600 }}>{selected.length} selected</span>}
          </div>
          <div style={{ maxHeight:340, overflowY:'auto' }}>
            {loading ? <div style={{ padding:'32px 0', textAlign:'center', color:textMuted, fontSize:12 }}>Loading...</div>
            : filtered.length === 0 ? <div style={{ padding:'32px 0', textAlign:'center', color:textMuted, fontSize:12 }}>No subscribers yet</div>
            : filtered.map(sub => (
              <div key={sub.id} style={{ padding:'10px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={()=>toggleSelect(sub.id)}>
                <input type="checkbox" checked={selected.includes(sub.id)} onChange={()=>toggleSelect(sub.id)} onClick={e=>e.stopPropagation()} style={{ accentColor:primary, width:14, height:14, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:textMain, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub.email}</div>
                  <div style={{ fontSize:10, color:textMuted }}>{new Date(sub.createdAt).toLocaleDateString()}</div>
                </div>
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:sub.isActive?'#22c55e22':'#ef444422', color:sub.isActive?'#16a34a':'#dc2626', border:`1px solid ${sub.isActive?'#22c55e44':'#ef444444'}`, flexShrink:0 }}>
                  {sub.isActive ? 'Active' : 'Off'}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Compose Newsletter */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:8 }}>
            <Mail style={{ width:15, height:15, color:primary }} />
            <span style={{ fontWeight:700, color:textMain, fontSize:14 }}>Compose Newsletter</span>
          </div>
          <div style={{ padding:18, display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:surface, border:`1px solid ${border}`, borderRadius:8, padding:'8px 12px', fontSize:11, color:textMuted, display:'flex', alignItems:'center', gap:6 }}>
              <CheckCircle2 style={{ width:12, height:12, color:primary }} />
              Sending to: <strong style={{ color:textMain }}>{recipientLabel}</strong>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:textMuted, display:'block', marginBottom:5 }}>Subject *</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Exclusive Weekend Sale — Up to 40% Off!" style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${border}`, background:surface, color:textMain, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:textMuted, display:'block', marginBottom:5 }}>Message *</label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Write your newsletter message here..." rows={7} style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${border}`, background:surface, color:textMain, fontSize:12, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit', lineHeight:1.6 }} />
            </div>
            <button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()} style={{ width:'100%', padding:'11px', borderRadius:8, border:'none', background:(!sending && subject.trim() && body.trim())?'linear-gradient(135deg,#1FA89A,#27B9AF)':border, color:'#fff', fontWeight:700, fontSize:13, cursor:sending?'wait':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:(!subject.trim()||!body.trim())?0.5:1 }}>
              {sending ? <><Loader2 style={{ width:14, height:14, animation:'spin 1s linear infinite' }} /> Sending...</> : <><Send style={{ width:13, height:13 }} /> Send Newsletter</>}
            </button>
            <p style={{ fontSize:10, color:textMuted, textAlign:'center' }}>
              {selected.length === 0 ? `Will send to all ${active.length} active subscribers` : `Will send to ${selected.length} selected subscriber${selected.length>1?'s':''}`}
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media(max-width:700px){.nl-grid{grid-template-columns:1fr!important;}}
      `}</style>
    </div>
  );
}


// ─── Email Contacts Tab ───────────────────────────────────────────────────────
function EmailContent() {
  const { card, border, textMain, textMuted, surface, primary } = useColors();
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const loadContacts = () => {
    setLoading(true);
    getEmailContacts()
      .then((r: any) => { const raw = Array.isArray(r.data) ? r.data : []; setContacts(raw); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadContacts(); }, []);

  const filtered = contacts.filter(c =>
    !search || c.email.toLowerCase().includes(search.toLowerCase()) || (c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () => {
    if (selectAll) { setSelected([]); setSelectAll(false); }
    else { setSelected(filtered.map(c => c.id)); setSelectAll(true); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEmailContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      setSelected(prev => prev.filter(x => x !== id));
      toast.success('Contact removed');
    } catch { toast.error('Failed to remove contact'); }
  };

  const handleAddContact = async () => {
    if (!newEmail.trim()) { toast.error('Email address is required'); return; }
    setAdding(true);
    try {
      await addEmailContact({ email: newEmail.trim(), name: newName.trim() || undefined, source: 'Manual' });
      toast.success('Contact added');
      setNewName(''); setNewEmail(''); setShowAdd(false);
      loadContacts();
    } catch { toast.error('Failed to add contact — email may already exist'); }
    finally { setAdding(false); }
  };

  const handleSendBlast = async () => {
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!emailBody.trim()) { toast.error('Message body is required'); return; }
    setSending(true);
    try {
      const emailIds = selected.length > 0 ? selected : undefined;
      const res: any = await sendEmailBlast({ subject: subject.trim(), body: emailBody.trim(), emailIds });
      if (res.data?.success) {
        toast.success(`Email sent to ${res.data.sent}/${res.data.total} contacts`);
        setSubject(''); setEmailBody(''); setSelected([]); setSelectAll(false);
      } else {
        toast.error(res.data?.message || 'Failed to send emails');
      }
    } catch { toast.error('Failed to send email blast'); }
    finally { setSending(false); }
  };

  const sourceColors: Record<string, string> = { Checkout: '#22c55e', Manual: '#3b82f6', Import: '#f59e0b' };
  const inputStyle = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${border}`, background:surface, color:textMain, fontSize:13, outline:'none', boxSizing:'border-box' as const, fontFamily:'inherit' };
  const recipientLabel = selected.length > 0
    ? `${selected.length} selected contact${selected.length > 1 ? 's' : ''}`
    : `All ${contacts.filter(c=>c.isActive).length} active contacts`;

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label: 'Total Contacts', value: contacts.length, color: primary },
          { label: 'From Checkout', value: contacts.filter(c=>c.source==='Checkout').length, color: '#22c55e' },
          { label: 'Manual', value: contacts.filter(c=>c.source==='Manual').length, color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }} className="email-grid">
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontWeight:700, color:textMain, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
              <Mail style={{ width:15, height:15, color:primary }} /> Email Contacts
            </span>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${border}`, background:surface, color:textMain, fontSize:11, outline:'none', width:120 }} />
              <button onClick={()=>setShowAdd(true)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:6, background:'linear-gradient(135deg,#1FA89A,#27B9AF)', border:'none', color:'white', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                <Plus style={{ width:12, height:12 }} /> Add
              </button>
            </div>
          </div>
          <div style={{ padding:'8px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:10, background:surface }}>
            <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} style={{ accentColor:primary, width:14, height:14 }} />
            <span style={{ fontSize:11, color:textMuted }}>{selectAll ? 'Deselect all' : `Select all (${filtered.length})`}</span>
            {selected.length > 0 && <span style={{ marginLeft:'auto', fontSize:11, color:primary, fontWeight:600 }}>{selected.length} selected</span>}
          </div>
          <div style={{ maxHeight:360, overflowY:'auto' }}>
            {loading ? (
              <div style={{ padding:'32px 0', textAlign:'center', color:textMuted, fontSize:12 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:'32px 0', textAlign:'center', color:textMuted, fontSize:12 }}>
                {search ? 'No matching contacts' : 'No email contacts yet — add one or they auto-register on checkout'}
              </div>
            ) : filtered.map(c => (
              <div key={c.id} style={{ padding:'10px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={()=>toggleSelect(c.id)}>
                <input type="checkbox" checked={selected.includes(c.id)} onChange={()=>toggleSelect(c.id)} onClick={e=>e.stopPropagation()} style={{ accentColor:primary, width:14, height:14, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:textMain, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name || c.email}</div>
                  {c.name && <div style={{ fontSize:10, color:textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.email}</div>}
                  <div style={{ fontSize:10, color:textMuted }}>{new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${sourceColors[c.source] || '#888'}20`, color: sourceColors[c.source] || '#888', border:`1px solid ${sourceColors[c.source] || '#888'}44`, flexShrink:0 }}>
                  {c.source}
                </span>
                <button onClick={e=>{ e.stopPropagation(); handleDelete(c.id); }} style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:'#ef4444', flexShrink:0 }}>
                  <Trash2 style={{ width:13, height:13 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:8 }}>
            <Send style={{ width:15, height:15, color:primary }} />
            <span style={{ fontWeight:700, color:textMain, fontSize:14 }}>Compose Email Blast</span>
          </div>
          <div style={{ padding:18, display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:surface, border:`1px solid ${border}`, borderRadius:8, padding:'8px 12px', fontSize:11, color:textMuted, display:'flex', alignItems:'center', gap:6 }}>
              <CheckCircle2 style={{ width:12, height:12, color:primary }} />
              Sending to: <strong style={{ color:textMain }}>{recipientLabel}</strong>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:textMuted, display:'block', marginBottom:5 }}>Subject *</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Exclusive Weekend Sale — Up to 40% Off!" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:textMuted, display:'block', marginBottom:5 }}>Message *</label>
              <textarea value={emailBody} onChange={e=>setEmailBody(e.target.value)} placeholder="Write your email message here..." rows={7} style={{ ...inputStyle, resize:'vertical', lineHeight:1.6, display:'block' }} />
            </div>
            <button onClick={handleSendBlast} disabled={sending || !subject.trim() || !emailBody.trim()} style={{ width:'100%', padding:'11px', borderRadius:8, border:'none', background:(!sending && subject.trim() && emailBody.trim())?'linear-gradient(135deg,#1FA89A,#27B9AF)':border, color:'#fff', fontWeight:700, fontSize:13, cursor:sending?'wait':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:(!subject.trim()||!emailBody.trim())?0.5:1 }}>
              {sending ? <><Loader2 style={{ width:14, height:14, animation:'spin 1s linear infinite' }} /> Sending...</> : <><Send style={{ width:13, height:13 }} /> Send Email Blast</>}
            </button>
            <p style={{ fontSize:10, color:textMuted, textAlign:'center' }}>
              {selected.length === 0 ? `Will send to all ${contacts.filter(c=>c.isActive).length} active contacts` : `Will send to ${selected.length} selected contact${selected.length>1?'s':''}`}
            </p>
          </div>
        </div>
      </div>
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={()=>setShowAdd(false)}>
          <div style={{ background:card, border:`1px solid ${border}`, borderRadius:14, padding:24, width:'100%', maxWidth:360 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <span style={{ fontWeight:700, color:textMain, fontSize:15 }}>Add Email Contact</span>
              <button onClick={()=>setShowAdd(false)} style={{ background:'none', border:'none', cursor:'pointer', color:textMuted }}><X size={18} /></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:textMuted, display:'block', marginBottom:5 }}>Name (optional)</label>
                <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. John Banda" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:textMuted, display:'block', marginBottom:5 }}>Email Address *</label>
                <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="john@example.com" type="email" style={inputStyle} />
              </div>
              <button onClick={handleAddContact} disabled={adding || !newEmail.trim()} style={{ width:'100%', padding:'11px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#1FA89A,#27B9AF)', color:'#fff', fontWeight:700, fontSize:13, cursor:adding?'wait':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                {adding ? <><Loader2 style={{ width:14, height:14, animation:'spin 1s linear infinite' }} /> Adding...</> : <><Plus style={{ width:13, height:13 }} /> Add Contact</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 700px) { .email-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [activeSection, setActiveSection] = useState<'push' | 'sms' | 'newsletter' | 'email'>('push');
  const { card, border, textMuted, surface } = useColors();

  const tabs = [
    { id: 'push',       label: 'Push & Alerts', Icon: Bell },
    { id: 'sms',        label: 'SMS',           Icon: Smartphone },
    { id: 'newsletter', label: 'Newsletter',     Icon: Mail },
    { id: 'email',      label: 'Email Contacts', Icon: Send },
  ] as const;

  return (
    <AdminShell>
      <PageHeader title="Notifications" subtitle="Manage push, SMS, and newsletter campaigns" icon={Bell} />
      <div style={{ display:'flex', gap:4, marginBottom:24, background:surface, padding:4, borderRadius:10, border:`1px solid ${border}`, width:'fit-content', flexWrap:'wrap' }}>
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActiveSection(id)} style={{ padding:'7px 18px', borderRadius:7, border:'none', fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6, background: activeSection === id ? '#1FA89A' : 'transparent', color: activeSection === id ? '#fff' : textMuted, transition:'all 0.15s' }}>
            <Icon style={{ width:14, height:14 }} />
            {label}
          </button>
        ))}
      </div>
      {activeSection === 'push'       && <PushContent />}
      {activeSection === 'sms'        && <SmsContent />}
      {activeSection === 'newsletter' && <NewsletterContent />}
      {activeSection === 'email'      && <EmailContent />}
    </AdminShell>
  );
}
