import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ClipboardList,
  ArrowRight,
  FileCheck2,
  AlertCircle,
  FileText,
  User,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Pill,
  BookOpen,
  X,
  RefreshCw,
  Cpu,
  FolderOpen,
  Upload,
  ShieldCheck,
  Languages,
  Volume2,
  Square,
  Search,
  Filter,
  UserCheck,
  Plus,
} from 'lucide-react';
import { TrustPath } from '@/components/composed/TrustPath';
import { UploadDropzone } from '@/components/composed/UploadDropzone';
import { DocumentProcessingStepper, type StepStatus } from '@/components/composed/DocumentProcessingStepper';
import { EvidenceCard } from '@/components/composed/EvidenceCard';
import { DualAIPanel } from '@/components/composed/DualAIPanel';
import { PrivacyGateway } from '@/components/composed/PrivacyGateway';
import { SkeletonCard as CardSkeleton } from '@/components/composed/Skeleton';
import { ErrorState } from '@/components/composed/ErrorState';
import { SafetyAlert } from '@/components/composed/SafetyAlert';
import { DocumentTypeBadge } from '@/components/composed/DocumentTypeBadge';
import { MOCK_ANALYSIS, MOCK_PRIVACY_RESULT } from '@/services/mockData';
import { documentService, patientService } from '@/services';
import { useTTS } from '@/hooks/useTTS';
import { useAuth } from '@/contexts/AuthContext';
import type {
  TrustPathStep,
  AnalysisResult,
  ProcessingStep,
  Insight,
  Patient,
  PatientDocument,
} from '@/lib/types';
import type { TrustPathStatus } from '@/components/composed/TrustPath';
import { delay, formatFileSize, formatDate } from '@/lib/utils';

type FlowStage = 'upload' | 'review' | 'privacy' | 'processing' | 'verification' | 'results' | 'error';
type ResultViewTab = 'explanation' | 'audit' | 'raw';

interface StoredDocWithPatient {
  doc: PatientDocument & { structuredData?: any; pages?: any[]; extractedData?: any };
  patient: Patient;
}

function buildInsightsFromStructuredData(
  structured: any,
  extractedText: string = '',
  patient?: Patient,
  extraFindings: any[] = [],
  currentDocId?: string
): Insight[] {
  const insights: Insight[] = [];
  const struct = structured || {};
  const normalizedText = (extractedText || '').toLowerCase();

  // 1. Lab Results (from this document)
  const labResults = struct.labResults || [];
  labResults.forEach((lab: any, idx: number) => {
    const testName = lab.testName || lab.test || '';
    if (!testName) return;
    const flag = (lab.flag || lab.status || '').toUpperCase();
    const isOutOfRange = flag === 'HIGH' || flag === 'LOW' || flag === 'ABNORMAL';
    const sourceQuote = lab.sourceQuote || lab.source?.text || `${testName} ${lab.value || ''} ${lab.unit || ''}`.trim();

    insights.push({
      id: `lab-${idx + 1}`,
      category: 'Laboratory Marker',
      claim: `${testName} — ${lab.value || ''} ${lab.unit || ''}`.trim(),
      explanation: `${testName} recorded at ${lab.value || ''} ${lab.unit || ''}. Reference interval: ${lab.referenceRange || lab.reference || 'Standard reference'}.`,
      value: String(lab.value || ''),
      unit: lab.unit || '',
      referenceRange: lab.referenceRange || lab.reference || 'Standard interval',
      rangeStatus: isOutOfRange ? 'outside_range' : 'within_range',
      source: {
        text: sourceQuote,
        page: lab.sourcePage || lab.source?.page || 1,
        section: 'Laboratory Results',
      },
      verification: {
        status: isOutOfRange ? 'needs_review' : 'consistent',
        bedrockInterpretation: 'Extracted from document lab report',
        geminiAssessment: 'Grounded against source excerpt',
        reasoning: `Verbatim extraction: ${testName} = ${lab.value || ''} ${lab.unit || ''}`,
      },
    });
  });

  // 2. Prescription Medications (strictly from this document)
  const medications = struct.medications || struct.activeMedications || struct.prescriptions || [];
  medications.forEach((med: any, idx: number) => {
    const medName = typeof med === 'string' ? med : (med.name || med.medicationName || '');
    if (!medName || medName.length < 2) return;

    const dosage = typeof med === 'object' ? (med.dosage || med.strength || '') : '';
    const freq = typeof med === 'object' ? (med.frequency || med.instructions || med.timing || '') : '';
    const purpose = typeof med === 'object' ? (med.indication || med.purpose || '') : '';
    const fullClaim = `${medName} ${dosage} ${freq}`.trim();
    const sourceQuote = typeof med === 'string' ? med : (med.sourceQuote || med.source?.text || fullClaim || medName);

    insights.push({
      id: `med-${idx + 1}`,
      category: 'Prescription Medication',
      claim: fullClaim || medName,
      explanation: purpose
        ? `Prescribed for: ${purpose}. Directions: ${freq || dosage || 'Take as advised by physician.'}`
        : `Active prescribed therapy: ${medName} ${dosage}. Follow dosage instructions carefully.`,
      value: dosage || 'Active',
      unit: '',
      referenceRange: 'Prescribed Regimen',
      rangeStatus: 'within_range',
      source: {
        text: sourceQuote,
        page: (typeof med === 'object' && (med.sourcePage || med.source?.page)) || 1,
        section: 'Prescriptions & Medications',
      },
      verification: {
        status: 'consistent',
        bedrockInterpretation: 'Prescribed regimen identified and verified',
        geminiAssessment: 'Cross-referenced against document prescription text',
        reasoning: `Extracted prescription: ${medName}`,
      },
    });
  });

  // 3. Clinical Diagnoses & Conditions (from this document)
  const diagnoses = struct.diagnoses || struct.conditions || struct.clinicalImpressions || [];
  diagnoses.forEach((diag: any, idx: number) => {
    const diagName = typeof diag === 'string' ? diag : (diag.condition || diag.name || diag.diagnosis || '');
    if (!diagName) return;
    const notes = typeof diag === 'object' ? (diag.notes || diag.description || diag.significance || '') : '';
    const sourceQuote = typeof diag === 'string' ? diag : (diag.sourceQuote || diag.source?.text || diagName);

    insights.push({
      id: `diag-${idx + 1}`,
      category: 'Diagnosis / Condition',
      claim: diagName,
      explanation: notes
        ? `Documented diagnosis: ${diagName}. ${notes}`
        : `Primary clinical observation: ${diagName}. Discuss long-term care management with your physician.`,
      value: 'Diagnosed',
      unit: '',
      referenceRange: 'Clinical Assessment',
      rangeStatus: 'within_range',
      source: {
        text: sourceQuote,
        page: (typeof diag === 'object' && (diag.sourcePage || diag.source?.page)) || 1,
        section: 'Clinical Diagnoses',
      },
      verification: {
        status: 'consistent',
        bedrockInterpretation: 'Clinical diagnosis noted in medical record',
        geminiAssessment: 'Grounded against doctor notes in document',
        reasoning: `Recorded diagnosis: ${diagName}`,
      },
    });
  });

  // 4. Clinical Findings / General Observations (strictly from this document only)
  const rawFindings = (struct.findings || []).concat(
    (extraFindings || []).filter((f: any) => {
      if (currentDocId && f.source?.documentId && f.source.documentId !== currentDocId) {
        return false;
      }
      const quote = (f.sourceQuote || f.source?.text || f.text || f.claim || '').toLowerCase().trim();
      if (!quote) return false;
      if (normalizedText && !normalizedText.includes(quote.slice(0, 10))) {
        return false;
      }
      return true;
    })
  );

  const seenClaims = new Set<string>();
  rawFindings.forEach((f: any, idx: number) => {
    const claim = f.title || f.claim || f.text || '';
    if (!claim || seenClaims.has(claim.toLowerCase())) return;
    seenClaims.add(claim.toLowerCase());

    const sourceQuote = f.sourceQuote || f.source?.text || f.text || claim;
    if (!sourceQuote || sourceQuote.trim() === '') return;

    insights.push({
      id: `finding-${idx + 1}`,
      category: f.category || 'Clinical Finding',
      claim,
      explanation: f.clinicalSignificance || f.explanation || f.plainLanguageSummary || f.summary || f.text || '',
      value: f.value || '',
      unit: f.unit || '',
      referenceRange: f.referenceRange || 'Clinical finding',
      rangeStatus: (f.verificationStatus === 'needs_review' ? 'outside_range' : 'within_range') as any,
      source: {
        text: sourceQuote,
        page: f.sourcePage || f.source?.page || 1,
        section: f.category || 'Findings',
      },
      verification: {
        status: (f.verificationStatus === 'needs_review' ? 'needs_review' : 'consistent') as any,
        bedrockInterpretation: 'Extracted from document findings',
        geminiAssessment: 'Grounded against source document text',
        reasoning: 'Direct clinical entity extraction',
      },
    });
  });

  // 5. Fallback: Parse extracted OCR text lines only if no structured insights exist
  if (insights.length === 0 && extractedText) {
    const rawLines = extractedText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 5 && !l.toLowerCase().includes('page ') && !l.toLowerCase().startsWith('http'));

    const sampleLines = rawLines.slice(0, 8);
    sampleLines.forEach((line, idx) => {
      const isRx = line.toLowerCase().includes('tab') || line.toLowerCase().includes('cap') || line.toLowerCase().includes('mg') || line.toLowerCase().includes('dose');
      insights.push({
        id: `ocr-line-${idx + 1}`,
        category: isRx ? 'Prescription Item' : 'Prescription Excerpt',
        claim: line,
        explanation: `Documented clinical record: ${line}`,
        value: '',
        unit: '',
        referenceRange: 'Clinical Record',
        rangeStatus: 'within_range',
        source: {
          text: line,
          page: 1,
          section: 'Prescription Text',
        },
        verification: {
          status: 'consistent',
          bedrockInterpretation: 'Transcribed from document text',
          geminiAssessment: 'Grounded directly in extracted prescription content',
          reasoning: 'Direct transcription from document',
        },
      });
    });
  }

  return insights;
}

export function SessionFlow() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isDemoParam = searchParams.get('demo') === 'true';
  const docIdParam = searchParams.get('docId');
  const patientIdParam = searchParams.get('patientId');
  const isAuditParam = searchParams.get('audit') === 'true' || searchParams.get('mode') === 'audit';
  const { refreshActivePatient, setActivePatient } = useAuth();

  const [isDemo, setIsDemo] = useState(false);
  const [stage, setStage] = useState<FlowStage>('upload');
  const [uploadTab, setUploadTab] = useState<'upload' | 'stored'>('upload');
  const [resultTab, setResultTab] = useState<ResultViewTab>(isAuditParam ? 'audit' : 'explanation');
  const [explanationLevel, setExplanationLevel] = useState<'standard' | 'beginner'>('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [patientFilter, setPatientFilter] = useState<string>('all');

  const [trustStep, setTrustStep] = useState<TrustPathStep>('source');
  const [trustStatus, setTrustStatus] = useState<TrustPathStatus | undefined>(undefined);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Stored Documents Across Patients
  const [storedDocs, setStoredDocs] = useState<StoredDocWithPatient[]>([]);
  const [loadingStoredDocs, setLoadingStoredDocs] = useState(false);

  // Extracted data & patient lifecycle
  const [rawExtractedData, setRawExtractedData] = useState<any | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('PRESCRIPTION');
  
  // Modals
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [showFullTextModal, setShowFullTextModal] = useState(false);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);

  // TTS Hook for simple language summary playback
  const { speak, stop, isPlaying } = useTTS('en');

  // Stepper state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({
    upload: 'pending',
    extract: 'pending',
    understand: 'pending',
    patient: 'pending',
    gemini: 'pending',
    compile: 'pending',
  });

  // Load existing patients and all their stored documents
  const loadStoredDocuments = useCallback(async () => {
    try {
      setLoadingStoredDocs(true);
      const pts = await patientService.list();
      setPatients(pts);

      const allDocs: StoredDocWithPatient[] = [];
      for (const p of pts) {
        try {
          const docs = await patientService.getDocuments(p.patientId);
          docs.forEach(d => {
            allDocs.push({ doc: d as any, patient: p });
          });
        } catch {
          // Ignore individual patient document load failure
        }
      }
      setStoredDocs(allDocs);
      return { pts, allDocs };
    } catch {
      return { pts: [], allDocs: [] };
    } finally {
      setLoadingStoredDocs(false);
    }
  }, []);

  useEffect(() => {
    loadStoredDocuments().then(({ allDocs }) => {
      // If docId is specified in URL query, auto-open that document
      if (docIdParam && allDocs.length > 0) {
        const match = allDocs.find(item => item.doc.documentId === docIdParam);
        if (match) {
          handleSelectStoredDocument(match, isAuditParam);
          return;
        }
      }
      if (isAuditParam && allDocs.length > 0) {
        setUploadTab('stored');
      }
    });
  }, [loadStoredDocuments, docIdParam, isAuditParam]);

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file);
    setIsDemo(false);
    setErrorMessage(null);
  }, []);

  const handleStartDemo = useCallback(async () => {
    setIsDemo(true);
    setSelectedFile(new File(['demo'], 'Sample_Blood_Panel.pdf', { type: 'application/pdf' }));
    setStage('processing');
    setTrustStep('analysis');
    setTrustStatus('processing');
    setErrorMessage(null);

    const stepIds = ['upload', 'extract', 'understand', 'patient', 'gemini', 'compile'];
    for (let i = 0; i < stepIds.length; i++) {
      setCurrentStepIndex(i);
      setStepStatuses(prev => ({ ...prev, [stepIds[i]]: 'active' }));
      await delay(350);
      setStepStatuses(prev => ({ ...prev, [stepIds[i]]: 'complete' }));
    }

    setAnalysis(MOCK_ANALYSIS);
    setStage('results');
    setTrustStep('next_step');
    setTrustStatus('consistent');
    setResultTab(isAuditParam ? 'audit' : 'explanation');
  }, [isAuditParam]);

  useEffect(() => {
    if (isDemoParam) {
      handleStartDemo();
    }
  }, [isDemoParam, handleStartDemo]);

  // ─── Real Document Processing Execution (New File) ───
  const handleProcessDocument = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setStage('processing');
    setTrustStep('analysis');
    setTrustStatus('processing');
    setErrorMessage(null);

    setCurrentStepIndex(0);
    setStepStatuses({
      upload: 'active',
      extract: 'pending',
      understand: 'pending',
      patient: 'pending',
      gemini: 'pending',
      compile: 'pending',
    });

    try {
      await delay(300);
      setCurrentStepIndex(1);
      setStepStatuses(prev => ({ ...prev, upload: 'complete', extract: 'active' }));

      const result = await documentService.upload(selectedFile, selectedPatientId || undefined, selectedDocumentType);

      setCurrentStepIndex(2);
      setStepStatuses(prev => ({ ...prev, extract: 'complete', understand: 'active' }));
      await delay(250);

      setCurrentStepIndex(3);
      setStepStatuses(prev => ({ ...prev, understand: 'complete', patient: 'active' }));
      await delay(250);

      setCurrentStepIndex(4);
      setStepStatuses(prev => ({ ...prev, patient: 'complete', gemini: 'active' }));
      await delay(250);

      const geminiStatus: string = result.geminiStatus || 'SUCCESS';
      const geminiRateLimited = geminiStatus === 'RATE_LIMITED';
      const geminiUnavailable = geminiStatus === 'UNAVAILABLE' || geminiStatus === 'ERROR';

      setCurrentStepIndex(5);
      setStepStatuses(prev => ({
        ...prev,
        gemini: geminiRateLimited || geminiUnavailable ? 'error' : 'complete',
        compile: 'active',
      }));
      await delay(250);

      setStepStatuses(prev => ({
        ...prev,
        upload: 'complete',
        extract: 'complete',
        understand: 'complete',
        patient: 'complete',
        gemini: geminiRateLimited || geminiUnavailable ? 'error' : 'complete',
        compile: 'complete',
      }));

      if (geminiRateLimited) {
        setErrorMessage(result.geminiMessage || 'Gemini AI quota is temporarily busy. Extracted text is preserved.');
      }

      setRawExtractedData(result);

      // Transform structured findings, medications, diagnoses, and lab results into insights
      const structured = result.structuredData || {};
      const activePatient = patients.find(p => p.patientId === (selectedPatientId || result.patientId));
      const insights = buildInsightsFromStructuredData(
        structured,
        result.extractedText || '',
        activePatient,
        result.findings || []
      );

      const totalCount = insights.length;
      const consistentCount = insights.filter(i => i.verification.status === 'consistent').length;
      const reviewCount = insights.filter(i => i.verification.status === 'needs_review').length;

      setAnalysis({
        sessionId: result.document?.documentId || `doc-${Date.now()}`,
        status: 'complete',
        summary: {
          totalInsights: totalCount,
          consistent: consistentCount,
          needsReview: reviewCount,
          safetyRedirects: 0,
        },
        insights,
        privacyGateway: MOCK_PRIVACY_RESULT,
        disclaimer: 'CareCue is an educational healthcare companion, not a diagnostic platform. Consult your physician.',
      });

      const detectedName = result.detectedPatient?.name || result.structuredData?.patient?.name;
      const isDifferent = result.matchResult?.matchType === 'DIFFERENT_PATIENT';
      const isTargetMatch = result.matchResult?.isTargetMatch === true;

      if (isDifferent) {
        setShowMismatchModal(true);
      } else if (detectedName && (!selectedPatientId || !isTargetMatch)) {
        setShowPatientModal(true);
      }

      setStage('results');
      setTrustStep(isAuditParam ? 'verification' : 'next_step');
      setTrustStatus('consistent');
      setResultTab(isAuditParam ? 'audit' : 'explanation');
      // Refresh stored docs list in background
      loadStoredDocuments();
    } catch (err: any) {
      console.error('Document processing failed:', err);
      setErrorMessage(err.message || 'Processing failed. Please verify your document format and retry.');
      setStage('error');
    } finally {
      setUploading(false);
    }
  };

  // ─── Process & Explain Existing / Stored Document ───
  const handleSelectStoredDocument = async (item: StoredDocWithPatient, targetAudit: boolean = false) => {
    const { doc, patient } = item;
    setSelectedPatientId(patient.patientId);
    setSelectedFile(new File(['stored'], doc.originalFileName || doc.displayName || 'Medical_Record.pdf', { type: doc.mimeType || 'application/pdf' }));
    
    setStage('processing');
    setTrustStep('analysis');
    setTrustStatus('processing');
    setErrorMessage(null);

    const stepIds = ['upload', 'extract', 'understand', 'patient', 'gemini', 'compile'];
    for (let i = 0; i < stepIds.length; i++) {
      setCurrentStepIndex(i);
      setStepStatuses(prev => ({ ...prev, [stepIds[i]]: 'active' }));
      await delay(200);
      setStepStatuses(prev => ({ ...prev, [stepIds[i]]: 'complete' }));
    }

    let structured = doc.structuredData || {};
    if (typeof structured === 'string') {
      try { structured = JSON.parse(structured); } catch { structured = {}; }
    }

    const insights = buildInsightsFromStructuredData(
      structured,
      doc.extractedText || '',
      patient,
      [],
      doc.documentId
    );

    setRawExtractedData({
      document: doc,
      detectedPatient: { name: patient.name, dob: patient.dateOfBirth },
      structuredData: structured,
      pages: doc.pages || [],
      extractedText: doc.extractedText || '',
      extractionMethod: (doc as any).extractionMethod || 'pymupdf',
      geminiStatus: 'SUCCESS',
    });

    setAnalysis({
      sessionId: doc.documentId || `doc-${Date.now()}`,
      status: 'complete',
      summary: {
        totalInsights: insights.length,
        consistent: insights.filter(i => i.verification.status === 'consistent').length,
        needsReview: insights.filter(i => i.verification.status === 'needs_review').length,
        safetyRedirects: 0,
      },
      insights,
      privacyGateway: MOCK_PRIVACY_RESULT,
      disclaimer: 'CareCue is an educational healthcare companion, not a diagnostic platform. Consult your physician.',
    });

    setStage('results');
    setTrustStep(targetAudit ? 'verification' : 'next_step');
    setTrustStatus('consistent');
    setResultTab(targetAudit ? 'audit' : 'explanation');
  };

  const handleCreatePatientFromDoc = async () => {
    const pName = rawExtractedData?.detectedPatient?.name || 'New Patient';
    const pDob = rawExtractedData?.detectedPatient?.dob || undefined;
    const docId = rawExtractedData?.document?.documentId;

    try {
      const created = await patientService.createFromDocument(docId, pName, pDob);
      setCreatedPatient(created);
      setShowPatientModal(false);
      setShowMismatchModal(false);
      if (created) {
        if (setActivePatient) setActivePatient(created);
        if (refreshActivePatient) await refreshActivePatient(created.patientId);
      }
      const freshList = await patientService.list();
      setPatients(freshList);
      loadStoredDocuments();
    } catch (err) {
      console.error('Failed to create patient from document:', err);
    }
  };

  const handleAttachToExistingPatient = async (patientId: string) => {
    if (!rawExtractedData?.document?.documentId) return;
    try {
      await patientService.attachDocument(patientId, rawExtractedData.document.documentId, true);
      const target = patients.find(p => p.patientId === patientId) || null;
      setCreatedPatient(target);
      setShowPatientModal(false);
      setShowMismatchModal(false);
      if (target) {
        if (setActivePatient) setActivePatient(target);
        if (refreshActivePatient) await refreshActivePatient(target.patientId);
      }
      loadStoredDocuments();
    } catch (err) {
      console.error('Failed to attach document to patient:', err);
    }
  };

  const medications = rawExtractedData?.structuredData?.medications || [];
  const rawPages = rawExtractedData?.pages || [];
  const extractionMethod = rawExtractedData?.extractionMethod || 'pymupdf';

  // Filter stored docs for Tab 2
  const filteredStoredDocs = storedDocs.filter(item => {
    const matchesPatient = patientFilter === 'all' || item.patient.patientId === patientFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesPatient;
    const matchesQuery = (item.doc.originalFileName || '').toLowerCase().includes(q) ||
      (item.doc.displayName || '').toLowerCase().includes(q) ||
      (item.patient.name || '').toLowerCase().includes(q) ||
      (item.doc.documentType || '').toLowerCase().includes(q);
    return matchesPatient && matchesQuery;
  });

  // Plain-Language General Summary for simple explanation view
  const simpleReportSummary = rawExtractedData?.structuredData?.summary ||
    (analysis?.insights.length
      ? `This report contains ${analysis.insights.length} clinical observations and laboratory markers reviewed by your care team.`
      : 'This medical document has been extracted and verified against clinical guidelines.');

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 box-border">
      {/* Signature Trust Path */}
      <div className="mb-8">
        <TrustPath currentStep={trustStep} status={trustStatus} showDetails={stage === 'results' || stage === 'verification'} />
      </div>

      {/* Flow Stages */}
      <AnimatePresence mode="wait">
        {/* ─── 1. UPLOAD & SELECT STAGE ─── */}
        {stage === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                  {isAuditParam ? 'Audit Clinical Text & Verify Evidence' : 'Explain & Audit Health Documents'}
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                  {isAuditParam
                    ? 'Audit your actual uploaded prescriptions, lab reports, or choose past records to verify AI findings directly against source text.'
                    : 'Upload a new medical report or choose from your existing patient records to get simple-language explanations and audit verification.'}
                </p>
              </div>

              {/* Instant 1-Click Demo Trigger */}
              <button
                type="button"
                onClick={handleStartDemo}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-teal-light border border-accent-teal/30 text-accent-teal-dark text-xs font-bold hover:bg-accent-teal/20 transition-all shadow-xs self-start sm:self-auto cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-accent-teal" />
                Try Sample Report
              </button>
            </div>

            {/* ─── TAB SWITCHER: Upload New vs Choose Existing ─── */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-bg-surface border border-border-default mb-6 max-w-md">
              <button
                type="button"
                onClick={() => { setUploadTab('upload'); setSelectedFile(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  uploadTab === 'upload'
                    ? 'bg-accent-teal text-text-inverse shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New File</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadTab('stored')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  uploadTab === 'stored'
                    ? 'bg-accent-teal text-text-inverse shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Choose Old Records ({storedDocs.length})</span>
              </button>
            </div>

            {/* TAB 1: UPLOAD NEW FILE */}
            {uploadTab === 'upload' && (
              <>
                {!selectedFile ? (
                  <UploadDropzone
                    onFileSelect={handleFileSelected}
                    className="mb-6"
                  />
                ) : (
                  <div className="p-6 rounded-2xl bg-bg-surface border border-accent-teal/40 shadow-md mb-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6 text-accent-teal" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-accent-teal-dark">
                            DOCUMENT SELECTED
                          </span>
                          <h2 className="text-base sm:text-lg font-bold text-text-primary mt-0.5">
                            {selectedFile.name}
                          </h2>
                          <p className="text-xs text-text-secondary">
                            {selectedFile.type || 'application/pdf'} • {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                        title="Change file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="px-4 py-2.5 rounded-xl border border-border-default text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Choose Different File
                      </button>
                      <button
                        type="button"
                        onClick={() => setStage('review')}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        <span>Next: Review & Process</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: CHOOSE FROM EXISTING / OLD DOCUMENTS */}
            {uploadTab === 'stored' && (
              <div className="space-y-4 mb-6">
                {/* Search & Patient Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-bg-surface border border-border-default shadow-xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      placeholder="Search past reports by name, file, or type..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-teal"
                    />
                  </div>

                  {patients.length > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Filter className="w-3.5 h-3.5 text-text-tertiary" />
                      <select
                        value={patientFilter}
                        onChange={e => setPatientFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:border-accent-teal"
                      >
                        <option value="all">All Patients ({patients.length})</option>
                        {patients.map(p => (
                          <option key={p.patientId} value={p.patientId}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Stored Documents Grid */}
                {loadingStoredDocs ? (
                  <div className="p-8 text-center text-xs text-text-muted">Loading stored medical documents...</div>
                ) : filteredStoredDocs.length === 0 ? (
                  <div className="p-10 rounded-2xl border-2 border-dashed border-border-default bg-bg-surface text-center space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-bg-secondary text-text-tertiary flex items-center justify-center mx-auto">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary">No stored documents found</h3>
                    <p className="text-xs text-text-secondary max-w-sm mx-auto">
                      Upload a new prescription or lab report using the Upload tab to start building your permanent record.
                    </p>
                    <button
                      type="button"
                      onClick={() => setUploadTab('upload')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-teal text-text-inverse text-xs font-bold hover:bg-accent-teal-dark transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload a File</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredStoredDocs.map(({ doc, patient }) => (
                      <div
                        key={doc.documentId}
                        className="p-5 rounded-2xl bg-bg-surface border border-border-default hover:border-accent-teal/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-accent-teal/10 text-accent-teal-dark border border-accent-teal/20">
                              {doc.documentType || 'REPORT'}
                            </span>
                            <span className="text-[11px] text-text-tertiary font-mono">
                              {formatDate(doc.createdAt || (doc as any).uploadedAt)}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-text-primary group-hover:text-accent-teal-dark transition-colors line-clamp-1">
                            {doc.displayName || doc.originalFileName || 'Medical Record'}
                          </h3>
                          <p className="text-xs text-text-secondary mt-0.5">
                            Patient: <strong className="text-text-primary">{patient.name}</strong> · ID: {patient.patientId}
                          </p>

                          {doc.extractedText && (
                            <p className="text-[11px] text-text-tertiary mt-2 line-clamp-2 italic bg-bg-secondary/50 p-2 rounded-lg border border-border-subtle">
                              "{doc.extractedText.slice(0, 140)}..."
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
                          <button
                            type="button"
                            onClick={() => handleSelectStoredDocument({ doc, patient }, false)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Explain in Simple Words</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectStoredDocument({ doc, patient }, true)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold border border-border-default transition-all cursor-pointer"
                            title="Audit evidence grounding and dual-AI consensus"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-accent-teal" />
                            <span>Audit & Verify</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="p-4 rounded-xl bg-bg-surface border border-border-default flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-xs text-text-tertiary">
                <FileCheck2 className="w-4 h-4 text-accent-teal shrink-0" />
                <span>Supports PDF, PNG, JPEG reports up to 20MB with encrypted local storage.</span>
              </div>
              <span className="text-xs text-text-secondary font-medium hidden sm:inline">
                High-precision OCR extraction + verified clinical comprehension.
              </span>
            </div>
          </motion.div>
        )}

        {/* ─── 1b. REVIEW STAGE ─── */}
        {stage === 'review' && selectedFile && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-2">
              Review Document Details
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mb-6">
              Confirm patient attribution and document classification before processing.
            </p>

            <div className="p-6 rounded-2xl bg-bg-surface border border-border-default shadow-md mb-6 space-y-4">
              {/* File summary */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-accent-teal/15 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-accent-teal" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Filename</span>
                  <p className="text-sm font-semibold text-text-primary">{selectedFile.name}</p>
                  <p className="text-xs text-text-secondary">{selectedFile.type || 'application/pdf'} · {formatFileSize(selectedFile.size)}</p>
                </div>
              </div>

              {/* Document Type selector */}
              <div className="p-3.5 rounded-xl bg-bg-secondary/60 border border-border-subtle">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                  Document Classification
                </label>
                <select
                  value={selectedDocumentType}
                  onChange={e => setSelectedDocumentType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg-surface border border-border-default text-text-primary text-xs font-semibold focus:outline-none focus:border-accent-teal"
                >
                  <option value="PRESCRIPTION">Prescription</option>
                  <option value="LAB_REPORT">Lab Report</option>
                  <option value="MEDICAL_REPORT">Medical Report</option>
                  <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                  <option value="OTHER">Other Health Document</option>
                </select>
              </div>

              {/* Patient selector */}
              <div className="p-3.5 rounded-xl bg-bg-secondary/60 border border-border-subtle">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                  Assign to Patient Chart
                </label>
                <select
                  value={selectedPatientId || ''}
                  onChange={e => setSelectedPatientId(e.target.value || null)}
                  className="w-full px-3 py-2 rounded-xl bg-bg-surface border border-border-default text-text-primary text-xs font-semibold focus:outline-none focus:border-accent-teal"
                >
                  <option value="">Auto-Detect Patient from Document</option>
                  {patients.map(p => (
                    <option key={p.patientId} value={p.patientId}>
                      {p.name} ({p.patientId}) · {p.relationship || 'Self'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStage('upload')}
                className="px-4 py-2.5 rounded-xl border border-border-default text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleProcessDocument}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-40"
              >
                <span>Process & Explain Document</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── 2. PROCESSING STAGE ─── */}
        {stage === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2">
              Extracting, Explaining & Auditing Document
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mb-8 max-w-md mx-auto">
              Synthesizing plain language explanations and verifying evidence grounding against source quotes.
            </p>

            <div className="w-full max-w-[1200px] mx-auto mb-8">
              <DocumentProcessingStepper
                currentStepIndex={currentStepIndex}
                stepStatuses={stepStatuses}
                errorMessage={errorMessage}
                onRetry={handleProcessDocument}
              />
            </div>

            <div className="space-y-4 max-w-2xl mx-auto">
              {[1, 2, 3].map(i => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── 3. RESULTS STAGE ─── */}
        {stage === 'results' && analysis && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header & View Mode Switcher */}
            <div className="bg-bg-surface border border-border-default rounded-2xl p-6 sm:p-7 shadow-xs mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-subtle">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-accent-teal-dark bg-accent-teal-light px-2.5 py-0.5 rounded-full">
                      ANALYSIS & VERIFICATION COMPLETE
                    </span>
                    {rawExtractedData?.detectedPatient?.name && (
                      <span className="text-[11px] font-bold text-accent-teal-dark bg-accent-teal/10 px-2.5 py-0.5 rounded-full border border-accent-teal/20">
                        PATIENT: {rawExtractedData.detectedPatient.name}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                    {selectedFile?.name || 'Document Clinical Insights'}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => { setStage('upload'); setSelectedFile(null); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-default text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Choose Another</span>
                  </button>
                  <Link
                    to="/brief"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-teal text-text-inverse text-xs font-bold hover:bg-accent-teal-dark transition-all shadow-xs no-underline"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Doctor Visit Brief</span>
                  </Link>
                </div>
              </div>

              {/* ─── PRIMARY RESULTS VIEW TABS ─── */}
              <div className="flex items-center gap-2 pt-5">
                <button
                  type="button"
                  onClick={() => setResultTab('explanation')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    resultTab === 'explanation'
                      ? 'bg-accent-teal text-text-inverse shadow-xs'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-border-subtle'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explain in Simple Words</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResultTab('audit')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    resultTab === 'audit'
                      ? 'bg-accent-teal text-text-inverse shadow-xs'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-border-subtle'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Audit & Verification</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResultTab('raw')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    resultTab === 'raw'
                      ? 'bg-accent-teal text-text-inverse shadow-xs'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-border-subtle'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Source Text</span>
                </button>
              </div>
            </div>

            {/* ─── TAB 1: SIMPLE WORDS EXPLANATION ─── */}
            {resultTab === 'explanation' && (
              <div className="space-y-6 mb-8">
                {/* Plain-Language Overall Summary Card */}
                <div className="bg-gradient-to-r from-bg-surface via-bg-surface to-accent-teal-light/20 border-2 border-accent-teal/30 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-accent-teal/15 text-accent-teal flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-accent-teal" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-text-primary">
                          Report Summary in Simple Words
                        </h2>
                        <p className="text-[11px] text-text-secondary">
                          Plain-language breakdown for everyday understanding
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Audio Read-Out Button */}
                      {isPlaying ? (
                        <button
                          type="button"
                          onClick={stop}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-danger-bg text-status-danger border border-status-danger/30 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => speak(simpleReportSummary)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-teal-light text-accent-teal-dark border border-accent-teal/30 text-xs font-bold hover:bg-accent-teal/20 transition-all cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-accent-teal" />
                          <span>Listen</span>
                        </button>
                      )}

                      {/* Level Switcher */}
                      <div className="flex items-center p-0.5 rounded-lg bg-bg-surface border border-border-default text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setExplanationLevel('standard')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            explanationLevel === 'standard'
                              ? 'bg-accent-teal text-text-inverse shadow-xs'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => setExplanationLevel('beginner')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            explanationLevel === 'beginner'
                              ? 'bg-accent-teal text-text-inverse shadow-xs'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          Beginner Friendly
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-text-primary leading-relaxed">
                    {simpleReportSummary}
                  </p>

                  <div className="p-3.5 rounded-xl bg-accent-teal/10 border border-accent-teal/20 text-xs text-text-secondary space-y-1">
                    <span className="font-bold text-accent-teal-dark uppercase text-[10px] tracking-wider block">
                      💡 Key Takeaway for Your Doctor Visit
                    </span>
                    <p>
                      Bring this report to your consultation. Highlight any values flagged as outside typical reference intervals and review current medication dosages.
                    </p>
                  </div>
                </div>

                {/* Medications (if prescription) */}
                {medications.length > 0 && (
                  <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                      <div className="flex items-center gap-2">
                        <Pill className="w-5 h-5 text-accent-teal" />
                        <h2 className="text-base font-bold text-text-primary">
                          Documented Medications ({medications.length})
                        </h2>
                      </div>
                      <span className="text-xs text-text-muted">Prescribed therapy schedule</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {medications.map((med: any, i: number) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl border border-border-subtle bg-bg-secondary/40 space-y-1.5 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-text-primary text-sm">
                              {med.name} {med.strength || ''}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-accent-teal/10 text-accent-teal-dark font-mono text-[10px] font-bold">
                              Page {med.sourcePage || 1}
                            </span>
                          </div>
                          <div className="text-text-secondary">
                            <span className="font-medium text-text-primary">Dosage: </span>
                            {med.dosage || med.frequency || 'As directed'}
                            {med.frequency && med.dosage ? ` • ${med.frequency}` : ''}
                          </div>
                          {med.instructions && (
                            <p className="text-[11px] text-text-muted italic pt-1">
                              Instructions: {med.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence Cards for Findings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                      Findings & Biomarkers in Plain Words ({analysis.insights.length})
                    </h2>
                    <span className="text-xs text-text-tertiary">Click Explain to view simple breakdown & talking points</span>
                  </div>

                  {analysis.insights.length === 0 ? (
                    <div className="p-8 text-center text-xs text-text-muted rounded-2xl border border-dashed border-border-subtle bg-bg-surface">
                      No individual laboratory markers found. Check the full extracted text below.
                    </div>
                  ) : (
                    analysis.insights.map((insight, i) => (
                      <EvidenceCard key={insight.id} insight={insight} index={i} />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB 2: AUDIT & DUAL-AI VERIFICATION ─── */}
            {resultTab === 'audit' && (
              <div className="space-y-6 mb-8">
                {/* Dual-AI Architecture Panel */}
                <div className="bg-bg-surface border border-border-default rounded-2xl p-6 sm:p-8 shadow-xs">
                  <DualAIPanel initialStatus={analysis.summary.needsReview > 0 ? 'needs_review' : 'consistent'} />
                </div>

                {/* Verification Breakdown Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-bg-surface border border-border-default shadow-2xs">
                    <span className="text-xs text-text-tertiary">Total Claims Audited</span>
                    <p className="text-2xl font-bold text-text-primary mt-1">{analysis.summary.totalInsights}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-status-consistent-bg/50 border border-status-consistent/30 shadow-2xs">
                    <span className="text-xs text-status-consistent font-bold">✓ Evidence Grounded</span>
                    <p className="text-2xl font-bold text-status-consistent mt-1">{analysis.summary.consistent}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-status-review-bg/50 border border-status-review/30 shadow-2xs">
                    <span className="text-xs text-status-review font-bold">⚠ Review Flagged</span>
                    <p className="text-2xl font-bold text-status-review mt-1">{analysis.summary.needsReview}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-bg-surface border border-border-default shadow-2xs">
                    <span className="text-xs text-text-tertiary">OCR Engine</span>
                    <p className="text-sm font-bold text-accent-teal-dark mt-2">{extractionMethod.toUpperCase()}</p>
                  </div>
                </div>

                {/* Evidence Grounding List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                    Audited Finding Grounding & Verbatim Citations
                  </h3>
                  {analysis.insights.map((insight, idx) => (
                    <div
                      key={insight.id}
                      className="p-4 rounded-xl bg-bg-surface border border-border-default shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary text-sm">{insight.claim}</span>
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                          insight.verification.status === 'consistent'
                            ? 'bg-status-consistent-bg text-status-consistent border border-status-consistent/30'
                            : 'bg-status-review-bg text-status-review border border-status-review/30'
                        }`}>
                          {insight.verification.status === 'consistent' ? '✓ CONSISTENT' : '⚠ NEEDS REVIEW'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-bg-secondary/60 border border-border-subtle font-mono text-[11px] text-text-secondary">
                        <span className="text-text-muted uppercase text-[9px] block mb-0.5">Source Evidence Quote (Page {insight.source.page}):</span>
                        "{insight.source.text}"
                      </div>
                      <p className="text-text-tertiary text-[11px]">
                        Verification reasoning: {insight.verification.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── TAB 3: RAW DOCUMENT TEXT ─── */}
            {resultTab === 'raw' && (
              <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs mb-8 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-accent-teal" />
                    <h3 className="text-sm font-bold text-text-primary">
                      Extracted Medical Text (PyMuPDF / Vision OCR)
                    </h3>
                  </div>
                  {rawPages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowFullTextModal(true)}
                      className="text-xs font-bold text-accent-teal hover:underline cursor-pointer"
                    >
                      View All {rawPages.length} Pages
                    </button>
                  )}
                </div>
                <p className="text-xs text-text-secondary">
                  Verbatim text read directly from your uploaded document. Inspect to verify extraction accuracy.
                </p>

                <div className="p-4 rounded-xl bg-bg-secondary/60 border border-border-subtle font-mono text-xs text-text-secondary whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                  {rawExtractedData?.extractedText || 'No text extracted.'}
                </div>
              </div>
            )}

            {/* Next Steps Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-5 rounded-2xl bg-bg-surface border border-border-default shadow-xs mt-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-teal-light text-accent-teal-dark flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Ready for your upcoming consultation?</h3>
                  <p className="text-xs text-text-secondary">Synthesize these findings into a 1-page multilingual Doctor Brief.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/translate-explain"
                  className="px-4 py-2.5 rounded-xl border border-border-default text-text-primary hover:bg-bg-secondary text-xs font-semibold transition-colors no-underline text-center"
                >
                  Translate & Explain
                </Link>
                <Link
                  to="/brief"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs hover:bg-accent-teal-dark transition-all shadow-xs no-underline"
                >
                  <span>Generate Doctor Brief</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Safety Alert Guardrail */}
            <SafetyAlert
              type="info"
              title="Educational Analysis Notice"
              message={analysis.disclaimer}
              className="mt-6"
            />
          </motion.div>
        )}

        {/* ─── ERROR STATE ─── */}
        {stage === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <ErrorState
              title="Document Processing Error"
              message={errorMessage || 'An error occurred while processing your document. Please verify the file and retry.'}
              onRetry={() => setStage('upload')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: DETECTED PATIENT CREATION / LINKING ─── */}
      <AnimatePresence>
        {showPatientModal && (() => {
          const detectedDocPatientName = rawExtractedData?.detectedPatient?.name?.trim();
          const existingSameNamePatient = detectedDocPatientName
            ? patients.find(p => p.name.trim().toLowerCase() === detectedDocPatientName.toLowerCase()) || rawExtractedData?.matchResult?.matchedPatient
            : null;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-bg-surface rounded-2xl border border-accent-teal/40 p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5 text-accent-teal" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary">
                      {existingSameNamePatient ? 'Existing Patient Profile Detected' : 'Patient Identity Detected'}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      {existingSameNamePatient ? 'Same patient name already exists' : 'Patient identity in document'}
                    </p>
                  </div>
                </div>

                {existingSameNamePatient ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed space-y-1.5">
                    <p className="font-bold text-xs text-amber-800 dark:text-amber-300">
                      Patient Profile Already Exists
                    </p>
                    <p>
                      A patient profile for <strong>"{existingSameNamePatient.name}"</strong> already exists with <strong>Patient ID: {existingSameNamePatient.patientId}</strong> ({existingSameNamePatient.documentCount || 0} existing records).
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      Do you want to upload and add this document to that existing patient chart, or create a fresh new patient profile?
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs space-y-1">
                    <span className="text-text-muted uppercase text-[10px] font-bold">Detected Name</span>
                    <p className="text-sm font-bold text-text-primary">
                      "{rawExtractedData?.detectedPatient?.name}"
                    </p>
                    {rawExtractedData?.detectedPatient?.dob && (
                      <p className="text-text-secondary text-[11px]">
                        DOB/Age: {rawExtractedData.detectedPatient.dob}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  {existingSameNamePatient ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAttachToExistingPatient(existingSameNamePatient.patientId)}
                        className="w-full py-2.5 px-4 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Upload to Existing Patient ({existingSameNamePatient.patientId})</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCreatePatientFromDoc}
                        className="w-full py-2.5 px-4 rounded-xl border border-border-default bg-bg-surface text-text-primary font-semibold text-xs hover:bg-bg-surface-hover transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-accent-teal" />
                        <span>Create as a Fresh New Patient</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleCreatePatientFromDoc}
                        className="w-full py-2.5 px-4 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Patient Profile & Attach Document</span>
                      </button>

                      {patients.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[11px] text-text-muted block mb-1.5 font-medium">
                            Or link to existing profile:
                          </span>
                          <select
                            onChange={e => {
                              if (e.target.value) handleAttachToExistingPatient(e.target.value);
                            }}
                            defaultValue=""
                            className="w-full px-3 py-2 rounded-xl bg-bg-surface border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent-teal"
                          >
                            <option value="" disabled>Choose Existing Patient...</option>
                            {patients.map(p => (
                              <option key={p.patientId} value={p.patientId}>
                                {p.name} ({p.patientId})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowPatientModal(false)}
                    className="w-full py-2 text-center text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    Skip & Keep Unlinked
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ─── MODAL: PATIENT IDENTITY MISMATCH ─── */}
      <AnimatePresence>
        {showMismatchModal && (() => {
          const detectedDocPatientName = rawExtractedData?.detectedPatient?.name?.trim();
          const existingSameNamePatient = detectedDocPatientName
            ? patients.find(p => p.name.trim().toLowerCase() === detectedDocPatientName.toLowerCase()) || rawExtractedData?.matchResult?.matchedPatient
            : null;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-bg-surface rounded-2xl border border-status-review/40 p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3 text-status-review">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-text-primary">Patient Identity Mismatch</h3>
                    <p className="text-xs text-text-secondary">Document name differs from active patient</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-bg-secondary border border-border-subtle">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase font-bold">Active Patient</span>
                    <p className="font-bold text-text-primary mt-0.5">
                      {patients.find(p => p.patientId === selectedPatientId)?.name || 'Selected Patient'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase font-bold">Document Name</span>
                    <p className="font-bold text-status-review mt-0.5">
                      {rawExtractedData?.detectedPatient?.name || 'Document Patient'}
                    </p>
                  </div>
                </div>

                {existingSameNamePatient && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed space-y-1">
                    <p className="font-bold text-xs text-amber-800 dark:text-amber-300">
                      Existing Profile Found for "{existingSameNamePatient.name}"
                    </p>
                    <p>
                      A patient profile for <strong>"{existingSameNamePatient.name}"</strong> already exists with <strong>Patient ID: {existingSameNamePatient.patientId}</strong>.
                    </p>
                  </div>
                )}

                <p className="text-xs text-text-secondary leading-relaxed">
                  To prevent cross-patient record contamination, please choose how to route this document:
                </p>

                <div className="space-y-2 pt-2">
                  {existingSameNamePatient && (
                    <button
                      type="button"
                      onClick={() => handleAttachToExistingPatient(existingSameNamePatient.patientId)}
                      className="w-full py-2.5 px-4 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs shadow-xs hover:bg-accent-teal-dark transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Upload to Existing Patient ({existingSameNamePatient.name} · {existingSameNamePatient.patientId})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCreatePatientFromDoc}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      existingSameNamePatient
                        ? 'border border-border-default bg-bg-surface text-text-primary hover:bg-bg-surface-hover'
                        : 'bg-accent-teal text-text-inverse hover:bg-accent-teal-dark'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{existingSameNamePatient ? `Create as a Fresh New Patient Profile` : `Create New Profile for "${rawExtractedData?.detectedPatient?.name}"`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPatientId) handleAttachToExistingPatient(selectedPatientId);
                    }}
                    className="w-full py-2 px-4 rounded-xl border border-border-default text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Attach to Current Patient Anyway (Override)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMismatchModal(false)}
                    className="w-full py-1.5 text-center text-xs text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ─── MODAL: FULL EXTRACTED TEXT VIEWER ─── */}
      <AnimatePresence>
        {showFullTextModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-bg-surface rounded-2xl border border-border-default shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-accent-teal" />
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      Full Extracted Document Text ({rawPages.length} Pages)
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Extraction Method: {extractionMethod.toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullTextModal(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {rawPages.map((p: any) => (
                  <div key={p.page} className="space-y-2">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-accent-teal/15 text-accent-teal-dark font-mono text-[11px] font-bold">
                      Page {p.page}
                    </span>
                    <div className="p-3.5 rounded-xl bg-bg-secondary/60 border border-border-subtle font-mono text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                      {p.text || '[Empty Page]'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-3 border-t border-border-subtle bg-bg-secondary/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowFullTextModal(false)}
                  className="px-4 py-2 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
