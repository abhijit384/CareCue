import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, AlertTriangle, UserX, Plus, Users, X } from 'lucide-react';
import type { PatientMatchResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PatientMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchResult: PatientMatchResult | null;
  onAttachToPatient: (patientId: string) => void;
  onCreateNewPatient: (initialName?: string) => void;
  onChooseExistingPatient: () => void;
}

export function PatientMatchModal({
  isOpen,
  onClose,
  matchResult,
  onAttachToPatient,
  onCreateNewPatient,
  onChooseExistingPatient,
}: PatientMatchModalProps) {
  if (!isOpen || !matchResult) return null;

  const isExact = matchResult.matchType === 'EXACT_NAME_MATCH';
  const isDifferent = matchResult.matchType === 'DIFFERENT_PATIENT';
  const isNoMatch = matchResult.matchType === 'NO_MATCH' || !matchResult.extractedName;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md rounded-2xl bg-bg-surface border border-border-subtle shadow-xl overflow-hidden z-10 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-surface-secondary/40">
            <div className="flex items-center gap-2">
              {isExact && (
                <div className="w-8 h-8 rounded-xl bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-accent-teal" />
                </div>
              )}
              {isDifferent && (
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
              )}
              {isNoMatch && (
                <div className="w-8 h-8 rounded-xl bg-bg-surface-secondary text-text-muted flex items-center justify-center">
                  <UserX className="w-4 h-4 text-text-muted" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-text-primary tracking-tight">
                  {isExact && 'MATCH FOUND'}
                  {isDifferent && 'DIFFERENT PATIENT'}
                  {isNoMatch && 'PATIENT NAME NOT FOUND'}
                </h3>
                <p className="text-[11px] text-text-muted">Document Identity Verification</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface-hover"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* 1. Exact / Existing Match Flow */}
            {isExact && matchResult.matchedPatient && (
              <>
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed space-y-1.5">
                  <p className="font-bold text-xs text-amber-800 dark:text-amber-300">
                    Existing Patient Profile Detected
                  </p>
                  <p>
                    A patient profile for <strong>"{matchResult.matchedPatient.name}"</strong> already exists with <strong>Patient ID: {matchResult.matchedPatient.patientId}</strong> ({matchResult.matchedPatient.documentCount} existing records).
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    Do you want to upload and add this document to that existing patient chart, or create a fresh new patient profile?
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onAttachToPatient(matchResult.matchedPatient!.patientId)}
                    className="w-full py-2.5 px-4 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs hover:bg-accent-teal-dark transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Upload to Existing Patient ({matchResult.matchedPatient.patientId})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreateNewPatient(matchResult.extractedName || undefined)}
                    className="w-full py-2.5 px-4 rounded-xl border border-border-default bg-bg-surface text-text-primary font-semibold text-xs hover:bg-bg-surface-hover transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-accent-teal" />
                    <span>Create as a Fresh New Patient</span>
                  </button>
                </div>
              </>
            )}

            {/* 2. Different Patient Flow */}
            {isDifferent && (
              <>
                {(matchResult.isSelfProfile || matchResult.targetPatient?.relationship === 'Self') ? (
                  <>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed space-y-2">
                      <p className="font-bold text-sm text-amber-700 dark:text-amber-300">
                        Prescription Belongs to Another Person
                      </p>
                      <p>
                        The uploaded document is for <strong>"{matchResult.extractedName}"</strong>, but your personal "Self" profile is registered to <strong>"{matchResult.targetPatient?.name}"</strong>.
                      </p>
                      {matchResult.matchedPatient ? (
                        <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                          Notice: A profile for <strong>"{matchResult.matchedPatient.name}"</strong> already exists with <strong>Patient ID: {matchResult.matchedPatient.patientId}</strong>.
                        </p>
                      ) : (
                        <p className="text-[11px] text-text-secondary">
                          To maintain accurate clinical history, please upload your own document, or create a separate profile for <strong>"{matchResult.extractedName}"</strong>.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2.5 pt-2">
                      {matchResult.matchedPatient && (
                        <button
                          type="button"
                          onClick={() => onAttachToPatient(matchResult.matchedPatient!.patientId)}
                          className="w-full py-2.5 px-4 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs hover:bg-accent-teal-dark transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Upload to Existing Profile ({matchResult.matchedPatient.name} · {matchResult.matchedPatient.patientId})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onCreateNewPatient(matchResult.extractedName || undefined)}
                        className="w-full py-2.5 px-4 rounded-xl border border-border-default bg-bg-surface text-text-primary font-semibold text-xs hover:bg-bg-surface-hover transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-accent-teal" />
                        <span>Create Fresh New Profile for "{matchResult.extractedName}"</span>
                      </button>

                      <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2 text-center text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                      >
                        Upload My Own Document Instead
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs leading-relaxed space-y-1.5">
                      <p className="font-bold text-xs text-amber-800 dark:text-amber-300">
                        Patient Identity Mismatch
                      </p>
                      <p>
                        The document belongs to <strong className="underline">{matchResult.extractedName}</strong> (Selected: {matchResult.targetPatient?.name}).
                      </p>
                      {matchResult.matchedPatient && (
                        <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                          A patient profile for <strong>"{matchResult.matchedPatient.name}"</strong> already exists (Patient ID: <strong>{matchResult.matchedPatient.patientId}</strong>).
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary">What would you like to do?</p>
                    <div className="flex flex-col gap-2 pt-1">
                      {matchResult.matchedPatient && (
                        <button
                          type="button"
                          onClick={() => onAttachToPatient(matchResult.matchedPatient!.patientId)}
                          className="w-full py-2.5 px-4 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs hover:bg-accent-teal-dark transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Upload to Existing Patient ({matchResult.matchedPatient.name} · {matchResult.matchedPatient.patientId})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onCreateNewPatient(matchResult.extractedName || undefined)}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                          matchResult.matchedPatient
                            ? 'border border-border-default bg-bg-surface text-text-primary hover:bg-bg-surface-hover'
                            : 'bg-accent-teal text-text-inverse hover:bg-accent-teal-dark'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Fresh New Patient Profile for "{matchResult.extractedName}"</span>
                      </button>
                      <button
                        type="button"
                        onClick={onChooseExistingPatient}
                        className="w-full py-2 px-4 rounded-xl border border-border-subtle bg-bg-surface text-text-secondary font-semibold text-xs hover:bg-bg-surface-hover transition-all cursor-pointer"
                      >
                        Choose Another Existing Patient
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* 3. No Name Found Flow */}
            {isNoMatch && (
              <>
                <p className="text-xs text-text-secondary leading-relaxed">
                  CareCue could not reliably extract a patient name from this document. Please select how you wish to file it:
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onChooseExistingPatient}
                    className="w-full py-2.5 px-4 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs hover:bg-accent-teal-dark transition-all shadow-xs cursor-pointer"
                  >
                    Choose Existing Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreateNewPatient()}
                    className="w-full py-2.5 px-4 rounded-xl border border-border-subtle bg-bg-surface text-text-primary font-semibold text-xs hover:bg-bg-surface-hover transition-all cursor-pointer"
                  >
                    Create Patient Manually
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer Cancel */}
          <div className="px-6 py-3 border-t border-border-subtle bg-bg-surface-secondary/40 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-text-muted hover:text-text-primary px-3 py-1.5 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
