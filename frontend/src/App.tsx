import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme';
import { AppShell } from '@/components/layout/AppShell';
import { Landing } from '@/pages/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { SessionSelect } from '@/pages/session/SessionSelect';
import { SessionFlow } from '@/pages/session/SessionFlow';
import { CareGuidance } from '@/pages/CareGuidance';
import { DoctorBriefPage } from '@/pages/DoctorBriefPage';
import { History } from '@/pages/History';
import { PrivacyCenter } from '@/pages/PrivacyCenter';
import { Settings } from '@/pages/Settings';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/session/new" element={<SessionSelect />} />
            <Route path="/session/flow" element={<SessionFlow />} />
            <Route path="/guidance" element={<CareGuidance />} />
            <Route path="/brief" element={<DoctorBriefPage />} />
            <Route path="/history" element={<History />} />
            <Route path="/privacy" element={<PrivacyCenter />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
