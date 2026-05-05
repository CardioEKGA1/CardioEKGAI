// © 2026 SoulMD, LLC. All rights reserved.
//
// AuthVerify — landing page for the magic-link email URLs of the form
// https://soulmd.us/auth/verify?token=XXX. The token is consumed by
// the backend at GET /api/auth/verify, which sets the soulmd_session
// httpOnly cookie and 302-redirects to the destination stored on the
// token row (or to /login?error=… on failure).
//
// We don't fetch the backend from JS here — the browser navigates
// directly so:
//   1. The Set-Cookie from the 302 lands on the right origin.
//   2. The follow-up navigation to the destination is the same one
//      the user would have triggered manually, so any cookies set
//      apply to subsequent requests without a second roundtrip.
// We render a brief spinner during the flash, plus inline error
// states for malformed URLs (no token / non-string token) so the
// front-end never bricks the user with a blank screen.
import React, { useEffect, useMemo } from 'react';
import SoulMDLogo from '../SoulMDLogo';

interface Props { API: string; }

const NAVY    = '#1a2a4a';
const PURPLE  = '#534AB7';
const SOFT    = '#6B6889';
const BORDER  = 'rgba(83,74,183,0.18)';
const SERIF   = 'Georgia, "Times New Roman", serif';

const ERROR_COPY: Record<string, { headline: string; detail: string }> = {
  expired: {
    headline: 'This link has expired',
    detail: 'Magic links are valid for 15 minutes. Request a new one to sign in.',
  },
  used: {
    headline: 'This link has already been used',
    detail: 'Magic links work once. Request a new one to sign in.',
  },
  invalid: {
    headline: 'Invalid link',
    detail: "We couldn't read this sign-in link. Request a new one.",
  },
};

const AuthVerify: React.FC<Props> = ({ API }) => {
  // Two distinct error sources land here:
  //   - ?error=expired|used|invalid  → set by the backend's verify
  //     handler when it bounced us back here (rare; usually it'd
  //     bounce to /login). We render the same copy as /login does so
  //     the message is consistent regardless of which side caught it.
  //   - missing/empty ?token         → the URL was hand-crafted or
  //     mangled; we never made the backend call. Render the
  //     `invalid` copy and link to /login.
  const { token, errorKey } = useMemo(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return {
        token: (p.get('token') || '').trim(),
        errorKey: (p.get('error') || '').trim(),
      };
    } catch {
      return { token: '', errorKey: '' };
    }
  }, []);

  const error = ERROR_COPY[errorKey] || (token ? null : ERROR_COPY.invalid);

  useEffect(() => {
    // Bail out without navigating when there's an error to render.
    if (error) return;
    if (!token) return;
    // Hand off to the backend. The browser follows the 302 natively,
    // so cookies set on /api/auth/verify apply to the destination.
    // encodeURIComponent guards against tokens with stray + or /
    // (token_urlsafe shouldn't produce them, but be defensive).
    const url = `${API.replace(/\/$/, '')}/api/auth/verify?token=${encodeURIComponent(token)}`;
    window.location.replace(url);
  }, [API, token, error]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      background: 'linear-gradient(135deg, #F6EEF8 0%, #FDFBF8 60%)',
      fontFamily: '-apple-system,BlinkMacSystemFont,Inter,sans-serif',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
        borderRadius: '22px', padding: '40px 32px',
        maxWidth: '440px', width: '100%', textAlign: 'center',
        boxShadow: '0 16px 48px rgba(20,18,40,0.10)',
        border: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
          <SoulMDLogo size={56} showText={false} />
        </div>
        <div style={{
          fontFamily: SERIF, fontSize: '24px', color: NAVY, fontWeight: 400,
          letterSpacing: '0.02em', marginBottom: '8px',
        }}>SoulMD</div>

        {error ? (
          <ErrorView headline={error.headline} detail={error.detail} />
        ) : (
          <LoadingView />
        )}
      </div>
    </div>
  );
};

const LoadingView: React.FC = () => (
  <>
    <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0 12px' }}>
      <Spinner />
    </div>
    <div style={{ fontSize: '14px', color: NAVY, fontWeight: 600 }}>
      Verifying your link…
    </div>
    <div style={{ fontSize: '12px', color: SOFT, marginTop: '6px' }}>
      You'll be redirected in a moment.
    </div>
  </>
);

const ErrorView: React.FC<{ headline: string; detail: string }> = ({ headline, detail }) => (
  <>
    <div style={{
      fontSize: '16px', color: NAVY, fontWeight: 700, marginTop: '14px', marginBottom: '8px',
    }}>{headline}</div>
    <div style={{
      fontSize: '13px', color: SOFT, lineHeight: 1.6, margin: '0 0 22px',
    }}>{detail}</div>
    <a href="/login" style={{
      display: 'inline-block', padding: '12px 22px', borderRadius: '12px',
      background: NAVY, color: 'white', textDecoration: 'none',
      fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em',
    }}>
      Back to sign in
    </a>
  </>
);

const Spinner: React.FC = () => (
  <>
    <style>{`
      @keyframes smdAuthSpin { to { transform: rotate(360deg); } }
    `}</style>
    <div style={{
      width: '36px', height: '36px',
      border: `3px solid ${BORDER}`,
      borderTopColor: PURPLE,
      borderRadius: '50%',
      animation: 'smdAuthSpin 0.8s linear infinite',
    }} />
  </>
);

export default AuthVerify;
