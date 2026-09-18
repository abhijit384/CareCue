/* ═══════════════════════════════════════════════════════════════
   CARECUE MOCK DATA
   All data is synthetic and for demonstration purposes only.
   ═══════════════════════════════════════════════════════════════ */

import type { CareSession, AnalysisResult, DoctorBrief, GuidanceResponse, PrivacyGatewayResult } from '@/lib/types';

export const MOCK_SESSIONS: CareSession[] = [
  {
    id: 'session-001',
    type: 'report',
    status: 'complete',
    createdAt: new Date().toISOString(),
    documentName: 'Lab Report — Blood Panel',
    insightCount: 6,
    verifiedCount: 4,
    reviewCount: 2,
  },
  {
    id: 'session-002',
    type: 'guidance',
    status: 'complete',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    documentName: 'Care Guidance Session',
    insightCount: 3,
    verifiedCount: 3,
    reviewCount: 0,
  },
  {
    id: 'session-003',
    type: 'brief',
    status: 'complete',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    documentName: 'Doctor Visit Brief',
    insightCount: 4,
    verifiedCount: 3,
    reviewCount: 1,
  },
];

export const MOCK_PRIVACY_RESULT: PrivacyGatewayResult = {
  fieldsDetected: 5,
  fieldsMinimized: 5,
  categories: ['name', 'dob', 'phone', 'id', 'address'],
  fields: [
    { type: 'Name', original: 'Jane Sample', minimized: '[PERSON]', line: 1 },
    { type: 'Date of Birth', original: '01/15/1985', minimized: '[DATE]', line: 2 },
    { type: 'Phone', original: '(555) 123-4567', minimized: '[PHONE]', line: 3 },
    { type: 'Patient ID', original: 'SMP-2026-00421', minimized: '[ID]', line: 4 },
    { type: 'Address', original: '123 Health Ave, Anytown', minimized: '[ADDRESS]', line: 5 },
  ],
  originalPreview: `Patient: Jane Sample               DOB: 01/15/1985
MRN: SMP-2026-00421               Phone: (555) 123-4567
Address: 123 Health Ave, Anytown, ST 12345
Ordering Physician: Dr. Alex Rivera

─── COMPLETE BLOOD COUNT (CBC) ───
Hemoglobin          10.2     g/dL      12.0 – 16.0       LOW
Hematocrit          34.1     %         36.0 – 50.0       LOW
WBC                 7.2      K/uL      4.5 – 11.0
RBC                 4.1      M/uL      4.0 – 5.5
Platelets           245      K/uL      150 – 400

─── LIPID PANEL ───
Total Cholesterol   215      mg/dL     < 200              HIGH
LDL Cholesterol     138      mg/dL     < 100              HIGH
HDL Cholesterol     52       mg/dL     > 40
Triglycerides       126      mg/dL     < 150`,

  minimizedPreview: `Patient: [PERSON]                   DOB: [DATE]
MRN: [ID]                          Phone: [PHONE]
Address: [ADDRESS]
Ordering Physician: [PERSON]

─── COMPLETE BLOOD COUNT (CBC) ───
Hemoglobin          10.2     g/dL      12.0 – 16.0       LOW
Hematocrit          34.1     %         36.0 – 50.0       LOW
WBC                 7.2      K/uL      4.5 – 11.0
RBC                 4.1      M/uL      4.0 – 5.5
Platelets           245      K/uL      150 – 400

─── LIPID PANEL ───
Total Cholesterol   215      mg/dL     < 200              HIGH
LDL Cholesterol     138      mg/dL     < 100              HIGH
HDL Cholesterol     52       mg/dL     > 40
Triglycerides       126      mg/dL     < 150`,
};

export const MOCK_ANALYSIS: AnalysisResult = {
  sessionId: 'session-001',
  status: 'complete',
  summary: {
    totalInsights: 6,
    consistent: 4,
    needsReview: 2,
    safetyRedirects: 0,
  },
  insights: [
    {
      id: 'insight-1',
      category: 'Hematology',
      claim: 'Hemoglobin appears below the reference range shown on the report.',
      explanation: 'The reported hemoglobin value of 10.2 g/dL is below the reference range of 12.0–16.0 g/dL printed on the document. Low hemoglobin may be associated with various conditions. Your doctor can help clarify what this means for you.',
      value: '10.2',
      unit: 'g/dL',
      referenceRange: '12.0 – 16.0',
      rangeStatus: 'outside_range',
      source: { text: 'Hemoglobin 10.2 g/dL Reference: 12.0 – 16.0 Flag: LOW', page: 1, section: 'Complete Blood Count (CBC)' },
      verification: {
        status: 'consistent',
        bedrockInterpretation: 'The hemoglobin value of 10.2 g/dL is below the standard reference range. This finding may warrant discussion with a healthcare provider.',
        geminiAssessment: 'The stated value of 10.2 g/dL is indeed below the 12.0–16.0 g/dL reference range. The interpretation is clinically reasonable.',
        reasoning: 'Both systems independently identified this value as below range. The interpretations are materially aligned.',
      },
    },
    {
      id: 'insight-2',
      category: 'Hematology',
      claim: 'Hematocrit appears below the reference range.',
      explanation: 'The reported hematocrit of 34.1% is below the 36.0–50.0% reference range. Hematocrit and hemoglobin results are often related. Your doctor can explain how these values work together.',
      value: '34.1',
      unit: '%',
      referenceRange: '36.0 – 50.0',
      rangeStatus: 'outside_range',
      source: { text: 'Hematocrit 34.1% Reference: 36.0 – 50.0 Flag: LOW', page: 1, section: 'Complete Blood Count (CBC)' },
      verification: {
        status: 'consistent',
        bedrockInterpretation: 'Hematocrit of 34.1% is below range. This is consistent with the low hemoglobin finding and may be worth discussing.',
        geminiAssessment: '34.1% is below the 36.0–50.0% reference range. This aligns with the hemoglobin finding.',
        reasoning: 'Both systems agree this value is below range. The association with the hemoglobin finding was noted by both.',
      },
    },
    {
      id: 'insight-3',
      category: 'Lipid Panel',
      claim: 'Total cholesterol appears above the desirable level.',
      explanation: 'The reported total cholesterol of 215 mg/dL is above the desirable level of less than 200 mg/dL. Cholesterol levels are one factor among many that your doctor may consider.',
      value: '215',
      unit: 'mg/dL',
      referenceRange: '< 200',
      rangeStatus: 'outside_range',
      source: { text: 'Total Cholesterol 215 mg/dL Reference: < 200 Flag: HIGH', page: 1, section: 'Lipid Panel' },
      verification: {
        status: 'needs_review',
        bedrockInterpretation: 'Total cholesterol of 215 mg/dL is above the desirable level. However, this is borderline and should be interpreted in context of HDL, LDL, and triglycerides.',
        geminiAssessment: 'The value of 215 mg/dL exceeds the desirable threshold. However, some guidelines consider 200–239 mg/dL as borderline rather than definitively elevated.',
        reasoning: 'Both systems acknowledge the value exceeds the threshold, but they differ slightly on how to characterize the severity. This warrants additional context from a healthcare provider.',
      },
    },
    {
      id: 'insight-4',
      category: 'Lipid Panel',
      claim: 'LDL cholesterol appears above the optimal level.',
      explanation: 'The reported LDL of 138 mg/dL is above the optimal level of less than 100 mg/dL. LDL levels are often discussed alongside total cholesterol and other risk factors.',
      value: '138',
      unit: 'mg/dL',
      referenceRange: '< 100',
      rangeStatus: 'outside_range',
      source: { text: 'LDL Cholesterol 138 mg/dL Reference: < 100 Flag: HIGH', page: 1, section: 'Lipid Panel' },
      verification: {
        status: 'consistent',
        bedrockInterpretation: 'LDL cholesterol of 138 mg/dL exceeds the optimal level. This is a common discussion point in cardiovascular health assessments.',
        geminiAssessment: 'The LDL value of 138 mg/dL is above the optimal threshold. The interpretation is straightforward and clinically sound.',
        reasoning: 'Both systems agree this value is above optimal. The interpretations are consistent.',
      },
    },
    {
      id: 'insight-5',
      category: 'Hematology',
      claim: 'White blood cell count is within the reference range.',
      explanation: 'The reported WBC of 7.2 K/uL falls within the normal reference range of 4.5–11.0 K/uL.',
      value: '7.2',
      unit: 'K/uL',
      referenceRange: '4.5 – 11.0',
      rangeStatus: 'within_range',
      source: { text: 'WBC 7.2 K/uL Reference: 4.5 – 11.0', page: 1, section: 'Complete Blood Count (CBC)' },
      verification: {
        status: 'consistent',
        bedrockInterpretation: 'WBC is within the normal reference range. No concerns noted.',
        geminiAssessment: '7.2 K/uL is within the 4.5–11.0 K/uL reference range. No issues identified.',
        reasoning: 'Both systems agree this value is within normal range.',
      },
    },
    {
      id: 'insight-6',
      category: 'Lipid Panel',
      claim: 'HDL cholesterol is within the acceptable range but may warrant discussion.',
      explanation: 'The reported HDL of 52 mg/dL is above the minimum threshold of 40 mg/dL. However, higher HDL levels are generally considered more favorable. Your doctor can discuss this in the context of your overall lipid profile.',
      value: '52',
      unit: 'mg/dL',
      referenceRange: '> 40',
      rangeStatus: 'borderline',
      source: { text: 'HDL Cholesterol 52 mg/dL Reference: > 40', page: 1, section: 'Lipid Panel' },
      verification: {
        status: 'needs_review',
        bedrockInterpretation: 'HDL of 52 mg/dL meets the minimum threshold. However, the optimal range is often considered to be above 60 mg/dL.',
        geminiAssessment: 'HDL at 52 mg/dL is above 40 mg/dL, which is the minimum. Whether this is clinically optimal depends on individual risk factors.',
        reasoning: 'Both systems agree the value meets the minimum, but differ on whether to flag it as borderline. Additional context from a healthcare provider would be helpful.',
      },
    },
  ],
  privacyGateway: MOCK_PRIVACY_RESULT,
  disclaimer: 'This analysis is generated by AI and is for informational purposes only. It is not medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.',
};

export const MOCK_DOCTOR_BRIEF: DoctorBrief = {
  sessionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  documentSummary: 'Complete Blood Count (CBC) and Lipid Panel from laboratory analysis. The report contains 11 test results across two panels.',
  keyFindings: [
    { finding: 'Hemoglobin below reference range', value: '10.2 g/dL', range: '12.0 – 16.0 g/dL', verificationStatus: 'consistent', discussWithDoctor: true },
    { finding: 'Hematocrit below reference range', value: '34.1%', range: '36.0 – 50.0%', verificationStatus: 'consistent', discussWithDoctor: true },
    { finding: 'Total cholesterol above desirable level', value: '215 mg/dL', range: '< 200 mg/dL', verificationStatus: 'needs_review', discussWithDoctor: true },
    { finding: 'LDL cholesterol above optimal level', value: '138 mg/dL', range: '< 100 mg/dL', verificationStatus: 'consistent', discussWithDoctor: true },
    { finding: 'HDL cholesterol meets minimum threshold', value: '52 mg/dL', range: '> 40 mg/dL', verificationStatus: 'needs_review', discussWithDoctor: false },
    { finding: 'WBC within normal range', value: '7.2 K/uL', range: '4.5 – 11.0 K/uL', verificationStatus: 'consistent', discussWithDoctor: false },
  ],
  discussionItems: [
    'Hemoglobin and hematocrit values both appear below range — your doctor may want to discuss whether further investigation is appropriate.',
    'Cholesterol and LDL values appear elevated — your doctor can discuss whether lifestyle or other factors should be considered.',
    'Are there any symptoms or recent changes that might be relevant to these findings?',
  ],
  userNotes: '',
  disclaimer: 'This brief was generated by CareCue using AI analysis for informational purposes only. It is not medical advice. Please share it with your healthcare professional for proper evaluation.',
};

export const MOCK_GUIDANCE_RESPONSES: Record<string, GuidanceResponse> = {
  default: {
    answer: 'Based on general health information, hemoglobin is a protein in red blood cells that carries oxygen throughout your body. Reference ranges can vary by laboratory and individual factors such as age, sex, and altitude. A value outside the printed reference range does not necessarily indicate a problem — your doctor can interpret this in the context of your overall health.',
    evidencePoints: [
      {
        claim: 'Hemoglobin reference ranges vary by individual factors.',
        source: 'General medical reference information',
        verification: { status: 'consistent', reasoning: 'Both systems agree that reference ranges are context-dependent.' },
      },
      {
        claim: 'Values outside range should be discussed with a healthcare provider.',
        source: 'Standard clinical guidance',
        verification: { status: 'consistent', reasoning: 'Both systems recommend professional consultation for out-of-range values.' },
      },
    ],
    relatedQuestions: [
      'What factors can affect hemoglobin levels?',
      'How are reference ranges determined?',
      'When should I follow up with my doctor about lab results?',
    ],
    safetyNote: null,
    disclaimer: 'This information is for educational purposes only and does not constitute medical advice.',
  },
  unsafe: {
    answer: '',
    evidencePoints: [],
    relatedQuestions: [],
    safetyNote: 'CareCue cannot prescribe medication or recommend specific treatments. It can help you organize health information and prepare questions for a healthcare professional who can provide personalized medical guidance.',
    disclaimer: 'CareCue is not a substitute for professional medical advice.',
  },
};

export const GUIDANCE_EXAMPLE_PROMPTS = [
  'What does a low hemoglobin level generally mean?',
  'How are cholesterol levels typically interpreted?',
  'What questions should I ask my doctor about my lab results?',
  'What is the difference between LDL and HDL cholesterol?',
];

export const UNSAFE_KEYWORDS = [
  'prescribe', 'medication', 'medicine', 'drug', 'dosage',
  'diagnose', 'diagnosis', 'treatment', 'cure',
  'should i take', 'what medicine', 'what drug',
];
