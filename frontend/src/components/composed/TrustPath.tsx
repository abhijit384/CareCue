import React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrustPathStep } from '@/lib/types';

export type TrustPathStatus = 'processing' | 'consistent' | 'needs_review' | 'safety_redirect';

interface TrustPathProps {
  currentStep: TrustPathStep;
  status?: TrustPathStatus;
  showDetails?: boolean;
  className?: string;
}

const STEPS: { key: TrustPathStep; label: string; shortLabel: string; desc: string }[] = [
  { key: 'source', label: 'Source', shortLabel: 'SRC', desc: 'Clinical document or user query' },
  { key: 'analysis', label: 'Analysis', shortLabel: 'ANL', desc: 'Bedrock extracted interpretation' },
  { key: 'verification', label: 'Verification', shortLabel: 'VER', desc: 'Gemini dual-AI consensus cross-check' },
  { key: 'next_step', label: 'Next Step', shortLabel: 'NEXT', desc: 'Evidence-backed brief & questions' },
];

const ORDER: Record<TrustPathStep, number> = {
  source: 0,
  analysis: 1,
  verification: 2,
  next_step: 3,
};

const STATUS_CONFIGS: Record<TrustPathStatus, {
  label: string;
  subtext: string;
  badgeClass: string;
  icon: typeof CheckCircle2;
}> = {
  processing: {
    label: 'Verification in Progress',
    subtext: 'Cross-checking Bedrock claims against Gemini assessment...',
    badgeClass: 'bg-accent-teal-light text-accent-teal-dark border-accent-teal/30',
    icon: Loader2,
  },
  consistent: {
    label: 'Consistent Findings',
    subtext: 'Both Bedrock and Gemini arrived at aligned interpretations of the source evidence.',
    badgeClass: 'bg-status-consistent-bg text-status-consistent border-status-consistent/30',
    icon: CheckCircle2,
  },
  needs_review: {
    label: 'Needs Clinical Review',
    subtext: 'Interpretations diverged or flagged unusual lab variance — prepare to discuss with doctor.',
    badgeClass: 'bg-status-review-bg text-status-review border-status-review/30',
    icon: AlertTriangle,
  },
  safety_redirect: {
    label: 'Safety Redirect Active',
    subtext: 'Query involves diagnosis or prescription — redirected to educational care boundaries.',
    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    icon: ShieldAlert,
  },
};

export function TrustPath({ currentStep, status, showDetails = false, className }: TrustPathProps) {
  const currentIndex = ORDER[currentStep];
  const activeStatusConfig = status ? STATUS_CONFIGS[status] : null;

  return (
    <div className={cn('bg-bg-surface border border-border-default rounded-2xl p-4 sm:p-5 shadow-xs', className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent-teal-light text-accent-teal flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            CareCue Trust Path
          </span>
        </div>

        {activeStatusConfig && (
          <div className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
            activeStatusConfig.badgeClass
          )}>
            <activeStatusConfig.icon className={cn('w-3 h-3', status === 'processing' && 'animate-spin')} />
            <span>{activeStatusConfig.label}</span>
          </div>
        )}
      </div>

      {/* Pipeline Steps - Responsive for 390px and desktop */}
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((step, i) => {
          const isComplete = i < currentIndex;
          const isActive = i === currentIndex;
          const isPending = i > currentIndex;

          return (
            <React.Fragment key={step.key}>
              {i > 0 && (
                <div className="flex-1 h-0.5 min-w-3 sm:min-w-6 relative overflow-hidden bg-border-subtle rounded-full">
                  {isComplete && (
                    <motion.div
                      className="absolute inset-0 bg-accent-teal"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.35, delay: 0.05 }}
                      style={{ transformOrigin: 'left' }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-accent-teal/40"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>
              )}

              <div className="flex flex-col items-center text-center shrink-0 group perspective-1000">
                <div
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-semibold cursor-default',
                    'group-hover:-translate-y-0.5 group-hover:shadow-md',
                    isComplete && 'bg-accent-teal text-text-inverse shadow-xs',
                    isActive && 'bg-accent-teal-light text-accent-teal border-2 border-accent-teal ring-4 ring-accent-teal/20 scale-110 shadow-md',
                    isPending && 'bg-bg-secondary text-text-tertiary border border-border-default'
                  )}
                >
                  {isComplete ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </motion.div>
                  ) : isActive && status === 'processing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>

                <span
                  className={cn(
                    'text-xs font-semibold mt-1.5 hidden sm:block',
                    isComplete && 'text-text-primary',
                    isActive && 'text-accent-teal font-bold',
                    isPending && 'text-text-tertiary'
                  )}
                >
                  {step.label}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold tracking-tight mt-1 sm:hidden',
                    isComplete && 'text-text-primary',
                    isActive && 'text-accent-teal',
                    isPending && 'text-text-tertiary'
                  )}
                >
                  {step.shortLabel}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Subtext description / Context banner */}
      {showDetails && activeStatusConfig && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-3 border-t border-border-subtle flex items-start gap-2 text-xs text-text-secondary"
        >
          <Info className="w-3.5 h-3.5 text-accent-teal shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {activeStatusConfig.subtext}
          </p>
        </motion.div>
      )}

      {/* Signature Medical Accuracy Guardrail Note */}
      <div className="mt-3 pt-2 text-[11px] text-text-tertiary text-center leading-normal">
        Cross-model agreement verifies consistency between AI models; it is not independent proof of medical accuracy.
      </div>
    </div>
  );
}
