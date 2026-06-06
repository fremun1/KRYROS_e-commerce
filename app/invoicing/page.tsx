'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import DataTable, { Column } from '@/components/admin/data-table';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import { FileText } from 'lucide-react';
import { getOrders } from '@/lib/api';
import toast from 'react-hot-toast';

type Invoice = { id:string; client:string; amount:string; tax:string; total:string; date:string; due:string; status:string };
const INITIAL: Invoice[] = [
  { id:'INV-2025-001', client:'TechHub Zambia', amount:'$12,500.00', tax:'$1,250.00', total:'$13,750.00', date:'2025-05-26', due:'2025-06-25', status:'Paid' },
  { id:'INV-2025-002', client:'Digital World', amount:'$8,400.00', tax:'$840.00', total:'$9,240.00', date:'2025-05-25', due:'2025-06-24', status:'Unpaid' },
  { id:'INV-2025-003', client:'Electronics Plus', amount:'$25,000.00', tax:'$2,500.00', total:'$27,500.00', date:'2025-05-24', due:'2025-06-23', status:'Paid' },
  { id:'INV-2025-004', client:'Mobile Zone', amount:'$3,200.00', tax:'$320.00', total:'$3,520.00', date:'2025-05-20', due:'2025-06-19', status:'Overdue' },
  { id:'INV-2025-005', client:'Smart Gadgets', amount:'$1,800.00', tax:'$180.00', total:'$1,980.00', date:'2025-05-15', due:'2025-06-14', status:'Draft' },
  { id:'INV-2025-006', client:'Bwalya Chileshe', amount:'$1,099.00', tax:'$109.90', total:'$1,208.90', date:'2025-05-26', due:'2025-06-25', status:'Paid' },
];
const EMPTY = { client:'', amount:'', tax:'', total:'', date:'', due:'', status:'Draft' };
const INV_STATUSES = ['Draft','Unpaid','Paid','Overdue'];

function InvoicingContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#101826' : '#F1F5F9';
  const [data, setData] = useState<Invoice[]>(INITIAL);
  useEffect(() => {
    getOrders({ limit: 200 }).then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      if (raw.length === 0) return;
      const normalized: Invoice[] = raw.map((o: any) => {
        const amt = Number(o.total ?? o.subtotal ?? o.amount ?? 0);
        const tax = Number(o.tax ?? o.taxAmount ?? 0);
        const total = amt + tax;
        const d = o.createdAt ? o.createdAt.split('T')[0] : '';
        const due = o.createdAt ? new Date(new Date(o.createdAt).getTime() + 30*24*60*60*1000).toISOString().split('T')[0] : '';
        return {
          id: `INV-${(o.orderNumber || o.id || '').toString().slice(-8)}`,
          client: o.user ? (`${o.user.firstName||''} ${o.user.lastName||''}`.trim() || o.user.email || 'Customer') : 'Customer',
          amount: `K${amt.toLocaleString()}`,
          tax: `K${tax.toLocaleString()}`,
          total: `K${total.toLocaleString()}`,
          date: d,
          due: due,
          status: o.paymentStatus==='PAID'||o.status==='DELIVERED' ? 'Paid' : o.paymentStatus==='PENDING' ? 'Unpaid' : o.status==='CANCELLED' ? 'Draft' : 'Unpaid',
        };
      });
      setData(normalized);
    }).catch(() => {});
  }, []);
  const [addOpen, setAddOpen] = useState(false);
  const [viewRow, setViewRow] = useState<Invoice|null>(null);
  const [editRow, setEditRow] = useState<Invoice|null>(null);
  const [deleteRow, setDeleteRow] = useState<Invoice|null>(null);
  const [form, setForm] = useState({...EMPTY});
  const [editStatus, setEditStatus] = useState('');
  const fp = (k:string) => (v:string) => setForm(f=>({...f,[k]:v}));

  const openAdd = () => { setForm({...EMPTY}); setAddOpen(true); };
  const openView = (row:Record<string,unknown>) => setViewRow(row as unknown as Invoice);
  const openEdit = (row:Record<string,unknown>) => { const r=row as unknown as Invoice; setEditStatus(r.status); setEditRow(r); };
  const openDelete = (row:Record<string,unknown>) => setDeleteRow(row as unknown as Invoice);

  const handleAdd = () => {
    if (!form.client.trim()) { toast.error('Client name required'); return; }
    const newInv: Invoice = { id:`INV-${Date.now().toString().slice(-6)}`, ...form };
    setData(d=>[...d,newInv]); toast.success('Invoice created'); setAddOpen(false);
  };
  const handleEdit = () => {
    if (!editRow) return;
    setData(d=>d.map(i=>i.id===editRow.id?{...i,status:editStatus}:i));
    toast.success('Invoice updated'); setEditRow(null);
  };
  const handleDelete = () => {
    if (!deleteRow) return;
    setData(d=>d.filter(i=>i.id!==deleteRow.id));
    toast.success('Invoice deleted'); setDeleteRow(null);
  };

  const statusMap: Record<string,{bg:string;color:string}> = {
    Paid:{bg:'rgba(31,168,154,0.12)',color:'#1FA89A'},
    Unpaid:{bg:'rgba(255,193,7,0.12)',color:'#FFC107'},
    Overdue:{bg:'rgba(185,28,28,0.12)',color:'#ef4444'},
    Draft:{bg:'rgba(100,116,139,0.12)',color:'#64748b'},
  };

  const columns: Column[] = [
    { key:'id', label:'Invoice #', render:(v)=><span style={{fontWeight:700,color:'#1FA89A',fontSize:'13px'}}>{String(v)}</span> },
    { key:'client', label:'Client', render:(v)=><span style={{fontWeight:600,color:textMain}}>{String(v)}</span> },
    { key:'date', label:'Issue Date' },
    { key:'due', label:'Due Date' },
    { key:'amount', label:'Amount' },
    { key:'total', label:'Total', render:(v)=><span style={{fontWeight:800,color:textMain,fontSize:'14px'}}>{String(v)}</span> },
    { key:'status', label:'Status', render:(v)=>{ const s=statusMap[String(v)]||statusMap.Draft; return <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11.5px',fontWeight:600,background:s.bg,color:s.color}}>{String(v)}</span>; } },
  ];

  const addFields = (
    <>
      <FormField label="Client Name" value={form.client} onChange={fp('client')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. TechHub Zambia" />
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
        <FormField label="Issue Date" value={form.date} onChange={fp('date')} type="date" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Due Date" value={form.due} onChange={fp('due')} type="date" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
        <FormField label="Amount" value={form.amount} onChange={fp('amount')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="$0.00" />
        <FormField label="Tax" value={form.tax} onChange={fp('tax')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="$0.00" />
        <FormField label="Total" value={form.total} onChange={fp('total')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="$0.00" />
      </div>
      <FormField label="Status" value={form.status} onChange={fp('status')} options={INV_STATUSES} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
    </>
  );

  return (
    <div>
      <PageHeader title="Invoicing" subtitle="Create and manage customer invoices" icon={FileText} onAdd={openAdd} addLabel="New Invoice" />
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'24px'}} className="sg">
        {[{label:'Total Invoices',val:String(data.length),color:'#1FA89A'},{label:'Paid',val:String(data.filter(i=>i.status==='Paid').length),color:'#1FA89A'},{label:'Outstanding',val:String(data.filter(i=>i.status==='Unpaid').length),color:'#FFC107'},{label:'Overdue',val:String(data.filter(i=>i.status==='Overdue').length),color:'#ef4444'}].map(s=>(
          <div key={s.label} style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'16px'}}>
            <div style={{fontSize:'12px',color:textMuted,marginBottom:'6px'}}>{s.label}</div>
            <div style={{fontSize:'20px',fontWeight:800,color:s.color}}>{s.val}</div>
          </div>
        ))}
      </div>
      <DataTable columns={columns} data={data as unknown as Record<string,unknown>[]} searchPlaceholder="Search invoices..." onView={openView} onEdit={openEdit} onDelete={openDelete} />

      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Create New Invoice">{addFields}<ModalFooter onClose={()=>setAddOpen(false)} onSubmit={handleAdd} loading={false} submitLabel="Create Invoice" isDark={isDark} border={border} textMain={textMain} /></Modal>
      <Modal open={!!viewRow} onClose={()=>setViewRow(null)} title={`Invoice ${viewRow?.id??''}`}>
        {viewRow && <>
          <FormField label="Client" value={viewRow.client} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <FormField label="Issue Date" value={viewRow.date} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Due Date" value={viewRow.due} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
            <FormField label="Amount" value={viewRow.amount} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Tax" value={viewRow.tax} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
            <FormField label="Total" value={viewRow.total} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          </div>
          <FormField label="Status" value={viewRow.status} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <button onClick={()=>setViewRow(null)} style={{width:'100%',padding:'10px',borderRadius:'9px',background:isDark?'#1E293B':'#F1F5F9',border:`1px solid ${border}`,color:textMain,fontSize:'13.5px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-inter)'}}>Close</button>
        </>}
      </Modal>
      <Modal open={!!editRow} onClose={()=>setEditRow(null)} title={`Update: ${editRow?.id??''}`}>
        {editRow && <><p style={{fontSize:'13px',color:textMuted,marginBottom:'16px'}}>Client: <strong style={{color:textMain}}>{editRow.client}</strong></p>
        <FormField label="Invoice Status" value={editStatus} onChange={setEditStatus} options={INV_STATUSES} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <ModalFooter onClose={()=>setEditRow(null)} onSubmit={handleEdit} loading={false} submitLabel="Update Status" isDark={isDark} border={border} textMain={textMain} /></>}
      </Modal>
      <ConfirmDialog open={!!deleteRow} onClose={()=>setDeleteRow(null)} onConfirm={handleDelete} loading={false} title="Delete Invoice" message={`Delete invoice ${deleteRow?.id} for ${deleteRow?.client}?`} />
      <style>{`.sg{} @media(max-width:768px){.sg{grid-template-columns:1fr 1fr!important;}}`}</style>
    </div>
  );
}
export default function InvoicingPage() { return <AdminShell><InvoicingContent /></AdminShell>; }
