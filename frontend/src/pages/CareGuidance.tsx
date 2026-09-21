import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowRight, Loader2, Sparkles, HelpCircle, AlertTriangle } from 'lucide-react';
import { SafetyAlert } from '@/components/composed/SafetyAlert';
import { VerificationBadge } from '@/components/composed/VerificationBadge';
import { useAuth } from '@/contexts/AuthContext';
import { guidanceService } from '@/services';
import { GUIDANCE_EXAMPLE_PROMPTS } from '@/services/mockData';
import type { GuidanceResponse } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CareGuidance() {
  const { activePatient } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'searching...' | 'loading...'>('searching...');
  const [response, setResponse] = useState<GuidanceResponse | null>(null);

  const handleSubmit = useCallback(async (q?: string) => {
    const input = q || question;
    if (!input.trim()) return;

    setLoading(true);
    setLoadingPhase('searching...');
    setResponse(null);

    const timer = setTimeout(() => {
      setLoadingPhase('loading...');
    }, 1500);

    try {
      const activeId = activePatient?.patientId;
      const result = await guidanceService.query(input, activeId);
      setResponse(result);
    } catch (err) {
      console.error('[CareGuidance] Query failed:', err);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [question, activePatient]);

  const handleExample = (prompt: string) => {
    setQuestion(prompt);
    handleSubmit(prompt);
  };

  const isSafetyRedirect = Boolean(response?.safetyNote);
  const isNonMedical = response?.answer?.includes("We can't answer questions which are not related to medical");

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ai-lavender-light text-ai-lavender-dark text-xs font-semibold mb-2.5">
          <Sparkles className="w-3.5 h-3.5" />
          Cross-Checked Health Guidance
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          Care Guidance
        </h1>
        <p className="text-sm text-text-secondary mt-1 max-w-xl leading-relaxed">
          Ask a health question to receive clear, structured educational explanations verified across dual AI models.
        </p>
      </motion.div>

      {/* Input Box */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 sm:mt-8"
      >
        <div className="relative bg-bg-surface border border-border-default rounded-2xl shadow-xs focus-within:border-accent-teal focus-within:ring-2 focus-within:ring-accent-teal/20 transition-all p-2">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="e.g., What does a borderline LDL cholesterol reading usually mean?"
            rows={3}
            className="w-full px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary bg-transparent resize-none focus:outline-hidden"
          />
          <div className="flex items-center justify-between pt-2 px-2 border-t border-border-subtle">
            <span className="text-[11px] text-text-tertiary hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary font-mono text-[10px]">Enter</kbd> to ask
            </span>
            <button
              onClick={() => handleSubmit()}
              disabled={!question.trim() || loading}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ml-auto',
                question.trim()
                  ? 'bg-accent-teal text-text-inverse hover:bg-accent-teal-dark shadow-xs'
                  : 'bg-bg-secondary text-text-tertiary cursor-not-allowed'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{loadingPhase}</span>
                </>
              ) : (
                <>
                  <span>Submit Inquiry</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Example prompts */}
        {!response && !loading && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
              Common educational inquiries:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GUIDANCE_EXAMPLE_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => handleExample(prompt)}
                  className="p-3 rounded-xl bg-bg-surface border border-border-default text-xs text-text-secondary hover:border-accent-teal/40 hover:bg-bg-secondary text-left transition-all cursor-pointer flex items-start gap-2"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-accent-teal shrink-0 mt-0.5" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Dynamic Animated Loading State */}
      {loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="mt-8 p-8 rounded-2xl bg-bg-surface border border-border-default text-center shadow-md relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-accent-teal/5 via-ai-lavender/10 to-accent-teal/5 animate-pulse pointer-events-none" />

          <div className="relative z-10">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <Loader2 className="w-12 h-12 text-accent-teal animate-spin" />
              <Sparkles className="w-5 h-5 text-ai-lavender absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            <motion.h3
              key={loadingPhase}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-base font-bold text-text-primary tracking-wide capitalize"
            >
              {loadingPhase}
            </motion.h3>

            <p className="text-xs text-text-secondary mt-1.5 max-w-sm mx-auto leading-relaxed">
              {loadingPhase === 'searching...'
                ? 'Scanning uploaded medical records, lab findings & clinical context...'
                : 'Consulting Gemini Clinical Engine & synthesizing verified response...'}
            </p>

            <div className="w-48 h-1.5 bg-bg-secondary rounded-full mx-auto mt-4 overflow-hidden border border-border-subtle">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-teal to-ai-lavender rounded-full"
                initial={{ width: '20%' }}
                animate={{ width: loadingPhase === 'searching...' ? '55%' : '92%' }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Response Display */}
      <AnimatePresence>
        {response && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-8 space-y-6"
          >
            {/* 1. NON-MEDICAL GUARDRAIL CARD */}
            {isNonMedical && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 shadow-xs text-center"
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">
                  Medical & Document Scope Notice
                </h3>
                <p className="text-base font-bold text-amber-800 dark:text-amber-300 py-1">
                  "We can't answer questions which are not related to medical"
                </p>
                <p className="text-xs text-text-tertiary mt-2 max-w-md mx-auto leading-relaxed">
                  CareCue is specialized strictly for health inquiries, medical terms, lab results, prescriptions, and your uploaded medical documents.
                </p>
              </motion.div>
            )}

            {/* 2. SAFETY REDIRECT STATE */}
            {!isNonMedical && isSafetyRedirect && (
              <SafetyAlert
                type="safety_redirect"
                title="Clinical Care Boundary"
                message={response.safetyNote || "CareCue can't diagnose conditions or prescribe medication. It can help organize the information and prepare questions for a healthcare professional."}
                suggestedAction="Draft questions in the Doctor Visit Brief or consult your primary care doctor directly."
              />
            )}

            {/* 3. NORMAL MEDICAL VERIFIED GUIDANCE */}
            {!isNonMedical && !isSafetyRedirect && response.answer && (
              <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-accent-teal-dark bg-accent-teal-light px-2.5 py-0.5 rounded-md">
                      Verified Clinical Guidance
                    </span>
                  </div>
                  <span className="text-xs text-text-tertiary">CareCue Intelligence</span>
                </div>
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">{response.answer}</p>
              </div>
            )}

            {/* 4. Supporting Evidence */}
            {!isNonMedical && !isSafetyRedirect && response.evidencePoints && response.evidencePoints.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-3">
                  Verified Evidence Claims
                </h3>
                <div className="space-y-3">
                  {response.evidencePoints.map((point, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="bg-bg-surface border border-border-default rounded-xl p-4 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-semibold text-text-primary">{point.claim}</p>
                        <VerificationBadge status={point.verification?.status || 'consistent'} />
                      </div>
                      <p className="text-xs text-text-tertiary">Source: {point.source}</p>
                      {point.verification?.reasoning && (
                        <div className="mt-2 pt-2 border-t border-border-subtle text-xs text-text-secondary">
                          <span className="font-semibold text-accent-teal-dark">Consensus: </span>
                          {point.verification.reasoning}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Related Questions / Follow-ups */}
            {response.relatedQuestions && response.relatedQuestions.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-3">
                  {isNonMedical ? 'Try Asking Health & Medical Questions:' : 'Follow-up Questions for Your Healthcare Provider:'}
                </h3>
                <div className="space-y-2">
                  {response.relatedQuestions.map(q => (
                    <button
                      key={q}
                      onClick={() => { setQuestion(q); handleSubmit(q); }}
                      className="flex items-center justify-between gap-3 w-full text-left px-4 py-3 rounded-xl bg-bg-surface border border-border-default text-xs sm:text-sm text-text-secondary hover:bg-bg-secondary hover:text-accent-teal hover:border-accent-teal/30 transition-all cursor-pointer"
                    >
                      <span>{q}</span>
                      <ArrowRight className="w-4 h-4 text-accent-teal shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 6. General Informational Notice */}
            {!isNonMedical && (
              <SafetyAlert
                type="info"
                title="Educational Guidance Only"
                message={response.disclaimer}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

