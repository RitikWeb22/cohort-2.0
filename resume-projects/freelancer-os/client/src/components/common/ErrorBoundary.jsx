import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // In production, structured error logging could be sent to telemetry
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            backgroundColor: 'var(--page, #FAF5EA)',
            color: 'var(--ink, #0E1A2B)',
            fontFamily: "'Instrument Sans', system-ui, sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: 'var(--surface, #FFFFFF)',
              border: '1px solid var(--line, #E8E0CF)',
              borderRadius: '16px',
              padding: '36px 32px',
              boxShadow: '0 8px 24px rgba(14, 26, 43, 0.06)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#FEF3F2',
                color: '#D92D20',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h1
              style={{
                fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--ink, #0E1A2B)',
                marginBottom: '8px',
                letterSpacing: '-0.01em',
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: 'var(--muted, #5B6676)',
                lineHeight: 1.6,
                marginBottom: '24px',
              }}
            >
              Floorly encountered an unexpected error while rendering this view. Your saved projects, proposals, and financial records remain safe.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '20px',
              }}
            >
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--cobalt, #0047AB)',
                  color: '#FFFFFF',
                  padding: '10px 18px',
                  borderRadius: '999px',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'transparent',
                  color: 'var(--ink, #0E1A2B)',
                  padding: '10px 18px',
                  borderRadius: '999px',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: '1px solid var(--line, #E8E0CF)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Home className="w-4 h-4" />
                Return to Dashboard
              </button>
            </div>

            {this.state.error && (
              <details
                style={{
                  marginTop: '16px',
                  textAlign: 'left',
                  backgroundColor: '#F8F9FA',
                  border: '1px solid #E9ECEF',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#495057',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#6C757D' }}>
                  Technical Details
                </summary>
                <pre
                  style={{
                    marginTop: '8px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    maxHeight: '140px',
                    overflowY: 'auto',
                  }}
                >
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
