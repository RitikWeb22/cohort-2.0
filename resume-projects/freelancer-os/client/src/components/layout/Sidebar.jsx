import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Users,
  FolderGit2,
  Receipt,
  TrendingDown,
  Layers,
  ShieldCheck,
  Cpu,
  Settings,
  Plus,
  LogOut,
  X,
} from 'lucide-react';
import { useQuickModalStore } from '../../store/useQuickModalStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Logo } from '../common/Logo';

const navGroups = [
  {
    heading: 'Work',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Analyzer', path: '/analyzer', icon: Sparkles, badge: 'AI' },
      { name: 'Proposals', path: '/proposals', icon: FileText },
      { name: 'Clients', path: '/clients', icon: Users },
      { name: 'Projects', path: '/projects', icon: FolderGit2 },
    ],
  },
  {
    heading: 'Money',
    items: [
      { name: 'Invoices', path: '/invoices', icon: Receipt },
      { name: 'Expenses & profit', path: '/expenses', icon: TrendingDown },
    ],
  },
  {
    heading: 'Setup',
    items: [
      { name: 'Templates', path: '/templates', icon: Layers },
      { name: 'Pricing rules', path: '/pricing-rules', icon: ShieldCheck, badge: 'Floor' },
      { name: 'AGENTS.md', path: '/agents-doc', icon: Cpu },
    ],
  },
];

export function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { openModal } = useQuickModalStore();
  const { user, logout } = useAuthStore();

  const userPlan = (user?.plan || 'solo').toLowerCase();
  const planDisplay = userPlan === 'free' ? 'Free plan' : `${userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} plan`;

  const initials = (user?.name || user?.businessName || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const renderBadge = (badge) => {
    if (badge === 'AI' || badge === 'AGENTS') {
      return (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tracking-wide"
          style={{
            backgroundColor: 'var(--cobalt-tint, #E8F0FB)',
            color: 'var(--cobalt, #0047AB)',
          }}
        >
          {badge}
        </span>
      );
    }
    if (badge === 'Floor') {
      return (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tracking-wide"
          style={{
            backgroundColor: 'var(--sun-tint, #FFF4CC)',
            color: 'var(--ink, #0E1A2B)',
          }}
        >
          {badge}
        </span>
      );
    }
    return null;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* 1. Header: Logo + Mobile Close */}
      <div className="h-16 px-5 border-b border-[var(--line,#E8E0CF)] flex items-center justify-between shrink-0">
        <Link to="/dashboard" onClick={onClose} aria-label="Floorly dashboard">
          <Logo size="md" />
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="lg:hidden p-1.5 rounded-lg text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Primary Action Button: ONE "New proposal" Cobalt Pill */}
      <div className="p-3.5 pb-2 shrink-0">
        <Link
          to="/proposals/new"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-full text-[15px] font-semibold text-white transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-none outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:ring-offset-2"
          style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cobalt-dark, #003A8C)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--cobalt, #0047AB)'; }}
        >
          <Plus className="w-4 h-4" />
          <span>New proposal</span>
        </Link>
      </div>

      {/* 3. Middle Scrollable Nav Groups (Work, Money, Setup) with subtle bottom fade */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <nav
          aria-label="Sidebar Navigation"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-3 py-2 space-y-4 pb-6"
        >
          {navGroups.map((group) => (
            <div key={group.heading} className="space-y-1">
              <div className="px-3 py-1 text-[12px] font-medium text-[var(--muted,#5B6676)]">
                {group.heading}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/dashboard'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group relative flex items-center justify-between px-3 py-2 rounded-xl text-[14px] transition-colors outline-none focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 ${
                        isActive
                          ? 'font-semibold'
                          : 'font-normal text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)]'
                      }`
                    }
                    style={({ isActive }) =>
                      isActive
                        ? {
                            backgroundColor: 'var(--cobalt-tint, #E8F0FB)',
                            color: 'var(--cobalt, #0047AB)',
                          }
                        : {}
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active Left 3px Indicator */}
                        {isActive && (
                          <span
                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                            style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                            aria-hidden="true"
                          />
                        )}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className="w-4 h-4 shrink-0 transition-colors"
                            style={{
                              color: isActive ? 'var(--cobalt, #0047AB)' : 'var(--muted, #5B6676)',
                            }}
                          />
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.badge && renderBadge(item.badge)}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        {/* Subtle bottom fade so users can tell more items exist below */}
        <div
          className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* 4. Pinned Bottom: Settings + User Card (always reachable) */}
      <div className="shrink-0 p-3 pt-2 border-t border-[var(--line,#E8E0CF)] bg-white space-y-2">
        {/* Pinned Settings NavLink */}
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            `group relative flex items-center justify-between px-3 py-2 rounded-xl text-[14px] transition-colors outline-none focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 ${
              isActive
                ? 'font-semibold'
                : 'font-normal text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)]'
            }`
          }
          style={({ isActive }) =>
            isActive
              ? {
                  backgroundColor: 'var(--cobalt-tint, #E8F0FB)',
                  color: 'var(--cobalt, #0047AB)',
                }
              : {}
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                  style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                  aria-hidden="true"
                />
              )}
              <div className="flex items-center gap-2.5 min-w-0">
                <Settings
                  className="w-4 h-4 shrink-0"
                  style={{
                    color: isActive ? 'var(--cobalt, #0047AB)' : 'var(--muted, #5B6676)',
                  }}
                />
                <span className="truncate">Settings</span>
              </div>
            </>
          )}
        </NavLink>

        {/* User Card: Avatar (cobalt), Name, Plan name, Logout */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)]">
          <Link
            to="/settings"
            onClick={onClose}
            className="flex items-center gap-2.5 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] rounded-lg"
            title="Open account settings"
          >
            <div
              className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs uppercase shrink-0"
              style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
            >
              {initials || 'FL'}
            </div>
            <div className="min-w-0 text-left">
              <div className="text-xs font-semibold text-[var(--ink,#0E1A2B)] truncate">
                {user?.name || user?.businessName || 'Workspace'}
              </div>
              <div className="text-[11px] text-[var(--muted,#5B6676)] truncate font-medium">
                {planDisplay}
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => {
              logout();
              onClose();
            }}
            aria-label="Sign out"
            title="Sign out"
            className="p-1.5 text-[var(--muted,#5B6676)] hover:text-[var(--error,#B42318)] hover:bg-white rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB]"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (w-[260px]) */}
      <aside
        className="hidden lg:flex flex-col w-[260px] h-screen border-r border-[var(--line,#E8E0CF)] shrink-0 sticky top-0 z-30"
        aria-label="Main Navigation"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer (< 1024px) */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#0E1A2B]/40 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Body */}
          <div className="relative w-[280px] max-w-[85vw] h-full shadow-xl animate-slide-in z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
