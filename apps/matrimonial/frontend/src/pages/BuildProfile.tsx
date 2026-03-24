import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Calendar, MapPin, GraduationCap, Briefcase, IndianRupee,
  Heart, ChevronRight, ChevronLeft, Check, Sparkles, Ruler,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  RELIGIONS, EDUCATION_LEVELS, PROFESSIONS, SALARY_RANGES,
  MOTHER_TONGUES, INTERESTS_LIST,
} from '../types';
import type { Profile } from '../types';

const STEPS = ['Basic Info', 'Education & Career', 'Lifestyle', 'Interests & Bio'];

const initialForm = {
  firstName: '', lastName: '', gender: '' as 'male' | 'female' | 'other' | '',
  dateOfBirth: '', religion: '', motherTongue: '', height: '',
  education: '', profession: '', company: '', salaryRange: '',
  location: '', state: '', country: 'India',
  maritalStatus: '', familyType: '', diet: '', smoking: '', drinking: '',
  bio: '', interests: [] as string[], photoUrl: '', lookingFor: '',
};

export default function BuildProfile() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.firstName) {
      setForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth,
        religion: profile.religion,
        motherTongue: profile.motherTongue,
        height: profile.height ? String(profile.height) : '',
        education: profile.education,
        profession: profile.profession,
        company: profile.company,
        salaryRange: profile.salaryRange,
        location: profile.location,
        state: profile.state,
        country: profile.country || 'India',
        maritalStatus: profile.maritalStatus,
        familyType: profile.familyType,
        diet: profile.diet,
        smoking: profile.smoking,
        drinking: profile.drinking,
        bio: profile.bio,
        interests: profile.interests || [],
        photoUrl: profile.photoUrl,
        lookingFor: profile.lookingFor,
      });
    }
  }, [profile]);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const toggleInterest = (interest: string) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const payload: Partial<Profile> = {
        ...form,
        gender: form.gender as 'male' | 'female' | 'other',
        height: Number(form.height) || 0,
      };
      await api.profiles.updateMyProfile(payload);
      await refreshProfile();
      navigate('/browse');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={form.firstName} onChange={update('firstName')} className="input-field pl-11" placeholder="First name" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                <input type="text" value={form.lastName} onChange={update('lastName')} className="input-field" placeholder="Last name" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <div className="grid grid-cols-3 gap-3">
                {(['male', 'female', 'other'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, gender: g }))}
                    className={`py-3 rounded-xl border-2 font-medium capitalize transition-all ${
                      form.gender === g
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} className="input-field pl-11" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Religion</label>
                <select value={form.religion} onChange={update('religion')} className="select-field">
                  <option value="">Select religion</option>
                  {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mother Tongue</label>
                <select value={form.motherTongue} onChange={update('motherTongue')} className="select-field">
                  <option value="">Select language</option>
                  {MOTHER_TONGUES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Height (cm)</label>
                <div className="relative">
                  <Ruler className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="number" value={form.height} onChange={update('height')} className="input-field pl-11" placeholder="e.g. 170" min="120" max="220" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Marital Status</label>
                <select value={form.maritalStatus} onChange={update('maritalStatus')} className="select-field">
                  <option value="">Select status</option>
                  <option value="Never Married">Never Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Awaiting Divorce">Awaiting Divorce</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Photo URL</label>
              <input type="url" value={form.photoUrl} onChange={update('photoUrl')} className="input-field" placeholder="https://example.com/photo.jpg" />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Education</label>
              <div className="relative">
                <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select value={form.education} onChange={update('education')} className="select-field pl-11">
                  <option value="">Select education</option>
                  {EDUCATION_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Profession</label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select value={form.profession} onChange={update('profession')} className="select-field pl-11">
                  <option value="">Select profession</option>
                  {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company</label>
              <input type="text" value={form.company} onChange={update('company')} className="input-field" placeholder="e.g. Google, TCS, Self-employed" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Annual Salary Range</label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select value={form.salaryRange} onChange={update('salaryRange')} className="select-field pl-11">
                  <option value="">Select range</option>
                  {SALARY_RANGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={form.location} onChange={update('location')} className="input-field pl-11" placeholder="e.g. Bangalore" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                <input type="text" value={form.state} onChange={update('state')} className="input-field" placeholder="e.g. Karnataka" />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Family Type</label>
              <div className="grid grid-cols-2 gap-3">
                {['Nuclear', 'Joint'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, familyType: t }))}
                    className={`py-3 rounded-xl border-2 font-medium transition-all ${
                      form.familyType === t
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Diet</label>
              <div className="grid grid-cols-3 gap-3">
                {['Vegetarian', 'Non-Vegetarian', 'Vegan'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, diet: d }))}
                    className={`py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                      form.diet === d
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Smoking</label>
              <div className="grid grid-cols-3 gap-3">
                {['No', 'Occasionally', 'Yes'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, smoking: s }))}
                    className={`py-3 rounded-xl border-2 font-medium transition-all ${
                      form.smoking === s
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Drinking</label>
              <div className="grid grid-cols-4 gap-3">
                {['No', 'Occasionally', 'Socially', 'Yes'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, drinking: d }))}
                    className={`py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${
                      form.drinking === d
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interests <span className="text-gray-400 font-normal">(select up to 8)</span>
              </label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto scrollbar-hide p-1">
                {INTERESTS_LIST.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    disabled={form.interests.length >= 8 && !form.interests.includes(interest)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      form.interests.includes(interest)
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">About Me</label>
              <textarea
                value={form.bio}
                onChange={update('bio')}
                className="input-field min-h-[100px] resize-none"
                placeholder="Tell others about yourself, your values, and what makes you unique..."
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{form.bio.length}/500</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">What I'm Looking For</label>
              <textarea
                value={form.lookingFor}
                onChange={update('lookingFor')}
                className="input-field min-h-[80px] resize-none"
                placeholder="Describe the qualities you value in a partner..."
                maxLength={300}
              />
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
            <span className="font-display text-2xl font-bold text-gradient">Build Your Profile</span>
          </div>
          <p className="text-gray-500">Complete your profile to start finding matches</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  i === step
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : i < step
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-primary-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="card p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            {step === 0 && <><User className="w-5 h-5 text-primary-500" /> Basic Information</>}
            {step === 1 && <><GraduationCap className="w-5 h-5 text-primary-500" /> Education & Career</>}
            {step === 2 && <><Heart className="w-5 h-5 text-primary-500" /> Lifestyle</>}
            {step === 3 && <><Sparkles className="w-5 h-5 text-primary-500" /> Interests & Bio</>}
          </h3>

          {renderStep()}

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
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
                  <>
                    <Check className="w-4 h-4" /> Save Profile
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
