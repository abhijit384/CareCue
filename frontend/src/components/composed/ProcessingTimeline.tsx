import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProcessingStep } from '@/lib/types';

interface ProcessingTimelineProps {
  steps: ProcessingStep[];
  className?: string;
}

export function ProcessingTimeline({ steps, className }: ProcessingTimelineProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {steps.map((step, i) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          className="flex items-center gap-3"
        >
          {/* Step indicator */}
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
            step.status === 'complete' && 'bg-accent-teal text-text-inverse',
            step.status === 'active' && 'bg-accent-teal-light border-2 border-accent-teal text-accent-teal',
            step.status === 'pending' && 'bg-bg-secondary border border-border-default text-text-tertiary',
            step.status === 'error' && 'bg-status-safety-bg border border-status-safety text-status-safety',
          )}>
            {step.status === 'complete' && <Check className="w-4 h-4" strokeWidth={3} />}
            {step.status === 'active' && <Loader2 className="w-4 h-4 animate-spin" />}
            {step.status === 'pending' && <span className="text-xs font-semibold">{i + 1}</span>}
            {step.status === 'error' && <AlertTriangle className="w-4 h-4" />}
          </div>

          {/* Label */}
          <span className={cn(
            'text-sm font-medium transition-colors',
            step.status === 'complete' && 'text-text-primary',
            step.status === 'active' && 'text-accent-teal-dark',
            step.status === 'pending' && 'text-text-tertiary',
            step.status === 'error' && 'text-status-safety',
          )}>
            {step.label}
          </span>

          {/* Active pulse */}
          {step.status === 'active' && (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex gap-1"
            >
              {[0, 1, 2].map(d => (
                <motion.div
                  key={d}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: d * 0.15 }}
                  className="w-1 h-1 rounded-full bg-accent-teal"
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
