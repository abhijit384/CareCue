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
import { LanguageSelector } from '@/components/composed/LanguageSelector';
import { EmptyState } from '@/components/composed/EmptyState';
import { ErrorState } from '@/components/composed/ErrorState';
import { Button } from '@/components/composed/Button';
import { SkeletonDoctorBrief } from '@/components/composed/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { doctorBriefService, translationService, patientService } from '@/services';
import type { DoctorBrief, Language, Patient } from '@/lib/types';
import { cn } from '@/lib/utils';

export function DoctorBriefPage() {
  const [searchParams] = useSearchParams();
  const { activePatient, patients, setActivePatient } = useAuth();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(activePatient?.patientId || '');
  const [brief, setBrief] = useState<DoctorBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [userNotes, setUserNotes] = useState('');

  // Multilingual translation state
  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [translating, setTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [translatedDiscussion, setTranslatedDiscussion] = useState<string[] | null>(null);

  // Sync selected patient
  useEffect(() => {
    if (activePatient?.patientId) {
      setSelectedPatientId(activePatient.patientId);
    } else if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].patientId);
      setActivePatient(patients[0]);
    }
  }, [activePatient, patients, selectedPatientId, setActivePatient]);

  const loadStoredBrief = useCallback(async (pId: string) => {
    if (!pId) {
      setBrief(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await doctorBriefService.get(pId);
      if (data && (data.documentSummary || (data as any).summary) && (data.keyFindings || (data as any).findings)) {
        setBrief(data);
      } else {
        setBrief(null);
      }
    } catch {
      setBrief(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadStoredBrief(selectedPatientId);
    }
  }, [selectedPatientId, loadStoredBrief]);

  const handleGenerateBrief = async () => {
    if (!selectedPatientId) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await doctorBriefService.generate(selectedPatientId, userNotes);
      setBrief(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not synthesize the doctor brief. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleLanguageChange = async (lang: Language) => {
    setCurrentLang(lang);
    if (lang === 'en' || !brief) {
      setTranslatedSummary(null);
      setTranslatedDiscussion(null);
      return;
    }
    setTranslating(true);
    try {
      const translatedBrief = await translationService.translateBrief(brief, lang);
      setTranslatedSummary(translatedBrief.documentSummary);
      setTranslatedDiscussion(translatedBrief.discussionItems);
    } catch (e) {
      console.error('Translation error:', e);
    } finally {
      setTranslating(false);
    }
  };

  const activeSummary = translatedSummary || brief?.documentSummary || '';
  const activeDiscussion = translatedDiscussion || brief?.discussionItems || [];

  const handleCopy = () => {
    if (!brief) return;
    const keyFindingsList = brief.keyFindings || [];
    const text = [
      '==========================================',
      'CARECUE DOCTOR VISIT BRIEF (EDUCATIONAL AID)',
      '==========================================',
      `Date: ${brief.sessionDate || new Date().toLocaleDateString()}`,
      `Language: ${currentLang.toUpperCase()}`,
      '',
      'SUMMARY',
      activeSummary,
      '',
      'KEY FINDINGS & OBSERVATIONS',
      ...keyFindingsList.map(
        f => `• ${f.finding}: ${f.value} (Ref Range: ${f.range}) [${f.verificationStatus === 'consistent' ? 'Verified Consistent' : 'Flagged for Review'}]`
      ),
      '',
      'RECOMMENDED DISCUSSION QUESTIONS',
      ...(Array.isArray(activeDiscussion) ? activeDiscussion : []).map(d => `? ${d}`),
      '',
      ...(userNotes ? ['PATIENT NOTES', userNotes, ''] : []),
      'DISCLAIMER',
      brief.disclaimer || 'CareCue is an educational AI assistant and does not provide formal medical diagnosis.',
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!brief) return;
    const keyFindingsList = brief.keyFindings || [];
    const text = [
      'CARECUE DOCTOR VISIT BRIEF',
      `Date: ${brief.sessionDate || new Date().toLocaleDateString()}`,
      `Language: ${currentLang.toUpperCase()}`,
      '',
      'DOCUMENT SUMMARY',
      activeSummary,
      '',
      'KEY FINDINGS',
      ...keyFindingsList.map(f => `• ${f.finding}: ${f.value} (Range: ${f.range})`),
      '',
      'QUESTIONS TO DISCUSS WITH DOCTOR',
      ...(Array.isArray(activeDiscussion) ? activeDiscussion : []).map(d => `• ${d}`),
      '',
      ...(userNotes ? ['PATIENT NOTES', userNotes, ''] : []),
      '',
      'DISCLAIMER',
      brief.disclaimer || 'CareCue is an educational AI assistant and does not provide formal medical diagnosis.',
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CareCue_Doctor_Brief_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (generating) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-accent-teal-light flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 text-accent-teal animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Synthesizing Doctor Visit Brief</h2>
          <p className="text-xs sm:text-sm text-text-secondary max-w-sm mx-auto leading-relaxed mb-6">
            Grounded strictly in actual patient records and laboratory markers...
          </p>
          <div className="text-left mt-6">
            <SkeletonDoctorBrief />
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
          onRetry={handleGenerateBrief}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12">
        <SkeletonDoctorBrief />
      </div>
    );
  }

  if (!brief) {
    const curP = patients.find(p => p.patientId === selectedPatientId) || activePatient;
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12">
        <div className="p-8 rounded-2xl bg-bg-surface border border-border-default shadow-xs text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center mx-auto">
            <ClipboardList className="w-7 h-7 text-accent-teal" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">
              Doctor Visit Brief
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto mt-1.5 leading-relaxed">
              Synthesize an evidence-grounded summary for your doctor appointment based on all stored clinical documents.
            </p>
          </div>

          {patients.length > 0 ? (
            <div className="max-w-md mx-auto space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Target Patient
                </label>
                <select
                  value={selectedPatientId}
                  onChange={e => {
                    setSelectedPatientId(e.target.value);
                    const found = patients.find(p => p.patientId === e.target.value);
                    if (found) setActivePatient(found);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-semibold focus:outline-none focus:border-accent-teal"
                >
                  {patients.map(p => (
                    <option key={p.patientId} value={p.patientId}>
                      {p.name} ({p.patientId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Optional Questions or Notes for Doctor
                </label>
                <textarea
                  rows={3}
                  value={userNotes}
                  onChange={e => setUserNotes(e.target.value)}
                  placeholder="e.g. Discuss recent blood sugar trends and fatigue..."
                  className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-none focus:border-accent-teal resize-none"
                />
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleGenerateBrief}
                  disabled={!selectedPatientId || generating}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs hover:bg-accent-teal-dark transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Synthesize Doctor Brief</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <Link
                to="/session/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs no-underline hover:bg-accent-teal-dark transition-colors shadow-xs"
              >
                <FileSearch className="w-4 h-4" />
                <span>Upload a Medical Report First</span>
              </Link>
            </div>
          )}
        </div>
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

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <LanguageSelector
            currentLanguage={currentLang}
            onLanguageChange={handleLanguageChange}
            size="sm"
          />

          <Button
            variant="secondary"
            onClick={handleCopy}
            leftIcon={copied ? <CheckCircle2 className="w-3.5 h-3.5 text-accent-teal" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <Button
            variant="secondary"
            onClick={handleDownload}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Save .txt
          </Button>

          <Button
            variant="primary"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Brief
          </Button>
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
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
              Document Context
            </h2>
            {currentLang !== 'en' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-teal/15 text-accent-teal-dark font-semibold">
                Translated to {currentLang === 'hi' ? 'हिन्दी' : 'বাংলা'}
              </span>
            )}
          </div>
          {translating ? (
            <div className="flex items-center gap-2 text-xs text-text-tertiary py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-teal" />
              <span>Translating summary...</span>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              {activeSummary}
            </p>
          )}
        </div>

        {/* 2. Key Findings Table */}
        <div className="px-6 sm:px-8 py-5 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
              Extracted Key Findings ({(brief.keyFindings || []).length})
            </h2>
            <span className="text-xs text-text-tertiary">Verified Against Clinical Documents</span>
          </div>

          {(!brief.keyFindings || brief.keyFindings.length === 0) ? (
            <p className="text-xs text-text-tertiary italic">No specific lab markers or findings flagged for this brief.</p>
          ) : (
            <div className="space-y-3">
              {(brief.keyFindings || []).map((finding, i) => (
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
          )}
        </div>

        {/* 3. Discussion Items */}
        <div className="px-6 sm:px-8 py-5 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
              Suggested Talking Points for Your Doctor
            </h2>
            {currentLang !== 'en' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-teal/15 text-accent-teal-dark font-semibold">
                Translated
              </span>
            )}
          </div>
          {translating ? (
            <div className="flex items-center gap-2 text-xs text-text-tertiary py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-teal" />
              <span>Translating discussion points...</span>
            </div>
          ) : (!activeDiscussion || activeDiscussion.length === 0) ? (
            <p className="text-xs text-text-tertiary italic">No specific discussion questions generated.</p>
          ) : (
            <ul className="space-y-2.5">
              {(Array.isArray(activeDiscussion) ? activeDiscussion : []).map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-text-secondary leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-accent-teal-light text-accent-teal-dark flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
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
