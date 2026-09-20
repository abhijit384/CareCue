import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  FileText,
  Lock,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  Database,
  RefreshCw,
  Cpu,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_PRIVACY_RESULT } from '@/services/mockData';

interface DemoDocument {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  minimizedFields: number;
  status: 'minimized' | 'temporary';
}

export function PrivacyCenter() {
  const [sessionType, setSessionType] = useState<'temporary' | 'saved'>('temporary');
  const [documents, setDocuments] = useState<DemoDocument[]>([
    {
      id: 'doc-001',
      name: 'Sample_Blood_Panel.pdf',
      size: '142 KB',
      uploadedAt: 'Today, 10:30 AM',
      minimizedFields: 5,
      status: 'minimized',
    },
    {
      id: 'doc-002',
      name: 'Lipid_Panel_Reference.pdf',
      size: '98 KB',
      uploadedAt: 'Yesterday, 3:15 PM',
      minimizedFields: 3,
      status: 'minimized',
    },
  ]);

  const [showDataInspection, setShowDataInspection] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteDocument = (id: string, name: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    triggerToast(`Document "${name}" and its minimized tokens have been removed.`);
  };

  const handleClearSession = () => {
    setDocuments([]);
    triggerToast('All local session artifacts and tokenized buffers have been cleared.');
  };

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
      {/* Toast feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-text-primary text-text-inverse text-xs font-medium shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 text-accent-teal" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-teal-light text-accent-teal-dark text-xs font-semibold mb-2.5">
          <Shield className="w-3.5 h-3.5" />
          Privacy & Data Transparency
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          Privacy Center
        </h1>
        <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
          CareCue is engineered around PII minimization and user-controlled data handling.
          Review how information flows through this prototype and manage stored records below.
        </p>
      </div>

      <div className="space-y-8">
        {/* ─── SECTION 1: YOUR SESSION ─── */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-subtle">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                Current Session Status
              </span>
              <div className="flex items-center gap-2.5 mt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-status-consistent animate-pulse" />
                <h2 className="text-lg font-bold text-text-primary">
                  {sessionType === 'temporary' ? 'Temporary Sandbox Session' : 'Saved Local Session'}
                </h2>
              </div>
            </div>

            <div className="flex items-center bg-bg-secondary p-1 rounded-xl border border-border-subtle">
              <button
                onClick={() => {
                  setSessionType('temporary');
                  triggerToast('Session switched to temporary sandbox mode.');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  sessionType === 'temporary'
                    ? 'bg-bg-surface text-accent-teal-dark shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                Temporary
              </button>
              <button
                onClick={() => {
                  setSessionType('saved');
                  triggerToast('Session switched to locally saved mode.');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  sessionType === 'saved'
                    ? 'bg-bg-surface text-accent-teal-dark shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                Saved Local
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
            <div className="p-3.5 rounded-xl bg-bg-secondary/60 border border-border-subtle">
              <span className="text-xs text-text-tertiary">Session ID</span>
              <p className="text-xs font-mono font-semibold text-text-primary mt-0.5">cc-temp-7049-x2</p>
            </div>
            <div className="p-3.5 rounded-xl bg-bg-secondary/60 border border-border-subtle">
              <span className="text-xs text-text-tertiary">Storage Location</span>
              <p className="text-xs font-medium text-text-primary mt-0.5">Local Browser Storage</p>
            </div>
            <div className="p-3.5 rounded-xl bg-bg-secondary/60 border border-border-subtle">
              <span className="text-xs text-text-tertiary">Data Retention</span>
              <p className="text-xs font-medium text-text-primary mt-0.5">
                {sessionType === 'temporary' ? 'Discarded on tab close' : 'Retained locally until cleared'}
              </p>
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: DATA USED ─── */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                Data Processing Breakdown
              </span>
              <h2 className="text-lg font-bold text-text-primary mt-0.5">
                What information does CareCue use?
              </h2>
            </div>
            <button
              onClick={() => setShowDataInspection(!showDataInspection)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-teal hover:text-accent-teal-dark transition-colors cursor-pointer"
            >
              {showDataInspection ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showDataInspection ? 'Hide Token Mapping' : 'Inspect Token Mapping'}
            </button>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed mb-5">
            CareCue extracts only the clinical findings and reference ranges required for educational
            explanation and dual-AI consistency checks. Direct personal identifiers are detected by the
            Privacy Gateway and minimized before AI verification.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-status-consistent/20 bg-status-consistent-bg/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-status-consistent shrink-0" />
                <h3 className="text-sm font-semibold text-text-primary">Processed for Understanding</h3>
              </div>
              <ul className="text-xs text-text-secondary space-y-1.5 pl-6 list-disc">
                <li>Lab test names (e.g. Hemoglobin, Total Cholesterol)</li>
                <li>Quantitative numerical values and clinical measurement units</li>
                <li>Published laboratory reference ranges</li>
                <li>Clinical section headings and report context</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-border-subtle bg-bg-secondary/40">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-accent-teal shrink-0" />
                <h3 className="text-sm font-semibold text-text-primary">Minimized Identifiers</h3>
              </div>
              <ul className="text-xs text-text-secondary space-y-1.5 pl-6 list-disc">
                <li>Full names replaced with cryptographic tags: <code className="text-accent-teal font-mono">[PERSON]</code></li>
                <li>Birth dates replaced with date tokens: <code className="text-accent-teal font-mono">[DATE]</code></li>
                <li>Medical record numbers replaced with: <code className="text-accent-teal font-mono">[ID]</code></li>
                <li>Phone numbers and physical addresses suppressed</li>
              </ul>
            </div>
          </div>

          {/* Token Inspection Drawer */}
          <AnimatePresence>
            {showDataInspection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-5 pt-5 border-t border-border-subtle overflow-hidden"
              >
                <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider block mb-3">
                  Live Gateway Redaction Table ({MOCK_PRIVACY_RESULT.fields.length} tokens active)
                </span>
                <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-secondary/70">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border-subtle text-text-tertiary">
                        <th className="py-2.5 px-4 font-semibold">Entity Type</th>
                        <th className="py-2.5 px-4 font-semibold">Original In Document</th>
                        <th className="py-2.5 px-4 font-semibold">Minimized Token Passed to AI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {MOCK_PRIVACY_RESULT.fields.map((f, i) => (
                        <tr key={i} className="text-text-secondary">
                          <td className="py-2.5 px-4 font-medium text-text-primary">{f.type}</td>
                          <td className="py-2.5 px-4 font-mono text-text-tertiary line-through">{f.original}</td>
                          <td className="py-2.5 px-4 font-mono font-semibold text-accent-teal-dark">{f.minimized}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── SECTION 3: STORED DOCUMENTS ─── */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                Local Workspace
              </span>
              <h2 className="text-lg font-bold text-text-primary mt-0.5">
                Stored Prototype Documents ({documents.length})
              </h2>
            </div>
            {documents.length > 0 && (
              <button
                onClick={handleClearSession}
                className="text-xs font-semibold text-status-review hover:underline transition-colors cursor-pointer"
              >
                Clear All Documents
              </button>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border-default bg-bg-secondary/30">
              <Database className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
              <p className="text-sm font-semibold text-text-primary">No stored documents</p>
              <p className="text-xs text-text-secondary mt-1">All prototype document caches are currently empty.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-bg-secondary/40 border border-border-subtle hover:border-accent-teal/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-accent-teal-light text-accent-teal-dark flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{doc.name}</p>
                      <p className="text-xs text-text-tertiary">
                        {doc.size} · Uploaded {doc.uploadedAt} ·{' '}
                        <span className="text-accent-teal-dark font-medium">
                          {doc.minimizedFields} PII tokens replaced
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.name)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-status-review hover:bg-status-review-bg/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Document
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── SECTION 4: CONTROLS ─── */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-6 sm:p-7 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
            Data Lifecycle & Deletion
          </span>
          <h2 className="text-lg font-bold text-text-primary mt-0.5 mb-2">
            Patient Vault Controls
          </h2>
          <p className="text-sm text-text-secondary mb-6 leading-relaxed">
            You maintain full sovereignty over your patient sessions and stored medical records. Trigger instantaneous
            purging of temporary memory, documents, and cached representations.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleClearSession}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-status-review text-text-inverse text-xs font-semibold hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete Current Session & Clear Tokens
            </button>
            <button
              onClick={() => {
                setDocuments([]);
                triggerToast('Local cache and workspace reset.');
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border-default text-text-primary hover:bg-bg-secondary text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-text-secondary" />
              Clear Workspace Cache
            </button>
          </div>
        </div>

        {/* ─── SECTION 5: SECURITY APPROACH ─── */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-6 sm:p-7 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
            Architectural Guarantees
          </span>
          <h2 className="text-lg font-bold text-text-primary mt-0.5 mb-4">
            Security & Privacy Standards
          </h2>

          <div className="space-y-4 text-xs sm:text-sm text-text-secondary leading-relaxed">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-accent-teal-light text-accent-teal-dark flex items-center justify-center shrink-0 mt-0.5">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong className="text-text-primary block font-semibold">PII Minimization Gateway</strong>
                Uploaded documents are scanned locally for identifiable attributes (names, patient IDs, addresses, phones) and replaced with deterministic entity placeholders prior to interpretation.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-ai-lavender-light text-ai-lavender-dark flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong className="text-text-primary block font-semibold">Secure Processing Design</strong>
                Processing pipelines isolate document text extraction from persistent user accounts. AI prompts strictly forbid model training on submitted user data.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-bg-secondary text-text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong className="text-text-primary block font-semibold">User-Controlled Session Deletion</strong>
                Sessions and derived briefs exist at the pleasure of the user. Deleting a session purges records from local memory immediately.
              </div>
            </div>
          </div>

          {/* Compliance notice */}
          <div className="mt-6 p-4 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-text-tertiary leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-text-secondary mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-text-tertiary" />
              CareCue Medical Information Notice
            </div>
            CareCue operates as a patient empowerment and educational comprehension platform. It strictly isolates clinical documents to your account and preserves verbatim health records without diagnosing or altering medical plans. Always consult your qualified healthcare professional for medical diagnosis, treatment, and clinical decisions.
          </div>
        </div>
      </div>
    </div>
  );
}
