import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, GraduationCap, Briefcase, IndianRupee, Heart, ArrowLeft,
  Calendar, Ruler, Users, UtensilsCrossed, Cigarette, Wine, Send, Loader2,
} from 'lucide-react';
import { api } from '../api';
import type { Profile } from '../types';

export default function ProfileDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [interestSent, setInterestSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!userId) return;
    api.profiles.getProfile(userId).then(p => {
      setProfile(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  const sendInterest = async () => {
    if (!userId) return;
    setSending(true);
    try {
      await api.profiles.sendInterest(userId);
      setInterestSent(true);
    } catch {
      // already sent
      setInterestSent(true);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-gray-800">Profile not found</h2>
        <button onClick={() => navigate('/browse')} className="btn-primary mt-4">Back to Browse</button>
      </div>
    );
  }

  const age = profile.age || '—';
  const heightFt = profile.height
    ? `${Math.floor(profile.height / 30.48)}'${Math.round((profile.height % 30.48) / 2.54)}"`
    : '—';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Back
      </button>

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 h-40 relative">
          {profile.matchPercentage && (
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl font-bold">
              {profile.matchPercentage}% Match
            </div>
          )}
        </div>

        <div className="px-8 pb-8">
          <div className="flex flex-col sm:flex-row gap-6 -mt-16">
            <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-gray-200 flex-shrink-0">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.firstName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-400 to-accent-400 text-white text-3xl font-bold">
                  {profile.firstName[0]}{profile.lastName?.[0]}
                </div>
              )}
            </div>

            <div className="flex-1 pt-2 sm:pt-16">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {profile.firstName} {profile.lastName}
                  </h1>
                  <p className="text-gray-500 mt-1">{profile.profession} at {profile.company}</p>
                </div>
                <button
                  onClick={sendInterest}
                  disabled={interestSent || sending}
                  className={interestSent ? 'btn-secondary flex items-center gap-2' : 'btn-primary flex items-center gap-2'}
                >
                  {sending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  ) : interestSent ? (
                    <><Heart className="w-4 h-4 fill-primary-500" /> Interest Sent</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send Interest</>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <InfoCard icon={<Calendar className="w-5 h-5" />} label="Age" value={`${age} years`} />
            <InfoCard icon={<Ruler className="w-5 h-5" />} label="Height" value={heightFt} />
            <InfoCard icon={<MapPin className="w-5 h-5" />} label="Location" value={`${profile.location}, ${profile.state}`} />
            <InfoCard icon={<Heart className="w-5 h-5" />} label="Status" value={profile.maritalStatus} />
          </div>

          <div className="grid sm:grid-cols-2 gap-8 mt-8">
            <Section title="Education & Career">
              <Detail icon={<GraduationCap className="w-4 h-4" />} label="Education" value={profile.education} />
              <Detail icon={<Briefcase className="w-4 h-4" />} label="Profession" value={profile.profession} />
              <Detail label="Company" value={profile.company} />
              <Detail icon={<IndianRupee className="w-4 h-4" />} label="Salary" value={profile.salaryRange} />
            </Section>

            <Section title="Personal Details">
              <Detail label="Religion" value={profile.religion} />
              <Detail label="Mother Tongue" value={profile.motherTongue} />
              <Detail icon={<Users className="w-4 h-4" />} label="Family Type" value={profile.familyType} />
              <Detail icon={<UtensilsCrossed className="w-4 h-4" />} label="Diet" value={profile.diet} />
              <Detail icon={<Cigarette className="w-4 h-4" />} label="Smoking" value={profile.smoking} />
              <Detail icon={<Wine className="w-4 h-4" />} label="Drinking" value={profile.drinking} />
            </Section>
          </div>

          {profile.bio && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">About</h3>
              <p className="text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">{profile.bio}</p>
            </div>
          )}

          {profile.lookingFor && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Looking For</h3>
              <p className="text-gray-600 leading-relaxed bg-primary-50 rounded-xl p-4 border border-primary-100">
                {profile.lookingFor}
              </p>
            </div>
          )}

          {profile.interests?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map(interest => (
                  <span key={interest} className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <div className="flex justify-center text-primary-500 mb-2">{icon}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold text-gray-800 mt-1">{value || '—'}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      {icon && <span className="text-gray-400">{icon}</span>}
      <span className="text-gray-500 min-w-[100px]">{label}:</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}
