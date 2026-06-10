'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import { Truck, Users, Star, Package, ChevronRight, ChevronLeft, X, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  getWholesaleAccounts, 
  updateWholesaleAccountStatus, 
  deleteWholesaleAccount, 
  updateWholesaleAccount, 
  getWholesaleDeals, 
  createWholesaleDeal, 
  updateWholesaleDeal, 
  deleteWholesaleDeal, 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  api
} from '@/lib/api';
import CloudinaryUpload from '@/components/ui/file-upload';

// ─── Types ────────────────────────────────────────────────
type Wholesale = { id:string; name:string; contact:string; phone:string; city:string; tier:string; credit:string; orders:number; totalSpent:string; status:string; joined:string };
type Application = { id:string; company:string; type:string; applicant:string; email:string; phone:string; status:string; date:string };
type Deal = { id:string; title:string; description:string; discount:string; minOrder:string; validUntil:string; status:string };
type WholesaleProduct = { id:string; name:string; sku:string; price:string; moq:string; category:string; status:string };

const TIERS = ['Bronze','Silver','Gold','Platinum'];
const PARTNER_STATUSES = ['Active','Inactive','Pending','Suspended'];
const APP_STATUSES = ['Pending', 'Approved', 'Rejected'];

function WholesaleContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#101826' : '#F1F5F9';

  type Section = 'applications' | 'accounts' | 'deals' | 'inventory';
  const [section, setSection] = useState<Section>('applications');

  // Applications state
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  
  const loadApplications = () => {
    setLoadingApps(true);
    api.get('/api/wholesale/applications').then((r: any) => {
      const raw = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      setApplications(raw.map((a: any) => ({
        id: a.id,
        company: a.companyName,
        type: a.businessType,
        applicant: `${a.firstName} ${a.lastName}`,
        email: a.email,
        phone: a.phone,
        status: a.status.charAt(0) + a.status.slice(1).toLowerCase(),
        date: a.createdAt ? a.createdAt.split('T')[0] : '',
      })));
    }).finally(() => setLoadingApps(false));
  };

  useEffect(() => {
    if (section === 'applications') loadApplications();
  }, [section]);

  const [viewApp, setViewApp] = useState<any | null>(null);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [appStatus, setAppStatus] = useState('Pending');

  const handleUpdateAppStatus = async () => {
    if (!editApp) return;
    try {
      await api.put(`/api/wholesale/applications/${editApp.id}/status`, { status: appStatus.toUpperCase() });
      toast.success('Application status updated');
      setEditApp(null);
      loadApplications();
      if (appStatus === 'Approved') loadPartners();
    } catch (err: any) {
      toast.error('Failed to update application');
    }
  };

  // Partners state
  const [partners, setPartners] = useState<Wholesale[]>([]);
  const loadPartners = () => {
    getWholesaleAccounts({ limit: 200 }).then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      const normalized: Wholesale[] = raw.map((w: any) => ({
        id: w.id || '',
        name: w.companyName || w.businessName || (w.user ? [w.user.firstName, w.user.lastName].filter(Boolean).join(' ') : 'Partner'),
        contact: w.user?.email || w.contact || '',
        phone: w.user?.phone || w.phone || '',
        city: w.city || '',
        tier: w.tierName || (w.discountTier===1?'Bronze':w.discountTier===2?'Silver':w.discountTier===3?'Gold':'Platinum') || 'Bronze',
        credit: w.creditLimit ? `$${Number(w.creditLimit).toLocaleString()}` : '$0',
        orders: w._count?.orders ?? 0,
        totalSpent: '$0',
        status: w.status === 'ACTIVE' || w.status === 'APPROVED' ? 'Active' : w.status === 'PENDING' ? 'Pending' : 'Inactive',
        joined: w.createdAt ? w.createdAt.split('T')[0] : '',
      }));
      setPartners(normalized);
    }).catch(() => {});
  };

  useEffect(() => {
    if (section === 'accounts') loadPartners();
  }, [section]);

  const [editPartner, setEditPartner] = useState<Wholesale|null>(null);
  const [deletePartner, setDeletePartner] = useState<Wholesale|null>(null);
  const [viewPartner, setViewPartner] = useState<Wholesale|null>(null);
  const [pForm, setPForm] = useState({ name:'', contact:'', status:'Active', tier:'Bronze' });
  const pfp = (k:string) => (v:string) => setPForm(f=>({...f,[k]:v}));

  // Deals state
  const [deals, setDeals] = useState<Deal[]>([]);
  const loadDeals = () => {
    getWholesaleDeals().then((r: any) => {
      const raw = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      setDeals(raw.map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description || '',
        discount: d.discount ? `${d.discount}%` : '0%',
        minOrder: d.minOrder ? `$${Number(d.minOrder).toLocaleString()}` : '$0',
        validUntil: d.validUntil ? d.validUntil.split('T')[0] : 'Never',
        status: d.isActive ? 'Active' : 'Inactive',
      })));
    });
  };

  useEffect(() => {
    if (section === 'deals') loadDeals();
  }, [section]);

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
    description: '', imageUrl: '', images: [] as string[], specifications: '',
    stockTotal: '100', stockCurrent: '100'
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
        price: p.wholesalePrice ? `$${Number(p.wholesalePrice).toLocaleString()}` : (p.price ? `$${Number(p.price).toLocaleString()}` : '$0'),
        moq: `${p.wholesaleMoq || 1} units`,
        category: p.category?.name || 'General',
        status: p.isActive !== false ? 'Active' : 'Inactive',
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

  const statusBadge = (s:string) => {
    const m: Record<string,{bg:string;color:string}> = {
      Active:{bg:'rgba(31,168,154,0.12)',color:'#1FA89A'},
      Approved:{bg:'rgba(31,168,154,0.12)',color:'#1FA89A'},
      Inactive:{bg:'rgba(100,116,139,0.1)',color:'#8E9AAF'},
      Pending:{bg:'rgba(255,193,7,0.12)',color:'#FFC107'},
      Rejected:{bg:'rgba(239,68,68,0.12)',color:'#ef4444'},
      Suspended:{bg:'rgba(239,68,68,0.12)',color:'#ef4444'},
    };
    const c = m[s] || m.Inactive;
    return <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:c.bg,color:c.color}}>{s}</span>;
  };

  const handleEditPartner = async () => {
    if (!editPartner) return;
    try {
      const tierNum = pForm.tier==='Bronze'?1:pForm.tier==='Silver'?2:pForm.tier==='Gold'?3:4;
      await updateWholesaleAccount(editPartner.id, { tierName: pForm.tier, discountTier: tierNum, status: pForm.status==='Active'?'ACTIVE':pForm.status==='Pending'?'PENDING':'INACTIVE' });
      toast.success('Partner updated'); setEditPartner(null);
      loadPartners();
    } catch { toast.error('Failed to update partner'); }
  };

  const handleAddDeal = async () => {
    if (!dForm.title.trim()) { toast.error('Deal title required'); return; }
    try {
      await createWholesaleDeal({
        title: dForm.title,
        description: dForm.description,
        discount: parseFloat(dForm.discount.replace('%', '')) || 0,
        minOrder: parseFloat(dForm.minOrder.replace('$', '').replace(/,/g, '')) || 0,
        validUntil: dForm.validUntil,
        isActive: dForm.status === 'Active'
      });
      toast.success('Deal added'); setAddDealOpen(false);
      loadDeals();
    } catch { toast.error('Failed to add deal'); }
  };

  const handleEditDeal = async () => {
    if (!editDeal) return;
    try {
      await updateWholesaleDeal(editDeal.id, {
        title: dForm.title,
        description: dForm.description,
        discount: parseFloat(dForm.discount.replace('%', '')) || 0,
        minOrder: parseFloat(dForm.minOrder.replace('$', '').replace(/,/g, '')) || 0,
        validUntil: dForm.validUntil,
        isActive: dForm.status === 'Active'
      });
      toast.success('Deal updated'); setEditDeal(null);
      loadDeals();
    } catch { toast.error('Failed to update deal'); }
  };

  const handleDeleteDeal = async () => {
    if (!deleteDeal) return;
    try {
      await deleteWholesaleDeal(deleteDeal.id);
      toast.success('Deal deleted'); setDeleteDeal(null);
      loadDeals();
    } catch { toast.error('Failed to delete deal'); }
  };

  const handleAddInv = async () => {
    if (!iForm.name.trim()) { toast.error('Product name required'); return; }
    try {
      await createProduct({
        name: iForm.name,
        sku: iForm.sku,
        price: Number(iForm.price) || 0,
        wholesalePrice: Number(iForm.price) || 0,
        wholesaleMoq: Number(iForm.moq) || 1,
        categorySlug: iForm.category.toLowerCase().replace(/ /g, '-'),
        isActive: iForm.status === 'Active',
        isWholesaleOnly: true,
        description: iForm.description,
        stockTotal: Number(iForm.stockTotal) || 0,
        stockCurrent: Number(iForm.stockCurrent) || 0,
        imageDataUrls: invImages,
        specifications: iForm.specifications ? [{ key: 'Specifications', value: iForm.specifications }] : undefined
      });
      toast.success('Wholesale product added');
      setAddInvOpen(false);
      loadWholesaleProducts();
    } catch { toast.error('Failed to add product'); }
  };

  const appCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'company', label:'Company', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'applicant', label:'Applicant' },
    { key:'email', label:'Email' },
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
    { key:'date', label:'Date' },
  ];

  const partnerCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'name', label:'Company', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'contact', label:'Contact' },
    { key:'tier', label:'Tier', render:(v)=>{ const c={Bronze:{bg:'rgba(180,83,9,0.12)',color:'#b45309'},Silver:{bg:'rgba(100,116,139,0.12)',color:'#94a3b8'},Gold:{bg:'rgba(255,193,7,0.12)',color:'#FFC107'},Platinum:{bg:'rgba(139,92,246,0.12)',color:'#8b5cf6'}}[String(v)] || {bg:'rgba(100,116,139,0.1)',color:'#8E9AAF'}; return <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600,background:c.bg,color:c.color}}>{String(v)}</span>; }},
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
  ];

  const dealCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'title', label:'Deal Title', render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span> },
    { key:'discount', label:'Discount', render:(v)=><span style={{fontWeight:700,color:'#1FA89A'}}>{String(v)}</span> },
    { key:'minOrder', label:'Min Order' },
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
  ];

  const invCols: Column[] = [
    { key:'id', label:'ID', width:'90px' },
    { key:'name', label:'Product', render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span> },
    { key:'sku', label:'SKU', render:(v)=><code style={{fontSize:'12px',color:'#1FA89A',background:'rgba(31,168,154,0.1)',padding:'2px 6px',borderRadius:'4px'}}>{String(v)}</code> },
    { key:'price', label:'Price', render:(v)=><span style={{fontWeight:700,color:textMain}}>{String(v)}</span> },
    { key:'status', label:'Status', render:(v)=>statusBadge(String(v)) },
  ];

  return (
    <AdminShell>
      <PageHeader title="Wholesale Management" subtitle="Manage applications, partners, deals and bulk inventory" icon={Truck} />

      <div style={{ display:'flex', gap:'12px', marginBottom:'24px', overflowX:'auto', paddingBottom:'4px' }}>
        {[
          { id:'applications', label:'Applications', icon:ClipboardList },
          { id:'accounts', label:'Wholesale Partners', icon:Users },
          { id:'deals', label:'Featured Deals', icon:Star },
          { id:'inventory', label:'Bulk Inventory', icon:Package }
        ].map(t => (
          <button key={t.id} onClick={() => setSection(t.id as Section)} style={{
            display:'flex', alignItems:'center', gap:'8px', padding:'10px 16px', borderRadius:'12px', fontSize:'13.5px', fontWeight:600,
            background: section === t.id ? 'rgba(31,168,154,0.1)' : card,
            color: section === t.id ? '#1FA89A' : textMuted,
            border: `1px solid ${section === t.id ? '#1FA89A' : border}`,
            cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.2s'
          }}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div style={{ background:card, border:`1px solid ${border}`, borderRadius:'16px', overflow:'hidden' }}>
        {section === 'applications' && (
          <DataTable columns={appCols} data={applications} 
            onView={(row) => setViewApp(row as unknown as Application)} 
            onEdit={(row) => setEditApp(row as unknown as Application)} />
        )}
        {section === 'accounts' && (
          <DataTable columns={partnerCols} data={partners} 
            onView={(row) => setViewPartner(row as unknown as Wholesale)} 
            onEdit={(row) => setEditPartner(row as unknown as Wholesale)} 
            onDelete={(row) => setDeletePartner(row as unknown as Wholesale)} />
        )}
        {section === 'deals' && (
          <div style={{ padding:'20px' }}>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'16px' }}>
              <button onClick={() => { setDForm({title:'',description:'',discount:'',minOrder:'',validUntil:'',status:'Active'}); setAddDealOpen(true); }}
                style={{ background:'#1FA89A', color:'white', border:'none', padding:'8px 16px', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>
                Add New Deal
              </button>
            </div>
            <DataTable columns={dealCols} data={deals} 
              onEdit={(row) => { 
                const d = row as unknown as Deal;
                setEditDeal(d); 
                setDForm({
                  title: d.title,
                  description: d.description,
                  discount: d.discount.replace('%', ''),
                  minOrder: d.minOrder.replace('$', '').replace(/,/g, ''),
                  validUntil: d.validUntil,
                  status: d.status
                }); 
              }} 
              onDelete={(row) => setDeleteDeal(row as unknown as Deal)} />
          </div>
        )}
        {section === 'inventory' && (
          <div style={{ padding:'20px' }}>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'16px' }}>
              <button onClick={() => { setIForm({name:'',sku:'',price:'',moq:'',category:'Electronics',status:'Active',description:'',imageUrl:'',images:[],specifications:'',stockTotal:'100',stockCurrent:'100'}); setInvImages([]); setAddInvOpen(true); }}
                style={{ background:'#1FA89A', color:'white', border:'none', padding:'8px 16px', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>
                Add Wholesale Product
              </button>
            </div>
            <DataTable columns={invCols} data={inventory} 
              onEdit={(row) => { 
                const i = row as any;
                setEditInv(i); 
                setIForm({
                  name: i.name,
                  sku: i.sku,
                  price: String(i.rawPrice || ''),
                  moq: String(i.rawMoq || ''),
                  category: i.category,
                  status: i.status,
                  description: i.description || '',
                  imageUrl: i.imageUrl || '',
                  images: i.images || [],
                  specifications: i.specifications || '',
                  stockTotal: String(i.stockTotal || 100),
                  stockCurrent: String(i.stockCurrent || 100)
                }); 
                setInvImages(i.images || []); 
              }} 
              onDelete={(row) => setDeleteInv(row as unknown as WholesaleProduct)} />
          </div>
        )}
      </div>

      {/* Modals for Applications */}
      <Modal open={!!editApp} onClose={() => setEditApp(null)} title="Update Application Status">
        <div style={{ padding:'20px' }}>
          <FormField label="Status" value={appStatus} onChange={setAppStatus} options={APP_STATUSES} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <p style={{ fontSize:'12px', color:textMuted, marginTop:'12px' }}>Approving will automatically create a wholesale account for this user.</p>
        </div>
        <ModalFooter onClose={() => setEditApp(null)} onSubmit={handleUpdateAppStatus} loading={false} submitLabel="Update Status" isDark={isDark} border={border} textMain={textMain} />
      </Modal>

      {/* Deal Modal */}
      <Modal open={addDealOpen || !!editDeal} onClose={() => { setAddDealOpen(false); setEditDeal(null); }} title={editDeal ? "Edit Deal" : "Add New Deal"}>
        <div style={{ padding:'20px' }}>
          <FormField label="Title" value={dForm.title} onChange={v => setDForm(f=>({...f,title:v}))} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Discount (%)" value={dForm.discount} onChange={v => setDForm(f=>({...f,discount:v}))} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Min Order" value={dForm.minOrder} onChange={v => setDForm(f=>({...f,minOrder:v}))} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Valid Until" value={dForm.validUntil} onChange={v => setDForm(f=>({...f,validUntil:v}))} type="date" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        </div>
        <ModalFooter onClose={() => { setAddDealOpen(false); setEditDeal(null); }} onSubmit={editDeal ? handleEditDeal : handleAddDeal} loading={false} submitLabel={editDeal ? "Update Deal" : "Create Deal"} isDark={isDark} border={border} textMain={textMain} />
      </Modal>

      {/* Delete Dialogs */}
      <ConfirmDialog open={!!deleteDeal} title="Delete Deal" message="Are you sure you want to delete this deal?" onClose={() => setDeleteDeal(null)} onConfirm={handleDeleteDeal} />
    </AdminShell>
  );
}

export default function WholesalePage() {
  return <WholesaleContent />;
}
