'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import PageHeader from '@/components/admin/page-header';
import { useTheme } from '@/contexts/theme-context';
import { BarChart3, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { getReportsSummary } from '@/lib/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function ReportsContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#101826' : '#F1F5F9';
  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedLabel, setSelectedLabel] = useState('This Month');
  const [availableMonths, setAvailableMonths] = useState<Array<{ value: string; label: string }>>([]);
  const [chartData, setChartData] = useState<Array<{ month: string; revenue: number; orders: number; customers: number }>>([]);
  const [catData, setCatData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [prodData, setProdData] = useState<Array<{ rank: number; name: string; revenue: string; units: number; growth: string; up: boolean }>>([]);
  const [kpis, setKpis] = useState([
    { label: 'Total Revenue', val: 'Loading...', change: '—', up: true },
    { label: 'Total Orders', val: '—', change: '—', up: true },
    { label: 'New Customers', val: '—', change: '—', up: true },
    { label: 'Avg Order Value', val: '—', change: '—', up: false },
  ]);

  useEffect(() => {
    getReportsSummary('month', selectedMonth).then((r: any) => {
      const d = r.data;
      if (!d) return;
      const periodLabel = d.selectedLabel || 'This Month';
      setSelectedLabel(periodLabel);
      setAvailableMonths(Array.isArray(d.availableMonths) ? d.availableMonths : []);
      setKpis([
        { label: 'Monthly Revenue', val: fmt(d.stats?.totalRevenue || 0), change: `${d.stats?.revenueGrowth ?? 0}%`, up: (d.stats?.revenueGrowth ?? 0) >= 0 },
        { label: 'Monthly Orders', val: String(d.stats?.totalOrders || 0), change: `${d.stats?.ordersGrowth ?? 0}%`, up: (d.stats?.ordersGrowth ?? 0) >= 0 },
        { label: 'New Customers', val: String(d.stats?.newCustomers || 0), change: `${d.stats?.customersGrowth ?? 0}%`, up: (d.stats?.customersGrowth ?? 0) >= 0 },
        { label: 'Avg Order Value', val: fmt(d.stats?.averageOrderValue || 0), change: periodLabel, up: true },
      ]);
      setChartData(
        Array.isArray(d.revenueSeries) && d.revenueSeries.length > 0
          ? d.revenueSeries.map((m: any) => ({
              month: m.label || m.key,
              revenue: Number(m.revenue || 0),
              orders: Number(m.orders || 0),
              customers: Number(m.customers || 0),
            }))
          : [{ month: 'No Data', revenue: 0, orders: 0, customers: 0 }]
      );
      const colors = ['#1FA89A','#6366f1','#FFC107','#ef4444','#64748b'];
      setCatData(
        Array.isArray(d.salesByCategory) && d.salesByCategory.length > 0
          ? d.salesByCategory.map((c: any, i: number) => ({ name: c.name || c.category, value: Number(c.value || c.percentage || 0), color: colors[i % colors.length] }))
          : [{ name: 'No sales yet', value: 100, color: '#64748b' }]
      );
      setProdData(
        Array.isArray(d.topProducts)
          ? d.topProducts.map((p: any, i: number) => ({
              rank: i + 1,
              name: p.name || 'Unknown',
              revenue: fmt(p.revenue || 0),
              units: Number(p.sales || 0),
              growth: periodLabel,
              up: true,
            }))
          : []
      );
    }).catch(() => {});
  }, [selectedMonth]);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Sales analytics and business insights" icon={BarChart3}
        extra={
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ background:surface, border:`1px solid ${border}`, borderRadius:'9px', color:textMain, fontSize:'13px', fontWeight:600, padding:'8px 12px', cursor:'pointer', fontFamily:'var(--font-inter)' }}
            >
              {(availableMonths.length > 0 ? availableMonths : [{ value: selectedMonth, label: selectedLabel }]).map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
            <button style={{display:'flex',alignItems:'center',gap:'6px',background:surface,border:`1px solid ${border}`,borderRadius:'9px',color:textMain,fontSize:'13px',fontWeight:500,padding:'8px 14px',cursor:'pointer',fontFamily:'var(--font-inter)'}}>
              <Download size={14} /> Export
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'24px'}} className="kpi">
        {kpis.map(k=>(
          <div key={k.label} style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'16px'}}>
            <div style={{fontSize:'12px',color:textMuted,marginBottom:'6px'}}>{k.label}</div>
            <div style={{fontSize:'22px',fontWeight:800,color:textMain}}>{k.val}</div>
            <div style={{fontSize:'12px',fontWeight:600,color:k.up?'#1FA89A':'#ef4444',display:'flex',alignItems:'center',gap:'3px',marginTop:'4px'}}>
              {k.up?<TrendingUp size={12}/>:<TrendingDown size={12}/>}{k.change}{k.label === 'Avg Order Value' ? '' : ' vs previous month'}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:'16px',marginBottom:'20px'}} className="chart-grid">
        <div style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'20px'}}>
          <div style={{fontSize:'14px',fontWeight:700,color:textMain,marginBottom:'4px'}}>Revenue Trend</div>
          <div style={{fontSize:'12px',color:textMuted,marginBottom:'16px'}}>{selectedLabel}</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{left:-20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{fontSize:11,fill:textMuted}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:11,fill:textMuted}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{background:card,border:`1px solid ${border}`,borderRadius:'8px',fontSize:'12px'}} formatter={(v:number)=>[`$${v.toLocaleString()}`,'Revenue']} />
              <Bar dataKey="revenue" fill="#1FA89A" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'20px'}}>
          <div style={{fontSize:'14px',fontWeight:700,color:textMain,marginBottom:'4px'}}>Sales by Category</div>
          <div style={{fontSize:'12px',color:textMuted,marginBottom:'16px'}}>{selectedLabel}</div>
          <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
            <PieChart width={130} height={130}>
              <Pie data={catData} cx={65} cy={65} innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                {catData.map((e,i)=><Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
            <div style={{flex:1}}>
              {catData.map(c=>(
                <div key={c.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    <div style={{width:'8px',height:'8px',borderRadius:'50%',background:c.color}} />
                    <span style={{fontSize:'12.5px',color:textMuted}}>{c.name}</span>
                  </div>
                  <span style={{fontSize:'12.5px',fontWeight:700,color:textMain}}>{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Orders/Customers trend */}
      <div style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'20px',marginBottom:'20px'}}>
        <div style={{fontSize:'14px',fontWeight:700,color:textMain,marginBottom:'4px'}}>Orders & Customers Trend</div>
        <div style={{fontSize:'12px',color:textMuted,marginBottom:'16px'}}>{selectedLabel}</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{left:-20}}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="month" tick={{fontSize:11,fill:textMuted}} axisLine={false} tickLine={false} />
            <YAxis tick={{fontSize:11,fill:textMuted}} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{background:card,border:`1px solid ${border}`,borderRadius:'8px',fontSize:'12px'}} />
            <Line type="monotone" dataKey="orders" stroke="#1FA89A" strokeWidth={2.5} dot={{fill:'#1FA89A',r:4}} name="Orders" />
            <Line type="monotone" dataKey="customers" stroke="#6366f1" strokeWidth={2.5} dot={{fill:'#6366f1',r:4}} name="Customers" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products */}
      <div style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${border}`,fontSize:'14px',fontWeight:700,color:textMain}}>Top Performing Products</div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:surface}}>
            {['Rank','Product','Revenue','Units','Growth'].map(h=><th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:'11.5px',fontWeight:700,color:textMuted,textTransform:'uppercase',letterSpacing:'0.4px'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {prodData.map(p=>(
              <tr key={p.rank} style={{borderTop:`1px solid ${border}`}}>
                <td style={{padding:'12px 16px'}}><span style={{width:'26px',height:'26px',borderRadius:'50%',background:'rgba(31,168,154,0.12)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,color:'#1FA89A'}}>{p.rank}</span></td>
                <td style={{padding:'12px 16px',fontWeight:600,color:textMain,fontSize:'13.5px'}}>{p.name}</td>
                <td style={{padding:'12px 16px',fontWeight:700,color:textMain}}>{p.revenue}</td>
                <td style={{padding:'12px 16px',color:'#6366f1',fontWeight:600}}>{p.units}</td>
                <td style={{padding:'12px 16px'}}><span style={{fontSize:'12px',fontWeight:700,color:p.up?'#1FA89A':'#ef4444',display:'flex',alignItems:'center',gap:'3px'}}>{p.up?<TrendingUp size={12}/>:<TrendingDown size={12}/>}{p.growth}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`.kpi{} .chart-grid{} @media(max-width:900px){.kpi{grid-template-columns:1fr 1fr!important;} .chart-grid{grid-template-columns:1fr!important;}} @media(max-width:500px){.kpi{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}

export default function ReportsPage() { return <AdminShell><ReportsContent /></AdminShell>; }
