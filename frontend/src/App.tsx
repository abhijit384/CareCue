import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { AuthPage } from '@/pages/AuthPage';
import { Dashboard } from '@/pages/Dashboard';
import { SessionSelect } from '@/pages/session/SessionSelect';
import { SessionFlow } from '@/pages/session/SessionFlow';
import { CareGuidance } from '@/pages/CareGuidance';
import { DoctorBriefPage } from '@/pages/DoctorBriefPage';
import { History } from '@/pages/History';
import { PrivacyCenter } from '@/pages/PrivacyCenter';
import { Settings } from '@/pages/Settings';
import { Patients } from '@/pages/Patients';
import { Medications } from '@/pages/Medications';
import { EmergencyMode } from '@/pages/EmergencyMode';
import { TranslateExplain } from '@/pages/TranslateExplain';
import { PatientOnboardingModal } from '@/components/composed/PatientOnboardingModal';
import { LoadDemoModal } from '@/components/composed/LoadDemoModal';

function AppContent() {
  const { isAuthenticated } = useAuth();

  // If not authenticated, the first screen is ALWAYS Sign Up / AuthPage
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/session/new" element={<SessionSelect />} />
          <Route path="/session/flow" element={<SessionFlow />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/medications" element={<Medications />} />
          <Route path="/brief" element={<DoctorBriefPage />} />
          <Route path="/translate-explain" element={<TranslateExplain />} />
          <Route path="/emergency" element={<EmergencyMode />} />
          <Route path="/guidance" element={<CareGuidance />} />
          <Route path="/history" element={<History />} />
          <Route path="/privacy" element={<PrivacyCenter />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>

      <PatientOnboardingModal />
      <LoadDemoModal />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
