import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Heart,
  Download,
  Copy,
  CheckCircle2,
  Printer,
  Loader2,
  FileSearch,
} from 'lucide-react';
import { VerificationBadge } from '@/components/composed/VerificationBadge';
import { EmptyState } from '@/components/composed/EmptyState';
import { ErrorState } from '@/components/composed/ErrorState';
import { doctorBriefService } from '@/services';
import type { DoctorBrief } from '@/lib/types';
import { cn } from '@/lib/utils';

export function DoctorBriefPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') || 'session-001';

  const [brief, setBrief] = useState<DoctorBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [userNotes, setUserNotes] = useState('');

  const fetchBrief = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doctorBriefService.generate(sessionId);
      setBrief(data);
    } catch (_err) {
      console.error(_err);
      setError('Could not generate the doctor brief for this session.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  const handleCopy = () => {
    if (!brief) return;
    const text = [
      '==========================================',
      'CARECUE DOCTOR VISIT BRIEF (EDUCATIONAL AID)',
      '==========================================',
      `Date: ${brief.sessionDate}`,
      '',
      'SUMMARY',
      brief.documentSummary,
      '',
      'KEY FINDINGS & OBSERVATIONS',
      ...brief.keyFindings.map(
        f => `• ${f.finding}: ${f.value} (Ref Range: ${f.range}) [${f.verificationStatus === 'consistent' ? 'Verified Consistent' : 'Flagged for Review'}]`
      ),
      '',
      'RECOMMENDED DISCUSSION QUESTIONS',
      ...brief.discussionItems.map(d => `? ${d}`),
      '',
      ...(userNotes ? ['PATIENT NOTES', userNotes, ''] : []),
      'DISCLAIMER',
      brief.disclaimer,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!brief) return;
    const text = [
      'CARECUE DOCTOR VISIT BRIEF',
      `Date: ${brief.sessionDate}`,
      '',
      'DOCUMENT SUMMARY',
      brief.documentSummary,
      '',
      'KEY FINDINGS',
      ...brief.keyFindings.map(f => `• ${f.finding}: ${f.value} (Range: ${f.range})`),
      '',
      'QUESTIONS TO DISCUSS WITH DOCTOR',
      ...brief.discussionItems.map(d => `• ${d}`),
      '',
      ...(userNotes ? ['PATIENT NOTES', userNotes, ''] : []),
      '',
      'DISCLAIMER',
      brief.disclaimer,
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CareCue_Doctor_Brief_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-accent-teal-light flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 text-accent-teal animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Preparing Your Doctor Visit Brief</h2>
          <p className="text-xs sm:text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
            Consolidating dual-AI verified findings, outside-range biomarkers, and clinical discussion points...
          </p>
          <div className="max-w-md mx-auto space-y-3 pt-6">
            <div className="h-6 skeleton rounded-md" />
            <div className="h-28 skeleton rounded-xl" />
            <div className="h-32 skeleton rounded-xl" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12">
        <ErrorState
          variant="session_unavailable"
          title="Doctor Brief Unavailable"
          message={error}
          onRetry={fetchBrief}
        />
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12">
        <EmptyState
          icon={<ClipboardList className="w-8 h-8 text-text-tertiary" />}
          title="No Doctor Brief Generated"
          description="A doctor visit brief is prepared automatically once you analyze a document or complete a care guidance session."
          action={
            <Link
              to="/session/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-teal text-text-inverse font-medium text-sm no-underline hover:bg-accent-teal-dark transition-colors shadow-sm"
            >
              <FileSearch className="w-4 h-4" />
              Analyze a Report
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
      {/* Header & Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8"
      >
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-teal-light text-accent-teal-dark text-xs font-semibold mb-2">
            <ClipboardList className="w-3.5 h-3.5" />
            Appointment Preparation
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Doctor Visit Brief
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Concise, evidence-backed summary tailored for efficient doctor communication.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-default text-xs font-semibold text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-accent-teal" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-default text-xs font-semibold text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Save .txt
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-teal text-text-inverse text-xs font-semibold hover:bg-accent-teal-dark transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Brief
          </button>
        </div>
      </motion.div>

      {/* Brief Document Container */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-bg-surface border border-border-default rounded-2xl shadow-md overflow-hidden"
      >
        {/* Document Banner */}
        <div className="px-6 sm:px-8 py-5 border-b border-border-subtle bg-bg-secondary/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-teal flex items-center justify-center">
              <Heart className="w-4 h-4 text-text-inverse" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-accent-teal-dark">
                CareCue Clinical Companion
              </span>
              <p className="text-sm font-bold text-text-primary">Patient Appointment Brief</p>
            </div>
          </div>
          <span className="text-xs text-text-tertiary font-mono">{brief.sessionDate}</span>
        </div>

        {/* 1. Document Summary */}
        <div className="px-6 sm:px-8 py-5 border-b border-border-subtle">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-2">
            Document Context
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {brief.documentSummary}
          </p>
        </div>

        {/* 2. Key Findings Table */}
        <div className="px-6 sm:px-8 py-5 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
              Extracted Key Findings ({brief.keyFindings.length})
            </h2>
            <span className="text-xs text-text-tertiary">Cross-checked with Bedrock & Gemini</span>
          </div>

          <div className="space-y-3">
            {brief.keyFindings.map((finding, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors',
                  finding.discussWithDoctor
                    ? 'bg-status-review-bg/25 border-status-review/25'
                    : 'bg-bg-secondary/40 border-border-subtle'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">{finding.finding}</p>
                    {finding.discussWithDoctor && (
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-status-review-bg text-status-review uppercase">
                        Priority
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm font-mono font-bold text-text-primary">
                      {finding.value}
                    </span>
                    <span className="text-xs text-text-tertiary font-mono">
                      Ref: {finding.range}
                    </span>
                  </div>
                </div>

                <div className="self-end sm:self-auto shrink-0">
                  <VerificationBadge status={finding.verificationStatus} size="sm" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 3. Discussion Items */}
        <div className="px-6 sm:px-8 py-5 border-b border-border-subtle">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-3">
            Suggested Talking Points for Your Doctor
          </h2>
          <ul className="space-y-2.5">
            {brief.discussionItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-text-secondary leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-accent-teal-light text-accent-teal-dark flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 4. Patient Personal Notes */}
        <div className="px-6 sm:px-8 py-5 border-b border-border-subtle bg-bg-secondary/20">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-2">
            Your Personal Questions & Symptoms (Optional)
          </h2>
          <textarea
            value={userNotes}
            onChange={e => setUserNotes(e.target.value)}
            placeholder="Add personal notes, symptom notes, or specific questions you want to remember..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border-default bg-bg-surface text-xs sm:text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-hidden focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20 transition-all"
          />
        </div>

        {/* 5. Disclaimer Notice */}
        <div className="px-6 sm:px-8 py-4 bg-bg-secondary/60">
          <p className="text-[11px] text-text-tertiary leading-relaxed text-center">
            {brief.disclaimer}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
