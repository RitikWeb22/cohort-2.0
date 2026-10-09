import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useVerifyEmailMutation, useResendVerificationMutation } from '../services/api.js';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { useSelector } from 'react-redux';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [verifyEmail, { isLoading, isSuccess, isError, error }] = useVerifyEmailMutation();
  const [resendVerification, { isLoading: isResending, isSuccess: isResent }] = useResendVerificationMutation();

  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (token && !attempted) {
      setAttempted(true);
      verifyEmail(token);
    }
  }, [token, attempted, verifyEmail]);

  return (
    <div className="container" style={{ paddingTop: '6rem', paddingBottom: '8rem', maxWidth: '600px' }}>
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--sand)',
          padding: '3.5rem 2.5rem',
          textAlign: 'center',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        {isLoading && (
          <div>
            <Loader2 size={44} color="var(--accent)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem auto' }} />
            <h1 style={{ fontSize: '1.8rem', marginBottom: '0.8rem' }}>Verifying Your Email</h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem' }}>
              Confirming your security token with KORA...
            </p>
          </div>
        )}

        {isSuccess && (
          <div>
            <CheckCircle2 size={48} color="var(--accent)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h1 style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>Email Successfully Verified</h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', marginBottom: '2.5rem', lineHeight: '1.7' }}>
              Your email address has been confirmed. You now have full access to order tracking, tailoring updates, and priority dispatches.
            </p>
            <Link to="/catalog" className="btn-primary" style={{ padding: '0.9rem 2.2rem' }}>
              Explore Collections
            </Link>
          </div>
        )}

        {isError && (
          <div>
            <XCircle size={48} color="var(--status-danger)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h1 style={{ fontSize: '1.8rem', marginBottom: '0.8rem' }}>Verification Link Expired</h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.7' }}>
              {error?.data?.message || 'This verification link is invalid or has expired.'}
            </p>

            {isAuthenticated ? (
              <div>
                <button
                  onClick={() => resendVerification()}
                  disabled={isResending || isResent}
                  className="btn-primary"
                  style={{ padding: '0.9rem 2rem' }}
                >
                  <Mail size={16} />
                  {isResent ? 'Verification Email Sent!' : isResending ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
            ) : (
              <Link to="/" className="btn-secondary">
                Return to Home
              </Link>
            )}
          </div>
        )}

        {!token && (
          <div>
            <Mail size={44} color="var(--accent)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h1 style={{ fontSize: '1.8rem', marginBottom: '0.8rem' }}>Email Verification</h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', marginBottom: '2.5rem', lineHeight: '1.7' }}>
              A verification link was dispatched to your inbox. Please click the link in your email to verify your account.
            </p>
            {isAuthenticated && (
              <button
                onClick={() => resendVerification()}
                disabled={isResending || isResent}
                className="btn-primary"
              >
                <Mail size={16} />
                {isResent ? 'Verification Link Sent!' : isResending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
