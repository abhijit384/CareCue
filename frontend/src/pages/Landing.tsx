import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Heart,
  FileText,
  ClipboardList,
  ArrowRight,
  Sparkles,
  Shield,
  PlayCircle,
  Stethoscope,
  Link as LinkIcon,
  AlertOctagon,
  ShieldCheck,
  BrainCircuit,
  Globe2,
  Users,
} from 'lucide-react';
import { TrustPath } from '@/components/composed/TrustPath';
import { HeroDepthVisual } from '@/components/composed/HeroDepthVisual';
import { ThemeToggle } from '@/lib/theme';
import { Button } from '@/components/composed/Button';

// Staggered text variants for hero
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
  }
};

const FadeInSection = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <motion.section
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-10%' }}
    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
    className={className}
  >
    {children}
  </motion.section>
);

export function Landing() {
  const { scrollY } = useScroll();
  const heroParallaxY = useTransform(scrollY, [0, 1000], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 800], [1, 0]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-hidden">
      {/* ─── Top Navigation Bar ─── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-bg-primary/80 backdrop-blur-md border-b border-border-subtle">
        <div className="flex items-center justify-between px-6 sm:px-10 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-teal flex items-center justify-center shadow-xs">
              <Heart className="w-4 h-4 text-text-inverse" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight text-text-primary">CareCue</span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle variant="compact" />
            <Link to="/session/flow" className="no-underline">
              <Button variant="secondary" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                <span className="hidden xs:inline">Analyze Report</span>
              </Button>
            </Link>
            <Link to="/dashboard" className="no-underline ml-1">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Section 1: Hero (Ambient Mesh + Parallax) ─── */}
      <motion.section 
        style={{ y: heroParallaxY, opacity: heroOpacity }}
        className="relative pt-32 sm:pt-40 pb-20 px-5 sm:px-10 max-w-5xl mx-auto text-center z-10"
      >
        <div className="absolute inset-0 -z-10 ambient-mesh opacity-50" />
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Subtle Privacy Pill */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-teal-light/70 border border-accent-teal/20 text-accent-teal-dark text-xs font-semibold mb-6">
            <Shield className="w-3.5 h-3.5 text-accent-teal" />
            Privacy-First Healthcare Intelligence Platform
          </motion.div>

          {/* Exact Brand Hero Headline */}
          <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary tracking-tight leading-[1.12] mb-6">
            Understand your health information.
            <br />
            <span className="text-accent-teal">Verify</span> what AI tells you.
            <br />
            <span className="text-text-secondary">Prepare</span> for better care conversations.
          </motion.h1>

          <motion.p variants={itemVariants} className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
            CareCue organizes medical records, cites exact source evidence behind every claim, cross-checks interpretations using dual-layer verification, and creates structured briefs for your doctor.
          </motion.p>

          {/* Primary & Secondary CTAs */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link to="/session/flow" className="w-full sm:w-auto no-underline">
              <Button variant="primary" size="lg" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Start a Care Session
              </Button>
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto no-underline">
              <Button variant="secondary" size="lg" className="w-full border-accent-teal/30 text-accent-teal-dark bg-accent-teal-light hover:bg-accent-teal/20" leftIcon={<ClipboardList className="w-4 h-4" />}>
                View Dashboard
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* 3D Depth Hero Object */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <HeroDepthVisual />
        </motion.div>
      </motion.section>

      {/* ─── Section 2: The Problem ─── */}
      <FadeInSection className="px-5 sm:px-10 py-24 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          Healthcare is overwhelming.
        </h2>
        <p className="text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
          When dealing with a health situation, patients are handed complex medical jargon. Understanding what it means, tracking changes over time, and knowing what to ask the doctor is a massive cognitive burden.
        </p>
      </FadeInSection>

      {/* ─── Section 3: Fragmentation ─── */}
      <FadeInSection className="px-5 sm:px-10 py-24 bg-bg-secondary/50 border-y border-border-subtle">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-12 h-12 rounded-xl bg-bg-surface border border-border-default flex items-center justify-center mb-6 shadow-sm">
              <FileText className="w-6 h-6 text-text-secondary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
              Scattered documents, no timeline.
            </h2>
            <p className="text-base text-text-secondary leading-relaxed">
              Lab results, imaging reports, and discharge summaries are scattered across portals. CareCue brings them into a unified patient timeline, allowing you to see the full picture and track vital biomarkers across multiple documents.
            </p>
          </div>
          <div className="aspect-square sm:aspect-[4/3] bg-bg-surface border border-border-default rounded-3xl shadow-lg p-6 relative overflow-hidden card-depth-lift">
             <div className="absolute inset-0 ambient-mesh opacity-30" />
             <div className="space-y-4 relative z-10">
               {[1,2,3].map(i => (
                 <div key={i} className="flex gap-4 items-center p-4 bg-bg-secondary/80 backdrop-blur-sm rounded-xl border border-border-subtle">
                   <div className="w-10 h-10 rounded-lg bg-bg-surface flex items-center justify-center text-text-tertiary font-mono text-xs shadow-xs">PDF</div>
                   <div className="flex-1">
                     <div className="w-2/3 h-4 bg-border-default rounded animate-pulse" />
                     <div className="w-1/3 h-3 bg-border-subtle rounded mt-2" />
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </FadeInSection>

      {/* ─── Section 4: Connection ─── */}
      <FadeInSection className="px-5 sm:px-10 py-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center flex-row-reverse">
          <div className="order-2 md:order-1 aspect-square sm:aspect-[4/3] bg-accent-teal/5 border border-accent-teal/20 rounded-3xl shadow-lg flex items-center justify-center card-depth-lift">
            <LinkIcon className="w-16 h-16 text-accent-teal/40" />
          </div>
          <div className="order-1 md:order-2">
            <div className="w-12 h-12 rounded-xl bg-accent-teal-light border border-accent-teal/30 flex items-center justify-center mb-6 shadow-sm">
              <Stethoscope className="w-6 h-6 text-accent-teal-dark" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
              Bridging the gap to your doctor.
            </h2>
            <p className="text-base text-text-secondary leading-relaxed">
              CareCue doesn't replace your doctor; it prepares you for them. By translating complex reports into plain language and generating structured questions, you can walk into your next appointment confident and ready.
            </p>
          </div>
        </div>
      </FadeInSection>

      {/* ─── Section 5: Privacy ─── */}
      <FadeInSection className="px-5 sm:px-10 py-24 bg-bg-secondary/50 border-y border-border-subtle text-center">
        <div className="max-w-3xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-bg-surface border border-border-default flex items-center justify-center mb-6 shadow-sm">
            <Shield className="w-8 h-8 text-status-consistent" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
            Zero-Trust Privacy Architecture
          </h2>
          <p className="text-base text-text-secondary leading-relaxed mb-8">
            Your personal health identifiers (PHI) are stripped locally on your device before any document reaches processing engines. We process the clinical data with full patient isolation.
          </p>
          <div className="flex justify-center">
            <Link to="/privacy" className="no-underline">
              <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Read our Privacy Promise
              </Button>
            </Link>
          </div>
        </div>
      </FadeInSection>

      {/* ─── Section 6: Analysis (Dual AI) ─── */}
      <FadeInSection className="px-5 sm:px-10 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-ai-lavender block mb-2">
            Clinical Processing Pipeline
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Dual-Layer Clinical Engine
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl surface-base card-depth-lift text-center">
            <BrainCircuit className="w-12 h-12 text-accent-teal mx-auto mb-6" />
            <h3 className="text-xl font-bold text-text-primary mb-3">1. Primary Clinical Extraction</h3>
            <p className="text-sm text-text-secondary">
              Structures complex medical reports, prescriptions, and discharge summaries into standardized schemas, extracting vital biomarkers and flagging out-of-range bounds.
            </p>
          </div>
          <div className="p-8 rounded-3xl surface-base card-depth-lift text-center">
            <Sparkles className="w-12 h-12 text-ai-lavender mx-auto mb-6" />
            <h3 className="text-xl font-bold text-text-primary mb-3">2. Grounded Verification Engine</h3>
            <p className="text-sm text-text-secondary">
              Acts as an independent verification layer. Cross-checks every extracted observation verbatim against the source medical document to prevent inaccuracies and ensure truthfulness.
            </p>
          </div>
        </div>
      </FadeInSection>

      {/* ─── Section 7: Verification ─── */}
      <FadeInSection className="px-5 sm:px-10 py-24 bg-bg-secondary/50 border-y border-border-subtle">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-12">
            The CareCue Trust Path
          </h2>
          <TrustPath currentStep="verification" status="consistent" showDetails={true} />
        </div>
      </FadeInSection>

      {/* ─── Section 8: Health Story (Pillars) ─── */}
      <FadeInSection className="px-5 sm:px-10 py-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          <div className="surface-base rounded-2xl p-6 sm:p-7 card-depth-lift">
            <div className="w-11 h-11 rounded-xl bg-accent-teal-light text-accent-teal-dark flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-accent-teal-dark block mb-1">
              PILLAR 1
            </span>
            <h3 className="text-lg font-bold text-text-primary mb-2">UNDERSTAND</h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Clear plain-language explanations of complex lab results and documents. Every insight remains linked to its verbatim source excerpt.
            </p>
          </div>

          <div className="surface-base rounded-2xl p-6 sm:p-7 card-depth-lift">
            <div className="w-11 h-11 rounded-xl bg-ai-lavender-light text-ai-lavender-dark flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-ai-lavender-dark block mb-1">
              PILLAR 2
            </span>
            <h3 className="text-lg font-bold text-text-primary mb-2">VERIFY</h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Extracted medical findings are cross-checked independently against source clinical evidence to guarantee consensus and factual accuracy.
            </p>
          </div>

          <div className="surface-base rounded-2xl p-6 sm:p-7 card-depth-lift">
            <div className="w-11 h-11 rounded-xl bg-bg-secondary text-text-primary flex items-center justify-center mb-4">
              <ClipboardList className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-text-tertiary block mb-1">
              PILLAR 3
            </span>
            <h3 className="text-lg font-bold text-text-primary mb-2">PREPARE</h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Generate a structured Doctor Visit Brief with out-of-range indicators, prioritized questions, and notes to share during your appointment.
            </p>
          </div>
        </div>
      </FadeInSection>

      {/* ─── Section 9: Multilingual & Doctor Brief ─── */}
      <FadeInSection className="px-5 sm:px-10 py-24 bg-bg-secondary/50 border-y border-border-subtle">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-12 h-12 rounded-xl bg-bg-surface border border-border-default flex items-center justify-center mb-6 shadow-sm">
              <Globe2 className="w-6 h-6 text-text-secondary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
              Care in your language.
            </h2>
            <p className="text-base text-text-secondary leading-relaxed">
              CareCue fully supports English, Hindi, and Bengali. The interface, explanations, and generated Doctor Briefs can be seamlessly translated, complete with natural Text-to-Speech playback for accessibility.
            </p>
          </div>
          <div className="aspect-video bg-bg-surface border border-border-default rounded-3xl shadow-lg p-8 relative flex items-center justify-center card-depth-lift">
            <div className="text-center">
              <div className="inline-flex items-center gap-4 bg-bg-secondary p-2 rounded-lg border border-border-subtle font-semibold text-text-primary">
                <span className="px-3 py-1 rounded bg-bg-surface shadow-xs">English</span>
                <span className="text-text-tertiary px-2">Hindi</span>
                <span className="text-text-tertiary px-2">Bengali</span>
              </div>
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* ─── Section 10: Emergency & CTA ─── */}
      <FadeInSection className="px-5 sm:px-10 py-32 max-w-4xl mx-auto text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-status-error/10 border border-status-error/30 flex items-center justify-center mb-8">
          <AlertOctagon className="w-8 h-8 text-status-error" />
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary mb-6">
          Safety when it matters.
        </h2>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-12">
          Emergency Mode provides a calm, non-alarmist safety assessment, rapid triage, and exportable Emergency Information Cards for first responders.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/session/new" className="w-full sm:w-auto no-underline">
            <Button variant="primary" size="lg" className="w-full">
              Get Started with CareCue
            </Button>
          </Link>
          <Link to="/emergency" className="w-full sm:w-auto no-underline">
            <Button variant="danger" size="lg" className="w-full" leftIcon={<AlertOctagon className="w-4 h-4" />}>
              View Emergency Mode
            </Button>
          </Link>
        </div>
      </FadeInSection>

      {/* ─── Footer with Clear Educational Guardrails ─── */}
      <footer className="border-t border-border-subtle py-12 px-6 sm:px-10 bg-bg-secondary">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent-teal flex items-center justify-center shadow-sm">
                <Heart className="w-4 h-4 text-text-inverse" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold text-text-primary">CareCue</span>
            </div>
            <p className="text-sm text-text-secondary max-w-sm">
              CareCue is a non-diagnostic educational companion. It does not provide medical diagnoses or prescribe medication. Always consult a licensed healthcare provider.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-text-primary mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li><Link to="/session/new" className="hover:text-accent-teal transition-colors no-underline">Start Session</Link></li>
              <li><Link to="/patients" className="hover:text-accent-teal transition-colors no-underline">Patients</Link></li>
              <li><Link to="/emergency" className="hover:text-accent-teal transition-colors no-underline">Emergency Mode</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-text-primary mb-4">Legal & Privacy</h4>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li><Link to="/privacy" className="hover:text-accent-teal transition-colors no-underline">Privacy Center</Link></li>
              <li><Link to="/settings" className="hover:text-accent-teal transition-colors no-underline">Settings</Link></li>
              <li><a href="#" className="hover:text-accent-teal transition-colors no-underline">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-8 border-t border-border-default flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-tertiary">
          <p>© {new Date().getFullYear()} CareCue. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Clinical Calm × AI Precision</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
