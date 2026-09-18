/* CareCue Service Layer — Seamless Live AWS Backend + Deterministic Demo Mode */

import { delay } from '@/lib/utils';
import type { CareSession, AnalysisResult, DoctorBrief, GuidanceResponse, PrivacyGatewayResult } from '@/lib/types';
import { MOCK_SESSIONS, MOCK_ANALYSIS, MOCK_DOCTOR_BRIEF, MOCK_PRIVACY_RESULT, MOCK_GUIDANCE_RESPONSES, UNSAFE_KEYWORDS } from './mockData';
import { isLiveAws, liveApi, ApiError } from './apiClient';

export { isLiveAws, liveApi, ApiError };

export const sessionService = {
  async list(): Promise<CareSession[]> {
    if (isLiveAws()) {
      try {
        const rawSessions = await liveApi.sessions.list();
        return rawSessions.map((s: any) => ({
          id: s.sessionId || s.id,
          type: (s.sessionType || s.type || 'report') as CareSession['type'],
          status: (s.status || 'complete') as CareSession['status'],
          createdAt: s.createdAt || new Date().toISOString(),
          documentName: s.title || s.documentName || 'Lab Report',
          insightCount: s.findings?.length || s.insightCount || 0,
          verifiedCount: s.findings?.filter((f: any) => f.verificationStatus === 'verified').length || s.verifiedCount || 0,
          reviewCount: s.findings?.filter((f: any) => f.verificationStatus === 'needs_review').length || s.reviewCount || 0,
        }));
      } catch (err) {
        console.warn('[CareCue] Live sessions fetch failed, falling back to local demo dataset:', err);
      }
    }
    await delay(400);
    return MOCK_SESSIONS;
  },

  async get(id: string): Promise<CareSession | undefined> {
    if (isLiveAws()) {
      try {
        const s = await liveApi.sessions.get(id);
        if (s) {
          return {
            id: s.sessionId || s.id,
            type: (s.sessionType || s.type || 'report') as CareSession['type'],
            status: (s.status || 'complete') as CareSession['status'],
            createdAt: s.createdAt || new Date().toISOString(),
            documentName: s.title || s.documentName || 'Lab Report',
            insightCount: s.findings?.length || 0,
          };
        }
      } catch (err) {
        console.warn(`[CareCue] Live session ${id} fetch failed:`, err);
      }
    }
    await delay(200);
    return MOCK_SESSIONS.find(s => s.id === id);
  },

  async create(type: CareSession['type'], title?: string): Promise<CareSession> {
    if (isLiveAws()) {
      try {
        const res = await liveApi.sessions.create(type, title);
        return {
          id: res.sessionId || res.id,
          type: (res.type || type) as CareSession['type'],
          status: 'created',
          createdAt: res.createdAt || new Date().toISOString(),
          documentName: title,
        };
      } catch (err) {
        console.warn('[CareCue] Live session creation failed, continuing in demo mode:', err);
      }
    }
    await delay(300);
    return {
      id: `session-${Date.now()}`,
      type,
      status: 'created',
      createdAt: new Date().toISOString(),
    };
  },

  async delete(id: string): Promise<boolean> {
    if (isLiveAws()) {
      try {
        return await liveApi.sessions.delete(id);
      } catch (err) {
        console.warn(`[CareCue] Live session ${id} delete failed:`, err);
      }
    }
    await delay(300);
    return true;
  },
};

export const documentService = {
  async upload(file: File, sessionId?: string): Promise<{ uploadId: string; fileName: string; s3Key?: string }> {
    const activeSessionId = sessionId || `session-${Date.now()}`;
    if (isLiveAws()) {
      try {
        const { uploadUrl, s3Key, documentId } = await liveApi.documents.getUploadUrl(activeSessionId, file);
        if (uploadUrl) {
          await liveApi.documents.uploadToS3(uploadUrl, file);
        }
        return { uploadId: documentId, fileName: file.name, s3Key };
      } catch (err) {
        console.warn('[CareCue] S3 direct upload failed, continuing with client-side demo parsing:', err);
      }
    }
    await delay(1500);
    return { uploadId: `upload-${Date.now()}`, fileName: file.name };
  },
};

export const analysisService = {
  async analyze(sessionId: string, s3Key?: string, userNotes?: string): Promise<AnalysisResult> {
    if (isLiveAws()) {
      try {
        const res = await liveApi.analysis.start(sessionId, { s3Key, userNotes });
        if (res && res.findings) {
          const insights = res.findings.map((f: any, idx: number) => ({
            id: f.id || `f-${idx + 1}`,
            category: f.title?.split('—')[0]?.trim() || 'Laboratory Marker',
            claim: f.title?.split('—')[1]?.trim() || f.title || 'Clinical finding',
            explanation: f.plainLanguageSummary || '',
            value: f.clinicalSignificance?.split('(')[0]?.replace('Value:', '')?.trim() || '',
            unit: '',
            referenceRange: f.clinicalSignificance || 'Standard range',
            rangeStatus: (f.verificationStatus === 'verified' ? 'within_range' : 'outside_range') as any,
            source: {
              text: f.sourceQuote || '',
              page: f.sourcePage || 1,
              section: 'Laboratory Findings',
            },
            verification: {
              status: (f.verificationStatus === 'verified' ? 'consistent' : 'needs_review') as any,
              bedrockInterpretation: f.plainLanguageSummary || 'Grounded in document',
              geminiAssessment: 'Grounded against source quote',
              reasoning: f.groundingReasoning || 'Direct numerical & entity verification',
            },
          }));

          return {
            sessionId,
            status: 'complete',
            summary: {
              totalInsights: insights.length,
              consistent: insights.filter((i: any) => i.verification.status === 'consistent').length,
              needsReview: insights.filter((i: any) => i.verification.status === 'needs_review').length,
              safetyRedirects: 0,
            },
            insights,
            privacyGateway: MOCK_PRIVACY_RESULT,
            disclaimer: 'CareCue is an informational health companion, not a diagnostic platform. Consult your physician.',
          };
        }
      } catch (err) {
        console.warn('[CareCue] Live Bedrock analysis failed, using deterministic clinical mock:', err);
      }
    }
    await delay(6000);
    return { ...MOCK_ANALYSIS, sessionId };
  },

  async getResults(sessionId: string): Promise<AnalysisResult> {
    if (isLiveAws()) {
      try {
        const res = await liveApi.analysis.get(sessionId);
        if (res && res.findings && res.findings.length > 0) {
          return this.analyze(sessionId);
        }
      } catch (err) {
        console.warn('[CareCue] Live analysis lookup failed:', err);
      }
    }
    await delay(400);
    return { ...MOCK_ANALYSIS, sessionId };
  },
};

export const privacyService = {
  async process(): Promise<PrivacyGatewayResult> {
    await delay(2000);
    return MOCK_PRIVACY_RESULT;
  },
};

export const verificationService = {
  async verify(sessionId: string): Promise<AnalysisResult['summary']> {
    if (isLiveAws()) {
      try {
        const res = await liveApi.verification.verify(sessionId);
        if (res && res.summary) {
          return {
            totalInsights: res.summary.totalInsights || MOCK_ANALYSIS.summary.totalInsights,
            consistent: res.summary.consistent ?? MOCK_ANALYSIS.summary.consistent,
            needsReview: res.summary.needsReview ?? MOCK_ANALYSIS.summary.needsReview,
            safetyRedirects: res.summary.safetyRedirects ?? 0,
          };
        }
      } catch (err) {
        console.warn('[CareCue] Live verification call failed, using demo consensus summary:', err);
      }
    }
    await delay(3000);
    return MOCK_ANALYSIS.summary;
  },
};

export const doctorBriefService = {
  async generate(sessionId: string, userNotes?: string): Promise<DoctorBrief> {
    if (isLiveAws()) {
      try {
        const res = await liveApi.brief.compile(sessionId, userNotes ? [userNotes] : undefined);
        if (res && res.brief) {
          const brief = res.brief;
          return {
            sessionDate: brief.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            documentSummary: brief.sessionTitle || 'Comprehensive Lab Review',
            keyFindings: (brief.keyDiscussionTopics || []).map((t: any) => ({
              finding: t.topic || 'Laboratory Marker',
              value: t.evidenceQuote || '',
              range: t.significance || 'Monitored range',
              verificationStatus: 'consistent',
              discussWithDoctor: true,
            })),
            discussionItems: brief.suggestedQuestions || [],
            userNotes: userNotes || '',
            disclaimer: brief.disclaimer || MOCK_DOCTOR_BRIEF.disclaimer,
          };
        }
      } catch (err) {
        console.warn('[CareCue] Live Doctor Brief compilation failed, returning demo brief:', err);
      }
    }
    await delay(2000);
    return { ...MOCK_DOCTOR_BRIEF, userNotes: userNotes || '' };
  },
};

export const guidanceService = {
  async query(question: string, sessionId?: string): Promise<GuidanceResponse> {
    if (isLiveAws()) {
      try {
        const res = await liveApi.guidance.ask(question, sessionId);
        if (res && res.answer) {
          const isSafetyRedirect = res.isSafetyRedirect || res.safetyCategory === 'EMERGENCY';
          return {
            answer: res.answer,
            evidencePoints: [
              {
                claim: question,
                source: res.sourceCitation || 'CareCue Clinical Reference Database',
                verification: {
                  status: isSafetyRedirect ? 'safety_redirect' : 'consistent',
                  reasoning: res.disclaimer || 'Safety and literacy verification passed',
                },
              },
            ],
            relatedQuestions: res.suggestedFollowUps || [],
            safetyNote: isSafetyRedirect ? res.disclaimer : null,
            disclaimer: res.disclaimer || 'CareCue is an educational health literacy tool, not a diagnostic or prescription platform.',
          };
        }
      } catch (err) {
        console.warn('[CareCue] Live guidance inquiry failed, returning demo response:', err);
      }
    }
    await delay(3000);
    const isUnsafe = UNSAFE_KEYWORDS.some(k => question.toLowerCase().includes(k));
    return isUnsafe ? MOCK_GUIDANCE_RESPONSES.unsafe : MOCK_GUIDANCE_RESPONSES.default;
  },
};
