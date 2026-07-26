'use client';
import { LucideIcon, Plus } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onAdd?: () => void;
  addLabel?: string;
  extra?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, icon: Icon, onAdd, addLabel = 'Add New', extra }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {Icon && (
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(192,21,27,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} color="var(--primary)" />
          </div>
        )}
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {extra}
        {onAdd && (
          <button onClick={onAdd} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--btn-primary)',
            border: 'none', borderRadius: '9px',
            color: 'var(--text-white)', fontSize: '13.5px', fontWeight: 600,
            padding: '9px 16px', cursor: 'pointer',
            boxShadow: '0 4px 12px var(--shadow)',
            fontFamily: 'var(--font-inter)',
          }}>
            <Plus size={15} />{addLabel}
          </button>
        )}
      </div>
    </div>
  );
}
