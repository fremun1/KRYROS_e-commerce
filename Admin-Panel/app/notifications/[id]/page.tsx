'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/admin-shell';
import PageHeader from '@/components/admin/page-header';
import { Bell, ArrowLeft, CheckCircle2, Loader2, Trash2, ExternalLink, Clock, User, Tag, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { getNotification, markNotificationRead, deleteNotification } from '@/lib/api';

type NotifDetail = {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  targetType?: string;
  channel?: string;
  data?: Record<string, unknown> | string;
  url?: string;
};

function NotificationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [notif, setNotif] = useState<NotifDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const card = 'var(--card)';
  const border = 'var(--border)';
  const textMain = 'var(--text-main)';
  const textMuted = 'var(--text-muted)';
  const surface = 'var(--surface)';
  const primary = 'var(--primary)';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getNotification(id)
      .then((res: any) => {
        const raw = res?.data?.data ?? res?.data ?? res;
        if (!raw || !raw.id) {
          toast.error('Notification not found');
          router.replace('/notifications');
          return;
        }
        // Normalise the data field
        let parsedData: Record<string, unknown> = {};
        try {
          parsedData = typeof raw.data === 'string' ? JSON.parse(raw.data) : (raw.data ?? {});
        } catch {}
        setNotif({
          id: raw.id,
          title: raw.title || raw.type || 'Notification',
          message: raw.message || raw.body || '',
          type: raw.type || parsedData?.type as string || '',
          isRead: raw.isRead ?? raw.read ?? false,
          createdAt: raw.createdAt || '',
          updatedAt: raw.updatedAt || '',
          userId: raw.userId || '',
          targetType: raw.targetType || '',
          channel: raw.channel || '',
          data: parsedData,
          url: (parsedData?.url as string) || '',
        });
        // Auto-mark as read when opened
        if (!raw.isRead) {
          markNotificationRead(raw.id).catch(() => {});
        }
      })
      .catch(() => {
        toast.error('Failed to load notification');
        router.replace('/notifications');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!notif) return;
    if (!confirm('Delete this notification?')) return;
    setDeleting(true);
    try {
      await deleteNotification(notif.id);
      toast.success('Notification deleted');
      router.replace('/notifications');
    } catch {
      toast.error('Failed to delete notification');
    } finally {
      setDeleting(false);
    }
  };

  const handleNavigate = () => {
    if (!notif?.url) return;
    router.push(notif.url);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loader2 style={{ width: 32, height: 32, color: primary, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!notif) return null;

  const dataEntries = notif.data && typeof notif.data === 'object'
    ? Object.entries(notif.data).filter(([k]) => k !== 'url')
    : [];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 40 }}>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, background: 'none', border: 'none', color: textMuted, fontSize: 13, cursor: 'pointer', padding: 0 }}
      >
        <ArrowLeft style={{ width: 15, height: 15 }} /> Back to Notifications
      </button>

      {/* Main card */}
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bell style={{ width: 20, height: 20, color: primary }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: textMain, lineHeight: 1.3 }}>{notif.title}</h2>
              {notif.type && (
                <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${primary}18`, color: primary, letterSpacing: 0.5 }}>
                  {notif.type}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {notif.url && (
              <button
                onClick={handleNavigate}
                title="Navigate to linked page"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: `${primary}18`, border: `1px solid ${primary}33`, color: primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                <ExternalLink style={{ width: 13, height: 13 }} /> Open Link
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete notification"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: 'var(--danger, #ef4444)18', border: '1px solid var(--danger, #ef4444)33', color: 'var(--danger, #ef4444)', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
            >
              {deleting ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <Trash2 style={{ width: 13, height: 13 }} />}
              Delete
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ margin: 0, fontSize: 15, color: textMain, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{notif.message}</p>
        </div>

        {/* Metadata grid */}
        <div style={{ padding: '0 24px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { icon: Clock, label: 'Sent at', value: notif.createdAt ? new Date(notif.createdAt).toLocaleString() : '—' },
            { icon: CheckCircle2, label: 'Status', value: notif.isRead ? 'Read' : 'Unread' },
            { icon: User, label: 'User ID', value: notif.userId || 'Broadcast' },
            { icon: Tag, label: 'Target type', value: notif.targetType || '—' },
            { icon: Globe, label: 'Channel', value: notif.channel || '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon style={{ width: 12, height: 12, color: textMuted }} />
                <span style={{ fontSize: 10, color: textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
              </div>
              <div style={{ fontSize: 13, color: textMain, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Deep link */}
        {notif.url && (
          <div style={{ padding: '0 24px 20px' }}>
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Deep Link URL</div>
              <code style={{ fontSize: 12, color: primary, wordBreak: 'break-all' }}>{notif.url}</code>
            </div>
          </div>
        )}

        {/* Extra data fields */}
        {dataEntries.length > 0 && (
          <div style={{ padding: '0 24px 20px' }}>
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: '14px' }}>
              <div style={{ fontSize: 10, color: textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Payload Data</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dataEntries.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                    <span style={{ color: textMuted, minWidth: 120, flexShrink: 0 }}>{k}</span>
                    <span style={{ color: textMain, wordBreak: 'break-all' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationDetailPage() {
  return (
    <AdminShell>
      <PageHeader title="Notification Detail" subtitle="View and manage this notification" icon={Bell} />
      <NotificationDetailContent />
    </AdminShell>
  );
}
