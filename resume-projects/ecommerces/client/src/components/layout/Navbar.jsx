import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  ShoppingBag,
  User,
  LogOut,
  ShieldCheck,
  Search,
  X,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { toggleCartDrawer, openAuthModal } from '../../store/slices/uiSlice.js';
import { logout } from '../../store/slices/authSlice.js';
import { useGetCartQuery, useLogoutMutation } from '../../services/api.js';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { data: cartData } = useGetCartQuery(undefined, { skip: !isAuthenticated });
  const [logoutMutation] = useLogoutMutation();

  const cartCount = cartData?.data?.itemCount || 0;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch {
      // ignore
    } finally {
      dispatch(logout());
      setIsUserMenuOpen(false);
      navigate('/');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const quickSearchTags = ['Raw Linen', 'Mulberry Silk', 'Kurta', 'Kimono Coat', 'Mulmul'];

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 45,
          backgroundColor: 'rgba(250, 247, 242, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--sand)',
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all var(--transition-smooth)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Left Side: Logo + Minimal Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="mobile-toggle-btn nav-icon-btn"
              aria-label="Open Navigation Menu"
              style={{ padding: '0.4rem', marginRight: '-1rem' }}
            >
              <Menu size={22} />
            </button>

            {/* Minimal Brand Logo on Left */}
            <Link
              to="/"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '2rem',
                  letterSpacing: '0.2em',
                  color: 'var(--ink)',
                  textTransform: 'uppercase',
                  fontWeight: 400,
                  lineHeight: '1',
                }}
              >
                KORA
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav
              className="desktop-nav"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2rem',
              }}
            >
              <Link
                to="/catalog?category=men"
                className={`nav-link ${location.search.includes('men') && !location.search.includes('women') ? 'active' : ''}`}
                style={{ fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Mens
              </Link>
              <Link
                to="/catalog?category=women"
                className={`nav-link ${location.search.includes('women') ? 'active' : ''}`}
                style={{ fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Womens
              </Link>
              <Link
                to="/catalog?category=collections"
                className={`nav-link ${location.search.includes('collections') ? 'active' : ''}`}
                style={{ fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Collections
              </Link>
              <Link
                to="/catalog"
                className={`nav-link ${location.pathname === '/catalog' && !location.search ? 'active' : ''}`}
                style={{ fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Shop All
              </Link>
            </nav>
          </div>

          {/* Right Side: Search, Account, Bag */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
            }}
          >
            {/* Minimal Search Button */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="nav-icon-btn"
              title="Search"
              aria-label="Search"
              style={{ padding: '0.5rem' }}
            >
              <Search size={18} />
            </button>

            {/* Admin Badge */}
            {isAdmin && (
              <Link
                to="/admin"
                className="desktop-nav pill-badge"
                style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.6rem',
                  backgroundColor: 'var(--sand-light)',
                  border: '1px solid var(--sand)',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  gap: '0.3rem',
                }}
              >
                <ShieldCheck size={12} />
                Admin
              </Link>
            )}

            {/* Account / User Menu */}
            {isAuthenticated ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="nav-icon-btn"
                  style={{ gap: '0.4rem', padding: '0.4rem 0.6rem' }}
                  aria-label="Account Menu"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || 'Account'}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid var(--accent)',
                      }}
                    />
                  ) : (
                    <User size={18} />
                  )}
                  <span className="desktop-nav" style={{ fontSize: '0.78rem' }}>
                    {user?.name?.split(' ')[0] || 'Account'}
                  </span>
                  <ChevronDown size={12} />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '120%',
                      right: 0,
                      width: '190px',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--sand)',
                      boxShadow: 'var(--shadow-card)',
                      padding: '0.6rem 0',
                      zIndex: 50,
                      animation: 'slideDown 0.15s ease-out',
                    }}
                  >
                    <div style={{ padding: '0.4rem 1rem', borderBottom: '1px solid var(--sand-light)', marginBottom: '0.3rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Signed in</p>
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user?.name}
                      </p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      style={{
                        display: 'block',
                        padding: '0.5rem 1rem',
                        fontSize: '0.8rem',
                        color: 'var(--ink)',
                      }}
                    >
                      Profile & Settings
                    </Link>

                    <Link
                      to="/orders"
                      onClick={() => setIsUserMenuOpen(false)}
                      style={{
                        display: 'block',
                        padding: '0.5rem 1rem',
                        fontSize: '0.8rem',
                        color: 'var(--ink)',
                      }}
                    >
                      My Orders
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        style={{
                          display: 'block',
                          padding: '0.5rem 1rem',
                          fontSize: '0.8rem',
                          color: 'var(--accent)',
                        }}
                      >
                        Admin Dashboard
                      </Link>
                    )}

                    <div style={{ borderTop: '1px solid var(--sand-light)', marginTop: '0.3rem', paddingTop: '0.3rem' }}>
                      <button
                        onClick={handleLogout}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.4rem 1rem',
                          fontSize: '0.8rem',
                          color: 'var(--status-danger)',
                        }}
                      >
                        <LogOut size={13} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="nav-icon-btn"
                aria-label="Sign In"
                style={{ padding: '0.5rem' }}
              >
                <User size={18} />
                <span className="desktop-nav" style={{ fontSize: '0.78rem' }}>Sign In</span>
              </Link>
            )}

            {/* Shopping Bag Icon with minimal badge */}
            <button
              onClick={() => dispatch(toggleCartDrawer())}
              className="nav-icon-btn"
              style={{
                position: 'relative',
                padding: '0.5rem',
              }}
              aria-label="Shopping Bag"
            >
              <ShoppingBag size={18} />
              <span className="desktop-nav" style={{ fontSize: '0.78rem' }}>Bag</span>
              {cartCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--surface)',
                    fontSize: '0.65rem',
                    minWidth: '17px',
                    height: '17px',
                    padding: '0 4px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    marginLeft: '2px',
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Minimal Search Drawer */}
      {isSearchOpen && (
        <div
          style={{
            position: 'sticky',
            top: '68px',
            zIndex: 44,
            backgroundColor: 'var(--surface)',
            borderBottom: '1px solid var(--sand)',
            boxShadow: 'var(--shadow-subtle)',
            animation: 'slideDown 0.2s ease-out',
            padding: '1.2rem 0',
          }}
        >
          <div className="container" style={{ maxWidth: '720px' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={16}
                  color="var(--ink-muted)"
                  style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search pieces, fabrics, or silhouettes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field"
                  style={{
                    paddingLeft: '2.4rem',
                    paddingRight: '1rem',
                    paddingTop: '0.65rem',
                    paddingBottom: '0.65rem',
                    fontSize: '0.9rem',
                    backgroundColor: 'var(--bg)',
                  }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.2rem', fontSize: '0.78rem' }}>
                Search
              </button>

              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="nav-icon-btn"
                style={{ padding: '0.6rem' }}
                aria-label="Close Search"
              >
                <X size={18} />
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem', marginTop: '0.8rem' }}>
              <span style={{ color: 'var(--ink-subtle)' }}>Popular searches:</span>
              {quickSearchTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    navigate(`/catalog?search=${encodeURIComponent(tag)}`);
                    setIsSearchOpen(false);
                  }}
                  style={{
                    padding: '0.15rem 0.5rem',
                    backgroundColor: 'var(--sand-light)',
                    border: '1px solid var(--sand)',
                    fontSize: '0.72rem',
                    borderRadius: '2px',
                    color: 'var(--ink)',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Slide-out Menu */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            backgroundColor: 'rgba(31, 29, 26, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
          }}
        >
          <div
            style={{
              width: '82%',
              maxWidth: '340px',
              backgroundColor: 'var(--bg)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.8rem',
              boxShadow: 'var(--shadow-modal)',
              animation: 'slideInRight 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.8rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}
              >
                KORA
              </span>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="nav-icon-btn"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2.5rem' }}>
              <Link
                to="/catalog?category=men"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Mens
              </Link>
              <Link
                to="/catalog?category=women"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Womens
              </Link>
              <Link
                to="/catalog?category=collections"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Collections
              </Link>
              <Link
                to="/catalog"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Shop All
              </Link>
            </nav>

            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--sand)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                  >
                    Profile & Settings
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                  >
                    My Orders
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      style={{ fontSize: '0.85rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    style={{ textAlign: 'left', color: 'var(--status-danger)', fontSize: '0.85rem', textTransform: 'uppercase' }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.8rem', textAlign: 'center' }}
                >
                  Sign In / Register
                </Link>
              )}
            </div>
          </div>

          <div style={{ flex: 1 }} onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}
    </>
  );
};
