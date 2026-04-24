// © 2026 SoulMD, LLC. All rights reserved.
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onTranscript: (chunk: string) => void;
  size?: number;
  style?: React.CSSProperties;
  // When the browser lacks SpeechRecognition, render a disabled mic button
  // with a "not supported" tooltip instead of rendering nothing.
  fallbackWhenUnsupported?: boolean;
}

// Inject pulse keyframe once per page
if (typeof document !== 'undefined' && !document.getElementById('__soulmd_dictate_pulse')) {
  const s = document.createElement('style');
  s.id = '__soulmd_dictate_pulse';
  s.textContent = `@keyframes soulmdDictatePulse { 0%,100% { box-shadow: 0 0 0 0 rgba(224,80,80,0.45); } 50% { box-shadow: 0 0 0 8px rgba(224,80,80,0); } }`;
  document.head.appendChild(s);
}

const supportsSpeech = () => typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

const DictationButton: React.FC<Props> = ({ onTranscript, size = 32, style, fallbackWhenUnsupported }) => {
  const [supported] = useState<boolean>(supportsSpeech());
  const [recording, setRecording] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => () => { try { recRef.current?.stop(); } catch {} }, []);

  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (event: any) => {
        let finalChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalChunk += event.results[i][0].transcript;
        }
        if (finalChunk) onTranscript(finalChunk.trim() + ' ');
      };
      rec.onerror = () => setRecording(false);
      rec.onend = () => setRecording(false);
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch { setRecording(false); }
  };

  const stop = () => {
    try { recRef.current?.stop(); } catch {}
    setRecording(false);
  };

  if (!supported) {
    if (!fallbackWhenUnsupported) return null;
    return (
      <button
        type="button"
        disabled
        title="Voice input not supported on this browser"
        aria-label="Voice input not supported on this browser"
        style={{
          width: size, height: size, borderRadius: '50%', border: 'none',
          cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, background: 'rgba(180,180,200,0.12)', color: '#b0b0c0', padding: 0,
          ...style,
        }}
      >
        <svg width={Math.round(size * 0.55)} height={Math.round(size * 0.55)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="9" y="2" width="6" height="12" rx="3"/>
          <path d="M5 10v2a7 7 0 0 0 14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
          <line x1="8" y1="22" x2="16" y2="22"/>
          <line x1="3" y1="3" x2="21" y2="21" stroke="#c04040" strokeWidth="2.2"/>
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      title={recording ? 'Listening… click to stop' : 'Click to dictate'}
      aria-label={recording ? 'Stop dictation' : 'Start dictation'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: recording ? 'rgba(224,80,80,0.12)' : 'rgba(122,176,240,0.1)',
        color: recording ? '#e05050' : '#7ab0f0',
        transition: 'background 0.2s, color 0.2s',
        animation: recording ? 'soulmdDictatePulse 1.4s ease-in-out infinite' : 'none',
        padding: 0,
        ...style,
      }}
    >
      <svg width={Math.round(size * 0.55)} height={Math.round(size * 0.55)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="9" y="2" width="6" height="12" rx="3"/>
        <path d="M5 10v2a7 7 0 0 0 14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="8" y1="22" x2="16" y2="22"/>
      </svg>
    </button>
  );
};

export default DictationButton;
