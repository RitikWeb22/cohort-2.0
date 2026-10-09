import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X, Eye, EyeOff, ShieldCheck, Feather, CheckCircle, ArrowRight } from 'lucide-react';
import { closeAuthModal, openAuthModal, setToast } from '../../store/slices/uiSlice.js';
import { setCredentials } from '../../store/slices/authSlice.js';
import { useLoginMutation, useRegisterMutation, useForgotPasswordMutation } from '../../services/api.js';

export const AuthModal = () => {
  const dispatch = useDispatch();
  const { isAuthModalOpen, authModalMode } = useSelector((state) => state.ui);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotSentMessage, setForgotSentMessage] = useState('');

  const [loginMutation, { isLoading: isLoginLoading }] = useLoginMutation();
  const [registerMutation, { isLoading: isRegisterLoading }] = useRegisterMutation();
  const [forgotPasswordMutation, { isLoading: isForgotLoading }] = useForgotPasswordMutation();

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (authModalMode === 'login') {
        const res = await loginMutation({ email, password }).unwrap();
        dispatch(setCredentials({ user: res.data.user, accessToken: res.data.accessToken }));
        dispatch(setToast({ message: `Welcome back to KORA, ${res.data.user.name}!`, type: 'success' }));
        dispatch(closeAuthModal());
      } else {
        const res = await registerMutation({ name, email, password }).unwrap();
        dispatch(setCredentials({ user: res.data.user, accessToken: res.data.accessToken }));
        dispatch(setToast({ message: 'Account created! Welcome to KORA.', type: 'success' }));
        dispatch(closeAuthModal());
      }
    } catch (err) {
      dispatch(
        setToast({
          message: err.data?.message || 'Authentication failed. Please check your credentials.',
          type: 'error',
        })
      );
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      dispatch(setToast({ message: 'Please enter your registered email address', type: 'error' }));
      return;
    }
    try {
      const res = await forgotPasswordMutation({ email }).unwrap();
      setForgotSentMessage(res.message || 'If an account exists with that email, a password reset link has been dispatched.');
      dispatch(setToast({ message: 'Password reset link sent to your email!', type: 'success' }));
    } catch (err) {
      dispatch(setToast({ message: err.data?.message || 'Failed to dispatch reset email', type: 'error' }));
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      dispatch(closeAuthModal());
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={handleOverlayClick}>
      <div className="auth-modal-dialog">
        {/* Close Button */}
        <button
          onClick={() => dispatch(closeAuthModal())}
          style={{
            position: 'absolute',
            top: '1.2rem',
            right: '1.2rem',
            zIndex: 30,
            color: 'var(--ink-muted)',
            cursor: 'pointer',
            padding: '0.3rem',
          }}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>

        {/* LEFT COLUMN: Editorial High-Fashion Natural Textile Imagery */}
        <div className="auth-image-side">
          <img
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85"
            alt="KORA Natural Linen Campaign Visual"
          />
          <div className="auth-image-overlay" />

          {/* Top Brand Logo */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              KORA
            </span>
            <span style={{
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 700,
              backgroundColor: 'var(--accent)',
              color: '#FFFFFF',
              padding: '0.2rem 0.6rem',
              borderRadius: '2px',
            }}>
              CLIENT ACCESS
            </span>
          </div>

          {/* Bottom Narrative */}
          <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto', paddingTop: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#FFFFFF', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              <Feather size={14} color="var(--accent)" />
              <span>Conscious Luxury · Slow Fashion</span>
            </div>

            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.8rem',
              color: '#FFFFFF',
              lineHeight: 1.2,
              marginBottom: '0.8rem',
            }}>
              {isForgotPasswordMode ? 'Account Recovery' : authModalMode === 'login' ? 'Welcome Back to KORA' : 'Join the KORA Circle'}
            </h3>

            <p style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6, marginBottom: '1.2rem' }}>
              Experience pure Belgian linen tailoring, handcrafted natural textures, and timeless slow-fashion capsules.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.75rem', color: '#FFFFFF', borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={13} color="var(--accent)" />
                <span>100% Pure Natural Fibres</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={13} color="var(--accent)" />
                <span>Complimentary Dispatch</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={13} color="var(--accent)" />
                <span>Artisanal Small Batches</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={13} color="var(--accent)" />
                <span>7-Day Easy Exchanges</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Premium Auth Form */}
        <div className="auth-form-side">
          <div>
            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--sand)', marginBottom: '1.8rem' }}>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordMode(false);
                  setForgotSentMessage('');
                  dispatch(openAuthModal('login'));
                }}
                style={{
                  flex: 1,
                  paddingBottom: '0.8rem',
                  fontSize: '0.85rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: !isForgotPasswordMode && authModalMode === 'login' ? 600 : 400,
                  color: !isForgotPasswordMode && authModalMode === 'login' ? 'var(--ink)' : 'var(--ink-muted)',
                  borderBottom: !isForgotPasswordMode && authModalMode === 'login' ? '2px solid var(--ink)' : 'none',
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordMode(false);
                  setForgotSentMessage('');
                  dispatch(openAuthModal('register'));
                }}
                style={{
                  flex: 1,
                  paddingBottom: '0.8rem',
                  fontSize: '0.85rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: !isForgotPasswordMode && authModalMode === 'register' ? 600 : 400,
                  color: !isForgotPasswordMode && authModalMode === 'register' ? 'var(--ink)' : 'var(--ink-muted)',
                  borderBottom: !isForgotPasswordMode && authModalMode === 'register' ? '2px solid var(--ink)' : 'none',
                  cursor: 'pointer',
                }}
              >
                Create Account
              </button>
            </div>

            {/* Title Header */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>
                {isForgotPasswordMode ? 'Reset Your Password' : authModalMode === 'login' ? 'Sign In to Your Account' : 'Create Your Profile'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                {isForgotPasswordMode
                  ? 'Enter your registered email to receive a secure password reset link'
                  : authModalMode === 'login'
                  ? 'Enter your registered credentials to access your saved items and orders'
                  : 'Enter your details below to become a registered KORA client'}
              </p>
            </div>

            {/* Forgot Password Flow */}
            {isForgotPasswordMode ? (
              <div>
                {forgotSentMessage ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <CheckCircle size={36} color="var(--status-success)" style={{ margin: '0 auto 0.8rem auto' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      Reset Link Dispatched
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                      {forgotSentMessage}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPasswordMode(false);
                        setForgotSentMessage('');
                      }}
                      className="btn-secondary"
                      style={{ width: '100%', padding: '0.8rem', fontSize: '0.82rem' }}
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 500 }}>
                        Registered Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field"
                        placeholder="name@domain.com"
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ width: '100%', marginTop: '0.4rem', padding: '0.95rem' }}
                      disabled={isForgotLoading}
                    >
                      {isForgotLoading ? 'Sending Recovery Email...' : 'Send Password Reset Link'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordMode(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--ink-muted)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        marginTop: '0.5rem',
                      }}
                    >
                      Remembered password? Back to Sign In
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* Normal Form */
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {authModalMode === 'register' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 500 }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                      placeholder="e.g. Rohan Sharma"
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 500 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="name@domain.com"
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
                      Password
                    </label>
                    {authModalMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPasswordMode(true);
                          setForgotSentMessage('');
                        }}
                        style={{ fontSize: '0.75rem', color: 'var(--accent)', cursor: 'pointer' }}
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field"
                      style={{ paddingRight: '2.5rem' }}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.8rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--ink-muted)',
                        cursor: 'pointer',
                      }}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '0.6rem', padding: '0.95rem' }}
                  disabled={isLoginLoading || isRegisterLoading}
                >
                  {isLoginLoading || isRegisterLoading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>{authModalMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer Security & Mode Switch */}
          <div style={{ borderTop: '1px solid var(--sand)', paddingTop: '1.2rem', marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginBottom: '0.6rem' }}>
              {authModalMode === 'login' ? (
                <>
                  New to KORA?{' '}
                  <button
                    type="button"
                    onClick={() => dispatch(openAuthModal('register'))}
                    style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Create Account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => dispatch(openAuthModal('login'))}
                    style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--ink-subtle)' }}>
              <ShieldCheck size={13} color="var(--status-success)" />
              <span>256-Bit SSL Encrypted & Secure Authentication</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
