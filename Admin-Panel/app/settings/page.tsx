'use client';
import { THEME_COLOR_CATALOG, THEME_COLOR_CATEGORIES } from '@/lib/theme-catalog';
import AdminShell from '@/components/admin/admin-shell';
import PageHeader from '@/components/admin/page-header';
import { Settings, Store, Bell, Shield, CreditCard, Palette, Save, Send, CheckCircle, RefreshCw, Globe, Lock } from 'lucide-react';
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
  const card = 'var(--card)';
  const border = 'var(--border)';
  const textMain = 'var(--text-main)';
  const textMuted = 'var(--text-muted)';
  const surface = 'var(--surface)';
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [storeName, setStoreName] = useState('Kryros Mobile');
  const [storeEmail, setStoreEmail] = useState(process.env.NEXT_PUBLIC_STORE_EMAIL || 'info@kryros.com');
  const [storePhone, setStorePhone] = useState('+260 97X XXX XXX');
  const [timezone, setTimezone] = useState('Africa/Lusaka');
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [orderNotif, setOrderNotif] = useState(true);
  const [processingFeeRate, setProcessingFeeRate] = useState('10');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [regionRestrictionEnabled, setRegionRestrictionEnabled] = useState(false);
  const [blockedCountries, setBlockedCountries] = useState('');
  const [screenshotRestrictionEnabled, setScreenshotRestrictionEnabled] = useState(false);
  
  // ── 2FA state ──────────────────────────────────────────────────────────────
  type TwoFAStep = 'loading' | 'disabled' | 'setup' | 'enabled' | 'disabling';
  const [twoFAStep, setTwoFAStep] = useState<TwoFAStep>('loading');
  const [twoFAQr, setTwoFAQr] = useState('');
  const [twoFASecret, setTwoFASecret] = useState(''); // Secret key for manual entry
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFABusy, setTwoFABusy] = useState(false);
  // ── Theme color state ───────────────────────────────────────────────────────
  const [themeColors, setThemeColors] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    THEME_COLOR_CATALOG.forEach(t => { init[t.key] = t.defaultValue; });
    return init;
  });
  const [themePreviewActive, setThemePreviewActive] = useState(false);

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
      if (sMap.timezone) setTimezone(sMap.timezone);
      if (sMap.email_notifications) setEmailNotif(sMap.email_notifications === 'true');
      if (sMap.push_notifications) setPushNotif(sMap.push_notifications === 'true');
      if (sMap.order_notifications) setOrderNotif(sMap.order_notifications === 'true');
      if (sMap.processing_fee_rate) setProcessingFeeRate(sMap.processing_fee_rate);
      if (sMap.whatsapp_number) setWhatsappNumber(sMap.whatsapp_number);
      if (sMap.admin_region_restriction_enabled) setRegionRestrictionEnabled(sMap.admin_region_restriction_enabled === 'true');
      if (sMap.admin_blocked_countries) setBlockedCountries(sMap.admin_blocked_countries);
      if (sMap.admin_screenshot_restriction_enabled) setScreenshotRestrictionEnabled(sMap.admin_screenshot_restriction_enabled === 'true');

      // Load theme colors
      const colorUpdates: Record<string, string> = {};
      THEME_COLOR_CATALOG.forEach(t => {
        if (sMap[t.key]) colorUpdates[t.key] = sMap[t.key];
      });
      if (Object.keys(colorUpdates).length > 0) {
        setThemeColors(prev => ({ ...prev, ...colorUpdates }));
      }
      
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
        whatsapp_number: whatsappNumber,
        admin_region_restriction_enabled: String(regionRestrictionEnabled),
        admin_blocked_countries: blockedCountries,
        admin_screenshot_restriction_enabled: String(screenshotRestrictionEnabled),
        // Theme colors
        ...themeColors,
      });
      toast.success('Settings saved successfully');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'check connection';
      toast.error(`Failed to save settings — ${msg}`);
    }
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
      setTwoFASecret(res.data.secret); // Store secret for manual entry
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
    <button onClick={onChange} style={{ width:'44px', height:'24px', borderRadius:'12px', background:value?'var(--primary)':'rgba(100,116,139,0.3)', border:'none', cursor:'pointer', padding:'2px', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:value?'flex-end':'flex-start' }}>
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
            <Field label="Store Phone Number"><input style={inputStyle} value={storePhone} onChange={e=>setStorePhone(e.target.value)} /></Field>
            <Field label="WhatsApp Number (Payment)"><input style={inputStyle} value={whatsappNumber} onChange={e=>setWhatsappNumber(e.target.value)} placeholder="e.g. 260969597029" /></Field>
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
            <Field label="Store URL"><input style={inputStyle} defaultValue={process.env.NEXT_PUBLIC_FRONTEND_URL || ""} /></Field>
            <Field label="Admin Panel URL"><input style={inputStyle} defaultValue={process.env.NEXT_PUBLIC_ADMIN_URL || ""} /></Field>
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
                style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:'9px', padding:'10px 20px', fontSize:'13.5px', fontWeight:700, cursor:broadcastSending?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:'8px', opacity:broadcastSending?0.7:1 }}>
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
                <Shield size={24} color="var(--primary)" style={{margin:'auto'}} />
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
                      style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:'8px', padding:'8px 16px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                      Enable 2FA
                    </button>
                  )}
                  
                  {twoFAStep === 'setup' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <p style={{ fontSize:'13px', fontWeight:600, color:textMain, marginBottom:'8px' }}>
                        Choose your setup method:
                      </p>
                      
                      {/* Option 1: QR Code */}
                      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: textMain }}>Option 1: Scan QR Code</span>
                        </div>
                        <p style={{ fontSize:'12px', color:textMuted, marginBottom:'12px' }}>
                          Open Google Authenticator, Authy, or Microsoft Authenticator and scan this code:
                        </p>
                        {twoFAQr ? (
                          <div style={{ background:'white', padding:'12px', borderRadius:'8px', display:'inline-block', marginBottom:'8px', position: 'relative' }}>
                            <img src={twoFAQr} alt="2FA QR Code" style={{ width:'160px', height:'160px' }} />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(twoFAQr);
                                toast.success('QR code data URL copied');
                              }}
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '10px',
                                cursor: 'pointer'
                              }}
                            >
                              Copy Image
                            </button>
                          </div>
                        ) : <div style={{ height:'160px', width:'160px', background:surface, borderRadius:'8px', marginBottom:'8px', display:'flex', alignItems:'center', justifyContent:'center', color:textMuted }}>Generating...</div>}
                      </div>

                      {/* Option 2: Manual Entry - Secret Key */}
                      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold)' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: textMain }}>Option 2: Manual Entry (Setup Key)</span>
                        </div>
                        <p style={{ fontSize:'12px', color:textMuted, marginBottom:'12px' }}>
                          Can't scan? Enter this setup key manually in your authenticator app:
                        </p>
                        {twoFASecret && (
                          <>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <code style={{
                                background: 'var(--bg)',
                                border: `1px solid ${border}`,
                                borderRadius: '8px',
                                padding: '12px 16px',
                                fontSize: '14px',
                                fontFamily: 'monospace',
                                letterSpacing: '0.1em',
                                color: textMain,
                                flex: 1,
                                minWidth: '200px',
                                textTransform: 'uppercase',
                                userSelect: 'all'
                              }}>
                                {twoFASecret.match(/.{1,4}/g)?.join(' ') || twoFASecret}
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(twoFASecret);
                                  toast.success('Setup key copied to clipboard');
                                }}
                                style={{
                                  background: 'var(--primary)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '8px 16px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Copy Key
                              </button>
                            </div>
                            <p style={{ fontSize:'11px', color:textMuted, marginTop:'8px' }}>
                              Enter this key in your authenticator app as "Setup Key" or "Manual Entry"
                            </p>
                          </>
                        )}
                      </div>

                      {/* Option 3: OTPAuth URL (for apps that accept URL paste) */}
                      {twoFAQr && (
                        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: textMain }}>Option 3: Paste OTPAuth URL</span>
                          </div>
                          <p style={{ fontSize:'12px', color:textMuted, marginBottom:'12px' }}>
                            Some authenticator apps accept pasting the otpauth:// URL directly:
                          </p>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <code style={{
                              background: 'var(--bg)',
                              border: `1px solid ${border}`,
                              borderRadius: '8px',
                              padding: '8px 12px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              color: textMain,
                              flex: 1,
                              minWidth: '200px',
                              overflow: 'auto',
                              maxWidth: '100%',
                              whiteSpace: 'nowrap'
                            }}>
                              {twoFAQr.split(',')[1] ? atob(twoFAQr.split(',')[1]).split('?')[0] + '?' + atob(twoFAQr.split(',')[1]).split('?')[1] : 'otpauth://totp/KRYROS%20Admin:...'}
                            </code>
                            <button
                              onClick={() => {
                                const otpauthUrl = twoFAQr.split(',')[1] ? atob(twoFAQr.split(',')[1]) : '';
                                if (otpauthUrl) {
                                  navigator.clipboard.writeText(otpauthUrl);
                                  toast.success('OTPAuth URL copied to clipboard');
                                }
                              }}
                              style={{
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Copy URL
                            </button>
                          </div>
                          <p style={{ fontSize:'11px', color:textMuted, marginTop:'8px' }}>
                            Paste this URL into apps like 1Password, Bitwarden, or KeePassXC
                          </p>
                        </div>
                      )}

                      <p style={{ fontSize:'13px', fontWeight:600, color:textMain, marginBottom:'8px', marginTop: '8px' }}>
                        3. Enter the 6-digit code from your authenticator app:
                      </p>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <input style={{...inputStyle, width:'120px'}} maxLength={6} placeholder="000000" value={twoFACode} onChange={e=>setTwoFACode(e.target.value)} />
                        <button onClick={handle2faEnable} disabled={twoFABusy || twoFACode.length!==6}
                          style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:'8px', padding:'0 16px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                          Verify & Enable
                        </button>
                        <button onClick={()=>{setTwoFAStep('disabled'); setTwoFASecret('');}} style={{ background:'transparent', border:'none', color:textMuted, fontSize:'13px', cursor:'pointer' }}>Cancel</button>
                      </div>

                      {/* Troubleshooting */}
                      <details style={{ marginTop: '20px', padding: '16px', background: surface, border: `1px solid ${border}`, borderRadius: '12px' }}>
                        <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: textMuted, listStyle: 'none' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px' }}>▸</span> Troubleshooting: "Invalid code" errors
                          </span>
                        </summary>
                        <div style={{ marginTop: '12px', fontSize: '11px', color: textMuted, lineHeight: 1.7 }}>
                          <div style={{ marginBottom: '8px' }}>
                            <strong style={{ color: textMain }}>⏱ Time Sync Issues (Most Common):</strong>
                            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                              <li>TOTP codes change every 30 seconds - enter quickly!</li>
                              <li>Your device clock MUST match the server time (±30s)</li>
                              <li><strong>Fix:</strong> Enable "Set time automatically" in OS settings</li>
                              <li><strong>Mobile:</strong> Settings → Date & Time → "Automatic date & time"</li>
                              <li><strong>Authenticator apps:</strong> Some have "Time correction" in settings</li>
                            </ul>
                          </div>
                          <div style={{ marginBottom: '8px' }}>
                            <strong style={{ color: textMain }}>📱 Authenticator App Tips:</strong>
                            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                              <li>Google Authenticator: ⋮ → Time correction → Sync now</li>
                              <li>Authy: Settings → Accounts → Time sync</li>
                              <li>Microsoft Authenticator: ⋮ → Settings → Time sync</li>
                              <li>1Password/Bitwarden: Sync is automatic</li>
                            </ul>
                          </div>
                          <div style={{ marginBottom: '8px' }}>
                            <strong style={{ color: textMain }}>🔑 Common Mistakes:</strong>
                            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                              <li>Entering spaces in the code (use 6 digits only: 123456)</li>
                              <li>Using an old/expired code (codes refresh every 30s)</li>
                              <li>Multiple 2FA entries for same account - delete old ones</li>
                              <li>Wrong account selected in authenticator app</li>
                            </ul>
                          </div>
                          <div style={{ marginBottom: '0' }}>
                            <strong style={{ color: textMain }}>🔧 Still not working?</strong>
                            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                              <li>Click "Cancel" above, then "Enable 2FA" again to generate a new secret</li>
                              <li>Ensure your server has <code>TOTP_ENCRYPTION_KEY</code> in environment variables</li>
                              <li>Check server time with: <code>date</code> (should be UTC)</li>
                            </ul>
                          </div>
                        </div>
                      </details>
                    </div>
                  )}
                  
                  {twoFAStep === 'enabled' && (
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', color:'var(--primary)', fontSize:'13px', fontWeight:600 }}>
                        <CheckCircle size={16} /> 2FA is currently active
                      </div>
                      <button onClick={()=>setTwoFAStep('disabling')}
                        style={{ background:'rgba(239,68,68,0.1)', color:'var(--danger)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
                        Disable 2FA
                      </button>
                    </div>
                  )}
                  
                  {twoFAStep === 'disabling' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      <p style={{ fontSize:'13px', color:'var(--danger)', fontWeight:600, marginBottom:'8px' }}>Confirm disabling 2FA. Enter your current code:</p>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <input style={{...inputStyle, width:'120px'}} maxLength={6} placeholder="000000" value={twoFACode} onChange={e=>setTwoFACode(e.target.value)} />
                        <button onClick={handle2faDisable} disabled={twoFABusy || twoFACode.length!==6}
                          style={{ background:'var(--danger)', color:'white', border:'none', borderRadius:'8px', padding:'0 16px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
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

          <SectionTitle title="Access Control" sub="Restrict admin panel access by region and device" />
          
          <div style={{ background:surface, border:`1px solid ${border}`, borderRadius:'12px', padding:'20px', marginBottom:'24px' }}>
            <div style={{ display:'flex', alignItems:'start', gap:'16px', marginBottom:'16px' }}>
              <div style={{ width:'48px', height:'48px', borderRadius:'12px', background:'rgba(246,176,30,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Globe size={24} color="var(--gold)" style={{margin:'auto'}} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'15px', fontWeight:700, color:textMain, marginBottom:'4px' }}>Region Restriction</div>
                <p style={{ fontSize:'13px', color:textMuted, lineHeight:1.5 }}>
                  Block admin panel access from specific countries. When enabled, users from blocked regions will see an access denied message. Uses IP geolocation — note that VPNs may bypass this.
                </p>
                <div style={{ marginTop:'12px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                  <Row label="Enable Region Restriction" sub="Block admin access from selected countries">
                    <ToggleSwitch value={regionRestrictionEnabled} onChange={()=>setRegionRestrictionEnabled(!regionRestrictionEnabled)} />
                  </Row>
                </div>
                {regionRestrictionEnabled && (
                  <div style={{ marginTop:'16px' }}>
                    <label style={labelStyle}>Blocked Country Codes (comma-separated)</label>
                    <input 
                      style={{...inputStyle, marginTop:'6px'}} 
                      value={blockedCountries} 
                      onChange={e=>setBlockedCountries(e.target.value)} 
                      placeholder="e.g. NG, GH, KE, ZM" 
                    />
                    <div style={{ fontSize:'11px', color:textMuted, marginTop:'4px' }}>
                      Enter ISO 3166-1 alpha-2 country codes separated by commas. Example: NG = Nigeria, GH = Ghana, KE = Kenya.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ background:surface, border:`1px solid ${border}`, borderRadius:'12px', padding:'20px', marginBottom:'24px' }}>
            <div style={{ display:'flex', alignItems:'start', gap:'16px' }}>
              <div style={{ width:'48px', height:'48px', borderRadius:'12px', background:'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Lock size={24} color="var(--danger)" style={{margin:'auto'}} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'15px', fontWeight:700, color:textMain, marginBottom:'4px' }}>Screenshot Restriction</div>
                <p style={{ fontSize:'13px', color:textMuted, lineHeight:1.5 }}>
                  Deter screenshots and screen recording in the admin panel. When enabled, right-click, copy, PrintScreen, and Ctrl+P are blocked. Note: This is a client-side deterrent and cannot prevent all capture methods.
                </p>
                <div style={{ marginTop:'12px' }}>
                  <Row label="Enable Screenshot Restriction" sub="Block common screenshot and copy actions">
                    <ToggleSwitch value={screenshotRestrictionEnabled} onChange={()=>setScreenshotRestrictionEnabled(!screenshotRestrictionEnabled)} />
                  </Row>
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
          <SectionTitle title="Theme Colors" sub="All CSS color variables used across the user-facing storefront. Changes are saved to the database and applied dynamically at runtime — no code deployment needed." />

          {/* Live Preview Toggle */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:surface, border:`1px solid ${border}`, borderRadius:'12px', marginBottom:'24px' }}>
            <div>
              <div style={{ fontSize:'13.5px', fontWeight:700, color:textMain }}>Live Preview in Admin</div>
              <div style={{ fontSize:'12px', color:textMuted, marginTop:'2px' }}>Apply color changes instantly in this panel to preview them before saving</div>
            </div>
            <ToggleSwitch value={themePreviewActive} onChange={() => {
              const next = !themePreviewActive;
              setThemePreviewActive(next);
              if (next) {
                THEME_COLOR_CATALOG.forEach(t => {
                  document.documentElement.style.setProperty(t.cssVar, themeColors[t.key] ?? t.defaultValue);
                });
              } else {
                THEME_COLOR_CATALOG.forEach(t => {
                  document.documentElement.style.removeProperty(t.cssVar);
                });
              }
            }} />
          </div>

          {/* Color groups */}
          {THEME_COLOR_CATEGORIES.map(cat => {
            const tokens = THEME_COLOR_CATALOG.filter(t => t.category === cat.id);
            if (tokens.length === 0) return null;
            return (
              <div key={cat.id} style={{ marginBottom:'32px' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:textMuted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'14px', paddingBottom:'8px', borderBottom:`1px solid ${border}` }}>
                  {cat.label}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'14px' }}>
                  {tokens.map(token => {
                    const isSimpleColor = /^#[0-9a-fA-F]{3,8}$/.test(themeColors[token.key] ?? token.defaultValue);
                    const currentVal = themeColors[token.key] ?? token.defaultValue;
                    return (
                      <div key={token.key} style={{ background:card, border:`1px solid ${border}`, borderRadius:'12px', padding:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>
                        {/* Swatch + label */}
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:currentVal, border:`1px solid ${border}`, flexShrink:0, boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'12.5px', fontWeight:700, color:textMain, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{token.label}</div>
                            <div style={{ fontSize:'10.5px', color:textMuted, fontFamily:'monospace', marginTop:'1px' }}>{token.cssVar}</div>
                          </div>
                          {/* Color picker — only for simple hex values */}
                          {isSimpleColor && (
                            <input
                              type="color"
                              value={currentVal.length === 7 ? currentVal : '#000000'}
                              onChange={e => {
                                const v = e.target.value;
                                setThemeColors(prev => ({ ...prev, [token.key]: v }));
                                if (themePreviewActive) document.documentElement.style.setProperty(token.cssVar, v);
                              }}
                              style={{ width:'28px', height:'28px', border:'none', padding:0, cursor:'pointer', borderRadius:'6px', background:'transparent', flexShrink:0 }}
                              title="Pick color"
                            />
                          )}
                        </div>
                        {/* Hex / value input */}
                        <input
                          style={{ ...inputStyle, fontSize:'12px', padding:'7px 10px', fontFamily:'monospace' }}
                          value={currentVal}
                          onChange={e => {
                            const v = e.target.value;
                            setThemeColors(prev => ({ ...prev, [token.key]: v }));
                            if (themePreviewActive) document.documentElement.style.setProperty(token.cssVar, v);
                          }}
                          placeholder={token.defaultValue}
                        />
                        {/* Reset to default */}
                        {currentVal !== token.defaultValue && (
                          <button
                            onClick={() => {
                              setThemeColors(prev => ({ ...prev, [token.key]: token.defaultValue }));
                              if (themePreviewActive) document.documentElement.style.setProperty(token.cssVar, token.defaultValue);
                            }}
                            style={{ fontSize:'11px', color:textMuted, background:'transparent', border:`1px solid ${border}`, borderRadius:'6px', padding:'3px 8px', cursor:'pointer', alignSelf:'flex-start' }}
                          >
                            Reset to default
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderRadius:'12px', border:'none', background:activeTab===t.id?'rgba(31,168,154,0.1)':'transparent', color:activeTab===t.id?'var(--primary)':textMuted, fontSize:'14px', fontWeight:600, cursor:'pointer', transition:'all 0.2s', textAlign:'left' }}>
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
                  style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:'10px', padding:'12px 24px', fontSize:'14px', fontWeight:700, cursor:saving?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:'8px', boxShadow:'0 4px 12px rgba(192,21,27,0.15)' }}>
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
