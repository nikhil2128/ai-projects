import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, GraduationCap, Briefcase, IndianRupee, Heart, ArrowLeft,
  Calendar, Ruler, Users, UtensilsCrossed, Cigarette, Wine, Send, Loader2,
  Share2, Phone, X,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Profile, FamilyProfile } from '../types';

export default function ProfileDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [interestSent, setInterestSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      api.profiles.getProfile(userId).catch(() => null),
      api.family.getFamilyProfile(userId).catch(() => null),
    ]).then(([p, fp]) => {
      setProfile(p);
      setFamilyProfile(fp);
      setLoading(false);
    });
  }, [userId]);

  const sendInterest = async () => {
    if (!userId) return;
    setSending(true);
    try {
      await api.profiles.sendInterest(userId);
      setInterestSent(true);
    } catch {
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

  const isOwnProfile = user?.id === userId;

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
                {!isOwnProfile && (
                  <div className="flex gap-2">
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
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="btn-secondary flex items-center gap-2"
                      title="Share this profile with another family"
                    >
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  </div>
                )}
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

          {familyProfile && (familyProfile.fatherName || familyProfile.motherName) && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" /> Family Details
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
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
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                {familyProfile.siblings && (
                  <Detail label="Siblings" value={familyProfile.siblings} />
                )}
                {familyProfile.familyLocation && (
                  <Detail icon={<MapPin className="w-4 h-4" />} label="Family Location" value={familyProfile.familyLocation} />
                )}
                {familyProfile.familyIncome && (
                  <Detail icon={<IndianRupee className="w-4 h-4" />} label="Family Income" value={familyProfile.familyIncome} />
                )}
                {familyProfile.familyValues && (
                  <Detail label="Family Values" value={familyProfile.familyValues} />
                )}
                {familyProfile.contactPerson && (
                  <Detail icon={<Phone className="w-4 h-4" />} label="Contact" value={
                    `${familyProfile.contactPerson}${familyProfile.contactPhone ? ` (${familyProfile.contactPhone})` : ''}`
                  } />
                )}
              </div>

              {familyProfile.aboutFamily && (
                <div className="mt-4">
                  <p className="text-gray-600 leading-relaxed bg-amber-50 rounded-xl p-4 border border-amber-100 text-sm">
                    {familyProfile.aboutFamily}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showShareModal && userId && (
        <ShareModal
          sharedProfileUserId={userId}
          sharedProfileName={`${profile.firstName} ${profile.lastName}`}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

function ShareModal({
  sharedProfileUserId,
  sharedProfileName,
  onClose,
}: {
  sharedProfileUserId: string;
  sharedProfileName: string;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    api.profiles.browse({ search: searchQuery || undefined })
      .then(data => {
        setResults(data.profiles.filter(p => p.userId !== sharedProfileUserId && p.userId !== user?.id));
      })
      .catch(() => {});
  }, [searchQuery, sharedProfileUserId, user?.id]);

  const handleShare = async (toUserId: string) => {
    setSharing(true);
    try {
      await api.family.shareProfile({ toUserId, sharedProfileUserId, message });
      setShared(prev => new Set(prev).add(toUserId));
    } catch {}
    setSharing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary-500" /> Share Profile
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Share <span className="font-medium text-gray-700">{sharedProfileName}'s</span> profile with another family
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search families by name, profession, or location..."
            className="input-field mt-4"
          />

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. I think this match could be great for your family!"
              className="input-field text-sm"
              maxLength={200}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {results.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No families found</p>
          ) : (
            results.map(p => (
              <div key={p.userId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt={p.firstName} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-sm font-bold">
                    {p.firstName[0]}{p.lastName?.[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm">{p.firstName} {p.lastName}</div>
                  <div className="text-xs text-gray-400">{p.profession} &middot; {p.location}</div>
                </div>
                {shared.has(p.userId) ? (
                  <span className="text-xs text-green-600 font-medium px-3 py-1.5 bg-green-50 rounded-lg">Shared</span>
                ) : (
                  <button
                    onClick={() => handleShare(p.userId)}
                    disabled={sharing}
                    className="text-xs font-medium px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                  >
                    Share
                  </button>
                )}
              </div>
            ))
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
