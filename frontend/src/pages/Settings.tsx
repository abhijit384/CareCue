import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  User,
  Sliders,
  Eye,
  Shield,
  Sparkles,
  CheckCircle2,
  Info,
  BadgeCheck,
  Heart,
  FolderHeart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/lib/theme';
import { Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function Settings() {
  const { user, activePatient, patients, isAuthenticated, openAuthModal } = useAuth();

  // Compute default display name from authenticated user or active patient
  const defaultDisplayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    : (activePatient?.name || 'CareCue User');

  // Profile state
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('carecue_custom_display_name') || defaultDisplayName;
  });

  const [caregiverMode, setCaregiverMode] = useState(() => {
    return localStorage.getItem('carecue_caregiver_mode') === 'true';
  });

  // Sync display name when user or active patient changes if not manually overridden
  useEffect(() => {
    const saved = localStorage.getItem('carecue_custom_display_name');
    if (!saved) {
      setUserName(defaultDisplayName);
    }
  }, [defaultDisplayName]);

  // Preferences
  const [readingLevel, setReadingLevel] = useState<'plain' | 'clinical'>(() => {
    return (localStorage.getItem('carecue_reading_level') as any) || 'plain';
  });
  const [autoOpenEvidence, setAutoOpenEvidence] = useState(() => {
    const saved = localStorage.getItem('carecue_auto_open_evidence');
    return saved !== null ? saved === 'true' : true;
  });

  // Accessibility
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('carecue_high_contrast') === 'true';
  });
  const [largeText, setLargeText] = useState(() => {
    return localStorage.getItem('carecue_large_text') === 'true';
  });
  const [reducedMotion, setReducedMotion] = useState(() => {
    return localStorage.getItem('carecue_reduced_motion') === 'true';
  });

  // Privacy preferences
  const [autoClearOnExit, setAutoClearOnExit] = useState(() => {
    const saved = localStorage.getItem('carecue_auto_clear');
    return saved !== null ? saved === 'true' : true;
  });
  const [strictMinimization, setStrictMinimization] = useState(() => {
    const saved = localStorage.getItem('carecue_strict_min');
    return saved !== null ? saved === 'true' : true;
  });

  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    localStorage.setItem('carecue_custom_display_name', userName);
    localStorage.setItem('carecue_caregiver_mode', String(caregiverMode));
    localStorage.setItem('carecue_reading_level', readingLevel);
    localStorage.setItem('carecue_auto_open_evidence', String(autoOpenEvidence));
    localStorage.setItem('carecue_high_contrast', String(highContrast));
    localStorage.setItem('carecue_large_text', String(largeText));
    localStorage.setItem('carecue_reduced_motion', String(reducedMotion));
    localStorage.setItem('carecue_auto_clear', String(autoClearOnExit));
    localStorage.setItem('carecue_strict_min', String(strictMinimization));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="w-full max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 box-border">
      {/* Save confirmation toast */}
      <AnimatePresence>
        {savedToast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-teal text-text-inverse text-xs font-semibold shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4" />
            Preferences saved successfully
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-teal-light text-accent-teal-dark text-xs font-semibold mb-2.5">
          <SettingsIcon className="w-3.5 h-3.5" />
          System Preferences
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Customize display readability, health profiles, privacy boundaries, and clinical preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* ─── 1. PROFILE & ACCOUNT ─── */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-accent-teal" />
              <h2 className="text-base font-bold text-text-primary">Profile & Account</h2>
            </div>
            {isAuthenticated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-teal/10 text-accent-teal-dark text-[11px] font-semibold border border-accent-teal/20">
                <BadgeCheck className="w-3 h-3 text-accent-teal" />
                Verified Account
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-border-default bg-bg-primary text-text-primary focus:outline-hidden focus:border-accent-teal"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                  Account Email
                </label>
                <div className="px-3.5 py-2 text-sm rounded-xl border border-border-subtle bg-bg-secondary/50 text-text-primary flex items-center justify-between">
                  <span className="truncate">{user?.email || 'Local Offline Vault'}</span>
                  {!isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => openAuthModal('signin')}
                      className="text-xs font-bold text-accent-teal hover:underline ml-2 cursor-pointer shrink-0"
                    >
                      Sign In →
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Health Profile Indicator */}
            {activePatient && (
              <div className="p-3.5 rounded-xl bg-accent-teal-light/30 border border-accent-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 text-accent-teal" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary">
                        Active Health Chart: {activePatient.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded bg-accent-teal/20 text-accent-teal-dark font-semibold">
                        {activePatient.relationship || 'Self'}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Patient ID: <code className="font-mono text-[10px]">{activePatient.patientId}</code> · {activePatient.documentCount || 0} attached records
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-semibold text-text-primary">Caregiver Mode</p>
                <p className="text-xs text-text-secondary">
                  Adapts wording to review reports on behalf of a family member or dependent.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={caregiverMode}
                onClick={() => setCaregiverMode(!caregiverMode)}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                  caregiverMode ? 'bg-accent-teal' : 'bg-border-default'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5',
                    caregiverMode && 'translate-x-5'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ─── APPEARANCE & THEME ─── */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border-subtle">
            <Sun className="w-4 h-4 text-accent-teal" />
            <h2 className="text-base font-bold text-text-primary">Appearance & Theme</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-text-primary">Color Theme</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Switch between warm clinical Light, deep navy Dark, or follow your system preferences.
              </p>
            </div>
            <ThemeToggle variant="segmented" />
          </div>
        </div>

        {/* ─── 2. PREFERENCES ─── */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border-subtle">
            <Sliders className="w-4 h-4 text-accent-teal" />
            <h2 className="text-base font-bold text-text-primary">Information Preferences</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-2">
                Explanation Depth
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setReadingLevel('plain')}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all cursor-pointer',
                    readingLevel === 'plain'
                      ? 'border-accent-teal bg-accent-teal-light/40 text-accent-teal-dark font-semibold'
                      : 'border-border-default hover:bg-bg-secondary text-text-secondary'
                  )}
                >
                  <p className="text-xs font-bold">Plain Language</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">Everyday concepts & analogies</p>
                </button>
                <button
                  type="button"
                  onClick={() => setReadingLevel('clinical')}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all cursor-pointer',
                    readingLevel === 'clinical'
                      ? 'border-accent-teal bg-accent-teal-light/40 text-accent-teal-dark font-semibold'
                      : 'border-border-default hover:bg-bg-secondary text-text-secondary'
                  )}
                >
                  <p className="text-xs font-bold">Detailed Clinical</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">Biomarker units & reference ranges</p>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-semibold text-text-primary">Auto-expand Evidence on Results</p>
                <p className="text-xs text-text-secondary">
                  Automatically show source document quotes under each insight.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoOpenEvidence}
                onClick={() => setAutoOpenEvidence(!autoOpenEvidence)}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                  autoOpenEvidence ? 'bg-accent-teal' : 'bg-border-default'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5',
                    autoOpenEvidence && 'translate-x-5'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ─── 3. ACCESSIBILITY ─── */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border-subtle">
            <Eye className="w-4 h-4 text-accent-teal" />
            <h2 className="text-base font-bold text-text-primary">Accessibility</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">High Contrast Borders</p>
                <p className="text-xs text-text-secondary">
                  Increases border weights and contrast for low-vision readability.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={highContrast}
                onClick={() => setHighContrast(!highContrast)}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                  highContrast ? 'bg-accent-teal' : 'bg-border-default'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5',
                    highContrast && 'translate-x-5'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">Comfortable Typography Scale</p>
                <p className="text-xs text-text-secondary">
                  Enlarges baseline font sizing across card summaries.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={largeText}
                onClick={() => setLargeText(!largeText)}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                  largeText ? 'bg-accent-teal' : 'bg-border-default'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5',
                    largeText && 'translate-x-5'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">Reduce Motion</p>
                <p className="text-xs text-text-secondary">
                  Suppresses spring animations and decorative transitions.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={reducedMotion}
                onClick={() => setReducedMotion(!reducedMotion)}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                  reducedMotion ? 'bg-accent-teal' : 'bg-border-default'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5',
                    reducedMotion && 'translate-x-5'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ─── 4. PRIVACY PREFERENCES ─── */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border-subtle">
            <Shield className="w-4 h-4 text-accent-teal" />
            <h2 className="text-base font-bold text-text-primary">Privacy Preferences</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">Auto-clear Session on Exit</p>
                <p className="text-xs text-text-secondary">
                  Purges session tokens and temporary OCR caches when browser window closes.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoClearOnExit}
                onClick={() => setAutoClearOnExit(!autoClearOnExit)}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                  autoClearOnExit ? 'bg-accent-teal' : 'bg-border-default'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5',
                    autoClearOnExit && 'translate-x-5'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">Strict Name & ID Minimization</p>
                <p className="text-xs text-text-secondary">
                  Always replace names, addresses, and phone numbers before dual AI checks.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={strictMinimization}
                onClick={() => setStrictMinimization(!strictMinimization)}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                  strictMinimization ? 'bg-accent-teal' : 'bg-border-default'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5',
                    strictMinimization && 'translate-x-5'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ─── 5. SAVE & PERSISTENCE ─── */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Info className="w-4 h-4 text-accent-teal shrink-0" />
              <span>All preferences are stored securely on your local device vault.</span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-accent-teal text-text-inverse text-xs font-bold hover:bg-accent-teal-dark transition-colors shadow-xs cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
