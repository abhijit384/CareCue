/* ═══════════════════════════════════════════════════════════════
   CARECUE TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════ */

export type SessionType = 'report' | 'guidance' | 'brief';

export type VerificationStatus = 'consistent' | 'needs_review' | 'safety_redirect';

export type SessionStatus = 'created' | 'uploading' | 'analyzing' | 'complete' | 'error';

export interface CareSession {
  id: string;
  type: SessionType;
  status: SessionStatus;
  createdAt: string;
  documentName?: string;
  insightCount?: number;
  verifiedCount?: number;
  reviewCount?: number;
}

export interface PrivacyField {
  type: string;
  original: string;
  minimized: string;
  line: number;
}

export interface PrivacyGatewayResult {
  fieldsDetected: number;
  fieldsMinimized: number;
  categories: string[];
  fields: PrivacyField[];
  originalPreview: string;
  minimizedPreview: string;
}

export interface EvidenceSource {
  text: string;
  page: number;
  section: string;
}

export interface Verification {
  status: VerificationStatus;
  bedrockInterpretation: string;
  geminiAssessment: string;
  reasoning: string;
}

export interface Insight {
  id: string;
  category: string;
  claim: string;
  explanation: string;
  value: string;
  unit: string;
  referenceRange: string;
  rangeStatus: 'within_range' | 'outside_range' | 'no_range' | 'borderline';
  source: EvidenceSource;
  verification: Verification;
}

export interface AnalysisResult {
  sessionId: string;
  status: 'complete' | 'partial';
  summary: {
    totalInsights: number;
    consistent: number;
    needsReview: number;
    safetyRedirects: number;
  };
  insights: Insight[];
  privacyGateway: PrivacyGatewayResult;
  disclaimer: string;
}

export interface DoctorBrief {
  sessionDate: string;
  documentSummary: string;
  keyFindings: Array<{
    finding: string;
    value: string;
    range: string;
    verificationStatus: VerificationStatus;
    discussWithDoctor: boolean;
  }>;
  discussionItems: string[];
  userNotes: string;
  disclaimer: string;
}

export interface GuidanceResponse {
  answer: string;
  evidencePoints: Array<{
    claim: string;
    source: string;
    verification: { status: VerificationStatus; reasoning: string };
  }>;
  relatedQuestions: string[];
  safetyNote: string | null;
  disclaimer: string;
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

export type TrustPathStep = 'source' | 'analysis' | 'verification' | 'next_step';

/* ─── Pre-Deployment Feature Types ─── */

export type Language = 'en' | 'hi' | 'bn';

export type ExplanationLevel = 'standard' | 'beginner';

export interface ExplanationResult {
  findingTitle: string;
  level?: ExplanationLevel;
  explainedSimply: string;
  whyItAppears?: string;
  whatToDiscuss?: string[];
  verbatimValue?: string;
  verbatimRange?: string;
  sourceQuote?: string;
  disclaimer?: string;
  safetyAudited?: boolean;
  doctorSummary?: string;
  conditionSummary?: string;
  medicationsSummary?: string;
  labSummary?: string;
  hardTermsExplained?: Array<{ term: string; simpleExplanation: string }>;
  nextVisitSummary?: string;
}

export type EmergencyState = 'URGENT_ATTENTION' | 'SAFETY_GUIDANCE' | 'NOT_ENOUGH_INFORMATION';

export interface EmergencyCard {
  title: string;
  patientName: string;
  userConcern: string;
  detectedSymptoms: string[];
  urgencyLevel: string;
  recentDocuments: string[];
  recentFindings: string[];
  timestamp: string;
  label: string;
}

export interface EmergencyAssessment {
  state: EmergencyState;
  urgentHelpRecommended: boolean;
  guidance: string;
  action: string;
  emergencyCard: EmergencyCard | null;
  suggestedExamples?: Array<{ id: string; label: string; query: string }>;
  disclaimer: string;
}

export type DocumentType = 'lab_report' | 'prescription' | 'medical_report' | 'discharge_summary' | 'other';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  homeAddress?: string;
}

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  patientId: string;
  id?: string;
  userId?: string;
  name: string;
  age?: number;
  gender?: string;
  relationship?: string;
  relationshipDetail?: string;
  isDemo?: boolean;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  notes?: string;
  homeAddress?: string;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  bloodGroup?: string;
  severeAllergies?: string[];
  currentMedications?: string[];
  importantConditions?: string[];
  emergencyContact?: EmergencyContact;
}

export interface PatientDocument {
  documentId: string;
  patientId: string;
  documentType: DocumentType;
  displayName: string;
  originalFileName: string;
  mimeType: string;
  createdAt: string;
  status: 'uploaded' | 'processing' | 'processed' | 'verified' | 'error' | 'needs_review';
  sourceReference: string;
  findingsCount: number;
  summary: string;
  extractedText?: string;
}

export interface PatientMatchResult {
  matchType: 'EXACT_NAME_MATCH' | 'LIKELY_MATCH' | 'DIFFERENT_PATIENT' | 'NO_MATCH';
  extractedName?: string | null;
  matchedPatient?: Patient | null;
  targetPatient?: Patient | null;
  confidence: number;
  message: string;
  isTargetMatch?: boolean;
  isSelfProfile?: boolean;
}

export interface DocumentTimelineItem {
  id: string;
  date: string;
  title: string;
  type: DocumentType;
  status: string;
  summary: string;
  findingsCount: number;
  source: string;
}
