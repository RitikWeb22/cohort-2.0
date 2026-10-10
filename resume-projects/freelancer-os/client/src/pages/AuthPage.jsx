import React, { useState, useEffect, useId } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Logo } from '../components/common/Logo';

// Google G logo SVG
function GoogleIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

// Calculate password strength score (0 to 4)
function calculatePasswordStrength(pass) {
  if (!pass) return { score: 0, label: '' };
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (pass.length >= 12) score += 1;
  if (/[0-9]/.test(pass) && /[a-zA-Z]/.test(pass)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pass)) score += 1;

  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] };
}

export function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register, isLoading } = useAuthStore();

  const isSignupRoute = location.pathname === '/signup';
  const [isRegister, setIsRegister] = useState(isSignupRoute);

  // Form Fields
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Inline Validation Errors
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSuccessSubmitting, setIsSuccessSubmitting] = useState(false);

  // Dynamic Page Title
  useEffect(() => {
    document.title = isRegister ? 'Floorly: Create account' : 'Floorly: Sign in';
  }, [isRegister]);

  // Sync initial tab when URL changes
  useEffect(() => {
    setIsRegister(location.pathname === '/signup');
    setFormError('');
    setEmailError('');
    setPasswordError('');
    setNameError('');
  }, [location.pathname]);

  const switchTab = (toRegister) => {
    setIsRegister(toRegister);
    setFormError('');
    setEmailError('');
    setPasswordError('');
    setNameError('');
  };

  const validateEmail = (val) => {
    const trimmed = val.trim();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
      return 'Enter a valid email address';
    }
    return '';
  };

  const validatePassword = (val) => {
    if (!val || val.length < 8) {
      return 'Password must be at least 8 characters';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    let nameErr = '';

    if (isRegister && !name.trim()) {
      nameErr = 'Enter your full name';
    }

    setEmailError(emailErr);
    setPasswordError(passErr);
    setNameError(nameErr);

    if (emailErr || passErr || nameErr) {
      return;
    }

    try {
      setIsSuccessSubmitting(true);
      if (isRegister) {
        await register({
          name: name.trim(),
          businessName: businessName.trim(),
          email: email.trim(),
          password,
        });
      } else {
        await login(email.trim(), password);
      }
      const destination = location.state?.from?.pathname
        ? `${location.state.from.pathname}${location.state.from.search || ''}${location.state.from.hash || ''}`
        : (new URLSearchParams(location.search).get('returnTo') || '/dashboard');
      navigate(destination, { replace: true });
    } catch (err) {
      setIsSuccessSubmitting(false);
      if (!isRegister) {
        setFormError('Incorrect email or password. Try again or reset your password.');
      } else {
        setFormError(err.message || 'Unable to create account. Please try again.');
      }
    }
  };

  // Accessible tab keyboard navigation
  const handleTabKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      switchTab(!isRegister);
    }
  };

  const { score: strengthScore, label: strengthLabel } = calculatePasswordStrength(password);

  return (
    <div
      className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row"
      style={{ backgroundColor: 'var(--page, #FAF5EA)', color: 'var(--ink, #0E1A2B)' }}
    >
      {/* =========================================================================
          LEFT PANEL (Desktop >= 1024px: 45% width, Cobalt background)
          ========================================================================= */}
      <section
        className="hidden lg:flex lg:w-[45%] h-full flex-col justify-between p-10 xl:p-14 select-none relative overflow-hidden"
        style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
        aria-label="Floorly introduction"
      >
        {/* Top Logo in White */}
        <div className="z-10">
          <Link to="/" aria-label="Floorly Home" tabIndex={0} className="inline-block rounded-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0047AB] outline-none">
            <Logo variant="white" size="lg" />
          </Link>
        </div>

        {/* Hero Headline & Floor Demo Illustration */}
        <div className="my-auto py-8 z-10 max-w-lg">
          <h1
            className="text-white font-extrabold tracking-tight leading-[1.12]"
            style={{
              fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
              fontSize: '44px',
              letterSpacing: '-0.03em',
            }}
          >
            Never undercharge again.
          </h1>

          <p
            className="text-white/90 text-[17px] leading-relaxed mt-4 font-normal"
            style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}
          >
            Paste a client brief. Get a proposal that can't drop below your floor.
          </p>

          {/* Compact Floor Demo Illustration (purely decorative, aria-hidden) */}
          <div
            className="mt-8 rounded-2xl p-5 border border-white/20"
            style={{ backgroundColor: '#003A8C' }}
            aria-hidden="true"
          >
            <div className="flex items-center justify-between text-xs text-white/70 mb-3 font-medium">
              <span>Client Brief Request</span>
              <span className="text-[#FFC72C] font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FFC72C] inline-block" />
                Floor Protection Active
              </span>
            </div>

            {/* Visual Two-Bar Comparison with Yellow Dashed Floor Line */}
            <div className="relative pt-6 pb-2">
              {/* Yellow Dashed Floor Line */}
              <div className="absolute top-[52px] left-0 right-0 z-10 flex items-center">
                <div
                  className="w-full border-t-2 border-dashed"
                  style={{ borderColor: 'var(--sun, #FFC72C)' }}
                />
                <span
                  className="absolute right-0 -top-2.5 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider text-[#0E1A2B]"
                  style={{ backgroundColor: 'var(--sun, #FFC72C)' }}
                >
                  Your Floor: $2,500
                </span>
              </div>

              {/* Two Bars */}
              <div className="grid grid-cols-2 gap-4 items-end h-[120px] pt-4">
                {/* Bar 1: Client Underbid (Blocked) */}
                <div className="flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full rounded-t-lg flex flex-col justify-between p-2 text-center border border-white/10"
                    style={{ height: '48px', backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
                  >
                    <span className="text-[11px] text-white/60 font-medium">Client Budget</span>
                    <span className="text-xs font-bold text-white/80 line-through decoration-rose-300">$1,800</span>
                  </div>
                  <span className="text-[10px] text-rose-200 mt-1.5 font-medium">Under Floor (Blocked)</span>
                </div>

                {/* Bar 2: Floorly Protected Proposal */}
                <div className="flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full rounded-t-lg flex flex-col justify-between p-2 text-center shadow-md border border-[#FFC72C]/40"
                    style={{ height: '96px', backgroundColor: '#FFFFFF', color: '#0047AB' }}
                  >
                    <span className="text-[10px] text-[#0047AB]/70 font-semibold uppercase tracking-wider">Floorly Quote</span>
                    <span className="text-sm font-extrabold text-[#0047AB]">$2,850</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 mt-1.5 font-semibold">Protected & Profitable</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Tagline / Micro-note */}
        <div className="text-xs text-white/60 font-medium z-10">
          Deterministic floor safeguards · Instant AI proposals · Zero underpricing
        </div>
      </section>

      {/* =========================================================================
          RIGHT PANEL (Desktop: 55% width, Mobile: 100%, --page background)
          ========================================================================= */}
      <main
        className="flex-1 h-full overflow-y-auto flex flex-col justify-between items-center px-4 py-8 sm:px-8 sm:py-12"
        style={{ backgroundColor: 'var(--page, #FAF5EA)' }}
      >
        {/* Mobile Header Logo */}
        <div className="w-full max-w-[440px] flex justify-center lg:hidden mb-6">
          <Link to="/" aria-label="Floorly Home" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB]">
            <Logo size="md" />
          </Link>
        </div>

        {/* Form Card Container */}
        <div className="w-full max-w-[440px] my-auto">
          <div
            className="rounded-2xl border p-6 sm:p-8"
            style={{
              backgroundColor: 'var(--surface, #FFFFFF)',
              borderColor: 'var(--line, #E8E0CF)',
            }}
          >
            {/* Header Tabs Segmented Control (role="tablist") */}
            <div
              role="tablist"
              aria-label="Authentication Options"
              onKeyDown={handleTabKeyDown}
              className="flex border-b mb-6 relative"
              style={{ borderColor: 'var(--line, #E8E0CF)' }}
            >
              <button
                type="button"
                role="tab"
                id="tab-signin"
                aria-selected={!isRegister}
                aria-controls="panel-signin"
                tabIndex={!isRegister ? 0 : -1}
                onClick={() => switchTab(false)}
                className="flex-1 pb-3 text-center text-[16px] font-semibold transition-colors duration-150 relative outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:ring-offset-2 rounded-t-md"
                style={{
                  color: !isRegister ? 'var(--cobalt, #0047AB)' : 'var(--muted, #5B6676)',
                }}
              >
                Sign in
                {!isRegister && (
                  <span
                    className="absolute bottom-[-1.5px] left-0 right-0 h-[3px] rounded-full"
                    style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                  />
                )}
              </button>

              <button
                type="button"
                role="tab"
                id="tab-register"
                aria-selected={isRegister}
                aria-controls="panel-register"
                tabIndex={isRegister ? 0 : -1}
                onClick={() => switchTab(true)}
                className="flex-1 pb-3 text-center text-[16px] font-semibold transition-colors duration-150 relative outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:ring-offset-2 rounded-t-md"
                style={{
                  color: isRegister ? 'var(--cobalt, #0047AB)' : 'var(--muted, #5B6676)',
                }}
              >
                Create account
                {isRegister && (
                  <span
                    className="absolute bottom-[-1.5px] left-0 right-0 h-[3px] rounded-full"
                    style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                  />
                )}
              </button>
            </div>

            {/* Form-level Error Alert (Never reveals email existence) */}
            {formError && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-4 p-3 rounded-xl text-sm leading-relaxed border"
                style={{
                  backgroundColor: '#FEF3F2',
                  borderColor: '#FECDCA',
                  color: 'var(--error, #B42318)',
                }}
              >
                {formError}
              </div>
            )}

            {/* =============================================================
                SIGN IN FORM
                ============================================================= */}
            {!isRegister ? (
              <form
                id="panel-signin"
                role="tabpanel"
                aria-labelledby="tab-signin"
                onSubmit={handleSubmit}
                noValidate
                className="space-y-4"
              >
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="signin-email"
                    className="block text-sm font-semibold mb-1.5"
                    style={{ color: 'var(--ink, #0E1A2B)' }}
                  >
                    Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                      if (formError) setFormError('');
                    }}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'signin-email-error' : undefined}
                    className="w-full px-3.5 py-2.5 text-[16px] rounded-xl border transition-colors outline-none focus:border-[#0047AB] focus:ring-[3px] focus:ring-[#0047AB]/20"
                    style={{
                      borderColor: emailError ? 'var(--error, #B42318)' : 'var(--line, #E8E0CF)',
                      color: 'var(--ink, #0E1A2B)',
                      backgroundColor: 'var(--surface, #FFFFFF)',
                    }}
                  />
                  {emailError && (
                    <p
                      id="signin-email-error"
                      className="text-xs font-medium mt-1.5"
                      style={{ color: 'var(--error, #B42318)' }}
                    >
                      {emailError}
                    </p>
                  )}
                </div>

                {/* Password Field + Forgot Link */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="signin-password"
                      className="block text-sm font-semibold"
                      style={{ color: 'var(--ink, #0E1A2B)' }}
                    >
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold hover:underline outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] rounded"
                      style={{ color: 'var(--cobalt, #0047AB)' }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                        if (formError) setFormError('');
                      }}
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? 'signin-password-error' : undefined}
                      className="w-full px-3.5 py-2.5 pr-10 text-[16px] rounded-xl border transition-colors outline-none focus:border-[#0047AB] focus:ring-[3px] focus:ring-[#0047AB]/20"
                      style={{
                        borderColor: passwordError ? 'var(--error, #B42318)' : 'var(--line, #E8E0CF)',
                        color: 'var(--ink, #0E1A2B)',
                        backgroundColor: 'var(--surface, #FFFFFF)',
                      }}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#5B6676] hover:text-[#0E1A2B] rounded outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p
                      id="signin-password-error"
                      className="text-xs font-medium mt-1.5"
                      style={{ color: 'var(--error, #B42318)' }}
                    >
                      {passwordError}
                    </p>
                  )}
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading || isSuccessSubmitting}
                  className="w-full py-3 px-5 rounded-full text-[16px] font-semibold text-white transition-colors duration-150 flex items-center justify-center gap-2 outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--cobalt, #0047AB)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cobalt-dark, #003A8C)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--cobalt, #0047AB)'; }}
                >
                  {isLoading || isSuccessSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing you in...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>

                {/* Divider "or" */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="w-full border-t" style={{ borderColor: 'var(--line, #E8E0CF)' }} />
                  <span
                    className="absolute px-3 text-xs uppercase tracking-wider font-semibold"
                    style={{ backgroundColor: 'var(--surface, #FFFFFF)', color: 'var(--muted, #5B6676)' }}
                  >
                    or
                  </span>
                </div>

                {/* Continue with Google (Secondary Button) */}
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="w-full py-2.5 px-4 rounded-full text-[15px] font-semibold border flex items-center justify-center gap-2.5 transition-colors cursor-not-allowed opacity-80"
                  style={{
                    backgroundColor: 'var(--surface, #FFFFFF)',
                    borderColor: 'var(--line, #E8E0CF)',
                    color: 'var(--ink, #0E1A2B)',
                  }}
                >
                  <GoogleIcon className="w-4 h-4" />
                  <span>Continue with Google</span>
                  <span className="text-[11px] font-normal px-1.5 py-0.2 rounded text-[#5B6676] bg-[#FAF5EA] border border-[#E8E0CF]">
                    Coming soon
                  </span>
                </button>

                {/* Footer Switch Tab */}
                <div className="pt-2 text-center text-sm" style={{ color: 'var(--muted, #5B6676)' }}>
                  New to Floorly?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab(true)}
                    className="font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] rounded"
                    style={{ color: 'var(--cobalt, #0047AB)' }}
                  >
                    Create an account
                  </button>
                </div>
              </form>
            ) : (
              /* =============================================================
                 CREATE ACCOUNT FORM (Compact to fit 1366x768 without scroll)
                 ============================================================= */
              <form
                id="panel-register"
                role="tabpanel"
                aria-labelledby="tab-register"
                onSubmit={handleSubmit}
                noValidate
                className="space-y-3"
              >
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="register-name"
                    className="block text-xs font-semibold mb-1"
                    style={{ color: 'var(--ink, #0E1A2B)' }}
                  >
                    Full name
                  </label>
                  <input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Alex Morgan"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError('');
                      if (formError) setFormError('');
                    }}
                    aria-invalid={!!nameError}
                    aria-describedby={nameError ? 'register-name-error' : undefined}
                    className="w-full px-3 py-2 text-[16px] rounded-xl border transition-colors outline-none focus:border-[#0047AB] focus:ring-[3px] focus:ring-[#0047AB]/20"
                    style={{
                      borderColor: nameError ? 'var(--error, #B42318)' : 'var(--line, #E8E0CF)',
                      color: 'var(--ink, #0E1A2B)',
                      backgroundColor: 'var(--surface, #FFFFFF)',
                    }}
                  />
                  {nameError && (
                    <p
                      id="register-name-error"
                      className="text-xs font-medium mt-1"
                      style={{ color: 'var(--error, #B42318)' }}
                    >
                      {nameError}
                    </p>
                  )}
                </div>

                {/* Business Name (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="register-business"
                      className="block text-xs font-semibold"
                      style={{ color: 'var(--ink, #0E1A2B)' }}
                    >
                      Business name
                    </label>
                    <span className="text-[11px]" style={{ color: 'var(--muted, #5B6676)' }}>
                      Optional
                    </span>
                  </div>
                  <input
                    id="register-business"
                    type="text"
                    autoComplete="organization"
                    placeholder="Apex Studio"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    aria-describedby="register-business-helper"
                    className="w-full px-3 py-2 text-[16px] rounded-xl border transition-colors outline-none focus:border-[#0047AB] focus:ring-[3px] focus:ring-[#0047AB]/20"
                    style={{
                      borderColor: 'var(--line, #E8E0CF)',
                      color: 'var(--ink, #0E1A2B)',
                      backgroundColor: 'var(--surface, #FFFFFF)',
                    }}
                  />
                  <p id="register-business-helper" className="text-[11px] mt-1" style={{ color: 'var(--muted, #5B6676)' }}>
                    Shown on your proposals and invoices
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="register-email"
                    className="block text-xs font-semibold mb-1"
                    style={{ color: 'var(--ink, #0E1A2B)' }}
                  >
                    Email
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                      if (formError) setFormError('');
                    }}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'register-email-error' : undefined}
                    className="w-full px-3 py-2 text-[16px] rounded-xl border transition-colors outline-none focus:border-[#0047AB] focus:ring-[3px] focus:ring-[#0047AB]/20"
                    style={{
                      borderColor: emailError ? 'var(--error, #B42318)' : 'var(--line, #E8E0CF)',
                      color: 'var(--ink, #0E1A2B)',
                      backgroundColor: 'var(--surface, #FFFFFF)',
                    }}
                  />
                  {emailError && (
                    <p
                      id="register-email-error"
                      className="text-xs font-medium mt-1"
                      style={{ color: 'var(--error, #B42318)' }}
                    >
                      {emailError}
                    </p>
                  )}
                </div>

                {/* Password with Strength Meter */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="register-password"
                      className="block text-xs font-semibold"
                      style={{ color: 'var(--ink, #0E1A2B)' }}
                    >
                      Password
                    </label>
                    <span id="password-hint" className="text-[11px]" style={{ color: 'var(--muted, #5B6676)' }}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                        if (formError) setFormError('');
                      }}
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? 'register-password-error password-hint' : 'password-hint'}
                      className="w-full px-3 py-2 pr-10 text-[16px] rounded-xl border transition-colors outline-none focus:border-[#0047AB] focus:ring-[3px] focus:ring-[#0047AB]/20"
                      style={{
                        borderColor: passwordError ? 'var(--error, #B42318)' : 'var(--line, #E8E0CF)',
                        color: 'var(--ink, #0E1A2B)',
                        backgroundColor: 'var(--surface, #FFFFFF)',
                      }}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#5B6676] hover:text-[#0E1A2B] rounded outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* 4-Segment Strength Meter */}
                  {password.length > 0 && (
                    <div className="mt-2" aria-live="polite">
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        <div
                          className="rounded-full transition-colors duration-150"
                          style={{
                            backgroundColor:
                              strengthScore >= 1
                                ? strengthScore === 1
                                  ? 'var(--error, #B42318)'
                                  : strengthScore === 2
                                  ? 'var(--sun, #FFC72C)'
                                  : strengthScore === 3
                                  ? 'var(--cobalt, #0047AB)'
                                  : 'var(--success, #067647)'
                                : '#E8E0CF',
                          }}
                        />
                        <div
                          className="rounded-full transition-colors duration-150"
                          style={{
                            backgroundColor:
                              strengthScore >= 2
                                ? strengthScore === 2
                                  ? 'var(--sun, #FFC72C)'
                                  : strengthScore === 3
                                  ? 'var(--cobalt, #0047AB)'
                                  : 'var(--success, #067647)'
                                : '#E8E0CF',
                          }}
                        />
                        <div
                          className="rounded-full transition-colors duration-150"
                          style={{
                            backgroundColor:
                              strengthScore >= 3
                                ? strengthScore === 3
                                  ? 'var(--cobalt, #0047AB)'
                                  : 'var(--success, #067647)'
                                : '#E8E0CF',
                          }}
                        />
                        <div
                          className="rounded-full transition-colors duration-150"
                          style={{
                            backgroundColor: strengthScore >= 4 ? 'var(--success, #067647)' : '#E8E0CF',
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] mt-1 text-[#5B6676]">
                        <span>Strength: {strengthLabel}</span>
                        {strengthScore >= 3 && <span className="text-[#067647] font-semibold">Ready to go</span>}
                      </div>
                    </div>
                  )}

                  {passwordError && (
                    <p
                      id="register-password-error"
                      className="text-xs font-medium mt-1"
                      style={{ color: 'var(--error, #B42318)' }}
                    >
                      {passwordError}
                    </p>
                  )}
                </div>

                {/* Terms Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
                    <input
                      id="terms-checkbox"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#0047AB] focus:ring-[#0047AB] border-[#E8E0CF] cursor-pointer"
                    />
                    <span className="leading-tight" style={{ color: 'var(--muted, #5B6676)' }}>
                      I agree to the{' '}
                      <Link
                        to="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline underline-offset-2 hover:text-[#0E1A2B]"
                        style={{ color: 'var(--ink, #0E1A2B)' }}
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        to="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline underline-offset-2 hover:text-[#0E1A2B]"
                        style={{ color: 'var(--ink, #0E1A2B)' }}
                      >
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                </div>

                {/* Primary Create Account Button */}
                <button
                  type="submit"
                  disabled={isLoading || isSuccessSubmitting || !agreeTerms}
                  className="w-full py-2.5 px-5 rounded-full text-[16px] font-semibold text-white transition-colors duration-150 flex items-center justify-center gap-2 outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    backgroundColor: 'var(--cobalt, #0047AB)',
                  }}
                  onMouseEnter={(e) => {
                    if (agreeTerms && !isLoading) e.currentTarget.style.backgroundColor = 'var(--cobalt-dark, #003A8C)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--cobalt, #0047AB)';
                  }}
                >
                  {isLoading || isSuccessSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <span>Create account</span>
                  )}
                </button>

                {/* Helper subtext */}
                <p className="text-[11px] text-center" style={{ color: 'var(--muted, #5B6676)' }}>
                  Free plan includes 2 active clients. No credit card.
                </p>

                {/* Divider "or" */}
                <div className="relative my-2 flex items-center justify-center">
                  <div className="w-full border-t" style={{ borderColor: 'var(--line, #E8E0CF)' }} />
                  <span
                    className="absolute px-3 text-[10px] uppercase tracking-wider font-semibold"
                    style={{ backgroundColor: 'var(--surface, #FFFFFF)', color: 'var(--muted, #5B6676)' }}
                  >
                    or
                  </span>
                </div>

                {/* Google Button */}
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="w-full py-2 px-4 rounded-full text-[14px] font-semibold border flex items-center justify-center gap-2 transition-colors cursor-not-allowed opacity-80"
                  style={{
                    backgroundColor: 'var(--surface, #FFFFFF)',
                    borderColor: 'var(--line, #E8E0CF)',
                    color: 'var(--ink, #0E1A2B)',
                  }}
                >
                  <GoogleIcon className="w-3.5 h-3.5" />
                  <span>Continue with Google</span>
                  <span className="text-[10px] font-normal px-1.5 py-0.2 rounded text-[#5B6676] bg-[#FAF5EA] border border-[#E8E0CF]">
                    Coming soon
                  </span>
                </button>

                {/* Footer Switch Tab */}
                <div className="pt-1 text-center text-xs" style={{ color: 'var(--muted, #5B6676)' }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab(false)}
                    className="font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] rounded"
                    style={{ color: 'var(--cobalt, #0047AB)' }}
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer under card: Terms · Privacy · Contact and Copyright */}
        <footer className="w-full max-w-[440px] text-center text-xs py-4 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ color: 'var(--muted, #5B6676)' }}>
          <div className="flex items-center gap-3">
            <Link to="/terms" className="hover:underline hover:text-[#0E1A2B]">Terms</Link>
            <span>·</span>
            <Link to="/privacy" className="hover:underline hover:text-[#0E1A2B]">Privacy</Link>
            <span>·</span>
            <Link to="/contact" className="hover:underline hover:text-[#0E1A2B]">Contact</Link>
          </div>
          <div>© 2026 Floorly</div>
        </footer>
      </main>
    </div>
  );
}
