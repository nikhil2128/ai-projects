import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart, ArrowLeft, Users, Send, Loader2, Share2, Bookmark,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Profile, FamilyProfile } from '../types';
import {
  FamilyProfileContent,
  ProfileAttributeSections,
  ProfileAvatar,
  ProfileHighlights,
  ProfileNarrativeSections,
  getProfileFullName,
  getProfileInitials,
  getProfileSubtitle,
  hasFamilyProfileContent,
} from '../components/profile/ProfileSections';
import { LoadingSpinner, EmptyState, Modal } from '../components/shared';

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
  const [shortlisted, setShortlisted] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setFamilyProfile(null);
      setLoading(false);
      return;
    }

    let isActive = true;

    const loadProfile = async () => {
      setLoading(true);

      const [profileResponse, familyResponse, shortlistData] = await Promise.all([
        api.profiles.getProfile(userId).catch(() => null),
        api.family.getFamilyProfile(userId).catch(() => null),
        api.shortlist.getIds().catch(() => ({ shortlistedUserIds: [] as string[] })),
      ]);

      if (!isActive) {
        return;
      }

      setProfile(profileResponse);
      setFamilyProfile(familyResponse);
      setShortlisted(shortlistData.shortlistedUserIds.includes(userId));
      setLoading(false);
    };

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [userId]);

  const toggleShortlist = async () => {
    if (!userId) return;
    const was = shortlisted;
    setShortlisted(!was);
    try {
      if (was) await api.shortlist.remove(userId);
      else await api.shortlist.add(userId);
    } catch {
      setShortlisted(was);
    }
  };

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
    return <LoadingSpinner />;
  }

  if (!profile) {
    return (
      <EmptyState
        icon={<Heart className="w-16 h-16 text-gray-300" />}
        title="Profile not found"
        action={<button onClick={() => navigate('/browse')} className="btn-primary">Back to Browse</button>}
        className="min-h-[60vh] flex flex-col items-center justify-center"
      />
    );
  }

  const isOwnProfile = user?.id === userId;
  const subtitle = getProfileSubtitle(profile);
  const hasFamilyContent = hasFamilyProfileContent(familyProfile);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Back
      </button>

      <div className="card overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-primary-500 to-accent-500 sm:h-40">
          {profile.matchPercentage && (
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl font-bold">
              {profile.matchPercentage}% Match
            </div>
          )}
        </div>

        <div className="px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="relative z-10 -mt-16 flex flex-col gap-6 sm:flex-row sm:items-end">
            <ProfileAvatar
              profile={profile}
              className="mx-auto h-28 w-28 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-gray-200 shadow-xl sm:mx-0 sm:h-32 sm:w-32"
            />

            <div className="flex-1 pt-2 sm:pt-0">
              <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{getProfileFullName(profile)}</h1>
                  <p className="text-gray-500 mt-1">{subtitle}</p>
                </div>
                {!isOwnProfile && (
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                    <button
                      onClick={toggleShortlist}
                      className={`flex items-center gap-2 whitespace-nowrap ${
                        shortlisted ? 'btn-primary' : 'btn-secondary'
                      }`}
                      title={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                    >
                      <Bookmark className="w-4 h-4" fill={shortlisted ? 'currentColor' : 'none'} />
                      {shortlisted ? 'Shortlisted' : 'Shortlist'}
                    </button>
                    <button
                      onClick={sendInterest}
                      disabled={interestSent || sending}
                      className={interestSent ? 'btn-secondary flex items-center gap-2 whitespace-nowrap' : 'btn-primary flex items-center gap-2 whitespace-nowrap'}
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
                      className="btn-secondary flex items-center gap-2 whitespace-nowrap"
                      title="Share this profile with another family"
                    >
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <ProfileHighlights profile={profile} />

          <ProfileAttributeSections profile={profile} />
          <ProfileNarrativeSections profile={profile} aboutTitle="About" />

          {familyProfile && hasFamilyContent && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" /> Family Details
              </h3>
              <FamilyProfileContent
                familyProfile={familyProfile}
                showIncome
                locationLabel="Family Location"
                valuesLabel="Family Values"
                detailGridClassName="grid gap-4 mt-4 sm:grid-cols-2"
              />
            </div>
          )}
        </div>
      </div>

      {userId && (
        <ShareModal
          open={showShareModal}
          sharedProfileUserId={userId}
          sharedProfileName={getProfileFullName(profile)}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

function ShareModal({
  open,
  sharedProfileUserId,
  sharedProfileName,
  onClose,
}: {
  open: boolean;
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
    if (!open) return;
    api.profiles.browse({ search: searchQuery || undefined })
      .then(data => {
        setResults(data.profiles.filter(p => p.userId !== sharedProfileUserId && p.userId !== user?.id));
      })
      .catch(() => {});
  }, [searchQuery, sharedProfileUserId, user?.id, open]);

  const handleShare = async (toUserId: string) => {
    setSharing(true);
    try {
      await api.family.shareProfile({ toUserId, sharedProfileUserId, message });
      setShared(prev => new Set(prev).add(toUserId));
    } catch {}
    setSharing(false);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Header onClose={onClose}>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary-500" /> Share Profile
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Share <span className="font-medium text-gray-700">{sharedProfileName}'s</span> profile with another family
        </p>

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
      </Modal.Header>

      <Modal.Body className="space-y-2">
        {results.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No families found</p>
        ) : (
          results.map(p => (
            <div key={p.userId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              {p.photoUrl ? (
                <img src={p.photoUrl} alt={p.firstName} className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-sm font-bold">
                  {getProfileInitials(p)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 text-sm">{getProfileFullName(p)}</div>
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
      </Modal.Body>
    </Modal>
  );
}
