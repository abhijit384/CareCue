import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<Toast, 'id'>) => void;
  showToast: (title: string, type?: ToastType, message?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const icons = {
  success: <CheckCircle2 className="w-5 h-5 text-status-consistent" />,
  error: <AlertCircle className="w-5 h-5 text-status-safety" />,
  warning: <AlertTriangle className="w-5 h-5 text-status-review" />,
  info: <Info className="w-5 h-5 text-accent-teal" />,
};

const bgColors = {
  success: 'bg-status-consistent-bg border-status-consistent/30',
  error: 'bg-status-safety-bg border-status-safety/30',
  warning: 'bg-status-review-bg border-status-review/30',
  info: 'bg-accent-teal-light border-accent-teal/30',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = options.duration ?? 4000;
    
    setToasts((prev) => [...prev, { ...options, id, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
  }, [dismiss]);

  const showToast = useCallback((title: string, type: ToastType = 'info', message?: string) => {
    toast({ title, message, type });
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, showToast, dismiss }}>
      {children}
      <div className="toast-container" role="region" aria-live="assertive">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md',
                bgColors[t.type],
                'bg-opacity-90 dark:bg-opacity-95'
              )}
            >
              <div className="shrink-0 mt-0.5">{icons[t.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{t.title}</p>
                {t.message && (
                  <p className="text-xs text-text-secondary mt-1">{t.message}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-1 opacity-50 hover:bg-black/5 hover:opacity-100 transition-all dark:hover:bg-white/10"
              >
                <X className="w-4 h-4 text-text-primary" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
