import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl bg-bg-secondary flex items-center justify-center mb-4 text-text-tertiary">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-3 animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 skeleton rounded" style={{ width: `${85 - i * 15}%` }} />
          <div className="h-3 skeleton rounded" style={{ width: `${70 - i * 10}%` }} />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-bg-surface border border-border-default rounded-xl p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-3 skeleton rounded w-20" />
          <div className="h-5 skeleton rounded w-3/4" />
        </div>
        <div className="h-6 skeleton rounded-full w-24" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 skeleton rounded w-full" />
        <div className="h-3 skeleton rounded w-5/6" />
      </div>
      <div className="h-16 skeleton rounded-lg w-full" />
    </div>
  );
}
