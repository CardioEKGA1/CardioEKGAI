import React, { useState } from 'react';
import Landing from './screens/Landing';
import Upload from './screens/Upload';
import Results from './screens/Results';
import Chat from './screens/Chat';

export interface EkgResult {
  rhythm: string;
  rate: string;
  pr_interval: string;
  qrs_duration: string;
  qt_interval: string;
  qtc: string;
  axis: string;
  impression: string;
  urgent_flags: string[];
  recommendation: string;
}

type Screen = 'landing' | 'upload' | 'results' | 'chat';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [result, setResult] = useState<EkgResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#dce8fb 0%,#ede8fb 100%)',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
      {screen==='landing' && <Landing onSignIn={()=>setScreen('upload')} onSignUp={()=>setScreen('upload')}/>}
      {screen==='upload' && <Upload onResult={(r,url)=>{setResult(r);setImageUrl(url);setScreen('results');}}/>}
      {screen==='results' && result && <Results result={result} imageUrl={imageUrl} onChat={()=>setScreen('chat')} onBack={()=>setScreen('upload')}/>}
      {screen==='chat' && result && <Chat result={result} onBack={()=>setScreen('results')}/>}
    </div>
  );
};
export default App;
