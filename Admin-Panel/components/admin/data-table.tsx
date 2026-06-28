'use client';
import { useState } from 'react';
import { useTheme } from '@/contexts/theme-context';
import { Search, ChevronLeft, ChevronRight, Edit, Trash2, Eye } from 'lucide-react';

export interface Column {
  key: string;
  label: string;
  render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode;
  width?: string;
}

function looksLikeInternalId(value: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ||
    (value.length > 18 && /[a-z0-9-]{12,}/i.test(value))
  );
}

function formatInternalId(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return '-';
  if (!looksLikeInternalId(text)) return text;

  const clean = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!clean) return text;
  return `ID-${clean.slice(-6)}`;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  searchPlaceholder?: string;
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
  onView?: (row: Record<string, unknown>) => void;
  pageSize?: number;
  filterNode?: React.ReactNode;
  actionNode?: React.ReactNode;
}

export default function DataTable({
  columns, data, searchPlaceholder = 'Search...', onEdit, onDelete, onView, pageSize = 10, filterNode, actionNode
}: DataTableProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  // Use CSS variables — always in sync with globals.css (dark/light handled by .dark class)
  const card    = 'var(--card)';
  const border  = 'var(--border)';
  const textMain  = 'var(--text-main)';
  const textMuted = 'var(--text-muted)';
  const surface = 'var(--surface)';
  const rowHover = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(31,168,154,0.04)';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = data.filter((row) =>
    Object.values(row).some((v) => String(v).toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const hasActions = onEdit || onDelete || onView;

  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: `1px solid ${border}`, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: surface, border: `1px solid ${border}`, borderRadius: '9px', padding: '0 12px', height: '36px', flex: '1 1 200px', maxWidth: '320px' }}>
          <Search size={14} color={textMuted} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={searchPlaceholder}
            style={{ background: 'none', border: 'none', outline: 'none', color: textMain, fontSize: '13.5px', width: '100%', fontFamily: 'var(--font-inter)' }}
          />
        </div>
        {filterNode}
        {actionNode && <div style={{ marginLeft: 'auto' }}>{actionNode}</div>}
        <div style={{ marginLeft: 'auto', fontSize: '12.5px', color: textMuted }}>
          {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
          <thead>
            <tr style={{ background: surface }}>
              {columns.map((col) => (
                <th key={col.key} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11.5px', fontWeight: 700, color: textMuted, letterSpacing: '0.4px', textTransform: 'uppercase', whiteSpace: 'nowrap', width: col.width }}>
                  {col.label}
                </th>
              ))}
              {hasActions && <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11.5px', fontWeight: 700, color: textMuted, letterSpacing: '0.4px', textTransform: 'uppercase' }}>ACTIONS</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length + (hasActions ? 1 : 0)} style={{ padding: '40px', textAlign: 'center', color: textMuted, fontSize: '14px' }}>No results found</td></tr>
            ) : paginated.map((row, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${border}`, transition: 'background 0.15s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = rowHover}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '12px 16px', fontSize: '13.5px', color: textMain, whiteSpace: 'nowrap' }}>
                    {col.render
                      ? col.render(row[col.key], row)
                      : col.key === 'id'
                        ? formatInternalId(row[col.key])
                        : String(row[col.key] ?? '-')}
                  </td>
                ))}
                {hasActions && (
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      {onView && <ActionBtn icon={Eye} color="#6366f1" onClick={() => onView(row)} />}
                      {onEdit && <ActionBtn icon={Edit} color="#1FA89A" onClick={() => onEdit(row)} />}
                      {onDelete && <ActionBtn icon={Trash2} color="#ef4444" onClick={() => onDelete(row)} />}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: `1px solid ${border}`, flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', color: textMuted }}>Page {page} of {totalPages}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <PagBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)} label="Prev" icon={ChevronLeft} surface={surface} border={border} textMain={textMain} textMuted={textMuted} />
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button key={p} onClick={() => setPage(p)} style={{
                  width: '32px', height: '32px', borderRadius: '7px',
                  background: p === page ? '#1FA89A' : surface,
                  border: `1px solid ${p === page ? 'transparent' : border}`,
                  color: p === page ? 'white' : textMain,
                  fontSize: '13px', fontWeight: p === page ? 600 : 400, cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                }}>{p}</button>
              );
            })}
            <PagBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} label="Next" icon={ChevronRight} surface={surface} border={border} textMain={textMain} textMuted={textMuted} />
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon: Icon, color, onClick }: { icon: React.ComponentType<{size?: number; color?: string}>, color: string, onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '30px', height: '30px', borderRadius: '7px',
      background: `${color}12`, border: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = `${color}22`; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = `${color}12`; }}>
      <Icon size={14} color={color} />
    </button>
  );
}

function PagBtn({ disabled, onClick, label, icon: Icon, surface, border, textMain, textMuted }: {
  disabled: boolean; onClick: () => void; label: string;
  icon: React.ComponentType<{size?: number; color?: string}>;
  surface: string; border: string; textMain: string; textMuted: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '0 10px', height: '32px', borderRadius: '7px',
      background: surface, border: `1px solid ${border}`,
      color: disabled ? textMuted : textMain,
      fontSize: '12.5px', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, fontFamily: 'var(--font-inter)',
    }}>
      <Icon size={13} />{label}
    </button>
  );
}
