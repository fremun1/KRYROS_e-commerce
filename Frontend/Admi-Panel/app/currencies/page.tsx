'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import { DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCountries, updateCountry } from '@/lib/api';

type CurrencyRow = {
  code: string;
  name: string;
  symbol: string;
  symbolPosition: string;
  rate: number;
  autoRate: boolean;
  countries: string;
  status: string;
};

function CurrenciesContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const border    = isDark ? '#1E293B' : '#E2E8F0';
  const textMain  = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface   = isDark ? '#101826' : '#F1F5F9';

  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [loading, setLoading] = useState(false);

  // For edit modal — we need the raw countries to patch the right one
  const [rawCountries, setRawCountries] = useState<any[]>([]);
  const [editCurrency, setEditCurrency] = useState<CurrencyRow | null>(null);
  const [curForm, setCurForm] = useState({ rate: '', autoRate: 'true', symbolPosition: 'BEFORE' });

  const fetchData = () => {
    getCountries().then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setRawCountries(raw);

      // Build one currency row per unique currency code
      const seen = new Set<string>();
      const list: CurrencyRow[] = [];
      raw.forEach((c: any) => {
        const code = c.currencyCode || c.currency || '';
        if (!code) return;
        if (seen.has(code)) {
          // Add this country name to the existing entry
          const existing = list.find(x => x.code === code);
          if (existing) existing.countries += `, ${c.name}`;
          return;
        }
        seen.add(code);
        list.push({
          code,
          name: code, // currency name = code for now (ZMW, USD, ZWL)
          symbol: c.currencySymbol || c.symbol || '',
          symbolPosition: c.symbolPosition || 'BEFORE',
          rate: Number(c.exchangeRate || c.rate || 1),
          autoRate: c.autoRate !== false,
          countries: c.name || '',
          status: Number(c.exchangeRate || c.rate || 1) === 1 ? 'Base' : 'Active',
        });
      });
      setCurrencies(list);
    }).catch(() => {});
  };

  useEffect(() => { fetchData(); }, []);

  const openEdit = (row: Record<string, unknown>) => {
    const r = row as unknown as CurrencyRow;
    setCurForm({ rate: String(r.rate), autoRate: String(r.autoRate), symbolPosition: r.symbolPosition || 'BEFORE' });
    setEditCurrency(r);
  };

  const handleSave = async () => {
    if (!editCurrency) return;
    setLoading(true);
    // Find ALL countries that use this currency and update each one
    const matching = rawCountries.filter((c: any) => (c.currencyCode || c.currency) === editCurrency.code);
    if (matching.length === 0) {
      toast.error('No country found for this currency');
      setLoading(false);
      return;
    }
    try {
      await Promise.all(
        matching.map((c: any) =>
          updateCountry(c.id, {
            exchangeRate: Number(curForm.rate),
            autoRate: curForm.autoRate === 'true',
            symbolPosition: curForm.symbolPosition,
          })
        )
      );
      toast.success(`${editCurrency.code} updated for ${matching.length} country(ies)`);
      setEditCurrency(null);
      fetchData();
    } catch { toast.error('Failed to update currency'); }
    setLoading(false);
  };

  const handleRefreshAll = async () => {
    setLoading(true);
    try {
      // Enable auto-rate on all countries — backend will update rates on next cron
      await Promise.all(rawCountries.map((c: any) => updateCountry(c.id, { autoRate: true })));
      toast.success('Auto-rate enabled for all countries. Rates will refresh shortly.');
      fetchData();
    } catch { toast.error('Failed to enable auto-rate'); }
    setLoading(false);
  };

  const currencyColumns: Column[] = [
    { key: 'code',   label: 'Code',   render: (v) => <span style={{ fontWeight: 700, color: '#1FA89A', fontSize: '14px' }}>{String(v)}</span>, width: '80px' },
    { key: 'symbol', label: 'Symbol', render: (v) => <span style={{ fontWeight: 600, color: textMain }}>{String(v)}</span>, width: '70px' },
    { key: 'rate',   label: 'Rate (vs USD)', render: (v, row) => {
        const r = row as unknown as CurrencyRow;
        return (
          <span style={{ color: textMain }}>
            {r.autoRate
              ? <span style={{ color: '#1FA89A', fontSize: '11px', fontWeight: 600 }}>🔄 Auto · </span>
              : <span style={{ color: textMuted, fontSize: '11px' }}>🔒 Manual · </span>
            }
            {String(v)}
          </span>
        );
      }
    },
    { key: 'symbolPosition', label: 'Position', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v)}</span>, width: '90px' },
    { key: 'countries', label: 'Used By', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v)}</span> },
    { key: 'status', label: 'Status', render: (v) => (
        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: v === 'Base' ? 'rgba(245,158,11,0.12)' : 'rgba(31,168,154,0.12)', color: v === 'Base' ? '#f59e0b' : '#1FA89A' }}>
          {String(v)}
        </span>
      )
    },
  ];

  return (
    <div>
      <PageHeader
        title="Currencies"
        subtitle="Manage exchange rates and currency display settings"
        icon={DollarSign}
      />

      {/* Info banner */}
      <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(31,168,154,0.06)', border: '1px solid rgba(31,168,154,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ color: textMuted, fontSize: '13px', lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, color: textMain }}>How currencies work: </span>
          Each currency is linked to a country. To add a new currency, go to <b>Locations → Countries</b> and add a country with that currency code. Exchange rates here update all countries sharing that currency.
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={loading}
          style={{ padding: '8px 16px', borderRadius: '8px', background: '#1FA89A', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: loading ? 0.6 : 1 }}
        >
          🔄 Enable Auto-Rate All
        </button>
      </div>

      <DataTable
        columns={currencyColumns}
        data={currencies as unknown as Record<string, unknown>[]}
        searchPlaceholder="Search currencies..."
        onEdit={openEdit}
      />

      {/* Edit Currency Modal */}
      <Modal open={!!editCurrency} onClose={() => setEditCurrency(null)} title={`Edit Currency: ${editCurrency?.code ?? ''}`}>
        <div style={{ marginBottom: '12px', padding: '10px 14px', background: surface, borderRadius: '8px', border: `1px solid ${border}`, fontSize: '12px', color: textMuted }}>
          Used by: <b style={{ color: textMain }}>{editCurrency?.countries}</b>
        </div>
        <FormField
          label="Exchange Rate (vs USD)"
          value={curForm.rate}
          onChange={(v) => setCurForm(f => ({ ...f, rate: v }))}
          isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
          placeholder="e.g. 27.5"
        />
        <FormField
          label="Symbol Position"
          value={curForm.symbolPosition}
          onChange={(v) => setCurForm(f => ({ ...f, symbolPosition: v }))}
          options={['BEFORE', 'AFTER']}
          isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
        />
        <FormField
          label="Auto Update Rate"
          value={curForm.autoRate}
          onChange={(v) => setCurForm(f => ({ ...f, autoRate: v }))}
          options={['true', 'false']}
          isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}
        />
        <ModalFooter
          onClose={() => setEditCurrency(null)}
          onSubmit={handleSave}
          loading={loading}
          submitLabel="Save Rate"
          isDark={isDark} border={border} textMain={textMain}
        />
      </Modal>
    </div>
  );
}

export default function CurrenciesPage() { return <AdminShell><CurrenciesContent /></AdminShell>; }
      
