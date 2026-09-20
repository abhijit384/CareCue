import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Languages, 
  Sparkles, 
  Search, 
  Volume2, 
  Square, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  FileText, 
  User, 
  ClipboardList, 
  RefreshCw,
  HelpCircle,
  Stethoscope,
  Pill,
  FlaskConical,
  Calendar,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { patientService, apiClient } from '@/services';
import { useTTS } from '@/hooks/useTTS';
import { useToast } from '@/contexts/ToastContext';
import type { Patient } from '@/lib/types';

interface LanguageOption {
  code: string;
  name: string;
  native: string;
  region: string;
}

interface ExplanationState {
  findingTitle?: string;
  explainedSimply?: string;
  doctorSummary?: string;
  medicationsSummary?: string;
  labSummary?: string;
  nextVisitSummary?: string;
  whatThisMeans?: string;
  whyItAppears?: string;
  questionsForDoctor?: string[];
  disclaimer?: string;
  translatedExplanation?: string;
  translatedDoctorSummary?: string;
  translatedMedicationsSummary?: string;
  translatedLabSummary?: string;
  translatedNextVisitSummary?: string;
  translatedWhy?: string;
  translatedQuestions?: string[];
  translatedSourceText?: string;
  targetLanguage?: string;
}

export function TranslateExplain() {
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get('patientId');
  const urlDocId = searchParams.get('docId');

  const { activePatient, setActivePatient } = useAuth();
  const { showToast } = useToast();

  // Patient & Document Context
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(urlPatientId || activePatient?.patientId || null);
  
  // Sources
  const [sourceType, setSourceType] = useState<'document' | 'finding' | 'brief' | 'custom'>('brief');
  const [patientDocs, setPatientDocs] = useState<any[]>([]);
  const [patientFindings, setPatientFindings] = useState<any[]>([]);
  const [doctorBrief, setDoctorBrief] = useState<any | null>(null);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(urlDocId || null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState<string>('');
  const [sourceTitle, setSourceTitle] = useState<string>('Doctor Visit Brief');

  // Languages
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [searchLang, setSearchLang] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<string>('hi');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // AI Results
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<'translate' | 'explain' | 'combo' | null>(null);
  const [translationResult, setTranslationResult] = useState<string | null>(null);
  const [explanationViewLang, setExplanationViewLang] = useState<'en' | 'target'>('target');
  const [currentlySpeaking, setCurrentlySpeaking] = useState<string | null>(null);
  const [explanationResult, setExplanationResult] = useState<ExplanationState | null>(null);

  // TTS Hook
  const { speak, stop, isPlaying, errorMessage: ttsError } = useTTS(targetLanguage);

  // Handle stop speech
  const handleStopSpeech = () => {
    stop();
    setCurrentlySpeaking(null);
  };

  const handleSpeakText = (text: string, lang: string, identifier: string) => {
    if (isPlaying && currentlySpeaking === identifier) {
      handleStopSpeech();
      return;
    }
    if (!text || !text.trim()) return;
    setCurrentlySpeaking(identifier);
    speak(text, lang);
  };

  // Synchronize stop if playback naturally ends
  useEffect(() => {
    if (!isPlaying) {
      setCurrentlySpeaking(null);
    }
  }, [isPlaying]);

  // Load patients and languages on mount
  useEffect(() => {
    patientService.list().then(pts => {
      setPatients(pts);
      if (pts.length > 0 && !selectedPatientId) {
        const initialPid = urlPatientId || pts[0].patientId;
        setSelectedPatientId(initialPid);
        const match = pts.find(p => p.patientId === initialPid) || pts[0];
        setActivePatient(match);
      }
    }).catch(() => {});

    apiClient.get<LanguageOption[]>('/api/languages')
      .then(setLanguages)
      .catch(() => {
        // Fallback languages
        setLanguages([
          { code: 'hi', name: 'Hindi', native: 'हिन्दी', region: 'India' },
          { code: 'bn', name: 'Bengali', native: 'বাংলা', region: 'India / Bengal' },
          { code: 'ta', name: 'Tamil', native: 'தமிழ்', region: 'India / Tamil Nadu' },
          { code: 'te', name: 'Telugu', native: 'తెలుగు', region: 'India' },
          { code: 'mr', name: 'Marathi', native: 'मराठी', region: 'India' },
          { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', region: 'India' },
          { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', region: 'India' },
          { code: 'ml', name: 'Malayalam', native: 'മലയാളം', region: 'India' },
          { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', region: 'India' },
          { code: 'ur', name: 'Urdu', native: 'اردو', region: 'India / Pakistan' },
          { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', region: 'India' },
          { code: 'es', name: 'Spanish', native: 'Español', region: 'International' },
          { code: 'fr', name: 'French', native: 'Français', region: 'International' },
          { code: 'de', name: 'German', native: 'Deutsch', region: 'International' },
        ]);
      });
  }, [urlPatientId]);

  // Helper to compile comprehensive Doctor Visit Brief narrative
  const compileDoctorBriefNarrative = (brief: any, patient: any, docs: any[], findings: any[]) => {
    const lines: string[] = [];
    lines.push(`Doctor Visit Brief for Patient: ${patient?.name || 'Patient'} (ID: ${patient?.patientId || 'N/A'})`);
    if (brief?.sessionDate) {
      lines.push(`Consultation Date: ${brief.sessionDate}`);
    }

    if (brief?.documentSummary) {
      lines.push(`Overall Summary: ${brief.documentSummary}`);
    } else if (docs.length > 0) {
      lines.push(`Patient Records: Synthesized from ${docs.length} uploaded clinical documents.`);
    }

    // Medications
    const meds = patient?.currentMedications || [];
    if (meds.length > 0) {
      lines.push(`Prescribed Medications: ${meds.map((m: any) => typeof m === 'string' ? m : `${m.name} (${m.dosage || 'As directed'})`).join(', ')}`);
    }

    // Key Findings & Labs
    const keyFindings = brief?.keyFindings || findings || [];
    if (keyFindings.length > 0) {
      const topLabs = keyFindings.slice(0, 6).map((k: any) => {
        const title = k.finding || k.claim || k.title || 'Biomarker';
        const val = k.value || 'Documented';
        const ref = k.range || k.referenceRange || '';
        return `${title}: ${val}${ref ? ` (Ref: ${ref})` : ''}`;
      });
      lines.push(`Laboratory Reports & Clinical Observations: ${topLabs.join('; ')}`);
    }

    // Follow-up / Next steps
    if (brief?.changesSinceLastVisit) {
      lines.push(`Next Visit & Care Plan: ${brief.changesSinceLastVisit.join('. ')}`);
    } else {
      lines.push(`Next Visit & Care Plan: Follow up with doctor as advised and review repeat test markers.`);
    }

    // Discussion points
    const discussion = brief?.discussionItems || brief?.questionsForDoctor || [];
    if (discussion.length > 0) {
      lines.push(`Questions for Doctor: ${discussion.join('; ')}`);
    }

    return lines.join('\n\n');
  };

  // Update records when patient changes (Patient Isolation)
  useEffect(() => {
    if (!selectedPatientId) return;

    const p = patients.find(x => x.patientId === selectedPatientId) || null;
    setActivePatient(p);

    // Reset results on patient switch
    setTranslationResult(null);
    setExplanationResult(null);
    handleStopSpeech();

    Promise.all([
      patientService.getDocuments(selectedPatientId).catch(() => []),
      patientService.getFindings(selectedPatientId).catch(() => []),
      patientService.getDoctorBrief(selectedPatientId).catch(() => null)
    ]).then(([docs, findings, brief]) => {
      setPatientDocs(docs);
      setPatientFindings(findings);
      setDoctorBrief(brief);

      // Default to Brief view with rich narrative
      if (sourceType === 'brief') {
        const narrative = compileDoctorBriefNarrative(brief, p, docs, findings);
        setSourceText(narrative);
        setSourceTitle('Doctor Visit Brief');
      } else if (sourceType === 'document' && docs.length > 0) {
        const targetDoc = urlDocId ? docs.find(d => d.documentId === urlDocId) || docs[0] : docs[0];
        setSelectedDocId(targetDoc.documentId);
        setSourceText(targetDoc.extractedText?.slice(0, 1200) || '');
        setSourceTitle(targetDoc.displayName || targetDoc.originalFileName);
      }
    });
  }, [selectedPatientId, patients, urlDocId]);

  // Handle source change
  const handleDocChange = (docId: string) => {
    setSelectedDocId(docId);
    const doc = patientDocs.find(d => d.documentId === docId);
    if (doc) {
      setSourceText(doc.extractedText?.slice(0, 1200) || '');
      setSourceTitle(doc.displayName || doc.originalFileName);
    }
  };

  const handleFindingChange = (findingId: string) => {
    setSelectedFindingId(findingId);
    const f = patientFindings.find(item => (item.id || item.findingId) === findingId);
    if (f) {
      const text = f.explanation || f.claim || f.text || '';
      setSourceText(text);
      setSourceTitle(f.title || f.category || 'Clinical Finding');
    }
  };

  const filteredLanguages = useMemo(() => {
    if (!searchLang) return languages;
    const q = searchLang.toLowerCase();
    return languages.filter(
      l => l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
    );
  }, [languages, searchLang]);

  const activeLangEntry = languages.find(l => l.code === targetLanguage) || {
    code: targetLanguage,
    name: targetLanguage.toUpperCase(),
    native: targetLanguage.toUpperCase(),
    region: 'Configured'
  };

  // ─── 1. Run Unified Translation & Explanation ───
  const runTranslateAndExplain = async (callerAction: 'translate' | 'explain' | 'combo', preferredView: 'en' | 'target') => {
    if (!sourceText.trim()) return;

    setLoading(true);
    setActionType(callerAction);
    handleStopSpeech();

    try {
      const res = await apiClient.post<ExplanationState>('/api/translate-and-explain', {
        text: sourceText,
        targetLanguage,
        findingTitle: sourceTitle || 'Doctor Visit Brief',
      });

      setExplanationResult(res);
      setTranslationResult(res.translatedSourceText || res.translatedExplanation || res.explainedSimply || null);
      setExplanationViewLang(preferredView);
      showToast(`Simplified explanation generated in English & ${activeLangEntry.name}.`, 'success');
    } catch (err: any) {
      // Fallback direct translation if combo endpoint had an issue
      try {
        const direct = await apiClient.post<{ translatedText: string }>('/api/translate', {
          text: sourceText,
          targetLanguage,
        });
        setTranslationResult(direct.translatedText);
        showToast('Document translation completed.', 'info');
      } catch (err2: any) {
        showToast(err.message || 'Operation failed.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = () => runTranslateAndExplain('translate', 'target');
  const handleExplain = () => runTranslateAndExplain('explain', 'en');
  const handleCombo = () => runTranslateAndExplain('combo', 'target');

  const getFullBriefSpeechText = (isTarget: boolean) => {
    if (!explanationResult) return '';
    if (isTarget) {
      const parts = [
        explanationResult.translatedExplanation || explanationResult.explainedSimply || '',
        explanationResult.translatedDoctorSummary ? `Doctor notes: ${explanationResult.translatedDoctorSummary}` : '',
        explanationResult.translatedMedicationsSummary ? `Medicines: ${explanationResult.translatedMedicationsSummary}` : '',
        explanationResult.translatedLabSummary ? `Lab reports: ${explanationResult.translatedLabSummary}` : '',
        explanationResult.translatedNextVisitSummary ? `Next visit plan: ${explanationResult.translatedNextVisitSummary}` : '',
        explanationResult.translatedQuestions && explanationResult.translatedQuestions.length > 0
          ? `Questions for your doctor: ${explanationResult.translatedQuestions.join('. ')}`
          : ''
      ];
      return parts.filter(Boolean).join('. ');
    }

    const parts = [
      explanationResult.explainedSimply || '',
      explanationResult.doctorSummary ? `Doctor notes: ${explanationResult.doctorSummary}` : '',
      explanationResult.medicationsSummary ? `Medicines: ${explanationResult.medicationsSummary}` : '',
      explanationResult.labSummary ? `Lab reports: ${explanationResult.labSummary}` : '',
      explanationResult.nextVisitSummary ? `Next visit plan: ${explanationResult.nextVisitSummary}` : '',
      explanationResult.questionsForDoctor && explanationResult.questionsForDoctor.length > 0
        ? `Questions for your doctor: ${explanationResult.questionsForDoctor.join('. ')}`
        : ''
    ];
    return parts.filter(Boolean).join('. ');
  };

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 box-border">
      {/* ─── Header ─── */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-teal/15 text-accent-teal-dark text-xs font-bold mb-3">
          <Languages className="w-4 h-4 text-accent-teal" />
          <span>CareCue Multilingual Hub</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          Translate & Explain Doctor Brief
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1.5 max-w-3xl">
          Get a comprehensive, plain-language breakdown of your <strong>Doctor Visit Brief</strong>, <strong>Prescribed Medicines</strong>, <strong>Lab Reports</strong>, and <strong>Next Visit Plan</strong> in Simplified English and {activeLangEntry.name} with authentic native voice playback.
        </p>
      </div>

      {/* ─── Main Control Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Selectors & Input (5 cols) */}
        <div className="lg:col-span-5 space-y-5 bg-bg-surface border border-border-default rounded-2xl p-5 sm:p-6 shadow-xs">
          {/* Patient Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Target Patient Profile
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <select
                value={selectedPatientId || ''}
                onChange={e => setSelectedPatientId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-semibold focus:outline-hidden focus:border-accent-teal"
              >
                {patients.length === 0 ? (
                  <option value="">No patients registered</option>
                ) : (
                  patients.map(p => (
                    <option key={p.patientId} value={p.patientId}>
                      {p.name} ({p.patientId}) {p.isDemo ? '— DEMO' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Source Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Source Content Type
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-bg-primary border border-border-subtle text-[11px] font-bold text-text-secondary text-center">
              <button
                type="button"
                onClick={() => {
                  setSourceType('brief');
                  const p = patients.find(x => x.patientId === selectedPatientId) || null;
                  const narrative = compileDoctorBriefNarrative(doctorBrief, p, patientDocs, patientFindings);
                  setSourceText(narrative);
                  setSourceTitle('Doctor Visit Brief');
                }}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${sourceType === 'brief' ? 'bg-bg-surface text-accent-teal-dark shadow-xs font-extrabold' : 'hover:text-text-primary'}`}
              >
                Doctor Brief
              </button>
              <button
                type="button"
                onClick={() => {
                  setSourceType('document');
                  if (patientDocs.length > 0) {
                    const d = patientDocs[0];
                    setSelectedDocId(d.documentId);
                    setSourceText(d.extractedText?.slice(0, 1200) || '');
                    setSourceTitle(d.displayName || d.originalFileName);
                  }
                }}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${sourceType === 'document' ? 'bg-bg-surface text-accent-teal-dark shadow-xs font-extrabold' : 'hover:text-text-primary'}`}
              >
                Document
              </button>
              <button
                type="button"
                onClick={() => setSourceType('finding')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${sourceType === 'finding' ? 'bg-bg-surface text-accent-teal-dark shadow-xs font-extrabold' : 'hover:text-text-primary'}`}
              >
                Finding
              </button>
              <button
                type="button"
                onClick={() => setSourceType('custom')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${sourceType === 'custom' ? 'bg-bg-surface text-accent-teal-dark shadow-xs font-extrabold' : 'hover:text-text-primary'}`}
              >
                Free Text
              </button>
            </div>
          </div>

          {/* Sub-selectors depending on Source Type */}
          {sourceType === 'document' && (
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Choose Uploaded Document
              </label>
              {patientDocs.length === 0 ? (
                <p className="text-xs text-text-muted italic">No documents uploaded for this patient.</p>
              ) : (
                <select
                  value={selectedDocId || ''}
                  onChange={e => handleDocChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-semibold focus:outline-hidden focus:border-accent-teal"
                >
                  {patientDocs.map(d => (
                    <option key={d.documentId} value={d.documentId}>
                      {d.displayName || d.originalFileName} ({d.documentType})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {sourceType === 'finding' && (
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Choose Specific Clinical Finding
              </label>
              {patientFindings.length === 0 ? (
                <p className="text-xs text-text-muted italic">No structured findings recorded yet.</p>
              ) : (
                <select
                  value={selectedFindingId || ''}
                  onChange={e => handleFindingChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-semibold focus:outline-hidden focus:border-accent-teal"
                >
                  {patientFindings.map((f, i) => (
                    <option key={f.id || i} value={f.id || i}>
                      {f.title || f.claim || f.text || `Finding #${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                {sourceType === 'brief' ? 'Doctor Visit Brief Details' : 'Original Medical Content'}
              </label>
              <button
                type="button"
                onClick={() => {
                  setSourceText('');
                  setExplanationResult(null);
                  setTranslationResult(null);
                }}
                className="text-[11px] text-text-muted hover:text-text-primary cursor-pointer"
              >
                Clear
              </button>
            </div>
            <textarea
              rows={6}
              value={sourceText}
              onChange={e => setSourceText(e.target.value)}
              placeholder="Paste or review clinical brief containing doctor advice, medications, lab findings, and next visit plans..."
              className="w-full p-3 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs font-medium focus:outline-hidden focus:border-accent-teal resize-y"
            />
          </div>

          {/* Searchable Language Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Target Regional Translation Language
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-primary border border-border-default hover:border-accent-teal/50 text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs"
              >
                <div>
                  <span className="text-xs font-bold text-text-primary mr-2">
                    {activeLangEntry.native}
                  </span>
                  <span className="text-xs text-text-secondary">
                    ({activeLangEntry.name})
                  </span>
                </div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
                  {activeLangEntry.region}
                </span>
              </button>

              {/* Dropdown Menu */}
              {isLangDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 p-2 bg-bg-surface border border-border-default rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in">
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      autoFocus
                      value={searchLang}
                      onChange={e => setSearchLang(e.target.value)}
                      placeholder="Search language (e.g. Hindi, Bengali, Tamil, Telugu)..."
                      className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-bg-primary border border-border-default text-xs text-text-primary focus:outline-hidden focus:border-accent-teal"
                    />
                  </div>
                  <div className="space-y-1">
                    {filteredLanguages.map(l => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setTargetLanguage(l.code);
                          setIsLangDropdownOpen(false);
                          setSearchLang('');
                          if (explanationResult) {
                            runTranslateAndExplain('translate', 'target');
                          }
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${targetLanguage === l.code ? 'bg-accent-teal text-text-inverse font-bold' : 'hover:bg-bg-primary text-text-primary'}`}
                      >
                        <span>{l.native} ({l.name})</span>
                        <span className={`text-[10px] ${targetLanguage === l.code ? 'text-text-inverse/80' : 'text-text-muted'}`}>
                          {l.region}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="pt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={loading || !sourceText.trim()}
              onClick={handleTranslate}
              className="py-2.5 px-2 rounded-xl border border-border-default hover:border-accent-teal/50 bg-bg-surface hover:bg-bg-secondary text-text-primary text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {loading && actionType === 'translate' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Languages className="w-3.5 h-3.5 text-accent-teal" />
              )}
              <span>Translate</span>
            </button>

            <button
              type="button"
              disabled={loading || !sourceText.trim()}
              onClick={handleExplain}
              className="py-2.5 px-2 rounded-xl border border-border-default hover:border-accent-teal/50 bg-bg-surface hover:bg-bg-secondary text-text-primary text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {loading && actionType === 'explain' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-accent-teal" />
              )}
              <span>Explain</span>
            </button>

            <button
              type="button"
              disabled={loading || !sourceText.trim()}
              onClick={handleCombo}
              className="py-2.5 px-2 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {loading && actionType === 'combo' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              <span>Both</span>
            </button>
          </div>
        </div>

        {/* Right Column: Dynamic Gemini Results (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Default Empty State */}
          {!translationResult && !explanationResult && !loading && (
            <div className="p-8 sm:p-12 text-center rounded-2xl bg-bg-surface border border-border-default">
              <div className="w-12 h-12 rounded-2xl bg-accent-teal/15 text-accent-teal flex items-center justify-center mx-auto mb-3">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                Explain & Translate Doctor Brief
              </h3>
              <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
                Click <strong>Translate</strong>, <strong>Explain</strong>, or <strong>Both</strong> to get a simple, multi-section explanation of doctor recommendations, medications, lab tests, and next visits in English and {activeLangEntry.name}.
              </p>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="p-10 rounded-2xl bg-bg-surface border border-border-default text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-accent-teal animate-spin mx-auto" />
              <p className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Synthesizing Plain-Language Brief & Explanations...
              </p>
              <p className="text-xs text-text-secondary">
                Structuring doctor notes, medicines, lab reports, and next visit instructions in Simplified English & {activeLangEntry.name}.
              </p>
            </div>
          )}

          {/* ─── 1. Simplified Comprehensive Doctor Brief Explanation Card ─── */}
          {explanationResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-surface border border-border-default rounded-2xl p-5 sm:p-6 shadow-xs space-y-5"
            >
              {/* Card Header with View Language Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-accent-teal/15 text-accent-teal flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent-teal-dark">
                      SIMPLIFIED DOCTOR BRIEF & CARE PLAN
                    </span>
                    <h3 className="text-sm font-bold text-text-primary">
                      {sourceTitle || 'Doctor Visit Summary'}
                    </h3>
                  </div>
                </div>

                {/* Switcher: English vs Target Language */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-bg-primary border border-border-subtle text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setExplanationViewLang('en')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      explanationViewLang === 'en'
                        ? 'bg-bg-surface text-accent-teal-dark shadow-2xs font-extrabold border border-accent-teal/20'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    English (Simplified)
                  </button>
                  {targetLanguage !== 'en' && (
                    <button
                      type="button"
                      onClick={() => setExplanationViewLang('target')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        explanationViewLang === 'target'
                          ? 'bg-bg-surface text-accent-teal-dark shadow-2xs font-extrabold border border-accent-teal/20'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <span>{activeLangEntry.native} ({activeLangEntry.name})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Overall Simplified Summary */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-accent-teal-dark">
                    {explanationViewLang === 'en'
                      ? '🌟 Overall Simplified Healthcare Summary'
                      : `🌟 ${activeLangEntry.name} Simplified Summary (${activeLangEntry.native})`}
                  </span>
                  <span className="text-[10px] font-bold text-text-muted uppercase">
                    {explanationViewLang === 'en' ? 'Plain Language' : activeLangEntry.name}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-primary p-3.5 rounded-xl bg-accent-teal/5 border border-accent-teal/20 leading-relaxed font-medium">
                  {explanationViewLang === 'target' && explanationResult.translatedExplanation
                    ? explanationResult.translatedExplanation
                    : (explanationResult.explainedSimply || 'Comprehensive doctor brief synthesized.')}
                </p>
              </div>

              {/* 2. Structured Section Grid: Doctor, Medicines, Labs, Next Visit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 🩺 Doctor & Consultation */}
                <div className="p-3.5 rounded-xl bg-bg-primary border border-border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                      <Stethoscope className="w-3.5 h-3.5 text-accent-teal" />
                      <span>Doctor & Consultation</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const txt = explanationViewLang === 'target'
                          ? (explanationResult.translatedDoctorSummary || explanationResult.doctorSummary || '')
                          : (explanationResult.doctorSummary || '');
                        handleSpeakText(txt, explanationViewLang === 'target' ? targetLanguage : 'en', 'sec-doc');
                      }}
                      className="p-1 rounded-md hover:bg-bg-surface text-text-muted hover:text-accent-teal transition-colors cursor-pointer"
                      title="Listen to Doctor Consultation Summary"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {explanationViewLang === 'target' && explanationResult.translatedDoctorSummary
                      ? explanationResult.translatedDoctorSummary
                      : (explanationResult.doctorSummary || 'Physician consultation recorded for health checkup.')}
                  </p>
                </div>

                {/* 💊 Prescribed Medicines */}
                <div className="p-3.5 rounded-xl bg-bg-primary border border-border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                      <Pill className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Prescribed Medicines</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const txt = explanationViewLang === 'target'
                          ? (explanationResult.translatedMedicationsSummary || explanationResult.medicationsSummary || '')
                          : (explanationResult.medicationsSummary || '');
                        handleSpeakText(txt, explanationViewLang === 'target' ? targetLanguage : 'en', 'sec-meds');
                      }}
                      className="p-1 rounded-md hover:bg-bg-surface text-text-muted hover:text-accent-teal transition-colors cursor-pointer"
                      title="Listen to Prescribed Medicines Summary"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {explanationViewLang === 'target' && explanationResult.translatedMedicationsSummary
                      ? explanationResult.translatedMedicationsSummary
                      : (explanationResult.medicationsSummary || 'Take all prescribed medicines according to dosage and timing instructions.')}
                  </p>
                </div>

                {/* 🧪 Laboratory Reports & Tests */}
                <div className="p-3.5 rounded-xl bg-bg-primary border border-border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                      <FlaskConical className="w-3.5 h-3.5 text-amber-500" />
                      <span>Lab Reports & Test Results</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const txt = explanationViewLang === 'target'
                          ? (explanationResult.translatedLabSummary || explanationResult.labSummary || '')
                          : (explanationResult.labSummary || '');
                        handleSpeakText(txt, explanationViewLang === 'target' ? targetLanguage : 'en', 'sec-labs');
                      }}
                      className="p-1 rounded-md hover:bg-bg-surface text-text-muted hover:text-accent-teal transition-colors cursor-pointer"
                      title="Listen to Lab Reports Summary"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {explanationViewLang === 'target' && explanationResult.translatedLabSummary
                      ? explanationResult.translatedLabSummary
                      : (explanationResult.labSummary || 'Laboratory observations documented for clinical tracking.')}
                  </p>
                </div>

                {/* 📅 Next Visit & Action Plan */}
                <div className="p-3.5 rounded-xl bg-bg-primary border border-border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>Next Visit & Action Plan</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const txt = explanationViewLang === 'target'
                          ? (explanationResult.translatedNextVisitSummary || explanationResult.nextVisitSummary || '')
                          : (explanationResult.nextVisitSummary || '');
                        handleSpeakText(txt, explanationViewLang === 'target' ? targetLanguage : 'en', 'sec-visit');
                      }}
                      className="p-1 rounded-md hover:bg-bg-surface text-text-muted hover:text-accent-teal transition-colors cursor-pointer"
                      title="Listen to Next Visit Instructions"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {explanationViewLang === 'target' && explanationResult.translatedNextVisitSummary
                      ? explanationResult.translatedNextVisitSummary
                      : (explanationResult.nextVisitSummary || 'Schedule your follow-up visit and bring recent test reports.')}
                  </p>
                </div>
              </div>

              {/* 3. Questions to Discuss with Doctor */}
              {((explanationResult.questionsForDoctor && explanationResult.questionsForDoctor.length > 0) ||
                (explanationResult.translatedQuestions && explanationResult.translatedQuestions.length > 0)) && (
                <div className="p-3.5 rounded-xl bg-accent-teal/5 border border-accent-teal/20 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent-teal-dark">
                    {explanationViewLang === 'en'
                      ? 'Questions to Discuss with Your Doctor'
                      : `Questions for Your Doctor (${activeLangEntry.name})`}
                  </span>
                  <ul className="space-y-1.5 pl-1">
                    {(explanationViewLang === 'target' && explanationResult.translatedQuestions && explanationResult.translatedQuestions.length > 0
                      ? explanationResult.translatedQuestions
                      : (explanationResult.questionsForDoctor || [])
                    ).map((q, idx) => (
                      <li key={idx} className="text-xs text-text-primary flex items-start gap-2">
                        <span className="text-accent-teal font-bold shrink-0">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 4. Dedicated Multi-Language Listen Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-subtle">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Listen in current view language */}
                  {explanationViewLang === 'en' ? (
                    <button
                      type="button"
                      onClick={() => handleSpeakText(getFullBriefSpeechText(false), 'en', 'brief-full-en')}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                        isPlaying && currentlySpeaking === 'brief-full-en'
                          ? 'bg-status-safety text-white hover:bg-status-safety/90'
                          : 'bg-accent-teal hover:bg-accent-teal-dark text-text-inverse'
                      }`}
                    >
                      {isPlaying && currentlySpeaking === 'brief-full-en' ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Speaking</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen to Full Brief in English</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSpeakText(getFullBriefSpeechText(true), targetLanguage, 'brief-full-target')}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                        isPlaying && currentlySpeaking === 'brief-full-target'
                          ? 'bg-status-safety text-white hover:bg-status-safety/90'
                          : 'bg-accent-teal hover:bg-accent-teal-dark text-text-inverse'
                      }`}
                    >
                      {isPlaying && currentlySpeaking === 'brief-full-target' ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Speaking</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen to Full Brief in {activeLangEntry.name} ({activeLangEntry.native})</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Switch and Listen Button */}
                  {targetLanguage !== 'en' && explanationViewLang === 'en' && explanationResult.translatedExplanation && (
                    <button
                      type="button"
                      onClick={() => {
                        setExplanationViewLang('target');
                        handleSpeakText(getFullBriefSpeechText(true), targetLanguage, 'brief-full-target');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-default hover:border-accent-teal/50 bg-bg-surface text-text-primary text-xs font-semibold cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-accent-teal" />
                      <span>Listen in {activeLangEntry.name}</span>
                    </button>
                  )}

                  {targetLanguage !== 'en' && explanationViewLang === 'target' && (
                    <button
                      type="button"
                      onClick={() => {
                        setExplanationViewLang('en');
                        handleSpeakText(getFullBriefSpeechText(false), 'en', 'brief-full-en');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-default hover:border-accent-teal/50 bg-bg-surface text-text-primary text-xs font-semibold cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-accent-teal" />
                      <span>Listen in English</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-text-muted flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent-teal" />
                  <span>Educational comprehension</span>
                </div>
              </div>

              {/* Medical Guardrail Disclaimer */}
              <div className="p-3 rounded-xl bg-bg-secondary/70 border border-border-subtle text-[11px] text-text-muted flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-accent-teal mt-0.5" />
                <span>
                  {explanationResult.disclaimer || 'This explanation organizes your documented clinical records for your consultation. It is educational and not medical advice.'}
                </span>
              </div>
            </motion.div>
          )}

          {/* ─── 2. Full Verbatim Translation Card ─── */}
          {translationResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-surface border border-border-default rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    <Check className="w-3 h-3 stroke-[3]" /> VERBATIM TRANSLATION
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-teal-dark bg-accent-teal/10 px-2.5 py-0.5 rounded-full border border-accent-teal/20">
                    {activeLangEntry.name} ({activeLangEntry.native})
                  </span>
                </div>

                <span className="text-xs font-semibold text-text-muted">
                  Strict Token & Unit Preservation
                </span>
              </div>

              {/* Document Translation Text */}
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    Original Source Text
                  </span>
                  <p className="text-xs text-text-secondary mt-1 p-3 rounded-xl bg-bg-primary border border-border-subtle max-h-40 overflow-y-auto">
                    {sourceText}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent-teal-dark">
                    Translated Content ({activeLangEntry.name})
                  </span>
                  <p className="text-sm font-semibold text-text-primary mt-1 p-3.5 rounded-xl bg-accent-teal/5 border border-accent-teal/30 leading-relaxed max-h-60 overflow-y-auto">
                    {translationResult}
                  </p>
                </div>
              </div>

              {/* Audio Controls for Translation */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSpeakText(translationResult, targetLanguage, 'trans-doc')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      isPlaying && currentlySpeaking === 'trans-doc'
                        ? 'bg-status-safety text-white hover:bg-status-safety/90'
                        : 'bg-accent-teal hover:bg-accent-teal-dark text-text-inverse'
                    }`}
                  >
                    {isPlaying && currentlySpeaking === 'trans-doc' ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Speaking</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen to Translated Text ({activeLangEntry.name})</span>
                      </>
                    )}
                  </button>
                </div>

                <span className="text-[11px] text-text-muted">
                  High-fidelity regional pronunciation
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
