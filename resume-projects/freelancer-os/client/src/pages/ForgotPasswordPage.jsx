import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/common/Logo';
import { api } from '../lib/api';
import { siteConfig } from '../config/site';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailNotConfigured, setEmailNotConfigured] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError('');
    setEmailNotConfigured(false);
    setIsLoading(true);

    try {
      await api.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      if (err.code === 'EMAIL_NOT_CONFIGURED' || err.data?.code === 'EMAIL_NOT_CONFIGURED') {
        setEmailNotConfigured(true);
      } else {
        setEmailError(err.message || 'Unable to process reset request. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--page, #FAF5EA)',
        color: 'var(--ink, #0E1A2B)',
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-block' }} aria-label="Floorly home">
            <Logo size="lg" />
          </Link>
        </div>

        <div
          style={{
            background: 'var(--surface, #FFFFFF)',
            border: '1px solid var(--line, #E8E0CF)',
            borderRadius: '14px',
            padding: '36px 32px',
            boxShadow: '0 4px 12px rgba(14, 26, 43, 0.04)',
          }}
        >
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
              marginBottom: '8px',
              color: 'var(--ink, #0E1A2B)',
              letterSpacing: '-0.02em',
            }}
          >
            Reset your password
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--muted, #5B6676)', marginBottom: '24px', lineHeight: 1.5 }}>
            Enter your email and we'll send you instructions to reset your password.
          </p>

          {emailNotConfigured ? (
            <div
              role="alert"
              style={{
                background: '#FEF3F2',
                border: '1px solid #FECDCA',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '15px',
                color: '#912018',
                lineHeight: 1.5,
              }}
            >
              <strong>Email Delivery Not Configured</strong>
              <p style={{ marginTop: '6px', fontSize: '14px' }}>
                Automated email delivery is currently disabled on this instance. To reset your password, please contact our support desk directly at{' '}
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  style={{ color: '#B42318', textDecoration: 'underline', fontWeight: 600 }}
                >
                  {siteConfig.supportEmail}
                </a>{' '}
                or visit our <Link to="/contact" style={{ color: '#B42318', textDecoration: 'underline', fontWeight: 600 }}>Contact page</Link>.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <Link
                  to="/login"
                  style={{
                    color: 'var(--cobalt, #0047AB)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  ← Return to sign in
                </Link>
                <button
                  type="button"
                  onClick={() => setEmailNotConfigured(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--muted, #5B6676)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Try another address
                </button>
              </div>
            </div>
          ) : submitted ? (
            <div
              role="status"
              aria-live="polite"
              style={{
                background: '#EAF1FB',
                border: '1px solid #BFD5F2',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '15px',
                color: 'var(--cobalt-dark, #003A8C)',
                lineHeight: 1.5,
              }}
            >
              <strong>Check your inbox</strong>
              <p style={{ marginTop: '4px' }}>
                If an account exists for <strong>{email}</strong>, we've sent a reset link.
              </p>
              <div style={{ marginTop: '16px' }}>
                <Link
                  to="/login"
                  style={{
                    color: 'var(--cobalt, #0047AB)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  ← Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="forgot-email"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: 'var(--ink, #0E1A2B)',
                  }}
                >
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="you@company.com"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'forgot-email-error' : undefined}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '16px',
                    fontFamily: "'Instrument Sans', sans-serif",
                    borderRadius: '12px',
                    border: emailError ? '1.5px solid var(--error, #B42318)' : '1px solid var(--line, #E8E0CF)',
                    background: '#FFFFFF',
                    color: 'var(--ink, #0E1A2B)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  className="focus:ring-2 focus:ring-[var(--cobalt,#0047AB)]/40 focus:border-[var(--cobalt,#0047AB)]"
                />
                {emailError && (
                  <p
                    id="forgot-email-error"
                    style={{ fontSize: '13px', color: 'var(--error, #B42318)', marginTop: '6px', fontWeight: 500 }}
                  >
                    {emailError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '999px',
                  background: 'var(--cobalt, #0047AB)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  fontFamily: "'Instrument Sans', sans-serif",
                  transition: 'background 0.15s ease',
                }}
                className="hover:bg-[var(--cobalt-dark,#003A8C)]"
              >
                {isLoading ? 'Sending reset link...' : 'Send reset link'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Link
                  to="/login"
                  style={{
                    color: 'var(--muted, #5B6676)',
                    fontSize: '14px',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                  className="hover:text-[var(--ink,#0E1A2B)]"
                >
                  Remember your password? <span style={{ color: 'var(--cobalt, #0047AB)', fontWeight: 600 }}>Sign in</span>
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <footer
          style={{
            marginTop: '32px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--muted, #5B6676)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '8px' }}>
            <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:underline">
              Terms
            </Link>
            <span>·</span>
            <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:underline">
              Privacy
            </Link>
            <span>·</span>
            <Link to="/contact" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:underline">
              Contact
            </Link>
          </div>
          <p>© 2026 Floorly</p>
        </footer>
      </div>
    </div>
  );
}
