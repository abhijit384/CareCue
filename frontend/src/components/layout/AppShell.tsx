import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Clock,
  Shield,
  Settings,
  Menu,
  X,
  Plus,
  Heart,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/lib/theme';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/session/new', icon: FileText, label: 'Understand' },
  { to: '/brief', icon: ClipboardList, label: 'Doctor Brief' },
  { to: '/history', icon: Clock, label: 'History' },
];

const SECONDARY_NAV = [
  { to: '/privacy', icon: Shield, label: 'Privacy' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/session/new': 'Start Care Session',
  '/session/flow': 'Document Understanding',
  '/guidance': 'Care Guidance',
  '/brief': 'Doctor Visit Brief',
  '/history': 'History & Records',
  '/privacy': 'Privacy Center',
  '/settings': 'Settings',
};

const SIDEBAR_STORAGE_KEY = 'carecue-sidebar-collapsed';

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const location = useLocation();
  const currentTitle = PAGE_TITLES[location.pathname] || 'CareCue';

  // Toggle sidebar and persist
  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Ignore localStorage write error
      }
      return next;
    });
  };

  // Close mobile drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* ─── 1. Desktop Collapsible Sidebar ─── */}
      <aside
        aria-label="Sidebar navigation"
        className={cn(
          'hidden md:flex flex-col border-r border-border-subtle bg-bg-surface transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)] z-20 shrink-0 select-none',
          collapsed ? 'w-[72px]' : 'w-60'
        )}
      >
        {/* Top Header: Logo + Collapse Toggle */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border-subtle/60 min-h-[64px]">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2.5 no-underline overflow-hidden focus-visible:ring-2 focus-visible:ring-accent-teal rounded-lg"
          >
            <div className="w-8 h-8 rounded-xl bg-accent-teal flex items-center justify-center shrink-0 shadow-xs">
              <Heart className="w-4 h-4 text-text-inverse" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-base font-bold tracking-tight text-text-primary whitespace-nowrap"
              >
                CareCue
              </motion.span>
            )}
          </NavLink>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent-teal"
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* New Session Button */}
        <div className="px-3 py-3">
          <NavLink
            to="/session/new"
            title="New Session"
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl bg-accent-teal text-text-inverse font-semibold text-xs no-underline hover:bg-accent-teal-dark transition-all shadow-xs cursor-pointer',
              collapsed ? 'w-10 h-10 mx-auto' : 'px-3 py-2.5 w-full'
            )}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && <span>New Session</span>}
          </NavLink>
        </div>

        {/* Primary Nav */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <div key={item.to} className="relative group">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl text-xs font-semibold transition-colors no-underline',
                    collapsed ? 'w-10 h-10 justify-center mx-auto' : 'px-3 py-2.5',
                    isActive
                      ? 'bg-accent-teal-light text-accent-teal-dark shadow-xs'
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>

              {/* Accessible Hover Tooltip when Collapsed */}
              {collapsed && (
                <div
                  role="tooltip"
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 rounded-lg bg-text-primary text-text-inverse text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md"
                >
                  {item.label}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Secondary Nav (Privacy & Settings) */}
        <div className="px-3 pb-4 pt-2 border-t border-border-subtle/60 space-y-1">
          {SECONDARY_NAV.map(item => (
            <div key={item.to} className="relative group">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl text-xs font-semibold transition-colors no-underline',
                    collapsed ? 'w-10 h-10 justify-center mx-auto' : 'px-3 py-2.5',
                    isActive
                      ? 'bg-accent-teal-light text-accent-teal-dark shadow-xs'
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>

              {/* Tooltip when collapsed */}
              {collapsed && (
                <div
                  role="tooltip"
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 rounded-lg bg-text-primary text-text-inverse text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md"
                >
                  {item.label}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* ─── Main Content Container with Desktop Top Header ─── */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* Desktop Header Bar (1366px Laptop Optimized) */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 border-b border-border-subtle/60 bg-bg-surface/80 backdrop-blur-md min-h-[64px] z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              CareCue
            </span>
            <span className="text-text-tertiary text-xs">/</span>
            <h1 className="text-sm font-bold text-text-primary tracking-tight">
              {currentTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/session/flow?demo=true"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-teal-light border border-accent-teal/30 text-accent-teal-dark text-xs font-bold hover:bg-accent-teal/20 transition-all no-underline"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-teal" />
              <span>TRY DEMO</span>
            </NavLink>

            <ThemeToggle variant="segmented" />

            <div className="flex items-center gap-2 pl-2 border-l border-border-subtle">
              <div className="w-7 h-7 rounded-full bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center font-bold text-xs">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-text-secondary hidden lg:inline">
                Jane Sample
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Top Bar (390px Viewport) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-surface min-h-[56px] z-10">
          <NavLink to="/dashboard" className="flex items-center gap-2 no-underline">
            <div className="w-7 h-7 rounded-lg bg-accent-teal flex items-center justify-center shadow-xs">
              <Heart className="w-3.5 h-3.5 text-text-inverse" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-text-primary">CareCue</span>
          </NavLink>

          <div className="flex items-center gap-2">
            <ThemeToggle variant="compact" />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg hover:bg-bg-secondary text-text-primary transition-colors cursor-pointer"
              aria-label="Open navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Slide-in Drawer Sheet with Backdrop */}
        <AnimatePresence>
          {mobileOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                aria-hidden="true"
              />

              {/* Drawer Content */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="relative w-4/5 max-w-xs bg-bg-surface border-r border-border-default shadow-2xl h-full flex flex-col p-5 z-10"
              >
                <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-accent-teal flex items-center justify-center shadow-xs">
                      <Heart className="w-4 h-4 text-text-inverse" strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="text-base font-bold text-text-primary block">CareCue</span>
                      <span className="text-[10px] text-text-tertiary">Clinical Companion</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                    aria-label="Close navigation drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Drawer New Session */}
                <div className="py-4">
                  <NavLink
                    to="/session/new"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-teal text-text-inverse text-xs font-bold no-underline shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    New Care Session
                  </NavLink>
                </div>

                {/* Mobile Drawer Links */}
                <nav className="flex-1 space-y-1 overflow-y-auto">
                  {[...NAV_ITEMS, ...SECONDARY_NAV].map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors no-underline',
                          isActive
                            ? 'bg-accent-teal-light text-accent-teal-dark'
                            : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                        )
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>

                {/* Mobile Drawer Footer with Theme Toggle */}
                <div className="pt-4 border-t border-border-subtle space-y-3">
                  <div className="flex items-center justify-between text-xs text-text-tertiary font-semibold">
                    <span>Appearance</span>
                  </div>
                  <ThemeToggle variant="segmented" className="w-full justify-between" />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── Scrollable Main Page Viewport ─── */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ─── Mobile Bottom Navigation (390px Viewport) ─── */}
        <nav
          aria-label="Mobile bottom navigation"
          className="md:hidden flex items-center justify-around border-t border-border-subtle bg-bg-surface/95 backdrop-blur-sm py-2 px-1 z-20 shrink-0"
        >
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[11px] font-semibold no-underline transition-colors',
                  isActive ? 'text-accent-teal' : 'text-text-tertiary hover:text-text-secondary'
                )
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
