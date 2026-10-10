import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Building2,
  Receipt,
  CreditCard,
  FileText,
  Bell,
  Globe,
  Zap,
  Shield,
  UserCheck,
} from 'lucide-react';
import { SECTIONS } from './settingsConstants';

const SECTION_ICONS = {
  business: Building2,
  taxes: Receipt,
  payments: CreditCard,
  documents: FileText,
  notifications: Bell,
  regional: Globe,
  'plan-and-billing': Zap,
  'data-and-privacy': Shield,
  account: UserCheck,
};

export function SettingsNav({ activeSection, onSelectSection }) {
  return (
    <>
      {/* Desktop Vertical Nav (240px, Sticky) */}
      <aside className="hidden lg:block w-[240px] shrink-0 sticky top-6 self-start">
        <nav
          aria-label="Settings navigation"
          className="bg-white rounded-2xl border border-[#E8E0CF] p-2 space-y-1"
        >
          {SECTIONS.map((sec) => {
            const Icon = SECTION_ICONS[sec.id] || Building2;
            const isActive = activeSection === sec.id;
            return (
              <NavLink
                key={sec.id}
                to={`/settings/${sec.id}`}
                onClick={(e) => {
                  if (onSelectSection) {
                    onSelectSection(sec.id);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-semibold transition-all group ${
                  isActive
                    ? 'bg-[#E8F0FB] text-[#0047AB]'
                    : 'text-[#5B6676] hover:bg-[#FAF5EA] hover:text-[#0E1A2B]'
                }`}
                style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#0047AB]' : 'text-[#5B6676] group-hover:text-[#0E1A2B]'
                  }`}
                />
                <span className="truncate">{sec.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Tablet & Mobile Horizontally Scrollable Tab Bar */}
      <div className="lg:hidden w-full overflow-x-auto no-scrollbar pb-2 mb-4 border-b border-[#E8E0CF]">
        <div className="flex items-center gap-1.5 min-w-max px-1">
          {SECTIONS.map((sec) => {
            const Icon = SECTION_ICONS[sec.id] || Building2;
            const isActive = activeSection === sec.id;
            return (
              <NavLink
                key={sec.id}
                to={`/settings/${sec.id}`}
                onClick={() => onSelectSection && onSelectSection(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0047AB] text-white shadow-sm'
                    : 'bg-white text-[#5B6676] border border-[#E8E0CF] hover:bg-[#FAF5EA]'
                }`}
                style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{sec.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </>
  );
}
