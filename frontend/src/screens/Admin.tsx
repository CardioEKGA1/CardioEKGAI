// © 2026 SoulMD. All rights reserved.
import React, { useState, useEffect, useCallback } from 'react';

interface Props { API: string; }
type Tab = 'users' | 'analytics' | 'health' | 'moderation';

const CARD: React.CSSProperties = {background:'rgba(255,255,255,0.85)',borderRadius:'20px',padding:'20px',boxShadow:'0 4px 20px rgba(100,130,200,0.1)',marginBottom:'16px'};
const LABEL: React.CSSProperties = {fontSize:'11px',fontWeight:'700',color:'#8aa0c0',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:'8px'};
const BTN: React.CSSProperties = {border:'1px solid rgba(122,176,240,0.3)',borderRadius:'10px',padding:'6px 12px',fontSize:'12px',fontWeight:'600',cursor:'pointer',background:'rgba(255,255,255,0.7)',color:'#4a7ad0'};
const BTN_DANGER: React.CSSProperties = {border:'1px solid rgba(224,80,80,0.3)',borderRadius:'10px',padding:'6px 12px',fontSize:'12px',fontWeight:'600',cursor:'pointer',background:'rgba(253,232,232,0.7)',color:'#c04040'};

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'});
};

const Admin: React.FC<Props> = ({ API }) => {
  const [token, setToken] = useState<string>(() => {
    const t = localStorage.getItem('admin_token') || '';
    const exp = Number(localStorage.getItem('admin_token_expires') || 0);
    if (t && Date.now() < exp) return t;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_token_expires');
    return '';
  });
  const [tokenInput, setTokenInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('users');

  const login = async () => {
    if (!tokenInput) return;
    setAuthLoading(true); setAuthError('');
    try {
      const res = await fetch(`${API}/admin/verify`, {method:'POST', headers:{'Content-Type':'application/json','X-Admin-Token':tokenInput}});
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Invalid token');
      }
      localStorage.setItem('admin_token', tokenInput);
      localStorage.setItem('admin_token_expires', String(Date.now() + 24*60*60*1000));
      setToken(tokenInput);
    } catch(e:any) { setAuthError(e.message); }
    finally { setAuthLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_token_expires');
    setToken(''); setTokenInput('');
  };

  if (!token) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{background:'rgba(255,255,255,0.85)',borderRadius:'24px',padding:'40px',maxWidth:'400px',width:'100%',boxShadow:'0 8px 32px rgba(100,130,200,0.12)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
            <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'18px'}}>⚙</div>
            <div>
              <div style={{fontSize:'20px',fontWeight:'800',color:'#1a2a4a'}}>Admin Console</div>
              <div style={{fontSize:'11px',color:'#8aa0c0'}}>Restricted access</div>
            </div>
          </div>
          <div style={{fontSize:'13px',color:'#8aa0c0',marginBottom:'20px',lineHeight:'1.6'}}>Enter your admin token to continue. Session lasts 24 hours.</div>
          {authError && <div style={{background:'#fde8e8',border:'1px solid #f0b0b0',borderRadius:'10px',padding:'12px',fontSize:'13px',color:'#c04040',marginBottom:'16px'}}>{authError}</div>}
          <input type="password" placeholder="Admin token" value={tokenInput} onChange={e=>setTokenInput(e.target.value)} onKeyDown={e=>e.key==='Enter' && login()} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid rgba(122,176,240,0.3)',fontSize:'14px',color:'#1a2a4a',background:'rgba(240,246,255,0.5)',marginBottom:'16px',outline:'none',boxSizing:'border-box'}}/>
          <button onClick={login} disabled={authLoading || !tokenInput} style={{width:'100%',background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',border:'none',borderRadius:'14px',padding:'14px',fontSize:'15px',fontWeight:'700',color:'white',cursor:authLoading||!tokenInput?'default':'pointer',opacity:authLoading||!tokenInput?0.6:1}}>
            {authLoading ? 'Verifying...' : 'Access Admin'}
          </button>
        </div>
      </div>
    );
  }

  const authHeaders = { 'Content-Type':'application/json', 'X-Admin-Token': token };

  return (
    <div style={{minHeight:'100vh',padding:'20px 16px',maxWidth:'1200px',margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'18px'}}>⚙</div>
          <div>
            <div style={{fontSize:'20px',fontWeight:'800',color:'#1a2a4a'}}>Admin Console</div>
            <div style={{fontSize:'11px',color:'#8aa0c0'}}>EKGScan · SoulMD</div>
          </div>
        </div>
        <button onClick={logout} style={{...BTN}}>Sign Out</button>
      </div>

      <div style={{display:'flex',gap:'8px',marginBottom:'20px',flexWrap:'wrap'}}>
        {(['users','analytics','health','moderation'] as Tab[]).map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{background:tab===t?'linear-gradient(135deg,#7ab0f0,#9b8fe8)':'rgba(255,255,255,0.7)',border:'1px solid rgba(122,176,240,0.3)',borderRadius:'10px',padding:'8px 16px',fontSize:'13px',fontWeight:'600',color:tab===t?'white':'#4a7ad0',cursor:'pointer',textTransform:'capitalize'}}>{t}</button>
        ))}
      </div>

      {tab === 'users' && <UsersTab API={API} headers={authHeaders} onUnauthorized={logout}/>}
      {tab === 'analytics' && <AnalyticsTab API={API} headers={authHeaders} onUnauthorized={logout}/>}
      {tab === 'health' && <HealthTab API={API} headers={authHeaders} onUnauthorized={logout}/>}
      {tab === 'moderation' && <ModerationTab API={API} headers={authHeaders} onUnauthorized={logout}/>}

      <div style={{textAlign:'center',fontSize:'11px',color:'#a0b0c8',marginTop:'24px',padding:'16px',lineHeight:'1.6'}}>
        Note: subscription tier changes here update the DB only — they do not cancel or create Stripe subscriptions.
      </div>
    </div>
  );
};

interface TabProps { API: string; headers: Record<string,string>; onUnauthorized: () => void; }

function useAuthedFetch(onUnauthorized: () => void) {
  return useCallback(async (url: string, init?: RequestInit) => {
    const res = await fetch(url, init);
    if (res.status === 401 || res.status === 503) onUnauthorized();
    return res;
  }, [onUnauthorized]);
}

const UsersTab: React.FC<TabProps> = ({ API, headers, onUnauthorized }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [pendingTier, setPendingTier] = useState('');
  const [pendingClinician, setPendingClinician] = useState(false);
  const [pendingSuperuser, setPendingSuperuser] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const af = useAuthedFetch(onUnauthorized);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await af(`${API}/admin/users${qs}`, { headers });
      if (!res.ok) throw new Error('Failed to load users');
      const d = await res.json();
      setUsers(d.users); setTotal(d.total);
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  }, [API, headers, search, af]);

  useEffect(() => { load(); }, [load]);

  const saveUser = async (id: number) => {
    try {
      const res = await af(`${API}/admin/users/${id}`, {method:'PATCH', headers, body: JSON.stringify({subscription_tier: pendingTier, is_clinician: pendingClinician, is_superuser: pendingSuperuser})});
      if (!res.ok) throw new Error('Update failed');
      setEditing(null);
      load();
    } catch(e:any) { setError(e.message); }
  };

  const deleteUser = async (id: number) => {
    try {
      const res = await af(`${API}/admin/users/${id}`, {method:'DELETE', headers});
      if (!res.ok) throw new Error('Delete failed');
      setConfirmDelete(null);
      load();
    } catch(e:any) { setError(e.message); }
  };

  return (
    <div>
      <div style={{...CARD, display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
        <input placeholder="Search by email..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter' && load()} style={{flex:1,minWidth:'200px',padding:'10px 14px',borderRadius:'10px',border:'1px solid rgba(122,176,240,0.3)',fontSize:'13px',background:'rgba(240,246,255,0.5)',outline:'none'}}/>
        <button onClick={load} style={{...BTN}}>Refresh</button>
        <div style={{fontSize:'12px',color:'#8aa0c0'}}>{total} total</div>
      </div>

      {error && <div style={{...CARD, background:'#fde8e8', color:'#c04040', fontSize:'13px'}}>{error}</div>}
      {loading && <div style={{...CARD, textAlign:'center', color:'#8aa0c0'}}>Loading...</div>}

      {!loading && users.map(u => (
        <div key={u.id} style={{...CARD}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'10px',marginBottom:'12px'}}>
            <div style={{flex:1,minWidth:'220px'}}>
              <div style={{fontSize:'15px',fontWeight:'700',color:'#1a2a4a',wordBreak:'break-all'}}>{u.email}</div>
              <div style={{fontSize:'11px',color:'#8aa0c0',marginTop:'4px'}}>ID {u.id} · first seen {fmtDate(u.created_at)}</div>
            </div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {editing === u.id ? (
                <>
                  <button onClick={()=>saveUser(u.id)} style={{...BTN, background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',color:'white',border:'none'}}>Save</button>
                  <button onClick={()=>setEditing(null)} style={{...BTN}}>Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={()=>{setEditing(u.id); setPendingTier(u.subscription_tier||'free'); setPendingClinician(!!u.is_clinician); setPendingSuperuser(!!u.is_superuser);}} style={{...BTN}}>Edit</button>
                  <button onClick={()=>setConfirmDelete(u.id)} style={{...BTN_DANGER}}>Delete</button>
                </>
              )}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px',fontSize:'12px'}}>
            <Field label="Tier">
              {editing===u.id ? (
                <select value={pendingTier} onChange={e=>setPendingTier(e.target.value)} style={{fontSize:'12px',padding:'4px 6px',borderRadius:'6px',border:'1px solid rgba(122,176,240,0.3)'}}>
                  <option value="free">free</option>
                  <option value="monthly">monthly</option>
                  <option value="yearly">yearly</option>
                </select>
              ) : (
                <span style={{fontWeight:'700',color: u.subscription_tier === 'free' ? '#8aa0c0' : '#4a7ad0'}}>{u.subscription_tier || 'free'}</span>
              )}
            </Field>
            <Field label="Subscribed"><span style={{fontWeight:'700',color:u.is_subscribed?'#70b870':'#8aa0c0'}}>{u.is_subscribed ? 'Yes' : 'No'}</span></Field>
            <Field label="Verified"><span style={{color:u.is_verified?'#1a2a4a':'#c04040'}}>{u.is_verified ? 'Yes' : 'No'}</span></Field>
            <Field label="Clinician">
              {editing===u.id ? (
                <label style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'12px',cursor:'pointer'}}>
                  <input type="checkbox" checked={pendingClinician} onChange={e=>setPendingClinician(e.target.checked)}/>
                  <span>{pendingClinician ? 'Yes' : 'No'}</span>
                </label>
              ) : (
                <span style={{color:u.is_clinician?'#4a7ad0':'#8aa0c0',fontWeight:'600'}}>{u.is_clinician ? 'Yes' : 'No'}</span>
              )}
            </Field>
            <Field label="Superuser">
              {editing===u.id ? (
                <label style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'12px',cursor:'pointer'}}>
                  <input type="checkbox" checked={pendingSuperuser} onChange={e=>setPendingSuperuser(e.target.checked)}/>
                  <span>{pendingSuperuser ? 'Yes' : 'No'}</span>
                </label>
              ) : (
                <span style={{color:u.is_superuser?'#c04040':'#8aa0c0',fontWeight:'700'}}>{u.is_superuser ? 'YES' : 'No'}</span>
              )}
            </Field>
            <Field label="Scans"><span style={{fontWeight:'700',color:'#1a2a4a'}}>{u.scan_count}</span></Field>
            <Field label="AI spend"><span style={{color:'#1a2a4a'}}>${(u.monthly_spend||0).toFixed(2)}</span></Field>
          </div>

          {confirmDelete === u.id && (
            <div style={{marginTop:'12px',padding:'12px',background:'#fde8e8',border:'1px solid #f0b0b0',borderRadius:'10px',fontSize:'12px'}}>
              <div style={{color:'#c04040',fontWeight:'700',marginBottom:'8px'}}>Delete {u.email}?</div>
              <div style={{color:'#8a5050',marginBottom:'10px'}}>This cannot be undone. Any tool usage history for this user will also be removed.</div>
              <div style={{display:'flex',gap:'6px'}}>
                <button onClick={()=>deleteUser(u.id)} style={{...BTN_DANGER,background:'#c04040',color:'white',border:'none'}}>Yes, delete</button>
                <button onClick={()=>setConfirmDelete(null)} style={{...BTN}}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {!loading && users.length === 0 && <div style={{...CARD, textAlign:'center', color:'#8aa0c0'}}>No users found.</div>}
    </div>
  );
};

const Field: React.FC<{label: string; children: React.ReactNode}> = ({label, children}) => (
  <div>
    <div style={{fontSize:'10px',fontWeight:'700',color:'#8aa0c0',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:'2px'}}>{label}</div>
    <div>{children}</div>
  </div>
);

const BarChart: React.FC<{rows: {label: string; value: number}[]; height?: number; valueSuffix?: string}> = ({rows, height = 140, valueSuffix = ''}) => {
  if (!rows.length) return <div style={{textAlign:'center', color:'#8aa0c0', fontSize:'13px', padding:'20px'}}>No data yet.</div>;
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <div style={{display:'flex', alignItems:'flex-end', gap:'3px', height: `${height}px`, paddingTop:'22px', overflowX:'auto'}}>
      {rows.map((r, i) => {
        const h = Math.max(2, Math.round((r.value / max) * (height - 40)));
        return (
          <div key={i} title={`${r.label}: ${r.value}${valueSuffix}`} style={{flex:'1 0 20px', minWidth:'20px', display:'flex', flexDirection:'column', alignItems:'center', gap:'3px'}}>
            <div style={{fontSize:'9px', color:'#4a7ad0', fontWeight:'700', minHeight:'11px'}}>{r.value ? `${r.value}${valueSuffix}` : ''}</div>
            <div style={{width:'100%', height: `${h}px`, background:'linear-gradient(180deg,#7ab0f0,#9b8fe8)', borderRadius:'4px 4px 0 0'}}/>
            <div style={{fontSize:'8px', color:'#8aa0c0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%', textAlign:'center'}}>{r.label}</div>
          </div>
        );
      })}
    </div>
  );
};

const AnalyticsTab: React.FC<TabProps> = ({ API, headers, onUnauthorized }) => {
  const [data, setData] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const af = useAuthedFetch(onUnauthorized);

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const [sRes, cRes] = await Promise.all([
          af(`${API}/admin/stats`, { headers }),
          af(`${API}/admin/charts`, { headers }),
        ]);
        if (!sRes.ok) throw new Error('Failed to load stats');
        setData(await sRes.json());
        if (cRes.ok) setCharts(await cRes.json());
      } catch(e:any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [API, headers, af]);

  if (loading) return <div style={{...CARD, textAlign:'center', color:'#8aa0c0'}}>Loading...</div>;
  if (error) return <div style={{...CARD, background:'#fde8e8', color:'#c04040', fontSize:'13px'}}>{error}</div>;
  if (!data) return null;

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'12px',marginBottom:'16px'}}>
        <Stat label="Total users" value={data.users.total}/>
        <Stat label="Verified" value={data.users.verified}/>
        <Stat label="Subscribed" value={data.users.subscribed}/>
        <Stat label="Clinicians" value={data.users.clinicians}/>
        <Stat label="New this week" value={data.users.new_this_week}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'12px',marginBottom:'16px'}}>
        <Stat label="Scans today" value={data.scans.today}/>
        <Stat label="Scans 7d" value={data.scans.this_week}/>
        <Stat label="Scans this month" value={data.scans.this_month}/>
        <Stat label="Scans lifetime" value={data.scans.lifetime}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'12px',marginBottom:'16px'}}>
        <Stat label="Revenue est. (mo)" value={`$${data.revenue_month_estimate.toFixed(2)}`} accent/>
        <Stat label="AI spend (mo)" value={`$${data.ai_spend_month.toFixed(2)}`}/>
        <Stat label="Monthly subs" value={data.subscriptions.monthly}/>
        <Stat label="Yearly subs" value={data.subscriptions.yearly}/>
      </div>

      {charts && (
        <>
          <div style={CARD}>
            <div style={LABEL}>MRR by month · last 6 months ($)</div>
            <BarChart rows={(charts.revenue_by_month || []).map((d:any)=>({label: d.month.slice(2), value: Math.round((d.mrr || 0) * 100) / 100}))} height={160} valueSuffix=""/>
          </div>
          <div style={CARD}>
            <div style={LABEL}>New signups · last 30 days</div>
            <BarChart rows={(charts.signups_by_day || []).map((d:any)=>({label: d.date.slice(5), value: d.count}))}/>
          </div>
          <div style={CARD}>
            <div style={LABEL}>AI spend · last 30 days ($)</div>
            <BarChart rows={(charts.ai_spend_by_day || []).map((d:any)=>({label: d.date.slice(5), value: Math.round(d.spend * 100) / 100}))} valueSuffix=""/>
          </div>
          <div style={CARD}>
            <div style={LABEL}>New subscriptions per month</div>
            <BarChart rows={(charts.subs_by_month || []).map((d:any)=>({label: d.month, value: d.count}))}/>
          </div>
          <div style={CARD}>
            <div style={LABEL}>Tool usage · last 30 days</div>
            <BarChart rows={(charts.tool_usage_by_tool || []).map((d:any)=>({label: d.tool, value: d.count}))}/>
          </div>
          <div style={CARD}>
            <div style={LABEL}>NephroAI tab usage · all time</div>
            <BarChart rows={(charts.nephro_breakdown || []).map((d:any)=>({label: d.tab, value: d.count}))}/>
          </div>
          {charts.cases_stats && (
            <div style={CARD}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', flexWrap:'wrap', gap:'8px'}}>
                <div style={LABEL}>Recent cases saved</div>
                <div style={{fontSize:'12px', color:'#6a8ab0'}}>Total <span style={{fontWeight:'800', color:'#1a2a4a'}}>{charts.cases_stats.total}</span>{charts.cases_stats.most_active && <> · most active <span style={{color:'#4a7ad0', fontWeight:'700', textTransform:'capitalize'}}>{charts.cases_stats.most_active}</span></>}</div>
              </div>
              <BarChart rows={(charts.cases_stats.per_tool || []).map((d:any)=>({label: d.tool, value: d.count}))}/>
            </div>
          )}
        </>
      )}

      <div style={CARD}>
        <div style={LABEL}>Tool usage breakdown</div>
        {data.tool_breakdown.length === 0 ? (
          <div style={{fontSize:'13px',color:'#8aa0c0'}}>No scans logged yet.</div>
        ) : data.tool_breakdown.map((t:any) => (
          <div key={t.tool} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:'13px'}}>
            <span style={{color:'#1a2a4a',textTransform:'capitalize'}}>{t.tool}</span>
            <span style={{fontWeight:'700',color:'#4a7ad0'}}>{t.count}</span>
          </div>
        ))}
      </div>

      <div style={CARD}>
        <div style={LABEL}>Most used tools this month</div>
        {(data.most_used_month || []).length === 0 ? (
          <div style={{fontSize:'13px',color:'#8aa0c0'}}>No usage yet this month.</div>
        ) : (data.most_used_month || []).map((t:any) => (
          <div key={t.tool} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:'13px'}}>
            <span style={{color:'#1a2a4a',textTransform:'capitalize'}}>{t.tool}</span>
            <span style={{fontWeight:'700',color:'#4a7ad0'}}>{t.count}</span>
          </div>
        ))}
      </div>

      <div style={CARD}>
        <div style={LABEL}>Feedback per tool</div>
        {(data.feedback_summary || []).length === 0 ? (
          <div style={{fontSize:'13px',color:'#8aa0c0'}}>No feedback submitted yet.</div>
        ) : (data.feedback_summary || []).map((f:any) => (
          <div key={f.tool} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'12px',alignItems:'center',padding:'8px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:'13px'}}>
            <span style={{color:'#1a2a4a',textTransform:'capitalize'}}>{f.tool}</span>
            <span style={{color:'#70b870',fontWeight:'600'}}>👍 {f.up}</span>
            <span style={{color:'#c04040',fontWeight:'600'}}>👎 {f.down}</span>
            <span style={{color:'#4a7ad0',fontWeight:'700', minWidth:'50px', textAlign:'right'}}>{f.ratio}%</span>
          </div>
        ))}
      </div>

      <div style={CARD}>
        <div style={LABEL}>Most active users</div>
        {data.most_active.length === 0 ? (
          <div style={{fontSize:'13px',color:'#8aa0c0'}}>No activity yet.</div>
        ) : data.most_active.map((u:any) => (
          <div key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:'13px',gap:'10px'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:'#1a2a4a',fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
              <div style={{fontSize:'11px',color:'#8aa0c0'}}>{u.tier || 'free'} · ${(u.monthly_spend||0).toFixed(2)} spend</div>
            </div>
            <div style={{fontWeight:'700',color:'#4a7ad0'}}>{u.scan_count}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Stat: React.FC<{label: string; value: any; accent?: boolean}> = ({label, value, accent}) => (
  <div style={{...CARD, marginBottom:0, padding:'16px', background: accent ? 'linear-gradient(135deg,rgba(122,176,240,0.18),rgba(155,143,232,0.18))' : CARD.background}}>
    <div style={LABEL}>{label}</div>
    <div style={{fontSize:'22px',fontWeight:'800',color:'#1a2a4a'}}>{value}</div>
  </div>
);

const HealthTab: React.FC<TabProps> = ({ API, headers, onUnauthorized }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const af = useAuthedFetch(onUnauthorized);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await af(`${API}/admin/health`, { headers });
      if (!res.ok) throw new Error('Failed to load health');
      setData(await res.json());
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  }, [API, headers, af]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{...CARD, textAlign:'center', color:'#8aa0c0'}}>Loading...</div>;
  if (error) return <div style={{...CARD, background:'#fde8e8', color:'#c04040', fontSize:'13px'}}>{error}</div>;
  if (!data) return null;

  const Item: React.FC<{name: string; ok: boolean; note?: string}> = ({name, ok, note}) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:'14px'}}>
      <div>
        <div style={{color:'#1a2a4a',fontWeight:'600'}}>{name}</div>
        {note && <div style={{fontSize:'11px',color:'#8aa0c0',marginTop:'2px'}}>{note}</div>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'12px',fontWeight:'700',color: ok ? '#70b870' : '#c04040'}}>
        <span style={{width:'8px',height:'8px',borderRadius:'50%',background: ok ? '#70b870' : '#c04040'}}/>
        {ok ? 'OK' : 'Down'}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'8px'}}>
        <button onClick={load} style={{...BTN}}>Refresh</button>
      </div>
      <div style={CARD}>
        <div style={LABEL}>System status</div>
        <Item name="API" ok={true} note="You're talking to it right now"/>
        <Item name="Database" ok={data.database.ok} note={data.database.error}/>
        <Item name="SendGrid" ok={data.sendgrid.ok} note={`from: ${data.sendgrid.from_email}`}/>
        <Item name="Stripe API key" ok={data.stripe.ok}/>
        <Item name="Stripe webhook secret" ok={data.stripe.webhook_configured}/>
        <Item name="Anthropic API" ok={data.anthropic.ok}/>
        <Item name="Admin token configured" ok={data.admin_token_configured}/>
      </div>
    </div>
  );
};

const ModerationTab: React.FC<TabProps> = ({ API, headers, onUnauthorized }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const af = useAuthedFetch(onUnauthorized);

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await af(`${API}/admin/moderation`, { headers });
        if (!res.ok) throw new Error('Failed to load moderation');
        setData(await res.json());
      } catch(e:any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [API, headers, af]);

  if (loading) return <div style={{...CARD, textAlign:'center', color:'#8aa0c0'}}>Loading...</div>;
  if (error) return <div style={{...CARD, background:'#fde8e8', color:'#c04040', fontSize:'13px'}}>{error}</div>;
  if (!data) return null;

  return (
    <div>
      <div style={CARD}>
        <div style={LABEL}>Users approaching monthly AI limit (≥80%)</div>
        {data.approaching_limit.length === 0 ? (
          <div style={{fontSize:'13px',color:'#8aa0c0'}}>All clear.</div>
        ) : data.approaching_limit.map((u:any) => (
          <div key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:'13px',gap:'10px'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:'#1a2a4a',fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
              <div style={{fontSize:'11px',color:'#8aa0c0'}}>{u.tier} · ${u.spend.toFixed(2)} of ${u.limit.toFixed(2)}</div>
            </div>
            <div style={{fontWeight:'700',color: u.pct >= 100 ? '#c04040' : '#d89030'}}>{u.pct.toFixed(1)}%</div>
          </div>
        ))}
      </div>

      <div style={CARD}>
        <div style={LABEL}>Heavy usage today (≥10 scans)</div>
        {data.heavy_usage_today.length === 0 ? (
          <div style={{fontSize:'13px',color:'#8aa0c0'}}>No flagged activity.</div>
        ) : data.heavy_usage_today.map((u:any) => (
          <div key={u.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:'13px'}}>
            <span style={{color:'#1a2a4a',fontWeight:'600'}}>{u.email}</span>
            <span style={{fontWeight:'700',color:'#4a7ad0'}}>{u.scans_today} today</span>
          </div>
        ))}
      </div>

      <div style={CARD}>
        <div style={LABEL}>Unverified accounts with usage</div>
        {data.unverified_with_usage.length === 0 ? (
          <div style={{fontSize:'13px',color:'#8aa0c0'}}>None.</div>
        ) : data.unverified_with_usage.map((u:any) => (
          <div key={u.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:'13px'}}>
            <span style={{color:'#1a2a4a',fontWeight:'600'}}>{u.email}</span>
            <span style={{fontWeight:'700',color:'#4a7ad0'}}>{u.scan_count} scans</span>
          </div>
        ))}
      </div>

      <div style={CARD}>
        <div style={LABEL}>Failed payment attempts</div>
        <div style={{fontSize:'13px',color:'#8aa0c0',lineHeight:'1.6'}}>{data.failed_payments.note}</div>
      </div>
    </div>
  );
};

export default Admin;
