import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  HeartHandshake,
  UserPlus,
  ArrowRight,
  RefreshCw,
  FileUp,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { patientService, documentService } from '@/services';
import { useToast } from '@/contexts/ToastContext';
import { UploadDropzone } from '@/components/composed/UploadDropzone';
import type { Patient } from '@/lib/types';

const RELATIONSHIP_OPTIONS = [
  'Self',
  'Mother',
  'Father',
  'Brother',
  'Sister',
  'Spouse',
  'Child',
  'Grandparent',
  'Other',
];

type OnboardingStep = 'form' | 'upload' | 'processing' | 'success' | 'mismatch' | 'reupload_help';

export function PatientOnboardingModal() {
  const { isOnboardingOpen, closeOnboarding, setActivePatient, refreshActivePatient, user, patients } = useAuth();
  const { showToast } = useToast();

  // Compute self name from the current authenticated user
  const selfName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  // Form states
  const [relationship, setRelationship] = useState('Self');
  const [name, setName] = useState(() => selfName);
  const [relationshipDetail, setRelationshipDetail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Not specified');
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Wizard progression states
  const [step, setStep] = useState<OnboardingStep>('form');
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  const [documentType, setDocumentType] = useState('PRESCRIPTION');
  const [extractedName, setExtractedName] = useState<string>('');
  const [uploadedDocId, setUploadedDocId] = useState<string>('');

  // Sync name when modal opens
  React.useEffect(() => {
    if (isOnboardingOpen && relationship === 'Self' && selfName) {
      setName(selfName);
    }
    if (!isOnboardingOpen) {
      // Reset state on close
      setStep('form');
      setCreatedPatient(null);
      setErrorBanner(null);
      setExtractedName('');
      setUploadedDocId('');
    }
  }, [isOnboardingOpen, selfName]);

  if (!isOnboardingOpen) return null;

  const handleClose = () => {
    closeOnboarding();
    setStep('form');
    setCreatedPatient(null);
    setErrorBanner(null);
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveName = relationship === 'Self' && selfName ? selfName : name.trim();
    if (!effectiveName) {
      setErrorBanner('Please provide the patient name.');
      return;
    }
    if (relationship === 'Other' && !relationshipDetail.trim()) {
      setErrorBanner('Please specify the relationship (e.g. Aunt, Uncle, Guardian).');
      return;
    }

    setErrorBanner(null);
    setLoading(true);
    try {
      const created = await patientService.create({
        name: effectiveName,
        relationship,
        relationshipDetail: relationship === 'Other' ? relationshipDetail.trim() : undefined,
        userId: user?.userId,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender !== 'Not specified' ? gender : undefined,
      });

      setCreatedPatient(created);
      setActivePatient(created);
      try {
        await refreshActivePatient(created.patientId);
      } catch (e) {
        console.warn('refreshActivePatient notice:', e);
      }
      showToast(`Patient profile created for ${created.name}`, 'success');

      // Seamlessly advance to immediate document upload flow
      setErrorBanner(null);
      setStep('upload');
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to create patient profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSelected = async (file: File) => {
    if (!createdPatient) return;
    setStep('processing');
    setErrorBanner(null);

    try {
      const uploadRes = await documentService.upload(file, createdPatient.patientId, documentType);
      const docPatientName = uploadRes.detectedPatient?.name || uploadRes.structuredData?.patient?.name;
      const matchRes = uploadRes.matchResult;
      const docId = uploadRes.document?.documentId || '';
      setUploadedDocId(docId);

      // 1. If AI service is busy, show clear message
      if (uploadRes.geminiStatus === 'RATE_LIMITED' || matchRes?.matchType === 'RATE_LIMITED') {
        setErrorBanner('Clinical verification engine is currently busy. Your text has been securely preserved.');
        setStep('upload');
        return;
      }

      // 2. Check for Name Match vs Mismatch
      const isExactMatch = matchRes?.isTargetMatch === true;
      const isMismatch = matchRes?.matchType === 'DIFFERENT_PATIENT' || (!!docPatientName && !isExactMatch);

      if (isMismatch && docPatientName && docPatientName.trim()) {
        const cleanName = docPatientName.trim();
        // If the initial profile name was a generic placeholder like "Self" or "Patient", auto-adopt the extracted name
        if (createdPatient.name.toLowerCase() === 'self' || createdPatient.name.toLowerCase() === 'patient') {
          try {
            const updated = await patientService.update(createdPatient.patientId, { name: cleanName });
            if (updated) {
              setCreatedPatient(updated);
              setActivePatient(updated);
            }
            await patientService.attachDocument(createdPatient.patientId, docId, true);
            await refreshActivePatient(createdPatient.patientId);
            showToast(`Patient profile updated to ${cleanName} and document verified`, 'success');
            setStep('success');
            return;
          } catch (e) {
            console.error('Failed to auto-update placeholder name:', e);
          }
        }

        // Real mismatch between explicit names (e.g. "Abhijit" vs "Alamgir Mandal")
        setExtractedName(cleanName);
        setStep('mismatch');
      } else if (isExactMatch) {
        await patientService.attachDocument(createdPatient.patientId, docId, true);
        await refreshActivePatient(createdPatient.patientId);
        showToast(`Document verified and added to ${createdPatient.name}'s records`, 'success');
        setStep('success');
      } else {
        // Document without explicit name tag
        await patientService.attachDocument(createdPatient.patientId, docId, true);
        await refreshActivePatient(createdPatient.patientId);
        showToast(`Document saved to ${createdPatient.name}`, 'info');
        setStep('success');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Document processing failed. Please try again.');
      setStep('upload');
    }
  };

  // Option 1: Create a separate dedicated profile for the extracted patient name
  const handleCreateNewProfileForExtracted = async () => {
    if (!uploadedDocId || !extractedName) {
      handleClose();
      return;
    }
    setLoading(true);
    try {
      const newPatient = await patientService.createFromDocument(
        uploadedDocId,
        extractedName.trim(),
        undefined,
        'Created from verified document'
      );
      if (newPatient) {
        setCreatedPatient(newPatient);
        setActivePatient(newPatient);
        await refreshActivePatient(newPatient.patientId);
        showToast(`New Patient Profile & ID created for ${newPatient.name}`, 'success');
        setStep('success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create separate patient profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Option 2: Rename currently created profile to extracted name
  const handleUpdateProfileNameToExtracted = async () => {
    if (!createdPatient || !uploadedDocId) {
      handleClose();
      return;
    }
    setLoading(true);
    try {
      if (extractedName && extractedName.trim()) {
        const updated = await patientService.update(createdPatient.patientId, { name: extractedName.trim() });
        if (updated) {
          setCreatedPatient(updated);
          setActivePatient(updated);
        }
      }
      await patientService.attachDocument(createdPatient.patientId, uploadedDocId, true);
      await refreshActivePatient(createdPatient.patientId);
      showToast(`Profile name updated to ${extractedName || createdPatient.name} and document attached`, 'success');
      setStep('success');
    } catch (err: any) {
      showToast(err.message || 'Failed to attach document.', 'error');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachToExistingProfileForExtracted = async (targetId: string) => {
    if (!uploadedDocId) return;
    setLoading(true);
    try {
      await patientService.attachDocument(targetId, uploadedDocId, true);
      const target = patients.find(p => p.patientId === targetId);
      if (target) {
        setCreatedPatient(target);
        setActivePatient(target);
      }
      await refreshActivePatient(targetId);
      showToast(`Document uploaded & added to ${target?.name || 'patient'} (${targetId})`, 'success');
      setStep('success');
    } catch (err: any) {
      showToast(err.message || 'Failed to attach document.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectMismatch = () => {
    setStep('reupload_help');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="w-full max-w-lg bg-bg-surface border border-border-default rounded-2xl shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ─── STEP 1: Add Patient Demographics Form ─── */}
        {step === 'form' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center">
                <HeartHandshake className="w-6 h-6 text-accent-teal" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-teal-dark">
                  ADD NEW PATIENT
                </span>
                <h2 className="text-xl font-bold text-text-primary tracking-tight">
                  Create Patient Profile
                </h2>
              </div>
            </div>

            <p className="text-xs text-text-secondary mb-5">
              CareCue organizes records around distinct patient profiles with isolated Health Stories. Create your profile below.
            </p>

            {errorBanner && (
              <div className="mb-4 p-3 rounded-xl bg-status-safety-bg border border-status-safety/30 text-xs text-status-safety">
                {errorBanner}
              </div>
            )}

            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Relationship *
                </label>
                <select
                  value={relationship}
                  onChange={e => {
                    const rel = e.target.value;
                    setRelationship(rel);
                    if (rel === 'Self' && selfName) {
                      setName(selfName);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-semibold focus:outline-hidden focus:border-accent-teal"
                >
                  {RELATIONSHIP_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-text-secondary">
                    Patient Name *
                  </label>
                  {relationship === 'Self' && (
                    <span className="text-[11px] text-accent-teal font-medium flex items-center gap-1">
                      <span>Account name • locked</span>
                      <span>🔒</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    readOnly={relationship === 'Self'}
                    value={relationship === 'Self' ? selfName : name}
                    onChange={e => {
                      if (relationship !== 'Self') {
                        setName(e.target.value);
                      }
                    }}
                    placeholder={relationship === 'Self' ? selfName || 'Your full name' : 'e.g. Rahul Sharma or Priya Das'}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium focus:outline-hidden ${
                      relationship === 'Self'
                        ? 'bg-bg-secondary/70 border border-border-default text-text-primary cursor-not-allowed pr-8 font-semibold select-none'
                        : 'bg-bg-primary border border-border-default text-text-primary focus:border-accent-teal'
                    }`}
                  />
                  {relationship === 'Self' && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs select-none pointer-events-none">
                      🔒
                    </div>
                  )}
                </div>
              </div>

              {relationship === 'Other' && (
                <div className="animate-in fade-in">
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Specify Relationship *
                  </label>
                  <input
                    type="text"
                    required
                    value={relationshipDetail}
                    onChange={e => setRelationshipDetail(e.target.value)}
                    placeholder="e.g. Aunt, Uncle, Guardian, Friend"
                    className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Date of Birth (Optional)
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Gender (Optional)
                  </label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal"
                  >
                    <option value="Not specified">Not specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl border border-border-default text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !(relationship === 'Self' ? selfName : name.trim())}
                  className="px-5 py-2 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Create Patient</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── STEP 2: Immediate Document Upload Prompt ─── */}
        {step === 'upload' && createdPatient && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center">
                <FileUp className="w-5 h-5 text-accent-teal" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-teal-dark">
                  STEP 2 OF 2 · UPLOAD CLINICAL DOCUMENT
                </span>
                <h2 className="text-xl font-bold text-text-primary tracking-tight">
                  Upload for {createdPatient.name}
                </h2>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-accent-teal/10 border border-accent-teal/20 text-xs text-text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent-teal shrink-0" />
              <span>
                Profile created for <strong>{createdPatient.name}</strong> ({createdPatient.patientId}). Upload their medical report to verify and analyze records.
              </span>
            </div>

            {errorBanner && (
              <div className="p-3 rounded-xl bg-status-safety-bg border border-status-safety/30 text-xs text-status-safety">
                {errorBanner}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={e => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-semibold focus:outline-hidden focus:border-accent-teal"
              >
                <option value="PRESCRIPTION">Prescription</option>
                <option value="LAB_REPORT">Lab Report</option>
                <option value="MEDICAL_REPORT">Medical Report</option>
                <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <UploadDropzone
              onFileSelect={handleDocumentSelected}
              className="my-3"
            />

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClose}
                className="text-xs text-text-muted hover:text-text-primary font-medium transition-colors cursor-pointer"
              >
                Skip / I'll upload later
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Processing & AI Verification ─── */}
        {step === 'processing' && (
          <div className="py-10 text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-accent-teal/15 text-accent-teal flex items-center justify-center mx-auto shadow-sm">
              <RefreshCw className="w-7 h-7 animate-spin text-accent-teal" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">
                Analyzing Document & Verifying Name...
              </h3>
              <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto leading-relaxed">
                Extracting clinical records and verifying patient identity with CareCue Intelligence.
              </p>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Exact Match Confirmed Success ─── */}
        {step === 'success' && createdPatient && (
          <div className="py-6 text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-status-review/15 text-status-review flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-7 h-7 text-accent-teal" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent-teal">
                ✓ PATIENT MATCH CONFIRMED
              </span>
              <h3 className="text-lg font-bold text-text-primary mt-1">
                Document Verified for {createdPatient.name}
              </h3>
              <p className="text-xs text-text-secondary mt-2 max-w-sm mx-auto leading-relaxed">
                Clinical entities, lab findings, and health timeline have been extracted and added to {createdPatient.name}'s Health Story.
              </p>
            </div>

            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                View Patient Records & Health Story
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 5: Mismatch Prompt Dialog ─── */}
        {step === 'mismatch' && createdPatient && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  PATIENT IDENTITY MISMATCH DETECTED
                </span>
                <h3 className="text-lg font-bold text-text-primary">
                  Name Discrepancy Found
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-bg-secondary/70 border border-border-default space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border-subtle">
                <span className="text-text-muted font-medium">Given Patient Profile:</span>
                <span className="font-bold text-text-primary">{createdPatient.name}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-text-muted font-medium">Document Extracted Name:</span>
                <span className="font-bold text-amber-600">{extractedName}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-semibold">
                {createdPatient.relationship === 'Self'
                  ? `This document belongs to "${extractedName}", not you ("${createdPatient.name}"). Since this is your personal Self profile, please upload your own prescription/document, or create a separate profile for "${extractedName}".`
                  : `This document belongs to "${extractedName}", but you were adding a profile for "${createdPatient.name}".`}
              </p>
              <p className="text-[11px] text-text-secondary">
                To keep patient medical records separate, choose how you would like to proceed:
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              {(() => {
                const existingPatientWithExtractedName = extractedName ? patients.find(p => p.name.trim().toLowerCase() === extractedName.trim().toLowerCase()) : null;

                if (existingPatientWithExtractedName) {
                  return (
                    <>
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
                        <p className="font-bold text-amber-800 dark:text-amber-300">
                          Existing Patient Profile Found
                        </p>
                        <p className="mt-0.5">
                          A patient profile for <strong>"{existingPatientWithExtractedName.name}"</strong> already exists with <strong>Patient ID: {existingPatientWithExtractedName.patientId}</strong>.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleAttachToExistingProfileForExtracted(existingPatientWithExtractedName.patientId)}
                        className="w-full px-4 py-3 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>Upload to Existing Patient ({existingPatientWithExtractedName.patientId})</span>
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleCreateNewProfileForExtracted}
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-primary text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 text-accent-teal" />}
                        <span>Create as a Fresh New Patient Profile</span>
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleRejectMismatch}
                        className="w-full px-4 py-2 rounded-xl text-text-muted hover:text-text-primary text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Upload a Different Document</span>
                      </button>
                    </>
                  );
                }

                if (createdPatient.relationship === 'Self') {
                  return (
                    <>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleRejectMismatch}
                        className="w-full px-4 py-3 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Your Own Document for "{createdPatient.name}"</span>
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleCreateNewProfileForExtracted}
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-primary text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 text-accent-teal" />}
                        <span>Create Separate Family Profile for "{extractedName}"</span>
                      </button>
                    </>
                  );
                }

                return (
                  <>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleCreateNewProfileForExtracted}
                      className="w-full px-4 py-3 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      <span>Create Separate Profile for "{extractedName}" (Isolated Records)</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleUpdateProfileNameToExtracted}
                      className="w-full px-4 py-2.5 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-primary text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-accent-teal" />
                      <span>Rename Profile "{createdPatient.name}" to "{extractedName}"</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleRejectMismatch}
                      className="w-full px-4 py-2 rounded-xl text-text-muted hover:text-text-primary text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Upload a Different Document for "{createdPatient.name}"</span>
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ─── STEP 6: Upload Correct Document Help ─── */}
        {step === 'reupload_help' && createdPatient && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-teal/15 text-accent-teal flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-accent-teal" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-teal-dark">
                  UPLOAD CORRECT DOCUMENT
                </span>
                <h3 className="text-lg font-bold text-text-primary">
                  Select Matching Document
                </h3>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Please upload a document that matches patient profile <strong>"{createdPatient.name}"</strong>. The previous file for "{extractedName}" was discarded.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="w-full px-4 py-2.5 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <FileUp className="w-4 h-4" />
                <span>Choose Another Document for {createdPatient.name}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setName('');
                  setRelationship('Self');
                }}
                className="w-full px-4 py-2 rounded-xl border border-border-default text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Go to Add Patient Section</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
