import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  Plus,
  AlertTriangle,
  X,
  RefreshCw,
  Users,
  ChevronDown,
} from 'lucide-react';
import { sessionService } from '@/services';
import type { CareSession } from '@/lib/types';
import { EmptyState } from '@/components/composed/EmptyState';
import { ErrorState } from '@/components/composed/ErrorState';
import { formatTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Helper to group sessions by relative day
function groupSessionsByDay(sessions: CareSession[]) {
  const groups: { [key: string]: CareSession[] } = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  sessions.forEach(session => {
    const d = new Date(session.createdAt);
    d.setHours(0, 0, 0, 0);

    let key = 'EARLIER';
    if (d.getTime() === today.getTime()) {
      key = 'TODAY';
    } else if (d.getTime() === yesterday.getTime()) {
      key = 'YESTERDAY';
    } else {
      key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(session);
  });

  return groups;
}

export function History() {
  const navigate = useNavigate();
  const { patients, activePatient, setActivePatient } = useAuth();
  const effectiveActivePatient = activePatient || (patients.length > 0 ? patients[0] : null);

  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<CareSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSessions = async (pId?: string) => {
    const targetId = pId || effectiveActivePatient?.patientId;
    if (!targetId) {
      setSessions([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await sessionService.list(targetId);
      setSessions(data);
    } catch (_err) {
      console.error(_err);
      setError('Could not load session history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveActivePatient?.patientId) {
      loadSessions(effectiveActivePatient.patientId);
    } else {
      setSessions([]);
      setLoading(false);
    }
  }, [effectiveActivePatient?.patientId]);

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      await sessionService.delete(sessionToDelete.id);
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
      setSessionToDelete(null);
    } catch (_err) {
      console.error(_err);
      setError('Failed to delete session. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getSessionUrl = (session: CareSession) => {
    switch (session.type) {
      case 'report':
        return `/session/flow?sessionId=${session.id}`;
      case 'brief':
        return `/brief?sessionId=${session.id}`;
      case 'guidance':
        return `/guidance?sessionId=${session.id}`;
      default:
        return `/session/flow?sessionId=${session.id}`;
    }
  };

  const getSessionLabel = (session: CareSession) => {
    switch (session.type) {
      case 'report':
        return 'Report understood';
      case 'brief':
        return 'Doctor brief prepared';
      case 'guidance':
        return 'Care guidance inquiry';
      default:
        return 'Care session';
    }
  };

  const grouped = groupSessionsByDay(sessions);
  const groupKeys = Object.keys(grouped);

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-teal-light text-accent-teal-dark text-xs font-semibold mb-2">
            <Clock className="w-3.5 h-3.5" />
            Session Timeline
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            History & Records
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Clinical history and verification logs for <strong>{effectiveActivePatient?.name || 'selected patient'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {patients.length > 1 && effectiveActivePatient && (
            <div className="relative">
              <select
                value={effectiveActivePatient.patientId}
                onChange={e => {
                  const target = patients.find(p => p.patientId === e.target.value);
                  if (target) setActivePatient(target);
                }}
                aria-label="Select Patient for History"
                className="appearance-none pl-8 pr-7 py-2 rounded-xl bg-bg-surface border border-border-default text-xs font-bold text-text-primary focus:outline-hidden focus:border-accent-teal cursor-pointer shadow-2xs"
              >
                {patients.map(p => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.name} {p.relationship ? `(${p.relationship})` : ''}
                  </option>
                ))}
              </select>
              <Users className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <Link
            to="/session/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-teal text-text-inverse font-medium text-sm hover:bg-accent-teal-dark transition-colors shadow-sm no-underline shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Session
          </Link>
        </div>
      </div>

      {/* Loading state with timeline skeletons */}
      {loading && (
        <div className="space-y-8 pl-4 border-l-2 border-border-subtle">
          {[1, 2, 3].map(i => (
            <div key={i} className="relative pl-6 space-y-3">
              <div className="absolute -left-[25px] top-1.5 w-3 h-3 rounded-full bg-border-default ring-4 ring-bg-primary" />
              <div className="w-24 h-4 skeleton rounded" />
              <div className="h-24 skeleton rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <ErrorState
          variant="session_unavailable"
          title="Unable to Load History"
          message={error}
          onRetry={loadSessions}
          onBack={() => navigate('/dashboard')}
        />
      )}

      {/* Empty state */}
      {!loading && !error && sessions.length === 0 && (
        <EmptyState
          icon={<Clock className="w-8 h-8 text-text-tertiary" />}
          title="No care sessions yet"
          description="Your verified reports, doctor briefs, and guidance questions will appear here in an editorial timeline."
          action={
            <Link
              to="/session/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-teal text-text-inverse font-medium text-sm no-underline hover:bg-accent-teal-dark transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Start Your First Session
            </Link>
          }
        />
      )}

      {/* Editorial Timeline */}
      {!loading && !error && sessions.length > 0 && (
        <div className="space-y-10">
          {groupKeys.map(groupTitle => (
            <div key={groupTitle} className="relative">
              {/* Group Heading */}
              <div className="sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-xs py-2 mb-4 border-b border-border-subtle">
                <span className="text-xs font-bold tracking-widest text-text-tertiary uppercase">
                  {groupTitle}
                </span>
              </div>

              {/* Timeline Items */}
              <div className="relative pl-6 sm:pl-8 space-y-4 border-l-2 border-accent-teal/20 ml-2 sm:ml-3">
                {grouped[groupTitle].map((session, idx) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className="relative group"
                  >
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-[31px] sm:-left-[39px] top-4 w-3.5 h-3.5 rounded-full bg-accent-teal ring-4 ring-bg-primary group-hover:scale-125 transition-transform" />

                    {/* Timeline Card */}
                    <div className="bg-bg-surface border border-border-default rounded-xl p-4 sm:p-5 hover:border-accent-teal/40 hover:shadow-md transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Content summary */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs font-semibold text-accent-teal-dark mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
                            {getSessionLabel(session)}
                            <span className="text-text-tertiary font-normal">
                              · {formatTime(session.createdAt)}
                            </span>
                          </div>

                          <h3 className="text-base font-semibold text-text-primary tracking-tight">
                            {session.documentName || 'CareCue Session'}
                          </h3>

                          {/* Stats / Badges */}
                          <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
                            {session.verifiedCount != null && session.verifiedCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-consistent-bg text-status-consistent text-xs font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                {session.verifiedCount} Verified Insights
                              </span>
                            )}
                            {session.reviewCount != null && session.reviewCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-review-bg text-status-review text-xs font-semibold">
                                <AlertCircle className="w-3 h-3" />
                                {session.reviewCount} Discuss with Doctor
                              </span>
                            )}
                            {session.type === 'brief' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-bg-secondary text-text-secondary text-xs font-medium">
                                <ClipboardList className="w-3 h-3" />
                                Ready for visit
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-start pt-2 sm:pt-0">
                          <Link
                            to={getSessionUrl(session)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary hover:bg-accent-teal-light text-text-primary hover:text-accent-teal-dark text-xs font-semibold transition-colors no-underline"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => setSessionToDelete(session)}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-status-review hover:bg-status-review-bg/50 transition-colors cursor-pointer"
                            title="Delete session"
                            aria-label={`Delete ${session.documentName || 'session'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-bg-surface border border-border-default rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-status-review-bg text-status-review flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-lg font-bold text-text-primary mb-1">
                Delete this session?
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                Are you sure you want to delete <span className="font-semibold text-text-primary">"{sessionToDelete.documentName || 'this session'}"</span>? This will remove the extracted findings, dual-AI verification records, and generated doctor brief from your device.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSessionToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl border border-border-default text-text-secondary text-sm font-medium hover:bg-bg-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-status-review text-text-inverse text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Session
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
