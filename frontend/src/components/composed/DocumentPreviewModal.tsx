import React, { useState, useEffect } from 'react';
import { X, FileText, Eye, Copy, Check, Download, ShieldCheck, AlertCircle, Calendar, User, Activity, Pill, Stethoscope, ChevronRight } from 'lucide-react';
import { DocumentTypeBadge } from './DocumentTypeBadge';
import { apiClient } from '@/services/apiClient';
import type { PatientDocument, Patient } from '@/lib/types';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: PatientDocument | null;
  patient?: Patient | null;
}

export const DEMO_DOCUMENTS_CONTENT: Record<string, { title: string; header: string; text: string; structured: any }> = {
  rahul: {
    title: 'Metabolic & Lipid Lab Report',
    header: 'METROPOLITAN CLINICAL LABORATORIES',
    text: `METROPOLITAN CLINICAL LABORATORIES
Patient: Rahul Sharma | DOB: 14-Jul-1982 | Age: 42 | Gender: Male
Referring Physician: Dr. Sunita Rao, MD
Date of Collection: 10-Jan-2026

COMPLETE LIPID & METABOLIC PANEL
--------------------------------------------------
• Total Cholesterol: 220 mg/dL (Reference: < 200 mg/dL) [HIGH]
• Triglycerides: 185 mg/dL (Reference: < 150 mg/dL) [HIGH]
• HDL Cholesterol: 42 mg/dL (Reference: > 40 mg/dL) [NORMAL]
• LDL Cholesterol: 141 mg/dL (Reference: < 100 mg/dL) [HIGH]
• Fasting Blood Glucose: 112 mg/dL (Reference: 70-99 mg/dL) [HIGH / Impaired Fasting Glucose]
• HbA1c: 6.1 % (Reference: < 5.7 %) [PREDIABETES RANGE]

CURRENT MEDICATIONS & PLAN:
1. Metformin 500mg - 1 tablet orally twice daily with meals.
2. Atorvastatin 10mg - 1 tablet orally once daily at bedtime.

Clinical Notes: Patient demonstrates mild borderline dyslipidemia and prediabetes. Advised dietary lifestyle modification and repeat lipid panel in 90 days.`,
    structured: {
      medications: [
        { name: 'Metformin', dosage: '500mg', frequency: 'twice daily with meals', purpose: 'Glycemic Control' },
        { name: 'Atorvastatin', dosage: '10mg', frequency: 'once daily at bedtime', purpose: 'Hyperlipidemia' }
      ],
      labResults: [
        { test: 'Total Cholesterol', value: '220', unit: 'mg/dL', status: 'HIGH', reference: '< 200 mg/dL' },
        { test: 'Triglycerides', value: '185', unit: 'mg/dL', status: 'HIGH', reference: '< 150 mg/dL' },
        { test: 'HDL Cholesterol', value: '42', unit: 'mg/dL', status: 'NORMAL', reference: '> 40 mg/dL' },
        { test: 'LDL Cholesterol', value: '141', unit: 'mg/dL', status: 'HIGH', reference: '< 100 mg/dL' },
        { test: 'Fasting Blood Glucose', value: '112', unit: 'mg/dL', status: 'HIGH', reference: '70-99 mg/dL' },
        { test: 'HbA1c', value: '6.1', unit: '%', status: 'HIGH', reference: '< 5.7 %' }
      ]
    }
  },
  priya: {
    title: 'Cardiology Consultation & Prescription',
    header: 'APEX MULTISPECIALTY CLINIC',
    text: `APEX MULTISPECIALTY CLINIC
Patient: Priya Sharma | DOB: 20-Nov-1986 | Age: 39 | Gender: Female
Attending: Dr. Arun Patel, MD (Cardiology)
Date of Consultation: 15-Feb-2026

CLINICAL CONSULTATION & PRESCRIPTION
--------------------------------------------------
Diagnosis: Essential Hypertension (Stage 1), Mild Osteopenia (Spine T-score -1.4)

PRESCRIBED MEDICATIONS:
1. Amlodipine 5mg - Take 1 tablet orally every morning.
2. Vitamin D3 2000 IU (Cholecalciferol) - 1 capsule daily with food.
3. Calcium Carbonate 500mg - 1 tablet daily.

Clinical Follow-up: Patient to monitor home blood pressure weekly. Target BP < 120/80 mmHg. Re-evaluate in 8 weeks.`,
    structured: {
      medications: [
        { name: 'Amlodipine', dosage: '5mg', frequency: 'once daily morning', purpose: 'Hypertension' },
        { name: 'Vitamin D3', dosage: '2000 IU', frequency: 'daily with food', purpose: 'Bone Health' },
        { name: 'Calcium Carbonate', dosage: '500mg', frequency: 'daily', purpose: 'Bone Support' }
      ],
      vitals: { bloodPressure: '132/84 mmHg', pulseRate: '74 bpm' }
    }
  }
};

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  patient
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'structured' | 'details'>('text');
  const [extractedText, setExtractedText] = useState<string>('');
  const [structuredData, setStructuredData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !document) return;

    setCopied(false);
    setActiveTab('text');

    // 1. Check if Demo Patient / Demo Document
    const isDemo = document.documentId?.includes('DEMO') || 
                   patient?.isDemo || 
                   document.sourceReference?.toLowerCase().includes('demo') ||
                   patient?.name?.toLowerCase().includes('rahul') ||
                   patient?.name?.toLowerCase().includes('priya');

    if (isDemo) {
      const demoKey = patient?.name?.toLowerCase().includes('priya') ? 'priya' : 'rahul';
      const demoDoc = DEMO_DOCUMENTS_CONTENT[demoKey];
      setExtractedText(demoDoc.text);
      setStructuredData(demoDoc.structured);
      setLoading(false);
      return;
    }

    // 2. Real Uploaded Document -> Fetch full details / text from backend
    if (document.extractedText) {
      setExtractedText(document.extractedText);
    } else {
      setLoading(true);
      apiClient.documents.getText(document.documentId)
        .then(res => {
          setExtractedText(res?.extractedText || res?.text || document.summary || 'No text extracted for this document.');
        })
        .catch(() => {
          setExtractedText(document.summary || 'Document details retrieved. Content unavailable.');
        })
        .finally(() => setLoading(false));
    }

    // Fetch full details if structuredData missing
    apiClient.documents.get(document.documentId)
      .then(res => {
        if (res?.extractedText) setExtractedText(res.extractedText);
        if (res?.structuredData) setStructuredData(res.structuredData);
      })
      .catch(() => {});

  }, [isOpen, document, patient]);

  if (!isOpen || !document) return null;

  const handleCopyText = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = document.displayName || document.originalFileName || 'Medical Document';
  const patientName = patient?.name || 'Patient Record';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-border-subtle bg-bg-surface-elevated/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-teal/10 text-accent-teal">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary">{displayName}</h2>
                <DocumentTypeBadge type={document.documentType} />
              </div>
              <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-text-tertiary" /> {patientName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-text-tertiary" /> {new Date(document.createdAt).toLocaleDateString()}
                </span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-accent-teal/10 text-accent-teal">
                  {document.status}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-border-subtle bg-bg-surface text-xs">
          <div className="flex items-center gap-1 py-2">
            <button
              onClick={() => setActiveTab('text')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-accent-teal/10 text-accent-teal'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-subtle'
              }`}
            >
              Document Text Sheet
            </button>
            <button
              onClick={() => setActiveTab('structured')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'structured'
                  ? 'bg-accent-teal/10 text-accent-teal'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-subtle'
              }`}
            >
              Extracted Clinical Records
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-accent-teal/10 text-accent-teal'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-subtle'
              }`}
            >
              Metadata & Attributes
            </button>
          </div>

          {activeTab === 'text' && (
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors text-xs font-medium cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3 text-text-muted">
              <div className="w-6 h-6 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Loading document record...</p>
            </div>
          ) : activeTab === 'text' ? (
            /* Document Text Sheet View */
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border-subtle bg-slate-900/40 text-slate-200 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text overflow-x-auto">
                {extractedText || 'No transcribed text available for this document.'}
              </div>

              {document.summary && (
                <div className="p-4 rounded-xl bg-accent-teal/5 border border-accent-teal/20 space-y-1">
                  <div className="text-xs font-bold text-accent-teal flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> AI Document Comprehension Summary
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{document.summary}</p>
                </div>
              )}
            </div>
          ) : activeTab === 'structured' ? (
            /* Extracted Clinical Data View */
            <div className="space-y-4">
              {structuredData?.medications && structuredData.medications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
                    <Pill className="w-4 h-4 text-accent-teal" /> Prescribed Medications
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {structuredData.medications.map((m: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border border-border-subtle bg-bg-surface-elevated/40 text-xs space-y-1">
                        <div className="font-bold text-text-primary flex items-center justify-between">
                          <span>{m.name}</span>
                          {m.dosage && <span className="text-[10px] px-2 py-0.5 rounded bg-accent-teal/10 text-accent-teal font-semibold">{m.dosage}</span>}
                        </div>
                        {m.frequency && <div className="text-[11px] text-text-muted">Frequency: {m.frequency}</div>}
                        {m.purpose && <div className="text-[11px] text-text-secondary italic">Indication: {m.purpose}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {structuredData?.labResults && structuredData.labResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
                    <Activity className="w-4 h-4 text-accent-teal" /> Laboratory & Test Results
                  </h4>
                  <div className="space-y-1.5">
                    {structuredData.labResults.map((lab: any, i: number) => (
                      <div key={i} className="p-2.5 px-3 rounded-xl border border-border-subtle bg-bg-surface-elevated/40 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-text-primary">{lab.test}</span>
                          {lab.reference && <span className="text-[11px] text-text-muted ml-2">(Ref: {lab.reference})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-text-primary">{lab.value} {lab.unit || ''}</span>
                          {lab.status && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              lab.status === 'HIGH' || lab.status === 'LOW'
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              {lab.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!structuredData?.medications?.length && !structuredData?.labResults?.length && (
                <div className="p-8 text-center text-xs text-text-muted border border-dashed border-border-subtle rounded-xl">
                  No structured findings extracted yet. Full details are recorded in the document text sheet.
                </div>
              )}
            </div>
          ) : (
            /* Document Details / Metadata View */
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-border-subtle bg-bg-surface-elevated/40 space-y-1">
                  <span className="text-[11px] text-text-muted font-semibold uppercase">Document ID</span>
                  <div className="font-mono font-bold text-text-primary text-xs break-all">{document.documentId}</div>
                </div>
                <div className="p-3 rounded-xl border border-border-subtle bg-bg-surface-elevated/40 space-y-1">
                  <span className="text-[11px] text-text-muted font-semibold uppercase">Patient ID</span>
                  <div className="font-mono font-bold text-text-primary text-xs">{document.patientId || patient?.patientId || 'Unassigned'}</div>
                </div>
                <div className="p-3 rounded-xl border border-border-subtle bg-bg-surface-elevated/40 space-y-1">
                  <span className="text-[11px] text-text-muted font-semibold uppercase">Document Type</span>
                  <div className="font-bold text-text-primary">{document.documentType}</div>
                </div>
                <div className="p-3 rounded-xl border border-border-subtle bg-bg-surface-elevated/40 space-y-1">
                  <span className="text-[11px] text-text-muted font-semibold uppercase">MIME / Format</span>
                  <div className="font-bold text-text-primary">{document.mimeType || 'application/pdf'}</div>
                </div>
                <div className="p-3 rounded-xl border border-border-subtle bg-bg-surface-elevated/40 space-y-1">
                  <span className="text-[11px] text-text-muted font-semibold uppercase">Source Reference</span>
                  <div className="font-bold text-text-primary">{document.sourceReference || 'User Upload'}</div>
                </div>
                <div className="p-3 rounded-xl border border-border-subtle bg-bg-surface-elevated/40 space-y-1">
                  <span className="text-[11px] text-text-muted font-semibold uppercase">Upload Timestamp</span>
                  <div className="font-bold text-text-primary">{new Date(document.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-border-subtle bg-bg-surface-elevated/50 flex items-center justify-between">
          <div className="text-[11px] text-text-muted flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-teal" /> Verified by CareCue Intelligence
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-accent-teal text-white font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            Close Preview
          </button>
        </div>

      </div>
    </div>
  );
};
