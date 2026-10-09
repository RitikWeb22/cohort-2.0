import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff, ShieldCheck, CheckCircle } from 'lucide-react';
import { setToast } from '../store/slices/uiSlice.js';
import { useResetPasswordMutation } from '../services/api.js';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [resetPasswordMutation, { isLoading }] = useResetPasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      dispatch(setToast({ message: 'Invalid or missing password reset token.', type: 'error' }));
      return;
    }

    if (password.length < 6) {
      dispatch(setToast({ message: 'Password must be at least 6 characters long.', type: 'error' }));
      return;
    }

    if (password !== confirmPassword) {
      dispatch(setToast({ message: 'Passwords do not match.', type: 'error' }));
      return;
    }

    try {
      const res = await resetPasswordMutation({ token, password }).unwrap();
      setIsSuccess(true);
      dispatch(setToast({ message: res.data?.message || 'Password successfully reset!', type: 'success' }));
    } catch (err) {
      dispatch(
        setToast({
          message: err.data?.message || 'Failed to reset password. Link may be expired.',
          type: 'error',
        })
      );
    }
  };

  return (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '6rem', maxWidth: '480px' }}>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--sand)',
          borderRadius: '4px',
          padding: '2.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2rem',
              letterSpacing: '0.15em',
              fontWeight: 600,
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            KORA
          </span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--ink)' }}>
            Reset Password
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginTop: '0.3rem' }}>
            Set a new secure password for your KORA account
          </p>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle size={48} style={{ color: '#059669', margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Password Reset Complete!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '1.5rem' }}>
              Your account password has been updated. You can now log in with your new credentials.
            </p>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="btn-primary"
              style={{ width: '100%', padding: '0.8rem' }}
            >
              Sign In to Your Account
            </button>
          </div>
        ) : !token ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ fontSize: '0.9rem', color: '#DC2626', marginBottom: '1.5rem' }}>
              Invalid or missing password reset link. Please request a new link from the login page.
            </p>
            <Link to="/auth" className="btn-secondary" style={{ display: 'inline-block', padding: '0.7rem 1.5rem' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="At least 6 characters"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.8rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--ink-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="Re-enter your new password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem' }}
            >
              {isLoading ? 'Updating Password...' : 'Save New Password'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <Link to="/auth" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>
                ← Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
