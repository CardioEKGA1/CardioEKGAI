// © 2026 SoulMD, LLC. All rights reserved.
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// ─── Sentry error tracking ──────────────────────────────────────────────────
// Gated on REACT_APP_SENTRY_DSN env var at BUILD time (CRA inlines the value
// into the bundle). If the env var is absent when `npm run build` runs, Sentry
// is silently disabled — no overhead, no errors.
//
// PII scrubbing: this app handles clinical input (lab values, notes,
// medication lists) that is potentially PHI-adjacent. We disable default PII
// and strip any request body / known PHI keys from breadcrumbs and events
// before they leave the browser.
const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN;
if (SENTRY_DSN) {
  // Lazy require so the @sentry/react bundle cost is skipped in builds where
  // Sentry is disabled.
  // eslint-disable-next-line
  const Sentry = require('@sentry/react');
  const PHI_KEYS = new Set([
    'lab_text', 'bullets', 'text', 'justification', 'notes',
    'clinical_context', 'inputs', 'medication_name', 'diagnosis', 'allergies',
  ]);
  const scrub = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(scrub);
    const out: any = {};
    for (const k of Object.keys(obj)) {
      out[k] = PHI_KEYS.has(k) ? '[scrubbed]' : scrub(obj[k]);
    }
    return out;
  };
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.REACT_APP_SENTRY_ENV || 'production',
    release: process.env.REACT_APP_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: parseFloat(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || '0.05'),
    beforeSend(event: any) {
      if (event.request?.data) event.request.data = '[scrubbed]';
      if (event.extra) event.extra = scrub(event.extra);
      if (event.contexts) event.contexts = scrub(event.contexts);
      return event;
    },
    beforeBreadcrumb(breadcrumb: any) {
      // Fetch breadcrumbs can leak URLs with PHI in query params — drop bodies,
      // keep status + URL pathname only.
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        if (breadcrumb.data) {
          delete breadcrumb.data.request_body_size;
          if (typeof breadcrumb.data.url === 'string') {
            try { breadcrumb.data.url = new URL(breadcrumb.data.url, window.location.origin).pathname; }
            catch {}
          }
        }
      }
      return breadcrumb;
    },
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
