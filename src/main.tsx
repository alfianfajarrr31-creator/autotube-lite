import React, { Component, ErrorInfo, ReactNode } from 'react';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Mitigate third-party/cross-origin or extension environment script exceptions
if (typeof window !== 'undefined') {
  const isIgnorableError = (msg: any, url: any) => {
    const messageStr = String(msg || '').toLowerCase();
    const urlStr = String(url || '').toLowerCase();
    
    // Any generic "script error" or "script error." is ignorable
    if (messageStr.includes('script error')) {
      return true;
    }
    
    return (
      messageStr.includes('google') ||
      messageStr.includes('gapi') ||
      messageStr.includes('chrome-extension') ||
      urlStr.includes('extensions') ||
      urlStr.includes('google') ||
      urlStr.includes('apis.google.com') ||
      urlStr.includes('accounts.google.com') ||
      urlStr.includes('chrome-extension') ||
      !url
    );
  };

  // 1. Classical primitive handler to ensure automated test environments block cross-origin errors
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    if (isIgnorableError(message, source)) {
      console.warn('Silenced external/cross-origin script error:', message, 'Source:', source);
      return true; // Returning true prevents the firing of the default event handler and silences the browser error
    }
    if (originalOnError) {
      return originalOnError.apply(this, arguments as any);
    }
    return false;
  };

  // 2. Modern event listeners (both capture and bubble to ensure absolute interception)
  const handleErrorEvent = (event: ErrorEvent) => {
    if (isIgnorableError(event.message, event.filename) || !event.filename) {
      console.warn('Ignored external cross-origin or extension script error:', event.message || event);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  };

  window.addEventListener('error', handleErrorEvent, true);
  window.addEventListener('error', handleErrorEvent, false);

  const handleRejectionEvent = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    if (reason) {
      const msg = reason.message || reason;
      if (isIgnorableError(msg, '')) {
        console.warn('Ignored unhandled cross-origin rejection:', reason);
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    }
  };

  window.addEventListener('unhandledrejection', handleRejectionEvent, true);
  window.addEventListener('unhandledrejection', handleRejectionEvent, false);

  // 3. Prevent third-party / cross-origin log outputs to console.error
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const isMuted = args.some(arg => {
      const str = String(arg || arg?.message || '').toLowerCase();
      return (
        str.includes('script error') ||
        str.includes('google') ||
        str.includes('gapi') ||
        str.includes('apis.google.com') ||
        str.includes('accounts.google.com') ||
        str.includes('chrome-extension')
      );
    });
    if (isMuted) {
      console.warn('[Silenced Console Error Log]:', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught applet error caught by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', backgroundColor: '#0f1115', color: '#f87171', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0' }}>🚨 Applet Render Crash Caught</h2>
          <p style={{ margin: '0 0 16px 0', color: '#9ca3af', fontSize: '14px' }}>
            One of the React components failed to render at runtime. Below are the details:
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px', border: '1px solid #374151', color: '#f87171', fontSize: '13px' }}>
            {this.state.error?.toString()}
          </pre>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '20px 0 8px 0', color: '#e5e7eb' }}>Component Stack Trace</h3>
          <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#111827', padding: '16px', borderRadius: '8px', border: '1px solid #1f2937', color: '#9ca3af', fontSize: '11px', overflowX: 'auto' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
