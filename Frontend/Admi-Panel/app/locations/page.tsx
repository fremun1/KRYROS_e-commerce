'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import { MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import CloudinaryUpload from '@/components/ui/file-upload';
import {
  getCountries, createCountry, updateCountry,
  getStates, createState, updateState, deleteState,
  getCities, createCity, updateCity, deleteCity,
  getPickupStations, createPickupStation, updatePickupStation, togglePickupStation, deletePickupStation,
} from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
type Country = {
  id: string; name: string; code: string; currency: string; symbol: string;
  rate: number; status: string; shippingEnabled: boolean; symbolPosition: string;
  autoRate: boolean; flag: string; isDefault: boolean;
};
type StateRow = { id: string; name: string; code: string; countryId: string; countryName: string; status: string; cities: number };
type CityRow  = { id: string; name: string; stateId: string; stateName: string; status: string };
type PickupStation = {
  id: string; name: string; address: string; city: string; state: string; country: string;
  phone: string; email: string; openingHours: string; description: string;
  latitude: string; longitude: string; status: string; image: string;
};

const EMPTY_STATE  = { name: '', code: '', countryId: '', countryName: '', status: 'Active', cities: 0 };
const EMPTY_CITY   = { name: '', stateId: '', stateName: '', status: 'Active' };
const EMPTY_PICKUP = {
  name: '', address: '', city: '', state: '', country: 'Zambia',
  phone: '', email: '', openingHours: '', description: '',
  latitude: '', longitude: '', status: 'Active', image: '',
};
const EMPTY_CFORM = {
  name: '', code: '', currency: '', symbol: '', rate: '1',
  shipping: 'true', status: 'Active', symbolPosition: 'BEFORE',
  autoRate: 'true', flag: '', isDefault: 'false', shippingEnabled: 'true',
};

function LocationsContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card    = isDark ? '#0D1523' : '#FFFFFF';
  const border  = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface  = isDark ? '#101826' : '#F1F5F9';

  type Tab = 'countries' | 'states' | 'cities' | 'pickups';
  const [tab, setTab] = useState<Tab>('countries');

  // Shared lists used by child tabs
  const [countriesList, setCountriesList] = useState<{ id: string; name: string }[]>([]);
  const [statesList,    setStatesList]    = useState<{ id: string; name: string }[]>([]);

  const loadCountriesList = () => {
    getCountries().then((r: any) => {
      const raw = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setCountriesList(raw.map((c: any) => ({ id: c.id, name: c.name })));
    }).catch(() => {});
  };

  useEffect(() => { loadCountriesList(); }, []);

  // ── COUNTRIES ────────────────────────────────────────────────
  const [countries, setCountries] = useState<Country[]>([]);
  const [editCountry, setEditCountry]     = useState<Country | null>(null);
  const [addCountryOpen, setAddCountryOpen] = useState(false);
  const [loadingCountry, setLoadingCountry] = useState(false);
  const [cForm, setCForm] = useState({ rate: '', status: 'Active', symbolPosition: 'BEFORE', autoRate: 'true', flag: '', isDefault: 'false', shippingEnabled: 'true' });
  const [addCForm, setAddCForm] = useState({ ...EMPTY_CFORM });
  const cfp  = (k: string) => (v: string) => setCForm(f => ({ ...f, [k]: v }));
  const acfp = (k: string) => (v: string) => setAddCForm(f => ({ ...f, [k]: v }));

  const fetchCountries = () => {
    getCountries().then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setCountries(raw.map((c: any) => ({
        id: c.id || '', name: c.name || '', code: c.code || '',
        currency: c.currencyCode || c.currency || '',
        symbol: c.currencySymbol || c.symbol || '',
        rate: Number(c.exchangeRate || c.rate || 1),
        status: c.isActive !== false ? 'Active' : 'Inactive',
        shippingEnabled: c.shippingEnabled !== false,
        symbolPosition: c.symbolPosition || 'BEFORE',
        autoRate: c.autoRate !== false,
        flag: c.flag || '',
        isDefault: c.isDefault === true,
      })));
    }).catch(() => {});
  };

  useEffect(() => { if (tab === 'countries') fetchCountries(); }, [tab]);

  const handleSaveCountry = async () => {
    if (!editCountry) return;
    setLoadingCountry(true);
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
      loadCountriesList();
    } catch { toast.error('Failed to update country'); }
    setLoadingCountry(false);
  };

  const handleAddCountry = async () => {
    if (!addCForm.name.trim() || !addCForm.code.trim() || !addCForm.currency.trim()) {
      toast.error('Name, code and currency are required'); return;
    }
    setLoadingCountry(true);
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
      setAddCForm({ ...EMPTY_CFORM });
      fetchCountries();
      loadCountriesList();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to add country');
    }
    setLoadingCountry(false);
  };

  // ── STATES ─────────────────────────────────────────────────
  const [states, setStates] = useState<StateRow[]>([]);
  const [addStateOpen,  setAddStateOpen]  = useState(false);
  const [editState,     setEditState]     = useState<StateRow | null>(null);
  const [deleteState_row, setDeleteState] = useState<StateRow | null>(null);
  const [stateForm, setStateForm]         = useState({ ...EMPTY_STATE });
  const [loadingState, setLoadingState]   = useState(false);
  const sfp = (k: string) => (v: string) => setStateForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (tab !== 'states') return;
    getStates().then((r: any) => {
      const raw = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setStates(raw.map((s: any) => ({
        id: s.id || '', name: s.name || '', code: s.code || '',
        countryId: s.countryId || '', countryName: s.country?.name || '',
        status: s.isActive !== false ? 'Active' : 'Inactive',
        cities: s._count?.cities ?? 0,
      })));
    }).catch(() => {});
  }, [tab]);

  const handleAddState = async () => {
    if (!stateForm.name.trim() || !stateForm.countryId) { toast.error('Name and country required'); return; }
    setLoadingState(true);
    try {
      const res: any = await createState({ name: stateForm.name, code: stateForm.code || undefined, countryId: stateForm.countryId, isActive: stateForm.status === 'Active' });
      const id = res?.data?.id || String(Date.now());
      setStates(d => [...d, { id, ...stateForm }]);
      toast.success('State/Province added');
      setAddStateOpen(false);
      setStateForm({ ...EMPTY_STATE });
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to add state'); }
    setLoadingState(false);
  };

  const handleEditState = async () => {
    if (!editState) return;
    setLoadingState(true);
    try {
      await updateState(editState.id, { name: stateForm.name, code: stateForm.code || undefined, isActive: stateForm.status === 'Active' });
      setStates(d => d.map(s => s.id === editState.id ? { ...s, ...stateForm } : s));
      toast.success('State updated');
      setEditState(null);
    } catch { toast.error('Failed to update state'); }
    setLoadingState(false);
  };

  const handleDeleteState = async () => {
    if (!deleteState_row) return;
    setLoadingState(true);
    try {
      await deleteState(deleteState_row.id);
      setStates(d => d.filter(s => s.id !== deleteState_row.id));
      toast.success('State deleted');
      setDeleteState(null);
    } catch { toast.error('Failed to delete state'); }
    setLoadingState(false);
  };

  // ── CITIES ─────────────────────────────────────────────────
  const [cities, setCities] = useState<CityRow[]>([]);
  const [addCityOpen,  setAddCityOpen]  = useState(false);
  const [editCity,     setEditCity]     = useState<CityRow | null>(null);
  const [deleteCity_row, setDeleteCity] = useState<CityRow | null>(null);
  const [cityForm, setCityForm]         = useState({ ...EMPTY_CITY });
  const [loadingCity, setLoadingCity]   = useState(false);
  const cyfp = (k: string) => (v: string) => setCityForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (tab !== 'cities') return;
    getCities().then((r: any) => {
      const raw = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setCities(raw.map((c: any) => ({
        id: c.id || '', name: c.name || '',
        stateId: c.stateId || '', stateName: c.state?.name || '',
        status: c.isActive !== false ? 'Active' : 'Inactive',
      })));
    }).catch(() => {});
    getStates().then((r: any) => {
      const raw = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setStatesList(raw.map((s: any) => ({ id: s.id, name: s.name })));
    }).catch(() => {});
  }, [tab]);

  const handleAddCity = async () => {
    if (!cityForm.name.trim() || !cityForm.stateId) { toast.error('Name and state required'); return; }
    setLoadingCity(true);
    try {
      const res: any = await createCity({ name: cityForm.name, stateId: cityForm.stateId, isActive: cityForm.status === 'Active' });
      const id = res?.data?.id || String(Date.now());
      setCities(d => [...d, { id, ...cityForm }]);
      toast.success('City added');
      setAddCityOpen(false);
      setCityForm({ ...EMPTY_CITY });
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to add city'); }
    setLoadingCity(false);
  };

  const handleEditCity = async () => {
    if (!editCity) return;
    setLoadingCity(true);
    try {
      await updateCity(editCity.id, { name: cityForm.name, isActive: cityForm.status === 'Active' });
      setCities(d => d.map(c => c.id === editCity.id ? { ...c, ...cityForm } : c));
      toast.success('City updated');
      setEditCity(null);
    } catch { toast.error('Failed to update city'); }
    setLoadingCity(false);
  };

  const handleDeleteCity = async () => {
    if (!deleteCity_row) return;
    setLoadingCity(true);
    try {
      await deleteCity(deleteCity_row.id);
      setCities(d => d.filter(c => c.id !== deleteCity_row.id));
      toast.success('City deleted');
      setDeleteCity(null);
    } catch { toast.error('Failed to delete city'); }
    setLoadingCity(false);
  };

  // ── PICKUP STATIONS ─────────────────────────────────────────
  const [pickups, setPickups]           = useState<PickupStation[]>([]);
  const [addPickupOpen, setAddPickupOpen] = useState(false);
  const [editPickup,    setEditPickup]    = useState<PickupStation | null>(null);
  const [deletePickup,  setDeletePickup]  = useState<PickupStation | null>(null);
  const [pickupForm, setPickupForm]       = useState({ ...EMPTY_PICKUP });
  const [loadingPickup, setLoadingPickup] = useState(false);
  const pfp = (k: string) => (v: string) => setPickupForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (tab !== 'pickups') return;
    getPickupStations().then((r: any) => {
      const raw = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setPickups(raw.map((p: any) => ({
        id: p.id || '', name: p.name || '', address: p.address || '',
        city: p.city || '', state: p.state || '', country: p.country || 'Zambia',
        phone: p.phone || '', email: p.email || '',
        openingHours: p.openingHours || '', description: p.description || '',
        latitude: p.latitude ? String(p.latitude) : '', longitude: p.longitude ? String(p.longitude) : '',
        status: p.isActive !== false ? 'Active' : 'Inactive',
        image: p.image || '',
      })));
    }).catch(() => {});
  }, [tab]);

  const handleAddPickup = async () => {
    if (!pickupForm.name.trim() || !pickupForm.address.trim() || !pickupForm.city.trim()) {
      toast.error('Name, address and city required'); return;
    }
    setLoadingPickup(true);
    try {
      const res: any = await createPickupStation({
        name: pickupForm.name, address: pickupForm.address, city: pickupForm.city,
        state: pickupForm.state || undefined, country: pickupForm.country || 'Zambia',
        phone: pickupForm.phone || undefined, email: pickupForm.email || undefined,
        openingHours: pickupForm.openingHours || undefined, description: pickupForm.description || undefined,
        latitude: pickupForm.latitude ? Number(pickupForm.latitude) : undefined,
        longitude: pickupForm.longitude ? Number(pickupForm.longitude) : undefined,
        image: pickupForm.image || undefined,
        isActive: pickupForm.status === 'Active',
      });
      const id = res?.data?.id || String(Date.now());
      setPickups(d => [...d, { id, ...pickupForm }]);
      toast.success('Pickup station added');
      setAddPickupOpen(false);
      setPickupForm({ ...EMPTY_PICKUP });
    } catch { toast.error('Failed to add pickup station'); }
    setLoadingPickup(false);
  };

  const handleEditPickup = async () => {
    if (!editPickup) return;
    setLoadingPickup(true);
    try {
      await updatePickupStation(editPickup.id, {
        name: pickupForm.name, address: pickupForm.address, city: pickupForm.city,
        state: pickupForm.state || undefined, country: pickupForm.country,
        phone: pickupForm.phone || undefined, email: pickupForm.email || undefined,
        openingHours: pickupForm.openingHours || undefined, description: pickupForm.description || undefined,
        latitude: pickupForm.latitude ? Number(pickupForm.latitude) : undefined,
        longitude: pickupForm.longitude ? Number(pickupForm.longitude) : undefined,
        image: pickupForm.image || undefined,
        isActive: pickupForm.status === 'Active',
      });
      setPickups(d => d.map(p => p.id === editPickup.id ? { ...p, ...pickupForm } : p));
      toast.success('Pickup station updated');
      setEditPickup(null);
    } catch { toast.error('Failed to update pickup station'); }
    setLoadingPickup(false);
  };

  const handleTogglePickup = async (p: PickupStation) => {
    const next = p.status !== 'Active';
    try {
      await togglePickupStation(p.id, next);
      setPickups(d => d.map(x => x.id === p.id ? { ...x, status: next ? 'Active' : 'Inactive' } : x));
      toast.success(next ? 'Station activated' : 'Station deactivated');
    } catch { toast.error('Failed to toggle status'); }
  };

  const handleDeletePickup = async () => {
    if (!deletePickup) return;
    setLoadingPickup(true);
    try {
      await deletePickupStation(deletePickup.id);
      setPickups(d => d.filter(p => p.id !== deletePickup.id));
      toast.success('Pickup station deleted');
      setDeletePickup(null);
    } catch { toast.error('Failed to delete pickup station'); }
    setLoadingPickup(false);
  };

  // ── Columns ────────────────────────────────────────────────
  const countryColumns: Column[] = [
    { key: 'flag',   label: '', render: (v) => <span style={{ fontSize: '20px' }}>{String(v || '🌍')}</span>, width: '40px' },
    { key: 'code',   label: 'Code', render: (v) => <span style={{ fontWeight: 700, color: '#1FA89A', fontSize: '13px' }}>{String(v)}</span>, width: '70px' },
    { key: 'name',   label: 'Country', render: (v) => <span style={{ fontWeight: 600, color: textMain }}>{String(v)}</span> },
    { key: 'currency', label: 'Currency', render: (v, row) => { const r = row as unknown as Country; return <span style={{ color: textMain }}><b>{String(v)}</b> {r.symbol}</span>; } },
    { key: 'shippingEnabled', label: 'Shipping', render: (v) => <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: v ? 'rgba(31,168,154,0.12)' : 'rgba(239,68,68,0.1)', color: v ? '#1FA89A' : '#ef4444' }}>{v ? 'Enabled' : 'Disabled'}</span> },
    { key: 'status', label: 'Status', render: (v) => <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: v === 'Active' ? 'rgba(31,168,154,0.12)' : 'rgba(100,116,139,0.1)', color: v === 'Active' ? '#1FA89A' : '#8E9AAF' }}>{String(v)}</span> },
    { key: 'isDefault', label: 'Default', render: (v) => v ? <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '12px' }}>★ Default</span> : <span style={{ color: textMuted, fontSize: '12px' }}>—</span> },
  ];

  const stateColumns: Column[] = [
    { key: 'name',        label: 'State / Province', render: (v) => <span style={{ fontWeight: 600, color: textMain }}>{String(v)}</span> },
    { key: 'code',        label: 'Code', render: (v) => <span style={{ color: '#1FA89A', fontWeight: 700, fontSize: '12px' }}>{String(v) || '—'}</span>, width: '70px' },
    { key: 'countryName', label: 'Country', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v) || '—'}</span> },
    { key: 'cities',      label: 'Cities', render: (v) => <span style={{ fontWeight: 600, color: '#6366f1' }}>{String(v)}</span>, width: '70px' },
    { key: 'status',      label: 'Status', render: (v) => <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: v === 'Active' ? 'rgba(31,168,154,0.12)' : 'rgba(100,116,139,0.1)', color: v === 'Active' ? '#1FA89A' : '#8E9AAF' }}>{String(v)}</span> },
  ];

  const cityColumns: Column[] = [
    { key: 'name',      label: 'City', render: (v) => <span style={{ fontWeight: 600, color: textMain }}>{String(v)}</span> },
    { key: 'stateName', label: 'State / Province', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v) || '—'}</span> },
    { key: 'status',    label: 'Status', render: (v) => <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: v === 'Active' ? 'rgba(31,168,154,0.12)' : 'rgba(100,116,139,0.1)', color: v === 'Active' ? '#1FA89A' : '#8E9AAF' }}>{String(v)}</span> },
  ];

  const pickupColumns: Column[] = [
    { key: 'name',    label: 'Station Name', render: (v) => <span style={{ fontWeight: 600, color: textMain }}>{String(v)}</span> },
    { key: 'address', label: 'Address', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v).slice(0, 40)}</span> },
    { key: 'city',    label: 'City', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v)}</span> },
    { key: 'phone',   label: 'Phone', render: (v) => <span style={{ color: textMuted, fontSize: '12px' }}>{String(v) || '—'}</span> },
{
