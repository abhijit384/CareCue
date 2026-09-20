import React from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Loader2, 
  AlertTriangle, 
  UploadCloud, 
  FileText, 
  BrainCircuit, 
  UserCheck, 
  Sparkles, 
  Layers, 
  RotateCcw 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepStatus = 'pending' | 'active' | 'complete' | 'error';

export interface StepItem {
  id: string;
  number: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STEP_DEFINITIONS: StepItem[] = [
  { id: 'upload', number: '01', name: 'UPLOAD', description: 'Secure upload', icon: UploadCloud },
  { id: 'extract', number: '02', name: 'EXTRACT', description: 'Read text', icon: FileText },
  { id: 'understand', number: '03', name: 'UNDERSTAND', description: 'Medical entities', icon: BrainCircuit },
  { id: 'patient', number: '04', name: 'PATIENT', description: 'Identity check', icon: UserCheck },
  { id: 'gemini', number: '05', name: 'GEMINI', description: 'AI comprehension', icon: Sparkles },
  { id: 'compile', number: '06', name: 'COMPILE', description: 'Evidence summary', icon: Layers },
];

export interface DocumentProcessingStepperProps {
  currentStepIndex: number; // 0 to 5
  stepStatuses: Record<string, StepStatus>;
  errorMessage?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function DocumentProcessingStepper({
  currentStepIndex,
  stepStatuses,
  errorMessage,
  onRetry,
  className,
}: DocumentProcessingStepperProps) {
  const isGeminiError = stepStatuses['gemini'] === 'error' || (errorMessage && currentStepIndex === 4);

  return (
    <div
      className={cn(
        'w-full max-w-[1200px] mx-auto box-border rounded-2xl bg-bg-surface border border-border-default shadow-xs p-4 sm:p-6 md:p-7 overflow-hidden',
        className
      )}
    >
      {/* ─── 1. Desktop Stepper (6 equal columns: >=1024px) ─── */}
      <div className="hidden lg:grid grid-cols-6 gap-2 xl:gap-3 relative items-start">
        {STEP_DEFINITIONS.map((step, idx) => {
          const status = stepStatuses[step.id] || (idx < currentStepIndex ? 'complete' : idx === currentStepIndex ? 'active' : 'pending');
          const isLast = idx === STEP_DEFINITIONS.length - 1;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative flex flex-col items-center text-center min-w-0 group">
              {/* Connector line to next step */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className="absolute top-5 left-1/2 w-full h-[2px] bg-border-subtle -z-0 pointer-events-none"
                >
                  <div
                    className={cn(
                      'h-full bg-accent-teal transition-all duration-500',
                      status === 'complete' ? 'w-full' : 'w-0'
                    )}
                  />
                </div>
              )}

              {/* Step Circle Indicator */}
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center relative z-10 transition-all duration-300 shadow-xs shrink-0',
                  status === 'complete' && 'bg-accent-teal text-text-inverse shadow-accent-teal/20',
                  status === 'active' && 'bg-accent-teal-light border-2 border-accent-teal text-accent-teal ring-4 ring-accent-teal/10',
                  status === 'pending' && 'bg-bg-secondary border border-border-default text-text-tertiary',
                  status === 'error' && 'bg-status-safety-bg border-2 border-status-safety text-status-safety animate-pulse'
                )}
              >
                {status === 'complete' && <Check className="w-5 h-5 stroke-[2.5]" />}
                {status === 'active' && <Loader2 className="w-5 h-5 animate-spin text-accent-teal" />}
                {status === 'pending' && <Icon className="w-4 h-4 text-text-tertiary" />}
                {status === 'error' && <AlertTriangle className="w-5 h-5 text-status-safety" />}
              </div>

              {/* Labels */}
              <div className="mt-3 flex flex-col items-center w-full px-1 min-w-0">
                <span className="text-[10px] font-bold tracking-widest text-text-muted">
                  {step.number}
                </span>
                <span
                  className={cn(
                    'text-xs font-bold tracking-wider truncate w-full mt-0.5',
                    status === 'complete' && 'text-text-primary',
                    status === 'active' && 'text-accent-teal-dark font-extrabold',
                    status === 'pending' && 'text-text-tertiary',
                    status === 'error' && 'text-status-safety font-bold'
                  )}
                >
                  {step.name}
                </span>
                <span className="text-[11px] text-text-secondary truncate w-full mt-0.5">
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 2. Tablet Stepper (3 columns × 2 rows: 640px to 1023px) ─── */}
      <div className="hidden sm:grid lg:hidden grid-cols-3 gap-4">
        {STEP_DEFINITIONS.map((step, idx) => {
          const status = stepStatuses[step.id] || (idx < currentStepIndex ? 'complete' : idx === currentStepIndex ? 'active' : 'pending');
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={cn(
                'p-3.5 rounded-xl border transition-all flex items-center gap-3 min-w-0',
                status === 'active' && 'bg-accent-teal-light/40 border-accent-teal/40 shadow-xs',
                status === 'complete' && 'bg-bg-secondary/50 border-border-subtle',
                status === 'pending' && 'bg-bg-surface border-border-subtle opacity-70',
                status === 'error' && 'bg-status-safety-bg border-status-safety/40'
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                  status === 'complete' && 'bg-accent-teal text-text-inverse',
                  status === 'active' && 'bg-accent-teal-light border border-accent-teal text-accent-teal',
                  status === 'pending' && 'bg-bg-secondary border border-border-default text-text-muted',
                  status === 'error' && 'bg-status-safety-bg border border-status-safety text-status-safety'
                )}
              >
                {status === 'complete' && <Check className="w-4 h-4 stroke-[2.5]" />}
                {status === 'active' && <Loader2 className="w-4 h-4 animate-spin" />}
                {status === 'pending' && step.number}
                {status === 'error' && <AlertTriangle className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-text-primary tracking-wide truncate">
                  {step.name}
                </p>
                <p className="text-[11px] text-text-secondary truncate mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 3. Mobile Stepper (Vertical connected rail: <640px) ─── */}
      <div className="flex sm:hidden flex-col gap-2">
        {STEP_DEFINITIONS.map((step, idx) => {
          const status = stepStatuses[step.id] || (idx < currentStepIndex ? 'complete' : idx === currentStepIndex ? 'active' : 'pending');
          const isLast = idx === STEP_DEFINITIONS.length - 1;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative flex items-start gap-3 min-w-0">
              {/* Vertical connector line */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className="absolute top-8 left-4 w-[2px] h-[calc(100%-8px)] bg-border-subtle -z-0"
                >
                  <div
                    className={cn(
                      'w-full bg-accent-teal transition-all duration-300',
                      status === 'complete' ? 'h-full' : 'h-0'
                    )}
                  />
                </div>
              )}

              {/* Circle Icon */}
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10 transition-all text-xs font-bold',
                  status === 'complete' && 'bg-accent-teal text-text-inverse',
                  status === 'active' && 'bg-accent-teal-light border border-accent-teal text-accent-teal animate-pulse',
                  status === 'pending' && 'bg-bg-secondary border border-border-default text-text-muted',
                  status === 'error' && 'bg-status-safety-bg border border-status-safety text-status-safety'
                )}
              >
                {status === 'complete' && <Check className="w-4 h-4 stroke-[2.5]" />}
                {status === 'active' && <Loader2 className="w-4 h-4 animate-spin" />}
                {status === 'pending' && step.number}
                {status === 'error' && <AlertTriangle className="w-4 h-4" />}
              </div>

              {/* Label & Description */}
              <div className="min-w-0 pb-3">
                <p
                  className={cn(
                    'text-xs font-bold tracking-wider',
                    status === 'complete' && 'text-text-primary',
                    status === 'active' && 'text-accent-teal font-extrabold',
                    status === 'pending' && 'text-text-tertiary',
                    status === 'error' && 'text-status-safety'
                  )}
                >
                  {step.name}
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 4. Failure / Needs Attention State ─── */}
      {isGeminiError && (
        <div className="mt-5 p-4 rounded-xl bg-status-safety-bg border border-status-safety/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-status-safety shrink-0" />
            <div>
              <p className="text-xs font-bold text-status-safety uppercase tracking-wider">
                GEMINI ⚠ NEEDS ATTENTION
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {errorMessage || 'Gemini could not complete this step. Please check your connectivity and retry.'}
              </p>
            </div>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-status-safety text-white text-xs font-bold hover:bg-status-safety/90 transition-all cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Gemini
            </button>
          )}
        </div>
      )}
    </div>
  );
}
