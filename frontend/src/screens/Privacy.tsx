// © 2026 SoulMD. All rights reserved.
import React from 'react';

interface Props { onBack: () => void; }

const SECTIONS: {title: string; body: React.ReactNode}[] = [
  { title: '1. Introduction', body: 'This Privacy Policy describes how SoulMD Inc. ("SoulMD", "we", "us") collects, uses, and discloses information when you use our clinical decision support services at soulmd.us and ekgscan.com. We comply with the EU General Data Protection Regulation (GDPR), the UK GDPR, and the Australian Privacy Act 1988.' },
  { title: '2. Data We Collect', body: (<>
    <div>We collect only what we need to run the service:</div>
    <ul style={{marginTop:'6px', paddingLeft:'20px'}}>
      <li>Email address (for passwordless authentication and transactional email)</li>
      <li>Usage data (which tools you use and when — for billing and service quality)</li>
      <li>Clinical case inputs (text, images, and uploads you submit for AI analysis)</li>
      <li>Subscription status and billing metadata (via Stripe)</li>
      <li>Minimal technical data (IP, browser type) — for security and abuse prevention only</li>
    </ul>
    <div style={{marginTop:'10px'}}>We do <b>not</b> collect patient-identifiable information (you are responsible for not submitting PHI), marketing or behavioral tracking data, or any third-party advertising identifiers.</div>
  </>) },
  { title: '3. How We Use Your Data', body: (<>
    <div>We use your data only to:</div>
    <ul style={{marginTop:'6px', paddingLeft:'20px'}}>
      <li>Provide clinical decision support (send your inputs to the AI provider and return results)</li>
      <li>Process payments (via Stripe)</li>
      <li>Send transactional email (sign-in links, billing notices)</li>
      <li>Track usage for billing and usage-cap enforcement</li>
      <li>Comply with legal obligations</li>
    </ul>
    <div style={{marginTop:'10px'}}>We <b>never</b> use your data to train AI models, sell to data brokers, or serve third-party advertising.</div>
  </>) },
  { title: '4. Data Storage and Security', body: 'All data is stored on servers located in the United States (Railway, Postgres). Databases are encrypted at rest at the disk layer. All data in transit is encrypted via HTTPS/TLS. Access to production data is restricted to SoulMD personnel acting under confidentiality obligations.' },
  { title: '5. Data Retention', body: (<>
    <ul style={{paddingLeft:'20px'}}>
      <li><b>Clinical cases:</b> automatically deleted after 90 days</li>
      <li><b>Tool usage logs:</b> retained while your account is active, for billing accuracy</li>
      <li><b>Account data:</b> retained until you request deletion or delete your account in-app</li>
      <li><b>Upon deletion:</b> all user data is removed within 7 days; Stripe subscriptions are canceled immediately</li>
    </ul>
  </>) },
  { title: '6. Your Rights (GDPR, UK GDPR, Australian Privacy Act)', body: (<>
    <div>You have the right to:</div>
    <ul style={{marginTop:'6px', paddingLeft:'20px'}}>
      <li><b>Access</b> — request a copy of your data</li>
      <li><b>Rectify</b> — correct inaccurate data</li>
      <li><b>Erase</b> — delete your account and all associated data (available in-app under "Delete my account")</li>
      <li><b>Port</b> — receive your data in a machine-readable format</li>
      <li><b>Restrict</b> — request we stop certain processing</li>
      <li><b>Object</b> — to processing based on legitimate interests</li>
      <li><b>Withdraw consent</b> — stop using the service at any time</li>
    </ul>
    <div style={{marginTop:'10px'}}>Exercise any of these rights by emailing <a href="mailto:support@soulmd.us" style={{color:'#4a7ad0'}}>support@soulmd.us</a>. We respond within 30 days. EU/EEA users have the right to lodge a complaint with their national data protection authority; Australian users may contact the Office of the Australian Information Commissioner (OAIC).</div>
  </>) },
  { title: '7. Third-Party Processors', body: (<>
    <div>We share the minimum data needed with these processors:</div>
    <ul style={{marginTop:'6px', paddingLeft:'20px'}}>
      <li><b>Stripe</b> — payment processing (PCI-DSS compliant) · stripe.com/privacy</li>
      <li><b>Anthropic</b> — AI inference (your case inputs are sent for analysis) · anthropic.com/legal</li>
      <li><b>SendGrid (Twilio)</b> — transactional email · twilio.com/legal/privacy</li>
      <li><b>Railway</b> — hosting · railway.com/privacy</li>
    </ul>
    <div style={{marginTop:'10px'}}>Each processor is bound by its own agreement to use your data only for the service provided to SoulMD.</div>
  </>) },
  { title: '8. Cookies and Local Storage', body: 'SoulMD uses essential cookies and browser localStorage only — for authentication (storing your session token) and to remember your cookie-consent choice. We do not use analytics, tracking, or advertising cookies.' },
  { title: '9. International Transfers', body: 'If you are in the EU, EEA, UK, or Australia, your data is transferred to the United States for processing. We rely on Standard Contractual Clauses (SCCs) with our US-based processors where applicable.' },
  { title: '10. Children', body: 'SoulMD is for licensed healthcare professionals only. We do not knowingly collect data from anyone under 18.' },
  { title: '11. Medical Disclaimer', body: 'SoulMD provides clinical decision support. All outputs must be independently reviewed by a licensed clinician. We are not FDA-cleared, not CE-marked as a medical device, and do not provide medical advice.' },
  { title: '12. Changes to this Policy', body: 'We may update this policy as laws or our practices change. Material changes will be communicated via email. Continued use of the service after a change constitutes acceptance.' },
  { title: '13. Contact', body: (<>For data protection inquiries, access requests, or deletion requests: <a href="mailto:support@soulmd.us" style={{color:'#4a7ad0'}}>support@soulmd.us</a>. SoulMD Inc.</>) },
];

const Privacy: React.FC<Props> = ({ onBack }) => (
  <div style={{minHeight:'100vh', background:'linear-gradient(135deg,#dce8fb 0%,#ede8fb 100%)', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', padding:'40px 20px'}}>
    <div style={{maxWidth:'720px', margin:'0 auto', background:'rgba(255,255,255,0.85)', borderRadius:'24px', padding:'40px', boxShadow:'0 8px 32px rgba(100,130,200,0.12)'}}>
      <button onClick={onBack} style={{background:'none', border:'none', color:'#4a7ad0', fontSize:'13px', cursor:'pointer', marginBottom:'24px', padding:'0'}}>← Back</button>
      <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'32px'}}>
        <div style={{width:'40px', height:'40px', borderRadius:'12px', background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'16px'}}>🔒</div>
        <div>
          <div style={{fontSize:'22px', fontWeight:'800', color:'#1a2a4a'}}>SoulMD Privacy Policy</div>
          <div style={{fontSize:'12px', color:'#8aa0c0'}}>Last updated: April 2026</div>
        </div>
      </div>
      {SECTIONS.map(s => (
        <div key={s.title} style={{marginBottom:'24px'}}>
          <div style={{fontSize:'15px', fontWeight:'700', color:'#1a2a4a', marginBottom:'8px'}}>{s.title}</div>
          <div style={{fontSize:'13px', color:'#4a5e6a', lineHeight:'1.8'}}>{s.body}</div>
        </div>
      ))}
      <div style={{marginTop:'32px', padding:'16px', background:'rgba(122,176,240,0.1)', borderRadius:'12px', fontSize:'12px', color:'#6a8ab0', lineHeight:'1.6', textAlign:'center'}}>
        Questions? Data access requests? Email <a href="mailto:support@soulmd.us" style={{color:'#4a7ad0'}}>support@soulmd.us</a>.
      </div>
    </div>
  </div>
);

export default Privacy;
