import React from 'react';
import { cn } from '@/lib/utils';

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('surface-base rounded-xl p-5 border border-border-default h-full flex flex-col', className)}>
      <div className="w-11 h-11 rounded-xl skeleton mb-4" />
      <div className="w-16 h-4 skeleton rounded-full mb-3" />
      <div className="w-3/4 h-5 skeleton rounded-md mb-2" />
      <div className="w-full h-3 skeleton rounded-md mb-1.5" />
      <div className="w-5/6 h-3 skeleton rounded-md" />
      <div className="mt-auto pt-4 flex gap-2">
        <div className="w-24 h-4 skeleton rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonText({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="w-full h-4 skeleton rounded-md" />
      <div className="w-[90%] h-4 skeleton rounded-md" />
      <div className="w-[80%] h-4 skeleton rounded-md" />
    </div>
  );
}

export function SkeletonMetric({ className }: { className?: string }) {
  return (
    <div className={cn('surface-base rounded-xl p-4 border border-border-subtle', className)}>
      <div className="w-24 h-3 skeleton rounded-full mb-2" />
      <div className="flex items-baseline gap-2 mt-1">
        <div className="w-16 h-8 skeleton rounded-md" />
        <div className="w-8 h-4 skeleton rounded-md" />
      </div>
      <div className="w-32 h-3 skeleton rounded-md mt-2" />
    </div>
  );
}

export function SkeletonTimeline({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="w-8 h-8 rounded-full skeleton shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="w-1/3 h-4 skeleton rounded-md" />
            <div className="w-2/3 h-3 skeleton rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDocument({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 p-4 surface-base rounded-xl border border-border-default', className)}>
      <div className="w-10 h-10 rounded-lg skeleton shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="w-1/2 h-4 skeleton rounded-md" />
        <div className="w-1/4 h-3 skeleton rounded-md" />
      </div>
      <div className="w-6 h-6 rounded-full skeleton shrink-0" />
    </div>
  );
}

export function SkeletonPatient({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 p-4 surface-base rounded-xl border border-border-default', className)}>
      <div className="w-12 h-12 rounded-full skeleton shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="w-1/3 h-5 skeleton rounded-md" />
        <div className="w-1/4 h-3 skeleton rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonDoctorBrief({ className }: { className?: string }) {
  return (
    <div className={cn('surface-base rounded-2xl p-6 md:p-8 border border-border-default', className)}>
      <div className="w-1/4 h-6 skeleton rounded-md mb-6" />
      <div className="space-y-4 mb-8">
        <div className="w-full h-4 skeleton rounded-md" />
        <div className="w-5/6 h-4 skeleton rounded-md" />
        <div className="w-4/5 h-4 skeleton rounded-md" />
      </div>
      <div className="w-1/3 h-5 skeleton rounded-md mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <SkeletonMetric />
        <SkeletonMetric />
      </div>
      <div className="w-1/3 h-5 skeleton rounded-md mb-4" />
      <SkeletonText className="mb-4" />
      <SkeletonText />
    </div>
  );
}
