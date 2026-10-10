import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  ChevronRight,
  Bell,
  Settings,
  ShieldCheck,
  User,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { SUPPORTED_CURRENCIES } from '../../lib/currency';

const routeTitles = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/analyzer': 'Analyzer',
  '/proposals': 'Proposals',
  '/clients': 'Clients',
  '/projects': 'Projects',
  '/invoices': 'Invoices',
  '/expenses': 'Expenses & profit',
  '/templates': 'Templates',
  '/pricing-rules': 'Pricing rules',
  '/agents-doc': 'AGENTS.md',
  '/settings': 'Settings',
};

export function Navbar({ onOpenMobileMenu = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currency, setCurrency } = useCurrencyStore();
  const { showToast } = useNotificationStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentTitle = routeTitles[location.pathname] || 'Workspace';

  // Fix document.title per page
  useEffect(() => {
    document.title = `Floorly: ${currentTitle}`;
  }, [currentTitle, location.pathname]);

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userPlan = (user?.plan || 'solo').toLowerCase();
  const planDisplay = userPlan === 'free' ? 'Free plan' : `${userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} plan`;

  const initials = (user?.name || user?.businessName || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <header
      className="h-16 w-full shrink-0 border-b px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-all select-none"
      style={{
        backgroundColor: 'var(--page, #FAF5EA)',
        borderColor: 'var(--line, #E8E0CF)',
      }}
    >
      {/* Left: Mobile Hamburger + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar menu"
          className="lg:hidden p-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb: "Workspace / Dashboard" */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[14px]">
          <span className="text-[var(--muted,#5B6676)] font-normal hidden sm:inline">Workspace</span>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--muted,#5B6676)] shrink-0 hidden sm:inline" />
          <span className="font-semibold text-[var(--ink,#0E1A2B)] truncate">
            {currentTitle}
          </span>
        </nav>
      </div>

      {/* Right: Currency Select, Plan Chip, Notification Bell, Avatar Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Currency Selector (controls app-wide via Intl.NumberFormat) */}
        <div className="relative">
          <label htmlFor="currency-select" className="sr-only">Display Currency</label>
          <select
            id="currency-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="text-[13px] font-semibold bg-white text-[var(--ink,#0E1A2B)] border border-[var(--line,#E8E0CF)] rounded-full px-3 py-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] transition-colors"
            title="Workspace display currency"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Plan Chip ("Solo plan") */}
        <Link
          to="/settings"
          className="px-3 py-1 text-xs font-semibold rounded-full border transition-colors flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB]"
          style={{
            backgroundColor: 'var(--cobalt-tint, #E8F0FB)',
            borderColor: '#BFD5F2',
            color: 'var(--cobalt, #0047AB)',
          }}
          title="Account plan & usage"
        >
          <span>{planDisplay}</span>
        </Link>

        {/* Notification Bell */}
        <button
          type="button"
          aria-label="View notifications"
          onClick={() => {
            showToast({
              type: 'info',
              title: 'Floorly Notifications',
              message: 'All client proposals and receivables are operating normally.',
            });
          }}
          className="p-2 rounded-full border border-[var(--line,#E8E0CF)] bg-white text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB]"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Avatar Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            id="user-menu-button"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="User account menu"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-bold transition-transform active:scale-95 outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:ring-offset-2"
            style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
          >
            {initials || 'FL'}
          </button>

          {dropdownOpen && (
            <div
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="user-menu-button"
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[var(--line,#E8E0CF)] shadow-lg py-1.5 z-50 animate-scale-in"
            >
              {/* User Summary */}
              <div className="px-4 py-2.5 border-b border-[var(--line,#E8E0CF)]">
                <div className="text-xs font-bold text-[var(--ink,#0E1A2B)] truncate">
                  {user?.name || user?.businessName || 'Workspace'}
                </div>
                <div className="text-[11px] text-[var(--muted,#5B6676)] truncate mt-0.5">
                  {user?.email || ''}
                </div>
              </div>

              {/* Links */}
              <Link
                to="/settings"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                <span>Profile & Settings</span>
              </Link>

              <Link
                to="/pricing-rules"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                <span>Pricing Rules & Floors</span>
              </Link>

              <div className="border-t border-[var(--line,#E8E0CF)] my-1" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[var(--error,#B42318)] hover:bg-[#FEF3F2] transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
