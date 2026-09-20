import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  FileText,
  Brain,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export function HeroDepthVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInteractive] = useState(() => {
    if (typeof window === 'undefined') return false;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    return !prefersReducedMotion && !isTouch;
  });

  const [isHovered, setIsHovered] = useState(false);

  // Mouse coordinate values for desktop cursor parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for high-end damped motion
  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  // 3D Rotation transforms (capped to 5deg for restraint)
  const rotateX = useTransform(springY, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5]);

  // Layer offsets creating optical depth (z-layers)
  const panel1X = useTransform(springX, [-0.5, 0.5], [-10, 10]);
  const panel1Y = useTransform(springY, [-0.5, 0.5], [-8, 8]);

  const panel2X = useTransform(springX, [-0.5, 0.5], [-4, 4]);
  const panel2Y = useTransform(springY, [-0.5, 0.5], [-4, 4]);

  const panel3X = useTransform(springX, [-0.5, 0.5], [6, -6]);
  const panel3Y = useTransform(springY, [-0.5, 0.5], [4, -4]);

  const panel4X = useTransform(springX, [-0.5, 0.5], [10, -10]);
  const panel4Y = useTransform(springY, [-0.5, 0.5], [8, -8]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInteractive || !containerRef.current) return;
    setIsHovered(true);
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);

    // Glow position
    const glowX = e.clientX - rect.left;
    const glowY = e.clientY - rect.top;
    containerRef.current.style.setProperty('--x', `${glowX}px`);
    containerRef.current.style.setProperty('--y', `${glowY}px`);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-2xl mx-auto py-10 px-4 perspective-1200 select-none cursor-glow"
    >
      {/* Soft Ambient Depth Glows */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent-teal/15 dark:bg-accent-teal/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-ai-lavender/15 dark:bg-ai-lavender/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main 3D Tilted Card Container */}
      <motion.div
        style={{
          rotateX: isInteractive && isHovered ? rotateX : 0,
          rotateY: isInteractive && isHovered ? rotateY : 0,
          transformStyle: 'preserve-3d',
        }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        className="relative bg-bg-surface/90 dark:bg-bg-surface/95 border border-border-default dark:border-border-strong/60 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md"
      >
        {/* Central Core Content */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-teal flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 text-text-inverse" />
            </div>
            <div>
              <span className="text-xs font-bold text-accent-teal-dark dark:text-accent-teal tracking-wider uppercase block">
                Trust Path Verification
              </span>
              <h3 className="text-base font-bold text-text-primary tracking-tight">
                Complete Blood Count & Lipid Panel
              </h3>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-status-consistent-bg text-status-consistent font-bold hidden sm:inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Dual Verified
          </span>
        </div>

        {/* Central Verified Findings Row */}
        <div className="grid grid-cols-2 gap-3 my-5">
          <div className="p-3.5 rounded-xl bg-bg-secondary/70 dark:bg-bg-secondary/40 border border-border-subtle">
            <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider block">
              Hemoglobin (CBC)
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold font-mono text-status-review">10.2</span>
              <span className="text-xs text-text-tertiary">g/dL</span>
              <span className="text-[10px] font-bold text-status-review ml-auto">LOW</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">Ref: 12.0 – 16.0 g/dL</p>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-secondary/70 dark:bg-bg-secondary/40 border border-border-subtle">
            <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider block">
              Total Cholesterol
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold font-mono text-status-review">215</span>
              <span className="text-xs text-text-tertiary">mg/dL</span>
              <span className="text-[10px] font-bold text-status-review ml-auto">HIGH</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">Ref: &lt; 200 mg/dL</p>
          </div>
        </div>

        {/* Multi-Agent Consensus Pill */}
        <div className="p-3 rounded-xl bg-accent-teal-light/50 dark:bg-accent-teal-light/20 border border-accent-teal/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-accent-teal" />
            <span className="font-semibold text-text-primary">Clinical Verification:</span>
            <span>Observations aligned with source evidence</span>
          </div>
          <span className="text-accent-teal-dark font-bold text-[11px]">4 / 6 Verified</span>
        </div>

        {/* ─── Layered Surrounding 3D Floating Badges ─── */}

        {/* 1. SOURCE PANEL (Top Left) */}
        <motion.div
          style={{
            x: isInteractive && isHovered ? panel1X : 0,
            y: isInteractive && isHovered ? panel1Y : 0,
            translateZ: 40,
          }}
          animate={!isHovered && isInteractive ? { y: [0, -3, 0] } : {}}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0 }}
          className="absolute -top-5 -left-3 sm:-left-6 p-2.5 rounded-xl bg-bg-surface border border-border-default shadow-lg flex items-center gap-2 text-xs font-semibold text-text-primary z-20"
        >
          <div className="w-6 h-6 rounded-lg bg-bg-secondary flex items-center justify-center text-accent-teal">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-text-tertiary block">
              Stage 1: Source
            </span>
            <span className="text-[11px]">Direct Document Parsing</span>
          </div>
        </motion.div>

        {/* 2. ANALYSIS PANEL (Top Right) */}
        <motion.div
          style={{
            x: isInteractive && isHovered ? panel2X : 0,
            y: isInteractive && isHovered ? panel2Y : 0,
            translateZ: 50,
          }}
          animate={!isHovered && isInteractive ? { y: [0, 4, 0] } : {}}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
          className="absolute -top-5 -right-3 sm:-right-6 p-2.5 rounded-xl bg-bg-surface border border-border-default shadow-lg flex items-center gap-2 text-xs font-semibold text-text-primary z-20"
        >
          <div className="w-6 h-6 rounded-lg bg-accent-teal-light text-accent-teal flex items-center justify-center">
            <Brain className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-text-tertiary block">
              Stage 2: Analysis
            </span>
            <span className="text-[11px]">Clinical Biomarker Extraction</span>
          </div>
        </motion.div>

        {/* 3. VERIFICATION PANEL (Bottom Left) */}
        <motion.div
          style={{
            x: isInteractive && isHovered ? panel3X : 0,
            y: isInteractive && isHovered ? panel3Y : 0,
            translateZ: 60,
          }}
          animate={!isHovered && isInteractive ? { y: [0, -4, 0] } : {}}
          transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.5 }}
          className="absolute -bottom-5 -left-3 sm:-left-4 p-2.5 rounded-xl bg-bg-surface border border-border-default shadow-lg flex items-center gap-2 text-xs font-semibold text-text-primary z-20"
        >
          <div className="w-6 h-6 rounded-lg bg-ai-lavender-light text-ai-lavender flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-text-tertiary block">
              Stage 3: Verification
            </span>
            <span className="text-[11px]">Dual-Layer Fact Check</span>
          </div>
        </motion.div>

        {/* 4. NEXT STEP PANEL (Bottom Right) */}
        <motion.div
          style={{
            x: isInteractive && isHovered ? panel4X : 0,
            y: isInteractive && isHovered ? panel4Y : 0,
            translateZ: 35,
          }}
          animate={!isHovered && isInteractive ? { y: [0, 3, 0] } : {}}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1.5 }}
          className="absolute -bottom-5 -right-3 sm:-right-4 p-2.5 rounded-xl bg-bg-surface border border-border-default shadow-lg flex items-center gap-2 text-xs font-semibold text-text-primary z-20"
        >
          <div className="w-6 h-6 rounded-lg bg-bg-secondary flex items-center justify-center text-text-primary">
            <ClipboardList className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-text-tertiary block">
              Stage 4: Next Step
            </span>
            <span className="text-[11px]">Doctor Visit Brief Ready</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
