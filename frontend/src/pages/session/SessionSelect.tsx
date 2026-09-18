import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, MessageCircle, ClipboardList, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionType } from '@/lib/types';

const OPTIONS: { type: SessionType; icon: React.ElementType; title: string; description: string; accent: string }[] = [
  {
    type: 'report',
    icon: FileText,
    title: 'Understand a Report',
    description: 'Upload a medical document — lab results, imaging report, or discharge summary — and receive evidence-linked insights.',
    accent: 'bg-accent-teal-light text-accent-teal border-accent-teal/30',
  },
  {
    type: 'guidance',
    icon: MessageCircle,
    title: 'Care Guidance',
    description: 'Ask a health-related question and receive structured, informational guidance with verification.',
    accent: 'bg-ai-lavender-light text-ai-lavender border-ai-lavender/30',
  },
  {
    type: 'brief',
    icon: ClipboardList,
    title: 'Doctor Visit Brief',
    description: 'Compile your documents and notes into a structured preparation document for your next appointment.',
    accent: 'bg-bg-secondary text-text-primary border-border-default',
  },
];

export function SessionSelect() {
  const [selected, setSelected] = useState<SessionType | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selected === 'report') navigate('/session/flow');
    else if (selected === 'guidance') navigate('/guidance');
    else if (selected === 'brief') navigate('/brief');
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-text-primary mb-2">Start a Care Session</h1>
        <p className="text-sm text-text-secondary mb-8">
          Choose what you'd like help with. Each session follows the CareCue Trust Path.
        </p>
      </motion.div>

      <div className="space-y-3 mb-8">
        {OPTIONS.map((option, i) => (
          <motion.button
            key={option.type}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            onClick={() => setSelected(option.type)}
            className={cn(
              'w-full text-left p-5 rounded-xl border-2 transition-all',
              selected === option.type
                ? `${option.accent} shadow-sm`
                : 'bg-bg-surface border-border-default hover:border-border-strong hover:shadow-sm'
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                selected === option.type ? option.accent : 'bg-bg-secondary text-text-secondary'
              )}>
                <option.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-text-primary mb-1">{option.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{option.description}</p>
              </div>
              {selected === option.type && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-accent-teal flex items-center justify-center shrink-0 mt-1"
                >
                  <Check className="w-3.5 h-3.5 text-text-inverse" strokeWidth={3} />
                </motion.div>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: selected ? 1 : 0.4 }}
        className="flex justify-end"
      >
        <button
          onClick={handleContinue}
          disabled={!selected}
          className={cn(
            'inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm transition-all no-underline',
            selected
              ? 'bg-accent-teal text-text-inverse hover:bg-accent-teal-dark cursor-pointer shadow-sm'
              : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
          )}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
