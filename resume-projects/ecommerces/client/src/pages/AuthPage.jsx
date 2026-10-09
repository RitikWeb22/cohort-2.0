import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, ShieldCheck, Feather, CheckCircle, ArrowRight } from 'lucide-react';
import { setCredentials } from '../store/slices/authSlice.js';
import { setToast } from '../store/slices/uiSlice.js';
import { useLoginMutation, useRegisterMutation, useForgotPasswordMutation } from '../services/api.js';

export const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const isRegisterInitial = location.pathname.includes('register');
  const [isLoginMode, setIsLoginMode] = useState(!isRegisterInitial);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotSentMessage, setForgotSentMessage] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loginMutation, { isLoading: isLoginLoading }] = useLoginMutation();
  const [registerMutation, { isLoading: isRegisterLoading }] = useRegisterMutation();
  const [forgotPasswordMutation, { isLoading: isForgotLoading }] = useForgotPasswordMutation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setIsLoginMode(!location.pathname.includes('register'));
  }, [location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLoginMode) {
        const res = await loginMutation({ email, password }).unwrap();
        dispatch(setCredentials({ user: res.data.user, accessToken: res.data.accessToken }));
        dispatch(setToast({ message: `Welcome back to KORA, ${res.data.user.name}!`, type: 'success' }));
        navigate('/');
      } else {
        const res = await registerMutation({ name, email, password }).unwrap();
        dispatch(setCredentials({ user: res.data.user, accessToken: res.data.accessToken }));
        dispatch(setToast({ message: 'Account created! Welcome to KORA.', type: 'success' }));
        navigate('/');
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

  return (
    <div style={{
      minHeight: 'calc(100vh - var(--header-height))',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '920px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--sand)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexWrap: 'wrap',
        overflow: 'hidden',
        minHeight: '600px',
      }}>
        {/* LEFT COLUMN: Editorial Image Showcase */}
        <div style={{
          flex: '1 1 380px',
          position: 'relative',
          backgroundColor: '#121110',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '2.5rem',
          color: '#FFFFFF',
          minHeight: '340px',
        }}>
          <img
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85"
            alt="KORA Natural Linen Campaign Visual"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              filter: 'brightness(0.65) contrast(1.05)',
            }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(18, 17, 16, 0.25) 0%, rgba(18, 17, 16, 0.88) 100%)',
            pointerEvents: 'none',
          }} />

          {/* Top Brand Logo */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link to="/" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FFFFFF' }}>
              KORA
            </Link>
            <span style={{
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 700,
              backgroundColor: 'var(--accent)',
              color: '#FFFFFF',
              padding: '0.25rem 0.65rem',
              borderRadius: '2px',
            }}>
              CLIENT CIRCLE
            </span>
          </div>

          {/* Bottom Narrative */}
          <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto', paddingTop: '3.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#FFFFFF', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
              <Feather size={14} color="var(--accent)" />
              <span>Conscious Luxury · Slow Fashion</span>
            </div>

            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2rem',
              color: '#FFFFFF',
              lineHeight: 1.2,
              marginBottom: '0.8rem',
            }}>
              {isLoginMode ? 'Welcome Back to KORA' : 'Join the KORA Circle'}
            </h2>

            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6, marginBottom: '1.2rem' }}>
              Experience pure Belgian linen tailoring, handcrafted natural textures, and timeless slow-fashion capsules.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.78rem', color: '#FFFFFF', borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '1rem' }}>
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

        {/* RIGHT COLUMN: The Form */}
        <div style={{
          flex: '1 1 420px',
          padding: '3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: 'var(--surface)',
        }}>
          <div>
            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--sand)', marginBottom: '2rem' }}>
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(true);
                  navigate('/login');
                }}
                style={{
                  flex: 1,
                  paddingBottom: '0.9rem',
                  fontSize: '0.85rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: isLoginMode ? 600 : 400,
                  color: isLoginMode ? 'var(--ink)' : 'var(--ink-muted)',
                  borderBottom: isLoginMode ? '2px solid var(--ink)' : 'none',
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(false);
                  navigate('/register');
                }}
                style={{
                  flex: 1,
                  paddingBottom: '0.9rem',
                  fontSize: '0.85rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: !isLoginMode ? 600 : 400,
                  color: !isLoginMode ? 'var(--ink)' : 'var(--ink-muted)',
                  borderBottom: !isLoginMode ? '2px solid var(--ink)' : 'none',
                  cursor: 'pointer',
                }}
              >
                Create Account
              </button>
            </div>

            {/* Title Header */}
            <div style={{ marginBottom: '1.8rem' }}>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>
                {isForgotPasswordMode ? 'Reset Your Password' : isLoginMode ? 'Sign In to Your Account' : 'Create Your Profile'}
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                {isForgotPasswordMode
                  ? 'Enter your registered email address to receive a secure password reset link.'
                  : isLoginMode
                  ? 'Enter your registered credentials to access your saved pieces and orders'
                  : 'Enter your details below to become a registered KORA client'}
              </p>
            </div>

            {/* Forgot Password Flow */}
            {isForgotPasswordMode ? (
              <div>
                {forgotSentMessage ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <CheckCircle size={40} style={{ color: '#059669', margin: '0 auto 1rem auto' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Reset Link Dispatched
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                      {forgotSentMessage}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPasswordMode(false);
                        setForgotSentMessage('');
                      }}
                      className="btn-secondary"
                      style={{ width: '100%', padding: '0.8rem' }}
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 500 }}>
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
                      disabled={isForgotLoading}
                      className="btn-primary"
                      style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem' }}
                    >
                      {isForgotLoading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPasswordMode(false);
                        setForgotSentMessage('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        marginTop: '0.5rem',
                      }}
                    >
                      ← Back to Sign In
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* Regular Login / Register Form */
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {!isLoginMode && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 500 }}>
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
                  <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 500 }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
                      Password
                    </label>
                    {isLoginMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPasswordMode(true);
                          setForgotSentMessage('');
                        }}
                        style={{ fontSize: '0.75rem', color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 600 }}
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
                        background: 'none',
                        border: 'none',
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
                  style={{ width: '100%', marginTop: '0.8rem', padding: '1rem' }}
                  disabled={isLoginLoading || isRegisterLoading}
                >
                  {isLoginLoading || isRegisterLoading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>{isLoginMode ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer Security & Switch */}
          <div style={{ borderTop: '1px solid var(--sand)', paddingTop: '1.5rem', marginTop: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '0.8rem' }}>
              {isLoginMode ? (
                <>
                  New to KORA?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginMode(false);
                      navigate('/register');
                    }}
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
                    onClick={() => {
                      setIsLoginMode(true);
                      navigate('/login');
                    }}
                    style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--ink-subtle)' }}>
              <ShieldCheck size={14} color="var(--status-success)" />
              <span>256-Bit SSL Encrypted & Secure Authentication</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
