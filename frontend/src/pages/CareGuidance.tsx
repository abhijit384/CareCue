import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowRight, Loader2, Sparkles, HelpCircle } from 'lucide-react';
import { SafetyAlert } from '@/components/composed/SafetyAlert';
import { VerificationBadge } from '@/components/composed/VerificationBadge';
import { guidanceService } from '@/services';
import { GUIDANCE_EXAMPLE_PROMPTS } from '@/services/mockData';
import type { GuidanceResponse } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CareGuidance() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<GuidanceResponse | null>(null);

  const handleSubmit = useCallback(async (q?: string) => {
    const input = q || question;
    if (!input.trim()) return;
    setLoading(true);
    setResponse(null);
    const result = await guidanceService.query(input);
    setResponse(result);
    setLoading(false);
  }, [question]);

  const handleExample = (prompt: string) => {
    setQuestion(prompt);
    handleSubmit(prompt);
  };

  const isSafetyRedirect = Boolean(response?.safetyNote);

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
                  Analyzing...
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

      {/* Loading */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-10 p-8 rounded-2xl bg-bg-surface border border-border-default text-center"
        >
          <Loader2 className="w-8 h-8 text-accent-teal animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-bold text-text-primary">Cross-checking informational sources</h3>
          <p className="text-xs text-text-secondary mt-1">
            Analyzing clinical phrasing and validating context against medical records...
          </p>
        </motion.div>
      )}

      {/* Response Display */}
      <AnimatePresence>
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-8 space-y-6"
          >
            {/* 1. SAFETY REDIRECT STATE */}
            {isSafetyRedirect && (
              <SafetyAlert
                type="safety_redirect"
                title="Clinical Care Boundary"
                message={response.safetyNote || "CareCue can't diagnose conditions or prescribe medication. It can help organize the information and prepare questions for a healthcare professional."}
                suggestedAction="Draft questions in the Doctor Visit Brief or consult your primary care doctor directly."
              />
            )}

            {/* 2. NORMAL INFORMATION STATE */}
            {!isSafetyRedirect && response.answer && (
              <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-accent-teal-dark bg-accent-teal-light px-2.5 py-0.5 rounded-md">
                      Verified Clinical Guidance
                    </span>
                  </div>
                  <span className="text-xs text-text-tertiary">CareCue Intelligence</span>
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{response.answer}</p>
              </div>
            )}

            {/* 3. Supporting Evidence */}
            {!isSafetyRedirect && response.evidencePoints.length > 0 && (
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
                        <VerificationBadge status={point.verification.status} />
                      </div>
                      <p className="text-xs text-text-tertiary">Source: {point.source}</p>
                      <div className="mt-2 pt-2 border-t border-border-subtle text-xs text-text-secondary">
                        <span className="font-semibold text-accent-teal-dark">Consensus: </span>
                        {point.verification.reasoning}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Related Questions */}
            {response.relatedQuestions.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-3">
                  Follow-up Questions to Ask Your Doctor
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

            {/* 5. General Informational Notice */}
            <SafetyAlert
              type="info"
              title="Educational Guidance Only"
              message={response.disclaimer}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
