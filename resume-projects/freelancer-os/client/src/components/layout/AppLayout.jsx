import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { NewProjectModal } from '../modals/NewProjectModal';
import { NotificationModal } from '../modals/NotificationModal';
import { api } from '../../lib/api';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: demoStatus } = useQuery({
    queryKey: ['demo-status'],
    queryFn: () => api.getDemoStatus(),
    staleTime: 30000,
  });

  return (
    <div
      className="flex h-screen overflow-hidden font-sans select-text"
      style={{ backgroundColor: 'var(--page, #FAF5EA)', color: 'var(--ink, #0E1A2B)' }}
    >
      {/* Sidebar (Desktop 260px, Mobile Drawer) */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        {demoStatus?.hasDemoData && (
          <div
            role="status"
            className="bg-[#FFF4CC] border-b border-[#FFC72C] px-4 py-2 text-xs font-semibold text-[#B54708] flex items-center justify-between z-10 shrink-0"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#B54708]" />
              <span>You're viewing demo data</span>
            </div>
            <Link
              to="/settings/data-and-privacy"
              className="text-xs font-bold text-[#0047AB] hover:underline flex items-center gap-1"
            >
              <span>Manage in Settings</span>
            </Link>
          </div>
        )}
        <main
          className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-8 pt-6 pb-8 max-w-7xl w-full mx-auto outline-none focus:outline-none"
          id="main-content"
        >
          <Outlet />
        </main>
      </div>

      {/* Global Modals */}
      <NewProjectModal />
      <NotificationModal />
    </div>
  );
}
