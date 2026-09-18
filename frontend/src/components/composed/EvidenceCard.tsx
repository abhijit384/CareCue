import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSearch,
  ChevronDown,
  Brain,
  Sparkles,
  BookOpen,
  X,
  Quote,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VerificationBadge } from './VerificationBadge';
import type { Insight } from '@/lib/types';

interface EvidenceCardProps {
  insight: Insight;
  index: number;
}

export function EvidenceCard({ insight, index }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05, ease: [0.2, 0, 0, 1] }}
        className="bg-bg-surface border border-border-default rounded-2xl shadow-xs hover:border-accent-teal/40 card-depth-lift transition-all"
      >
        <div className="p-4 sm:p-6">
          {/* Top category & Verification Badge */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-bg-secondary text-text-tertiary">
                {insight.category}
              </span>
              <span className="text-xs text-text-tertiary hidden sm:inline">
                · Page {insight.source.page}
              </span>
            </div>
            <VerificationBadge status={insight.verification.status} />
          </div>

          {/* Main Clinical Claim */}
          <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight leading-snug mb-2">
            {insight.claim}
          </h3>

          {/* Plain English Explanation */}
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
            {insight.explanation}
          </p>

          {/* Metric Value & Reference Range Bar */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-bg-secondary/60 border border-border-subtle mb-4">
            <div>
              <span className="text-[11px] text-text-tertiary font-semibold uppercase tracking-wider block">
                Observed Value
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className={cn(
                    'text-lg sm:text-xl font-mono font-bold',
                    insight.rangeStatus === 'outside_range'
                      ? 'text-status-review'
                      : insight.rangeStatus === 'borderline'
                      ? 'text-status-review'
                      : 'text-accent-teal-dark'
                  )}
                >
                  {insight.value}
                </span>
                <span className="text-xs text-text-tertiary font-medium">{insight.unit}</span>
              </div>
            </div>

            <div className="border-l border-border-subtle pl-3">
              <span className="text-[11px] text-text-tertiary font-semibold uppercase tracking-wider block">
                Standard Range
              </span>
              <p className="text-sm sm:text-base font-mono font-medium text-text-secondary mt-0.5">
                {insight.referenceRange}{' '}
                <span className="text-xs font-normal text-text-tertiary">{insight.unit}</span>
              </p>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border-subtle gap-2">
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary truncate">
              <FileSearch className="w-3.5 h-3.5 shrink-0 text-accent-teal" />
              <span className="truncate">
                Source: Page {insight.source.page}, {insight.source.section}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowDrawer(true)}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-text-secondary hover:text-accent-teal hover:bg-bg-secondary transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Inspect Doc
              </button>

              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-accent-teal hover:bg-accent-teal-light/50 transition-colors cursor-pointer"
              >
                <span>{expanded ? 'Hide Evidence' : 'View Evidence'}</span>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200',
                    expanded && 'rotate-180'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Accordion Expandable Evidence Panel */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
              className="overflow-hidden bg-bg-surface/50 border-t border-border-subtle"
            >
              <div className="p-4 sm:p-6 space-y-4">
                {/* 1. Raw Source Citation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                      <Quote className="w-3 h-3 text-accent-teal" />
                      Document Source Evidence
                    </span>
                    <span className="text-[11px] text-text-tertiary">
                      Page {insight.source.page} · {insight.source.section}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-text-primary leading-relaxed relative">
                    "{insight.source.text}"
                  </div>
                </div>

                {/* 2. Dual-AI Consensus Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Bedrock Model */}
                  <div className="p-3.5 rounded-xl bg-bg-secondary/70 border border-border-subtle">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-accent-teal-light text-accent-teal flex items-center justify-center">
                        <Brain className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold text-text-primary">Amazon Bedrock</span>
                      <span className="text-[10px] text-text-tertiary font-mono ml-auto">Titan/Claude</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {insight.verification.bedrockInterpretation}
                    </p>
                  </div>

                  {/* Gemini Model */}
                  <div className="p-3.5 rounded-xl bg-ai-lavender-light/30 border border-ai-lavender/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-ai-lavender-light text-ai-lavender flex items-center justify-center">
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold text-text-primary">Google Gemini</span>
                      <span className="text-[10px] text-text-tertiary font-mono ml-auto">Cross-check</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {insight.verification.geminiAssessment}
                    </p>
                  </div>
                </div>

                {/* 3. Cross-Model Synthesis Reasoning */}
                <div className="p-3.5 rounded-xl bg-accent-teal-light/40 border border-accent-teal/20">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-accent-teal-dark mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent-teal" />
                    Dual-Model Consensus Synthesis
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {insight.verification.reasoning}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Deep-Dive Evidence Drawer Modal */}
      <AnimatePresence>
        {showDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-bg-surface border border-border-default rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-surface">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent-teal" />
                  <h3 className="text-base font-bold text-text-primary">Evidence Source Drawer</h3>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 overflow-y-auto space-y-4">
                <div>
                  <span className="text-[11px] font-bold text-accent-teal-dark uppercase tracking-wider">
                    {insight.category} Finding
                  </span>
                  <h4 className="text-base font-bold text-text-primary mt-0.5">{insight.claim}</h4>
                </div>

                <div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle">
                  <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Original Document Excerpt</span>
                    <span>Page {insight.source.page}</span>
                  </div>
                  <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap leading-relaxed bg-bg-surface p-3 rounded-lg border border-border-subtle">
                    {insight.source.text}
                  </pre>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Clinical Context
                  </span>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    {insight.explanation}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-status-review-bg/50 border border-status-review/20 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-status-review shrink-0 mt-0.5" />
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Always review this exact value with your doctor. CareCue does not provide medical diagnoses.
                  </p>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-3.5 border-t border-border-subtle bg-bg-secondary/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="px-4 py-2 rounded-xl bg-accent-teal text-text-inverse text-xs font-semibold hover:bg-accent-teal-dark transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
