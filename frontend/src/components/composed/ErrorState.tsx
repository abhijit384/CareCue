import React from 'react';
import { AlertTriangle, RefreshCw, Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ErrorVariant = 'upload_failed' | 'verification_unavailable' | 'session_unavailable' | 'general';

interface ErrorStateProps {
  variant?: ErrorVariant;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDemoFallback?: () => void;
  onBack?: () => void;
  className?: string;
}

const ERROR_CONFIGS: Record<ErrorVariant, { title: string; message: string; defaultAction: string }> = {
  upload_failed: {
    title: 'Document Processing Failed',
    message: 'Something went wrong while processing this document. Please check the file format or try uploading again.',
    defaultAction: 'Try Again',
  },
  verification_unavailable: {
    title: 'Verification Service Unavailable',
    message: "The verification service isn't available right now. You can retry or continue using synthetic Demo Mode.",
    defaultAction: 'Try Again',
  },
  session_unavailable: {
    title: 'Session Unavailable',
    message: 'This CareCue session could not be loaded. It may have expired or been removed from your local storage.',
    defaultAction: 'Back to Dashboard',
  },
  general: {
    title: 'Something Went Wrong',
    message: 'CareCue encountered an unexpected issue. Your session data remains safe.',
    defaultAction: 'Retry',
  },
};

export function ErrorState({
  variant = 'general',
  title,
  message,
  onRetry,
  onDemoFallback,
  onBack,
  className,
}: ErrorStateProps) {
  const config = ERROR_CONFIGS[variant];
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'max-w-md mx-auto p-6 sm:p-8 bg-bg-surface border border-status-review/30 rounded-2xl text-center shadow-sm',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-status-review-bg text-status-review flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6" strokeWidth={2} />
      </div>

      <h3 className="text-lg font-bold text-text-primary mb-2">{displayTitle}</h3>
      <p className="text-sm text-text-secondary leading-relaxed mb-6">{displayMessage}</p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-teal text-text-inverse font-medium text-sm hover:bg-accent-teal-dark transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}

        {onDemoFallback && (
          <button
            onClick={onDemoFallback}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-bg-secondary border border-border-default text-text-primary font-medium text-sm hover:bg-bg-primary transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-ai-lavender" />
            Use Demo Mode
          </button>
        )}

        {onBack && (
          <button
            onClick={onBack}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border-default text-text-secondary font-medium text-sm hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        )}
      </div>
    </motion.div>
  );
}
