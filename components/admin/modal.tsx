'use client';
import React, { useRef, useEffect, useState } from 'react';
import { X, AlertTriangle, ChevronDown, Check } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';

// ── Custom Select (no native browser picker) ───────────────
interface CustomSelectProps {
  value: string;
  onChange?: (v: string) => void;
  options: string[];
  disabled?: boolean;
  isDark: boolean;
  border: string;
  textMain: string;
  textMuted: string;
  surface: string;
}

function CustomSelect({ value, onChange, options, disabled = false, isDark, border, textMain, textMuted, surface }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%', padding: '9px 36px 9px 12px', borderRadius: '8px',
          background: disabled ? (isDark ? '#080e1a' : '#F8FAFC') : surface,
          border: `1px solid ${open ? '#1FA89A' : border}`,
          color: disabled ? textMuted : textMain,
          fontSize: '13.5px', cursor: disabled ? 'default' : 'pointer',
          fontFamily: 'var(--font-inter)',
          userSelect: 'none',
          position: 'relative',
          display: 'flex', alignItems: 'center',
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <ChevronDown
          size={14}
          color={textMuted}
          style={{
            position: 'absolute', right: '10px', top: '50%',
            transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})`,
            transition: 'transform 0.15s', flexShrink: 0,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Dropdown list */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          zIndex: 99999,
          background: isDark ? '#0D1523' : '#FFFFFF',
          border: `1px solid ${border}`,
          borderRadius: '10px',
          boxShadow: isDark
            ? '0 12px 40px rgba(0,0,0,0.6)'
            : '0 8px 32px rgba(0,0,0,0.14)',
          overflow: 'hidden',
          maxHeight: '220px',
          overflowY: 'auto',
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange?.(opt); setOpen(false); }}
              style={{
                padding: '11px 14px',
                cursor: 'pointer',
                fontSize: '13.5px',
                color: opt === value ? '#1FA89A' : textMain,
                background: opt === value
                  ? (isDark ? 'rgba(31,168,154,0.12)' : 'rgba(31,168,154,0.07)')
                  : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontFamily: 'var(--font-inter)',
                borderBottom: `1px solid ${border}`,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => {
                if (opt !== value) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(31,168,154,0.05)';
              }}
              onMouseLeave={e => {
                if (opt !== value) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span>{opt}</span>
              {opt === value && <Check size={13} color="#1FA89A" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = '500px' }: ModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const bg = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';

  if (!open) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '16px', width: '100%', maxWidth, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 30px 60px rgba(0,0,0,0.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: `1px solid ${border}` }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: textMain, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '7px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={14} color={textMuted} />
          </button>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

// ── ConfirmDialog ──────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading = false }: ConfirmDialogProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const bg = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';

  if (!open) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '28px', boxShadow: '0 30px 60px rgba(0,0,0,0.45)' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <AlertTriangle size={22} color="#ef4444" />
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: textMain, margin: '0 0 8px' }}>{title}</h3>
        <p style={{ fontSize: '13.5px', color: textMuted, margin: '0 0 24px', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={loading} style={{ padding: '9px 18px', borderRadius: '9px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, color: textMain, fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: '9px 18px', borderRadius: '9px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', color: 'white', fontSize: '13.5px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-inter)' }}>
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FormField ──────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  options?: string[];
  readOnly?: boolean;
  isDark: boolean;
  border: string;
  textMain: string;
  textMuted: string;
  surface: string;
  placeholder?: string;
}

export function FormField({ label, value, onChange, type = 'text', options, readOnly = false, isDark, border, textMain, textMuted, surface, placeholder }: FormFieldProps) {
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    background: readOnly ? (isDark ? '#080e1a' : '#F8FAFC') : surface,
    border: `1px solid ${border}`,
    color: readOnly ? textMuted : textMain,
    fontSize: '13.5px', outline: 'none',
    fontFamily: 'var(--font-inter)',
    boxSizing: 'border-box',
  };
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</label>
      {options ? (
        // ✅ Custom dropdown — no native browser picker
        readOnly ? (
          <div style={{ ...inputStyle, cursor: 'default', display: 'flex', alignItems: 'center' }}>{value}</div>
        ) : (
          <CustomSelect
            value={value}
            onChange={onChange}
            options={options}
            disabled={readOnly}
            isDark={isDark}
            border={border}
            textMain={textMain}
            textMuted={textMuted}
            surface={surface}
          />
        )
      ) : type === 'textarea' ? (
        <textarea value={value} onChange={(e) => onChange?.(e.target.value)} readOnly={readOnly} rows={3} placeholder={placeholder} style={{ ...inputStyle, resize: 'vertical' }} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange?.(e.target.value)} readOnly={readOnly} placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  );
}

// ── ModalFooter ────────────────────────────────────────────
interface ModalFooterProps {
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
  isDark: boolean;
  border: string;
  textMain: string;
}

export function ModalFooter({ onClose, onSubmit, loading, submitLabel, isDark, border, textMain }: ModalFooterProps) {
  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px', paddingTop: '16px', borderTop: `1px solid ${border}` }}>
      <button onClick={onClose} disabled={loading} style={{ padding: '9px 18px', borderRadius: '9px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, color: textMain, fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>Cancel</button>
      <button onClick={onSubmit} disabled={loading} style={{ padding: '9px 18px', borderRadius: '9px', background: 'linear-gradient(135deg, #1FA89A, #27B9AF)', border: 'none', color: 'white', fontSize: '13.5px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'var(--font-inter)' }}>
        {loading ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}
