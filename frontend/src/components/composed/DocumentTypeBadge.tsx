import React from 'react';
import { FlaskConical, Pill, FileText, FileCheck, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentType } from '@/lib/types';

interface DocumentTypeBadgeProps {
  type: DocumentType | string;
  className?: string;
  showIcon?: boolean;
}

export function DocumentTypeBadge({ type, className, showIcon = true }: DocumentTypeBadgeProps) {
  const norm = type.toLowerCase();

  switch (norm) {
    case 'lab_report':
    case 'lab':
      return (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-teal/10 text-accent-teal-dark border border-accent-teal/20', className)}>
          {showIcon && <FlaskConical className="w-3.5 h-3.5 text-accent-teal" />}
          <span>LAB</span>
        </span>
      );
    case 'prescription':
      return (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20', className)}>
          {showIcon && <Pill className="w-3.5 h-3.5 text-amber-500" />}
          <span>PRESCRIPTION</span>
        </span>
      );
    case 'medical_report':
    case 'report':
      return (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20', className)}>
          {showIcon && <FileText className="w-3.5 h-3.5 text-blue-500" />}
          <span>REPORT</span>
        </span>
      );
    case 'discharge_summary':
    case 'discharge':
      return (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20', className)}>
          {showIcon && <FileCheck className="w-3.5 h-3.5 text-emerald-500" />}
          <span>DISCHARGE</span>
        </span>
      );
    default:
      return (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-surface-secondary text-text-secondary border border-border-subtle', className)}>
          {showIcon && <HelpCircle className="w-3.5 h-3.5 text-text-muted" />}
          <span>OTHER</span>
        </span>
      );
  }
}
