import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  FileText,
  ClipboardList,
  ArrowRight,
  Sparkles,
  Shield,
  PlayCircle,
} from 'lucide-react';
import { TrustPath } from '@/components/composed/TrustPath';
import { HeroDepthVisual } from '@/components/composed/HeroDepthVisual';
import { ThemeToggle } from '@/lib/theme';

export function Landing() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* ─── Top Navigation Bar ─── */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-4 max-w-6xl mx-auto border-b border-border-subtle/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent-teal flex items-center justify-center shadow-xs">
            <Heart className="w-4 h-4 text-text-inverse" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight text-text-primary">CareCue</span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <ThemeToggle variant="compact" />

          <Link
            to="/session/flow?demo=true"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent-teal/40 bg-accent-teal-light text-accent-teal-dark text-xs font-bold hover:bg-accent-teal/20 transition-all no-underline"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">TRY DEMO</span>
          </Link>

          <Link
            to="/dashboard"
            className="text-xs sm:text-sm font-semibold text-text-secondary hover:text-accent-teal transition-colors no-underline ml-1"
          >
            Dashboard →
          </Link>
        </div>
      </header>

      {/* ─── Hero Section with 3D Depth Visual ─── */}
      <section className="px-5 sm:px-10 pt-12 sm:pt-16 pb-12 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
        >
          {/* Subtle Privacy Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-teal-light/70 border border-accent-teal/20 text-accent-teal-dark text-xs font-semibold mb-6">
            <Shield className="w-3.5 h-3.5 text-accent-teal" />
            Privacy-First Healthcare Information Companion
          </div>

          {/* Exact Brand Hero Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-text-primary tracking-tight leading-[1.12] mb-6">
            Understand your health information.
            <br />
            <span className="text-accent-teal">Verify</span> what AI tells you.
            <br />
            <span className="text-text-secondary">Prepare</span> for better care conversations.
          </h1>

          <p className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto mb-8 leading-relaxed">
            CareCue organizes medical documents, shows the exact source evidence behind every claim, cross-checks interpretations using dual AI models, and creates structured briefs for your doctor.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link
              to="/session/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-accent-teal text-text-inverse font-bold text-sm hover:bg-accent-teal-dark transition-all shadow-sm hover:shadow-md no-underline cursor-pointer btn-press-micro"
            >
              Start a Care Session
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/session/flow?demo=true"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-accent-teal-light border border-accent-teal/30 text-accent-teal-dark font-bold text-sm hover:bg-accent-teal/20 transition-all no-underline cursor-pointer btn-press-micro"
            >
              <PlayCircle className="w-4 h-4" />
              TRY DEMO
            </Link>

            <a
              href="#how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border-default bg-bg-surface text-text-primary font-semibold text-sm hover:bg-bg-secondary transition-all no-underline cursor-pointer btn-press-micro"
            >
              See How It Works
            </a>
          </div>
        </motion.div>

        {/* 3D Depth Hero Object */}
        <HeroDepthVisual />
      </section>

      {/* ─── Trust Path Signature Showcase ─── */}
      <section id="how-it-works" className="px-5 sm:px-10 py-12 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
              Dual-AI Verification Pipeline
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
              The CareCue Trust Path
            </h2>
          </div>

          <TrustPath currentStep="verification" status="consistent" showDetails={true} />
        </motion.div>
      </section>

      {/* ─── The Three Pillars: UNDERSTAND, VERIFY, PREPARE ─── */}
      <section className="px-5 sm:px-10 py-12 pb-20 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {/* 1. UNDERSTAND */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="bg-bg-surface border border-border-default rounded-2xl p-6 sm:p-7 card-depth-lift"
          >
            <div className="w-11 h-11 rounded-xl bg-accent-teal-light text-accent-teal-dark flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-accent-teal-dark block mb-1">
              PILLAR 1
            </span>
            <h3 className="text-lg font-bold text-text-primary mb-2">UNDERSTAND</h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Clear plain-language explanations of complex lab results and documents. Every single insight remains explicitly linked to its source page and text.
            </p>
          </motion.div>

          {/* 2. VERIFY */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-bg-surface border border-border-default rounded-2xl p-6 sm:p-7 card-depth-lift"
          >
            <div className="w-11 h-11 rounded-xl bg-ai-lavender-light text-ai-lavender-dark flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-ai-lavender-dark block mb-1">
              PILLAR 2
            </span>
            <h3 className="text-lg font-bold text-text-primary mb-2">VERIFY</h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Important interpretations extracted by Amazon Bedrock are cross-checked independently against Google Gemini to detect consensus or highlight discrepancies.
            </p>
          </motion.div>

          {/* 3. PREPARE */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-bg-surface border border-border-default rounded-2xl p-6 sm:p-7 card-depth-lift"
          >
            <div className="w-11 h-11 rounded-xl bg-bg-secondary text-text-primary flex items-center justify-center mb-4">
              <ClipboardList className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-text-tertiary block mb-1">
              PILLAR 3
            </span>
            <h3 className="text-lg font-bold text-text-primary mb-2">PREPARE</h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Generate a structured Doctor Visit Brief with out-of-range indicators, prioritized questions, and notes ready to share with your healthcare professional.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer with Clear Educational Guardrails ─── */}
      <footer className="border-t border-border-subtle py-8 px-6 sm:px-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent-teal flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-text-inverse" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-text-primary">CareCue</span>
          </div>

          <p className="text-[11px] text-text-tertiary text-center sm:text-right max-w-md leading-normal">
            CareCue is a non-diagnostic educational companion. It does not provide medical diagnoses or prescribe medication. Always consult a licensed healthcare provider.
          </p>
        </div>
      </footer>
    </div>
  );
}
