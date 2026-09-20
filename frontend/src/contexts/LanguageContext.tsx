import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Language } from '@/lib/types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'carecue-language';

const UI_DICTIONARY: Record<Language, Record<string, string>> = {
  en: {
    'Good morning': 'Good morning',
    'Good afternoon': 'Good afternoon',
    'Good evening': 'Good evening',
    'Good night': 'Good night',
    'Overview': 'Overview',
    'Emergency Mode': 'Emergency Mode',
    'CALL EMERGENCY': 'CALL EMERGENCY',
    'GET LOCATION': 'GET LOCATION',
    'SHARE LOCATION': 'SHARE LOCATION',
  },
  hi: {
    'Good morning': 'सुप्रभात',
    'Good afternoon': 'शुभ दोपहर',
    'Good evening': 'शुभ संध्या',
    'Good night': 'शुभ रात्रि',
    'Overview': 'अवलोकन',
    'Emergency Mode': 'आपातकालीन मोड',
    'CALL EMERGENCY': 'आपातकालीन कॉल',
    'GET LOCATION': 'स्थान प्राप्त करें',
    'SHARE LOCATION': 'स्थान साझा करें',
  },
  bn: {
    'Good morning': 'সুপ্রভাত',
    'Good afternoon': 'শুভ অপরাহ্ন',
    'Good evening': 'শুভ সন্ধ্যা',
    'Good night': 'শুভ রাত্রি',
    'Overview': 'ওভারভিউ',
    'Emergency Mode': 'জরুরী মোড',
    'CALL EMERGENCY': 'জরুরী কল',
    'GET LOCATION': 'অবস্থান পান',
    'SHARE LOCATION': 'অবস্থান শেয়ার করুন',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored === 'en' || stored === 'hi' || stored === 'bn') {
        return stored as Language;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback((key: string) => {
    return UI_DICTIONARY[language]?.[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
