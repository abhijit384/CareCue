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
    <div className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 sm:gap-2', className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        
        return (
          <React.Fragment key={step.id}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="flex sm:flex-col items-center gap-3 sm:gap-2 relative z-10 w-full sm:w-auto"
            >
              {/* Step indicator */}
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm',
                step.status === 'complete' && 'bg-accent-teal text-text-inverse shadow-accent-teal/20',
                step.status === 'active' && 'bg-accent-teal-light border-2 border-accent-teal text-accent-teal shadow-accent-teal/10',
                step.status === 'pending' && 'bg-bg-secondary border border-border-default text-text-tertiary',
                step.status === 'error' && 'bg-status-safety-bg border border-status-safety text-status-safety',
              )}>
                {step.status === 'complete' && <Check className="w-5 h-5" strokeWidth={2.5} />}
                {step.status === 'active' && <Loader2 className="w-5 h-5 animate-spin" />}
                {step.status === 'pending' && <span className="text-sm font-bold">{i + 1}</span>}
                {step.status === 'error' && <AlertTriangle className="w-5 h-5" />}
              </div>

              {/* Label */}
              <div className="flex flex-col sm:items-center text-left sm:text-center">
                <span className={cn(
                  'text-xs sm:text-xs font-bold tracking-wide uppercase transition-colors',
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
                    className="flex gap-1 mt-1 sm:mt-1.5"
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
              </div>
            </motion.div>

            {/* Connecting Line */}
            {!isLast && (
              <div className="hidden sm:block flex-1 h-[2px] -mt-6 bg-border-default relative overflow-hidden shrink-0 min-w-[20px]">
                {step.status === 'complete' && (
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '0%' }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 bg-accent-teal" 
                  />
                )}
              </div>
            )}
            
            {/* Mobile Connecting Line */}
            {!isLast && (
              <div className="sm:hidden w-[2px] h-4 ml-5 bg-border-default relative overflow-hidden -my-2 shrink-0">
                {step.status === 'complete' && (
                  <motion.div 
                    initial={{ y: '-100%' }}
                    animate={{ y: '0%' }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 bg-accent-teal" 
                  />
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
