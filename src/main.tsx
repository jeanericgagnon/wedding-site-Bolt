import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx';
import { logClientError } from './lib/errorLogger';
import './index.css';
import './i18n/index';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('[dayof] App connection settings are missing.');
}

if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      if (import.meta.env.DEV) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().catch(() => {});
          });
        }).catch(() => {});
      } else {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    });
  }

  window.addEventListener('error', (event) => {
    logClientError({
      source: 'window-error',
      severity: 'error',
      message: event.message || 'Unhandled window error',
      stack: event.error?.stack,
      metadata: {
        file: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason ?? 'Unhandled promise rejection');
    const stack = reason instanceof Error ? reason.stack : undefined;
    logClientError({
      source: 'unhandled-rejection',
      severity: 'error',
      message,
      stack,
    });
  });

  window.addEventListener('dayof:function-error', (event) => {
    const detail = event instanceof CustomEvent ? event.detail as {
      functionName?: string;
      status?: number;
      code?: string;
      message?: string;
    } : {};
    logClientError({
      source: 'edge-function',
      severity: detail.status && detail.status >= 500 ? 'error' : 'warning',
      message: detail.message || 'Edge Function request failed',
      metadata: {
        functionName: detail.functionName,
        status: detail.status,
        code: detail.code,
      },
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
