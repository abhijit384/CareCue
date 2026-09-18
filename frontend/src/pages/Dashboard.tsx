import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  MessageCircle,
  ClipboardList,
  ArrowRight,
  Shield,
  Clock,
  FileSearch,
  CheckCircle2,
  PlayCircle,
  Plus,
} from 'lucide-react';
import { getGreeting } from '@/lib/utils';
import { sessionService } from '@/services';
import type { CareSession } from '@/lib/types';
import { EmptyState } from '@/components/composed/EmptyState';
import { formatDate, formatTime } from '@/lib/utils';

export function Dashboard() {
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionService.list().then(data => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
      {/* Top Greeting & Demo Pill */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            {getGreeting()}.
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            What health information would you like to explore today?
          </p>
        </div>

        <Link
          to="/session/flow?demo=true"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-teal-light border border-accent-teal/30 text-accent-teal-dark font-bold text-xs hover:bg-accent-teal/20 transition-all shadow-xs self-start sm:self-auto no-underline"
        >
          <PlayCircle className="w-4 h-4 text-accent-teal" />
          <span>TRY DEMO FLOW</span>
        </Link>
      </motion.div>

      {/* ─── The Three Primary Actions ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {/* 1. Primary Action: Understand a Report */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="md:col-span-1"
        >
          <Link
            to="/session/flow"
            className="group relative flex flex-col justify-between h-full bg-gradient-to-b from-bg-surface to-accent-teal-light/20 border-2 border-accent-teal/40 hover:border-accent-teal rounded-2xl p-6 shadow-xs hover:shadow-md transition-all no-underline overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-teal/10 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-accent-teal text-text-inverse flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-accent-teal/15 text-accent-teal-dark mb-2 inline-block">
                RECOMMENDED
              </span>
              <h2 className="text-base font-bold text-text-primary group-hover:text-accent-teal-dark transition-colors">
                Understand a Report
              </h2>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Upload a lab panel or medical document to extract findings and verify them with dual AI.
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-5 text-xs font-bold text-accent-teal">
              <span>Start Session</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>

        {/* 2. Action: Care Guidance */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.35 }}
          className="md:col-span-1"
        >
          <Link
            to="/guidance"
            className="group flex flex-col justify-between h-full bg-bg-surface border border-border-default hover:border-ai-lavender/50 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all no-underline"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-ai-lavender-light text-ai-lavender-dark flex items-center justify-center mb-4 shadow-xs group-hover:scale-105 transition-transform">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-bg-secondary text-text-tertiary mb-2 inline-block">
                INQUIRY
              </span>
              <h2 className="text-base font-bold text-text-primary group-hover:text-ai-lavender-dark transition-colors">
                Care Guidance
              </h2>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Ask questions about biomarkers, medical terminology, and receive educational insights.
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-5 text-xs font-bold text-text-secondary group-hover:text-ai-lavender-dark transition-colors">
              <span>Ask a Question</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>

        {/* 3. Action: Prepare for a Doctor Visit */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
          className="md:col-span-1"
        >
          <Link
            to="/brief"
            className="group flex flex-col justify-between h-full bg-bg-surface border border-border-default hover:border-border-strong rounded-2xl p-6 shadow-xs hover:shadow-md transition-all no-underline"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-bg-secondary text-text-primary flex items-center justify-center mb-4 shadow-xs group-hover:scale-105 transition-transform">
                <ClipboardList className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-bg-secondary text-text-tertiary mb-2 inline-block">
                APPOINTMENT
              </span>
              <h2 className="text-base font-bold text-text-primary group-hover:text-text-primary transition-colors">
                Doctor Visit Brief
              </h2>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Generate a clean, focused single-page brief summarizing findings and prioritized questions.
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-5 text-xs font-bold text-text-secondary group-hover:text-text-primary transition-colors">
              <span>View Brief</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>
      </div>

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
              Recent Care Sessions
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
              <div key={i} className="h-16 skeleton rounded-xl" />
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
    </div>
  );
}
