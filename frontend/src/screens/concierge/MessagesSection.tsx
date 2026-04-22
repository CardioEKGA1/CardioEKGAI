// © 2026 SoulMD, LLC. All rights reserved.
import React, { useCallback, useEffect, useState } from 'react';

interface Props { API: string; token: string; accent: string; }

interface PatientMini { id: number; name: string; email: string; membership_tier: string; last_contact_at: string | null; }
interface Message { id: number; direction: 'outbound' | 'inbound' | 'note'; subject: string | null; body: string; created_at: string; }

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.85)', borderRadius:'16px',
  border: '1px solid rgba(184,152,112,0.25)',
  boxShadow: '0 2px 10px rgba(90,70,50,0.06)',
};

const INPUT: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'10px',
  border:'1px solid rgba(184,152,112,0.35)',
  fontSize:'13px', color:'#3a2a1a', background:'rgba(255,253,248,0.8)',
  outline:'none', boxSizing:'border-box', fontFamily:'inherit',
};

const MessagesSection: React.FC<Props> = ({ API, token, accent }) => {
  const [patients, setPatients] = useState<PatientMini[]>([]);
  const [selected, setSelected] = useState<PatientMini | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState('');

  const loadPatients = useCallback(() => {
    fetch(`${API}/concierge/patients`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setPatients((d.patients || []).map((p: any) => ({ id: p.id, name: p.name, email: p.email, membership_tier: p.membership_tier, last_contact_at: p.last_contact_at }))))
      .catch(() => setError('Could not load patients.'))
      .finally(() => setLoadingList(false));
  }, [API, token]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const openThread = (p: PatientMini) => {
    setSelected(p);
    setMessages([]);
    setLoadingThread(true);
    fetch(`${API}/concierge/patients/${p.id}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setMessages(d.messages || []))
      .catch(() => setError('Could not load thread.'))
      .finally(() => setLoadingThread(false));
  };

  return (
    <div style={{display:'grid', gridTemplateColumns: selected ? 'minmax(240px, 320px) 1fr' : '1fr', gap:'14px', minHeight:'500px'}}>
      {/* Patient list sidebar */}
      <div style={{...CARD, padding:'14px', display: selected ? 'block' : 'block', maxHeight:'calc(100vh - 220px)', overflowY:'auto'}}>
        <div style={{fontSize:'12px', fontWeight:800, color:'#3a2a1a', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'10px'}}>Patients</div>
        {loadingList ? (
          <div style={{fontSize:'12px', color:'#8a6e50', padding:'20px', textAlign:'center'}}>Loading…</div>
        ) : patients.length === 0 ? (
          <div style={{fontSize:'12px', color:'#8a6e50', padding:'20px', textAlign:'center'}}>No patients yet. Add one in Patients first.</div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
            {patients.map(p => (
              <button
                key={p.id}
                onClick={() => openThread(p)}
                style={{
                  textAlign:'left', cursor:'pointer', padding:'10px 12px', borderRadius:'10px',
                  border: selected?.id === p.id ? '1px solid rgba(184,152,112,0.5)' : '1px solid transparent',
                  background: selected?.id === p.id ? 'rgba(184,152,112,0.12)' : 'transparent',
                  fontFamily:'inherit',
                }}
              >
                <div style={{fontSize:'13px', fontWeight:700, color:'#3a2a1a'}}>{p.name}</div>
                <div style={{fontSize:'11px', color:'#8a6e50', marginTop:'2px'}}>{p.email}</div>
                {p.last_contact_at && (
                  <div style={{fontSize:'10px', color:'#a0947e', marginTop:'3px'}}>Last contact {new Date(p.last_contact_at).toLocaleDateString()}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thread view */}
      {selected ? (
        <MessageThread API={API} token={token} accent={accent} patient={selected} messages={messages} loading={loadingThread} onSent={() => openThread(selected)}/>
      ) : (
        <div style={{...CARD, padding:'60px 20px', textAlign:'center', color:'#8a6e50'}}>
          <div style={{fontSize:'36px', marginBottom:'10px', opacity:0.5}}>💬</div>
          <div style={{fontSize:'14px', fontWeight:700, color:'#3a2a1a', marginBottom:'4px'}}>Select a patient</div>
          <div style={{fontSize:'12px'}}>Choose a patient from the sidebar to view their message thread or send a new message.</div>
        </div>
      )}

      {error && <div style={{gridColumn:'1/-1', background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 12px', color:'#a02020', fontSize:'12px'}}>{error}</div>}
    </div>
  );
};

const MessageThread: React.FC<{API:string; token:string; accent:string; patient:PatientMini; messages:Message[]; loading:boolean; onSent:()=>void}> = ({API, token, accent, patient, messages, loading, onSent}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [deliver, setDeliver] = useState(true);
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{ok: boolean; text: string} | null>(null);

  const send = async () => {
    const txt = body.trim();
    if (!txt) return;
    setSending(true);
    setBanner(null);
    try {
      const res = await fetch(`${API}/concierge/messages`, {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ patient_id: patient.id, subject: subject || undefined, body: txt, deliver_email: deliver }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Send failed');
      setSubject(''); setBody('');
      if (deliver && !data.delivered) {
        setBanner({ok: false, text: `Saved but email delivery failed: ${data.delivery_error || 'unknown'}`});
      } else if (deliver) {
        setBanner({ok: true, text: 'Sent. Email delivered.'});
      } else {
        setBanner({ok: true, text: 'Saved to thread (not emailed).'});
      }
      onSent();
      setTimeout(() => setBanner(null), 4000);
    } catch (e: any) {
      setBanner({ok: false, text: e.message});
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{display:'flex', flexDirection:'column', gap:'10px', minHeight:'500px'}}>
      {/* Header */}
      <div style={{...CARD, padding:'14px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:'16px', fontWeight:800, color:'#3a2a1a'}}>{patient.name}</div>
            <div style={{fontSize:'12px', color:'#8a6e50', wordBreak:'break-all'}}>{patient.email}</div>
          </div>
          <div style={{fontSize:'10px', color:'#8a6e50', letterSpacing:'0.5px', textTransform:'uppercase', fontWeight:700}}>
            {messages.length} message{messages.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Thread */}
      <div style={{...CARD, padding:'16px', flex:1, overflowY:'auto', maxHeight:'calc(100vh - 480px)', minHeight:'220px'}}>
        {loading ? (
          <div style={{textAlign:'center', color:'#8a6e50', fontSize:'12px', padding:'20px'}}>Loading messages…</div>
        ) : messages.length === 0 ? (
          <div style={{textAlign:'center', color:'#8a6e50', padding:'30px 20px'}}>
            <div style={{fontSize:'32px', marginBottom:'8px', opacity:0.4}}>📬</div>
            <div style={{fontSize:'13px', fontWeight:700, color:'#3a2a1a', marginBottom:'4px'}}>No messages yet</div>
            <div style={{fontSize:'11px'}}>Send the first message below.</div>
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            {messages.map(m => {
              const outbound = m.direction === 'outbound';
              return (
                <div key={m.id} style={{display:'flex', justifyContent: outbound ? 'flex-end' : 'flex-start'}}>
                  <div style={{
                    maxWidth:'76%', padding:'10px 14px', borderRadius:'14px',
                    background: outbound ? accent : 'rgba(240,235,225,0.9)',
                    color: outbound ? 'white' : '#3a2a1a',
                    borderBottomRightRadius: outbound ? '4px' : '14px',
                    borderBottomLeftRadius: outbound ? '14px' : '4px',
                  }}>
                    {m.subject && (
                      <div style={{fontSize:'11px', fontWeight:800, opacity: outbound ? 0.85 : 0.7, marginBottom:'4px', letterSpacing:'0.3px'}}>{m.subject}</div>
                    )}
                    <div style={{fontSize:'13px', lineHeight:1.55, whiteSpace:'pre-wrap'}}>{m.body}</div>
                    <div style={{fontSize:'10px', opacity:0.7, marginTop:'6px', textAlign:'right'}}>
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose */}
      <div style={{...CARD, padding:'14px'}}>
        <div style={{fontSize:'11px', fontWeight:800, color:'#3a2a1a', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'10px'}}>Compose</div>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject (optional)"
          style={{...INPUT, marginBottom:'8px'}}
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write a message. Replies from the patient will arrive in your inbox."
          style={{...INPUT, minHeight:'110px', resize:'vertical'}}
        />
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', marginTop:'10px', flexWrap:'wrap'}}>
          <label style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#6a5a40', cursor:'pointer'}}>
            <input type="checkbox" checked={deliver} onChange={e => setDeliver(e.target.checked)}/>
            Deliver via email (replies go to your inbox)
          </label>
          <button onClick={send} disabled={sending || !body.trim()} style={{background:accent, border:'none', borderRadius:'10px', padding:'10px 18px', fontSize:'13px', fontWeight:700, color:'white', cursor:'pointer', opacity: (sending || !body.trim()) ? 0.6 : 1}}>
            {sending ? 'Sending…' : deliver ? 'Send email' : 'Save to thread'}
          </button>
        </div>
        {banner && (
          <div style={{marginTop:'10px', padding:'8px 12px', borderRadius:'8px', fontSize:'12px', background: banner.ok ? 'rgba(112,184,112,0.15)' : 'rgba(224,80,80,0.12)', color: banner.ok ? '#2a7a2a' : '#a02020'}}>
            {banner.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesSection;
