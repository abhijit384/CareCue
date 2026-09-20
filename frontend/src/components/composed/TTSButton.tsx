import React from 'react';
import { Volume2, Square, AlertCircle } from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';

interface TTSButtonProps {
  text: string;
  lang?: string;
  className?: string;
}

export function TTSButton({ text, lang = 'en', className = '' }: TTSButtonProps) {
  const { speak, stop, isPlaying, supported, errorMessage } = useTTS();

  if (!supported || !text) return null;

  return (
    <div className="inline-flex flex-col items-start gap-1">
      {isPlaying ? (
        <button
          type="button"
          onClick={stop}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-danger-bg border border-status-danger/30 text-status-danger text-xs font-bold hover:bg-status-danger/20 transition-all cursor-pointer ${className}`}
          title="Stop reading"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Stop</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => speak(text, lang)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-surface border border-border-default text-text-primary hover:text-accent-teal hover:border-accent-teal/40 text-xs font-semibold transition-all shadow-2xs cursor-pointer ${className}`}
          title="Listen to explanation"
        >
          <Volume2 className="w-3.5 h-3.5 text-accent-teal" />
          <span>Listen</span>
        </button>
      )}
      {errorMessage && (
        <span className="inline-flex items-center gap-1 text-[11px] text-status-review font-medium mt-1">
          <AlertCircle className="w-3 h-3" />
          {errorMessage}
        </span>
      )}
    </div>
  );
}
