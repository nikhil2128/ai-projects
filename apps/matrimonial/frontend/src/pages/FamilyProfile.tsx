import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, MapPin, Phone, Heart, IndianRupee,
  ChevronRight, ChevronLeft, Check, Sparkles, Edit, UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { FAMILY_VALUES_LIST, FAMILY_INCOME_RANGES } from '../types';
import type { FamilyProfile as FamilyProfileType } from '../types';
import { ErrorAlert, StepIndicator, SelectionGroup } from '../components/shared';
import { DetailRow } from '../components/shared';

const STEPS = ['Parents', 'Family Details'];

const initialForm = {
  fatherName: '', fatherOccupation: '',
  motherName: '', motherOccupation: '',
  siblings: '', familyIncome: '', familyValues: '',
  aboutFamily: '', contactPerson: '', contactPhone: '', familyLocation: '',
};

export default function FamilyProfile() {
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { familyProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (familyProfile?.fatherName || familyProfile?.motherName) {
      setForm({
        fatherName: familyProfile.fatherName,
        fatherOccupation: familyProfile.fatherOccupation,
        motherName: familyProfile.motherName,
        motherOccupation: familyProfile.motherOccupation,
        siblings: familyProfile.siblings,
        familyIncome: familyProfile.familyIncome,
        familyValues: familyProfile.familyValues,
        aboutFamily: familyProfile.aboutFamily,
        contactPerson: familyProfile.contactPerson,
        contactPhone: familyProfile.contactPhone,
        familyLocation: familyProfile.familyLocation,
      });
    }
  }, [familyProfile]);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await api.family.updateMyFamilyProfile(form);
      await refreshProfile();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save family profile');
    } finally {
      setLoading(false);
    }
  };

  const hasFamilyData = familyProfile?.fatherName || familyProfile?.motherName;

  if (!editing && !hasFamilyData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <Users className="w-16 h-16 text-primary-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Family Profile Not Set Up</h2>
        <p className="text-gray-500 mb-6 text-center max-w-md">
          Add your family details so other families can learn more about you. This helps build trust and makes matching more meaningful.
        </p>
        <button onClick={() => setEditing(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Add Family Profile
        </button>
      </div>
    );
  }

  if (!editing && hasFamilyData) {
    return <FamilyProfileView familyProfile={familyProfile!} onEdit={() => setEditing(true)} />;
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Father's Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Father's Name</label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={form.fatherName} onChange={update('fatherName')} className="input-field pl-11" placeholder="Full name" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Father's Occupation</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={form.fatherOccupation} onChange={update('fatherOccupation')} className="input-field pl-11" placeholder="e.g. Business Owner, Retired" />
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100 my-2" />

            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Mother's Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mother's Name</label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={form.motherName} onChange={update('motherName')} className="input-field pl-11" placeholder="Full name" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mother's Occupation</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={form.motherOccupation} onChange={update('motherOccupation')} className="input-field pl-11" placeholder="e.g. Homemaker, Teacher" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Siblings</label>
              <input type="text" value={form.siblings} onChange={update('siblings')} className="input-field" placeholder="e.g. 1 elder brother, 1 younger sister" />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Family Income</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select value={form.familyIncome} onChange={update('familyIncome')} className="select-field pl-11">
                    <option value="">Select range</option>
                    {FAMILY_INCOME_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Family Values</label>
                <SelectionGroup
                  options={FAMILY_VALUES_LIST as unknown as readonly string[]}
                  value={form.familyValues}
                  onChange={v => setForm(prev => ({ ...prev, familyValues: v }))}
                  columns={3}
                  className="py-2.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Family Location</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={form.familyLocation} onChange={update('familyLocation')} className="input-field pl-11" placeholder="e.g. Jaipur, Rajasthan" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Person</label>
                <select value={form.contactPerson} onChange={update('contactPerson')} className="select-field">
                  <option value="">Who should be contacted?</option>
                  <option value="Self">Self</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="tel" value={form.contactPhone} onChange={update('contactPhone')} className="input-field pl-11" placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">About Our Family</label>
              <textarea
                value={form.aboutFamily}
                onChange={update('aboutFamily')}
                className="input-field min-h-[120px] resize-none"
                placeholder="Tell about your family background, values, and what makes your family special..."
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{form.aboutFamily.length}/500</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Sparkles className="w-7 h-7 text-primary-500" />
            <span className="font-display text-2xl font-bold text-gradient">
              {hasFamilyData ? 'Edit Family Profile' : 'Add Family Profile'}
            </span>
          </div>
          <p className="text-gray-500">Share your family details to help other families connect with yours</p>
        </div>

        <div className="mb-8">
          <StepIndicator steps={STEPS} currentStep={step} onStepClick={setStep} />
        </div>

        <ErrorAlert message={error} />

        <div className="card p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            {step === 0 && <><Users className="w-5 h-5 text-primary-500" /> Parents & Siblings</>}
            {step === 1 && <><Heart className="w-5 h-5 text-primary-500" /> Family Details</>}
          </h3>

          {renderStep()}

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                if (step === 0) {
                  setEditing(false);
                  setStep(0);
                } else {
                  setStep(s => Math.max(0, s - 1));
                }
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Previous'}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
                className="btn-primary flex items-center gap-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <><Check className="w-4 h-4" /> Save Family Profile</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FamilyProfileView({ familyProfile, onEdit }: { familyProfile: FamilyProfileType; onEdit: () => void }) {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-32 relative">
          <button
            onClick={onEdit}
            className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl
                       flex items-center gap-2 hover:bg-white/30 transition-all"
          >
            <Edit className="w-4 h-4" /> Edit
          </button>
          <div className="absolute bottom-4 left-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6" /> Family Profile
            </h2>
          </div>
        </div>

        <div className="px-8 pb-8 pt-6">
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" /> Parents
              </h3>
              <div className="space-y-3">
                {familyProfile.fatherName && (
                  <div className="bg-amber-50 rounded-xl p-4">
                    <div className="text-xs text-amber-600 uppercase tracking-wide font-medium mb-1">Father</div>
                    <div className="font-semibold text-gray-800">{familyProfile.fatherName}</div>
                    {familyProfile.fatherOccupation && (
                      <div className="text-sm text-gray-500 mt-0.5">{familyProfile.fatherOccupation}</div>
                    )}
                  </div>
                )}
                {familyProfile.motherName && (
                  <div className="bg-amber-50 rounded-xl p-4">
                    <div className="text-xs text-amber-600 uppercase tracking-wide font-medium mb-1">Mother</div>
                    <div className="font-semibold text-gray-800">{familyProfile.motherName}</div>
                    {familyProfile.motherOccupation && (
                      <div className="text-sm text-gray-500 mt-0.5">{familyProfile.motherOccupation}</div>
                    )}
                  </div>
                )}
                {familyProfile.siblings && (
                  <DetailRow label="Siblings" value={familyProfile.siblings} />
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-amber-500" /> Details
              </h3>
              <div className="space-y-3">
                <DetailRow icon={MapPin} label="Family Location" value={familyProfile.familyLocation} />
                <DetailRow icon={IndianRupee} label="Family Income" value={familyProfile.familyIncome} />
                <DetailRow label="Values" value={familyProfile.familyValues} />
                <DetailRow icon={Phone} label="Contact" value={
                  familyProfile.contactPerson
                    ? `${familyProfile.contactPerson}${familyProfile.contactPhone ? ` (${familyProfile.contactPhone})` : ''}`
                    : familyProfile.contactPhone
                } />
              </div>
            </div>
          </div>

          {familyProfile.aboutFamily && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">About Our Family</h3>
              <p className="text-gray-600 leading-relaxed bg-amber-50 rounded-xl p-4 border border-amber-100">
                {familyProfile.aboutFamily}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
