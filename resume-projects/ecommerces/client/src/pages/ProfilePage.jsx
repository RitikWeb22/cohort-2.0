import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Camera,
  MapPin,
  CheckCircle,
  AlertCircle,
  Shield,
  Eye,
  EyeOff,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useAddUserAddressMutation,
} from '../services/api.js';
import { setUser } from '../store/slices/authSlice.js';
import { setToast } from '../store/slices/uiSlice.js';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300',
];

export const ProfilePage = () => {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);

  // Queries and mutations
  const { data: profileResponse, isLoading: isProfileLoading, refetch } = useGetProfileQuery();
  const [updateProfileMutation, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
  const [changePasswordMutation, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [addAddressMutation, { isLoading: isAddingAddress }] = useAddUserAddressMutation();

  const user = profileResponse?.data || authUser;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Profile info state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Address state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressData, setAddressData] = useState({
    street: '',
    apartment: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false,
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState('DETAILS'); // 'DETAILS' | 'SECURITY' | 'ADDRESSES'

  // Initialize fields when user data loads
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  // Handle avatar upload via file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      dispatch(setToast({ message: 'Please select a valid image file (JPEG, PNG, WebP).', type: 'error' }));
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      dispatch(setToast({ message: 'Image size should be less than 2.5MB.', type: 'warning' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result;
      if (base64) {
        setAvatar(base64);
        dispatch(setToast({ message: 'Profile picture preview updated. Click "Save Changes" to apply.', type: 'info' }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit profile details
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      dispatch(setToast({ message: 'Name cannot be empty.', type: 'error' }));
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        avatar: avatar || '',
      };

      if (email.trim() && email.trim().toLowerCase() !== user?.email?.toLowerCase()) {
        payload.email = email.trim().toLowerCase();
      }

      const res = await updateProfileMutation(payload).unwrap();
      const updatedUser = res.data;

      dispatch(setUser(updatedUser));
      dispatch(setToast({ message: 'Profile updated successfully!', type: 'success' }));
      refetch();
    } catch (err) {
      dispatch(
        setToast({
          message: err.data?.message || err.message || 'Failed to update profile.',
          type: 'error',
        })
      );
    }
  };

  // Submit password change
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      dispatch(setToast({ message: 'Please enter your current password.', type: 'error' }));
      return;
    }

    if (newPassword.length < 8) {
      dispatch(setToast({ message: 'New password must be at least 8 characters long.', type: 'error' }));
      return;
    }

    if (newPassword !== confirmPassword) {
      dispatch(setToast({ message: 'New passwords do not match.', type: 'error' }));
      return;
    }

    try {
      await changePasswordMutation({
        currentPassword,
        newPassword,
      }).unwrap();

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      dispatch(setToast({ message: 'Password changed successfully!', type: 'success' }));
    } catch (err) {
      dispatch(
        setToast({
          message: err.data?.message || err.message || 'Failed to update password.',
          type: 'error',
        })
      );
    }
  };

  // Submit new address
  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!addressData.street || !addressData.city || !addressData.state || !addressData.postalCode) {
      dispatch(setToast({ message: 'Please fill in all required address fields.', type: 'error' }));
      return;
    }

    try {
      await addAddressMutation(addressData).unwrap();
      setShowAddressForm(false);
      setAddressData({
        street: '',
        apartment: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
        isDefault: false,
      });
      dispatch(setToast({ message: 'Address added successfully!', type: 'success' }));
      refetch();
    } catch (err) {
      dispatch(
        setToast({
          message: err.data?.message || 'Failed to save address.',
          type: 'error',
        })
      );
    }
  };

  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0][0].toUpperCase();
  };

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '6rem', maxWidth: '1040px' }}>
      {/* Editorial Page Header */}
      <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--sand)', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                fontWeight: 600,
              }}
            >
              Account Management
            </span>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.6rem', marginTop: '0.2rem', marginBottom: '0.4rem' }}>
              Profile & Settings
            </h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', margin: 0 }}>
              Manage your personal credentials, contact email, security password, and shipping addresses
            </p>
          </div>

          {isAdmin && (
            <Link
              to="/admin"
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                borderColor: 'var(--accent)',
                color: 'var(--accent)',
              }}
            >
              <Shield size={15} />
              Open Admin Dashboard
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Profile Overview Card */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--sand)',
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.8rem',
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.8rem', flexWrap: 'wrap' }}>
          {/* Avatar Container with Upload trigger */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '92px',
                height: '92px',
                borderRadius: '50%',
                backgroundColor: 'var(--sand-light)',
                border: '2px solid var(--accent)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={user?.name || 'User Avatar'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '2.2rem',
                    color: 'var(--accent)',
                    fontWeight: 600,
                  }}
                >
                  {getInitials(user?.name)}
                </span>
              )}
            </div>

            <label
              htmlFor="avatar-file-input"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: 'var(--ink)',
                color: '#fff',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                transition: 'transform 0.15s ease',
              }}
              title="Upload new profile picture"
            >
              <Camera size={15} />
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* User Info Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.3rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0 }}>
                {user?.name || 'Valued Member'}
              </h2>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.55rem',
                  backgroundColor: isAdmin ? 'var(--accent-light)' : 'var(--sand-light)',
                  color: isAdmin ? 'var(--accent)' : 'var(--ink-muted)',
                  border: `1px solid ${isAdmin ? 'var(--accent)' : 'var(--sand)'}`,
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {user?.role || 'CUSTOMER'}
              </span>
            </div>

            <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', margin: 0, marginBottom: '0.5rem' }}>
              {user?.email}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--ink-subtle)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle size={14} color="var(--status-success)" />
                {user?.isEmailVerified ? 'Email Verified' : 'Standard Member'}
              </span>
              <span>•</span>
              <span>Member of KORA Atelier</span>
            </div>
          </div>
        </div>

        {/* Quick Shortcut Buttons */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <Link to="/orders" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.6rem 1rem' }}>
            View Order History
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--sand)',
          marginBottom: '2rem',
          gap: '2rem',
        }}
      >
        <button
          onClick={() => setActiveTab('DETAILS')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.8rem 0',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'DETAILS' ? 600 : 400,
            color: activeTab === 'DETAILS' ? 'var(--ink)' : 'var(--ink-muted)',
            borderBottom: activeTab === 'DETAILS' ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <User size={16} /> Personal Details & Photo
        </button>

        <button
          onClick={() => setActiveTab('SECURITY')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.8rem 0',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'SECURITY' ? 600 : 400,
            color: activeTab === 'SECURITY' ? 'var(--ink)' : 'var(--ink-muted)',
            borderBottom: activeTab === 'SECURITY' ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Lock size={16} /> Security & Password
        </button>

        <button
          onClick={() => setActiveTab('ADDRESSES')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.8rem 0',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'ADDRESSES' ? 600 : 400,
            color: activeTab === 'ADDRESSES' ? 'var(--ink)' : 'var(--ink-muted)',
            borderBottom: activeTab === 'ADDRESSES' ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <MapPin size={16} /> Shipping Addresses
        </button>
      </div>

      {/* TAB 1: Personal Details & Avatar */}
      {activeTab === 'DETAILS' && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--sand)', padding: '2.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600 }}>
            Personal Information
          </h3>

          <form onSubmit={handleUpdateProfile}>
            {/* Name & Email Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Full Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    style={{ paddingLeft: '2.4rem' }}
                  />
                  <User
                    size={16}
                    style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Email Address *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    style={{ paddingLeft: '2.4rem' }}
                  />
                  <Mail
                    size={16}
                    style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--ink-subtle)', marginTop: '0.3rem', display: 'block' }}>
                  Your email is used for receipts, order confirmations, and notifications.
                </span>
              </div>
            </div>

            {/* Profile Picture Chooser */}
            <div style={{ borderTop: '1px solid var(--sand-light)', paddingTop: '1.8rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
                    Profile Picture
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', margin: 0, marginTop: '0.2rem' }}>
                    Upload a portrait photo or choose from curated styles
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <label
                    htmlFor="avatar-file-input-inline"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Camera size={14} /> Upload File
                    <input
                      id="avatar-file-input-inline"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                  >
                    {showUrlInput ? 'Hide URL Input' : 'Enter Image URL'}
                  </button>

                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', color: 'var(--status-danger)' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* URL Input option */}
              {showUrlInput && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem' }}>
                  <input
                    type="url"
                    className="input-field"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    placeholder="https://example.com/your-portrait.jpg"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (customAvatarUrl.trim()) {
                        setAvatar(customAvatarUrl.trim());
                        setCustomAvatarUrl('');
                        dispatch(setToast({ message: 'Avatar image URL applied. Click Save Changes to confirm.', type: 'info' }));
                      }
                    }}
                  >
                    Apply URL
                  </button>
                </div>
              )}

              {/* Preset Avatars Selection */}
              <div>
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Or pick a curated style:
                </p>
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  {PRESET_AVATARS.map((presetUrl, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setAvatar(presetUrl);
                        dispatch(setToast({ message: 'Preset avatar selected! Click Save Changes to save.', type: 'info' }));
                      }}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        padding: 0,
                        border: avatar === presetUrl ? '2px solid var(--accent)' : '1px solid var(--sand)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transform: avatar === presetUrl ? 'scale(1.08)' : 'scale(1)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <img
                        src={presetUrl}
                        alt={`Preset ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div style={{ borderTop: '1px solid var(--sand-light)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="btn btn-primary"
                style={{ minWidth: '170px' }}
              >
                {isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Security & Password */}
      {activeTab === 'SECURITY' && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--sand)', padding: '2.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem', fontWeight: 600 }}>
            Change Password
          </h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
            Ensure your account is using a secure, unique password of at least 8 characters.
          </p>

          <form onSubmit={handleChangePassword} style={{ maxWidth: '520px' }}>
            {/* Current Password */}
            <div style={{ marginBottom: '1.4rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 500 }}>
                Current Password *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="input-field"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
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
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div style={{ marginBottom: '1.4rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 500 }}>
                New Password (minimum 8 characters) *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
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
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 500 }}>
                Confirm New Password *
              </label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <span style={{ fontSize: '0.75rem', color: 'var(--status-danger)', marginTop: '0.3rem', display: 'block' }}>
                  Passwords do not match
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="btn btn-primary"
              style={{ minWidth: '180px' }}
            >
              {isChangingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Shipping Addresses */}
      {activeTab === 'ADDRESSES' && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--sand)', padding: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
                Saved Addresses
              </h3>
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', margin: 0, marginTop: '0.2rem' }}>
                Addresses for faster checkout and delivery dispatch
              </p>
            </div>

            {!showAddressForm && (
              <button
                onClick={() => setShowAddressForm(true)}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
              >
                <Plus size={15} /> Add New Address
              </button>
            )}
          </div>

          {/* New Address Form */}
          {showAddressForm && (
            <div
              style={{
                backgroundColor: 'var(--sand-light)',
                border: '1px solid var(--sand)',
                padding: '1.8rem',
                marginBottom: '2rem',
              }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.2rem' }}>
                Add Shipping Address
              </h4>

              <form onSubmit={handleAddAddress}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Street Address *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={addressData.street}
                      onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                      placeholder="House/Flat No., Building name, Street"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Apartment / Suite (Optional)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={addressData.apartment}
                      onChange={(e) => setAddressData({ ...addressData, apartment: e.target.value })}
                      placeholder="Suite, Unit, Floor"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      City *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={addressData.city}
                      onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                      placeholder="City"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      State *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={addressData.state}
                      onChange={(e) => setAddressData({ ...addressData, state: e.target.value })}
                      placeholder="State / Region"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Postal Code / PIN *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={addressData.postalCode}
                      onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value })}
                      placeholder="PIN code"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <input
                    type="checkbox"
                    id="isDefaultAddr"
                    checked={addressData.isDefault}
                    onChange={(e) => setAddressData({ ...addressData, isDefault: e.target.checked })}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <label htmlFor="isDefaultAddr" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                    Set as default shipping address
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <button
                    type="submit"
                    disabled={isAddingAddress}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    {isAddingAddress ? 'Saving Address...' : 'Save Address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of existing addresses */}
          {user?.addresses && user.addresses.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
              {user.addresses.map((addr, idx) => (
                <div
                  key={idx}
                  style={{
                    border: `1px solid ${addr.isDefault ? 'var(--accent)' : 'var(--sand)'}`,
                    padding: '1.2rem',
                    backgroundColor: addr.isDefault ? 'var(--accent-light)' : 'var(--surface)',
                    position: 'relative',
                  }}
                >
                  {addr.isDefault && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '0.8rem',
                        right: '0.8rem',
                        fontSize: '0.68rem',
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        padding: '0.15rem 0.45rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Default
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.5rem' }}>
                    <MapPin size={16} color="var(--accent)" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem' }}>
                        {addr.street} {addr.apartment && `, ${addr.apartment}`}
                      </p>
                      <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                        {addr.city}, {addr.state} - {addr.postalCode}
                      </p>
                      <p style={{ margin: 0, color: 'var(--ink-subtle)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        {addr.country || 'India'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed var(--sand)' }}>
              <MapPin size={32} style={{ color: 'var(--ink-subtle)', marginBottom: '0.8rem' }} />
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                You have not added any shipping addresses yet.
              </p>
              {!showAddressForm && (
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem' }}
                >
                  Add Your First Address
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
