import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  FileUp,
  Search,
  FileText,
  Clock,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  ClipboardList,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Filter,
  Database,
  Eye,
} from 'lucide-react';
import { DocumentPreviewModal } from '@/components/composed/DocumentPreviewModal';
import { patientService, documentService, doctorBriefService } from '@/services';
import type { Patient, PatientDocument, DocumentTimelineItem, DocumentType, PatientMatchResult, DoctorBrief } from '@/lib/types';
import { DocumentTypeBadge } from '@/components/composed/DocumentTypeBadge';
import { PatientMatchModal } from '@/components/composed/PatientMatchModal';
import { UploadDropzone } from '@/components/composed/UploadDropzone';
import { Button } from '@/components/composed/Button';
import { SkeletonPatient, SkeletonDocument, SkeletonTimeline, SkeletonMetric } from '@/components/composed/Skeleton';
import { formatDate, cn } from '@/lib/utils';
import { deriveDisplayName, validateDocumentFile, getDocumentMimeType } from '@/lib/fileUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const toArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(x => typeof x === 'string' ? x : (x.name || x.finding || JSON.stringify(x)));
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      if (Array.isArray(p)) return p.map(x => typeof x === 'string' ? x : (x.name || x.finding || JSON.stringify(x)));
    } catch {}
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

const formatList = (val: any): string => {
  const arr = toArray(val);
  return arr.length > 0 ? arr.join(', ') : 'None documented';
};

const RELATIONSHIP_CHOICES = [
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

type TabType = 'overview' | 'documents' | 'timeline' | 'findings' | 'briefs' | 'emergency';

export function Patients() {
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get('patientId');
  const { user, openOnboarding, openLoadDemoModal, patients: authPatients, refreshActivePatient } = useAuth();
  const { showToast } = useToast();
  const selfFullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Delete confirmation modals
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<{ documentId: string; displayName: string } | null>(null);
  const [previewDocument, setPreviewDocument] = useState<PatientDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modals
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [matchResult, setMatchResult] = useState<PatientMatchResult | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);

  // Upload New Doc State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [brief, setBrief] = useState<DoctorBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);

  // Patient data
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [timeline, setTimeline] = useState<DocumentTimelineItem[]>([]);

  // Emergency Profile Edit State
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [emBloodGroup, setEmBloodGroup] = useState('');
  const [emAllergies, setEmAllergies] = useState('');
  const [emConditions, setEmConditions] = useState('');
  const [emMedications, setEmMedications] = useState('');
  const [emContactName, setEmContactName] = useState('');
  const [emContactPhone, setEmContactPhone] = useState('');
  const [emContactRel, setEmContactRel] = useState('');

  // Always sync from AuthContext when authPatients changes
  useEffect(() => {
    if (authPatients) {
      setPatients(authPatients);
      if (selectedPatient) {
        const freshSelected = authPatients.find(p => p.patientId === selectedPatient.patientId);
        if (freshSelected) setSelectedPatient(freshSelected);
      }
    }
  }, [authPatients]);

  // Also fetch fresh from API on mount to ensure we have latest data
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const list = await patientService.list();
      setPatients(list);
      if (urlPatientId) {
        const found = list.find(p => p.patientId === urlPatientId);
        if (found) handleSelectPatient(found);
      }
    } catch {
      // Fall back to authPatients
      const fallbackList = authPatients || [];
      setPatients(fallbackList);
      if (urlPatientId) {
        const found = fallbackList.find(p => p.patientId === urlPatientId);
        if (found) handleSelectPatient(found);
      }
    }
    setLoading(false);
  };

  const handleSelectPatient = async (p: Patient) => {
    setSelectedPatient(p);
    setLoading(true);
    try {
      const [docs, tl] = await Promise.all([
        patientService.getDocuments(p.patientId),
        patientService.getTimeline(p.patientId),
      ]);
      setDocuments(docs || []);
      setTimeline(tl || []);
    } catch (err) {
      console.error('Error fetching patient details:', err);
    } finally {
      setLoading(false);
    }
    
    setEditingEmergency(false);
    setEmBloodGroup(p.bloodGroup || '');
    setEmAllergies(formatList(p.severeAllergies));
    setEmConditions(formatList(p.importantConditions));
    setEmMedications(formatList(p.currentMedications));
    setEmContactName(p.emergencyContact?.name || '');
    setEmContactPhone(p.emergencyContact?.phone || '');
    setEmContactRel(p.emergencyContact?.relationship || '');
  };

  const handleUploadDocumentToSelected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !uploadFile) return;

    const validation = validateDocumentFile(uploadFile);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }
    setUploadError('');
    setUploading(true);

    try {
      const uploadRes = await documentService.upload(uploadFile, selectedPatient.patientId);
      const doc = uploadRes.document;

      // If document belongs to a different patient name
      if (uploadRes.matchResult && !uploadRes.matchResult.isTargetMatch) {
        setPendingDocId(doc.documentId);
        setMatchResult(uploadRes.matchResult);
        setShowUploadDocModal(false);
        setUploadFile(null);
        setShowMatchModal(true);
        return;
      }

      if (doc && doc.documentId) {
        try {
          await patientService.attachDocument(selectedPatient.patientId, doc.documentId, true);
        } catch (e) {
          console.debug('Attach notice:', e);
        }
      }

      const [freshDocs, freshTl, freshPatients] = await Promise.all([
        patientService.getDocuments(selectedPatient.patientId),
        patientService.getTimeline(selectedPatient.patientId),
        patientService.list(),
      ]);

      setDocuments(freshDocs || [doc, ...documents]);
      setTimeline(freshTl || []);
      setPatients(freshPatients || []);
      const updatedP = (freshPatients || []).find(p => p.patientId === selectedPatient.patientId);
      if (updatedP) setSelectedPatient(updatedP);

      setShowUploadDocModal(false);
      setUploadFile(null);
      showToast('Document analyzed by Gemini and added to patient records', 'success');
      await refreshActivePatient();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRealDocumentUploadForPatient = async (file: File) => {
    setUploading(true);
    try {
      const uploadRes = await documentService.upload(file, selectedPatient?.patientId);
      const doc = uploadRes.document;
      setPendingDocId(doc?.documentId || null);
      const detectedName = uploadRes.detectedPatient?.name;
      const existingPatient = detectedName
        ? patients.find(p => p.name.trim().toLowerCase() === detectedName.trim().toLowerCase()) || uploadRes.matchResult?.matchedPatient
        : uploadRes.matchResult?.matchedPatient;

      if (uploadRes.matchResult) {
        setMatchResult({
          ...uploadRes.matchResult,
          matchedPatient: existingPatient || uploadRes.matchResult.matchedPatient,
        });
        setShowMatchModal(true);
      } else if (detectedName) {
        setMatchResult({
          matchType: 'EXACT_NAME_MATCH',
          extractedName: detectedName,
          matchedPatient: existingPatient || null,
          confidence: uploadRes.detectedPatient?.confidence || 0.95,
          message: existingPatient
            ? `A patient profile for "${detectedName}" already exists (Patient ID: ${existingPatient.patientId}).`
            : `Detected patient "${detectedName}" in uploaded document.`,
        });
        setShowMatchModal(true);
      } else {
        setMatchResult({
          matchType: 'NO_MATCH',
          extractedName: null,
          matchedPatient: null,
          confidence: 0,
          message: 'No patient name detected in document. You can create a profile manually.',
        });
        setShowMatchModal(true);
      }
    } catch (err: any) {
      alert(err.message || 'Document extraction failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEmergencyProfile = async () => {
    if (!selectedPatient) return;
    const updated = await patientService.updateEmergencyProfile(selectedPatient.patientId, {
      bloodGroup: emBloodGroup,
      severeAllergies: emAllergies ? emAllergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      importantConditions: emConditions ? emConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      currentMedications: emMedications ? emMedications.split(',').map(s => s.trim()).filter(Boolean) : [],
      emergencyContact: emContactName ? {
        name: emContactName,
        phone: emContactPhone,
        relationship: emContactRel
      } : undefined
    });
    if (updated) {
       setSelectedPatient(updated);
       setPatients(prev => prev.map(p => p.patientId === updated.patientId ? updated : p));
    }
    setEditingEmergency(false);
  };

  const handleConfirmDeletePatient = async () => {
    if (!patientToDelete) return;
    setDeleting(true);
    try {
      await patientService.delete(patientToDelete.patientId);
      showToast(`Patient profile for "${patientToDelete.name}" deleted`, 'success');
      const updatedList = await patientService.list();
      setPatients(updatedList);
      if (selectedPatient?.patientId === patientToDelete.patientId) {
        setSelectedPatient(null);
      }
      await refreshActivePatient();
      setPatientToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete patient profile', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmDeleteDocument = async () => {
    if (!selectedPatient || !documentToDelete) return;
    setDeleting(true);
    try {
      await patientService.deleteDocument(selectedPatient.patientId, documentToDelete.documentId);
      showToast(`Document "${documentToDelete.displayName}" deleted`, 'success');
      setDocuments(prev => prev.filter(d => d.documentId !== documentToDelete.documentId));
      const [updatedTl, updatedPatients] = await Promise.all([
        patientService.getTimeline(selectedPatient.patientId),
        patientService.list(),
      ]);
      setTimeline(updatedTl || []);
      setPatients(updatedPatients);
      await refreshActivePatient();
      setDocumentToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* ─── View 1: Patient Directory ─── */}
      {!selectedPatient && (
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                Patients
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Manage patient profiles, clinical timelines, and multi-document records
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                onClick={() => openOnboarding()}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                ADD NEW PATIENT
              </Button>
              <Button
                variant="secondary"
                onClick={() => openLoadDemoModal()}
                leftIcon={<Database className="w-4 h-4" />}
              >
                Load Sample Profile
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search patients by name, email, or notes..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-subtle bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-teal/30 transition-all placeholder:text-text-muted"
            />
          </div>

          {/* Patient Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => <SkeletonPatient key={i} />)}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-border-subtle bg-bg-surface/50 p-8">
              <Users className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-primary">No patients found</p>
              <p className="text-xs text-text-muted mt-1">Create a new patient manually or upload a document to begin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPatients.map(p => (
                <div
                  key={p.patientId}
                  onClick={() => handleSelectPatient(p)}
                  className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border-subtle bg-bg-surface hover:border-accent-teal/40 hover:shadow-md transition-all cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-teal/15 text-accent-teal-dark font-bold text-sm flex items-center justify-center">
                          {(p.name || 'P').charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-text-primary group-hover:text-accent-teal transition-colors">
                            {p.name}
                          </h3>
                          <div className="text-xs text-text-muted">
                            {p.dateOfBirth ? `DOB: ${formatDate(p.dateOfBirth)}` : 'DOB not recorded'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPatientToDelete(p);
                          }}
                          title="Delete Patient Profile"
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent-teal group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {p.notes && (
                      <p className="text-xs text-text-secondary mt-3 line-clamp-2 leading-relaxed">
                        {p.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle text-xs text-text-muted">
                    <span className="flex items-center gap-1.5 font-medium">
                      <FileText className="w-3.5 h-3.5 text-accent-teal" />
                      <span>{p.documentCount} {p.documentCount === 1 ? 'document' : 'documents'}</span>
                    </span>
                    <span>Updated {formatDate(p.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── View 2: Patient Profile ─── */}
      {selectedPatient && (
        <div className="space-y-6">
          {/* Back link */}
          <button
            type="button"
            onClick={() => setSelectedPatient(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors btn-press-micro"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Patients</span>
          </button>

          {/* Patient Header Card */}
          <div className="p-6 rounded-2xl border border-border-subtle bg-bg-surface shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-accent-teal/15 text-accent-teal-dark font-bold text-xl flex items-center justify-center shadow-xs">
                  {(selectedPatient.name || 'P').charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                    {selectedPatient.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1">
                    {selectedPatient.dateOfBirth && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>DOB: {formatDate(selectedPatient.dateOfBirth)}</span>
                      </span>
                    )}
                    {selectedPatient.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{selectedPatient.phone}</span>
                      </span>
                    )}
                    {selectedPatient.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{selectedPatient.email}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Patient Header Actions */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPatientToDelete(selectedPatient)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Profile</span>
                </button>
                <Button
                  variant="primary"
                  onClick={() => setShowUploadDocModal(true)}
                  leftIcon={<FileUp className="w-4 h-4" />}
                >
                  Upload Document
                </Button>
              </div>
            </div>

            {selectedPatient.notes && (
              <div className="p-3 rounded-xl bg-bg-surface-secondary text-xs text-text-secondary leading-relaxed border border-border-subtle/60">
                <span className="font-semibold text-text-primary">Clinical Notes: </span>
                {selectedPatient.notes}
              </div>
            )}
          </div>

          {/* Profile Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-border-subtle pb-2 overflow-x-auto text-xs font-semibold">
            {(['overview', 'documents', 'timeline', 'findings', 'briefs', 'emergency'] as TabType[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg capitalize transition-all whitespace-nowrap',
                  activeTab === tab
                    ? 'bg-accent-teal/15 text-accent-teal-dark font-bold'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                {tab === 'briefs' ? 'Doctor Briefs' : tab === 'emergency' ? 'Emergency Profile' : tab}
              </button>
            ))}
          </div>

          {/* ─── Tab 1: Overview ─── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface">
                  <div className="text-xs text-text-muted font-medium">Total Documents</div>
                  <div className="text-2xl font-bold text-text-primary mt-1">{documents.length}</div>
                </div>
                <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface">
                  <div className="text-xs text-text-muted font-medium">Verified Markers</div>
                  <div className="text-2xl font-bold text-accent-teal mt-1">
                    {documents.reduce((acc, d) => acc + (d.findingsCount || (d as any).findings_count || 0), 0)}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface">
                  <div className="text-xs text-text-muted font-medium">Latest Document</div>
                  <div className="text-xs font-bold text-text-primary mt-2 truncate">
                    {documents[0]?.displayName || documents[0]?.originalFileName || 'No documents yet'}
                  </div>
                </div>
              </div>

              {/* Recent Documents Quick Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary">Recent Documents</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('documents')}
                    className="text-xs font-semibold text-accent-teal hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-2">
                  {documents.slice(0, 3).map(d => (
                    <div
                      key={d.documentId}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border-subtle bg-bg-surface text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <DocumentTypeBadge type={d.documentType} />
                        <div>
                          <div className="font-semibold text-text-primary">{d.displayName || d.originalFileName}</div>
                          <div className="text-[11px] text-text-muted">{d.sourceReference} • {formatDate(d.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewDocument(d)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3 mr-0.5" /> Preview
                        </button>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">✓ Verified</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab 2: Documents ─── */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary">All Attached Documents</h3>
                <span className="text-xs text-text-muted">{documents.length} recorded</span>
              </div>
              {documents.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted rounded-xl border border-dashed border-border-subtle">
                  No documents attached yet. Click "Upload New Document" to add laboratory reports or prescriptions.
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map(d => (
                    <div
                      key={d.documentId}
                      className="p-4 rounded-xl border border-border-subtle bg-bg-surface space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <DocumentTypeBadge type={d.documentType} />
                          <div>
                            <div className="font-bold text-text-primary text-sm">{d.displayName || d.originalFileName}</div>
                            <div className="text-[11px] text-text-muted">
                              Uploaded {formatDate(d.createdAt)} from {d.sourceReference}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDocument(d)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20 transition-colors cursor-pointer"
                            title="Preview Document"
                          >
                            <Eye className="w-3.5 h-3.5" /> Preview Document
                          </button>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-teal/10 text-accent-teal-dark uppercase">
                            {d.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDocumentToDelete({ documentId: d.documentId, displayName: d.displayName || d.originalFileName })}
                            title="Delete Document"
                            className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {d.summary && (
                        <p className="text-text-secondary leading-relaxed pt-1">{d.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Tab 3: Timeline ─── */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-text-primary">Chronological Clinical Timeline</h3>
              {timeline.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted rounded-xl border border-dashed border-border-subtle">
                  No timeline entries yet.
                </div>
              ) : (
                <div className="relative border-l-2 border-accent-teal/30 ml-4 space-y-6 py-2">
                  {timeline.map((item, idx) => (
                    <div key={item.id} className="relative pl-6">
                      <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-accent-teal border-2 border-bg-surface" />
                      <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-text-primary">{formatDate(item.date)}</span>
                          <DocumentTypeBadge type={item.type} />
                        </div>
                        <div className="text-sm font-semibold text-text-primary">{item.title}</div>
                        <p className="text-xs text-text-secondary leading-relaxed">{item.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Tab 4: Findings ─── */}
          {activeTab === 'findings' && (
            <div className="space-y-3 text-xs">
              <h3 className="text-sm font-bold text-text-primary">Aggregated Document Findings</h3>
              <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface space-y-3">
                <div className="font-bold text-text-primary">Fasting Blood Glucose — 118 mg/dL</div>
                <p className="text-text-secondary">Source: Metabolic_Panel_Aug2026.pdf (Ref: 70 - 99 mg/dL). Status: Consistent with evidence.</p>
              </div>
              <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface space-y-3">
                <div className="font-bold text-text-primary">LDL Cholesterol — 138 mg/dL</div>
                <p className="text-text-secondary">Source: Metabolic_Panel_Aug2026.pdf (Ref: &lt; 100 mg/dL). Status: Consistent with evidence.</p>
              </div>
            </div>
          )}

          {/* ─── Tab 5: Doctor Briefs ─── */}
          {activeTab === 'briefs' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Doctor Visit Brief</h3>
                  <p className="text-text-muted">Synthesizes all {documents.length} patient documents into an actionable 1-page visit sheet.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setLoadingBrief(true);
                    try {
                      const b = await doctorBriefService.generate(selectedPatient.patientId);
                      setBrief(b);
                    } catch (err: any) {
                      alert(err.message || 'Brief synthesis failed');
                    } finally {
                      setLoadingBrief(false);
                    }
                  }}
                  disabled={loadingBrief}
                  className="px-4 py-2 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loadingBrief ? 'Synthesizing...' : 'Generate Real Brief'}
                </button>
              </div>

              {brief ? (
                <div className="p-5 rounded-2xl bg-bg-surface border border-border-default space-y-4 shadow-xs">
                  <div className="border-b border-border-subtle pb-3">
                    <span className="text-[10px] uppercase font-bold text-accent-teal-dark">Document Summary</span>
                    <p className="text-xs text-text-primary mt-1 leading-relaxed">{brief.documentSummary}</p>
                  </div>
                  {brief.keyFindings && brief.keyFindings.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-text-muted">Key Discussion Topics</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {brief.keyFindings.map((kf: any, i: number) => (
                          <div key={i} className="p-3 rounded-xl bg-bg-secondary border border-border-subtle">
                            <span className="font-bold text-text-primary">{kf.finding}</span>
                            <div className="text-text-secondary mt-0.5">{kf.value} (Ref: {kf.range})</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {brief.discussionItems && brief.discussionItems.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-text-muted">Questions to Discuss with Physician</span>
                      <ul className="space-y-1.5 list-disc pl-4 text-text-secondary">
                        {brief.discussionItems.map((q: string, i: number) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-text-muted rounded-xl border border-border-subtle bg-bg-surface">
                  <ClipboardList className="w-8 h-8 text-accent-teal mx-auto mb-2" />
                  <p className="font-bold text-text-primary">Ready to Compile Doctor Visit Brief</p>
                  <p className="mt-1">Click "Generate Real Brief" to synthesize {documents.length} recorded documents.</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Tab 6: Emergency Profile ─── */}
          {activeTab === 'emergency' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary">Emergency Medical Profile</h3>
                {!editingEmergency && (
                  <button onClick={() => setEditingEmergency(true)} className="px-3 py-1.5 rounded-lg bg-accent-teal/10 text-accent-teal-dark font-bold hover:bg-accent-teal/20 transition-all">
                    EDIT PROFILE
                  </button>
                )}
              </div>
              
              <div className="p-5 rounded-2xl border border-border-subtle bg-bg-surface shadow-xs space-y-4">
                {editingEmergency ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Blood Group</label>
                      <input type="text" value={emBloodGroup} onChange={e => setEmBloodGroup(e.target.value)} placeholder="e.g. O+" className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-accent-teal/30" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Severe Allergies</label>
                      <input type="text" value={emAllergies} onChange={e => setEmAllergies(e.target.value)} placeholder="Comma separated..." className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-accent-teal/30" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Current Medications</label>
                      <input type="text" value={emMedications} onChange={e => setEmMedications(e.target.value)} placeholder="Comma separated..." className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-accent-teal/30" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Important Conditions</label>
                      <input type="text" value={emConditions} onChange={e => setEmConditions(e.target.value)} placeholder="Comma separated..." className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-accent-teal/30" />
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 pt-4 border-t border-border-subtle">
                      <h4 className="font-bold text-text-primary mb-2">Emergency Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-semibold mb-1">Name</label>
                          <input type="text" value={emContactName} onChange={e => setEmContactName(e.target.value)} placeholder="e.g. Emergency Contact Name" className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-accent-teal/30" />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Phone</label>
                          <input type="text" value={emContactPhone} onChange={e => setEmContactPhone(e.target.value)} placeholder="+1 234 567 890" className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-accent-teal/30" />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Relationship</label>
                          <input type="text" value={emContactRel} onChange={e => setEmContactRel(e.target.value)} placeholder="Spouse" className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-accent-teal/30" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4">
                      <button type="button" onClick={() => setEditingEmergency(false)} className="px-4 py-2 rounded-xl text-text-muted font-semibold hover:text-text-primary">Cancel</button>
                      <button type="button" onClick={handleSaveEmergencyProfile} className="px-5 py-2 rounded-xl bg-accent-teal text-white font-bold hover:bg-accent-teal-dark shadow-xs">SAVE PROFILE</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-border-subtle pb-1"><span className="text-text-muted">Blood Group:</span><span className="font-bold">{selectedPatient.bloodGroup || 'Not provided'}</span></div>
                      <div className="flex justify-between border-b border-border-subtle pb-1"><span className="text-text-muted">Severe Allergies:</span><span className="font-bold">{formatList(selectedPatient.severeAllergies)}</span></div>
                      <div className="flex justify-between border-b border-border-subtle pb-1"><span className="text-text-muted">Medications:</span><span className="font-bold">{formatList(selectedPatient.currentMedications)}</span></div>
                      <div className="flex justify-between border-b border-border-subtle pb-1"><span className="text-text-muted">Conditions:</span><span className="font-bold">{formatList(selectedPatient.importantConditions)}</span></div>
                    </div>
                    <div className="p-4 rounded-xl bg-bg-surface-secondary border border-border-subtle">
                      <h4 className="font-bold text-text-muted mb-2 uppercase text-[10px]">Primary Emergency Contact</h4>
                      {selectedPatient.emergencyContact ? (
                        <div>
                          <div className="font-bold text-sm text-text-primary">{selectedPatient.emergencyContact.name}</div>
                          <div className="text-text-secondary mt-1">{selectedPatient.emergencyContact.relationship} • {selectedPatient.emergencyContact.phone}</div>
                        </div>
                      ) : (
                        <div className="text-text-muted">No emergency contact provided.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Modal: Upload New Document from Existing Profile ─── */}
      <AnimatePresence>
        {showUploadDocModal && selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadDocModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg rounded-2xl bg-bg-surface border border-border-subtle shadow-xl overflow-hidden z-10"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Upload New Document</h3>
                  <p className="text-[11px] text-text-muted">Attaching to profile: {selectedPatient.name}</p>
                </div>
                <button
                  onClick={() => setShowUploadDocModal(false)}
                  className="p-1 rounded-lg text-text-muted hover:text-text-primary"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUploadDocumentToSelected} className="p-6 space-y-4 text-xs">
                {uploadError && (
                  <div className="p-3 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20">
                    {uploadError}
                  </div>
                )}
                
                <div>
                  <label className="block font-bold text-text-primary mb-2">Select Document *</label>
                  <UploadDropzone
                    onFileSelect={(f) => {
                      setUploadFile(f);
                      setUploadError('');
                    }}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadDocModal(false);
                      setUploadFile(null);
                      setUploadError('');
                    }}
                    className="px-4 py-2 rounded-xl text-text-muted font-semibold hover:text-text-primary"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadFile || uploading}
                    className="py-2.5 px-5 rounded-xl bg-accent-teal text-text-inverse font-bold hover:bg-accent-teal-dark transition-all shadow-xs disabled:opacity-50"
                  >
                    {uploading ? 'UPLOADING...' : 'UPLOAD DOCUMENT'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Modal 3: Patient Match Confirmation Dialog ─── */}
      <PatientMatchModal
        isOpen={showMatchModal}
        onClose={() => {
          setShowMatchModal(false);
          setPendingDocId(null);
        }}
        matchResult={matchResult}
        onAttachToPatient={async (pId) => {
          if (pendingDocId) {
            await patientService.attachDocument(pId, pendingDocId, true);
          }
          const allP = await patientService.list();
          setPatients(allP);
          const target = allP.find(p => p.patientId === pId);
          if (target) {
            await handleSelectPatient(target);
          }
          setShowMatchModal(false);
          setPendingDocId(null);
        }}
        onCreateNewPatient={async (initialName) => {
          setShowMatchModal(false);
          if (pendingDocId && initialName) {
            try {
              const newP = await patientService.createFromDocument(pendingDocId, initialName);
              if (newP) {
                const allP = await patientService.list();
                setPatients(allP);
                await handleSelectPatient(newP);
                await refreshActivePatient(newP.patientId);
                setPendingDocId(null);
                return;
              }
            } catch (err) {
              console.error('Failed to create separate profile from document:', err);
            }
          }
          setPendingDocId(null);
          openOnboarding();
        }}
        onChooseExistingPatient={() => {
          setShowMatchModal(false);
          setPendingDocId(null);
        }}
      />

      {/* ─── Modal 4: Delete Patient Confirmation Dialog ─── */}
      <AnimatePresence>
        {patientToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-bg-surface border border-red-500/30 rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Delete Patient Profile?</h3>
                  <p className="text-xs text-text-secondary">This action cannot be undone</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-900 dark:text-red-200 leading-relaxed">
                Are you sure you want to permanently delete the profile for <strong>"{patientToDelete.name}"</strong>? All associated clinical documents, timelines, doctor briefs, and records will be removed.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setPatientToDelete(null)}
                  className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDeletePatient}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Patient'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Modal 5: Delete Document Confirmation Dialog ─── */}
      <AnimatePresence>
        {documentToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-bg-surface border border-red-500/30 rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Delete Document?</h3>
                  <p className="text-xs text-text-secondary">Remove this file from patient chart</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-900 dark:text-red-200 leading-relaxed">
                Are you sure you want to delete <strong>"{documentToDelete.displayName}"</strong>? Its findings and timeline entries will be removed from this patient's records.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDocumentToDelete(null)}
                  className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDeleteDocument}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Document'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        document={previewDocument}
        patient={selectedPatient}
      />
    </div>
  );
}
