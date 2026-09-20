import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/types';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  className?: string;
  size?: 'sm' | 'md';
}

const LANGUAGES: Array<{ code: Language; name: string; native: string }> = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
];

export function LanguageSelector({ currentLanguage, onLanguageChange, className, size = 'sm' }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLang = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];

  return (
    <div className={cn('relative inline-block text-left', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-surface text-text-primary hover:bg-bg-surface-hover hover:border-accent-teal/40 transition-all font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-accent-teal/30',
          size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Translate content"
      >
        <Globe className={cn('text-accent-teal', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        <span className="font-semibold">{activeLang.native}</span>
        <ChevronDown className={cn('text-text-muted transition-transform duration-200', isOpen && 'rotate-180', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-40 rounded-xl bg-bg-surface border border-border-subtle shadow-lg z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-subtle/50 mb-1">
            Language / भाषा
          </div>
          {LANGUAGES.map(lang => {
            const isSelected = lang.code === currentLanguage;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  onLanguageChange(lang.code);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors',
                  isSelected
                    ? 'bg-accent-teal/10 text-accent-teal-dark font-semibold'
                    : 'text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary'
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{lang.native}</span>
                  <span className="text-[10px] text-text-muted">({lang.name})</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-accent-teal" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
