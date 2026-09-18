import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SafetyAlertType = 'normal_information' | 'needs_review' | 'safety_redirect' | 'info' | 'warning' | 'safety';

interface SafetyAlertProps {
  type: SafetyAlertType;
  title?: string;
  message?: string;
  suggestedAction?: string;
  className?: string;
}

const CONFIG: Record<string, {
  icon: typeof Info;
  badge: string;
  bg: string;
  border: string;
  titleColor: string;
  iconColor: string;
  defaultTitle: string;
  defaultMessage: string;
}> = {
  normal_information: {
    icon: CheckCircle2,
    badge: 'NORMAL INFORMATION',
    bg: 'bg-accent-teal-light/40',
    border: 'border-accent-teal/20',
    titleColor: 'text-accent-teal-dark',
    iconColor: 'text-accent-teal',
    defaultTitle: 'Educational Reference',
    defaultMessage: 'This guidance provides general health education to help you prepare for discussions with your care team.',
  },
  info: {
    icon: Info,
    badge: 'NORMAL INFORMATION',
    bg: 'bg-accent-teal-light/40',
    border: 'border-accent-teal/20',
    titleColor: 'text-accent-teal-dark',
    iconColor: 'text-accent-teal',
    defaultTitle: 'Not Medical Advice',
    defaultMessage: 'CareCue provides informational analysis only. Always consult a qualified physician for clinical care.',
  },
  needs_review: {
    icon: AlertTriangle,
    badge: 'NEEDS REVIEW',
    bg: 'bg-status-review-bg/60',
    border: 'border-status-review/30',
    titleColor: 'text-amber-800',
    iconColor: 'text-status-review',
    defaultTitle: 'Discuss with Your Healthcare Provider',
    defaultMessage: 'Certain values or interpretations fall outside normal parameters. We recommend preparing questions for your doctor.',
  },
  warning: {
    icon: AlertTriangle,
    badge: 'NEEDS REVIEW',
    bg: 'bg-status-review-bg/60',
    border: 'border-status-review/30',
    titleColor: 'text-amber-800',
    iconColor: 'text-status-review',
    defaultTitle: 'Discuss with Your Doctor',
    defaultMessage: 'Flagged findings warrant clinical attention during your next consultation.',
  },
  safety_redirect: {
    icon: ShieldAlert,
    badge: 'SAFETY REDIRECT',
    bg: 'bg-rose-500/5',
    border: 'border-rose-500/20',
    titleColor: 'text-rose-800',
    iconColor: 'text-rose-600',
    defaultTitle: 'Care Boundary Notice',
    defaultMessage: "CareCue can't diagnose conditions or prescribe medication. It can help organize the information and prepare questions for a healthcare professional.",
  },
  safety: {
    icon: ShieldAlert,
    badge: 'SAFETY REDIRECT',
    bg: 'bg-rose-500/5',
    border: 'border-rose-500/20',
    titleColor: 'text-rose-800',
    iconColor: 'text-rose-600',
    defaultTitle: 'Care Boundary Notice',
    defaultMessage: "CareCue can't diagnose conditions or prescribe medication. It can help organize the information and prepare questions for a healthcare professional.",
  },
};

export function SafetyAlert({
  type,
  title,
  message,
  suggestedAction,
  className,
}: SafetyAlertProps) {
  const config = CONFIG[type] || CONFIG.normal_information;
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('p-4 sm:p-5 rounded-2xl border transition-all', config.bg, config.border, className)}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-bg-surface flex items-center justify-center shrink-0 shadow-xs">
          <Icon className={cn('w-4 h-4', config.iconColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn('text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-bg-surface', config.titleColor)}>
              {config.badge}
            </span>
            <h4 className={cn('text-sm font-bold', config.titleColor)}>{displayTitle}</h4>
          </div>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{displayMessage}</p>

          {suggestedAction && (
            <div className="mt-3 pt-2.5 border-t border-border-subtle/40 text-xs font-semibold text-text-primary">
              Suggested next step: {suggestedAction}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
