import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, BookOpen, MessageSquare, ShieldCheck, Loader2, Play, Square } from 'lucide-react';
import { explainService, translationService } from '@/services';
import type { ExplanationLevel, ExplanationResult } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTTS } from '@/hooks/useTTS';

interface ExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  findingTitle: string;
  value?: string;
  referenceRange?: string;
  sourceQuote?: string;
}

export function ExplainModal({
  isOpen,
  onClose,
  findingTitle,
  value,
  referenceRange,
  sourceQuote,
}: ExplainModalProps) {
  const [level, setLevel] = useState<ExplanationLevel>('standard');
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null);

  const { language } = useLanguage();
  const { play, stop, isPlaying, supported } = useTTS(language);

  useEffect(() => {
    if (isOpen && findingTitle) {
      setLoading(true);
      explainService
        .explain({
          findingTitle,
          value,
          referenceRange,
          sourceQuote,
          level,
        })
        .then(async res => {
          if (language !== 'en') {
            res.explainedSimply = await translationService.translateText(res.explainedSimply, language);
            res.whyItAppears = await translationService.translateText(res.whyItAppears, language);
            res.whatToDiscuss = await Promise.all(res.whatToDiscuss.map(q => translationService.translateText(q, language)));
          }
          setExplanation(res);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [isOpen, findingTitle, value, referenceRange, sourceQuote, level, language]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-2xl bg-bg-surface border border-border-subtle shadow-xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-gradient-to-r from-bg-surface via-bg-surface to-accent-teal/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-accent-teal" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary tracking-tight">
                  Explain Health Information
                </h3>
                <p className="text-[11px] text-text-muted">
                  Simplified, non-diagnostic understanding
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Biomarker Subheader */}
          <div className="px-6 py-3 bg-bg-surface-secondary/50 border-b border-border-subtle flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-text-primary">{findingTitle}</span>
              {value && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md bg-accent-teal/10 text-accent-teal-dark text-[11px] font-bold">
                  {value}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* TTS Listen Button */}
              {supported && explanation && (
                <button
                  type="button"
                  onClick={() => isPlaying ? stop() : play(explanation.explainedSimply)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-teal/10 text-accent-teal-dark hover:bg-accent-teal/20 text-[11px] font-bold transition-colors shadow-xs border border-accent-teal/20"
                >
                  {isPlaying ? <Square className="w-3.5 h-3.5" fill="currentColor" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
                  {isPlaying ? 'STOP' : 'LISTEN'}
                </button>
              )}

              {/* Level Selector: STANDARD vs BEGINNER */}
              <div className="flex items-center p-0.5 rounded-lg bg-bg-surface border border-border-subtle text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLevel('standard')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all text-[11px]',
                    level === 'standard'
                      ? 'bg-accent-teal text-text-inverse shadow-xs'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  STANDARD
                </button>
                <button
                  type="button"
                  onClick={() => setLevel('beginner')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all text-[11px]',
                    level === 'beginner'
                      ? 'bg-accent-teal text-text-inverse shadow-xs'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                  title="Explains unfamiliar healthcare terms in very simple language"
                >
                  BEGINNER
                </button>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 text-sm">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-muted">
                <Loader2 className="w-6 h-6 animate-spin text-accent-teal" />
                <span className="text-xs">Preparing simple explanation...</span>
              </div>
            ) : explanation ? (
              <>
                {/* 1. EXPLAINED SIMPLY */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent-teal-dark">
                    <BookOpen className="w-3.5 h-3.5 text-accent-teal" />
                    <span>Explained Simply</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-accent-teal/5 border border-accent-teal/20 text-text-primary text-xs leading-relaxed">
                    {explanation.explainedSimply}
                  </div>
                </div>

                {/* 2. WHY IT APPEARS IN YOUR REPORT */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-primary">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent-teal" />
                    <span>Why It Appears in Your Report</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-bg-surface-secondary border border-border-subtle text-text-secondary text-xs leading-relaxed">
                    {explanation.whyItAppears}
                  </div>
                </div>

                {/* 3. WHAT TO DISCUSS */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-primary">
                    <MessageSquare className="w-3.5 h-3.5 text-accent-teal" />
                    <span>What to Discuss with Your Doctor</span>
                  </div>
                  <ul className="space-y-2 text-xs text-text-secondary">
                    {explanation.whatToDiscuss.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-bg-surface-secondary/60 border border-border-subtle/60">
                        <span className="w-4 h-4 rounded-full bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-snug">{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="text-xs text-text-muted">No explanation available.</p>
            )}
          </div>

          {/* Footer Disclaimer */}
          <div className="px-6 py-3 border-t border-border-subtle bg-bg-surface-secondary/40 text-[10px] text-text-muted leading-relaxed">
            CareCue explanations are informational and non-diagnostic. Never adjust medications without direct advice from your licensed physician.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
