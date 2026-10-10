import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/common/Logo';
import { Footer } from '../components/layout/Footer';
import { ArrowLeft, Home, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export function NotFoundPage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--page, #FAF5EA)',
        color: 'var(--ink, #0E1A2B)',
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid var(--line, #E8E0CF)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link to="/" style={{ textDecoration: 'none' }} aria-label="Floorly home">
          <Logo size="sm" />
        </Link>
        <Link
          to={isAuthenticated ? '/dashboard' : '/'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--muted, #5B6676)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isAuthenticated ? 'Return to Workspace' : 'Back to Home'}</span>
        </Link>
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            backgroundColor: 'var(--surface, #FFFFFF)',
            border: '1px solid var(--line, #E8E0CF)',
            borderRadius: '16px',
            padding: '48px 36px',
            boxShadow: '0 8px 24px rgba(14, 26, 43, 0.04)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--cobalt, #0047AB)',
              backgroundColor: '#EAF1FB',
              padding: '4px 12px',
              borderRadius: '999px',
              marginBottom: '16px',
              letterSpacing: '0.05em',
            }}
          >
            ERROR 404
          </span>

          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--ink, #0E1A2B)',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
            }}
          >
            Page not found
          </h1>

          <p
            style={{
              fontSize: '15px',
              color: 'var(--muted, #5B6676)',
              lineHeight: 1.6,
              marginBottom: '28px',
            }}
          >
            The link you followed may be broken, the document may have been deleted, or the route does not exist.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <Link
              to={isAuthenticated ? '/dashboard' : '/'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: 'var(--cobalt, #0047AB)',
                color: '#FFFFFF',
                padding: '12px 20px',
                borderRadius: '999px',
                fontWeight: 600,
                fontSize: '15px',
                textDecoration: 'none',
                transition: 'background-color 0.15s ease',
              }}
            >
              <Home className="w-4 h-4" />
              <span>{isAuthenticated ? 'Go to Dashboard' : 'Go to Homepage'}</span>
            </Link>

            <Link
              to="/contact"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: 'transparent',
                color: 'var(--muted, #5B6676)',
                padding: '10px 20px',
                borderRadius: '999px',
                fontWeight: 500,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Contact Support</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer isPublic={true} />
    </div>
  );
}
