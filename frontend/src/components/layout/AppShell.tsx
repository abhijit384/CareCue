import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  Pill,
  ClipboardList,
  Languages,
  AlertOctagon,
  Settings,
  Shield,
  Menu,
  X,
  Plus,
  Heart,
  PanelLeftClose,
  PanelLeft,
  User,
  LogOut,
  ChevronDown,
  Database,
} from 'lucide-react';
import { cn, getGreeting } from '@/lib/utils';
import { ThemeToggle } from '@/lib/theme';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DiagnosticsWidget } from '@/components/composed/DiagnosticsWidget';
import type { Patient } from '@/lib/types';

// Navigation items per specification
const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/session/new', icon: FileText, label: 'Documents' },
  { to: '/medications', icon: Pill, label: 'Medications' },
  { to: '/history', icon: Clock, label: 'History & Timeline' },
  { to: '/brief', icon: ClipboardList, label: 'Doctor Brief' },
  { to: '/translate-explain', icon: Languages, label: 'Translate & Explain' },
  { to: '/emergency', icon: AlertOctagon, label: 'Emergency', alert: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const SECONDARY_NAV = [
  { to: '/privacy', icon: Shield, label: 'Privacy' },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/session/new': 'Documents & Care Session',
  '/session/flow': 'Document Understanding',
  '/patients': 'Patients & Records',
  '/medications': 'Medications & Prescriptions',
  '/emergency': 'Emergency Mode',
  '/guidance': 'Care Guidance',
  '/brief': 'Doctor Visit Brief',
  '/translate-explain': 'Translate & Plain Explanation',
  '/history': 'History & Session Timeline',
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

  const { t } = useLanguage();
  const { user, logout, openAuthModal, patients, activePatient, setActivePatient, openOnboarding, openLoadDemoModal } = useAuth();
  const effectiveActivePatient = activePatient || (patients.length > 0 ? patients[0] : null);
  const location = useLocation();
  const currentTitle = PAGE_TITLES[location.pathname] || 'CareCue';

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isNavActive = (itemTo: string) => {
    if (itemTo.includes('?')) {
      const [path, query] = itemTo.split('?');
      return location.pathname === path && location.search.includes(query);
    }
    return location.pathname === itemTo && !location.search.includes('tab=');
  };

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* ─── 1. Desktop Collapsible Sidebar ─── */}
      <aside
        aria-label="Sidebar navigation"
        className={cn(
          'hidden md:flex flex-col border-r border-border-subtle bg-bg-surface transition-[width] duration-300 ease-out z-20 shrink-0 select-none',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {/* Top Header: Logo + Collapse Toggle */}
        {!collapsed ? (
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle/60 min-h-[64px]">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-3 no-underline group focus-visible:ring-2 focus-visible:ring-accent-teal rounded-xl"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-teal to-accent-teal-dark flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Heart className="w-5 h-5 text-text-inverse" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-text-primary leading-none">
                  CareCue
                </span>
                <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mt-0.5">
                  Clinical Care
                </span>
              </div>
            </NavLink>

            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-3 border-b border-border-subtle/60 min-h-[64px] gap-1.5">
            <NavLink
              to="/dashboard"
              className="p-1 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-teal"
              title="CareCue Dashboard"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-teal to-accent-teal-dark flex items-center justify-center shrink-0 shadow-sm hover:scale-105 transition-transform">
                <Heart className="w-5 h-5 text-text-inverse" strokeWidth={2.5} />
              </div>
            </NavLink>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Patient Area in Sidebar */}
        {!collapsed ? (
          <div className="p-3 border-b border-border-subtle/60 bg-bg-secondary/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                Current Patient
              </span>
              {effectiveActivePatient && (
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary border border-border-default">
                  {effectiveActivePatient.patientId || effectiveActivePatient.id}
                </span>
              )}
            </div>

            {patients.length > 0 ? (
              <div className="space-y-1.5">
                <div className="relative">
                  <select
                    value={effectiveActivePatient?.patientId || effectiveActivePatient?.id || ''}
                    onChange={(e) => {
                      const selected = patients.find((p: Patient) => (p.patientId || p.id) === e.target.value);
                      if (selected) setActivePatient(selected);
                    }}
                    className="w-full text-xs font-semibold bg-bg-surface border border-border-default rounded-lg px-2.5 py-1.5 text-text-primary appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-teal pr-7 truncate"
                  >
                    {patients.map((p: Patient) => (
                      <option key={p.patientId || p.id} value={p.patientId || p.id}>
                        {p.name} ({p.relationship || 'Self'}{p.isDemo ? ' · DEMO' : ''})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-text-tertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => openOnboarding()}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-accent-teal/10 hover:bg-accent-teal/20 text-accent-teal-dark text-[11px] font-semibold transition-colors cursor-pointer border border-accent-teal/20"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openLoadDemoModal()}
                    className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-bg-surface hover:bg-bg-secondary text-text-secondary text-[11px] font-medium transition-colors cursor-pointer border border-border-default"
                    title="Load Synthetic Demo Patient"
                  >
                    <Database className="w-3 h-3" />
                    <span>Demo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-bg-surface rounded-lg p-2.5 text-center border border-dashed border-border-strong space-y-1.5">
                <p className="text-[11px] text-text-secondary font-semibold">0 Patients Loaded</p>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => openOnboarding()}
                    className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-accent-teal text-text-inverse text-[11px] font-bold shadow-xs hover:bg-accent-teal-dark transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openLoadDemoModal()}
                    className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 text-text-tertiary hover:text-text-primary text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    Load Demo Patient
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 border-b border-border-subtle/60 flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => openOnboarding()}
              title="Add Patient"
              className="w-10 h-10 rounded-xl bg-accent-teal/10 text-accent-teal flex items-center justify-center hover:bg-accent-teal/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Primary 10 Nav Items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const active = isNavActive(item.to);
            return (
              <div key={item.to} className="relative group">
                <NavLink
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 rounded-xl text-xs font-semibold transition-colors no-underline',
                    collapsed ? 'w-10 h-9 justify-center mx-auto' : 'px-3 py-2',
                    item.alert
                      ? active
                        ? 'bg-status-error/15 text-status-error font-bold shadow-xs'
                        : 'text-status-error hover:bg-status-error/10 hover:text-status-error'
                      : active
                        ? 'bg-accent-teal-light text-accent-teal-dark shadow-xs font-bold'
                        : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.alert && (
                        <span className="ml-auto text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-status-error/15 text-status-error font-bold">
                          SOS
                        </span>
                      )}
                    </>
                  )}
                </NavLink>

                {collapsed && (
                  <div
                    role="tooltip"
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 rounded-lg bg-text-primary text-text-inverse text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md"
                  >
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer: Secondary Nav & User Account */}
        <div className="px-3 py-2 border-t border-border-subtle/60 space-y-1">
          {SECONDARY_NAV.map(item => (
            <div key={item.to} className="relative group">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl text-xs font-semibold transition-colors no-underline',
                    collapsed ? 'w-10 h-8 justify-center mx-auto' : 'px-3 py-1.5',
                    isActive
                      ? 'bg-accent-teal-light text-accent-teal-dark shadow-xs'
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </div>
          ))}

          {!collapsed && (
            <div className="pt-2 border-t border-border-subtle/40">
              {user ? (
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-bg-secondary/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-accent-teal/20 text-accent-teal-dark flex items-center justify-center text-xs font-bold shrink-0">
                      {user.firstName[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{user.firstName} {user.lastName}</p>
                      <p className="text-[10px] text-text-tertiary truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    title="Sign Out"
                    className="p-1 rounded text-text-tertiary hover:text-status-error transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openAuthModal('signin')}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-bg-secondary hover:bg-border-subtle text-text-primary text-[11px] font-semibold transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('signup')}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-accent-teal text-text-inverse text-[11px] font-bold shadow-xs hover:bg-accent-teal-dark transition-colors"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main Content Container with Desktop Top Header ─── */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* Desktop Header Bar */}
        <header className="hidden md:flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 border-b border-border-subtle/70 bg-bg-surface/90 backdrop-blur-md min-h-[64px] z-10 gap-3 sm:gap-4 select-none">
          {/* Left: Breadcrumbs & Active Patient */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-text-tertiary shrink-0">
              <span className="tracking-wider uppercase font-bold text-[11px] text-text-tertiary">
                CareCue
              </span>
              <span className="text-border-strong text-xs select-none">/</span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-text-primary tracking-tight truncate max-w-[180px] lg:max-w-[260px] xl:max-w-[360px]">
              {currentTitle}
            </h1>

            {effectiveActivePatient && (
              <div className="hidden xl:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-teal/10 border border-accent-teal/20 text-xs shadow-2xs shrink-0 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-accent-teal animate-pulse shrink-0" />
                <span className="text-text-tertiary text-[11px] font-medium">Active:</span>
                <span className="font-bold text-text-primary truncate max-w-[130px]">
                  {effectiveActivePatient.name}
                </span>
                <span className="font-mono text-[10px] text-accent-teal-dark px-1.5 py-0.5 rounded bg-bg-surface/90 border border-accent-teal/25 font-semibold shrink-0">
                  {effectiveActivePatient.patientId || effectiveActivePatient.id}
                </span>
              </div>
            )}
          </div>

          {/* Right: Diagnostics, Theme Selector & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
            <DiagnosticsWidget />

            <div className="hidden xl:block shrink-0">
              <ThemeToggle variant="segmented" />
            </div>
            <div className="block xl:hidden shrink-0">
              <ThemeToggle variant="compact" />
            </div>

            {user ? (
              <div className="flex items-center gap-2.5 sm:gap-3 pl-2.5 sm:pl-3.5 border-l border-border-subtle shrink-0">
                <div className="w-8 h-8 rounded-full bg-accent-teal/15 text-accent-teal-dark border border-accent-teal/30 flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                  {user.firstName[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden 2xl:flex flex-col text-left whitespace-nowrap">
                  <span className="text-[10px] font-medium text-text-tertiary leading-none">
                    {getGreeting()}
                  </span>
                  <span className="text-xs font-bold text-text-primary leading-tight mt-0.5">
                    {user.firstName} {user.lastName || ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-status-error hover:bg-status-error/10 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2.5 sm:pl-3.5 border-l border-border-subtle shrink-0">
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-accent-teal text-text-inverse hover:bg-accent-teal-dark shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Mobile Top Bar (390px Viewport) */}
        <header className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-bg-surface min-h-[54px] z-10">
          <NavLink to="/dashboard" className="flex items-center gap-2 no-underline">
            <div className="w-7 h-7 rounded-lg bg-accent-teal flex items-center justify-center shadow-xs">
              <Heart className="w-3.5 h-3.5 text-text-inverse" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-text-primary">CareCue</span>
          </NavLink>

          <div className="flex items-center gap-2">
            <DiagnosticsWidget />
            <ThemeToggle variant="compact" />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-primary transition-colors cursor-pointer"
              aria-label="Open navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Slide-in Drawer Sheet */}
        <AnimatePresence>
          {mobileOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                aria-hidden="true"
              />

              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="relative w-4/5 max-w-xs bg-bg-surface border-r border-border-default shadow-2xl h-full flex flex-col p-4 z-10 overflow-y-auto"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
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

                {/* Patient section in mobile */}
                <div className="py-3 border-b border-border-subtle">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                      Patient
                    </span>
                    {effectiveActivePatient && (
                      <span className="text-[10px] font-mono text-text-secondary">
                        {effectiveActivePatient.patientId || effectiveActivePatient.id}
                      </span>
                    )}
                  </div>
                  {effectiveActivePatient ? (
                    <div className="p-2 rounded-lg bg-bg-secondary text-xs font-semibold text-text-primary mb-2">
                      {effectiveActivePatient.name} ({effectiveActivePatient.relationship || 'Self'})
                    </div>
                  ) : (
                    <p className="text-xs text-text-tertiary mb-2">No patient loaded</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setMobileOpen(false); openOnboarding(); }}
                      className="flex-1 py-1 px-2 rounded-lg bg-accent-teal text-text-inverse text-xs font-bold shadow-xs"
                    >
                      + Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMobileOpen(false); openLoadDemoModal(); }}
                      className="flex-1 py-1 px-2 rounded-lg bg-bg-secondary text-text-secondary text-xs font-semibold border border-border-default"
                    >
                      Demo
                    </button>
                  </div>
                </div>

                {/* Mobile Drawer 10 Links */}
                <nav className="flex-1 py-3 space-y-1">
                  {NAV_ITEMS.map(item => {
                    const active = isNavActive(item.to);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors no-underline',
                          item.alert
                            ? active ? 'bg-status-error/15 text-status-error font-bold' : 'text-status-error'
                            : active
                              ? 'bg-accent-teal-light text-accent-teal-dark font-bold'
                              : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>

                {/* Mobile Drawer Auth */}
                <div className="pt-3 border-t border-border-subtle">
                  {user ? (
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold text-text-primary">{user.firstName} {user.lastName}</p>
                        <p className="text-[10px] text-text-tertiary">{user.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={logout}
                        className="text-xs text-status-error font-semibold"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => { setMobileOpen(false); openAuthModal('signin'); }}
                        className="flex-1 py-1.5 rounded-lg bg-bg-secondary text-xs font-semibold text-text-primary"
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMobileOpen(false); openAuthModal('signup'); }}
                        className="flex-1 py-1.5 rounded-lg bg-accent-teal text-xs font-bold text-text-inverse"
                      >
                        Register
                      </button>
                    </div>
                  )}
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
              key={location.pathname + location.search}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ─── Mobile Bottom Navigation (390px Viewport) ─── */}
        <nav
          aria-label="Mobile bottom navigation"
          className="md:hidden flex items-center justify-around border-t border-border-subtle bg-bg-surface/95 backdrop-blur-sm py-1.5 px-1 z-20 shrink-0"
        >
          {NAV_ITEMS.slice(0, 5).map(item => {
            const active = isNavActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[9px] font-semibold no-underline transition-colors',
                  item.alert
                    ? active ? 'text-status-error font-bold' : 'text-status-error/80'
                    : active ? 'text-accent-teal font-bold' : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
