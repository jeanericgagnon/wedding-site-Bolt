import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  LayoutDashboard,
  Palette,
  Users,
  Image,
  Camera,
  Gift,
  Settings,
  Menu,
  X,
  LogOut,
  Mail,
  Calendar,
  Sparkles,
  ExternalLink,
  ClipboardList,
  Armchair,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { BillingModal } from '../billing/BillingModal';
import { supabase } from '../../lib/supabase';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const { user, signOut, isDemoMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    if (isDemoMode) {
      setSiteSlug('alex-jordan-demo');
      return;
    }

    supabase
      .from('wedding_sites')
      .select('site_slug')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.site_slug) setSiteSlug(data.site_slug);
      });
  }, [user, isDemoMode]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/dashboard/overview' },
    { id: 'builder', label: 'Builder', icon: Palette, path: '/dashboard/builder' },
    { id: 'guests', label: 'Guests & RSVP', icon: Users, path: '/dashboard/guests' },
    { id: 'itinerary', label: 'Itinerary', icon: Calendar, path: '/dashboard/itinerary' },
    { id: 'planning', label: 'Planning', icon: ClipboardList, path: '/dashboard/planning' },
    { id: 'seating', label: 'Seating', icon: Armchair, path: '/dashboard/seating' },
    { id: 'messages', label: 'Messages', icon: Mail, path: '/dashboard/messages' },
    { id: 'vault', label: 'Vault', icon: Image, path: '/dashboard/vault' },
    { id: 'photos', label: 'Photo Sharing', icon: Camera, path: '/dashboard/photos' },
    { id: 'registry', label: 'Registry', icon: Gift, path: '/dashboard/registry' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border-subtle
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-accent" aria-hidden="true" />
              <span className="text-xl font-semibold text-text-primary">Dayof</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-surface-subtle rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto" aria-label="Dashboard navigation">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg text-base
                        transition-colors no-underline min-h-[44px]
                        ${
                          isActive
                            ? 'bg-primary-light text-primary font-medium'
                            : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                        }
                      `}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-border-subtle">
            <button
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-base text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors w-full text-left min-h-[44px]"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(42, 93, 103, 0.5)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-surface border-b border-border-subtle px-4 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-surface-subtle rounded-lg transition-colors min-h-[44px] min-w-[44px]"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Upgrade
              </button>
              {siteSlug ? (
                <a
                  href={`/site/${siteSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors no-underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  Preview site
                </a>
              ) : (
                <span className="hidden md:block text-sm text-text-tertiary">Preview site</span>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors"
                aria-label="Log out"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                Log out
              </button>
              <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-primary font-semibold">
                {getUserInitials()}
              </div>
            </div>
          </div>
        </header>

        {user?.email === 'demo@dayof.love' && (
          <div className="bg-gradient-to-r from-accent to-accent-dark text-white px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4 max-w-6xl">
              <div className="flex-1">
                <p className="font-semibold mb-1">You're viewing a demo</p>
                <p className="text-sm text-white/90">Ready to create your own wedding site? Sign up now for just $49.</p>
              </div>
              <button
                onClick={() => navigate('/templates')}
                className="px-6 py-2.5 bg-white text-accent font-semibold rounded-xl hover:bg-white/95 transition-all shadow-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">{children}</main>
      </div>

      {showUpgradeModal && (
        <BillingModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
};
