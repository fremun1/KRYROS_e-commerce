'use client';
import AdminShell from '@/components/admin/admin-shell';
import PageHeader from '@/components/admin/page-header';
import { useTheme } from '@/contexts/theme-context';
import { Settings, Store, Bell, Shield, Globe, CreditCard, Palette, Save, Mail, MessageSquare, Smartphone, Send, CheckCircle, AlertCircle, Clock, KeyRound, Lock, Unlock, RefreshCw, Copy } from 'lucide-react';
import api from '@/lib/api';
import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '@/lib/api';
import toast from 'react-hot-toast';

type Tab = 'general'|'store'|'notifications'|'security'|'payments'|'appearance';

const tabs: {id: Tab; label: string; icon: React.ComponentType<{size?: number; color?: string}>}[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'store', label: 'Store', icon: Store },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#101826' : '#F1F5F9';
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [storeName, setStoreName] = useState('Kryros Mobile');
  const [storeEmail, setStoreEmail] = useState('info@kryros.com');
  const [storePhone, setStorePhone] = useState('+260 97X XXX XXX');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('Africa/Lusaka');
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [orderNotif, setOrderNotif] = useState(true);
  const [processingFeeRate, setProcessingFeeRate] = useState('10');
  
  // ── 2FA state ──────────────────────────────────────────────────────────────
  type TwoFAStep = 'loading' | 'disabled' | 'setup' | 'enabled' | 'disabling';
  const [twoFAStep, setTwoFAStep] = useState<TwoFAStep>('loading');
  const [twoFAQr, setTwoFAQr] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFABusy, setTwoFABusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testBroadcastSubject, setTestBroadcastSubject] = useState('');
  const [testBroadcastMsg, setTestBroadcastMsg] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  
  const [storeSettings, setStoreSettings] = useState({
    isStoreClosed: false,
    closureMessage: 'We are currently closed. Please come back later.',
    openingTime: '08:00',
    closingTime: '18:00',
    operatingDays: 'Mon - Sun',
    nextOpeningTime: '06:00 PM',
    nextOpeningDay: 'Thursday',
  });

  useEffect(() => {
    getSettings().then((r: any) => {
      const settings = Array.isArray(r.data) ? r.data : [];
      if (settings.length === 0) return;
      
      const sMap: Record<string, string> = {};
      settings.forEach((s: any) => { sMap[s.key] = s.value; });

      if (sMap.store_name) setStoreName(sMap.store_name);
      if (sMap.store_email) setStoreEmail(sMap.store_email);
      if (sMap.store_phone) setStorePhone(sMap.store_phone);
      if (sMap.currency) setCurrency(sMap.currency);
      if (sMap.timezone) setTimezone(sMap.timezone);
      if (sMap.email_notifications) setEmailNotif(sMap.email_notifications === 'true');
      if (sMap.push_notifications) setPushNotif(sMap.push_notifications === 'true');
      if (sMap.order_notifications) setOrderNotif(sMap.order_notifications === 'true');
      if (sMap.processing_fee_rate) setProcessingFeeRate(sMap.processing_fee_rate);
      
      setStoreSettings({
        isStoreClosed: sMap.is_store_closed_manual === 'true',
        closureMessage: sMap.store_closed_message || 'We are currently closed. Please come back later.',
        openingTime: sMap.opening_time || '08:00',
        closingTime: sMap.closing_time || '18:00',
        operatingDays: sMap.store_operating_days || 'Mon - Sun',
        nextOpeningTime: sMap.next_opening_time || '06:00 PM',
        nextOpeningDay: sMap.next_opening_day || 'Thursday',
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/api/auth/2fa/status').then((r: any) => {
      setTwoFAStep(r.data?.enabled ? 'enabled' : 'disabled');
    }).catch(() => { setTwoFAStep('disabled'); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        store_name: storeName,
        store_email: storeEmail,
        store_phone: storePhone,
        currency: currency,
        timezone: timezone,
        email_notifications: String(emailNotif),
        push_notifications: String(pushNotif),
        order_notifications: String(orderNotif),
        is_store_closed_manual: String(storeSettings.isStoreClosed),
        store_closed_message: storeSettings.closureMessage,
        opening_time: storeSettings.openingTime,
        closing_time: storeSettings.closingTime,
        store_operating_days: storeSettings.operatingDays,
        next_opening_time: storeSettings.nextOpeningTime,
        next_opening_day: String(storeSettings.nextOpeningDay),
        processing_fee_rate: processingFeeRate,
      });
      toast.success('Settings saved successfully');
    } catch { toast.error('Failed to save settings — check connection'); }
    setSaving(false);
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim()) { toast.error('Enter an email address'); return; }
    setTestEmailSending(true);
    try {
      await api.post('/api/notifications/email/test', { email: testEmail, firstName: 'Admin' });
      toast.success('Test email sent! Check your inbox.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'SMTP not configured or send failed');
    }
    setTestEmailSending(false);
  };

  const handleBroadcast = async () => {
    if (!testBroadcastSubject.trim() || !testBroadcastMsg.trim()) { toast.error('Subject and message are required'); return; }
    setBroadcastSending(true);
    try {
      const res: any = await api.post('/api/notifications/email/broadcast', {
        sendToAll: true,
        subject: testBroadcastSubject,
        headline: testBroadcastSubject,
        message: testBroadcastMsg,
      });
      toast.success(`Broadcast sent to ${res.data?.sent || '?'} users!`);
      setTestBroadcastSubject('');
      setTestBroadcastMsg('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Broadcast failed');
    }
    setBroadcastSending(false);
  };

  const handle2faSetup = async () => {
    setTwoFABusy(true);
    try {
      const res: any = await api.post('/api/auth/2fa/setup');
      setTwoFAQr(res.data.qrCodeUrl);
      setTwoFACode('');
      setTwoFAStep('setup');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to generate 2FA setup');
    }
    setTwoFABusy(false);
  };

  const handle2faEnable = async () => {
    setTwoFABusy(true);
    try {
      await api.post('/api/auth/2fa/enable', { code: twoFACode });
      toast.success('Two-factor authentication enabled!');
      setTwoFAStep('enabled');
      setTwoFACode('');
      setTwoFAQr('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Invalid code — try again');
    }
    setTwoFABusy(false);
  };

  const handle2faDisable = async () => {
    setTwoFABusy(true);
    try {
      await api.post('/api/auth/2fa/disable', { code: twoFACode });
      toast.success('Two-factor authentication disabled');
      setTwoFAStep('disabled');
      setTwoFACode('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Invalid code — try again');
    }
    setTwoFABusy(false);
  };

  const inputStyle = { width:'100%', background:surface, border:`1px solid ${border}`, borderRadius:'9px', color:textMain, fontSize:'13.5px', fontFamily:'var(--font-inter)', outline:'none', padding:'10px 14px' };
  const labelStyle = { fontSize:'12.5px', fontWeight:600, color:textMuted, display:'block' as const, marginBottom:'6px' };

  const ToggleSwitch = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} style={{ width:'44px', height:'24px', borderRadius:'12px', background:value?'#1FA89A':'rgba(100,116,139,0.3)', border:'none', cursor:'pointer', padding:'2px', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:value?'flex-end':'flex-start' }}>
      <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );

  const SectionTitle = ({ title, sub }: { title: string; sub?: string }) => (
    <div style={{ marginBottom:'20px', paddingBottom:'14px', borderBottom:`1px solid ${border}` }}>
      <div style={{ fontSize:'15px', fontWeight:700, color:textMain }}>{title}</div>
      {sub && <div style={{ fontSize:'13px', color:textMuted, marginTop:'2px' }}>{sub}</div>}
    </div>
  );

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom:'16px' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );

  const Row = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:`1px solid ${border}` }}>
      <div>
        <div style={{ fontSize:'13.5px', fontWeight:600, color:textMain }}>{label}</div>
        {sub && <div style={{ fontSize:'12px', color:textMuted, marginTop:'2px' }}>{sub}</div>}
      </div>
      {children}
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'general': return (
        <div>
          <SectionTitle title="General Settings" sub="Basic store information and configuration" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }} className="fg">
            <Field label="Store Name"><input style={inputStyle} value={storeName} onChange={e=>setStoreName(e.target.value)} /></Field>
            <Field label="Store Email"><input style={inputStyle} value={storeEmail} onChange={e=>setStoreEmail(e.target.value)} /></Field>
            <Field label="Phone Number"><input style={inputStyle} value={storePhone} onChange={e=>setStorePhone(e.target.value)} /></Field>
            <Field label="Default Currency">
              <select style={inputStyle} value={currency} onChange={e=>setCurrency(e.target.value)}>
                {['USD'].map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Timezone">
              <select style={inputStyle} value={timezone} onChange={e=>setTimezone(e.target.value)}>
                {['Africa/Lusaka','Africa/Nairobi','Africa/Johannesburg','Europe/London','America/New_York'].map(t=><option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Language">
              <select style={inputStyle}><option>English (US)</option><option>English (UK)</option></select>
            </Field>
          </div>
        </div>
      );
      case 'store': return (
        <div>
          <SectionTitle title="Store Settings" sub="Configure your eCommerce store options" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }} className="fg">
            <Field label="Store URL"><input style={inputStyle} defaultValue="https://kryros.com" /></Field>
            <Field label="Admin Panel URL"><input style={inputStyle} defaultValue="https://admin.kryros.com" /></Field>
            <Field label="Processing Fees Rate (%)"><input style={inputStyle} type="number" value={processingFeeRate} onChange={e=>setProcessingFeeRate(e.target.value)} /></Field>
            <Field label="Min Order Amount"><input style={inputStyle} type="number" defaultValue="20" /></Field>
            <Field label="Items Per Page"><input style={inputStyle} type="number" defaultValue="20" /></Field>
            <Field label="Max Cart Items"><input style={inputStyle} type="number" defaultValue="50" /></Field>
          </div>
          <Row label="Allow Guest Checkout" sub="Let customers checkout without an account"><ToggleSwitch value={true} onChange={()=>{}} /></Row>
          <Row label="Show Stock Quantity" sub="Display available stock on product pages"><ToggleSwitch value={true} onChange={()=>{}} /></Row>
          <Row label="Enable Reviews" sub="Allow customers to review products"><ToggleSwitch value={true} onChange={()=>{}} /></Row>
          <Row label="Enable Wishlist" sub="Let users save products for later"><ToggleSwitch value={false} onChange={()=>{}} /></Row>
          <SectionTitle title="Store Hours & Closure" sub="Set operating hours and manually close the store" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }} className="fg">
            <Field label="Opening Time"><input style={inputStyle} type="time" value={storeSettings.openingTime} onChange={e=>setStoreSettings({...storeSettings, openingTime: e.target.value})} /></Field>
            <Field label="Closing Time"><input style={inputStyle} type="time" value={storeSettings.closingTime} onChange={e=>setStoreSettings({...storeSettings, closingTime: e.target.value})} /></Field>
            <Field label="Operating Days"><input style={inputStyle} type="text" value={storeSettings.operatingDays} onChange={e=>setStoreSettings({...storeSettings, operatingDays: e.target.value})} placeholder="e.g. Mon - Sun" /></Field>
            <Field label="Next Opening Time"><input style={inputStyle} type="text" value={storeSettings.nextOpeningTime} onChange={e=>setStoreSettings({...storeSettings, nextOpeningTime: e.target.value})} placeholder="e.g. 06:00 PM" /></Field>
            <Field label="Next Opening Day"><input style={inputStyle} type="text" value={storeSettings.nextOpeningDay} onChange={e=>setStoreSettings({...storeSettings, nextOpeningDay: e.target.value})} placeholder="e.g. Thursday" /></Field>
          </div>
          <Row label="Store Closed (Manual)" sub="Temporarily close the store and disable all purchases"><ToggleSwitch value={storeSettings.isStoreClosed} onChange={()=>setStoreSettings({...storeSettings, isStoreClosed: !storeSettings.isStoreClosed})} /></Row>
          {storeSettings.isStoreClosed && (
            <Field label="Closure Message">
              <textarea style={{...inputStyle, height:'80px', resize:'none'}} value={storeSettings.closureMessage} onChange={e=>setStoreSettings({...storeSettings, closureMessage: e.target.value})} />
            </Field>
          )}
        </div>
      );
      case 'notifications': return (
        <div>
          <SectionTitle title="Notifications" sub="Configure how you and your customers get notified" />
          <Row label="Email Notifications" sub="Receive emails for new orders and system alerts"><ToggleSwitch value={emailNotif} onChange={()=>setEmailNotif(!emailNotif)} /></Row>
          <Row label="Push Notifications" sub="Send push notifications to mobile devices"><ToggleSwitch value={pushNotif} onChange={()=>setPushNotif(!pushNotif)} /></Row>
          <Row label="Order Status Updates" sub="Notify customers when their order status changes"><ToggleSwitch value={orderNotif} onChange={()=>setOrderNotif(!orderNotif)} /></Row>
          
          <div style={{ marginTop:'24px' }}>
            <SectionTitle title="Email Marketing & Broadcast" sub="Send messages to all registered customers" />
            <div style={{ background:surface, border:`1px solid ${border}`, borderRadius:'12px', padding:'20px' }}>
              <Field label="Broadcast Subject">
                <input style={inputStyle} placeholder="e.g. Weekend Flash Sale!" value={testBroadcastSubject} onChange={e=>setTestBroadcastSubject(e.target.value)} />
              </Field>
              <Field label="Message Body">
                <textarea style={{...inputStyle, height:'100px', resize:'none'}} placeholder="Write your message here..." value={testBroadcastMsg} onChange={e=>setTestBroadcastMsg(e.target.value)} />
              </Field>
              <button onClick={handleBroadcast} disabled={broadcastSending}
                style={{ background:'#1FA89A', color:'white', border:'none', borderRadius:'9px', padding:'10px 20px', fontSize:'13.5px', fontWeight:700, cursor:broadcastSending?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:'8px', opacity:broadcastSending?0.7:1 }}>
                {broadcastSending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                {broadcastSending ? 'Sending...' : 'Send Broadcast to All Users'}
              </button>
            </div>
          </div>

          <div style={{ marginTop:'24px' }}>
            <SectionTitle title="SMTP Test" sub="Verify your email server configuration" />
            <div style={{ display:'flex', gap:'10px' }}>
              <input style={{...inputStyle, flex:1}} placeholder="Enter email to receive test" value={testEmail} onChange={e=>setTestEmail(e.target.value)} />
              <button onClick={handleTestEmail} disabled={testEmailSending}
                style={{ background:card, border:`1px solid ${border}`, borderRadius:'9px', padding:'0 20px', fontSize:'13px', fontWeight:600, color:textMain, cursor:testEmailSending?'not-allowed':'pointer' }}>
                {testEmailSending ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      );
      case 'security': return (
        <div>
          <SectionTitle title="Security Settings" sub="Protect your account and store data" />
          
          <div style={{ background:surface, border:`1px solid ${border}`, borderRadius:'12px', padding:'20px', marginBottom:'24px' }}>
            <div style={{ display:'flex', alignItems:'start', gap:'16px' }}>
              <div style={{ width:'48px', height:'48px', borderRadius:'12px', background:'rgba(31,168,154,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Shield size={24} color="#1FA89A" style={{margin:'auto'}} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'15px', fontWeight:700, color:textMain, marginBottom:'4px' }}>Two-Factor Authentication (2FA)</div>
                <p style={{ fontSize:'13px', color:textMuted, lineHeight:1.5 }}>
                  Add an extra layer of security to your account. When enabled, you'll need to provide a code from your authenticator app to log in.
                </p>
                
                <div style={{ marginTop:'16px' }}>
                  {twoFAStep === 'loading' && <div style={{ fontSize:'13px', color:textMuted }}>Checking 2FA status...</div>}
                  
                  {twoFAStep === 'disabled' && (
                    <button onClick={handle2faSetup} disabled={twoFABusy}
                      style={{ background:'#1FA89A', color:'white', border:'none', borderRadius:'8px', padding:'8px 16px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                      Enable 2FA
                    </button>
                  )}
                  
                  {twoFAStep === 'setup' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <p style={{ fontSize:'13px', fontWeight:600, color:textMain, marginBottom:'8px' }}>1. Scan this QR code with Google Authenticator or Authy:</p>
                      {twoFAQr ? (
                        <div style={{ background:'white', padding:'12px', borderRadius:'8px', display:'inline-block', marginBottom:'16px' }}>
                          <img src={twoFAQr} alt="2FA QR Code" style={{ width:'160px', height:'160px' }} />
                        </div>
                      ) : <div style={{ height:'160px', width:'160px', background:surface, borderRadius:'8px', marginBottom:'16px' }} />}
                      
                      <p style={{ fontSize:'13px', fontWeight:600, color:textMain, marginBottom:'8px' }}>2. Enter the 6-digit code from the app:</p>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <input style={{...inputStyle, width:'120px'}} maxLength={6} placeholder="000000" value={twoFACode} onChange={e=>setTwoFACode(e.target.value)} />
                        <button onClick={handle2faEnable} disabled={twoFABusy || twoFACode.length!==6}
                          style={{ background:'#1FA89A', color:'white', border:'none', borderRadius:'8px', padding:'0 16px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                          Verify & Enable
                        </button>
                        <button onClick={()=>setTwoFAStep('disabled')} style={{ background:'transparent', border:'none', color:textMuted, fontSize:'13px', cursor:'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                  
                  {twoFAStep === 'enabled' && (
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', color:'#1FA89A', fontSize:'13px', fontWeight:600 }}>
                        <CheckCircle size={16} /> 2FA is currently active
                      </div>
                      <button onClick={()=>setTwoFAStep('disabling')}
                        style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
                        Disable 2FA
                      </button>
                    </div>
                  )}
                  
                  {twoFAStep === 'disabling' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      <p style={{ fontSize:'13px', color:'#ef4444', fontWeight:600, marginBottom:'8px' }}>Confirm disabling 2FA. Enter your current code:</p>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <input style={{...inputStyle, width:'120px'}} maxLength={6} placeholder="000000" value={twoFACode} onChange={e=>setTwoFACode(e.target.value)} />
                        <button onClick={handle2faDisable} disabled={twoFABusy || twoFACode.length!==6}
                          style={{ background:'#ef4444', color:'white', border:'none', borderRadius:'8px', padding:'0 16px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                          Disable Now
                        </button>
                        <button onClick={()=>setTwoFAStep('enabled')} style={{ background:'transparent', border:'none', color:textMuted, fontSize:'13px', cursor:'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Row label="Force Password Change" sub="Require all users to change password on next login"><button style={{ background:card, border:`1px solid ${border}`, borderRadius:'8px', padding:'6px 12px', fontSize:'12px', fontWeight:600, color:textMain, cursor:'pointer' }}>Action</button></Row>
          <Row label="Session Timeout" sub="Automatically logout inactive users after 30 mins"><ToggleSwitch value={true} onChange={()=>{}} /></Row>
          <Row label="Login Alerts" sub="Notify by email on new device login"><ToggleSwitch value={true} onChange={()=>{}} /></Row>
        </div>
      );
      case 'payments': return (
        <div>
          <SectionTitle title="Payment Configuration" sub="Manage how you receive payments" />
          <Row label="Enable Credit System" sub="Allow customers to buy items on credit"><ToggleSwitch value={true} onChange={()=>{}} /></Row>
          <Row label="Enable Wallet" sub="Let users maintain a balance for quick purchases"><ToggleSwitch value={true} onChange={()=>{}} /></Row>
          <Row label="Auto-Approve Payments" sub="Automatically mark orders as paid on successful API response"><ToggleSwitch value={false} onChange={()=>{}} /></Row>
          
          <div style={{ marginTop:'24px' }}>
            <SectionTitle title="API Keys" sub="External payment provider credentials" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }} className="fg">
              <Field label="Flutterwave Public Key"><input style={inputStyle} type="password" defaultValue="FLWPUBK-xxxxxxxxxxxxxxxx" /></Field>
              <Field label="Paystack Secret Key"><input style={inputStyle} type="password" defaultValue="sk_test_xxxxxxxxxxxxxxxx" /></Field>
              <Field label="PayPal Client ID"><input style={inputStyle} type="password" defaultValue="AQxxxxxxxxxxxxxxxxxxxxxx" /></Field>
              <Field label="Stripe Publishable Key"><input style={inputStyle} type="password" defaultValue="pk_test_xxxxxxxxxxxxxxxx" /></Field>
            </div>
          </div>
        </div>
      );
      case 'appearance': return (
        <div>
          <SectionTitle title="Appearance" sub="Customize the look and feel of your store" />
          <Row label="Dark Mode" sub="Use dark theme by default for all users"><ToggleSwitch value={isDark} onChange={()=>setTheme(isDark?'light':'dark')} /></Row>
          <Row label="Compact UI" sub="Reduce spacing and padding across the dashboard"><ToggleSwitch value={false} onChange={()=>{}} /></Row>
          
          <div style={{ marginTop:'24px' }}>
            <SectionTitle title="Brand Colors" sub="Main colors used in the user interface" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' }}>
              <Field label="Primary Color">
                <div style={{ display:'flex', gap:'8px' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#1FA89A', border:`1px solid ${border}` }} />
                  <input style={inputStyle} defaultValue="#1FA89A" />
                </div>
              </Field>
              <Field label="Secondary Color">
                <div style={{ display:'flex', gap:'8px' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#0F172A', border:`1px solid ${border}` }} />
                  <input style={inputStyle} defaultValue="#0F172A" />
                </div>
              </Field>
              <Field label="Accent Color">
                <div style={{ display:'flex', gap:'8px' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#FFC107', border:`1px solid ${border}` }} />
                  <input style={inputStyle} defaultValue="#FFC107" />
                </div>
              </Field>
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <AdminShell>
      <div style={{ maxWidth:'1000px', margin:'0 auto' }}>
        <PageHeader title="Settings" subtitle="Manage your platform configuration and preferences" icon={Settings} />
        
        <div style={{ display:'flex', gap:'24px', marginTop:'24px' }} className="flex-col md:flex-row">
          {/* Tabs Sidebar */}
          <div style={{ width:'240px', flexShrink:0 }} className="w-full md:w-[240px]">
            <div style={{ background:card, border:`1px solid ${border}`, borderRadius:'16px', padding:'8px', position:'sticky', top:'24px' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={()=>setActiveTab(t.id)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderRadius:'12px', border:'none', background:activeTab===t.id?'rgba(31,168,154,0.1)':'transparent', color:activeTab===t.id?'#1FA89A':textMuted, fontSize:'14px', fontWeight:600, cursor:'pointer', transition:'all 0.2s', textAlign:'left' }}>
                  <t.icon size={18} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex:1 }}>
            <div style={{ background:card, border:`1px solid ${border}`, borderRadius:'16px', padding:'24px', minHeight:'500px' }}>
              {renderTab()}
              
              <div style={{ marginTop:'32px', paddingTop:'24px', borderTop:`1px solid ${border}`, display:'flex', justifyContent:'flex-end' }}>
                <button onClick={handleSave} disabled={saving}
                  style={{ background:'#1FA89A', color:'white', border:'none', borderRadius:'10px', padding:'12px 24px', fontSize:'14px', fontWeight:700, cursor:saving?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:'8px', boxShadow:'0 4px 12px rgba(31,168,154,0.2)' }}>
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Saving...' : 'Save All Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
