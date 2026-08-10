'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, FormField, ModalFooter } from '@/components/admin/modal';
import { DollarSign, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { createCountry, getCountries, updateCountry, api } from '@/lib/api';

type CurrencyRow = {
  code: string;
  name: string;
  symbol: string;
  symbolPosition: string;
  rate: number;
  autoRate: boolean;
  countries: string;
  isDefault: boolean;
};

const EMPTY_ADD_FORM = {
  countryName: '',
  countryCode: '',
  code: '',
  symbol: '',
  rate: '1',
  symbolPosition: 'BEFORE',
  autoRate: 'true',
  shippingEnabled: 'true',
  isDefault: 'false',
  flag: '',
};

function CurrenciesContent() {
  const border    = 'var(--border)';
  const textMain  = 'var(--text-main)';
  const textMuted = 'var(--text-muted)';
  const surface   = 'var(--surface)';

  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [defaultCurrencyCode, setDefaultCurrencyCode] = useState<string>('USD');
  const [settingDefault, setSettingDefault] = useState(false);

  // For edit modal — we need the raw countries to patch the right one
  const [rawCountries, setRawCountries] = useState<any[]>([]);
  const [editCurrency, setEditCurrency] = useState<CurrencyRow | null>(null);
  const [addCurrencyOpen, setAddCurrencyOpen] = useState(false);
  const [curForm, setCurForm] = useState({ code: '', symbol: '', rate: '', autoRate: 'true', symbolPosition: 'BEFORE' });
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);

  // Exchange rate config
  const [exchangeConfig, setExchangeConfig] = useState({
    providerName: 'exchangerate-api',
    primaryApiUrl: 'https://api.exchangerate-api.com/v4/latest/USD',
    fallbackApiUrl: 'https://open.er-api.com/v6/latest/USD',
    isActive: true,
    updateInterval: 3600000,
  });
  const [exchangeConfigOpen, setExchangeConfigOpen] = useState(false);
  const [exchangeConfigLoading, setExchangeConfigLoading] = useState(false);

  const fetchData = () => {
    getCountries().then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setRawCountries(raw);

      const defaultCountry = raw.find((c: any) => c.isDefault === true);
      if (defaultCountry) {
        setDefaultCurrencyCode(defaultCountry.currencyCode || defaultCountry.currency || 'USD');
      }

      // Build one currency row per unique currency code
      const seen = new Set<string>();
      const list: CurrencyRow[] = [];
      raw.forEach((c: any) => {
        const code = c.currencyCode || c.currency || '';
        if (!code) return;
        if (seen.has(code)) {
          const existing = list.find(x => x.code === code);
          if (existing) existing.countries += `, ${c.name}`;
          return;
        }
        seen.add(code);
        const isDefault = c.isDefault === true;
        list.push({
          code,
          name: code,
          symbol: c.currencySymbol || c.symbol || '',
          symbolPosition: c.symbolPosition || 'BEFORE',
          rate: Number(c.exchangeRate || c.rate || 1),
          autoRate: c.autoRate !== false,
          countries: c.name || '',
          isDefault,
        });
      });
      setCurrencies(list);
    }).catch(() => {});
  };

  useEffect(() => { 
    fetchData(); 
    loadExchangeConfig();
  }, []);

  const loadExchangeConfig = async () => {
    setExchangeConfigLoading(true);
    try {
      const res = await api.get('/api/countries/exchange-rate/config');
      if (res.data) {
        setExchangeConfig({
          providerName: res.data.providerName || 'exchangerate-api',
          primaryApiUrl: res.data.primaryApiUrl || 'https://api.exchangerate-api.com/v4/latest/USD',
          fallbackApiUrl: res.data.fallbackApiUrl || 'https://open.er-api.com/v6/latest/USD',
          isActive: res.data.isActive !== false,
          updateInterval: res.data.updateInterval || 3600000,
        });
      }
    } catch (error) {
      console.error('Failed to fetch exchange config:', error);
    } finally {
      setExchangeConfigLoading(false);
    }
  };

  const handleSaveExchangeConfig = async () => {
    setExchangeConfigLoading(true);
    try {
      await api.patch('/api/countries/exchange-rate/config', exchangeConfig);
      toast.success('Exchange rate configuration updated');
      setExchangeConfigOpen(false);
    } catch (error) {
      toast.error('Failed to update exchange rate configuration');
    } finally {
      setExchangeConfigLoading(false);
    }
  };

  const handleRefreshRates = async () => {
    setExchangeConfigLoading(true);
    try {
      const res = await api.post('/api/countries/refresh-rates');
      toast.success(`Exchange rates refreshed. Updated ${res.data.updated || 0} currencies.`);
      fetchData();
    } catch (error) {
      toast.error('Failed to refresh exchange rates');
    } finally {
      setExchangeConfigLoading(false);
    }
  };

  const openEdit = (row: Record<string, unknown>) => {
    const r = row as unknown as CurrencyRow;
    setCurForm({
      code: r.code,
      symbol: r.symbol || '',
      rate: String(r.rate),
      autoRate: String(r.autoRate),
      symbolPosition: r.symbolPosition || 'BEFORE',
    });
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
            currencyCode: curForm.code.trim().toUpperCase(),
            currencySymbol: curForm.symbol.trim(),
            exchangeRate: Number(curForm.rate),
            autoRate: curForm.autoRate === 'true',
            symbolPosition: curForm.symbolPosition,
          })
        )
      );
      toast.success(`${curForm.code.trim().toUpperCase()} updated for ${matching.length} country(ies)`);
      setEditCurrency(null);
      fetchData();
    } catch { toast.error('Failed to update currency'); }
    setLoading(false);
  };

  const handleAddCurrency = async () => {
    if (!addForm.countryName.trim() || !addForm.countryCode.trim() || !addForm.code.trim() || !addForm.symbol.trim()) {
      toast.error('Country name, country code, currency code and symbol are required');
      return;
    }

    setLoading(true);
    try {
      await createCountry({
        name: addForm.countryName.trim(),
        code: addForm.countryCode.trim().toUpperCase(),
        currencyCode: addForm.code.trim().toUpperCase(),
        currencySymbol: addForm.symbol.trim(),
        exchangeRate: Number(addForm.rate) || 1,
        symbolPosition: addForm.symbolPosition,
        autoRate: addForm.autoRate === 'true',
        shippingEnabled: addForm.shippingEnabled === 'true',
        isDefault: addForm.isDefault === 'true',
        flag: addForm.flag.trim() || undefined,
        status: true,
      });
      toast.success('Currency added');
      setAddCurrencyOpen(false);
      setAddForm(EMPTY_ADD_FORM);
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to add currency');
    }
    setLoading(false);
  };

  const handleRefreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all(rawCountries.map((c: any) => updateCountry(c.id, { autoRate: true })));
      toast.success('Auto-rate enabled for all countries. Rates will refresh shortly.');
      fetchData();
    } catch { toast.error('Failed to enable auto-rate'); }
    setLoading(false);
  };

  const handleSetDefault = async (code: string) => {
    setSettingDefault(true);
    try {
      await api.post('/api/countries/default', { currencyCode: code });
      toast.success(`✓ Default currency set to ${code}. This will be used as the fallback when geolocation fails or a country is not configured.`);
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to set default currency');
    } finally {
      setSettingDefault(false);
    }
  };

  const currencyColumns: Column[] = [
    { key: 'code',   label: 'Code',   render: (v) => <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '14px' }}>{String(v)}</span>, width: '80px' },
    { key: 'symbol', label: 'Symbol', render: (v) => <span style={{ fontWeight: 600, color: textMain }}>{String(v)}</span>, width: '70px' },
    { key: 'rate',   label: 'Rate (vs USD)', render: (v, row) => {
        const r = row as unknown as CurrencyRow;
        return (
          <span style={{ color: textMain }}>
            {r.autoRate
              ? <span style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 600 }}>🔄 Auto · </span>
              : <span style={{ color: textMuted, fontSize: '11px' }}>🔒 Manual · </span>
            }
            {String(v)}
          </span>
        );
      }
    },
    { key: 'symbolPosition', label: 'Position', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v)}</span>, width: '90px' },
    { key: 'countries', label: 'Used By', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v)}</span> },
    { key: 'isDefault', label: 'Default', render: (v, row) => {
        const r = row as unknown as CurrencyRow;
        if (r.isDefault) {
          return (
            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: 'rgba(246,176,30,0.12)', color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Star size={12} fill="var(--gold)" stroke="var(--gold)" /> Default
            </span>
          );
        }
        return (
          <button
            onClick={() => handleSetDefault(r.code)}
            disabled={settingDefault}
            style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', cursor: settingDefault ? 'not-allowed' : 'pointer', opacity: settingDefault ? 0.6 : 1 }}
          >
            Set as Default
          </button>
        );
      }
    },
    { key: 'isDefault', label: 'Base Currency', render: (v, row) => {
        const r = row as unknown as CurrencyRow;
        if (r.isDefault) {
          return (
            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: 'rgba(246,176,30,0.12)', color: 'var(--gold)' }}>
              ✓ Base
            </span>
          );
        }
        return (
          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: 'rgba(192,21,27,0.10)', color: 'var(--text-muted)' }}>
            —
          </span>
        );
      }
    },
  ];

  return (
    <div>
      <PageHeader
        title="Currencies"
        subtitle="Manage exchange rates and currency display settings"
        icon={DollarSign}
        onAdd={() => {
          setAddForm(EMPTY_ADD_FORM);
          setAddCurrencyOpen(true);
        }}
        addLabel="Add Currency"
      />

      {/* Default Currency Selector */}
      <div style={{ marginBottom: '16px', padding: '16px 20px', background: 'rgba(246,176,30,0.06)', border: '1px solid rgba(246,176,30,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(246,176,30,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={20} color="var(--gold)" fill="var(--gold)" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: textMain }}>Default Currency</div>
            <div style={{ fontSize: '12px', color: textMuted, marginTop: '2px' }}>
              This currency is shown to visitors when geolocation fails or their country is not configured. Currently set to <b style={{ color: 'var(--gold)' }}>{defaultCurrencyCode}</b>.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={defaultCurrencyCode}
            onChange={(e) => setDefaultCurrencyCode(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: surface, border: `1px solid ${border}`, color: textMain, fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.symbol}</option>
            ))}
          </select>
          <button
            onClick={() => handleSetDefault(defaultCurrencyCode)}
            disabled={settingDefault}
            style={{ padding: '8px 20px', borderRadius: '8px', background: 'var(--gold)', color: '#000', border: 'none', fontSize: '13px', fontWeight: 700, cursor: settingDefault ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: settingDefault ? 0.7 : 1 }}
          >
            {settingDefault ? 'Saving...' : 'Set as Default'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(31,168,154,0.06)', border: '1px solid rgba(192,21,27,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ color: textMuted, fontSize: '13px', lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, color: textMain }}>How currencies work: </span>
          Each currency is linked to at least one country. You can add a currency here by creating its first country mapping, and edits here update all countries sharing that currency code.
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={loading}
          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: loading ? 0.6 : 1 }}
        >
          🔄 Enable Auto-Rate All
        </button>
      </div>

      {/* Exchange Rate Configuration Banner */}
      <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(192,21,27,0.06)', border: '1px solid rgba(192,21,27,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ color: textMuted, fontSize: '13px', lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, color: textMain }}>Exchange Rate Provider: </span>
          {exchangeConfig.providerName} · {exchangeConfig.isActive ? 'Auto-update enabled' : 'Auto-update disabled'}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setExchangeConfigOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'transparent',
              color: 'var(--primary)',
              border: '1px solid var(--primary)',
              cursor: 'pointer'
            }}
          >
            Configure Provider
          </button>
          <button
            onClick={handleRefreshRates}
            disabled={exchangeConfigLoading}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              cursor: exchangeConfigLoading ? 'not-allowed' : 'pointer',
              opacity: exchangeConfigLoading ? 0.6 : 1
            }}
          >
            {exchangeConfigLoading ? 'Refreshing...' : 'Refresh Rates Now'}
          </button>
        </div>
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
          label="Currency Code"
          value={curForm.code}
          onChange={(v) => setCurForm(f => ({ ...f, code: v.toUpperCase() }))}
          border={border} textMain={textMain} textMuted={textMuted} surface={surface}
          placeholder="e.g. USD"
        />
        <FormField
          label="Currency Symbol"
          value={curForm.symbol}
          onChange={(v) => setCurForm(f => ({ ...f, symbol: v }))}
          border={border} textMain={textMain} textMuted={textMuted} surface={surface}
          placeholder="e.g. $ or USD"
        />
        <FormField
          label="Exchange Rate (vs USD)"
          value={curForm.rate}
          onChange={(v) => setCurForm(f => ({ ...f, rate: v }))}
          border={border} textMain={textMain} textMuted={textMuted} surface={surface}
          placeholder="e.g. 27.5"
        />
        <FormField
          label="Symbol Position"
          value={curForm.symbolPosition}
          onChange={(v) => setCurForm(f => ({ ...f, symbolPosition: v }))}
          options={['BEFORE', 'AFTER']}
          border={border} textMain={textMain} textMuted={textMuted} surface={surface}
        />
        <FormField
          label="Auto Update Rate"
          value={curForm.autoRate}
          onChange={(v) => setCurForm(f => ({ ...f, autoRate: v }))}
          options={['true', 'false']}
          border={border} textMain={textMain} textMuted={textMuted} surface={surface}
        />
        <ModalFooter
          onClose={() => setEditCurrency(null)}
          onSubmit={handleSave}
          loading={loading}
          submitLabel="Save Rate"
          border={border} textMain={textMain}
        />
      </Modal>

      <Modal open={addCurrencyOpen} onClose={() => setAddCurrencyOpen(false)} title="Add Currency" maxWidth="620px">
        <div style={{ marginBottom: '12px', padding: '10px 14px', background: surface, borderRadius: '8px', border: `1px solid ${border}`, fontSize: '12px', color: textMuted, lineHeight: 1.5 }}>
          A currency must belong to a country record. This form creates the first country entry for the new currency so it becomes available everywhere else in admin and storefront.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0 12px' }}>
          <FormField
            label="Country Name"
            value={addForm.countryName}
            onChange={(v) => setAddForm(f => ({ ...f, countryName: v }))}
            border={border} textMain={textMain} textMuted={textMuted} surface={surface}
            placeholder="e.g. United States"
          />
          <FormField
            label="Country Code"
            value={addForm.countryCode}
            onChange={(v) => setAddForm(f => ({ ...f, countryCode: v.toUpperCase() }))}
            border={border} textMain={textMain} textMuted={textMuted} surface={surface}
            placeholder="e.g. US"
          />
          <FormField
            label="Currency Code"
            value={addForm.code}
            onChange={(v) => setAddForm(f => ({ ...f, code: v.toUpperCase() }))}
            border={border} textMain={textMain} textMuted={textMuted} surface={surface}
            placeholder="e.g. USD"
          />
          <FormField
            label="Currency Symbol"
            value={addForm.symbol}
            onChange={(v) => setAddForm(f => ({ ...f, symbol: v }))}
            border={border} textMain={textMain} textMuted={textMuted} surface={surface}
            placeholder="e.g. $ or USD"
          />
          <FormField
            label="Exchange Rate (vs USD)"
            value={addForm.rate}
            onChange={(v) => setAddForm(f => ({ ...f, rate: v }))}
            border={border} textMain={textMain} textMuted={textMuted} surface={surface}
            placeholder="e.g. 1"
          />
          <FormField
            label="Symbol Position"
            value={addForm.symbolPosition}
            onChange={(v) => setAddForm(f => ({ ...f, symbolPosition: v }))}
            options={['BEFORE', 'AFTER']}
            border={border} textMain={textMain} textMuted={textMuted} surface={surface}
          />
          <FormField
            label="Auto Update Rate"
            value={addForm.autoRate}
            onChange={(v) => setAddForm(f => ({ ...f, autoRate: v }))}
            options={['true', 'false']}
            border={border} textMain={textMain} textMuted={textMuted} surface={surface}
          />
          <FormField
            label="Shipping Enabled"
            value={addForm.shippingEnabled}
            onChange={(v) => setAddForm(f => ({ ...f, shippingEnabled: v }))}
            options={['true', 'false']}
            border={border} textMain={textMain} textMuted={textMuted} surface={surface}
          />
          <FormField
            label="Set As Default"
            value={addForm.isDefault}
            onChange={(v) => setAddForm(f => ({ ...f, isDefault: v }))}
            options={['false', 'true']}
            border={border} textMain={textMain} textMuted={textMuted} surface={surface}
          />
          <FormField
            label="Flag Emoji"
            value={addForm.flag}
            onChange={(v) => setAddForm(f => ({ ...f, flag: v }))}
            border={border} textMain={textMain} textMuted={textMuted} surface={surface}
            placeholder="e.g. 🇺🇸"
          />
        </div>
        <ModalFooter
          onClose={() => setAddCurrencyOpen(false)}
          onSubmit={handleAddCurrency}
          loading={loading}
          submitLabel="Add Currency"
          border={border} textMain={textMain}
        />
      </Modal>

      {/* Exchange Rate Configuration Modal */}
      <Modal open={exchangeConfigOpen} onClose={() => setExchangeConfigOpen(false)} title="Exchange Rate Provider Configuration" maxWidth="680px">
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '12px', padding: '10px 14px', background: surface, borderRadius: '8px', border: `1px solid ${border}`, fontSize: '12px', color: textMuted, lineHeight: 1.5 }}>
            Configure your currency exchange rate provider. Changes will affect how exchange rates are calculated across your system.
          </div>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Provider Name</label>
              <input 
                style={{ width: '100%', background: surface, border: `1px solid ${border}`, borderRadius: '9px', color: textMain, fontSize: '13.5px', outline: 'none', padding: '10px 14px' }}
                value={exchangeConfig.providerName}
                onChange={(e) => setExchangeConfig({ ...exchangeConfig, providerName: e.target.value })}
                placeholder="e.g. exchangerate-api"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Primary API URL</label>
              <input 
                style={{ width: '100%', background: surface, border: `1px solid ${border}`, borderRadius: '9px', color: textMain, fontSize: '13.5px', outline: 'none', padding: '10px 14px' }}
                value={exchangeConfig.primaryApiUrl}
                onChange={(e) => setExchangeConfig({ ...exchangeConfig, primaryApiUrl: e.target.value })}
                placeholder="https://api.exchangerate-api.com/v4/latest/USD"
              />
              <div style={{ fontSize: '11px', color: textMuted, marginTop: '4px' }}>Main exchange rate API endpoint</div>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Fallback API URL</label>
              <input 
                style={{ width: '100%', background: surface, border: `1px solid ${border}`, borderRadius: '9px', color: textMain, fontSize: '13.5px', outline: 'none', padding: '10px 14px' }}
                value={exchangeConfig.fallbackApiUrl}
                onChange={(e) => setExchangeConfig({ ...exchangeConfig, fallbackApiUrl: e.target.value })}
                placeholder="https://open.er-api.com/v6/latest/USD"
              />
              <div style={{ fontSize: '11px', color: textMuted, marginTop: '4px' }}>Backup API endpoint if primary fails</div>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Update Interval (milliseconds)</label>
              <input 
                style={{ width: '100%', background: surface, border: `1px solid ${border}`, borderRadius: '9px', color: textMain, fontSize: '13.5px', outline: 'none', padding: '10px 14px' }}
                type="number"
                value={exchangeConfig.updateInterval}
                onChange={(e) => setExchangeConfig({ ...exchangeConfig, updateInterval: parseInt(e.target.value) || 3600000 })}
                placeholder="3600000"
              />
              <div style={{ fontSize: '11px', color: textMuted, marginTop: '4px' }}>How often to refresh rates (default: 3600000ms = 1 hour)</div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox"
                checked={exchangeConfig.isActive}
                onChange={(e) => setExchangeConfig({ ...exchangeConfig, isActive: e.target.checked })}
                style={{ width: '16px', height: '16px' }}
              />
              <label style={{ fontSize: '13px', fontWeight: 600, color: textMain }}>Enable automatic rate updates</label>
            </div>
          </div>
        </div>
        <ModalFooter onClose={() => setExchangeConfigOpen(false)} onSubmit={handleSaveExchangeConfig} loading={exchangeConfigLoading} submitLabel="Save Configuration" border={border} textMain={textMain} />
      </Modal>
    </div>
  );
}

export default function CurrenciesPage() { return <AdminShell><CurrenciesContent /></AdminShell>; }
      
