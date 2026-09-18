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
