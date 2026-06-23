import React, { Component, ErrorInfo, ReactNode } from 'react';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
