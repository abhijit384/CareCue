import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, ArrowDown, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DualAIStatus = 'consistent' | 'needs_review' | 'safety_redirect';

interface DualAIPanelProps {
  initialStatus?: DualAIStatus;
  className?: string;
}

const STATUS_CONFIG: Record<DualAIStatus, {
  label: string;
  badge: string;
  desc: string;
  icon: typeof CheckCircle2;
  cardClass: string;
  iconBg: string;
}> = {
  consistent: {
    label: 'Clinical Consensus Aligned',
    badge: '✓ CONSISTENT',
    desc: 'Primary extraction and verification engines independently validated all clinical findings and reference bounds.',
    icon: CheckCircle2,
    cardClass: 'bg-status-consistent-bg/60 border-status-consistent/30 text-status-consistent',
    iconBg: 'bg-accent-teal text-text-inverse',
  },
  needs_review: {
    label: 'Clinical Review Recommended',
    badge: '⚠ NEEDS REVIEW',
    desc: 'Interpretations flagged unusual lab variance or clinical divergence — prepared as priority talking points for your doctor.',
    icon: AlertTriangle,
    cardClass: 'bg-status-review-bg/60 border-status-review/30 text-status-review',
    iconBg: 'bg-status-review text-text-inverse',
  },
  safety_redirect: {
    label: 'Care Boundary Active',
    badge: '! SAFETY REDIRECT',
    desc: 'Query requested diagnostic or prescription advice. Redirected to safe educational preparation.',
    icon: ShieldAlert,
    cardClass: 'bg-rose-500/10 border-rose-500/25 text-rose-600',
    iconBg: 'bg-rose-600 text-text-inverse',
  },
};

export function DualAIPanel({ initialStatus = 'consistent', className }: DualAIPanelProps) {
  const [status, setStatus] = useState<DualAIStatus>(initialStatus);
  const activeConfig = STATUS_CONFIG[status];
  const StatusIcon = activeConfig.icon;

  return (
    <div className={cn('text-center space-y-6 sm:space-y-8 max-w-xl mx-auto px-4 perspective-1000', className)}>
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-text-tertiary block mb-1">
          Dual-Layer Clinical Architecture
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
          Clinical Verification
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-md mx-auto leading-relaxed">
          Critical findings extracted from your medical records are independently cross-checked against source evidence.
        </p>
      </div>

      <div className="relative">
        {/* Two Floating AI Source Panels with 3D Depth */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-4">
          {/* 1. Primary Clinical Extraction */}
          <motion.div
            initial={{ opacity: 0, y: -16, rotateY: -6 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
            className="bg-bg-surface border border-border-default rounded-2xl p-4 sm:p-5 shadow-lg relative card-depth-lift"
          >
            <div className="w-11 h-11 rounded-xl bg-accent-teal-light text-accent-teal flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-accent-teal-dark block mb-0.5">
              PRIMARY ENGINE
            </span>
            <h3 className="text-sm sm:text-base font-bold text-text-primary">
              Clinical Extraction
            </h3>
            <p className="text-xs text-text-tertiary mt-1 leading-normal">
              Extracts biomarkers, doses & reference intervals.
            </p>

            {/* Connecting Convergence Line */}
            <div className="w-0.5 h-6 sm:h-8 bg-gradient-to-b from-accent-teal to-transparent mx-auto mt-4" />
          </motion.div>

          {/* 2. Grounded Verification Engine */}
          <motion.div
            initial={{ opacity: 0, y: -16, rotateY: 6 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
            className="bg-bg-surface border border-border-default rounded-2xl p-4 sm:p-5 shadow-lg relative card-depth-lift"
          >
            <div className="w-11 h-11 rounded-xl bg-ai-lavender-light text-ai-lavender flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-ai-lavender-dark block mb-0.5">
              VERIFICATION LAYER
            </span>
            <h3 className="text-sm sm:text-base font-bold text-text-primary">
              Source Fact-Check
            </h3>
            <p className="text-xs text-text-tertiary mt-1 leading-normal">
              Independently verifies entity context & medical boundaries.
            </p>

            {/* Connecting Convergence Line */}
            <div className="w-0.5 h-6 sm:h-8 bg-gradient-to-b from-ai-lavender to-transparent mx-auto mt-4" />
          </motion.div>
        </div>

        {/* Convergence Indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="flex justify-center -my-2 relative z-10"
        >
          <div className="w-9 h-9 rounded-full bg-bg-surface border border-border-default shadow-md flex items-center justify-center text-text-secondary">
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </div>
        </motion.div>

        {/* Verification Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className={cn(
            'border rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all',
            activeConfig.cardClass
          )}
        >
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md', activeConfig.iconBg)}>
            <StatusIcon className="w-6 h-6" strokeWidth={2.5} />
          </div>

          <span className="text-[11px] font-mono font-bold tracking-wider px-3 py-0.5 rounded-full bg-bg-surface/80 shadow-xs inline-block mb-1.5">
            {activeConfig.badge}
          </span>

          <h4 className="text-base sm:text-lg font-bold text-text-primary mb-1">
            {activeConfig.label}
          </h4>

          <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
            {activeConfig.desc}
          </p>

          {/* Interactive State Demo Switcher */}
          <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-border-subtle/50">
            <span className="text-[10px] uppercase font-bold text-text-tertiary mr-1">Preview State:</span>
            {(['consistent', 'needs_review', 'safety_redirect'] as DualAIStatus[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer',
                  status === s
                    ? 'bg-text-primary text-text-inverse shadow-xs'
                    : 'bg-bg-surface text-text-tertiary hover:text-text-primary'
                )}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Factual Disclaimer Notice */}
        <p className="text-[11px] text-text-tertiary mt-4 max-w-md mx-auto leading-relaxed">
          Cross-model consensus reflects consistency between algorithmic interpretations. It does not provide medical proof or replace clinical judgment.
        </p>
      </div>
    </div>
  );
}
