'use client';
import { useTheme } from '@/contexts/theme-context';
import { LucideIcon, Plus, Download, Upload } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onAdd?: () => void;
  addLabel?: string;
  extra?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, icon: Icon, onAdd, addLabel = 'Add New', extra }: PageHeaderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {Icon && (
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(31,168,154,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} color="#1FA89A" />
          </div>
        )}
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: textMain, margin: 0 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: '13px', color: textMuted, margin: 0 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {extra}
        {onAdd && (
          <button onClick={onAdd} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, #1FA89A, #27B9AF)',
            border: 'none', borderRadius: '9px',
            color: 'white', fontSize: '13.5px', fontWeight: 600,
            padding: '9px 16px', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(31,168,154,0.25)',
            fontFamily: 'var(--font-inter)',
          }}>
            <Plus size={15} />{addLabel}
          </button>
        )}
      </div>
    </div>
  );
}

