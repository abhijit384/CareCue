import React from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PrivacyGatewayResult } from '@/lib/types';

interface PrivacyGatewayProps {
  data: PrivacyGatewayResult;
  onContinue: () => void;
  className?: string;
}

export function PrivacyGateway({ data, onContinue, className }: PrivacyGatewayProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-14 h-14 rounded-2xl bg-accent-teal-light flex items-center justify-center mx-auto mb-4"
        >
          <Shield className="w-7 h-7 text-accent-teal" />
        </motion.div>
        <h2 className="text-xl font-bold text-text-primary">Privacy Gateway</h2>
        <p className="text-sm text-text-secondary mt-1">
          Preparing your information for analysis. Unnecessary identifiers are minimized.
        </p>
      </div>

      {/* Detected Fields */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-bg-surface border border-border-default rounded-xl overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-border-subtle bg-bg-secondary">
          <h3 className="text-sm font-semibold text-text-primary">
            {data.fieldsDetected} identifiers detected and minimized
          </h3>
        </div>
        <div className="divide-y divide-border-subtle">
          {data.fields.map((field, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="flex items-center gap-4 px-5 py-3"
            >
              <span className="text-xs font-medium text-text-tertiary w-24 shrink-0">{field.type}</span>
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-sm font-mono text-text-secondary line-through opacity-60 truncate">
                    {field.original}
                  </span>
                </div>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.3 }}
                  className="w-6 h-px bg-accent-teal"
                  style={{ transformOrigin: 'left' }}
                />
                <div className="flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-accent-teal" />
                  <span className="text-sm font-mono font-medium text-accent-teal-dark">
                    {field.minimized}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Before / After Preview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border-subtle bg-status-review-bg/50">
            <span className="text-xs font-semibold text-status-review">Original Information</span>
          </div>
          <pre className="p-4 text-[11px] font-mono text-text-secondary leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {data.originalPreview}
          </pre>
        </div>
        <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border-subtle bg-accent-teal-light">
            <span className="text-xs font-semibold text-accent-teal-dark">Minimized Payload</span>
          </div>
          <pre className="p-4 text-[11px] font-mono text-text-secondary leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {data.minimizedPreview}
          </pre>
        </div>
      </motion.div>

      {/* Status Checklist */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-wrap items-center gap-4 justify-center"
      >
        {[
          'Identity details minimized',
          'Temporary processing session',
          'Secure workflow',
        ].map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 + i * 0.1 }}
            className="flex items-center gap-1.5 text-xs text-accent-teal-dark font-medium"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-accent-teal" />
            {item}
          </motion.div>
        ))}
      </motion.div>

      {/* Continue */}
      <div className="flex justify-center pt-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          className="px-8 py-3 rounded-xl bg-accent-teal text-text-inverse font-semibold text-sm hover:bg-accent-teal-dark transition-colors shadow-sm"
        >
          Continue to Analysis
        </motion.button>
      </div>
    </div>
  );
}
