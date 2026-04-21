// © 2026 SoulMD, LLC. All rights reserved.
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// ─── Sentry error tracking ──────────────────────────────────────────────────
// DSN is resolved in this order:
//   1. REACT_APP_SENTRY_DSN baked in at build time (if set before npm run build)
//   2. Fetched at runtime from the backend /config endpoint — this is the
//      preferred path so DSN rotation doesn't require a rebuild. Railway env
//      var REACT_APP_SENTRY_DSN or SENTRY_FRONTEND_DSN is used by the backend.
//
// PII scrubbing: this app handles clinical input (lab values, notes,
// medication lists) that is potentially PHI-adjacent. We disable default PII
// and strip any request body / known PHI keys from breadcrumbs and events
// before they leave the browser.

const PHI_KEYS = new Set([
  'lab_text', 'bullets', 'text', 'justification', 'notes',
  'clinical_context', 'inputs', 'medication_name', 'diagnosis', 'allergies',
]);

const scrubEvent = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(scrubEvent);
  const out: any = {};
  for (const k of Object.keys(obj)) {
    out[k] = PHI_KEYS.has(k) ? '[scrubbed]' : scrubEvent(obj[k]);
  }
  return out;
};

const initSentryWith = (dsn: string, env: string, traceRate: number) => {
  if (!dsn) return;
  // eslint-disable-next-line
  const Sentry = require('@sentry/react');
  Sentry.init({
    dsn,
    environment: env,
    release: process.env.REACT_APP_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: traceRate,
    beforeSend(event: any) {
      if (event.request?.data) event.request.data = '[scrubbed]';
      if (event.extra) event.extra = scrubEvent(event.extra);
      if (event.contexts) event.contexts = scrubEvent(event.contexts);
      return event;
    },
    beforeBreadcrumb(breadcrumb: any) {
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
};

// Path 1: build-time DSN (legacy — if someone sets REACT_APP_SENTRY_DSN in
// their local shell before `npm run build`, the bundle has it baked in).
const BUILD_TIME_DSN = process.env.REACT_APP_SENTRY_DSN;
if (BUILD_TIME_DSN) {
  initSentryWith(
    BUILD_TIME_DSN,
    process.env.REACT_APP_SENTRY_ENV || 'production',
    parseFloat(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  );
} else {
  // Path 2: runtime fetch from backend. Fire-and-forget so we don't block
  // React mount. Early errors (before fetch completes) won't be captured —
  // acceptable tradeoff for keeping DSN rotation out of the build pipeline.
  fetch('https://ekgscan.com/config')
    .then(r => r.ok ? r.json() : null)
    .then(cfg => {
      const s = cfg?.sentry || {};
      if (s.dsn) initSentryWith(s.dsn, s.env || 'production', Number(s.traces_sample_rate ?? 0.1));
    })
    .catch(() => { /* ignore — Sentry stays disabled */ });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
