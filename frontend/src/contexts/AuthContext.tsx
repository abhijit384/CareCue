import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Patient } from '@/lib/types';
import { patientService } from '@/services';
import { authClient } from '@/services/authClient';

export type AuthModalMode = 'signin' | 'signup' | 'otp' | 'forgot_email' | 'forgot_otp' | 'forgot_reset';

interface AuthContextType {
  user: User | null;
  token: string | null;
  patients: Patient[];
  activePatient: Patient | null;
  setActivePatient: (p: Patient | null) => void;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  isOnboardingOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  isLoadDemoOpen: boolean;
  openLoadDemoModal: () => void;
  closeLoadDemoModal: () => void;
  login: (user: User, token: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  refreshActivePatient: (preferredIdOrOpenIfEmpty?: string | boolean) => Promise<void>;
  refreshPatients: (preferredIdOrOpenIfEmpty?: string | boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'carecue_user';
const TOKEN_STORAGE_KEY = 'carecue_token';
const LEGACY_ACTIVE_PATIENT_KEY = 'carecue_active_patient_id';

function activePatientKey(userId: string) {
  return `carecue_active_patient_id:${userId}`;
}

function clearAccountScopedState() {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_ACTIVE_PATIENT_KEY);
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('carecue_active_patient_id:') ||
          key.startsWith('carecue_patients:') ||
          key.startsWith('carecue_docs:') ||
          key.startsWith('carecue_brief:') ||
          key.startsWith('carecue_translate:'))
      ) {
        toRemove.push(key);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatientState] = useState<Patient | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signin');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isLoadDemoOpen, setIsLoadDemoOpen] = useState(false);

  const refreshActivePatient = useCallback(async (preferredIdOrOpenIfEmpty?: string | boolean) => {
    const storedUser = (() => {
      try { return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null'); } catch { return null; }
    })();
    const userScopeKey = storedUser?.userId ? activePatientKey(storedUser.userId) : activePatientKey('session_guest');
    const openIfEmpty = typeof preferredIdOrOpenIfEmpty === 'boolean' ? preferredIdOrOpenIfEmpty : false;
    const preferredPatientId = typeof preferredIdOrOpenIfEmpty === 'string' ? preferredIdOrOpenIfEmpty : undefined;

    try {
      const rawList = await patientService.list();
      const list = (rawList || []).map(p => ({
        ...p,
        id: p.patientId,
      }));
      setPatients([...list]);

      const targetId = preferredPatientId || localStorage.getItem(userScopeKey);
      if (targetId) {
        const found = list.find(p => p.patientId === targetId);
        if (found) {
          setActivePatientState(found);
          localStorage.setItem(userScopeKey, found.patientId);
          if (openIfEmpty && list.length === 0) setIsOnboardingOpen(true);
          return;
        }
      }
      if (list.length > 0) {
        setActivePatientState(list[0]);
        localStorage.setItem(userScopeKey, list[0].patientId);
      } else {
        setActivePatientState(null);
        localStorage.removeItem(userScopeKey);
        if (openIfEmpty) {
          setIsOnboardingOpen(true);
        }
      }
    } catch {
      setPatients([]);
      setActivePatientState(null);
      if (openIfEmpty) setIsOnboardingOpen(true);
    }
  }, []);

  useEffect(() => {
    refreshActivePatient(false);
  }, [refreshActivePatient]);

  const setActivePatient = (p: Patient | null) => {
    const userId = user?.userId;
    if (p) {
      const normalized = { ...p, id: p.patientId };
      setActivePatientState(normalized);
      if (userId) localStorage.setItem(activePatientKey(userId), p.patientId);
    } else {
      setActivePatientState(null);
      if (userId) localStorage.removeItem(activePatientKey(userId));
    }
  };

  const login = async (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    setPatients([]);
    setActivePatientState(null);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
      localStorage.removeItem(LEGACY_ACTIVE_PATIENT_KEY);
    } catch {}
    setIsAuthModalOpen(false);
    await refreshActivePatient(true);
  };

  const demoLogin = async () => {
    try {
      const res = await authClient.demoSignin();
      if (res.user && res.token) {
        await login(res.user, res.token);
        return;
      }
      throw new Error(res.message || 'Failed to sign in as demo user');
    } catch (err) {
      // Offline fallback demo user for maximum resilience
      const fallbackUser: User = {
        userId: 'USR-DEMO01',
        email: 'demo@carecue.health',
        firstName: 'Demo',
        lastName: 'User',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await login(fallbackUser, `sess-demo-${Date.now()}`);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPatients([]);
    setActivePatientState(null);
    setIsOnboardingOpen(false);
    setIsLoadDemoOpen(false);
    clearAccountScopedState();
  };

  const openAuthModal = (mode: AuthModalMode = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);
  const openOnboarding = () => setIsOnboardingOpen(true);
  const closeOnboarding = () => setIsOnboardingOpen(false);
  const openLoadDemoModal = () => setIsLoadDemoOpen(true);
  const closeLoadDemoModal = () => setIsLoadDemoOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        patients,
        activePatient,
        setActivePatient,
        isAuthenticated: !!user && !!token,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        isOnboardingOpen,
        openOnboarding,
        closeOnboarding,
        isLoadDemoOpen,
        openLoadDemoModal,
        closeLoadDemoModal,
        login,
        demoLogin,
        logout,
        refreshActivePatient: (arg) => refreshActivePatient(arg),
        refreshPatients: (arg) => refreshActivePatient(arg),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
