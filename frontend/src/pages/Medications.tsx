import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pill,
  Plus,
  Search,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileText,
  User,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info,
  ChevronDown,
  RefreshCw,
  X,
  HeartPulse,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { patientService } from '@/services';
import type { Patient } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/composed/EmptyState';

interface MedicationItem {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  purpose?: string;
  instructions?: string;
  status?: string;
  timing?: string;
  prescriber?: string;
  sourceDocumentName?: string;
  sourceDocumentId?: string;
}

export function Medications() {
  const { patients, activePatient, setActivePatient, openOnboarding } = useAuth();
  const { showToast } = useToast();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    activePatient?.patientId || (patients.length > 0 ? patients[0].patientId : '')
  );
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timingFilter, setTimingFilter] = useState<string>('all');
  
  // Add Medication Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFrequency, setNewMedFrequency] = useState('Once daily');
  const [newMedPurpose, setNewMedPurpose] = useState('');
  const [newMedTiming, setNewMedTiming] = useState('Morning');
  const [adding, setAdding] = useState(false);

  // Sync selected patient
  useEffect(() => {
    if (activePatient?.patientId && activePatient.patientId !== selectedPatientId) {
      setSelectedPatientId(activePatient.patientId);
    } else if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].patientId);
    }
  }, [activePatient, patients]);

  // Fetch medications whenever selected patient changes
  const fetchMedications = async (patId: string) => {
    if (!patId) {
      setMedications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await patientService.getMedications(patId);
      setMedications(data || []);
    } catch (err) {
      console.error('Failed to load medications:', err);
      showToast('Could not load medications list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      fetchMedications(selectedPatientId);
    }
  }, [selectedPatientId]);

  const currentPatient = patients.find(p => p.patientId === selectedPatientId) || activePatient || patients[0];

  const handlePatientChange = (pId: string) => {
    setSelectedPatientId(pId);
    const p = patients.find(x => x.patientId === pId);
    if (p) setActivePatient(p);
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim() || !selectedPatientId) return;

    setAdding(true);
    try {
      const updated = await patientService.addMedication(selectedPatientId, {
        name: newMedName.trim(),
        dosage: newMedDosage.trim(),
        frequency: newMedFrequency,
        purpose: newMedPurpose.trim() || 'Prescribed therapy',
        timing: newMedTiming,
      });
      setMedications(updated || []);
      showToast(`Added ${newMedName} to medications list`, 'success');
      setShowAddModal(false);
      setNewMedName('');
      setNewMedDosage('');
      setNewMedPurpose('');
    } catch (err: any) {
      showToast(err.message || 'Failed to add medication', 'error');
    } finally {
      setAdding(false);
    }
  };

  const filteredMeds = medications.filter(m => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.dosage && m.dosage.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.purpose && m.purpose.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (timingFilter === 'all') return matchesSearch;
    return matchesSearch && m.timing?.toLowerCase() === timingFilter.toLowerCase();
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* ─── Top Header & Patient Switcher ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-teal/10 text-accent-teal font-semibold text-xs mb-2">
            <Pill className="w-3.5 h-3.5" />
            <span>Medication Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Prescribed Medications
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Active medicines, dosages, clinical indications, and verified prescription records
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Patient Selector Dropdown */}
          {patients.length > 0 && (
            <div className="relative">
              <select
                value={selectedPatientId}
                onChange={e => handlePatientChange(e.target.value)}
                aria-label="Select Patient for Medications"
                className="appearance-none pl-9 pr-8 py-2 rounded-xl bg-bg-surface border border-border-default text-xs font-bold text-text-primary focus:outline-hidden focus:border-accent-teal shadow-xs cursor-pointer"
              >
                {patients.map(p => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.name} {p.relationship ? `(${p.relationship})` : ''}
                  </option>
                ))}
              </select>
              <User className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* ─── Clinical Safety Banner ─── */}
      <div className="p-4 rounded-2xl bg-bg-surface border border-border-default shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-text-primary">Grounded Prescription Records</h4>
            <p className="text-[11px] text-text-secondary">
              Medications are automatically extracted and isolated per patient profile from verified doctor prescriptions and lab records.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-lg bg-bg-secondary border border-border-subtle text-[11px] font-bold text-text-primary">
            {medications.length} {medications.length === 1 ? 'Medicine' : 'Medicines'} Active
          </span>
        </div>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search medicine name, dosage, purpose..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-surface border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-accent-teal shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'morning', 'afternoon', 'evening', 'bedtime'].map(timing => (
            <button
              key={timing}
              type="button"
              onClick={() => setTimingFilter(timing)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer shrink-0',
                timingFilter === timing
                  ? 'bg-accent-teal text-text-inverse shadow-xs'
                  : 'bg-bg-surface border border-border-default text-text-secondary hover:text-text-primary'
              )}
            >
              {timing}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Medications Grid / List ─── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-bg-surface border border-border-default animate-pulse space-y-3"
            >
              <div className="h-5 w-48 bg-bg-secondary rounded-md" />
              <div className="h-4 w-32 bg-bg-secondary rounded-md" />
              <div className="h-3 w-full bg-bg-secondary rounded-md" />
            </div>
          ))}
        </div>
      ) : filteredMeds.length === 0 ? (
        <div className="p-8 rounded-2xl bg-bg-surface border border-border-default text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-teal/10 text-accent-teal mx-auto flex items-center justify-center">
            <Pill className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-text-primary">
            {searchQuery ? 'No matching medicines found' : `No medications recorded for ${currentPatient?.name || 'this patient'}`}
          </h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search query or timing filter.'
              : 'Upload a prescription PDF/image or click "Add Medicine" to log active medications for this profile.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              + Add First Medicine
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeds.map((med, idx) => (
            <motion.div
              key={med.id || idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="p-5 rounded-2xl bg-bg-surface border border-border-default shadow-xs hover:border-accent-teal/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                {/* Header: Name + Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-accent-teal/15 text-accent-teal-dark flex items-center justify-center shrink-0">
                      <Pill className="w-4 h-4 text-accent-teal" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary leading-tight">
                        {med.name}
                      </h3>
                      {med.dosage && (
                        <span className="text-xs font-bold text-accent-teal">
                          {med.dosage}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider shrink-0">
                    {med.status || 'Active'}
                  </span>
                </div>

                {/* Purpose / Indication */}
                {med.purpose && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary bg-bg-secondary/50 px-2.5 py-1.5 rounded-lg border border-border-subtle">
                    <HeartPulse className="w-3.5 h-3.5 text-accent-teal shrink-0" />
                    <span className="font-medium truncate">{med.purpose}</span>
                  </div>
                )}

                {/* Instructions */}
                {med.instructions && (
                  <p className="text-[11px] text-text-muted leading-relaxed pl-1">
                    {med.instructions}
                  </p>
                )}
              </div>

              {/* Footer Meta: Schedule & Source */}
              <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent-teal" />
                  <span className="font-semibold text-text-primary">
                    {med.frequency || 'Daily'} • {med.timing || 'Morning'}
                  </span>
                </div>

                {med.sourceDocumentName && (
                  <div className="flex items-center gap-1 text-text-muted">
                    <FileText className="w-3 h-3 text-text-muted" />
                    <span className="truncate max-w-[140px]" title={med.sourceDocumentName}>
                      {med.sourceDocumentName}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── Add Medication Modal ─── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-bg-surface border border-border-default rounded-2xl shadow-2xl p-6 relative space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-accent-teal/15 text-accent-teal flex items-center justify-center">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Add Medication</h3>
                    <p className="text-[11px] text-text-muted">
                      Adding for patient: <strong>{currentPatient?.name}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddMedication} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amlodipine, Metformin, Atorvastatin"
                    value={newMedName}
                    onChange={e => setNewMedName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary font-medium focus:outline-hidden focus:border-accent-teal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      Dosage (mg/ml)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5 mg, 500 mg"
                      value={newMedDosage}
                      onChange={e => setNewMedDosage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary font-medium focus:outline-hidden focus:border-accent-teal"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text-secondary mb-1">
                      Timing
                    </label>
                    <select
                      value={newMedTiming}
                      onChange={e => setNewMedTiming(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary font-semibold focus:outline-hidden focus:border-accent-teal"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                      <option value="Bedtime">Bedtime</option>
                      <option value="With meals">With meals</option>
                      <option value="As needed">As needed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Frequency
                  </label>
                  <select
                    value={newMedFrequency}
                    onChange={e => setNewMedFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary font-semibold focus:outline-hidden focus:border-accent-teal"
                  >
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Every 8 hours">Every 8 hours</option>
                    <option value="Once weekly">Once weekly</option>
                    <option value="As needed (PRN)">As needed (PRN)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Purpose / Indication
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Blood pressure control, Blood sugar"
                    value={newMedPurpose}
                    onChange={e => setNewMedPurpose(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary font-medium focus:outline-hidden focus:border-accent-teal"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newMedName.trim() || adding}
                    className="px-5 py-2.5 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {adding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Save Medicine</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
