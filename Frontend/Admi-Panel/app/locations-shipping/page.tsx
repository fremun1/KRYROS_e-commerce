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
  getShippingZones, createShippingZone, updateShippingZone, deleteShippingZone,
  getShippingMethods, createShippingMethod, updateShippingMethod, deleteShippingMethod,
  getStates, createState, updateState, deleteState,
  getCities, createCity, updateCity, deleteCity,
  getPickupStations, createPickupStation, updatePickupStation, togglePickupStation, deletePickupStation,
  getCountries,
} from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
type Zone = { id:string; name:string; region:string; countries:string; method:string; rate:string; minOrder:string; days:string; status:string };
type ShippingMethod = { id:string; name:string; description:string; fee:string; minThreshold:string; estimatedDays:string; sortOrder:string; status:string };
type StateRow = { id:string; name:string; code:string; countryId:string; countryName:string; status:string; cities:number };
type CityRow = { id:string; name:string; stateId:string; stateName:string; status:string };
type PickupStation = { id:string; name:string; address:string; city:string; state:string; country:string; phone:string; email:string; openingHours:string; description:string; latitude:string; longitude:string; status:string; image:string };

const EMPTY_ZONE = { name:'', region:'', countries:'', method:'Standard', rate:'0', minOrder:'0', days:'', status:'Active' };
const EMPTY_METHOD = { name:'', description:'', fee:'0', minThreshold:'0', estimatedDays:'', sortOrder:'0', status:'Active' };
const EMPTY_STATE = { name:'', code:'', countryId:'', countryName:'', status:'Active', cities:0 };
const EMPTY_CITY = { name:'', stateId:'', stateName:'', status:'Active' };
const EMPTY_PICKUP = { name:'', address:'', city:'', state:'', country:'Zambia', phone:'', email:'', openingHours:'', description:'', latitude:'', longitude:'', status:'Active', image:'' };

const METHODS_LIST = ['Standard','Express','International','Free','Pickup'];

function ShippingContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#101826' : '#F1F5F9';

  type Tab = 'zones'|'methods'|'states'|'cities'|'pickups';
  const [tab, setTab] = useState<Tab>('zones');

  // ── Countries list (for State dropdown) ──
  const [countriesList, setCountriesList] = useState<{id:string;name:string}[]>([]);
  const [statesList, setStatesList] = useState<{id:string;name:string}[]>([]);
  useEffect(() => {
    getCountries().then((r:any) => {
      const raw = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setCountriesList(raw.map((c:any)=>({id:c.id,name:c.name})));
    }).catch(()=>{});
  }, []);

  // ── ZONES ─────────────────────────────────────────────────
  const [zones, setZones] = useState<Zone[]>([]);
  const [addZoneOpen, setAddZoneOpen] = useState(false);
  const [editZone, setEditZone] = useState<Zone|null>(null);
  const [deleteZone, setDeleteZone] = useState<Zone|null>(null);
  const [zoneForm, setZoneForm] = useState({...EMPTY_ZONE});
  const [loadingZone, setLoadingZone] = useState(false);
  const zfp = (k:string)=>(v:string)=>setZoneForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    if(tab!=='zones') return;
    getShippingZones({ limit:200 }).then((r:any)=>{
      const raw = Array.isArray(r.data?.data)?r.data.data:Array.isArray(r.data)?r.data:[];
      setZones(raw.map((z:any)=>({
        id:z.id||'', name:z.name||'', region:z.region||z.type||'',
        countries:Array.isArray(z.countries)?z.countries.join(', '):(z.countries||''),
        method:z.shippingMethod||z.method||'Standard',
        rate:z.rate?String(z.rate):'0', minOrder:z.minOrder?String(z.minOrder):'0',
        days:z.estimatedDays||z.days||'', status:z.isActive!==false?'Active':'Inactive',
      })));
    }).catch(()=>{});
  },[tab]);

  const handleAddZone = async()=>{
    if(!zoneForm.name.trim()){toast.error('Zone name required');return;}
    setLoadingZone(true);
    try{
      const res:any = await createShippingZone({ name:zoneForm.name, isActive:zoneForm.status==='Active', region:zoneForm.region||undefined, shippingMethod:zoneForm.method||undefined, rate:zoneForm.rate?Number(zoneForm.rate):undefined, minOrder:zoneForm.minOrder?Number(zoneForm.minOrder):undefined });
      const id=(res as any)?.data?.id||String(Date.now());
      setZones(d=>[...d,{id,...zoneForm}]);
      toast.success('Zone added'); setAddZoneOpen(false); setZoneForm({...EMPTY_ZONE});
    }catch{toast.error('Failed to add zone');}
    setLoadingZone(false);
  };

  const handleEditZone = async()=>{
    if(!editZone) return;
    setLoadingZone(true);
    try{
      await updateShippingZone(editZone.id,{name:zoneForm.name,isActive:zoneForm.status==='Active',region:zoneForm.region||undefined,shippingMethod:zoneForm.method||undefined,rate:zoneForm.rate?Number(zoneForm.rate):undefined,minOrder:zoneForm.minOrder?Number(zoneForm.minOrder):undefined});
      setZones(d=>d.map(z=>z.id===editZone.id?{...z,...zoneForm}:z));
      toast.success('Zone updated'); setEditZone(null);
    }catch{toast.error('Failed to update zone');}
    setLoadingZone(false);
  };

  const handleDeleteZone = async()=>{
    if(!deleteZone) return;
    setLoadingZone(true);
    try{
      await deleteShippingZone(deleteZone.id);
      setZones(d=>d.filter(z=>z.id!==deleteZone.id));
      toast.success('Zone deleted'); setDeleteZone(null);
    }catch{toast.error('Failed to delete zone');}
    setLoadingZone(false);
  };

  // ── SHIPPING METHODS ────────────────────────────────────────
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [editMethod, setEditMethod] = useState<ShippingMethod|null>(null);
  const [deleteMethod, setDeleteMethod] = useState<ShippingMethod|null>(null);
  const [methodForm, setMethodForm] = useState({...EMPTY_METHOD});
  const [loadingMethod, setLoadingMethod] = useState(false);
  const mfp = (k:string)=>(v:string)=>setMethodForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    if(tab!=='methods') return;
    getShippingMethods().then((r:any)=>{
      const raw=Array.isArray(r.data?.data)?r.data.data:Array.isArray(r.data)?r.data:[];
      setMethods(raw.map((m:any)=>({
        id:m.id||'', name:m.name||'', description:m.description||'',
        fee:String(m.fee||0), minThreshold:String(m.minThreshold||0),
        estimatedDays:m.estimatedDays||'', sortOrder:String(m.sortOrder||0),
        status:m.isActive!==false?'Active':'Inactive',
      })));
    }).catch(()=>{});
  },[tab]);

  const handleAddMethod = async()=>{
    if(!methodForm.name.trim()){toast.error('Method name required');return;}
    setLoadingMethod(true);
    try{
      const res:any = await createShippingMethod({name:methodForm.name,description:methodForm.description||undefined,fee:Number(methodForm.fee)||0,minThreshold:Number(methodForm.minThreshold)||0,estimatedDays:methodForm.estimatedDays||undefined,isActive:methodForm.status==='Active',sortOrder:Number(methodForm.sortOrder)||0});
      const id=(res as any)?.data?.id||String(Date.now());
      setMethods(d=>[...d,{id,...methodForm}]);
      toast.success('Shipping method added'); setAddMethodOpen(false); setMethodForm({...EMPTY_METHOD});
    }catch{toast.error('Failed to add method');}
    setLoadingMethod(false);
  };

  const handleEditMethod = async()=>{
    if(!editMethod) return;
    setLoadingMethod(true);
    try{
      await updateShippingMethod(editMethod.id,{name:methodForm.name,description:methodForm.description||undefined,fee:Number(methodForm.fee),minThreshold:Number(methodForm.minThreshold),estimatedDays:methodForm.estimatedDays||undefined,isActive:methodForm.status==='Active',sortOrder:Number(methodForm.sortOrder)});
      setMethods(d=>d.map(m=>m.id===editMethod.id?{...m,...methodForm}:m));
      toast.success('Method updated'); setEditMethod(null);
    }catch{toast.error('Failed to update method');}
    setLoadingMethod(false);
  };

  const handleDeleteMethod = async()=>{
    if(!deleteMethod) return;
    setLoadingMethod(true);
    try{
      await deleteShippingMethod(deleteMethod.id);
      setMethods(d=>d.filter(m=>m.id!==deleteMethod.id));
      toast.success('Method deleted'); setDeleteMethod(null);
    }catch{toast.error('Failed to delete method');}
    setLoadingMethod(false);
  };

  // ── STATES ─────────────────────────────────────────────────
  const [states, setStates] = useState<StateRow[]>([]);
  const [addStateOpen, setAddStateOpen] = useState(false);
  const [editState, setEditState] = useState<StateRow|null>(null);
  const [deleteState_row, setDeleteState] = useState<StateRow|null>(null);
  const [stateForm, setStateForm] = useState({...EMPTY_STATE});
  const [loadingState, setLoadingState] = useState(false);
  const sfp = (k:string)=>(v:string)=>setStateForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    if(tab!=='states') return;
    getStates().then((r:any)=>{
      const raw=Array.isArray(r.data?.data)?r.data.data:Array.isArray(r.data)?r.data:[];
      setStates(raw.map((s:any)=>({
        id:s.id||'', name:s.name||'', code:s.code||'',
        countryId:s.countryId||'', countryName:s.country?.name||'',
        status:s.isActive!==false?'Active':'Inactive',
        cities:s._count?.cities??0,
      })));
    }).catch(()=>{});
  },[tab]);

  const handleAddState = async()=>{
    if(!stateForm.name.trim()||!stateForm.countryId){toast.error('Name and country required');return;}
    setLoadingState(true);
    try{
      const res:any = await createState({name:stateForm.name,code:stateForm.code||undefined,countryId:stateForm.countryId,isActive:stateForm.status==='Active'});
      const id=(res as any)?.data?.id||String(Date.now());
      setStates(d=>[...d,{id,...stateForm}]);
      toast.success('State/Province added'); setAddStateOpen(false); setStateForm({...EMPTY_STATE});
    }catch(e:any){toast.error(e?.response?.data?.message||'Failed to add state');}
    setLoadingState(false);
  };

  const handleEditState = async()=>{
    if(!editState) return;
    setLoadingState(true);
    try{
      await updateState(editState.id,{name:stateForm.name,code:stateForm.code||undefined,isActive:stateForm.status==='Active'});
      setStates(d=>d.map(s=>s.id===editState.id?{...s,...stateForm}:s));
      toast.success('State updated'); setEditState(null);
    }catch{toast.error('Failed to update state');}
    setLoadingState(false);
  };

  const handleDeleteState = async()=>{
    if(!deleteState_row) return;
    setLoadingState(true);
    try{
      await deleteState(deleteState_row.id);
      setStates(d=>d.filter(s=>s.id!==deleteState_row.id));
      toast.success('State deleted'); setDeleteState(null);
    }catch{toast.error('Failed to delete state');}
    setLoadingState(false);
  };

  // ── CITIES ─────────────────────────────────────────────────
  const [cities, setCities] = useState<CityRow[]>([]);
  const [addCityOpen, setAddCityOpen] = useState(false);
  const [editCity, setEditCity] = useState<CityRow|null>(null);
  const [deleteCity_row, setDeleteCity] = useState<CityRow|null>(null);
  const [cityForm, setCityForm] = useState({...EMPTY_CITY});
  const [loadingCity, setLoadingCity] = useState(false);
  const cyfp = (k:string)=>(v:string)=>setCityForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    if(tab!=='cities') return;
    getCities().then((r:any)=>{
      const raw=Array.isArray(r.data?.data)?r.data.data:Array.isArray(r.data)?r.data:[];
      setCities(raw.map((c:any)=>({
        id:c.id||'', name:c.name||'',
        stateId:c.stateId||'', stateName:c.state?.name||'',
        status:c.isActive!==false?'Active':'Inactive',
      })));
    }).catch(()=>{});
    getStates().then((r:any)=>{
      const raw=Array.isArray(r.data?.data)?r.data.data:Array.isArray(r.data)?r.data:[];
      setStatesList(raw.map((s:any)=>({id:s.id,name:s.name})));
    }).catch(()=>{});
  },[tab]);

  const handleAddCity = async()=>{
    if(!cityForm.name.trim()||!cityForm.stateId){toast.error('Name and state required');return;}
    setLoadingCity(true);
    try{
      const res:any = await createCity({name:cityForm.name,stateId:cityForm.stateId,isActive:cityForm.status==='Active'});
      const id=(res as any)?.data?.id||String(Date.now());
      setCities(d=>[...d,{id,...cityForm}]);
      toast.success('City added'); setAddCityOpen(false); setCityForm({...EMPTY_CITY});
    }catch(e:any){toast.error(e?.response?.data?.message||'Failed to add city');}
    setLoadingCity(false);
  };

  const handleEditCity = async()=>{
    if(!editCity) return;
    setLoadingCity(true);
    try{
      await updateCity(editCity.id,{name:cityForm.name,isActive:cityForm.status==='Active'});
      setCities(d=>d.map(c=>c.id===editCity.id?{...c,...cityForm}:c));
      toast.success('City updated'); setEditCity(null);
    }catch{toast.error('Failed to update city');}
    setLoadingCity(false);
  };

  const handleDeleteCity = async()=>{
    if(!deleteCity_row) return;
    setLoadingCity(true);
    try{
      await deleteCity(deleteCity_row.id);
      setCities(d=>d.filter(c=>c.id!==deleteCity_row.id));
      toast.success('City deleted'); setDeleteCity(null);
    }catch{toast.error('Failed to delete city');}
    setLoadingCity(false);
  };

  // ── PICKUP STATIONS ─────────────────────────────────────────
  const [pickups, setPickups] = useState<PickupStation[]>([]);
  const [addPickupOpen, setAddPickupOpen] = useState(false);
  const [editPickup, setEditPickup] = useState<PickupStation|null>(null);
  const [deletePickup, setDeletePickup] = useState<PickupStation|null>(null);
  const [pickupForm, setPickupForm] = useState({...EMPTY_PICKUP});
  const [loadingPickup, setLoadingPickup] = useState(false);
  const pfp = (k:string)=>(v:string)=>setPickupForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    if(tab!=='pickups') return;
    getPickupStations().then((r:any)=>{
      const raw=Array.isArray(r.data?.data)?r.data.data:Array.isArray(r.data)?r.data:[];
      setPickups(raw.map((p:any)=>({
        id:p.id||'', name:p.name||'', address:p.address||'',
        city:p.city||'', state:p.state||'', country:p.country||'Zambia',
        phone:p.phone||'', email:p.email||'',
        openingHours:p.openingHours||'', description:p.description||'',
        latitude:p.latitude?String(p.latitude):'', longitude:p.longitude?String(p.longitude):'',
        status:p.isActive!==false?'Active':'Inactive',
      })));
    }).catch(()=>{});
  },[tab]);

  const handleAddPickup = async()=>{
    if(!pickupForm.name.trim()||!pickupForm.address.trim()||!pickupForm.city.trim()){toast.error('Name, address and city required');return;}
    setLoadingPickup(true);
    try{
      const res:any = await createPickupStation({
        name:pickupForm.name, address:pickupForm.address, city:pickupForm.city,
        state:pickupForm.state||undefined, country:pickupForm.country||'Zambia',
        phone:pickupForm.phone||undefined, email:pickupForm.email||undefined,
        openingHours:pickupForm.openingHours||undefined, description:pickupForm.description||undefined,
        latitude:pickupForm.latitude?Number(pickupForm.latitude):undefined,
        longitude:pickupForm.longitude?Number(pickupForm.longitude):undefined,
        image:pickupForm.image||undefined,
        isActive:pickupForm.status==='Active',
      });
      const id=(res as any)?.data?.id||String(Date.now());
      setPickups(d=>[...d,{id,...pickupForm}]);
      toast.success('Pickup station added'); setAddPickupOpen(false); setPickupForm({...EMPTY_PICKUP});
    }catch{toast.error('Failed to add pickup station');}
    setLoadingPickup(false);
  };

  const handleEditPickup = async()=>{
    if(!editPickup) return;
    setLoadingPickup(true);
    try{
      await updatePickupStation(editPickup.id,{
        name:pickupForm.name, address:pickupForm.address, city:pickupForm.city,
        state:pickupForm.state||undefined, country:pickupForm.country,
        phone:pickupForm.phone||undefined, email:pickupForm.email||undefined,
        openingHours:pickupForm.openingHours||undefined, description:pickupForm.description||undefined,
        latitude:pickupForm.latitude?Number(pickupForm.latitude):undefined,
        longitude:pickupForm.longitude?Number(pickupForm.longitude):undefined,
        image:pickupForm.image||undefined,
        isActive:pickupForm.status==='Active',
      });
      setPickups(d=>d.map(p=>p.id===editPickup.id?{...p,...pickupForm}:p));
      toast.success('Pickup station updated'); setEditPickup(null);
    }catch{toast.error('Failed to update pickup station');}
    setLoadingPickup(false);
  };

  const handleTogglePickup = async(p:PickupStation)=>{
    const next = p.status!=='Active';
    try{
      await togglePickupStation(p.id, next);
      setPickups(d=>d.map(x=>x.id===p.id?{...x,status:next?'Active':'Inactive'}:x));
      toast.success(next?'Station activated':'Station deactivated');
    }catch{toast.error('Failed to toggle status');}
  };

  const handleDeletePickup = async()=>{
    if(!deletePickup) return;
    setLoadingPickup(true);
    try{
      await deletePickupStation(deletePickup.id);
      setPickups(d=>d.filter(p=>p.id!==deletePickup.id));
      toast.success('Pickup station deleted'); setDeletePickup(null);
    }catch{toast.error('Failed to delete pickup station');}
    setLoadingPickup(false);
  };

  // ── Columns ─────────────────────────────────────────────────
  const zoneColumns: Column[] = [
    {key:'name',label:'Zone Name',render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span>},
    {key:'region',label:'Region',render:(v)=><span style={{color:textMuted,fontSize:'12px'}}>{String(v)||'—'}</span>},
    {key:'method',label:'Method',render:(v)=><span style={{color:textMain,fontSize:'12px'}}>{String(v)||'—'}</span>},
    {key:'rate',label:'Rate',render:(v)=><span style={{fontWeight:600,color:'#1FA89A'}}>K{String(v)}</span>},
    {key:'minOrder',label:'Min Order',render:(v)=><span style={{color:textMuted,fontSize:'12px'}}>K{String(v)}</span>},
    {key:'days',label:'Est. Days',render:(v)=><span style={{color:textMuted,fontSize:'12px'}}>{String(v)||'—'}</span>},
    {key:'status',label:'Status',render:(v)=><span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:v==='Active'?'rgba(31,168,154,0.12)':'rgba(100,116,139,0.1)',color:v==='Active'?'#1FA89A':'#8E9AAF'}}>{String(v)}</span>},
  ];

  const methodColumns: Column[] = [
    {key:'name',label:'Name',render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span>},
    {key:'description',label:'Description',render:(v)=><span style={{color:textMuted,fontSize:'12px'}}>{String(v).slice(0,40)||'—'}</span>},
    {key:'fee',label:'Fee',render:(v)=><span style={{fontWeight:600,color:'#1FA89A'}}>K{String(v)}</span>},
    {key:'minThreshold',label:'Free Ship Above',render:(v)=><span style={{color:textMuted,fontSize:'12px'}}>{Number(v)>0?`K${v}`:'—'}</span>},
    {key:'estimatedDays',label:'Est. Days',render:(v)=><span style={{color:textMuted,fontSize:'12px'}}>{String(v)||'—'}</span>},
    {key:'status',label:'Status',render:(v)=><span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:v==='Active'?'rgba(31,168,154,0.12)':'rgba(100,116,139,0.1)',color:v==='Active'?'#1FA89A':'#8E9AAF'}}>{String(v)}</span>},
  ];

  const stateColumns: Column[] = [
    {key:'name',label:'State / Province',render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span>},
    {key:'code',label:'Code',render:(v)=><span style={{color:'#1FA89A',fontWeight:700,fontSize:'12px'}}>{String(v)||'—'}</span>,width:'70px'},
    {key:'countryName',label:'Country',render:(v)=><span style={{color:textMuted,fontSize:'12px'}}>{String(v)||'—'}</span>},
    {key:'cities',label:'Cities',render:(v)=><span style={{fontWeight:600,color:'#6366f1'}}>{String(v)}</span>,width:'70px'},
    {key:'status',label:'Status',render:(v)=><span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:v==='Active'?'rgba(31,168,154,0.12)':'rgba(100,116,139,0.1)',color:v==='Active'?'#1FA89A':'#8E9AAF'}}>{String(v)}</span>},
  ];

  const cityColumns: Column[] = [
    {key:'name',label:'City',render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span>},
    {key:'stateName',label:'State / Province',render:(v)=><span style={{color:textMuted,fontSize:'12px'}}>{String(v)||'—'}</span>},
    {key:'status',label:'Status',render:(v)=><span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:v==='Active'?'rgba(31,168,154,0.12)':'rgba(100,116,139,0.1)',color:v==='Active'?'#1FA89A':'#8E9AAF'}}>{String(v)}</span>},
  ];

  const pickupColumns: Column[] = [
    {key:'name',label:'Station Name',render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span>},
    {key:'address',label:'Address',render:(v)=><span style={{color:textMuted,fontSize:'12px'}}>{String(v).slice(0,40)}</span>},
    {key:'city',label:'City',render:(v)=><span style={{color:textMuted,fontSize:'12px'}}>{String(v)}</span>},
    {key:'phone',label:'Phone',render:(v)=><span style={{color:textMuted,fontSize:'12px'}}>{String(v)||'—'}</span>},
    {key:'openingHours',label:'Hours',render:(v)=><span style={{color:textMuted,fontSize:'12px'}}>{String(v)||'—'}</span>},
    {key:'status',label:'Status',render:(v,row)=>{
      const p=row as unknown as PickupStation;
      return(
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:v==='Active'?'rgba(31,168,154,0.12)':'rgba(100,116,139,0.1)',color:v==='Active'?'#1FA89A':'#8E9AAF'}}>{String(v)}</span>
          <button onClick={()=>handleTogglePickup(p)} style={{fontSize:'11px',padding:'3px 8px',borderRadius:'6px',border:'1px solid rgba(99,102,241,0.3)',background:'rgba(99,102,241,0.08)',color:'#818cf8',cursor:'pointer',fontWeight:600}}>
            {v==='Active'?'Deactivate':'Activate'}
          </button>
        </div>
      );
    }},
  ];

  const tabStyle = (active:boolean)=>({
    padding:'8px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',
    background:active?'#1FA89A':'transparent',color:active?'#fff':textMuted,border:'none',
  });

  const TAB_CONFIG: {key:Tab;label:string;count?:number}[] = [
    {key:'zones',label:'Shipping Zones',count:zones.length},
    {key:'methods',label:'Shipping Methods',count:methods.length},
    {key:'states',label:'States / Provinces',count:states.length},
    {key:'cities',label:'Cities',count:cities.length},
    {key:'pickups',label:'Pickup Stations',count:pickups.length},
  ];

  const ADD_LABELS: Record<Tab,string> = {zones:'Add Zone',methods:'Add Method',states:'Add State',cities:'Add City',pickups:'Add Pickup Station'};
  const ADD_HANDLERS: Record<Tab,()=>void> = {
    zones:()=>{setZoneForm({...EMPTY_ZONE});setAddZoneOpen(true);},
    methods:()=>{setMethodForm({...EMPTY_METHOD});setAddMethodOpen(true);},
    states:()=>{setStateForm({...EMPTY_STATE});setAddStateOpen(true);},
    cities:()=>{setCityForm({...EMPTY_CITY});setAddCityOpen(true);},
    pickups:()=>{setPickupForm({...EMPTY_PICKUP});setAddPickupOpen(true);},
  };

  return (
    <div>
      <PageHeader title="Locations & Shipping" subtitle="Manage shipping zones, methods, states, cities and pickup stations" icon={MapPin} onAdd={ADD_HANDLERS[tab]} addLabel={ADD_LABELS[tab]} />

      {/* Tabs */}
      <div style={{display:'flex',gap:'6px',marginBottom:'20px',flexWrap:'wrap'}}>
        {TAB_CONFIG.map(t=>(
          <button key={t.key} style={tabStyle(tab===t.key)} onClick={()=>setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ZONES ── */}
      {tab==='zones' && (
        <>
          <DataTable columns={zoneColumns} data={zones as unknown as Record<string,unknown>[]} searchPlaceholder="Search zones..." onEdit={(row)=>{const z=row as unknown as Zone;setZoneForm({name:z.name,region:z.region,countries:z.countries,method:z.method,rate:z.rate,minOrder:z.minOrder,days:z.days,status:z.status});setEditZone(z);}} onDelete={(row)=>setDeleteZone(row as unknown as Zone)} />
          <Modal open={addZoneOpen} onClose={()=>setAddZoneOpen(false)} title="Add Shipping Zone">
            <FormField label="Zone Name *" value={zoneForm.name} onChange={zfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Lusaka Zone"/>
            <FormField label="Region / Area" value={zoneForm.region} onChange={zfp('region')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Central Province"/>
            <FormField label="Countries Covered (comma-separated)" value={zoneForm.countries} onChange={zfp('countries')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Zambia"/>
            <FormField label="Default Shipping Method" value={zoneForm.method} onChange={zfp('method')} options={METHODS_LIST} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Shipping Rate (K)" value={zoneForm.rate} onChange={zfp('rate')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0"/>
            <FormField label="Minimum Order (K)" value={zoneForm.minOrder} onChange={zfp('minOrder')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0"/>
            <FormField label="Estimated Delivery Days" value={zoneForm.days} onChange={zfp('days')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 2-3 days"/>
            <FormField label="Status" value={zoneForm.status} onChange={zfp('status')} options={['Active','Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <ModalFooter onClose={()=>setAddZoneOpen(false)} onSubmit={handleAddZone} loading={loadingZone} submitLabel="Add Zone" isDark={isDark} border={border} textMain={textMain}/>
          </Modal>
          <Modal open={!!editZone} onClose={()=>setEditZone(null)} title={`Edit Zone: ${editZone?.name??''}`}>
            <FormField label="Zone Name *" value={zoneForm.name} onChange={zfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Region / Area" value={zoneForm.region} onChange={zfp('region')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Countries Covered" value={zoneForm.countries} onChange={zfp('countries')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Default Shipping Method" value={zoneForm.method} onChange={zfp('method')} options={METHODS_LIST} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Shipping Rate (K)" value={zoneForm.rate} onChange={zfp('rate')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Minimum Order (K)" value={zoneForm.minOrder} onChange={zfp('minOrder')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Estimated Delivery Days" value={zoneForm.days} onChange={zfp('days')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Status" value={zoneForm.status} onChange={zfp('status')} options={['Active','Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <ModalFooter onClose={()=>setEditZone(null)} onSubmit={handleEditZone} loading={loadingZone} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain}/>
          </Modal>
          <ConfirmDialog open={!!deleteZone} onClose={()=>setDeleteZone(null)} onConfirm={handleDeleteZone} loading={loadingZone} title="Delete Zone" message={`Delete "${deleteZone?.name}" permanently?`}/>
        </>
      )}

      {/* ── SHIPPING METHODS ── */}
      {tab==='methods' && (
        <>
          <DataTable columns={methodColumns} data={methods as unknown as Record<string,unknown>[]} searchPlaceholder="Search methods..." onEdit={(row)=>{const m=row as unknown as ShippingMethod;setMethodForm({name:m.name,description:m.description,fee:m.fee,minThreshold:m.minThreshold,estimatedDays:m.estimatedDays,sortOrder:m.sortOrder,status:m.status});setEditMethod(m);}} onDelete={(row)=>setDeleteMethod(row as unknown as ShippingMethod)}/>
          <Modal open={addMethodOpen} onClose={()=>setAddMethodOpen(false)} title="Add Shipping Method">
            <FormField label="Method Name *" value={methodForm.name} onChange={mfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Standard Delivery"/>
            <FormField label="Description" value={methodForm.description} onChange={mfp('description')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Brief description"/>
            <FormField label="Fee (K)" value={methodForm.fee} onChange={mfp('fee')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0"/>
            <FormField label="Free Shipping Above (K)" value={methodForm.minThreshold} onChange={mfp('minThreshold')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0 = never free"/>
            <FormField label="Estimated Delivery Days" value={methodForm.estimatedDays} onChange={mfp('estimatedDays')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 2-3 business days"/>
            <FormField label="Sort Order" value={methodForm.sortOrder} onChange={mfp('sortOrder')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="0"/>
            <FormField label="Status" value={methodForm.status} onChange={mfp('status')} options={['Active','Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <ModalFooter onClose={()=>setAddMethodOpen(false)} onSubmit={handleAddMethod} loading={loadingMethod} submitLabel="Add Method" isDark={isDark} border={border} textMain={textMain}/>
          </Modal>
          <Modal open={!!editMethod} onClose={()=>setEditMethod(null)} title={`Edit: ${editMethod?.name??''}`}>
            <FormField label="Method Name *" value={methodForm.name} onChange={mfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Description" value={methodForm.description} onChange={mfp('description')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Fee (K)" value={methodForm.fee} onChange={mfp('fee')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Free Shipping Above (K)" value={methodForm.minThreshold} onChange={mfp('minThreshold')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Estimated Delivery Days" value={methodForm.estimatedDays} onChange={mfp('estimatedDays')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Sort Order" value={methodForm.sortOrder} onChange={mfp('sortOrder')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Status" value={methodForm.status} onChange={mfp('status')} options={['Active','Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <ModalFooter onClose={()=>setEditMethod(null)} onSubmit={handleEditMethod} loading={loadingMethod} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain}/>
          </Modal>
          <ConfirmDialog open={!!deleteMethod} onClose={()=>setDeleteMethod(null)} onConfirm={handleDeleteMethod} loading={loadingMethod} title="Delete Method" message={`Delete "${deleteMethod?.name}" permanently?`}/>
        </>
      )}

      {/* ── STATES ── */}
      {tab==='states' && (
        <>
          <DataTable columns={stateColumns} data={states as unknown as Record<string,unknown>[]} searchPlaceholder="Search states..." onEdit={(row)=>{const s=row as unknown as StateRow;setStateForm({name:s.name,code:s.code,countryId:s.countryId,countryName:s.countryName,status:s.status,cities:s.cities});setEditState(s);}} onDelete={(row)=>setDeleteState(row as unknown as StateRow)}/>
          <Modal open={addStateOpen} onClose={()=>setAddStateOpen(false)} title="Add State / Province">
            <FormField label="State / Province Name *" value={stateForm.name} onChange={sfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Lusaka Province"/>
            <FormField label="State Code" value={stateForm.code} onChange={sfp('code')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. LP"/>
            <div style={{marginBottom:'14px'}}>
              <div style={{fontSize:'12px',fontWeight:600,color:textMuted,marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Country *</div>
              <select value={stateForm.countryId} onChange={e=>{const c=countriesList.find(x=>x.id===e.target.value);sfp('countryId')(e.target.value);if(c)sfp('countryName')(c.name);}} style={{width:'100%',background:surface,border:`1px solid ${border}`,borderRadius:'9px',color:textMain,fontSize:'13.5px',outline:'none',padding:'10px 14px'}}>
                <option value="">Select country...</option>
                {countriesList.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <FormField label="Status" value={stateForm.status} onChange={sfp('status')} options={['Active','Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <ModalFooter onClose={()=>setAddStateOpen(false)} onSubmit={handleAddState} loading={loadingState} submitLabel="Add State" isDark={isDark} border={border} textMain={textMain}/>
          </Modal>
          <Modal open={!!editState} onClose={()=>setEditState(null)} title={`Edit State: ${editState?.name??''}`}>
            <FormField label="State / Province Name *" value={stateForm.name} onChange={sfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="State Code" value={stateForm.code} onChange={sfp('code')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Status" value={stateForm.status} onChange={sfp('status')} options={['Active','Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <ModalFooter onClose={()=>setEditState(null)} onSubmit={handleEditState} loading={loadingState} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain}/>
          </Modal>
          <ConfirmDialog open={!!deleteState_row} onClose={()=>setDeleteState(null)} onConfirm={handleDeleteState} loading={loadingState} title="Delete State" message={`Delete "${deleteState_row?.name}" and all its cities?`}/>
        </>
      )}

      {/* ── CITIES ── */}
      {tab==='cities' && (
        <>
          <DataTable columns={cityColumns} data={cities as unknown as Record<string,unknown>[]} searchPlaceholder="Search cities..." onEdit={(row)=>{const c=row as unknown as CityRow;setCityForm({name:c.name,stateId:c.stateId,stateName:c.stateName,status:c.status});setEditCity(c);}} onDelete={(row)=>setDeleteCity(row as unknown as CityRow)}/>
          <Modal open={addCityOpen} onClose={()=>setAddCityOpen(false)} title="Add City">
            <FormField label="City Name *" value={cityForm.name} onChange={cyfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Lusaka"/>
            <div style={{marginBottom:'14px'}}>
              <div style={{fontSize:'12px',fontWeight:600,color:textMuted,marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.05em'}}>State / Province *</div>
              <select value={cityForm.stateId} onChange={e=>{const s=statesList.find(x=>x.id===e.target.value);cyfp('stateId')(e.target.value);if(s)cyfp('stateName')(s.name);}} style={{width:'100%',background:surface,border:`1px solid ${border}`,borderRadius:'9px',color:textMain,fontSize:'13.5px',outline:'none',padding:'10px 14px'}}>
                <option value="">Select state...</option>
                {statesList.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <FormField label="Status" value={cityForm.status} onChange={cyfp('status')} options={['Active','Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <ModalFooter onClose={()=>setAddCityOpen(false)} onSubmit={handleAddCity} loading={loadingCity} submitLabel="Add City" isDark={isDark} border={border} textMain={textMain}/>
          </Modal>
          <Modal open={!!editCity} onClose={()=>setEditCity(null)} title={`Edit City: ${editCity?.name??''}`}>
            <FormField label="City Name *" value={cityForm.name} onChange={cyfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Status" value={cityForm.status} onChange={cyfp('status')} options={['Active','Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <ModalFooter onClose={()=>setEditCity(null)} onSubmit={handleEditCity} loading={loadingCity} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain}/>
          </Modal>
          <ConfirmDialog open={!!deleteCity_row} onClose={()=>setDeleteCity(null)} onConfirm={handleDeleteCity} loading={loadingCity} title="Delete City" message={`Delete "${deleteCity_row?.name}" permanently?`}/>
        </>
      )}

      {/* ── PICKUP STATIONS ── */}
      {tab==='pickups' && (
        <>
          <DataTable columns={pickupColumns} data={pickups as unknown as Record<string,unknown>[]} searchPlaceholder="Search pickup stations..." onEdit={(row)=>{const p=row as unknown as PickupStation;setPickupForm({name:p.name,address:p.address,city:p.city,state:p.state,country:p.country,phone:p.phone,email:p.email,openingHours:p.openingHours,description:p.description,latitude:p.latitude,longitude:p.longitude,status:p.status,image:p.image||''});setEditPickup(p);}} onDelete={(row)=>setDeletePickup(row as unknown as PickupStation)}/>
          <Modal open={addPickupOpen} onClose={()=>setAddPickupOpen(false)} title="Add Pickup Station">
            <FormField label="Station Name *" value={pickupForm.name} onChange={pfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Lusaka Central Pickup"/>
            <FormField label="Full Address *" value={pickupForm.address} onChange={pfp('address')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 12 Cairo Road, Lusaka"/>
            <FormField label="City *" value={pickupForm.city} onChange={pfp('city')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Lusaka"/>
            <FormField label="State / Province" value={pickupForm.state} onChange={pfp('state')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Lusaka Province"/>
            <FormField label="Country" value={pickupForm.country} onChange={pfp('country')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Zambia"/>
            <FormField label="Phone Number" value={pickupForm.phone} onChange={pfp('phone')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="+260..."/>
            <FormField label="Email Address" value={pickupForm.email} onChange={pfp('email')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="pickup@example.com"/>
            <FormField label="Opening Hours" value={pickupForm.openingHours} onChange={pfp('openingHours')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Mon–Fri 8am–6pm, Sat 9am–4pm"/>
            <FormField label="Description / Landmark" value={pickupForm.description} onChange={pfp('description')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Near Manda Hill Mall"/>
            <FormField label="Latitude (GPS)" value={pickupForm.latitude} onChange={pfp('latitude')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. -15.4166"/>
            <FormField label="Longitude (GPS)" value={pickupForm.longitude} onChange={pfp('longitude')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 28.2833"/>
            <div>
              <label style={{display:'block',fontSize:'11px',fontWeight:700,color:textMuted,marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Station Image</label>
              <CloudinaryUpload
                value={pickupForm.image}
                onChange={(url)=>pfp('image')(url)}
                folder="kryros/pickup-stations"
                accept="image/*"
                showUrlInput={true}
                isDark={isDark}
                border={border}
                surface={surface}
                textMuted={textMuted}
                textMain={textMain}
              />
            </div>
            <FormField label="Status" value={pickupForm.status} onChange={pfp('status')} options={['Active','Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <ModalFooter onClose={()=>setAddPickupOpen(false)} onSubmit={handleAddPickup} loading={loadingPickup} submitLabel="Add Station" isDark={isDark} border={border} textMain={textMain}/>
          </Modal>
          <Modal open={!!editPickup} onClose={()=>setEditPickup(null)} title={`Edit: ${editPickup?.name??''}`}>
            <FormField label="Station Name *" value={pickupForm.name} onChange={pfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Full Address *" value={pickupForm.address} onChange={pfp('address')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="City *" value={pickupForm.city} onChange={pfp('city')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="State / Province" value={pickupForm.state} onChange={pfp('state')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Country" value={pickupForm.country} onChange={pfp('country')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Phone Number" value={pickupForm.phone} onChange={pfp('phone')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Email Address" value={pickupForm.email} onChange={pfp('email')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Opening Hours" value={pickupForm.openingHours} onChange={pfp('openingHours')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Description / Landmark" value={pickupForm.description} onChange={pfp('description')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Latitude (GPS)" value={pickupForm.latitude} onChange={pfp('latitude')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Longitude (GPS)" value={pickupForm.longitude} onChange={pfp('longitude')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <FormField label="Status" value={pickupForm.status} onChange={pfp('status')} options={['Active','Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface}/>
            <ModalFooter onClose={()=>setEditPickup(null)} onSubmit={handleEditPickup} loading={loadingPickup} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain}/>
          </Modal>
          <ConfirmDialog open={!!deletePickup} onClose={()=>setDeletePickup(null)} onConfirm={handleDeletePickup} loading={loadingPickup} title="Delete Pickup Station" message={`Delete "${deletePickup?.name}" permanently?`}/>
        </>
      )}
    </div>
  );
}

export default function LocationsShippingPage() { return <AdminShell><ShippingContent /></AdminShell>; }
