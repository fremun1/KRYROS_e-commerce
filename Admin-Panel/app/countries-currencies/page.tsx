'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, FormField, ModalFooter } from '@/components/admin/modal';
import { Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCountries, updateCountry, createCountry, api } from '@/lib/api';

type Country = {
  id:string; name:string; code:string; currency:string; symbol:string;
  rate:number; status:string; shipping:boolean; symbolPosition:string;
  autoRate:boolean; flag:string; isDefault:boolean; shippingEnabled:boolean;
};
type Currency = { code:string; name:string; symbol:string; rate:number; status:string };

const EMPTY_CFORM = {
  name:'', code:'', currency:'', symbol:'', rate:'1',
  shipping:'true', status:'Active', symbolPosition:'BEFORE',
  autoRate:'true', flag:'', isDefault:'false', shippingEnabled:'true'
};

function CountriesContent() {
  const border = 'var(--border)';
  const textMain = 'var(--text-main)';
  const textMuted = 'var(--text-muted)';
  const surface = 'var(--surface)';
  const card = 'var(--card)';

  const [tab, setTab] = useState<'countries'|'currencies'|'exchange-config'>('countries');
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);

  // Exchange rate config
  const [exchangeConfig, setExchangeConfig] = useState({
    providerName: 'exchangerate-api',
    primaryApiUrl: 'https://api.exchangerate-api.com/v4/latest/USD',
    fallbackApiUrl: 'https://open.er-api.com/v6/latest/USD',
    isActive: true,
    updateInterval: 3600000,
  });
  const [exchangeConfigLoading, setExchangeConfigLoading] = useState(false);

  // Edit country
  const [editCountry, setEditCountry] = useState<Country|null>(null);
  const [cForm, setCForm] = useState({ rate:'', shipping:'true', status:'Active', symbolPosition:'BEFORE', autoRate:'true', flag:'', isDefault:'false', shippingEnabled:'true' });

  // Add country
  const [addCountryOpen, setAddCountryOpen] = useState(false);
  const [addCForm, setAddCForm] = useState({...EMPTY_CFORM});

  // Edit currency (rate + status only — currency is part of a country)
  const [editCurrency, setEditCurrency] = useState<Currency|null>(null);
  const [curForm, setCurForm] = useState({ rate:'', status:'Active' });

  const inputStyle = { width:'100%', background:surface, border:`1px solid ${border}`, borderRadius:'9px', color:textMain, fontSize:'13.5px', outline:'none', padding:'10px 14px' };
  const selStyle = { ...inputStyle, cursor:'pointer' };

  const fetchCountries = () => {
    getCountries().then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      const normalized: Country[] = raw.map((c: any) => ({
        id: c.id || '',
        name: c.name || '',
        code: c.code || '',
        currency: c.currencyCode || c.currency || '',
        symbol: c.currencySymbol || c.symbol || '',
        rate: Number(c.exchangeRate || c.rate || 1),
        status: c.isActive !== false && c.status !== false ? 'Active' : 'Inactive',
        shipping: c.shippingEnabled !== false,
        symbolPosition: c.symbolPosition || 'BEFORE',
        autoRate: c.autoRate !== false,
        flag: c.flag || '',
        isDefault: c.isDefault === true,
        shippingEnabled: c.shippingEnabled !== false,
      }));
      setCountries(normalized);
      const seen = new Set<string>();
      const currList: Currency[] = [];
      normalized.forEach(c => {
        if (c.currency && !seen.has(c.currency)) {
          seen.add(c.currency);
          currList.push({ code: c.currency, name: c.currency, symbol: c.symbol, rate: c.rate, status: c.rate === 1 ? 'Base' : 'Active' });
        }
      });
      setCurrencies(currList);
    }).catch(() => {});
  };

  const fetchExchangeConfig = async () => {
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

  useEffect(() => { 
    fetchCountries(); 
    fetchExchangeConfig();
  }, []);

  const openEditCountry = (row: Record<string,unknown>) => {
    const r = row as unknown as Country;
    setCForm({ rate:String(r.rate), shipping:String(r.shipping), status:r.status, symbolPosition:r.symbolPosition||'BEFORE', autoRate:String(r.autoRate), flag:r.flag||'', isDefault:String(r.isDefault), shippingEnabled:String(r.shippingEnabled!==false) });
    setEditCountry(r);
  };

  const handleSaveCountry = async () => {
    if (!editCountry) return;
    setLoading(true);
    try {
      await updateCountry(editCountry.id, {
        exchangeRate: Number(cForm.rate),
        status: cForm.status === 'Active',
        autoRate: cForm.autoRate === 'true',
        symbolPosition: cForm.symbolPosition,
        flag: cForm.flag || undefined,
        shippingEnabled: cForm.shippingEnabled === 'true',
        isDefault: cForm.isDefault === 'true',
      });
      toast.success('Country updated');
      setEditCountry(null);
      fetchCountries();
    } catch { toast.error('Failed to update country'); }
    setLoading(false);
  };

  const handleAddCountry = async () => {
    if (!addCForm.name.trim() || !addCForm.code.trim() || !addCForm.currency.trim()) {
      toast.error('Name, code and currency are required'); return;
    }
    setLoading(true);
    try {
      await createCountry({
        name: addCForm.name,
        code: addCForm.code.toUpperCase(),
        currencyCode: addCForm.currency.toUpperCase(),
        currencySymbol: addCForm.symbol,
        exchangeRate: Number(addCForm.rate) || 1,
        status: addCForm.status === 'Active',
        symbolPosition: addCForm.symbolPosition || 'BEFORE',
        autoRate: addCForm.autoRate === 'true',
        flag: addCForm.flag || undefined,
        shippingEnabled: addCForm.shippingEnabled !== 'false',
        isDefault: addCForm.isDefault === 'true',
      });
      toast.success('Country added');
      setAddCountryOpen(false);
      setAddCForm({...EMPTY_CFORM});
      fetchCountries();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to add country');
    }
    setLoading(false);
  };

  const openEditCurrency = (row: Record<string,unknown>) => {
    const r = row as unknown as Currency;
    setCurForm({ rate:String(r.rate), status:r.status });
    setEditCurrency(r);
  };

  const handleSaveCurrency = async () => {
    if (!editCurrency) return;
    setLoading(true);
    // Find the country with this currency and update its exchange rate
    const country = countries.find(c => c.currency === editCurrency.code);
    if (country) {
      try {
        await updateCountry(country.id, { exchangeRate: Number(curForm.rate) });
        toast.success('Currency rate updated');
        setEditCurrency(null);
        fetchCountries();
      } catch { toast.error('Failed to update rate'); }
    } else {
      setCurrencies(d => d.map(c => c.code === editCurrency.code ? {...c, rate:Number(curForm.rate), status:curForm.status} : c));
      toast.success('Currency updated');
      setEditCurrency(null);
    }
    setLoading(false);
  };

  const handleSaveExchangeConfig = async () => {
    setExchangeConfigLoading(true);
    try {
      await api.patch('/api/countries/exchange-rate/config', exchangeConfig);
      toast.success('Exchange rate configuration updated');
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
      fetchCountries();
    } catch (error) {
      toast.error('Failed to refresh exchange rates');
    } finally {
      setExchangeConfigLoading(false);
    }
  };

  const countryColumns: Column[] = [
    { key:'flag', label:'', render:(v)=><span style={{fontSize:'20px'}}>{String(v||'🌍')}</span>, width:'40px' },
    { key:'code', label:'Code', render:(v)=><span style={{fontWeight:700,color:'var(--primary)',fontSize:'13px'}}>{String(v)}</span>, width:'70px' },
    { key:'name', label:'Country', render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span> },
    { key:'currency', label:'Currency', render:(v,row)=>{ const r=row as unknown as Country; return <span style={{color:textMain}}><b>{String(v)}</b> {r.symbol}</span>; }},
    { key:'rate', label:'Exchange Rate', render:(v,row)=>{ const r=row as unknown as Country; return <span style={{color:textMuted,fontSize:'12px'}}>{r.autoRate ? '🔄 Auto' : '🔒 Manual'} · {String(v)}</span>; }},
    { key:'shippingEnabled', label:'Shipping', render:(v)=><span style={{padding:'3px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:600,background:v?'rgba(192,21,27,0.10)':'rgba(239,68,68,0.1)',color:v?'var(--primary)':'var(--danger)'}}>{v?'Enabled':'Disabled'}</span> },
    { key:'status', label:'Status', render:(v)=><span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:v==='Active'?'rgba(192,21,27,0.10)':'rgba(100,116,139,0.1)',color:v==='Active'?'var(--primary)':'var(--text-muted)'}}>{String(v)}</span> },
    { key:'isDefault', label:'Default', render:(v)=>v?<span style={{color:'var(--gold)',fontWeight:700,fontSize:'12px'}}>★ Default</span>:<span style={{color:textMuted,fontSize:'12px'}}>—</span> },
  ];

  const currencyColumns: Column[] = [
    { key:'code', label:'Code', render:(v)=><span style={{fontWeight:700,color:'var(--primary)'}}>{String(v)}</span>, width:'80px' },
    { key:'symbol', label:'Symbol', render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span>, width:'70px' },
    { key:'name', label:'Name', render:(v)=><span style={{color:textMain}}>{String(v)}</span> },
    { key:'rate', label:'Rate (vs USD)', render:(v)=><span style={{color:textMuted}}>{String(v)}</span> },
    { key:'status', label:'Status', render:(v)=><span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:'rgba(192,21,27,0.10)',color:'var(--primary)'}}>{String(v)}</span> },
  ];

  const cfp = (k:string)=>(v:string)=>setCForm(f=>({...f,[k]:v}));
  const acfp = (k:string)=>(v:string)=>setAddCForm(f=>({...f,[k]:v}));

  const editCountryFields = (
    <>
      <FormField label="Exchange Rate" value={cForm.rate} onChange={cfp('rate')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 27.5" />
      <FormField label="Currency Symbol Position" value={cForm.symbolPosition} onChange={cfp('symbolPosition')} options={['BEFORE','AFTER']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Flag Emoji" value={cForm.flag} onChange={cfp('flag')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 🇿🇲" />
      <FormField label="Auto Update Rate" value={cForm.autoRate} onChange={cfp('autoRate')} options={['true','false']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Shipping Enabled" value={cForm.shippingEnabled} onChange={cfp('shippingEnabled')} options={['true','false']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Set as Default Country" value={cForm.isDefault} onChange={cfp('isDefault')} options={['false','true']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Status" value={cForm.status} onChange={cfp('status')} options={['Active','Inactive']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
    </>
  );

  const addCountryFields = (
    <>
      <FormField label="Country Name *" value={addCForm.name} onChange={acfp('name')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Zambia" />
      <FormField label="Country Code * (2-letter)" value={addCForm.code} onChange={acfp('code')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. ZM" />
      <FormField label="Currency Code * (3-letter)" value={addCForm.currency} onChange={acfp('currency')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. USD" />
      <FormField label="Currency Symbol *" value={addCForm.symbol} onChange={acfp('symbol')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. $" />
      <FormField label="Exchange Rate (vs USD)" value={addCForm.rate} onChange={acfp('rate')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 27.5" />
      <FormField label="Symbol Position" value={addCForm.symbolPosition} onChange={acfp('symbolPosition')} options={['BEFORE','AFTER']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Flag Emoji" value={addCForm.flag} onChange={acfp('flag')} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 🇿🇲" />
      <FormField label="Auto Update Rate" value={addCForm.autoRate} onChange={acfp('autoRate')} options={['true','false']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Shipping Enabled" value={addCForm.shippingEnabled} onChange={acfp('shippingEnabled')} options={['true','false']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Status" value={addCForm.status} onChange={acfp('status')} options={['Active','Inactive']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
    </>
  );

  const tabStyle = (active:boolean) => ({
    padding:'8px 20px', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer',
    background:active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : textMuted, border:'none',
  });

  return (
    <div>
      <PageHeader title="Countries & Currencies" subtitle="Manage countries, currencies and exchange rates" icon={Globe} onAdd={()=>setAddCountryOpen(true)} addLabel="Add Country" />

      {/* Tabs */}
      <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
        <button style={tabStyle(tab==='countries')} onClick={()=>setTab('countries')}>Countries</button>
        <button style={tabStyle(tab==='currencies')} onClick={()=>setTab('currencies')}>Currencies</button>
        <button style={tabStyle(tab==='exchange-config')} onClick={()=>setTab('exchange-config')}>Exchange Provider</button>
      </div>

      {tab === 'countries' && (
        <DataTable columns={countryColumns} data={countries as unknown as Record<string,unknown>[]} searchPlaceholder="Search countries..." onEdit={openEditCountry} />
      )}

      {tab === 'currencies' && (
        <>
          <div style={{color:textMuted,fontSize:'12px',marginBottom:'12px',padding:'10px 14px',background:'rgba(31,168,154,0.06)',border:'1px solid rgba(192,21,27,0.15)',borderRadius:'8px'}}>
            Currencies are derived from countries. To add a new currency, add a new country with that currency. To edit the exchange rate, click Edit on any currency row below.
          </div>
          <DataTable columns={currencyColumns} data={currencies as unknown as Record<string,unknown>[]} searchPlaceholder="Search currencies..." onEdit={openEditCurrency} />
        </>
      )}

      {tab === 'exchange-config' && (
        <>
          <div style={{color:textMuted,fontSize:'12px',marginBottom:'12px',padding:'10px 14px',background:'rgba(31,168,154,0.06)',border:'1px solid rgba(192,21,27,0.15)',borderRadius:'8px'}}>
            Configure your currency exchange rate provider. Changes will affect how exchange rates are calculated across your system.
          </div>
          
          <div style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'24px',maxWidth:'800px'}}>
            <h3 style={{fontSize:'16px',fontWeight:700,color:textMain,marginBottom:'20px'}}>Exchange Rate Provider Configuration</h3>
            
            <div style={{display:'grid',gap:'16px',marginBottom:'24px'}}>
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:textMain,marginBottom:'6px'}}>Provider Name</label>
                <input 
                  style={inputStyle}
                  value={exchangeConfig.providerName}
                  onChange={(e) => setExchangeConfig({...exchangeConfig, providerName: e.target.value})}
                  placeholder="e.g. exchangerate-api"
                />
              </div>
              
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:textMain,marginBottom:'6px'}}>Primary API URL</label>
                <input 
                  style={inputStyle}
                  value={exchangeConfig.primaryApiUrl}
                  onChange={(e) => setExchangeConfig({...exchangeConfig, primaryApiUrl: e.target.value})}
                  placeholder="https://api.exchangerate-api.com/v4/latest/USD"
                />
                <div style={{fontSize:'11px',color:textMuted,marginTop:'4px'}}>Main exchange rate API endpoint</div>
              </div>
              
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:textMain,marginBottom:'6px'}}>Fallback API URL</label>
                <input 
                  style={inputStyle}
                  value={exchangeConfig.fallbackApiUrl}
                  onChange={(e) => setExchangeConfig({...exchangeConfig, fallbackApiUrl: e.target.value})}
                  placeholder="https://open.er-api.com/v6/latest/USD"
                />
                <div style={{fontSize:'11px',color:textMuted,marginTop:'4px'}}>Backup API endpoint if primary fails</div>
              </div>
              
              <div>
                <label style={{display:'block',fontSize:'13px',fontWeight:600,color:textMain,marginBottom:'6px'}}>Update Interval (milliseconds)</label>
                <input 
                  style={inputStyle}
                  type="number"
                  value={exchangeConfig.updateInterval}
                  onChange={(e) => setExchangeConfig({...exchangeConfig, updateInterval: parseInt(e.target.value) || 3600000})}
                  placeholder="3600000"
                />
                <div style={{fontSize:'11px',color:textMuted,marginTop:'4px'}}>How often to refresh rates (default: 3600000ms = 1 hour)</div>
              </div>
              
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <input 
                  type="checkbox"
                  checked={exchangeConfig.isActive}
                  onChange={(e) => setExchangeConfig({...exchangeConfig, isActive: e.target.checked})}
                  style={{width:'16px',height:'16px'}}
                />
                <label style={{fontSize:'13px',fontWeight:600,color:textMain}}>Enable automatic rate updates</label>
              </div>
            </div>
            
            <div style={{display:'flex',gap:'12px'}}>
              <button 
                onClick={handleSaveExchangeConfig}
                disabled={exchangeConfigLoading}
                style={{
                  padding:'10px 20px',
                  borderRadius:'8px',
                  fontSize:'13px',
                  fontWeight:600,
                  background:'var(--primary)',
                  color:'#fff',
                  border:'none',
                  cursor:exchangeConfigLoading ? 'not-allowed' : 'pointer',
                  opacity:exchangeConfigLoading ? 0.6 : 1
                }}
              >
                {exchangeConfigLoading ? 'Saving...' : 'Save Configuration'}
              </button>
              
              <button 
                onClick={handleRefreshRates}
                disabled={exchangeConfigLoading}
                style={{
                  padding:'10px 20px',
                  borderRadius:'8px',
                  fontSize:'13px',
                  fontWeight:600,
                  background:'transparent',
                  color:'var(--primary)',
                  border:`1px solid var(--primary)`,
                  cursor:exchangeConfigLoading ? 'not-allowed' : 'pointer',
                  opacity:exchangeConfigLoading ? 0.6 : 1
                }}
              >
                {exchangeConfigLoading ? 'Refreshing...' : 'Refresh Rates Now'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Country Modal */}
      <Modal open={!!editCountry} onClose={()=>setEditCountry(null)} title={`Edit Country: ${editCountry?.name ?? ''}`}>
        {editCountryFields}
        <ModalFooter onClose={()=>setEditCountry(null)} onSubmit={handleSaveCountry} loading={loading} submitLabel="Save Changes" border={border} textMain={textMain} />
      </Modal>

      {/* Add Country Modal */}
      <Modal open={addCountryOpen} onClose={()=>setAddCountryOpen(false)} title="Add New Country">
        {addCountryFields}
        <ModalFooter onClose={()=>setAddCountryOpen(false)} onSubmit={handleAddCountry} loading={loading} submitLabel="Add Country" border={border} textMain={textMain} />
      </Modal>

      {/* Edit Currency Rate Modal */}
      <Modal open={!!editCurrency} onClose={()=>setEditCurrency(null)} title={`Edit Currency: ${editCurrency?.code ?? ''}`}>
        <FormField label="Exchange Rate (vs USD)" value={curForm.rate} onChange={(v)=>setCurForm(f=>({...f,rate:v}))} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 27.5" />
        <FormField label="Status" value={curForm.status} onChange={(v)=>setCurForm(f=>({...f,status:v}))} options={['Active','Inactive','Base']} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <ModalFooter onClose={()=>setEditCurrency(null)} onSubmit={handleSaveCurrency} loading={loading} submitLabel="Save Rate" border={border} textMain={textMain} />
      </Modal>
    </div>
  );
}

export default function CountriesCurrenciesPage() { return <AdminShell><CountriesContent /></AdminShell>; }
