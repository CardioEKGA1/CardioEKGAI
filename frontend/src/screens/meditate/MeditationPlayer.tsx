// © 2026 SoulMD, LLC. All rights reserved.
// Fullscreen meditation player for /meditate. Pulls the script via the
// /meditate library endpoint, renders title + countdown timer + ambient
// pulsing gradient + scrollable script. "Mark Complete" hands control
// back to the parent so it can open the diary entry form.
//
// The opal-blue ↔ blush-pink gradient pulse is a subtle 14s loop —
// background-position drift, not a reflow, so it's GPU-cheap.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MEDITATE_TOKENS as T } from './MeditateApp';
import DictationButton from '../../DictationButton';

interface Props {
  API: string;
  token: string;
  medId: number;
  onClose: () => void;
  onComplete: (medId: number, title: string) => void;
}

interface MeditationDetail {
  id: number;
  title: string;
  category: string;
  duration_min: number;
  description: string;
  difficulty: string | null;
  affirmations: string[];
  script: string;
  audio_url: string | null;
}

if (typeof document !== 'undefined' && !document.getElementById('__meditate_player_anim')) {
  const s = document.createElement('style');
  s.id = '__meditate_player_anim';
  s.textContent = `
    @keyframes meditatePlayerPulse {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;
  document.head.appendChild(s);
}

const fmtClock = (sec: number): string => {
  const m = Math.max(0, Math.floor(sec / 60));
  const s = Math.max(0, Math.floor(sec % 60));
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Ambient sound options. All four are synthesized with the Web Audio
// API on the fly — no audio files shipped, no CDN dependency. Rain +
// Ocean are filtered white noise; Singing Bowls is a sustained sine
// chord with slow attack/decay; Silence is a no-op.
type AmbientId = 'silence' | 'rain' | 'bowls' | 'ocean';
const AMBIENT_OPTIONS: { id: AmbientId; icon: string; label: string }[] = [
  { id: 'silence', icon: '🔇', label: 'Silence' },
  { id: 'rain',    icon: '🌧',  label: 'Rain' },
  { id: 'bowls',   icon: '🎵', label: 'Singing Bowls' },
  { id: 'ocean',   icon: '🌊', label: 'Ocean' },
];

interface AmbientHandle { stop: () => void; ctx: AudioContext; }

function startAmbient(kind: AmbientId): AmbientHandle | null {
  if (kind === 'silence') return null;
  const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  const ctx: AudioContext = new Ctx();
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.18;
  masterGain.connect(ctx.destination);

  const stoppers: Array<() => void> = [];

  if (kind === 'rain') {
    // White noise → low-pass filter for that wet, hissy texture.
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 480;
    src.connect(hp); hp.connect(lp); lp.connect(masterGain);
    src.start();
    stoppers.push(() => { try { src.stop(); } catch {} });
  } else if (kind === 'ocean') {
    // Brown-ish noise + slow LFO on the lowpass cutoff = surf.
    const buf = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 280;
    lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
    src.connect(lp); lp.connect(masterGain);
    src.start(); lfo.start();
    stoppers.push(() => { try { src.stop(); } catch {} try { lfo.stop(); } catch {} });
  } else if (kind === 'bowls') {
    // Three sine partials with slow attack/decay — feels like a bowl.
    const partials = [196, 261.63, 392]; // G3, C4, G4
    partials.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0;
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.12, now + 4 + i);
      // Gentle tremolo so it breathes.
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.15 + i * 0.07;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.04;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      osc.connect(g); g.connect(masterGain);
      osc.start(); lfo.start();
      stoppers.push(() => { try { osc.stop(); } catch {} try { lfo.stop(); } catch {} });
    });
  }

  return {
    ctx,
    stop: () => {
      stoppers.forEach(s => s());
      try { ctx.close(); } catch {}
    },
  };
}

const MeditationPlayer: React.FC<Props> = ({ API, token, medId, onClose, onComplete }) => {
  const [med, setMed] = useState<MeditationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  // Countdown — starts paused; user taps Begin to start.
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState<number>(0);   // seconds
  const totalRef = useRef<number>(0);                       // seconds, frozen at meditation load
  const tickRef = useRef<number | null>(null);

  // Free-form notes captured during the session — handed to the diary
  // form prefill on Mark Complete.
  const [notes, setNotes] = useState<string>('');

  // Ambient sound — synthesized via Web Audio when running flips on.
  const [ambient, setAmbient] = useState<AmbientId>('silence');
  const ambientRef = useRef<AmbientHandle | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr('');
    fetch(`${API}/meditate/meditations/${medId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))
      .then(d => {
        if (!alive) return;
        setMed(d);
        const sec = (d.duration_min || 10) * 60;
        totalRef.current = sec;
        setRemaining(sec);
      })
      .catch(e => { if (alive) setErr(`Could not load meditation: ${e.message || e}`); })
      .finally(() => { if (alive) setLoading(false); });
    // Record an "opened" play history row (completed=false) so the
    // Resume card on the home tab knows where the user left off.
    fetch(`${API}/meditate/meditations/play`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ meditation_id: medId, completed: false }),
    }).catch(() => {});
    return () => { alive = false; };
  }, [API, token, medId]);

  // Tick. Runs only while `running`. Pause-friendly — pauses snapshot
  // the remaining seconds rather than recomputing from a start time.
  useEffect(() => {
    if (!running) {
      if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
      return;
    }
    tickRef.current = window.setInterval(() => {
      setRemaining(r => Math.max(0, r - 1));
    }, 1000);
    return () => {
      if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    };
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && running) setRunning(false);
  }, [remaining, running]);

  // Drive the ambient sound off `running` + `ambient`. Browser autoplay
  // rules require a user gesture to start audio — Begin/Pause is that
  // gesture so this works without prompting.
  useEffect(() => {
    if (running && ambient !== 'silence') {
      ambientRef.current = startAmbient(ambient);
    }
    return () => {
      if (ambientRef.current) { ambientRef.current.stop(); ambientRef.current = null; }
    };
  }, [running, ambient]);
  // Tear down on unmount too.
  useEffect(() => () => { if (ambientRef.current) { ambientRef.current.stop(); ambientRef.current = null; } }, []);

  const startPause = useCallback(() => setRunning(r => !r), []);
  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(totalRef.current);
  }, []);

  const complete = useCallback(() => {
    if (!med) return;
    setRunning(false);
    // Record completion so it counts toward streaks + total minutes.
    // Fire-and-forget — UX never waits on this write.
    fetch(`${API}/meditate/meditations/play`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ meditation_id: med.id, completed: true }),
    }).catch(() => {});
    onComplete(med.id, med.title);
  }, [API, token, med, onComplete]);

  const paragraphs = useMemo(
    () => (med?.script || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
    [med?.script]
  );

  const pct = totalRef.current > 0 ? ((totalRef.current - remaining) / totalRef.current) * 100 : 0;

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:3500, overflow:'auto',
      background: `linear-gradient(135deg, ${T.blue} 0%, ${T.pearl} 35%, ${T.pink} 100%)`,
      backgroundSize:'200% 200%',
      animation:'meditatePlayerPulse 14s ease-in-out infinite',
      color: T.ink,
      fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      padding:'clamp(20px,5vw,36px) clamp(16px,5vw,28px) calc(40px + env(safe-area-inset-bottom, 0px))',
    }}>
      <div style={{maxWidth:'620px', margin:'0 auto', position:'relative', zIndex:1}}>
        {/* Top bar */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px'}}>
          <button onClick={onClose}
            style={{background:'rgba(255,255,255,0.78)', border:`0.5px solid ${T.border}`, borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:700, color: T.purple, cursor:'pointer', fontFamily:'inherit'}}>
            ← Close
          </button>
          {med && (
            <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.navy, fontWeight:700, maxWidth:'60%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {med.category}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{padding:'80px 0', textAlign:'center', color: T.inkSoft, fontFamily: T.serif, fontStyle:'italic'}}>
            Gathering the script…
          </div>
        ) : err ? (
          <div style={{padding:'40px 20px', color:'#a02020', textAlign:'center'}}>{err}</div>
        ) : med ? (
          <>
            {/* Title */}
            <div style={{textAlign:'center', marginBottom:'18px'}}>
              <div style={{fontFamily: T.serif, fontSize:'clamp(24px,6vw,32px)', fontWeight:600, color: T.navy, lineHeight:1.2, letterSpacing:'-0.3px'}}>
                {med.title}
              </div>
              {med.duration_min > 0 && (
                <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'13px', color: T.inkSoft, marginTop:'4px'}}>
                  {med.duration_min} minutes · {med.difficulty || 'all levels'}
                </div>
              )}
            </div>

            {/* Ambient sound picker — synthesized via Web Audio when
                Begin is tapped (browser autoplay rules require a user
                gesture, which Begin/Pause provides). */}
            <div style={{
              background:'rgba(255,255,255,0.78)', border: T.cardBorder, borderRadius:'14px',
              padding:'10px 12px', marginBottom:'10px',
              boxShadow:'0 4px 14px rgba(83,74,183,0.06)',
            }}>
              <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.inkSoft, fontWeight:800, marginBottom:'8px'}}>
                Ambient Sound
              </div>
              <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                {AMBIENT_OPTIONS.map(o => {
                  const active = ambient === o.id;
                  return (
                    <button key={o.id} onClick={() => setAmbient(o.id)}
                      style={{
                        flex:'1 1 calc(25% - 6px)', minWidth:'88px',
                        padding:'8px 10px', borderRadius:'10px',
                        background: active ? `linear-gradient(135deg, ${T.purple}, ${T.navy})` : 'rgba(255,255,255,0.6)',
                        color: active ? 'white' : T.ink,
                        border: active ? 'none' : T.cardBorder,
                        fontSize:'11px', fontWeight: active ? 800 : 600,
                        cursor:'pointer', fontFamily:'inherit',
                      }}>
                      <span style={{marginRight:'4px'}}>{o.icon}</span>{o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timer */}
            <div style={{
              background:'rgba(255,255,255,0.78)', border: T.cardBorder, borderRadius:'18px',
              padding:'18px', marginBottom:'14px',
              boxShadow:'0 8px 22px rgba(83,74,183,0.10)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:'10px',
            }}>
              <div style={{fontFamily: T.serif, fontSize:'42px', fontWeight:600, color: T.navy, letterSpacing:'-1px', lineHeight:1}}>
                {fmtClock(remaining)}
              </div>
              <div style={{width:'100%', height:'6px', borderRadius:'4px', background:'rgba(83,74,183,0.08)', overflow:'hidden'}}>
                <div style={{
                  width:`${pct}%`, height:'100%',
                  background:`linear-gradient(90deg, ${T.blue}, ${T.purple} 60%, ${T.gold})`,
                  transition:'width 950ms linear',
                }}/>
              </div>
              <div style={{display:'flex', gap:'8px', marginTop:'4px'}}>
                <button onClick={startPause}
                  style={{background:`linear-gradient(135deg, ${T.purple}, ${T.navy})`, color:'white', border:'none', borderRadius:'12px', padding:'10px 22px', fontSize:'13px', fontWeight:800, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.4px'}}>
                  {running ? '⏸ Pause' : remaining === 0 ? '↻ Start over' : '▶ Begin'}
                </button>
                <button onClick={reset}
                  style={{background:'rgba(255,255,255,0.78)', color: T.inkSoft, border:`0.5px solid ${T.border}`, borderRadius:'12px', padding:'10px 16px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}>
                  Reset
                </button>
              </div>
            </div>

            {/* Script */}
            <div style={{
              background:'rgba(255,255,255,0.78)', border: T.cardBorder, borderRadius:'18px',
              padding:'20px', marginBottom:'14px',
              boxShadow:'0 8px 22px rgba(83,74,183,0.08)',
              fontFamily: T.serif, fontSize:'16px', lineHeight:1.85, color: T.navy,
            }}>
              {paragraphs.length > 0 ? paragraphs.map((p, i) => (
                <p key={i} style={{margin: i === 0 ? '0 0 18px' : '18px 0 0', whiteSpace:'pre-wrap'}}>{p}</p>
              )) : (
                <div style={{color: T.inkSoft, fontStyle:'italic', textAlign:'center'}}>
                  This meditation has no script yet — sit quietly with the timer.
                </div>
              )}
            </div>

            {/* Affirmations (when present) */}
            {(med.affirmations || []).length > 0 && (
              <div style={{
                background: T.goldSoft, border:`0.5px solid ${T.gold}55`, borderRadius:'14px',
                padding:'14px 16px', marginBottom:'14px',
              }}>
                <div style={{fontSize:'10px', letterSpacing:'1.6px', textTransform:'uppercase', color: T.navy, fontWeight:800, marginBottom:'6px'}}>
                  ✦ Affirmations
                </div>
                {(med.affirmations || []).map((a, i) => (
                  <div key={i} style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'13.5px', color: T.navy, lineHeight:1.6, marginBottom:'4px'}}>
                    · {a}
                  </div>
                ))}
              </div>
            )}

            {/* In-session notes — handed to the diary entry on complete via
                URL hash (lightweight prefill; the form just reads localStorage). */}
            <div style={{
              background:'rgba(255,255,255,0.78)', border: T.cardBorder, borderRadius:'18px',
              padding:'14px', marginBottom:'18px',
            }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.inkSoft, fontWeight:800}}>Notes (optional)</div>
                <DictationButton
                  accent="purple"
                  size={32}
                  fallbackWhenUnsupported
                  onTranscript={(chunk) => setNotes(v => (v + (v && !v.endsWith(' ') ? ' ' : '') + chunk).trimStart())}
                />
              </div>
              <textarea
                value={notes}
                onChange={e => {
                  setNotes(e.target.value);
                  // Stash for the diary form to pick up.
                  try { sessionStorage.setItem('meditate_session_notes', e.target.value); } catch {}
                }}
                placeholder="Anything that arises — set it down here."
                style={{
                  width:'100%', minHeight:'70px', padding:'10px',
                  borderRadius:'10px', border:'1px solid rgba(180,210,230,0.6)',
                  background:'rgba(255,255,255,0.6)', color: T.ink, fontSize:'13px',
                  lineHeight:1.55, resize:'vertical', outline:'none',
                  fontFamily:'inherit', boxSizing:'border-box',
                }}
              />
            </div>

            <button onClick={complete}
              style={{
                width:'100%', padding:'14px',
                background: `linear-gradient(135deg, ${T.gold}, #a8842c)`,
                color: T.navy, border:'none', borderRadius:'14px',
                fontSize:'14px', fontWeight:800, cursor:'pointer',
                fontFamily:'inherit', letterSpacing:'0.5px', textTransform:'uppercase',
                boxShadow:'0 12px 28px rgba(201,168,76,0.28)',
              }}>
              ✦ Mark Complete
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default MeditationPlayer;
