// © 2026 SoulMD, LLC. All rights reserved.
//
// Marketing Agent — superuser-only campaign generator at /admin/marketing.
// The browser POSTs tool/goal/audience/tone to /admin/marketing/generate;
// the backend calls Claude Sonnet with a marketing-expert system prompt
// and returns the structured campaign JSON. Generated campaigns are cached
// in localStorage ("soulmd_campaigns", capped at 20) so the doc can browse
// past work.
//
// Layout: dark navy header + two-column body. Sidebar holds the form,
// quick-start buttons, and history. Main panel renders the tabbed
// results (LinkedIn / Twitter/X / Instagram / Email / Schedule).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SoulMDLogo from '../SoulMDLogo';
import SuperuserTabNav from './SuperuserTabNav';

interface Props {
  API: string;
  token: string;
  onBack: () => void;
  onNavigateDashboard: () => void;
  onNavigateMeditations: () => void;
  onNavigateConciergeAccess: () => void;
}

// ───── Campaign payload shape ─────────────────────────────────────────────

interface CampaignData {
  campaign_title?: string;
  linkedin?: { post_a?: string; post_b?: string };
  twitter?: { thread_a?: string[]; thread_b?: string[] };
  instagram?: { caption_a?: string; caption_b?: string; visual_prompt?: string };
  email?: { subject_a?: string; subject_b?: string; preview_text?: string; body?: string };
  posting_schedule?: { linkedin?: string; twitter?: string; instagram?: string; email?: string };
}

interface SavedCampaign {
  id: string;
  title: string;
  tool: string;
  date: string;       // ISO timestamp
  data: CampaignData;
}

// ───── Form options ───────────────────────────────────────────────────────

const TOOL_OPTIONS = [
  'EKGScan', 'NephroAI', 'RxCheck', 'AntibioticAI', 'XrayRead',
  'CerebralAI', 'ClinicalNote AI', 'PalliativeMD', 'LabRead',
  'CliniScore', 'Full Suite',
];
const GOAL_OPTIONS = [
  'Get first subscribers', 'Free trial conversion', 'Feature announcement',
  'Tool spotlight', 'Testimonial request',
];
const AUDIENCE_OPTIONS = ['Clinicians', 'Patients'] as const;
const TONE_OPTIONS = ['Professional', 'Conversational', 'Bold/Edgy', 'Inspirational'];

interface QuickStart { label: string; tool: string; goal: string; audience: typeof AUDIENCE_OPTIONS[number]; tone: string; }
const QUICK_STARTS: QuickStart[] = [
  { label: '🩺 EKGScan Launch',      tool: 'EKGScan',         goal: 'Get first subscribers',   audience: 'Clinicians', tone: 'Professional'  },
  { label: '💊 Suite Promo',         tool: 'Full Suite',      goal: 'Free trial conversion',   audience: 'Clinicians', tone: 'Bold/Edgy'     },
  { label: '🧠 CerebralAI Spotlight',tool: 'CerebralAI',      goal: 'Tool spotlight',          audience: 'Clinicians', tone: 'Inspirational' },
  { label: '📋 ClinicalNote AI',     tool: 'ClinicalNote AI', goal: 'Feature announcement',    audience: 'Clinicians', tone: 'Conversational'},
];

// ───── Tokens ─────────────────────────────────────────────────────────────

const NAVY      = '#1a2a4a';
const NAVY_DEEP = '#0f1a30';
const NAVY_SOFT = '#243652';
const GOLD      = '#C9A84C';
const GOLD_DEEP = '#A88830';
const GOLD_SOFT = 'rgba(201,168,76,0.14)';
const PARCHMENT = '#FAF7EE';
const INK       = '#1a2a4a';
const INK_SOFT  = '#6B6889';
const PAGE_BG   = 'linear-gradient(180deg,#FAF9FD 0%,#F1ECF8 100%)';
const CARD_BORDER = '1px solid rgba(83,74,183,0.10)';

const HISTORY_KEY = 'soulmd_campaigns';
const HISTORY_MAX = 20;

// ───── Storage helpers ───────────────────────────────────────────────────
// "window.storage" in the spec maps to localStorage in browsers. Wrapped
// in a thin layer so a future swap to IndexedDB is one file's worth of
// work, not a hundred.

const loadHistory = (): SavedCampaign[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
};
const saveHistory = (list: SavedCampaign[]) => {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX))); } catch {}
};

// ───── Component ──────────────────────────────────────────────────────────

const MarketingAgent: React.FC<Props> = ({ API, token, onBack, onNavigateDashboard, onNavigateMeditations, onNavigateConciergeAccess }) => {
  const [tool, setTool] = useState<string>(TOOL_OPTIONS[0]);
  const [goal, setGoal] = useState<string>(GOAL_OPTIONS[0]);
  const [audience, setAudience] = useState<typeof AUDIENCE_OPTIONS[number]>('Clinicians');
  const [tone, setTone] = useState<string>(TONE_OPTIONS[0]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('linkedin');
  const [variant, setVariant] = useState<'a' | 'b'>('a');

  const [history, setHistory] = useState<SavedCampaign[]>(() => loadHistory());
  const [historyOpen, setHistoryOpen] = useState(true);

  // Inject pulse keyframe once.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('__soulmd_marketing_pulse')) return;
    const s = document.createElement('style');
    s.id = '__soulmd_marketing_pulse';
    s.textContent = `
      @keyframes soulmdMarketingPulse { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }
      @keyframes soulmdMarketingShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    `;
    document.head.appendChild(s);
  }, []);

  const generate = useCallback(async (override?: { tool?: string; goal?: string; audience?: typeof AUDIENCE_OPTIONS[number]; tone?: string }) => {
    if (loading) return;
    const body = {
      tool:     override?.tool     ?? tool,
      goal:     override?.goal     ?? goal,
      audience: override?.audience ?? audience,
      tone:     override?.tone     ?? tone,
    };
    setLoading(true); setErr(''); setCampaign(null);
    try {
      const res = await fetch(`${API}/admin/marketing/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let parsed: any = null;
      try { parsed = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) {
        const detail = parsed?.detail || parsed?.error || text || `Generation failed (${res.status})`;
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }
      const data: CampaignData = parsed || {};
      setCampaign(data);
      setActiveTab('linkedin');
      setVariant('a');
      // Auto-save to history.
      const entry: SavedCampaign = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: data.campaign_title || `${body.tool} · ${body.goal}`,
        tool: body.tool,
        date: new Date().toISOString(),
        data,
      };
      const next = [entry, ...history].slice(0, HISTORY_MAX);
      setHistory(next);
      saveHistory(next);
    } catch (e: any) {
      setErr(e.message || 'Generation failed.');
    } finally {
      setLoading(false);
    }
  }, [API, token, loading, tool, goal, audience, tone, history]);

  const runQuickStart = useCallback((q: QuickStart) => {
    setTool(q.tool);
    setGoal(q.goal);
    setAudience(q.audience);
    setTone(q.tone);
    generate({ tool: q.tool, goal: q.goal, audience: q.audience, tone: q.tone });
  }, [generate]);

  const reloadFromHistory = useCallback((entry: SavedCampaign) => {
    setCampaign(entry.data);
    setActiveTab('linkedin');
    setVariant('a');
    setErr('');
  }, []);

  const deleteFromHistory = useCallback((id: string) => {
    setHistory(prev => {
      const next = prev.filter(e => e.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  return (
    <div style={{minHeight:'100vh', background: PAGE_BG, color: INK, fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif'}}>
      {/* Dark navy + gold header */}
      <header style={{padding:'16px clamp(14px,3vw,28px)', display:'flex', alignItems:'center', gap:'12px', background:`linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY} 60%, ${NAVY_SOFT} 100%)`, color:'white', borderBottom:`1px solid ${GOLD}33`}}>
        <button onClick={onBack} title="Back"
          style={{background:'rgba(255,255,255,0.08)', border:'0.5px solid rgba(255,255,255,0.18)', borderRadius:'10px', padding:'7px 11px', fontSize:'13px', color:'white', cursor:'pointer', fontFamily:'inherit'}}>←</button>
        <SoulMDLogo size={28} showText={false}/>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:'17px', fontWeight:800, letterSpacing:'-0.2px'}}>
            <span style={{color:'white'}}>Marketing Agent</span>
            <span style={{color: GOLD, marginLeft:'8px', fontSize:'12px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase'}}>✦ Superuser</span>
          </div>
          <div style={{fontSize:'11px', color:'rgba(255,255,255,0.65)'}}>Claude-powered campaign generator · LinkedIn · X · Instagram · Email</div>
        </div>
      </header>

      <SuperuserTabNav
        active="marketing"
        onDashboard={onNavigateDashboard}
        onMeditations={onNavigateMeditations}
        onConcierge={onNavigateConciergeAccess}
        onMarketing={() => {}}
      />

      <main style={{padding:'clamp(14px,3vw,24px)', maxWidth:'1280px', margin:'0 auto', display:'grid', gridTemplateColumns:'minmax(260px, 320px) 1fr', gap:'18px'}}>

        {/* SIDEBAR */}
        <aside style={{display:'flex', flexDirection:'column', gap:'14px'}}>
          <Card title="Campaign">
            <Field label="Tool">
              <Select value={tool} onChange={setTool} options={TOOL_OPTIONS}/>
            </Field>
            <Field label="Goal">
              <Select value={goal} onChange={setGoal} options={GOAL_OPTIONS}/>
            </Field>
            <Field label="Audience">
              <ToggleGroup value={audience} onChange={v => setAudience(v as 'Clinicians' | 'Patients')} options={AUDIENCE_OPTIONS as unknown as string[]}/>
            </Field>
            <Field label="Tone">
              <Select value={tone} onChange={setTone} options={TONE_OPTIONS}/>
            </Field>
            <button
              onClick={() => generate()}
              disabled={loading}
              style={{
                marginTop:'4px', width:'100%',
                background: loading ? 'rgba(201,168,76,0.5)' : `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DEEP} 100%)`,
                color: NAVY_DEEP, border:'none', borderRadius:'12px',
                padding:'12px', fontSize:'14px', fontWeight:800,
                letterSpacing:'0.4px', cursor: loading ? 'wait' : 'pointer',
                fontFamily:'inherit', boxShadow:'0 6px 16px rgba(201,168,76,0.28)',
              }}>
              {loading ? 'Generating…' : '✦ Generate Campaign'}
            </button>
          </Card>

          <Card title="Quick Start">
            <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
              {QUICK_STARTS.map(q => (
                <button key={q.label}
                  onClick={() => runQuickStart(q)}
                  disabled={loading}
                  style={{
                    background:'#FFFFFF', border:'0.5px solid rgba(83,74,183,0.18)',
                    borderRadius:'10px', padding:'10px 12px',
                    fontSize:'12px', fontWeight:700, color: INK,
                    textAlign:'left', cursor: loading ? 'default' : 'pointer',
                    fontFamily:'inherit', opacity: loading ? 0.55 : 1,
                  }}>
                  {q.label}
                </button>
              ))}
            </div>
          </Card>

          <Card
            title={`History · ${history.length}/${HISTORY_MAX}`}
            collapsible
            isOpen={historyOpen}
            onToggle={() => setHistoryOpen(o => !o)}
          >
            {historyOpen && (
              history.length === 0 ? (
                <div style={{fontSize:'12px', color: INK_SOFT, fontStyle:'italic', padding:'8px 0'}}>
                  No saved campaigns yet. Generate one and it'll auto-save here.
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                  {history.map(h => (
                    <div key={h.id} style={{display:'flex', alignItems:'stretch', gap:'4px'}}>
                      <button
                        onClick={() => reloadFromHistory(h)}
                        title={h.title}
                        style={{
                          flex:1, minWidth:0, textAlign:'left',
                          background:'#FFFFFF', border:'0.5px solid rgba(83,74,183,0.14)',
                          borderRadius:'10px', padding:'8px 10px',
                          cursor:'pointer', fontFamily:'inherit',
                        }}>
                        <div style={{fontSize:'12px', fontWeight:700, color: INK, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                          {h.title}
                        </div>
                        <div style={{fontSize:'10px', color: INK_SOFT, marginTop:'2px'}}>
                          {h.tool} · {new Date(h.date).toLocaleDateString(undefined, { month:'short', day:'numeric' })} {new Date(h.date).toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' })}
                        </div>
                      </button>
                      <button onClick={() => deleteFromHistory(h.id)} aria-label="Delete saved campaign" title="Delete"
                        style={{
                          flexShrink:0, width:'30px',
                          background:'rgba(224,80,80,0.06)', border:'0.5px solid rgba(224,80,80,0.18)',
                          borderRadius:'10px', cursor:'pointer', fontFamily:'inherit',
                          color:'#a02020', fontSize:'13px',
                        }}>🗑</button>
                    </div>
                  ))}
                </div>
              )
            )}
          </Card>
        </aside>

        {/* MAIN PANEL */}
        <section>
          {err && (
            <div style={{padding:'14px 16px', background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'12px', color:'#a02020', fontSize:'13px', marginBottom:'14px'}}>
              {err}
            </div>
          )}

          {loading && <LoadingPanel/>}

          {!loading && !campaign && !err && <EmptyPanel/>}

          {!loading && campaign && (
            <ResultsPanel
              campaign={campaign}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant={variant}
              onVariantChange={setVariant}
            />
          )}
        </section>
      </main>
    </div>
  );
};

// ───── Sidebar primitives ─────────────────────────────────────────────────

const Card: React.FC<{title: string; children: React.ReactNode; collapsible?: boolean; isOpen?: boolean; onToggle?: () => void}> = ({ title, children, collapsible, isOpen, onToggle }) => (
  <div style={{background:'#FFFFFF', border: CARD_BORDER, borderRadius:'14px', padding:'14px 16px', boxShadow:'0 2px 10px rgba(83,74,183,0.06)'}}>
    <div onClick={collapsible ? onToggle : undefined}
      style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        fontSize:'10px', fontWeight:800, color: INK_SOFT,
        letterSpacing:'1.5px', textTransform:'uppercase',
        marginBottom:'10px',
        cursor: collapsible ? 'pointer' : 'default',
      }}>
      <span>{title}</span>
      {collapsible && <span style={{fontSize:'12px'}}>{isOpen ? '−' : '+'}</span>}
    </div>
    {children}
  </div>
);

const Field: React.FC<{label: string; children: React.ReactNode}> = ({ label, children }) => (
  <div style={{marginBottom:'10px'}}>
    <div style={{fontSize:'10px', fontWeight:700, color: INK_SOFT, letterSpacing:'0.6px', textTransform:'uppercase', marginBottom:'4px'}}>{label}</div>
    {children}
  </div>
);

const Select: React.FC<{value: string; onChange: (v: string) => void; options: string[]}> = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{
      width:'100%', padding:'9px 10px',
      border:'0.5px solid rgba(83,74,183,0.18)', borderRadius:'10px',
      background:'#FAFAFE', color: INK, fontSize:'13px',
      fontFamily:'inherit', outline:'none',
    }}>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const ToggleGroup: React.FC<{value: string; onChange: (v: string) => void; options: string[]}> = ({ value, onChange, options }) => (
  <div style={{display:'flex', gap:'6px'}}>
    {options.map(o => {
      const active = o === value;
      return (
        <button key={o} type="button" onClick={() => onChange(o)}
          style={{
            flex:1, padding:'8px 10px',
            background: active ? GOLD_SOFT : '#FFFFFF',
            border: active ? `1px solid ${GOLD}` : '0.5px solid rgba(83,74,183,0.14)',
            color: active ? GOLD_DEEP : INK_SOFT,
            borderRadius:'10px', fontSize:'12px', fontWeight: active ? 800 : 600,
            cursor:'pointer', fontFamily:'inherit',
          }}>{o}</button>
      );
    })}
  </div>
);

// ───── Loading + empty states ─────────────────────────────────────────────

const LoadingPanel: React.FC = () => (
  <div style={{padding:'60px 20px', background:'#FFFFFF', border: CARD_BORDER, borderRadius:'16px', textAlign:'center', boxShadow:'0 2px 14px rgba(83,74,183,0.06)'}}>
    <div style={{display:'inline-flex', alignItems:'center', justifyContent:'center', width:'72px', height:'72px', borderRadius:'50%', background:`linear-gradient(135deg, ${NAVY} 0%, ${NAVY_SOFT} 100%)`, color: GOLD, fontSize:'28px', marginBottom:'18px', animation:'soulmdMarketingPulse 1.6s ease-in-out infinite'}}>✦</div>
    <div style={{fontSize:'17px', fontWeight:800, color: NAVY, marginBottom:'4px'}}>Generating your campaign…</div>
    <div style={{fontSize:'12px', color: INK_SOFT}}>Claude is drafting LinkedIn, X, Instagram, email + schedule</div>
    <div style={{height:'4px', borderRadius:'4px', marginTop:'18px', maxWidth:'220px', marginLeft:'auto', marginRight:'auto',
      background:`linear-gradient(90deg, ${GOLD_SOFT} 25%, ${GOLD} 50%, ${GOLD_SOFT} 75%)`, backgroundSize:'200% 100%',
      animation:'soulmdMarketingShimmer 1.8s linear infinite'}}/>
  </div>
);

const EmptyPanel: React.FC = () => (
  <div style={{padding:'60px 20px', background:'#FFFFFF', border: CARD_BORDER, borderRadius:'16px', textAlign:'center', boxShadow:'0 2px 14px rgba(83,74,183,0.06)'}}>
    <div style={{fontSize:'34px', marginBottom:'12px', color: GOLD}}>✦</div>
    <div style={{fontSize:'17px', fontWeight:800, color: NAVY, marginBottom:'6px'}}>Ready when you are</div>
    <div style={{fontSize:'13px', color: INK_SOFT, maxWidth:'420px', margin:'0 auto', lineHeight:1.6}}>
      Pick a tool, goal, audience, and tone — or fire one of the Quick Start buttons. Each campaign returns LinkedIn posts, an X thread, an Instagram caption, an email, and a posting schedule, all with A/B variants.
    </div>
  </div>
);

// ───── Results panel (tabs + variants) ───────────────────────────────────

type TabId = 'linkedin' | 'twitter' | 'instagram' | 'email' | 'schedule';
const TABS: {id: TabId; label: string}[] = [
  { id: 'linkedin',  label: 'LinkedIn' },
  { id: 'twitter',   label: 'Twitter / X' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'email',     label: 'Email' },
  { id: 'schedule',  label: 'Schedule' },
];

const ResultsPanel: React.FC<{
  campaign: CampaignData;
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
  variant: 'a' | 'b';
  onVariantChange: (v: 'a' | 'b') => void;
}> = ({ campaign, activeTab, onTabChange, variant, onVariantChange }) => {
  const showVariantToggle = activeTab !== 'schedule';
  return (
    <div style={{display:'flex', flexDirection:'column', gap:'14px'}}>
      {/* Heading */}
      <div style={{padding:'16px 20px', background:`linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY} 100%)`, color:'white', borderRadius:'14px', border:`1px solid ${GOLD}55`}}>
        <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: GOLD, fontWeight:800}}>Campaign</div>
        <div style={{fontSize:'19px', fontWeight:800, marginTop:'4px', letterSpacing:'-0.2px'}}>
          {campaign.campaign_title || 'Untitled campaign'}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:'flex', gap:'4px', borderBottom:`0.5px solid rgba(83,74,183,0.16)`, overflowX:'auto'}}>
        {TABS.map(t => {
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => onTabChange(t.id)}
              style={{
                background:'transparent', border:'none',
                padding:'10px 16px', cursor:'pointer', fontFamily:'inherit',
                fontSize:'13px', fontWeight: active ? 800 : 600,
                color: active ? NAVY : INK_SOFT,
                borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
                whiteSpace:'nowrap',
              }}>{t.label}</button>
          );
        })}
      </div>

      {/* Variant toggle */}
      {showVariantToggle && (
        <div style={{display:'flex', justifyContent:'flex-end'}}>
          <div style={{display:'inline-flex', background:'#FFFFFF', border:'0.5px solid rgba(83,74,183,0.18)', borderRadius:'10px', padding:'3px', gap:'2px'}}>
            {(['a','b'] as const).map(v => {
              const active = variant === v;
              return (
                <button key={v} onClick={() => onVariantChange(v)}
                  style={{
                    background: active ? GOLD : 'transparent',
                    color: active ? NAVY_DEEP : INK_SOFT,
                    border:'none', borderRadius:'8px',
                    padding:'5px 14px', cursor:'pointer', fontFamily:'inherit',
                    fontSize:'11px', fontWeight: active ? 800 : 600, letterSpacing:'0.5px',
                    textTransform:'uppercase',
                  }}>Variant {v.toUpperCase()}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab body */}
      <div>
        {activeTab === 'linkedin'  && <LinkedInTab data={campaign.linkedin}  variant={variant}/>}
        {activeTab === 'twitter'   && <TwitterTab  data={campaign.twitter}   variant={variant}/>}
        {activeTab === 'instagram' && <InstagramTab data={campaign.instagram} variant={variant}/>}
        {activeTab === 'email'     && <EmailTab    data={campaign.email}     variant={variant}/>}
        {activeTab === 'schedule'  && <ScheduleTab data={campaign.posting_schedule}/>}
      </div>
    </div>
  );
};

// ───── Per-tab views ──────────────────────────────────────────────────────

const LinkedInTab: React.FC<{data?: CampaignData['linkedin']; variant: 'a' | 'b'}> = ({ data, variant }) => {
  const post = (variant === 'a' ? data?.post_a : data?.post_b) || '';
  return (
    <PreviewCard>
      <PreviewHeader title="LinkedIn post" sub={`${post.length} chars`}/>
      <div style={{whiteSpace:'pre-wrap', fontSize:'14px', color: INK, lineHeight:1.65, padding:'14px 16px', background:'#F4F2FB', borderRadius:'10px', fontFamily:'inherit'}}>
        {post || <em style={{color: INK_SOFT}}>No content for this variant.</em>}
      </div>
      <FooterActions actions={[{ label: 'Copy', text: post }]}/>
    </PreviewCard>
  );
};

const TwitterTab: React.FC<{data?: CampaignData['twitter']; variant: 'a' | 'b'}> = ({ data, variant }) => {
  const thread = (variant === 'a' ? data?.thread_a : data?.thread_b) || [];
  const fullThread = thread.map((t, i) => `${i + 1}/${thread.length} ${t}`).join('\n\n');
  return (
    <PreviewCard>
      <PreviewHeader title="X thread" sub={`${thread.length} tweet${thread.length === 1 ? '' : 's'}`}/>
      {thread.length === 0 ? (
        <div style={{padding:'14px', color: INK_SOFT, fontStyle:'italic'}}>No tweets in this variant.</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {thread.map((t, i) => (
            <div key={i} style={{display:'flex', gap:'10px', alignItems:'flex-start', padding:'12px 14px', background:'#F4F2FB', borderRadius:'10px'}}>
              <div style={{flexShrink:0, width:'24px', height:'24px', borderRadius:'50%', background: NAVY, color:'white', fontSize:'11px', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center'}}>{i + 1}</div>
              <div style={{flex:1, minWidth:0, fontSize:'13.5px', color: INK, lineHeight:1.55, whiteSpace:'pre-wrap'}}>{t}</div>
              <CopyButton text={t} compact/>
            </div>
          ))}
        </div>
      )}
      <FooterActions actions={[{ label: 'Copy Full Thread', text: fullThread }]}/>
    </PreviewCard>
  );
};

const InstagramTab: React.FC<{data?: CampaignData['instagram']; variant: 'a' | 'b'}> = ({ data, variant }) => {
  const caption = (variant === 'a' ? data?.caption_a : data?.caption_b) || '';
  const visual = data?.visual_prompt || '';
  return (
    <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
      <PreviewCard>
        <PreviewHeader title="Instagram caption" sub={`${caption.length} chars`}/>
        <div style={{whiteSpace:'pre-wrap', fontSize:'14px', color: INK, lineHeight:1.6, padding:'14px 16px', background:'#F4F2FB', borderRadius:'10px'}}>
          {caption || <em style={{color: INK_SOFT}}>No caption for this variant.</em>}
        </div>
        <FooterActions actions={[{ label: 'Copy Caption', text: caption }]}/>
      </PreviewCard>
      <PreviewCard accent="gold">
        <PreviewHeader title="Visual prompt" sub="for Canva / DALL-E"/>
        <div style={{whiteSpace:'pre-wrap', fontSize:'13.5px', color: INK, lineHeight:1.6, padding:'14px 16px', background:'rgba(201,168,76,0.08)', borderRadius:'10px', border:`0.5px solid ${GOLD}33`}}>
          {visual || <em style={{color: INK_SOFT}}>No visual prompt provided.</em>}
        </div>
        <FooterActions actions={[{ label: 'Copy Visual Prompt', text: visual }]}/>
      </PreviewCard>
    </div>
  );
};

const EmailTab: React.FC<{data?: CampaignData['email']; variant: 'a' | 'b'}> = ({ data, variant }) => {
  const subject = (variant === 'a' ? data?.subject_a : data?.subject_b) || '';
  const preview = data?.preview_text || '';
  const body    = data?.body || '';
  // Naive plain-text: strip basic HTML tags for the alternate copy button.
  const plain = body.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  return (
    <PreviewCard>
      <PreviewHeader title="Email" sub={`Variant ${variant.toUpperCase()}`}/>
      {/* Mock email frame */}
      <div style={{border:`1px solid rgba(83,74,183,0.18)`, borderRadius:'10px', overflow:'hidden', background:'#FFFFFF'}}>
        <div style={{padding:'12px 14px', background:'#F4F2FB', borderBottom:'0.5px solid rgba(83,74,183,0.12)', display:'flex', flexDirection:'column', gap:'4px'}}>
          <Row label="Subject" value={subject}/>
          <Row label="Preview" value={preview}/>
          <Row label="From"    value="SoulMD <hello@soulmd.us>"/>
        </div>
        <div style={{padding:'18px 18px 22px', fontSize:'14px', color: INK, lineHeight:1.7, whiteSpace:'pre-wrap'}}
          dangerouslySetInnerHTML={{ __html: body || '<em style="color:#6B6889">No body for this variant.</em>' }}
        />
      </div>
      <FooterActions actions={[
        { label: 'Copy Subject', text: subject },
        { label: 'Copy HTML',    text: body },
        { label: 'Copy Plain Text', text: plain },
      ]}/>
    </PreviewCard>
  );
};

const ScheduleTab: React.FC<{data?: CampaignData['posting_schedule']}> = ({ data }) => {
  const rows: {platform: string; time: string; notes: string}[] = [
    { platform: 'LinkedIn',  time: data?.linkedin  || '—', notes: 'Highest engagement on weekday mornings.' },
    { platform: 'Twitter / X',time: data?.twitter   || '—', notes: 'Lunch hour + commute reach is best.' },
    { platform: 'Instagram', time: data?.instagram || '—', notes: 'Mid-morning lift; weekend impressions softer.' },
    { platform: 'Email',     time: data?.email     || '—', notes: 'Mid-week opens beat Mondays/Fridays.' },
  ];
  return (
    <PreviewCard>
      <PreviewHeader title="Posting schedule"/>
      <div style={{overflow:'hidden', borderRadius:'10px', border:'0.5px solid rgba(83,74,183,0.14)'}}>
        <div style={{display:'grid', gridTemplateColumns:'140px 1fr 1fr', background: NAVY, color:'white', padding:'10px 12px', fontSize:'10px', fontWeight:800, letterSpacing:'1px', textTransform:'uppercase'}}>
          <div>Platform</div>
          <div>Best time</div>
          <div>Notes</div>
        </div>
        {rows.map((r, i) => (
          <div key={r.platform} style={{display:'grid', gridTemplateColumns:'140px 1fr 1fr', padding:'12px', background: i % 2 ? '#FAFAFE' : '#FFFFFF', borderTop:'0.5px solid rgba(83,74,183,0.10)', fontSize:'13px', color: INK}}>
            <div style={{fontWeight:800}}>{r.platform}</div>
            <div>{r.time}</div>
            <div style={{color: INK_SOFT}}>{r.notes}</div>
          </div>
        ))}
      </div>
    </PreviewCard>
  );
};

// ───── Reusable preview pieces ────────────────────────────────────────────

const PreviewCard: React.FC<{children: React.ReactNode; accent?: 'navy' | 'gold'}> = ({ children, accent = 'navy' }) => (
  <div style={{
    background:'#FFFFFF', border: CARD_BORDER, borderRadius:'14px',
    padding:'14px 16px', boxShadow:'0 2px 14px rgba(83,74,183,0.06)',
    borderLeft: `3px solid ${accent === 'gold' ? GOLD : NAVY}`,
  }}>
    <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>{children}</div>
  </div>
);

const PreviewHeader: React.FC<{title: string; sub?: string}> = ({ title, sub }) => (
  <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:'10px'}}>
    <div style={{fontSize:'13px', fontWeight:800, color: NAVY, letterSpacing:'-0.2px'}}>{title}</div>
    {sub && <div style={{fontSize:'10px', color: INK_SOFT, letterSpacing:'0.5px', textTransform:'uppercase', fontWeight:700}}>{sub}</div>}
  </div>
);

const Row: React.FC<{label: string; value: string}> = ({ label, value }) => (
  <div style={{display:'flex', gap:'8px', alignItems:'baseline', fontSize:'12px'}}>
    <div style={{color: INK_SOFT, fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', minWidth:'56px'}}>{label}</div>
    <div style={{color: INK, fontWeight:600, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{value || '—'}</div>
  </div>
);

const FooterActions: React.FC<{actions: {label: string; text: string}[]}> = ({ actions }) => (
  <div style={{display:'flex', gap:'6px', flexWrap:'wrap', justifyContent:'flex-end'}}>
    {actions.map(a => <CopyButton key={a.label} label={a.label} text={a.text}/>)}
  </div>
);

// ───── Copy button ────────────────────────────────────────────────────────

const CopyButton: React.FC<{text: string; label?: string; compact?: boolean}> = ({ text, label = 'Copy', compact }) => {
  const [done, setDone] = useState(false);
  const onClick = async () => {
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        // Fallback for older browsers / contexts where clipboard API is unavailable.
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
      }
      setDone(true);
      window.setTimeout(() => setDone(false), 1500);
    } catch { /* swallow — clipboard denial is benign */ }
  };
  return (
    <button onClick={onClick} disabled={!text}
      style={{
        background: done ? GOLD : 'transparent',
        color: done ? NAVY_DEEP : NAVY,
        border: `0.5px solid ${done ? GOLD : 'rgba(83,74,183,0.22)'}`,
        borderRadius: compact ? '8px' : '10px',
        padding: compact ? '4px 8px' : '6px 12px',
        fontSize: compact ? '10px' : '11px',
        fontWeight: 800, letterSpacing:'0.4px', textTransform:'uppercase',
        cursor: text ? 'pointer' : 'not-allowed', fontFamily:'inherit',
        opacity: text ? 1 : 0.45,
        whiteSpace:'nowrap',
      }}>
      {done ? '✓ Copied' : label}
    </button>
  );
};

// Suppress an unused-import warning for `useMemo` / `PARCHMENT` if I keep
// them around for a Phase-2 markdown preview mode. Using `void` to keep
// the bundler happy without changing the public surface.
void useMemo; void PARCHMENT;

export default MarketingAgent;
