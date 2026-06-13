import React, { type ReactNode, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';
import { useAdminAuth } from '../../hooks/useAdminAuth';
// H2 fix (v1.68) — wrap the admin page slot in a section-level
// ErrorBoundary so a single broken page doesn't kill the admin
// shell (sidebar + navbar stay visible, the user can navigate
// elsewhere without a hard refresh).
import ErrorBoundary from '../../../components/ui/ErrorBoundary';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/?next=/admin" replace />;

  return (
    <div className="min-h-screen bg-bg flex">
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-56">
        <AdminNavbar onMobileMenuToggle={() => setMobileOpen(v => !v)} />
        <main className="flex-1 p-5 lg:p-6 overflow-y-auto">
          <ErrorBoundary sectionName="AdminPage" level="section">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
