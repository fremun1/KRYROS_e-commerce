'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import { Truck, Users, Star, Package, ChevronRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { getWholesaleAccounts, updateWholesaleAccountStatus, deleteWholesaleAccount, updateWholesaleAccount, getWholesaleDeals, createWholesaleDeal, updateWholesaleDeal, deleteWholesaleDeal, getProducts, createProduct, updateProduct, deleteProduct } from '@/lib/api';
import CloudinaryUpload from '@/components/ui/file-upload';

// ─── Types ────────────────────────────────────────────────
type Wholesale = { id:string; name:string; contact:string; phone:string; city:string; tier:string; credit:string; orders:number; totalSpent:string; status:string; joined:string };
type Deal = { id:string; title:string; description:string; discount:string; minOrder:string; validUntil:string; status:string };
type WholesaleProduct = { id:string; name:string; sku:string; price:string; moq:string; category:string; status:string };

// ─── Initial Data ─────────────────────────────────────────
// Partners loaded from API
// Deals loaded from API
// Products loaded from API
const TIERS = ['Bronze','Silver','Gold','Platinum'];
const PARTNER_STATUSES = ['Active','Inactive','Pending','Suspended'];

function WholesaleContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#101826' : '#F1F5F9';

  type Section = null | 'accounts' | 'deals' | 'inventory';
  const [section, setSection] = useState<Section>(null);

  // Partners state
  const [partners, setPartners] = useState<Wholesale[]>([]);
  useEffect(() => {
    getWholesaleAccounts({ limit: 200 }).then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      const normalized: Wholesale[] = raw.map((w: any) => ({
        id: w.id || '',
        name: w.companyName || w.businessName || (w.user ? [w.user.firstName, w.user.lastName].filter(Boolean).join(' ') : 'Partner'),
        contact: w.user?.email || w.contact || '',
        phone: w.user?.phone || w.phone || '',
        city: w.city || '',
        tier: w.tierName || (w.discountTier===1?'Bronze':w.discountTier===2?'Silver':w.discountTier===3?'Gold':'Platinum') || 'Bronze',
        credit: w.creditLimit ? `K${Number(w.creditLimit).toLocaleString()}` : '$0',
        orders: w._count?.orders ?? 0,
        totalSpent: '$0',
        status: w.status === 'ACTIVE' || w.status === 'APPROVED' ? 'Active' : w.status === 'PENDING' ? 'Pending' : 'Inactive',
        joined: w.createdAt ? w.createdAt.split('T')[0] : '',
      }));
      setPartners(normalized);
    }).catch(() => {});
  }, []);
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<Wholesale|null>(null);
  const [deletePartner, setDeletePartner] = useState<Wholesale|null>(null);
  const [viewPartner, setViewPartner] = useState<Wholesale|null>(null);
  const [pForm, setPForm] = useState({ name:'', contact:'', status:'Active', tier:'Bronze' });
  const pfp = (k:string) => (v:string) => setPForm(f=>({...f,[k]:v}));

  // Deals state
  const [deals, setDeals] = useState<Deal[]>([]);
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal|null>(null);
  const [deleteDeal, setDeleteDeal] = useState<Deal|null>(null);
  const [dForm, setDForm] = useState({ title:'', description:'', discount:'', minOrder:'', validUntil:'', status:'Active' });
  const dfp = (k:string) => (v:string) => setDForm(f=>({...f,[k]:v}));

  // Inventory state
  const [inventory, setInventory] = useState<WholesaleProduct[]>([]);
  const [addInvOpen, setAddInvOpen] = useState(false);
  const [editInv, setEditInv] = useState<WholesaleProduct|null>(null);
  const [deleteInv, setDeleteInv] = useState<WholesaleProduct|null>(null);
  const [iForm, setIForm] = useState({ 
    name:'', sku:'', price:'', moq:'', category:'Electronics', status:'Active',
    description: '', imageUrl: '', images: [] as string[], specifications: ''
  });
  const [invImages, setInvImages] = useState<string[]>([]);
  const ifp = (k:string) => (v:string) => setIForm(f=>({...f,[k]:v}));

  const loadWholesaleProducts = () => {
    getProducts({ isWholesaleOnly: 'true', take: 100 }).then(r => {
      const raw = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
      setInventory(raw.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.wholesalePrice ? `K${Number(p.wholesalePrice).toLocaleString()}` : (p.price ? `K${Number(p.price).toLocaleString()}` : '$0'),
        moq: `${p.wholesaleMoq || 1} units`,
        category: p.category?.name || 'General',
        status: p.isActive !== false ? 'Active' : 'Inactive',
        // extra data for editing
        description: p.description || '',
        imageUrl: p.images?.[0]?.url || p.images?.[0] || '',
        images: Array.isArray(p.images) ? p.images.map((img: any) => img?.url || img || '').filter(Boolean) : [],
        specifications: p.specifications || '',
        rawPrice: p.wholesalePrice || p.price || 0,
        rawMoq: p.wholesaleMoq || 1
      })));
    });
  };

  useEffect(() => {
    if (section === 'inventory') loadWholesaleProducts();
  }, [section]);

  const tierColor = (t:string) => ({
    Platinum:{bg:'rgba(139,92,246,0.12)',color:'#8b5cf6'},
    Gold:{bg:'rgba(255,193,7,0.12)',color:'#FFC107'},
    Silver:{bg:'rgba(100,116,139,0.12)',color:'#94a3b8'},
    Bronze:{bg:'rgba(180,83,9,0.12)',color:'#b45309'},
  }[t] || {bg:'rgba(100,116,139,0.1)',color:'#8E9AAF'});

  const statusBadge = (s:string) => {
    const m: Record<string,{bg:string;color:string}> = {
      Active:{bg:'rgba(31,168,154,0.12)',color:'#1FA89A'},
      Inactive:{bg:'rgba(100,116,139,0.1)',color:'#8E9AAF'},
      Pending:{bg:'rgba(255,193,7,0.12)',color:'#FFC107'},
      Suspended:{bg:'rgba(239,68,68,0.12)',color:'#ef4444'},
    };
    const c = m[s] || m.Inactive;
    return <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:c.bg,color:c.color}}>{s}</span>;
  };

  // ── Partner handlers ──
  const handleAddPartner = () => {
    // Wholesale accounts are created by users applying — admin manages status
    toast.error('Partners are created when users apply for wholesale. Use the Status update to approve/reject.');
  };
  const handleEditPartner = async () => {
    if (!editPartner) return;
    try {
      const tierNum = pForm.tier==='Bronze'?1:pForm.tier==='Silver'?2:pForm.tier==='Gold'?3:4;
      await updateWholesaleAccount(editPartner.id, { tierName: pForm.tier, discountTier: tierNum, status: pForm.status==='Active'?'ACTIVE':pForm.status==='Pending'?'PENDING':'INACTIVE' });
      setPartners(d=>d.map(p=>p.id===editPartner.id?{...p,...pForm}:p));
      toast.success('Partner updated'); setEditPartner(null);
    } catch { toast.error('Failed to update partner'); }
  };
  const handleDeletePartner = async () => {
    if (!deletePartner) return;
    try {
      await deleteWholesaleAccount(deletePartner.id);
      setPartners(d=>d.filter(p=>p.id!==deletePartner.id));
      toast.success('Partner removed'); setDeletePartner(null);
    } catch { toast.error('Failed to delete partner'); }
  };

  // ── Deal handlers ──
  const handleAddDeal = () => {
    if (!dForm.title.trim()) { toast.error('Deal title required'); return; }
    const d: Deal = { id:`DEL${String(Date.now()).slice(-3)}`, ...dForm };
    setDeals(prev=>[...prev,d]); toast.success('Deal added'); setAddDealOpen(false);
  };
  const handleEditDeal = () => {
    if (!editDeal) return;
    setDeals(d=>d.map(x=>x.id===editDeal.id?{...x,...dForm}:x));
    toast.success('Deal updated'); setEditDeal(null);
  };
  const handleDeleteDeal = () => {
    if (!deleteDeal) return;
    setDeals(d=>d.filter(x=>x.id!==deleteDeal.id));
    toast.success('Deal deleted'); setDeleteDeal(null);
  };

  // ── Inventory handlers ──
  const handleAddInv = async () => {
    if (!iForm.name.trim()) { toast.error('Product name required'); return; }
    try {
      await createProduct({
        name: iForm.name,
        sku: iForm.sku,
        wholesalePrice: Number(iForm.price) || 0,
        wholesaleMoq: Number(iForm.moq) || 1,
        categorySlug: iForm.category.toLowerCase().replace(/ /g, '-'),
        isActive: iForm.status === 'Active',
        isWholesaleOnly: true,
        description: iForm.description,
        imageDataUrls: invImages,
        specifications: iForm.specifications ? [{ key: 'Specifications', value: iForm.specifications }] : undefined
      });
      toast.success('Wholesale product added');
      setAddInvOpen(false);
      loadWholesaleProducts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add product');
    }
  };
  const handleEditInv = async () => {
    if (!editInv) return;
    try {
      await updateProduct(editInv.id, {
        name: iForm.name,
        sku: iForm.sku,
        wholesalePrice: Number(iForm.price) || 0,
        wholesaleMoq: Number(iForm.moq) || 1,
        categorySlug: iForm.category.toLowerCase().replace(/ /g, '-'),
        isActive: iForm.status === 'Active',
        description: iForm.description,
        imageDataUrls: invImages,
        replaceImages: true,
        specifications: iForm.specifications ? [{ key: 'Specifications', value: iForm.specifications }] : undefined
      });
      toast.success('Wholesale product updated');
      setEditInv(null);
      loadWholesaleProducts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update product');
    }
  };
  const handleDeleteInv = async () => {
    if (!deleteInv) return;
    try {
      await deleteProduct(deleteInv.id);
      toast.success('Product removed');
      setDeleteInv(null);
      loadWholesaleProducts();
    } catch { toast.error('Failed to delete product'); }
  };

  // ── Columns ──
  const partnerCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'name', label:'Company', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'contact', label:'Contact' },
    { key:'tier', label:'Tier', render:(v)=>{ const c=tierColor(String(v)); return <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:c.bg,color:c.color}}>{String(v)}</span>; }},
    { key:'orders', label:'Orders', render:(v)=><span style={{fontWeight:700,color:'#6366f1'}}>{String(v)}</span> },
    { key:'totalSpent', label:'Total Spent', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
  ];
  const dealCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'title', label:'Deal Title', render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span> },
    { key:'discount', label:'Discount', render:(v)=><span style={{fontWeight:700,color:'#1FA89A'}}>{String(v)}</span> },
    { key:'minOrder', label:'Min Order' },
    { key:'validUntil', label:'Valid Until' },
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
  ];
  const invCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'name', label:'Product', render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span> },
    { key:'sku', label:'SKU', render:(v)=><code style={{fontSize:'12px',color:'#1FA89A',background:'rgba(31,168,154,0.1)',padding:'2px 6px',borderRadius:'4px'}}>{String(v)}</code> },
    { key:'price', label:'Price', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'moq', label:'Min Order Qty' },
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
  ];

  const partnerForm = (
    <>
      <FormField label="Company Name *" value={pForm.name} onChange={pfp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. TechHub Zambia" />
      <FormField label="Contact / Email" value={pForm.contact} onChange={pfp('contact')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="contact@company.com" />
      <FormField label="Tier" value={pForm.tier} onChange={pfp('tier')} options={TIERS} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      <FormField label="Status" value={pForm.status} onChange={pfp('status')} options={PARTNER_STATUSES} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
    </>
  );
  const dealForm = (
    <>
      <FormField label="Deal Title *" value={dForm.title} onChange={dfp('title')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Bulk Electronics — 15% Off" />
      <FormField label="Description" value={dForm.description} onChange={dfp('description')} type="textarea" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Describe the deal..." />
      <FormField label="Discount" value={dForm.discount} onChange={dfp('discount')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 15% or Buy 10+2" />
      <FormField label="Minimum Order" value={dForm.minOrder} onChange={dfp('minOrder')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. $5,000" />
      <FormField label="Valid Until" value={dForm.validUntil} onChange={dfp('validUntil')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 2025-12-31" />
      <FormField label="Status" value={dForm.status} onChange={dfp('status')} options={['Active','Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
    </>
  );
  const invForm = (
    <>
      <FormField label="Product Name *" value={iForm.name} onChange={ifp('name')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Product name" />
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>Product Images</label>
        <CloudinaryUpload
          value={invImages[0] || ''}
          onChange={(url) => setInvImages(prev => url ? [...prev, url] : prev)}
          multiple
        />
        {invImages.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {invImages.map((url, i) => (
              <div key={i} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${border}`, flexShrink: 0 }}>
                <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setInvImages(prev => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '4px', width: '18px', height: '18px', fontSize: '12px', cursor: 'pointer' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <FormField label="Description" value={iForm.description} onChange={ifp('description')} type="textarea" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Detailed product description..." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField label="SKU" value={iForm.sku} onChange={ifp('sku')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. WHL-PRD-001" />
        <FormField label="Category" value={iForm.category} onChange={ifp('category')} options={['Electronics','Audio','Wearables','Clothing','Sports']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField label="Wholesale Price" value={iForm.price} onChange={ifp('price')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 850" />
        <FormField label="Min Order Qty (MOQ)" value={iForm.moq} onChange={ifp('moq')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. 5" />
      </div>
      <FormField label="Specifications" value={iForm.specifications} onChange={ifp('specifications')} type="textarea" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="Key: Value (one per line)" />
      <FormField label="Status" value={iForm.status} onChange={ifp('status')} options={['Active','Inactive']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
    </>
  );

  // ─── OVERVIEW — 3 section cards ───────────────────────
  if (!section) {
    const SECTIONS = [
      {
        key: 'accounts' as Section,
        icon: <Users size={28} color="#1FA89A" />,
        iconBg: 'rgba(31,168,154,0.1)',
        title: 'Wholesale Accounts',
        description: 'Manage applications and approved wholesale partners.',
        count: partners.length,
        countColor: '#1FA89A',
        activeCount: partners.filter(p=>p.status==='Active').length,
        activeLabel: 'active',
      },
      {
        key: 'deals' as Section,
        icon: <Star size={28} color="#FFC107" />,
        iconBg: 'rgba(255,193,7,0.1)',
        title: 'Featured Deals',
        description: 'Customize the wholesale offers shown on the storefront.',
        count: deals.length,
        countColor: '#FFC107',
        activeCount: deals.filter(d=>d.status==='Active').length,
        activeLabel: 'active',
      },
      {
        key: 'inventory' as Section,
        icon: <Package size={28} color="#6366f1" />,
        iconBg: 'rgba(99,102,241,0.1)',
        title: 'Wholesale Inventory',
        description: 'Exclusive products only available to wholesale buyers.',
        count: inventory.length,
        countColor: '#6366f1',
        activeCount: inventory.filter(p=>p.status==='Active').length,
        activeLabel: 'active',
      },
    ];

    return (
      <div>
        <PageHeader title="Wholesale" subtitle="Manage wholesale accounts, deals and exclusive inventory" icon={Truck} />
        {/* Summary stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px',marginBottom:'24px'}} className="wg">
          {[
            {label:'Active Partners', val:String(partners.filter(p=>p.status==='Active').length), color:'#1FA89A'},
            {label:'Featured Deals', val:String(deals.filter(d=>d.status==='Active').length), color:'#FFC107'},
            {label:'Wholesale Products', val:String(inventory.length), color:'#6366f1'},
          ].map(s=>(
            <div key={s.label} style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'16px'}}>
              <div style={{fontSize:'12px',color:textMuted,marginBottom:'4px'}}>{s.label}</div>
              <div style={{fontSize:'24px',fontWeight:800,color:s.color}}>{s.val}</div>
            </div>
          ))}
        </div>
        {/* Section cards */}
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
          {SECTIONS.map(sec=>(
            <div key={sec.key} style={{background:card,border:`1px solid ${border}`,borderRadius:'14px',padding:'20px',cursor:'pointer',transition:'border-color 0.15s',display:'flex',alignItems:'center',gap:'16px'}}
              onClick={()=>setSection(sec.key)}
              onMouseEnter={e=>(e.currentTarget.style.borderColor='#1FA89A')}
              onMouseLeave={e=>(e.currentTarget.style.borderColor=border)}>
              <div style={{width:'56px',height:'56px',borderRadius:'14px',background:sec.iconBg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {sec.icon}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                  <span style={{fontSize:'16px',fontWeight:800,color:textMain}}>{sec.title}</span>
                  <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11.5px',fontWeight:700,background:`rgba(${sec.countColor==='#1FA89A'?'31,168,154':sec.countColor==='#FFC107'?'255,193,7':'99,102,241'},0.12)`,color:sec.countColor}}>
                    {sec.count} {sec.count===1?'item':'items'}
                  </span>
                </div>
                <p style={{fontSize:'13px',color:textMuted,margin:0}}>{sec.description}</p>
                {sec.count > 0 && (
                  <p style={{fontSize:'12px',color:'#1FA89A',margin:'4px 0 0',fontWeight:600}}>{sec.activeCount} {sec.activeLabel}</p>
                )}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0,color:'#1FA89A',fontSize:'13px',fontWeight:600}}>
                Open Section <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
        <style>{`.wg{} @media(max-width:768px){.wg{grid-template-columns:1fr!important;}}`}</style>
      </div>
    );
  }

  // ─── SECTION VIEWS ───────────────────────────────────
  const sectionTitles = { accounts:'Wholesale Accounts', deals:'Featured Deals', inventory:'Wholesale Inventory' };
  const sectionSubs = {
    accounts:'Manage applications and approved wholesale partners',
    deals:'Customize the wholesale offers shown on the storefront',
    inventory:'Exclusive products only available to wholesale buyers',
  };

  return (
    <div>
      {/* Back nav */}
      <div style={{marginBottom:'16px'}}>
        <button onClick={()=>setSection(null)} style={{display:'flex',alignItems:'center',gap:'6px',background:isDark?'#1E293B':'#F1F5F9',border:`1px solid ${border}`,borderRadius:'8px',padding:'8px 14px',cursor:'pointer',color:textMain,fontSize:'13px',fontWeight:600,fontFamily:'var(--font-inter)'}}>
          <ChevronLeft size={14} /> Back to Wholesale
        </button>
      </div>

      <PageHeader
        title={sectionTitles[section!]}
        subtitle={sectionSubs[section!]}
        icon={section==='accounts'?Truck:section==='deals'?Star:Package}
        onAdd={()=>{
          if (section==='accounts') { setPForm({name:'',contact:'',status:'Active',tier:'Bronze'}); setAddPartnerOpen(true); }
          if (section==='deals') { setDForm({title:'',description:'',discount:'',minOrder:'',validUntil:'',status:'Active'}); setAddDealOpen(true); }
          if (section==='inventory') { setIForm({name:'',sku:'',price:'',moq:'',category:'Electronics',status:'Active',description:'',imageUrl:'',images:[],specifications:''}); setInvImages([]); setAddInvOpen(true); }
        }}
        addLabel={section==='accounts'?'Add Partner':section==='deals'?'Add Deal':'Add Product'}
      />

      {section === 'accounts' && (
        <DataTable columns={partnerCols} data={partners as unknown as Record<string,unknown>[]} searchPlaceholder="Search partners..."
          onEdit={row=>{ const r=row as unknown as Wholesale; setPForm({name:r.name,contact:r.contact,status:r.status,tier:r.tier}); setEditPartner(r); }}
          onDelete={row=>setDeletePartner(row as unknown as Wholesale)}
          onView={row=>setViewPartner(row as unknown as Wholesale)}
        />
      )}
      {section === 'deals' && (
        <DataTable columns={dealCols} data={deals as unknown as Record<string,unknown>[]} searchPlaceholder="Search deals..."
          onEdit={row=>{ const r=row as unknown as Deal; setDForm({title:r.title,description:r.description,discount:r.discount,minOrder:r.minOrder,validUntil:r.validUntil,status:r.status}); setEditDeal(r); }}
          onDelete={row=>setDeleteDeal(row as unknown as Deal)}
        />
      )}
      {section === 'inventory' && (
        <DataTable columns={invCols} data={inventory as unknown as Record<string,unknown>[]} searchPlaceholder="Search wholesale products..."
          onEdit={row=>{ 
            const r=row as any; 
            setIForm({
              name:r.name, sku:r.sku, price:String(r.rawPrice||''), moq:String(r.rawMoq||''), 
              category:r.category, status:r.status, description:r.description, 
              imageUrl:r.imageUrl, images:r.images, specifications:r.specifications 
            }); 
            setInvImages(r.images || []);
            setEditInv(r); 
          }}
          onDelete={row=>setDeleteInv(row as unknown as WholesaleProduct)}
        />
      )}

      {/* Partner Modals */}
      <Modal open={addPartnerOpen} onClose={()=>setAddPartnerOpen(false)} title="Add Wholesale Partner">{partnerForm}<ModalFooter onClose={()=>setAddPartnerOpen(false)} onSubmit={handleAddPartner} loading={false} submitLabel="Add Partner" isDark={isDark} border={border} textMain={textMain} /></Modal>
      {editPartner && <Modal open={!!editPartner} onClose={()=>setEditPartner(null)} title={`Edit: ${editPartner.name}`}>{partnerForm}<ModalFooter onClose={()=>setEditPartner(null)} onSubmit={handleEditPartner} loading={false} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain} /></Modal>}
      {viewPartner && (
        <Modal open={!!viewPartner} onClose={()=>setViewPartner(null)} title="Partner Details">
          <FormField label="Company" value={viewPartner.name} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Contact" value={viewPartner.contact} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Tier" value={viewPartner.tier} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Credit Limit" value={viewPartner.credit} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Orders" value={String(viewPartner.orders)} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Total Spent" value={viewPartner.totalSpent} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Joined" value={viewPartner.joined} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Status" value={viewPartner.status} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <button onClick={()=>setViewPartner(null)} style={{width:'100%',padding:'10px',borderRadius:'9px',background:isDark?'#1E293B':'#F1F5F9',border:`1px solid ${border}`,color:textMain,fontSize:'13.5px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>Close</button>
        </Modal>
      )}
      <ConfirmDialog open={!!deletePartner} onClose={()=>setDeletePartner(null)} onConfirm={handleDeletePartner} loading={false} title="Remove Partner" message={`Remove "${deletePartner?.name}" from wholesale?`} />

      {/* Deal Modals */}
      <Modal open={addDealOpen} onClose={()=>setAddDealOpen(false)} title="Add Featured Deal">{dealForm}<ModalFooter onClose={()=>setAddDealOpen(false)} onSubmit={handleAddDeal} loading={false} submitLabel="Add Deal" isDark={isDark} border={border} textMain={textMain} /></Modal>
      {editDeal && <Modal open={!!editDeal} onClose={()=>setEditDeal(null)} title={`Edit Deal: ${editDeal.title}`}>{dealForm}<ModalFooter onClose={()=>setEditDeal(null)} onSubmit={handleEditDeal} loading={false} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain} /></Modal>}
      <ConfirmDialog open={!!deleteDeal} onClose={()=>setDeleteDeal(null)} onConfirm={handleDeleteDeal} loading={false} title="Delete Deal" message={`Delete "${deleteDeal?.title}"?`} />

      {/* Inventory Modals */}
      <Modal open={addInvOpen} onClose={()=>setAddInvOpen(false)} title="Add Wholesale Product">{invForm}<ModalFooter onClose={()=>setAddInvOpen(false)} onSubmit={handleAddInv} loading={false} submitLabel="Add Product" isDark={isDark} border={border} textMain={textMain} /></Modal>
      {editInv && <Modal open={!!editInv} onClose={()=>setEditInv(null)} title={`Edit: ${editInv.name}`}>{invForm}<ModalFooter onClose={()=>setEditInv(null)} onSubmit={handleEditInv} loading={false} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain} /></Modal>}
      <ConfirmDialog open={!!deleteInv} onClose={()=>setDeleteInv(null)} onConfirm={handleDeleteInv} loading={false} title="Remove Product" message={`Remove "${deleteInv?.name}" from wholesale inventory?`} />
    </div>
  );
}

export default function WholesalePage() { return <AdminShell><WholesaleContent /></AdminShell>; }
