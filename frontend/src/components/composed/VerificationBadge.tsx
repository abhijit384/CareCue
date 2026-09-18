import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/types';

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md';
  className?: string;
}

const CONFIG: Record<VerificationStatus, { icon: React.ElementType; label: string; colorClass: string; bgClass: string }> = {
  consistent: {
    icon: CheckCircle2,
    label: 'Consistent',
    colorClass: 'text-status-consistent',
    bgClass: 'bg-status-consistent-bg',
  },
  needs_review: {
    icon: AlertCircle,
    label: 'Needs Review',
    colorClass: 'text-status-review',
    bgClass: 'bg-status-review-bg',
  },
  safety_redirect: {
    icon: AlertTriangle,
    label: 'Safety Redirect',
    colorClass: 'text-status-safety',
    bgClass: 'bg-status-safety-bg',
  },
};

export function VerificationBadge({ status, size = 'sm', className }: VerificationBadgeProps) {
  const { icon: Icon, label, colorClass, bgClass } = CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        bgClass,
        colorClass,
        size === 'sm' && 'px-2.5 py-1 text-xs',
        size === 'md' && 'px-3 py-1.5 text-sm',
        className
      )}
    >
      <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      {label}
    </span>
  );
}
