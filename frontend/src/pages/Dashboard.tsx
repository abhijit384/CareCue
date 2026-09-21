import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  ShieldCheck,
  ClipboardList,
  AlertOctagon,
  ArrowRight,
  Shield,
  Clock,
  FileSearch,
  CheckCircle2,
  Plus,
  Users,
  MessageCircle,
  Database,
  Languages,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { getGreeting } from '@/lib/utils';
import { sessionService, patientService } from '@/services';
import type { CareSession, PatientDocument, Patient } from '@/lib/types';
import { EmptyState } from '@/components/composed/EmptyState';
import { SkeletonDocument } from '@/components/composed/Skeleton';
import { formatDate, formatTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { FolderOpen, Sparkles } from 'lucide-react';

interface StoredDocItem {
  doc: PatientDocument;
  patient: Patient;
}

export function Dashboard() {
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [storedDocs, setStoredDocs] = useState<StoredDocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [docToDelete, setDocToDelete] = useState<StoredDocItem | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const { user, patients, activePatient, setActivePatient, openOnboarding, openLoadDemoModal, refreshActivePatient } = useAuth();
  const effectiveActivePatient = activePatient || (patients.length > 0 ? patients[0] : null);

  const handleConfirmDeleteDoc = async () => {
    if (!docToDelete) return;
    setDeletingDoc(true);
    try {
      await patientService.deleteDocument(docToDelete.patient.patientId, docToDelete.doc.documentId);
      setStoredDocs(prev => prev.filter(d => d.doc.documentId !== docToDelete.doc.documentId));
      if (refreshActivePatient) {
        await refreshActivePatient();
      }
      setDocToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete document:', err);
      alert(err.message || 'Failed to delete document');
    } finally {
      setDeletingDoc(false);
    }
  };

  useEffect(() => {
    if (effectiveActivePatient?.patientId) {
      setLoading(true);
      Promise.all([
        sessionService.list(effectiveActivePatient.patientId),
        patientService.getDocuments(effectiveActivePatient.patientId),
      ])
        .then(([sess, docs]) => {
          setSessions(sess);
          setStoredDocs((docs || []).map(d => ({ doc: d, patient: effectiveActivePatient })));
        })
        .catch(err => {
          console.error('Error loading dashboard data:', err);
          setSessions([]);
          setStoredDocs([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setSessions([]);
      setStoredDocs([]);
      setLoading(false);
    }
  }, [effectiveActivePatient?.patientId]);


  const greetingName = user?.firstName || 'Your CareCue';

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
      {/* Top Greeting & Emergency Action */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            {getGreeting(greetingName)}.
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Empowering your care with plain-language explanations, dual verification, and clinical readiness.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/emergency"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error font-bold text-xs hover:bg-status-error/20 transition-all shadow-xs no-underline"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>EMERGENCY SOS</span>
          </Link>
          <Link
            to="/translate-explain"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent-teal-light border border-accent-teal/30 text-accent-teal-dark font-bold text-xs hover:bg-accent-teal/20 transition-all shadow-xs no-underline"
          >
            <Languages className="w-4 h-4 text-accent-teal" />
            <span>TRANSLATE & EXPLAIN</span>
          </Link>
        </div>
      </motion.div>

      {/* ─── Zero State: NO PATIENTS YET ─── */}
      {patients.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-accent-teal/10 via-bg-surface to-accent-teal/5 border-2 border-dashed border-accent-teal/30 text-center shadow-xs"
        >
          <div className="w-14 h-14 rounded-2xl bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Users className="w-7 h-7 text-accent-teal" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2">
            NO PATIENTS YET — Create a patient to start building a Health Story.
          </h2>
          <p className="text-sm text-text-secondary max-w-lg mx-auto mb-6">
            Or explore the system with synthetic data.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openOnboarding()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs hover:bg-accent-teal-dark transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Patient</span>
            </button>
            <button
              type="button"
              onClick={() => openLoadDemoModal()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-surface border border-border-default text-text-primary font-semibold text-xs hover:bg-bg-secondary transition-all shadow-xs cursor-pointer"
            >
              <Database className="w-4 h-4 text-text-tertiary" />
              <span>Load Sample Profile</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── Active Patient Bar (When Patients Exist) ─── */}
      {patients.length > 0 && effectiveActivePatient && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-xl bg-bg-surface border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center font-bold text-sm">
              {(effectiveActivePatient.name && effectiveActivePatient.name !== 'Patient' ? effectiveActivePatient.name : (user?.firstName || 'P'))[0]?.toUpperCase() || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-text-primary">
                  {effectiveActivePatient.name && effectiveActivePatient.name !== 'Patient' && effectiveActivePatient.name !== 'User'
                    ? effectiveActivePatient.name
                    : ((effectiveActivePatient.relationship === 'Self' || !effectiveActivePatient.relationship) && user?.firstName
                        ? `${user.firstName} ${user.lastName || ''}`.trim()
                        : effectiveActivePatient.name || 'Patient')}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-secondary text-text-secondary border border-border-default">
                  {effectiveActivePatient.patientId || effectiveActivePatient.id}
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">
                Relationship: <strong className="text-text-secondary">{effectiveActivePatient.relationship || 'Self'}</strong>
                {effectiveActivePatient.age ? ` · ${effectiveActivePatient.age} yrs` : ''}
                {effectiveActivePatient.gender ? ` · ${effectiveActivePatient.gender}` : ''}
                {effectiveActivePatient.bloodGroup ? ` · ${effectiveActivePatient.bloodGroup}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {patients.length > 1 && (
              <div className="relative">
                <select
                  value={effectiveActivePatient.patientId}
                  onChange={e => {
                    const target = patients.find(p => p.patientId === e.target.value);
                    if (target) setActivePatient(target);
                  }}
                  aria-label="Switch Active Patient"
                  className="appearance-none pl-8 pr-7 py-1.5 rounded-lg bg-bg-secondary border border-border-default text-xs font-bold text-text-primary focus:outline-hidden focus:border-accent-teal cursor-pointer"
                >
                  {patients.map(p => {
                    const pName = p.name && p.name !== 'Patient' && p.name !== 'User'
                      ? p.name
                      : ((p.relationship === 'Self' || !p.relationship) && user?.firstName
                          ? `${user.firstName} ${user.lastName || ''}`.trim()
                          : p.name || 'Patient');
                    return (
                      <option key={p.patientId} value={p.patientId}>
                        {pName} {p.relationship ? `(${p.relationship})` : ''}
                      </option>
                    );
                  })}
                </select>
                <Users className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
            <Link
              to="/patients"
              className="text-xs font-semibold text-accent-teal hover:underline no-underline"
            >
              View Full Chart →
            </Link>
          </div>
        </motion.div>
      )}

      {/* ─── The Four Primary Pillars: UNDERSTAND, VERIFY, PREPARE, EMERGENCY MODE ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* 1. UNDERSTAND */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
        >
          <Link
            to="/session/flow"
            className="group relative flex flex-col justify-between h-full bg-gradient-to-b from-bg-surface to-accent-teal-light/20 border-2 border-accent-teal/40 hover:border-accent-teal rounded-2xl p-5 shadow-xs hover:shadow-md transition-all no-underline overflow-hidden"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-accent-teal text-text-inverse flex items-center justify-center mb-3.5 shadow-sm group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-accent-teal/15 text-accent-teal-dark mb-2 inline-block">
                UNDERSTAND
              </span>
              <h2 className="text-base font-bold text-text-primary group-hover:text-accent-teal-dark transition-colors">
                Explain Reports
              </h2>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Break down lab values into simple language with Standard vs. Beginner modes, why it appears, and talking points.
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-accent-teal">
              <span>Explain Report</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>

        {/* 2. VERIFY */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <Link
            to="/session/flow?audit=true"
            className="group flex flex-col justify-between h-full bg-bg-surface border border-border-default hover:border-accent-teal/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all no-underline"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-accent-teal-light text-accent-teal-dark flex items-center justify-center mb-3.5 shadow-xs group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5 text-accent-teal" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-bg-secondary text-text-tertiary mb-2 inline-block">
                VERIFY
              </span>
              <h2 className="text-base font-bold text-text-primary group-hover:text-accent-teal-dark transition-colors">
                Audit Clinical Text
              </h2>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Compare AI findings directly against source document text with dual-model consistency and confidence scores.
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-text-secondary group-hover:text-accent-teal transition-colors">
              <span>Verify Findings</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>

        {/* 3. PREPARE */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          <Link
            to="/brief"
            className="group flex flex-col justify-between h-full bg-bg-surface border border-border-default hover:border-ai-lavender/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all no-underline"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-ai-lavender-light text-ai-lavender-dark flex items-center justify-center mb-3.5 shadow-xs group-hover:scale-105 transition-transform">
                <ClipboardList className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-bg-secondary text-text-tertiary mb-2 inline-block">
                PREPARE
              </span>
              <h2 className="text-base font-bold text-text-primary group-hover:text-ai-lavender-dark transition-colors">
                Doctor Visit Brief
              </h2>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Generate a 1-page clinical summary and prioritized questions, ready to translate into Hindi and Bengali.
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-text-secondary group-hover:text-ai-lavender-dark transition-colors">
              <span>View Brief</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>

        {/* 4. EMERGENCY MODE */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          <Link
            to="/emergency"
            className="group flex flex-col justify-between h-full bg-bg-surface border border-status-error/30 hover:border-status-error/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all no-underline"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-status-error/15 text-status-error flex items-center justify-center mb-3.5 shadow-xs group-hover:scale-105 transition-transform">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-status-error/15 text-status-error mb-2 inline-block">
                EMERGENCY MODE
              </span>
              <h2 className="text-base font-bold text-text-primary group-hover:text-status-error transition-colors">
                Safety Triage
              </h2>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Calm, non-alarmist safety assessment with rapid triage and exportable Emergency Information Cards for first responders.
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-status-error">
              <span>Open Emergency</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>
      </div>

      {/* ─── Stored Medical Records: Quick Explain & Audit ─── */}
      {storedDocs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mb-8 p-5 sm:p-6 rounded-2xl bg-bg-surface border border-border-default shadow-xs"
        >
          <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent-teal/15 text-accent-teal flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-accent-teal" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary">
                  Stored Records & Documents for {effectiveActivePatient?.name || 'Patient'} ({storedDocs.length})
                </h2>
                <p className="text-[11px] text-text-secondary">
                  Choose any past prescription or report to explain in simple words or audit verification.
                </p>
              </div>
            </div>

            <Link
              to="/session/flow"
              className="text-xs font-bold text-accent-teal hover:underline no-underline"
            >
              Open Session Flow →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {storedDocs.slice(0, 4).map(({ doc, patient }) => (
              <div
                key={doc.documentId}
                className="p-4 rounded-xl border border-border-subtle bg-bg-secondary/40 hover:border-accent-teal/40 hover:bg-bg-secondary/70 transition-all flex flex-col justify-between space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="pr-6">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-accent-teal/10 text-accent-teal-dark border border-accent-teal/20 inline-block mb-1">
                      {doc.documentType || 'REPORT'}
                    </span>
                    <h4 className="text-xs font-bold text-text-primary line-clamp-1">
                      {doc.displayName || doc.originalFileName || 'Medical Document'}
                    </h4>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Patient: <strong className="text-text-primary">{patient.name}</strong> · {formatDate(doc.createdAt || (doc as any).uploadedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocToDelete({ doc, patient })}
                    title="Delete Document"
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-status-error hover:bg-status-error/10 border border-transparent hover:border-status-error/30 transition-all cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-border-subtle/60">
                  <Link
                    to={`/session/flow?patientId=${patient.patientId}&docId=${doc.documentId}&explain=true`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-[11px] font-bold transition-all shadow-2xs no-underline text-center"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Explain Simply</span>
                  </Link>
                  <Link
                    to={`/session/flow?patientId=${patient.patientId}&docId=${doc.documentId}&audit=true`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-surface hover:bg-bg-secondary text-text-primary text-[11px] font-semibold border border-border-default transition-all shadow-2xs no-underline text-center"
                  >
                    <ShieldCheck className="w-3 h-3 text-accent-teal" />
                    <span>Audit</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Patient Management Quick Access Banner ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-10 p-5 rounded-2xl bg-gradient-to-r from-bg-surface via-bg-surface to-accent-teal-light/20 border border-border-default hover:border-accent-teal/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-teal-light text-accent-teal-dark flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-accent-teal" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary">
                Patient Profiles & Multi-Document Timeline
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-teal/15 text-accent-teal-dark font-semibold">
                Updated
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Manage patient identities, upload new documents to existing charts, and compare biomarker trajectories over time.
            </p>
          </div>
        </div>

        <Link
          to="/patients"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-surface border border-border-strong text-text-primary font-semibold text-xs hover:border-accent-teal hover:text-accent-teal-dark transition-all no-underline shrink-0"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Manage Patients</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>

      {/* ─── Recent Sessions ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-tertiary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              Recent Care Sessions ({effectiveActivePatient?.name || 'Patient'})
            </h2>
          </div>
          <Link
            to="/history"
            className="text-xs font-semibold text-accent-teal hover:underline no-underline"
          >
            View Full Timeline →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <SkeletonDocument key={i} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-6 h-6 text-text-tertiary" />}
            title="No past sessions"
            description="Your recent CareCue sessions will appear here with verification summaries."
            action={
              <Link
                to="/session/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-teal text-text-inverse font-medium text-xs no-underline hover:bg-accent-teal-dark transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Start a Care Session
              </Link>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {sessions.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
              >
                <Link
                  to={
                    session.type === 'brief'
                      ? '/brief'
                      : session.type === 'guidance'
                      ? '/guidance'
                      : `/session/flow?sessionId=${session.id}`
                  }
                  className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 bg-bg-surface border border-border-default rounded-xl hover:border-accent-teal/40 hover:shadow-xs transition-all no-underline"
                >
                  <div className="w-9 h-9 rounded-lg bg-bg-secondary flex items-center justify-center shrink-0">
                    {session.type === 'report' && <FileSearch className="w-4 h-4 text-text-secondary" />}
                    {session.type === 'guidance' && <MessageCircle className="w-4 h-4 text-text-secondary" />}
                    {session.type === 'brief' && <ClipboardList className="w-4 h-4 text-text-secondary" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {session.documentName || 'Care Session'}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {formatDate(session.createdAt)} · {formatTime(session.createdAt)}
                      {session.insightCount != null && ` · ${session.insightCount} insights`}
                    </p>
                  </div>

                  {session.verifiedCount != null && session.verifiedCount > 0 && (
                    <div className="hidden sm:flex items-center gap-1 text-xs text-status-consistent font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{session.verifiedCount} verified</span>
                    </div>
                  )}

                  <ArrowRight className="w-4 h-4 text-text-tertiary shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Privacy Notice Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="mt-8 flex items-center justify-between p-4 rounded-xl bg-accent-teal-light/40 border border-accent-teal/15"
      >
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-accent-teal shrink-0" />
          <div>
            <p className="text-xs sm:text-sm font-semibold text-accent-teal-dark">
              Privacy-First Processing Active
            </p>
            <p className="text-[11px] sm:text-xs text-text-secondary">
              Personal health identifiers are minimized before model interpretation.
            </p>
          </div>
        </div>

        <Link
          to="/privacy"
          className="text-xs font-bold text-accent-teal-dark hover:underline no-underline shrink-0 hidden sm:inline"
        >
          Privacy Center →
        </Link>
      </motion.div>

      {/* Delete Document Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-bg-surface border border-status-error/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-status-error">
              <div className="p-3 bg-status-error/10 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Delete Medical Document</h3>
                <p className="text-xs text-text-secondary">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed bg-bg-secondary/60 p-3 rounded-xl border border-border-subtle">
              Are you sure you want to permanently delete <strong className="text-text-primary">{docToDelete.doc.displayName || docToDelete.doc.originalFileName}</strong> from <strong className="text-text-primary">{docToDelete.patient.name}</strong>'s medical chart?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={deletingDoc}
                className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDoc}
                disabled={deletingDoc}
                className="px-4 py-2 text-xs font-bold text-white bg-status-error hover:bg-status-error/90 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
              >
                {deletingDoc ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Document</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
