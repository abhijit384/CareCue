import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertOctagon,
  PhoneCall,
  Share2,
  Copy,
  Check,
  Users,
  MapPin,
  HeartPulse,
  Activity,
  AlertTriangle,
  Pill,
  Edit3,
  Home,
  FileText,
  Save,
  X,
  Plus,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { patientService } from '@/services';
import type { Patient } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/composed/Button';

const DEFAULT_EMERGENCY_NUMBER = '112';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Parent',
  'Mother',
  'Father',
  'Brother',
  'Sister',
  'Child',
  'Guardian',
  'Friend',
  'Doctor',
  'Other',
];

const toArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(x => typeof x === 'string' ? x : (x?.name || x?.finding || JSON.stringify(x)));
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      if (Array.isArray(p)) return p.map(x => typeof x === 'string' ? x : (x?.name || x?.finding || JSON.stringify(x)));
    } catch {}
    return val.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
};

const formatList = (val: any, fallback = 'None documented'): string => {
  const arr = toArray(val);
  return arr.length > 0 ? arr.join(', ') : fallback;
};

export function EmergencyMode() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [formBloodGroup, setFormBloodGroup] = useState('Unknown');
  const [formAllergies, setFormAllergies] = useState('');
  const [formConditions, setFormConditions] = useState('');
  const [formMedications, setFormMedications] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formContactRel, setFormContactRel] = useState('Spouse');
  const [formHomeAddress, setFormHomeAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const { t } = useLanguage();
  const { activePatient, refreshActivePatient } = useAuth();
  const { showToast } = useToast();

  const loadPatients = async () => {
    try {
      const res = await patientService.list();
      setPatients(res);
      if (res.length > 0) {
        if (!selectedPatientId) {
          const match = activePatient ? res.find(p => p.patientId === activePatient.patientId) : null;
          setSelectedPatientId(match ? match.patientId : res[0].patientId);
        }
      }
    } catch (err) {
      console.error('Failed to load patients for emergency mode:', err);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [activePatient?.patientId]);

  const selectedPatient = patients.find(p => p.patientId === selectedPatientId);

  const openEditModal = () => {
    if (!selectedPatient) return;
    setFormBloodGroup(selectedPatient.bloodGroup || 'Unknown');
    setFormAllergies(formatList(selectedPatient.severeAllergies, ''));
    setFormConditions(formatList(selectedPatient.importantConditions, ''));
    setFormMedications(formatList(selectedPatient.currentMedications, ''));
    setFormContactName(selectedPatient.emergencyContact?.name || '');
    setFormContactPhone(selectedPatient.emergencyContact?.phone || '');
    setFormContactRel(selectedPatient.emergencyContact?.relationship || 'Spouse');
    setFormHomeAddress(selectedPatient.homeAddress || selectedPatient.emergencyContact?.homeAddress || '');
    setFormNotes(selectedPatient.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEmergencyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSaving(true);

    const allergiesList = formAllergies.split(',').map(s => s.trim()).filter(Boolean);
    const conditionsList = formConditions.split(',').map(s => s.trim()).filter(Boolean);
    const medsList = formMedications.split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      bloodGroup: formBloodGroup !== 'Unknown' ? formBloodGroup : undefined,
      severeAllergies: allergiesList,
      importantConditions: conditionsList,
      currentMedications: medsList,
      homeAddress: formHomeAddress.trim() || undefined,
      notes: formNotes.trim() || undefined,
      emergencyContact: formContactName.trim() ? {
        name: formContactName.trim(),
        phone: formContactPhone.trim(),
        relationship: formContactRel,
        homeAddress: formHomeAddress.trim() || undefined,
      } : undefined,
    };

    try {
      const updated = await patientService.updateEmergencyProfile(selectedPatient.patientId, payload);
      if (updated) {
        setPatients(prev => prev.map(p => p.patientId === updated.patientId ? updated : p));
        if (refreshActivePatient) {
          await refreshActivePatient(updated.patientId);
        }
      }
      showToast('Emergency profile & safety card updated successfully', 'success');
      setIsEditModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to update emergency profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
        showToast('GPS coordinates acquired', 'info');
      },
      (err) => {
        alert('Unable to retrieve location. Make sure permissions are granted.');
        setLocationLoading(false);
      }
    );
  };

  const generateProfileString = () => {
    if (!selectedPatient) return 'No patient selected.';
    const homeAddr = selectedPatient.homeAddress || selectedPatient.emergencyContact?.homeAddress;
    return [
      `=== FIRST RESPONDER EMERGENCY BRIEF ===`,
      `Patient Name: ${selectedPatient.name}`,
      `Blood Group: ${selectedPatient.bloodGroup || 'Unknown'}`,
      `Severe Allergies: ${formatList(selectedPatient.severeAllergies)}`,
      `Medical Conditions: ${formatList(selectedPatient.importantConditions)}`,
      `Current Medications: ${formatList(selectedPatient.currentMedications)}`,
      homeAddr ? `Home Address: ${homeAddr}` : '',
      selectedPatient.emergencyContact ? `Emergency Contact: ${selectedPatient.emergencyContact.name} (${selectedPatient.emergencyContact.relationship}) - ${selectedPatient.emergencyContact.phone}` : '',
      selectedPatient.notes ? `Medical Notes: ${selectedPatient.notes}` : '',
      location ? `GPS Location: https://maps.google.com/?q=${location.lat},${location.lng}` : '',
    ].filter(Boolean).join('\n');
  };

  const handleCopyProfile = () => {
    navigator.clipboard.writeText(generateProfileString());
    setCopied(true);
    showToast('Emergency brief copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareProfile = async () => {
    const text = generateProfileString();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Emergency Medical Profile - ${selectedPatient?.name}`,
          text: text,
        });
      } catch (err) {
        handleCopyProfile();
      }
    } else {
      handleCopyProfile();
    }
  };

  const homeAddress = selectedPatient?.homeAddress || selectedPatient?.emergencyContact?.homeAddress;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* ─── Header: Calm & Focused ─── */}
      <div className="p-6 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/5 via-bg-surface to-bg-surface shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
            <AlertOctagon className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 inline-block mb-1">
              Safety Protocol
            </span>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              {t('Emergency Mode')}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              Immediate access to first responder medical cards, home address, and emergency contacts.
            </p>
          </div>
        </div>

        {/* Patient Selector & Edit Trigger */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-bg-surface-secondary border border-border-subtle text-xs">
            <Users className="w-4 h-4 text-text-muted" />
            <select
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
              className="bg-transparent text-text-primary font-semibold focus:outline-none cursor-pointer"
            >
              <option value="" disabled>Select Patient</option>
              {patients.map(p => (
                <option key={p.patientId} value={p.patientId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {selectedPatient && (
            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs hover:bg-accent-teal-dark transition-all shadow-xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Emergency Info</span>
            </button>
          )}
        </div>
      </div>

      {selectedPatient ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Active Patient Critical Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Clinical Profile */}
            <div className="p-5 rounded-2xl border border-border-subtle bg-bg-surface shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-accent-teal" />
                  <h3 className="text-sm font-bold text-text-primary">Medical Profile</h3>
                </div>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="text-[11px] font-bold text-accent-teal hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Update</span>
                </button>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center border-b border-border-subtle/50 pb-2">
                  <span className="text-text-muted font-medium">Blood Group</span>
                  <span className="font-extrabold text-red-600 px-2.5 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    {selectedPatient.bloodGroup || 'Not specified'}
                  </span>
                </div>

                <div className="flex justify-between items-start border-b border-border-subtle/50 pb-2">
                  <span className="text-text-muted font-medium flex items-center gap-1.5 shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Severe Allergies
                  </span>
                  <div className="text-right">
                    {(() => {
                      const allergies = toArray(selectedPatient.severeAllergies);
                      return allergies.length > 0 ? (
                        <div className="flex flex-wrap justify-end gap-1">
                          {allergies.map((allergy: string, i: number) => (
                            <span key={i} className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                              {allergy}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-semibold text-text-secondary text-xs">None documented</span>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex justify-between items-start border-b border-border-subtle/50 pb-2">
                  <span className="text-text-muted font-medium flex items-center gap-1.5 shrink-0">
                    <Activity className="w-3.5 h-3.5 text-accent-teal" />
                    Medical Conditions
                  </span>
                  <span className="font-semibold text-text-primary text-xs text-right max-w-[200px]">
                    {formatList(selectedPatient.importantConditions)}
                  </span>
                </div>

                <div className="flex justify-between items-start pb-1">
                  <span className="text-text-muted font-medium flex items-center gap-1.5 shrink-0">
                    <Pill className="w-3.5 h-3.5 text-accent-teal" />
                    Active Medications
                  </span>
                  <span className="font-semibold text-text-primary text-xs text-right max-w-[200px]">
                    {formatList(selectedPatient.currentMedications)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Emergency Contact & Home Address */}
            <div className="space-y-4">
              {/* Emergency Contact */}
              <div className="p-5 rounded-2xl border border-border-subtle bg-bg-surface shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-accent-teal" />
                    Primary Emergency Contact
                  </h3>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="text-[11px] font-bold text-accent-teal hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>

                {selectedPatient.emergencyContact && selectedPatient.emergencyContact.name ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-text-primary text-base">
                        {selectedPatient.emergencyContact.name}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {selectedPatient.emergencyContact.relationship || 'Emergency Contact'} · <strong className="text-text-primary">{selectedPatient.emergencyContact.phone}</strong>
                      </p>
                    </div>
                    <a
                      href={`tel:${selectedPatient.emergencyContact.phone}`}
                      className="px-4 py-2 rounded-xl bg-accent-teal text-text-inverse font-bold text-xs hover:bg-accent-teal-dark transition-all no-underline inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>CALL</span>
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary/60 border border-border-subtle">
                    <p className="text-xs text-text-muted">No emergency contact set yet.</p>
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="text-xs font-bold text-accent-teal hover:underline cursor-pointer"
                    >
                      + Add Contact
                    </button>
                  </div>
                )}
              </div>

              {/* Home Address Card */}
              <div className="p-5 rounded-2xl border border-border-subtle bg-bg-surface shadow-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Home className="w-4 h-4 text-accent-teal" />
                    Home Residential Address
                  </h3>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="text-[11px] font-bold text-accent-teal hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>

                {homeAddress ? (
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-status-error shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-text-primary leading-relaxed">
                        {homeAddress}
                      </p>
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(homeAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-bg-secondary text-text-secondary hover:text-accent-teal border border-border-subtle transition-colors shrink-0"
                      title="Open in Maps"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary/60 border border-border-subtle">
                    <p className="text-xs text-text-muted">No home address documented.</p>
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="text-xs font-bold text-accent-teal hover:underline cursor-pointer"
                    >
                      + Add Address
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`tel:${DEFAULT_EMERGENCY_NUMBER}`}
                  className="col-span-2 flex items-center justify-center gap-2 p-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm transition-all shadow-md no-underline"
                >
                  <PhoneCall className="w-5 h-5 animate-pulse" />
                  <span>{t('CALL EMERGENCY')} ({DEFAULT_EMERGENCY_NUMBER})</span>
                </a>
                
                <Button
                  variant="secondary"
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className={cn(
                    "w-full",
                    location && "border-accent-teal bg-accent-teal/5 text-accent-teal-dark font-bold"
                  )}
                  leftIcon={<MapPin className="w-4 h-4" />}
                >
                  {location ? 'LOCATION ACQUIRED' : (locationLoading ? 'LOCATING...' : t('GET LOCATION'))}
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleShareProfile}
                  leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                  className="w-full"
                >
                  {copied ? 'COPIED!' : 'SHARE SAFETY CARD'}
                </Button>
              </div>

            </div>
          </div>
          
        </motion.div>
      ) : (
        <div className="p-8 text-center bg-bg-surface border border-border-subtle rounded-2xl">
          <p className="text-text-muted text-sm">Please select or create a patient to view emergency profile.</p>
        </div>
      )}

      {/* ─── MODAL: EDIT EMERGENCY PROFILE ON OUR OWN ─── */}
      <AnimatePresence>
        {isEditModalOpen && selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl bg-bg-surface rounded-2xl border border-border-default shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-secondary/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-600 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      Customize Emergency Profile & Safety Card
                    </h3>
                    <p className="text-[11px] text-text-secondary">
                      Patient: <strong className="text-text-primary">{selectedPatient.name}</strong> ({selectedPatient.patientId})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-secondary cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveEmergencyProfile} className="p-6 overflow-y-auto space-y-4">
                
                {/* 1. Blood Group & Severe Allergies */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Blood Group
                    </label>
                    <select
                      value={formBloodGroup}
                      onChange={e => setFormBloodGroup(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent-teal"
                    >
                      {BLOOD_GROUPS.map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Severe Allergies <span className="text-text-tertiary font-normal">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={formAllergies}
                      onChange={e => setFormAllergies(e.target.value)}
                      placeholder="e.g. Penicillin, Peanuts, Latex"
                      className="w-full px-3.5 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent-teal"
                    />
                  </div>
                </div>

                {/* 2. Medical Conditions & Medications */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Important Conditions <span className="text-text-tertiary font-normal">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={formConditions}
                      onChange={e => setFormConditions(e.target.value)}
                      placeholder="e.g. Type 2 Diabetes, Hypertension"
                      className="w-full px-3.5 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent-teal"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Active Medications <span className="text-text-tertiary font-normal">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={formMedications}
                      onChange={e => setFormMedications(e.target.value)}
                      placeholder="e.g. Metformin 500mg, Lisinopril"
                      className="w-full px-3.5 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent-teal"
                    />
                  </div>
                </div>

                {/* 3. Primary Emergency Contact */}
                <div className="pt-2 border-t border-border-subtle space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent-teal-dark flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5" />
                    Primary Emergency Contact
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={formContactName}
                        onChange={e => setFormContactName(e.target.value)}
                        placeholder="e.g. Priya Sharma"
                        className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent-teal"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formContactPhone}
                        onChange={e => setFormContactPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent-teal"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                        Relationship
                      </label>
                      <select
                        value={formContactRel}
                        onChange={e => setFormContactRel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent-teal"
                      >
                        {RELATIONSHIP_OPTIONS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Home Residential Address */}
                <div className="pt-2 border-t border-border-subtle space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent-teal-dark flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5" />
                    Home Residential Address
                  </h4>
                  <input
                    type="text"
                    value={formHomeAddress}
                    onChange={e => setFormHomeAddress(e.target.value)}
                    placeholder="e.g. Flat 402, Green Valley Apartments, Salt Lake Sector 5, Kolkata 700091"
                    className="w-full px-3.5 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent-teal"
                  />
                  <p className="text-[10px] text-text-tertiary">
                    This address will be displayed on the emergency safety card for paramedics and first responders.
                  </p>
                </div>

                {/* 5. Additional Medical Instructions */}
                <div className="pt-2 border-t border-border-subtle space-y-2">
                  <label className="text-xs font-bold text-text-primary block">
                    Special Emergency Notes / Instructions
                  </label>
                  <textarea
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Keep rescue inhaler accessible; anaphylaxis risk with penicillin."
                    className="w-full px-3.5 py-2 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs focus:outline-none focus:border-accent-teal resize-none"
                  />
                </div>

                {/* Modal Actions */}
                <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary text-xs font-semibold hover:bg-bg-secondary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-accent-teal hover:bg-accent-teal-dark text-text-inverse text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Emergency Profile</span>
                      </>
                    )}
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
