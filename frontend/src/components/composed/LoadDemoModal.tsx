import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authClient } from '@/services/authClient';
import { useToast } from '@/contexts/ToastContext';

export function LoadDemoModal() {
  const { isLoadDemoOpen, closeLoadDemoModal, refreshActivePatient, setActivePatient } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isLoadDemoOpen) return null;

  const handleConfirmLoad = async () => {
    setLoading(true);
    try {
      const res = await authClient.loadDemoPatients();
      if (res.patients && res.patients.length > 0) {
        setActivePatient(res.patients[0]);
      }
      await refreshActivePatient();
      showToast('Synthetic demonstration patients loaded (marked DEMO / SYNTHETIC).', 'success');
      closeLoadDemoModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to load demo records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="w-full max-w-md bg-bg-surface border border-border-default rounded-2xl shadow-2xl p-6 sm:p-7 relative"
      >
        <button
          type="button"
          onClick={closeLoadDemoModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              SYNTHETIC TESTING DATA
            </span>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">
              Load Synthetic Demo Data?
            </h2>
          </div>
        </div>

        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          This will create sample patient records (Rahul Sharma & Priya Sharma) with synthetic metabolic and cardiovascular data for demonstration purposes.
        </p>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5 mb-6">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            All demonstration data is explicitly tagged <strong className="font-bold">DEMO / SYNTHETIC</strong> to ensure full separation from real medical records.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeLoadDemoModal}
            className="px-4 py-2.5 rounded-xl border border-border-default text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirmLoad}
            className="px-5 py-2.5 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>Load Demo</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
