import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ClipboardList,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { TrustPath, type TrustPathStatus } from '@/components/composed/TrustPath';
import { UploadDropzone } from '@/components/composed/UploadDropzone';
import { PrivacyGateway } from '@/components/composed/PrivacyGateway';
import { ProcessingTimeline } from '@/components/composed/ProcessingTimeline';
import { EvidenceCard } from '@/components/composed/EvidenceCard';
import { CardSkeleton } from '@/components/composed/EmptyState';
import { SafetyAlert } from '@/components/composed/SafetyAlert';
import { DualAIPanel } from '@/components/composed/DualAIPanel';
import { ErrorState } from '@/components/composed/ErrorState';
import { delay } from '@/lib/utils';
import { MOCK_ANALYSIS, MOCK_PRIVACY_RESULT } from '@/services/mockData';
import type { AnalysisResult, ProcessingStep, TrustPathStep } from '@/lib/types';

type FlowStage = 'upload' | 'privacy' | 'processing' | 'verification' | 'results' | 'error';

export function SessionFlow() {
  const [searchParams] = useSearchParams();
  const isDemoParam = searchParams.get('demo') === 'true';

  const [isDemo, setIsDemo] = useState(isDemoParam);
  const [stage, setStage] = useState<FlowStage>('upload');
  const [trustStep, setTrustStep] = useState<TrustPathStep>('source');
  const [trustStatus, setTrustStatus] = useState<TrustPathStatus | undefined>(undefined);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { id: 'extract', label: 'Extracting document text & tables', status: 'pending' },
    { id: 'understand', label: 'Clinical entity recognition (Bedrock)', status: 'pending' },
    { id: 'evidence', label: 'Source attribution & quote matching', status: 'pending' },
    { id: 'verify', label: 'Dual-AI consensus verification (Gemini)', status: 'pending' },
    { id: 'results', label: 'Compiling structured findings', status: 'pending' },
  ]);

  const handleFileSelected = useCallback(async (_file: File) => {
    // Move to privacy gateway after upload
    await delay(600);
    setTrustStep('source');
    setStage('privacy');
  }, []);

  const handleStartDemo = useCallback(() => {
    setIsDemo(true);
    handleFileSelected(new File(['demo'], 'Sample_Blood_Panel.pdf', { type: 'application/pdf' }));
  }, [handleFileSelected]);

  // Auto-start demo mode if query param is set
  useEffect(() => {
    if (isDemoParam) {
      handleStartDemo();
    }
  }, [isDemoParam, handleStartDemo]);

  const handlePrivacyContinue = useCallback(async () => {
    setStage('processing');
    setTrustStep('analysis');
    setTrustStatus('processing');

    // Simulate processing steps with realistic staggered timings
    const stepIds = ['extract', 'understand', 'evidence', 'verify', 'results'];
    const delays = [900, 1100, 1000, 1200, 800];

    for (let i = 0; i < stepIds.length; i++) {
      setProcessingSteps(prev =>
        prev.map(s => (s.id === stepIds[i] ? { ...s, status: 'active' as const } : s))
      );
      await delay(delays[i]);
      setProcessingSteps(prev =>
        prev.map(s => (s.id === stepIds[i] ? { ...s, status: 'complete' as const } : s))
      );

      if (i === 2) {
        setTrustStep('verification');
        setTrustStatus('processing');
      }
    }

    // Show verification convergence panel
    setStage('verification');
    setTrustStep('verification');
    setTrustStatus('processing');
    await delay(2200);

    // Show results
    setAnalysis(MOCK_ANALYSIS);
    setStage('results');
    setTrustStep('next_step');
    setTrustStatus('consistent');
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-6 sm:py-10">
      {/* Demo Mode Floating Notice */}
      {isDemo && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-status-review-bg border border-status-review/30 text-status-review text-xs font-bold shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>DEMO MODE — Synthetic CBC & Lipid Panel Fixture</span>
        </motion.div>
      )}

      {/* Signature Trust Path */}
      <div className="mb-8">
        <TrustPath currentStep={trustStep} status={trustStatus} showDetails={stage === 'results' || stage === 'verification'} />
      </div>

      {/* Flow Stages */}
      <AnimatePresence mode="wait">
        {/* ─── 1. UPLOAD ─── */}
        {stage === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                  Upload Health Document
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                  Upload a lab report, blood panel, or summary to begin the CareCue verification flow.
                </p>
              </div>

              {/* Instant 1-Click Demo Trigger */}
              <button
                type="button"
                onClick={handleStartDemo}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-teal-light border border-accent-teal/30 text-accent-teal-dark text-xs font-bold hover:bg-accent-teal/20 transition-all shadow-xs self-start sm:self-auto cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-accent-teal" />
                Try Sample Report
              </button>
            </div>

            <UploadDropzone
              onFileSelect={handleFileSelected}
              className="mb-6"
            />

            <div className="p-4 rounded-xl bg-bg-surface border border-border-default flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-xs text-text-tertiary">
                <FileCheck2 className="w-4 h-4 text-accent-teal shrink-0" />
                <span>Supports PDF, PNG, JPEG reports up to 20MB.</span>
              </div>
              <span className="text-xs text-text-secondary font-medium hidden sm:inline">
                PII is detected and minimized prior to model routing.
              </span>
            </div>
          </motion.div>
        )}

        {/* ─── 2. PRIVACY GATEWAY ─── */}
        {stage === 'privacy' && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <PrivacyGateway
              data={MOCK_PRIVACY_RESULT}
              onContinue={handlePrivacyContinue}
            />
          </motion.div>
        )}

        {/* ─── 3. PROCESSING ─── */}
        {stage === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2">
              Analyzing & Cross-Checking Report
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mb-8 max-w-md mx-auto">
              Your minimized document is being processed through the multi-agent Trust Path.
            </p>

            <div className="max-w-md mx-auto mb-10 bg-bg-surface border border-border-default p-6 rounded-2xl shadow-xs">
              <ProcessingTimeline steps={processingSteps} />
            </div>

            {/* Skeleton Preview */}
            <div className="space-y-4 max-w-2xl mx-auto">
              {[1, 2, 3].map(i => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── 4. VERIFICATION CONVERGENCE ─── */}
        {stage === 'verification' && (
          <motion.div
            key="verification"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <DualAIPanel />
          </motion.div>
        )}

        {/* ─── 5. RESULTS ─── */}
        {stage === 'results' && analysis && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header & Verification Summary */}
            <div className="bg-bg-surface border border-border-default rounded-2xl p-6 sm:p-7 shadow-xs mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-accent-teal-dark bg-accent-teal-light px-2.5 py-0.5 rounded-full">
                      ANALYSIS COMPLETE
                    </span>
                    {isDemo && (
                      <span className="text-[11px] font-bold tracking-widest uppercase text-status-review bg-status-review-bg px-2.5 py-0.5 rounded-full">
                        DEMO MODE
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                    Your Report Findings, Clarified
                  </h1>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Link
                    to="/brief"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-teal text-text-inverse text-xs font-bold hover:bg-accent-teal-dark transition-all shadow-xs no-underline"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Doctor Brief
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                <div className="p-3.5 rounded-xl bg-bg-secondary/70 border border-border-subtle">
                  <span className="text-xs text-text-tertiary">Total Insights</span>
                  <p className="text-xl font-bold text-text-primary mt-0.5">
                    {analysis.summary.totalInsights}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-status-consistent-bg/50 border border-status-consistent/20">
                  <span className="text-xs text-status-consistent font-medium">Verified Consistent</span>
                  <p className="text-xl font-bold text-status-consistent mt-0.5">
                    {analysis.summary.consistent}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-status-review-bg/50 border border-status-review/20">
                  <span className="text-xs text-status-review font-medium">Needs Clinical Review</span>
                  <p className="text-xl font-bold text-status-review mt-0.5">
                    {analysis.summary.needsReview}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-bg-secondary/70 border border-border-subtle">
                  <span className="text-xs text-text-tertiary">Dual-Model Consensus</span>
                  <p className="text-sm font-bold text-accent-teal-dark mt-1">Bedrock + Gemini</p>
                </div>
              </div>
            </div>

            {/* List of Evidence Cards */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                  Verified Insights & Biomarkers ({analysis.insights.length})
                </h2>
                <span className="text-xs text-text-tertiary">Expand cards to view evidence drawer</span>
              </div>

              {analysis.insights.map((insight, i) => (
                <EvidenceCard key={insight.id} insight={insight} index={i} />
              ))}
            </div>

            {/* Next Steps Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-5 rounded-2xl bg-bg-surface border border-border-default shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-teal-light text-accent-teal-dark flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Ready to prepare for your appointment?</h3>
                  <p className="text-xs text-text-secondary">Export a structured summary with your notes and prioritized questions.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/history"
                  className="px-4 py-2.5 rounded-xl border border-border-default text-text-primary hover:bg-bg-secondary text-xs font-semibold transition-colors no-underline text-center"
                >
                  Save to History
                </Link>
                <Link
                  to="/brief"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs hover:bg-accent-teal-dark transition-all shadow-xs no-underline"
                >
                  <span>Generate Doctor Brief</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Calm Non-Alarming Guardrail Safety Notice */}
            <SafetyAlert
              type="info"
              title="Educational Analysis Notice"
              message={analysis.disclaimer}
              className="mt-6"
            />
          </motion.div>
        )}

        {/* ─── ERROR STATE ─── */}
        {stage === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12"
          >
            <ErrorState
              variant="upload_failed"
              message={errorMessage || undefined}
              onRetry={() => setStage('upload')}
              onDemoFallback={handleStartDemo}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
