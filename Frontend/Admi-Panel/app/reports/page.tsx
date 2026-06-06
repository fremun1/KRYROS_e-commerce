'use client';
import { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import PageHeader from '@/components/admin/page-header';
import { useTheme } from '@/contexts/theme-context';
import { BarChart3, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { getReportsSummary, getProducts } from '@/lib/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const monthlyData = [
  { month: 'Jan', revenue: 12400, orders: 45, customers: 28 },
  { month: 'Feb', revenue: 18900, orders: 62, customers: 41 },
  { month: 'Mar', revenue: 15600, orders: 54, customers: 35 },
  { month: 'Apr', revenue: 22100, orders: 78, customers: 52 },
  { month: 'May', revenue: 28400, orders: 102, customers: 68 },
];

const categoryData = [
  { name: 'Electronics', value: 68, color: '#1FA89A' },
  { name: 'Audio', value: 18, color: '#6366f1' },
  { name: 'Wearables', value: 8, color: '#FFC107' },
  { name: 'Others', value: 6, color: '#64748b' },
];

const topProducts = [
  { rank: 1, name: 'iPhone 15 Pro Max', revenue: '$268,755', units: 245, growth: '+12%', up: true },
  { rank: 2, name: 'MacBook Air M2', revenue: '$232,014', units: 186, growth: '+8%', up: true },
  { rank: 3, name: 'AirPods Pro 2', revenue: '$52,290', units: 210, growth: '+22%', up: true },
  { rank: 4, name: 'Apple Watch S9', revenue: '$60,349', units: 151, growth: '-3%', up: false },
  { rank: 5, name: 'Samsung S24 Ultra', revenue: '$143,872', units: 128, growth: '+5%', up: true },
];

function ReportsContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#101826' : '#F1F5F9';
  const gridColor = isDark ? '#1E293B' : '#E2E8F0';

  const [chartData, setChartData] = useState(monthlyData);
  const [catData, setCatData] = useState(categoryData);
  const [prodData, setProdData] = useState(topProducts);
  const [kpis, setKpis] = useState([
    { label: 'Total Revenue', val: 'Loading...', change: '—', up: true },
    { label: 'Total Orders', val: '—', change: '—', up: true },
    { label: 'New Customers', val: '—', change: '—', up: true },
    { label: 'Avg Order Value', val: '—', change: '—', up: false },
  ]);

  useEffect(() => {
    getReportsSummary('year').then((r: any) => {
      const d = r.data;
      if (!d) return;
      setKpis([
        { label: 'Total Revenue', val: d.totalRevenue ? `K${Number(d.totalRevenue).toLocaleString()}` : 'K0', change: d.revenueGrowth ? `${d.revenueGrowth>0?'+':''}${d.revenueGrowth}%` : '0%', up: (d.revenueGrowth||0)>=0 },
        { label: 'Total Orders', val: String(d.totalOrders||0), change: d.ordersGrowth ? `${d.ordersGrowth>0?'+':''}${d.ordersGrowth}%` : '0%', up: (d.ordersGrowth||0)>=0 },
        { label: 'New Customers', val: String(d.newCustomers||d.totalCustomers||0), change: d.customersGrowth ? `${d.customersGrowth>0?'+':''}${d.customersGrowth}%` : '0%', up: true },
        { label: 'Avg Order Value', val: d.averageOrderValue ? `K${Number(d.averageOrderValue).toFixed(0)}` : 'K0', change: '0%', up: false },
      ]);
      if (Array.isArray(d.monthly) && d.monthly.length > 0) {
        setChartData(d.monthly.map((m: any) => ({ month: m.month||m.name, revenue: Number(m.revenue||0), orders: Number(m.orders||0), customers: Number(m.customers||0) })));
      }
      if (Array.isArray(d.categories) && d.categories.length > 0) {
        const colors = ['#1FA89A','#6366f1','#FFC107','#ef4444','#64748b'];
        setCatData(d.categories.map((c: any, i: number) => ({ name: c.name||c.category, value: Number(c.value||c.percentage||0), color: colors[i%colors.length] })));
      }
    }).catch(() => {});
    getProducts({ limit: 10, sortBy: 'bestSelling' }).then((r: any) => {
      const raw: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      if (raw.length === 0) return;
      setProdData(raw.map((p: any, i: number) => ({
        rank: i+1, name: p.name||'Unknown',
        revenue: p.price ? `K${Number(p.price).toLocaleString()}` : 'K0',
        units: p._count?.orderItems ?? p.sold ?? 0,
        growth: '+0%', up: true,
      })));
    }).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Sales analytics and business insights" icon={BarChart3}
        extra={
          <button style={{display:'flex',alignItems:'center',gap:'6px',background:surface,border:`1px solid ${border}`,borderRadius:'9px',color:textMain,fontSize:'13px',fontWeight:500,padding:'8px 14px',cursor:'pointer',fontFamily:'var(--font-inter)'}}>
            <Download size={14} /> Export
          </button>
        }
      />

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'24px'}} className="kpi">
        {kpis.map(k=>(
          <div key={k.label} style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'16px'}}>
            <div style={{fontSize:'12px',color:textMuted,marginBottom:'6px'}}>{k.label}</div>
            <div style={{fontSize:'22px',fontWeight:800,color:textMain}}>{k.val}</div>
            <div style={{fontSize:'12px',fontWeight:600,color:k.up?'#1FA89A':'#ef4444',display:'flex',alignItems:'center',gap:'3px',marginTop:'4px'}}>
              {k.up?<TrendingUp size={12}/>:<TrendingDown size={12}/>}{k.change} vs last month
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:'16px',marginBottom:'20px'}} className="chart-grid">
        <div style={{background:card,border:`1px solid ${border}`,borderRadius:'12px',padding:'20px'}}>
          <div style={{fontSize:'14px',fontWeight:700,color:textMain,marginBottom:'16px'}}>Monthly Revenue</div>
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
          <div style={{fontSize:'14px',fontWeight:700,color:textMain,marginBottom:'16px'}}>Sales by Category</div>
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
        <div style={{fontSize:'14px',fontWeight:700,color:textMain,marginBottom:'16px'}}>Orders & Customers Trend</div>
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

