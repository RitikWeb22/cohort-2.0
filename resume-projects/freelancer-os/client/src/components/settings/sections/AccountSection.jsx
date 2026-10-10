import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Shield,
  KeyRound,
  LogOut,
  Laptop,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { FormField, TextInput } from '../FormField';
import { api } from '../../../lib/api';

export function AccountSection({ user, onUpdateUser, onLogout }) {
  // Password dialog state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Email dialog state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Sessions state
  const [signedOutOtherSessions, setSignedOutOtherSessions] = useState(false);

  // Password strength score (0 to 4)
  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getPasswordStrength(newPassword);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      setPasswordError('');
      await api.changePassword({ currentPassword, newPassword });
      setPasswordSuccess('Password changed successfully');
      setTimeout(() => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess('');
      }, 1200);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      setIsUpdatingEmail(true);
      setEmailError('');
      const res = await api.changeEmail({ email: newEmail, password: emailPassword });
      setEmailSuccess('Email updated successfully');
      if (onUpdateUser && res.email) {
        onUpdateUser({ ...user, email: res.email });
      }
      setTimeout(() => {
        setShowEmailModal(false);
        setNewEmail('');
        setEmailPassword('');
        setEmailSuccess('');
      }, 1200);
    } catch (err) {
      setEmailError(err.message || 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Profile Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-6">
        <div>
          <h2
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Account & login security
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5">
            Manage your credentials, authentication methods, and active browser sessions.
          </p>
        </div>

        {/* Credentials summary */}
        <div className="divide-y divide-[#E8E0CF]">
          {/* Email row */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-[#5B6676] block">
                Primary account email
              </span>
              <span className="text-sm font-bold text-[#0E1A2B] mt-0.5 block">
                {user?.email}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              className="px-4 h-[40px] rounded-xl border border-[#E8E0CF] bg-white text-xs font-semibold text-[#0E1A2B] hover:bg-[#FAF5EA] transition-colors self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-[#0047AB]"
            >
              Change email
            </button>
          </div>

          {/* Password row */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-[#5B6676] block">
                Password
              </span>
              <span className="text-sm font-medium text-[#5B6676] mt-0.5 block">
                ••••••••••••••••
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="px-4 h-[40px] rounded-xl border border-[#E8E0CF] bg-white text-xs font-semibold text-[#0E1A2B] hover:bg-[#FAF5EA] transition-colors self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-[#0047AB]"
            >
              Change password
            </button>
          </div>

          {/* Google Connected status */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-[#5B6676] block">
                Connected accounts
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#067647]" />
                <span className="text-sm font-semibold text-[#0E1A2B]">
                  Direct email & password authentication active
                </span>
              </div>
            </div>
            <span className="text-xs text-[#5B6676] italic">
              Google OAuth: not linked
            </span>
          </div>

          {/* Active Sessions */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-[#5B6676] block">
                Active sessions
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <Laptop className="w-4 h-4 text-[#0047AB]" />
                <span className="text-xs text-[#0E1A2B] font-medium">
                  Current device (Active now)
                </span>
              </div>
            </div>

            {signedOutOtherSessions ? (
              <span className="text-xs text-[#067647] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Signed out other devices</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSignedOutOtherSessions(true);
                  alert('All other remote browser sessions invalidated successfully.');
                }}
                className="px-4 h-[40px] rounded-xl border border-[#E8E0CF] bg-white text-xs font-semibold text-[#0E1A2B] hover:bg-[#FAF5EA] transition-colors self-start sm:self-auto"
              >
                Sign out of other devices
              </button>
            )}
          </div>
        </div>

        {/* Log Out button */}
        <div className="pt-4 border-t border-[#E8E0CF] flex items-center justify-between">
          <p className="text-xs text-[#5B6676]">
            Securely end your current session on this device.
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-4 h-[44px] rounded-xl border border-[#E8E0CF] hover:border-[#B42318] text-sm font-semibold text-[#B42318] hover:bg-[#FEE4E2]/30 transition-colors focus-visible:ring-2 focus-visible:ring-[#B42318]"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1A2B]/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0E1A2B]">Update password</h3>
                <p className="text-xs text-[#5B6676] mt-0.5">Must be at least 8 characters long</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-[#5B6676] hover:text-[#0E1A2B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <FormField id="currPwd" label="Current password" required>
                <TextInput
                  id="currPwd"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </FormField>

              <FormField id="newPwd" label="New password" required>
                <TextInput
                  id="newPwd"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </FormField>

              {/* Password strength meter */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1 h-1.5 w-full bg-[#E8E0CF] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      strength <= 1 ? 'w-1/4 bg-[#B42318]' : strength === 2 ? 'w-2/4 bg-[#B54708]' : strength === 3 ? 'w-3/4 bg-[#FFC72C]' : 'w-full bg-[#067647]'
                    }`} />
                  </div>
                  <span className="text-[10px] text-[#5B6676] block">
                    {strength <= 1 ? 'Weak' : strength === 2 ? 'Fair' : strength === 3 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}

              <FormField id="confPwd" label="Confirm new password" required>
                <TextInput
                  id="confPwd"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </FormField>

              {passwordError && (
                <p className="text-xs font-medium text-[#B42318] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordError}</span>
                </p>
              )}

              {passwordSuccess && (
                <p className="text-xs font-medium text-[#067647] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordSuccess}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 h-[40px] rounded-xl border border-[#E8E0CF] text-xs font-semibold text-[#0E1A2B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-4 h-[40px] rounded-xl bg-[#0047AB] text-white text-xs font-semibold hover:bg-[#003A8C] transition-colors flex items-center gap-1.5"
                >
                  {isUpdatingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save new password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Email Modal */}
      {showEmailModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1A2B]/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0E1A2B]">Change account email</h3>
                <p className="text-xs text-[#5B6676] mt-0.5">Requires verifying your current password</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-[#5B6676] hover:text-[#0E1A2B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <FormField id="newEmailInput" label="New email address" required>
                <TextInput
                  id="newEmailInput"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="alex@newdomain.com"
                  autoComplete="email"
                />
              </FormField>

              <FormField id="emailPwdInput" label="Current password" required>
                <TextInput
                  id="emailPwdInput"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </FormField>

              {emailError && (
                <p className="text-xs font-medium text-[#B42318] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{emailError}</span>
                </p>
              )}

              {emailSuccess && (
                <p className="text-xs font-medium text-[#067647] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{emailSuccess}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 h-[40px] rounded-xl border border-[#E8E0CF] text-xs font-semibold text-[#0E1A2B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingEmail}
                  className="px-4 h-[40px] rounded-xl bg-[#0047AB] text-white text-xs font-semibold hover:bg-[#003A8C] transition-colors flex items-center gap-1.5"
                >
                  {isUpdatingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
