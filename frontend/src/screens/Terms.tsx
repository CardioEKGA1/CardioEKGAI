// © 2026 SoulMD, LLC. All rights reserved.
import React from 'react';
import ComplianceDisclaimer from '../ComplianceDisclaimer';

interface Props { onBack: () => void; }

const Terms: React.FC<Props> = ({ onBack }) => (
  <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#dce8fb 0%,#ede8fb 100%)',padding:'40px 20px'}}>
    <div style={{maxWidth:'700px',margin:'0 auto',background:'rgba(255,255,255,0.85)',borderRadius:'24px',padding:'40px',boxShadow:'0 8px 32px rgba(100,130,200,0.12)'}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:'#4a7ad0',fontSize:'13px',cursor:'pointer',marginBottom:'24px',padding:'0'}}>← Back</button>
      
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'32px'}}>
        <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="22" height="16" viewBox="0 0 22 16"><polyline points="0,8 4,8 6,2 8,14 10,4 12,12 14,8 22,8" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <div style={{fontSize:'20px',fontWeight:'800',color:'#1a2a4a'}}>SoulMD Terms of Service</div>
          <div style={{fontSize:'11px',color:'#8aa0c0',marginTop:'2px'}}>Operated by SoulMD, LLC</div>
          <div style={{fontSize:'12px',color:'#8aa0c0'}}>Covers EKGScan (ekgscan.com) and SoulMD Suite (soulmd.us) · Last updated: April 2026</div>
        </div>
      </div>

      {[
        {
          title: '1. Acceptance of Terms',
          body: 'By accessing or using EKGScan ("the Service"), operated by SoulMD, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.'
        },
        {
          title: '2. Medical Disclaimer — Please Read Carefully',
          body: 'EKGScan is a clinical decision support tool only. It is NOT a substitute for professional medical judgment, diagnosis, or treatment. All AI-generated interpretations must be reviewed and verified by a licensed, qualified clinician before any clinical action is taken. EKGScan does not provide medical advice. Never disregard professional medical advice or delay seeking it because of something you read on this platform. In a medical emergency, call 911 or your local emergency number immediately.'
        },
        {
          title: '3. Not FDA Cleared',
          body: 'EKGScan has not been reviewed or cleared by the U.S. Food and Drug Administration (FDA). This tool is intended for informational and decision support purposes only and is not intended to diagnose, treat, cure, or prevent any disease or health condition.'
        },
        {
          title: '4. User Accounts',
          body: 'You must create an account to use EKGScan. You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information and to notify us immediately of any unauthorized use of your account.'
        },
        {
          title: '5. Subscriptions and Billing',
          body: 'Every clinical tool offers one free analysis before a subscription is required. Standard tools (EKGScan, RxCheck, AntibioticAI, NephroAI) are $9.99/month or $89.99/year. Premium tools (ClinicalNote AI, CerebralAI, XrayRead, PalliativeMD) are $24.99/month or $179.99/year. LabRead and CliniScore are free with a 5-per-day allowance, and become unlimited with the Suite. The full SoulMD Suite (all 10 tools) is $111.11/month or $1,199/year. Subscriptions automatically renew unless cancelled. You may cancel at any time through your account settings. No refunds are provided for partial billing periods.'
        },
        {
          title: '6. Patient Data and Privacy',
          body: 'You are solely responsible for ensuring that any images or data you upload comply with applicable privacy laws, including HIPAA if you are a covered entity or business associate. EKGScan does not sign Business Associate Agreements (BAAs) and is not HIPAA compliant. Do not upload images containing identifiable patient information (PHI). By uploading any image, you represent that you have the right to do so and that the image does not contain PHI, or that you have obtained appropriate consent.'
        },
        {
          title: '7. Limitation of Liability',
          body: 'To the maximum extent permitted by law, SoulMD and EKGScan shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.'
        },
        {
          title: '8. Intellectual Property',
          body: 'All content, features, and functionality of EKGScan are owned by SoulMD and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute any part of the Service without our written permission.'
        },
        {
          title: '9. Prohibited Uses',
          body: 'You agree not to use EKGScan to: (a) make clinical decisions without independent professional review; (b) upload images you do not have the right to share; (c) attempt to reverse engineer or hack the Service; (d) use the Service for any unlawful purpose; (e) resell or redistribute the Service without written permission.'
        },
        {
          title: '10. Changes to Terms',
          body: 'We reserve the right to modify these Terms at any time. We will notify users of significant changes via email. Continued use of the Service after changes constitutes acceptance of the new Terms.'
        },
        {
          title: '11. Governing Law and Jurisdiction',
          body: 'These Terms are governed by the laws of the State of Utah, United States, without regard to conflict-of-law principles. Nothing in these Terms limits the mandatory statutory rights of consumers resident in the European Union, EEA, United Kingdom, or Australia.'
        },
        {
          title: '12. EU / UK / EEA Users — GDPR',
          body: 'If you are located in the EU, EEA, or UK, the processing of your personal data is governed by the General Data Protection Regulation (GDPR) or the UK GDPR, as applicable. SoulMD, LLC. acts as the data controller. Our lawful bases for processing include (a) performance of this contract, (b) your consent for transactional email, and (c) legitimate interests in securing and improving the service. You have rights of access, rectification, erasure, restriction, portability, and objection, and the right to lodge a complaint with your national data protection authority. See our Privacy Policy or email support@soulmd.us to exercise these rights.'
        },
        {
          title: '13. Australian Users',
          body: 'If you are located in Australia, our handling of your personal information complies with the Privacy Act 1988 (Cth) and the Australian Privacy Principles. You have the right to access and correct your personal information and to complain to the Office of the Australian Information Commissioner (OAIC). Certain consumer guarantees under the Australian Consumer Law apply to our service and cannot be excluded.'
        },
        {
          title: '14. Data Processor Information',
          body: 'SoulMD, LLC. is the data controller. We engage the following sub-processors: Stripe (payment processing), Anthropic (AI inference), SendGrid / Twilio (transactional email), and Railway (hosting). All are US-based; international transfers rely on Standard Contractual Clauses where applicable. See the Privacy Policy for details.'
        },
        {
          title: '15. Account Deletion',
          body: 'You may delete your account at any time via the "Delete my account" action in the dashboard. Deletion removes saved cases, usage logs, and feedback, and cancels any active Stripe subscription. Stripe may retain billing records as required by tax and accounting laws.'
        },
        {
          title: '16. Contact',
          body: 'For questions about these Terms, data privacy, or compliance: support@soulmd.us · SoulMD, LLC.'
        },
      ].map(section => (
        <div key={section.title} style={{marginBottom:'24px'}}>
          <div style={{fontSize:'15px',fontWeight:'700',color:'#1a2a4a',marginBottom:'8px'}}>{section.title}</div>
          <div style={{fontSize:'13px',color:'#4a5e6a',lineHeight:'1.8'}}>{section.body}</div>
        </div>
      ))}

      <div style={{marginTop:'32px',padding:'16px',background:'rgba(122,176,240,0.1)',borderRadius:'12px',fontSize:'12px',color:'#6a8ab0',lineHeight:'1.6',textAlign:'center'}}>
        By using EKGScan or the SoulMD Suite you agree to these terms. Decision support only — always consult a qualified clinician before acting on any AI interpretation.
      </div>
      <ComplianceDisclaimer style={{marginTop: '16px'}}/>
    </div>
  </div>
);
export default Terms;
