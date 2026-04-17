import React, { useState, useRef, useEffect } from 'react';
import { EkgResult } from '../App';

interface Props { result: EkgResult; onBack: () => void; }
interface Message { role: 'user' | 'assistant'; content: string; }

const Chat: React.FC<Props> = ({ result, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hello! I have the EKG findings loaded. The key findings are: ${result.rhythm}, rate ${result.rate}, QTc ${result.qtc}. ${result.urgent_flags.length > 0 ? 'Urgent flags: ' + result.urgent_flags.join(', ') + '.' : ''} What would you like to know?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('https://cardioekgai-production.up.railway.app/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.message }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',maxWidth:'600px',margin:'0 auto',padding:'0 20px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'20px 0 16px'}}>
        <button onClick={onBack} style={{background:'rgba(255,255,255,0.7)',border:'none',borderRadius:'10px',padding:'8px 14px',fontSize:'13px',color:'#4a7ad0',cursor:'pointer',fontWeight:'600'}}>← Back</button>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="18" height="13" viewBox="0 0 18 13"><polyline points="0,6.5 3,6.5 5,1.5 7,11.5 9,3.5 11,9.5 13,6.5 18,6.5" fill="none" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div style={{fontSize:'15px',fontWeight:'700',color:'#1a2a4a'}}>Dr. CardioEKGAI</div>
            <div style={{fontSize:'11px',color:'#70b870'}}>● EKG context loaded</div>
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:'12px',paddingBottom:'16px'}}>
        {messages.map((m, i) => (
          <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
            <div style={{maxWidth:'82%',padding:'12px 16px',borderRadius:'16px',fontSize:'14px',lineHeight:'1.6',
              background:m.role==='user'?'linear-gradient(135deg,#7ab0f0,#5a90d8)':'rgba(255,255,255,0.85)',
              color:m.role==='user'?'white':'#1a2a4a',
              borderBottomRightRadius:m.role==='user'?'4px':'16px',
              borderBottomLeftRadius:m.role==='assistant'?'4px':'16px',
              boxShadow:'0 2px 12px rgba(100,130,200,0.1)'}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{display:'flex',justifyContent:'flex-start'}}>
            <div style={{background:'rgba(255,255,255,0.85)',borderRadius:'16px',borderBottomLeftRadius:'4px',padding:'12px 16px',fontSize:'14px',color:'#8aa0c0'}}>Thinking...</div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div style={{padding:'12px 0 24px',display:'flex',gap:'10px'}}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && send()}
          placeholder="Ask about the EKG findings..."
          style={{flex:1,background:'rgba(255,255,255,0.85)',border:'1px solid rgba(122,176,240,0.3)',borderRadius:'16px',padding:'14px 18px',fontSize:'14px',color:'#1a2a4a',outline:'none'}}
        />
        <button onClick={send} disabled={loading} style={{width:'48px',height:'48px',borderRadius:'50%',background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <span style={{color:'white',fontSize:'18px'}}>↑</span>
        </button>
      </div>

      <div style={{fontSize:'11px',color:'#8aa0c0',textAlign:'center',paddingBottom:'16px'}}>
        Decision support only · Not a substitute for clinical judgment
      </div>
    </div>
  );
};
export default Chat;
