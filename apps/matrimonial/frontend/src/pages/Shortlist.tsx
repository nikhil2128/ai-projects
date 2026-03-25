import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark, Trash2, GitCompareArrows, Send, Heart, ArrowLeft,
  MapPin, Briefcase, GraduationCap, Calendar, Ruler, UtensilsCrossed,
  Wine, Cigarette, Users, IndianRupee,
} from 'lucide-react';
import { api } from '../api';
import type { Shortlist as ShortlistType, Profile } from '../types';
import { LoadingSpinner, EmptyState } from '../components/shared';
import { formatHeight } from '../components/profile/ProfileSections';

export default function ShortlistPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ShortlistType[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState(false);

  const fetchShortlist = useCallback(async () => {
    try {
      const data = await api.shortlist.getAll();
      setEntries(data.shortlist);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShortlist(); }, [fetchShortlist]);

  const removeEntry = async (userId: string) => {
    setEntries(prev => prev.filter(e => e.shortlistedUserId !== userId));
    setCompareIds(prev => { const n = new Set(prev); n.delete(userId); return n; });
    try { await api.shortlist.remove(userId); } catch { fetchShortlist(); }
  };

  const toggleCompare = (userId: string) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) { next.delete(userId); }
      else if (next.size < 2) { next.add(userId); }
      return next;
    });
  };

  const sendInterest = async (userId: string, btn: HTMLButtonElement) => {
    btn.disabled = true;
    btn.textContent = 'Sent!';
    try { await api.profiles.sendInterest(userId); } catch {}
  };

  const compareProfiles = entries
    .filter(e => compareIds.has(e.shortlistedUserId) && e.profile)
    .map(e => e.profile!);

  if (loading) return <LoadingSpinner />;

  if (comparing && compareProfiles.length === 2) {
    return (
      <CompareView
        profiles={compareProfiles}
        onBack={() => setComparing(false)}
        onSendInterest={sendInterest}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-display">My Shortlist</h1>
          <p className="text-gray-500 mt-1">
            {entries.length} profile{entries.length !== 1 ? 's' : ''} shortlisted
          </p>
        </div>
        {entries.length >= 2 && (
          <button
            onClick={() => { if (compareIds.size === 2) setComparing(true); }}
            disabled={compareIds.size !== 2}
            className={`flex items-center gap-2 ${
              compareIds.size === 2
                ? 'btn-primary'
                : 'btn-secondary opacity-60 cursor-not-allowed'
            }`}
          >
            <GitCompareArrows className="w-4 h-4" />
            {compareIds.size === 0
              ? 'Select 2 to compare'
              : compareIds.size === 1
              ? 'Select 1 more'
              : 'Compare Selected'}
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="w-16 h-16 text-gray-300" />}
          title="No shortlisted profiles"
          subtitle="Browse profiles and shortlist the ones you like to see them here"
          action={<button onClick={() => navigate('/browse')} className="btn-primary">Browse Profiles</button>}
          className="py-20"
        />
      ) : (
        <div className="space-y-4">
          {entries.map(entry => {
            const p = entry.profile;
            if (!p) return null;
            const selected = compareIds.has(entry.shortlistedUserId);
            return (
              <div
                key={entry.id}
                className={`card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all ${
                  selected ? 'ring-2 ring-primary-400 bg-primary-50/30' : ''
                }`}
              >
                {entries.length >= 2 && (
                  <button
                    onClick={() => toggleCompare(entry.shortlistedUserId)}
                    className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      selected
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : compareIds.size >= 2
                        ? 'border-gray-200 text-transparent cursor-not-allowed'
                        : 'border-gray-300 text-transparent hover:border-primary-400'
                    }`}
                    disabled={!selected && compareIds.size >= 2}
                    title={selected ? 'Deselect' : 'Select for comparison'}
                  >
                    {selected && <GitCompareArrows className="w-3.5 h-3.5" />}
                  </button>
                )}

                <div
                  onClick={() => navigate(`/profile/${p.userId}`)}
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                >
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt={p.firstName} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {p.firstName[0]}{p.lastName?.[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {p.firstName} {p.lastName}
                      <span className="font-normal text-gray-500">, {p.age}</span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                      <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{p.profession}{p.company ? ` at ${p.company}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{p.location}{p.state ? `, ${p.state}` : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 sm:gap-4">
                  <span>{p.education}</span>
                  <span>{p.religion}</span>
                  <span>{p.salaryRange}</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => sendInterest(p.userId, e.currentTarget)}
                    className="btn-primary text-sm flex items-center gap-1.5 py-2 px-3"
                  >
                    <Send className="w-3.5 h-3.5" /> Interest
                  </button>
                  <button
                    onClick={() => removeEntry(entry.shortlistedUserId)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove from shortlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompareView({
  profiles,
  onBack,
  onSendInterest,
}: {
  profiles: [Profile, Profile] | Profile[];
  onBack: () => void;
  onSendInterest: (userId: string, btn: HTMLButtonElement) => void;
}) {
  const navigate = useNavigate();
  const [a, b] = profiles;

  const rows: { label: string; icon: React.ReactNode; keyA: string; keyB: string; highlight?: boolean }[] = [
    { label: 'Age', icon: <Calendar className="w-4 h-4" />, keyA: `${a.age} years`, keyB: `${b.age} years` },
    { label: 'Height', icon: <Ruler className="w-4 h-4" />, keyA: formatHeight(a.height), keyB: formatHeight(b.height) },
    { label: 'Education', icon: <GraduationCap className="w-4 h-4" />, keyA: a.education, keyB: b.education, highlight: true },
    { label: 'Profession', icon: <Briefcase className="w-4 h-4" />, keyA: a.profession, keyB: b.profession, highlight: true },
    { label: 'Company', icon: <Briefcase className="w-4 h-4" />, keyA: a.company || '—', keyB: b.company || '—' },
    { label: 'Salary', icon: <IndianRupee className="w-4 h-4" />, keyA: a.salaryRange || '—', keyB: b.salaryRange || '—', highlight: true },
    { label: 'Location', icon: <MapPin className="w-4 h-4" />, keyA: `${a.location}${a.state ? `, ${a.state}` : ''}`, keyB: `${b.location}${b.state ? `, ${b.state}` : ''}` },
    { label: 'Religion', icon: <Heart className="w-4 h-4" />, keyA: a.religion, keyB: b.religion },
    { label: 'Mother Tongue', icon: <Users className="w-4 h-4" />, keyA: a.motherTongue, keyB: b.motherTongue },
    { label: 'Marital Status', icon: <Heart className="w-4 h-4" />, keyA: a.maritalStatus || '—', keyB: b.maritalStatus || '—' },
    { label: 'Family Type', icon: <Users className="w-4 h-4" />, keyA: a.familyType || '—', keyB: b.familyType || '—' },
    { label: 'Diet', icon: <UtensilsCrossed className="w-4 h-4" />, keyA: a.diet || '—', keyB: b.diet || '—' },
    { label: 'Smoking', icon: <Cigarette className="w-4 h-4" />, keyA: a.smoking || '—', keyB: b.smoking || '—' },
    { label: 'Drinking', icon: <Wine className="w-4 h-4" />, keyA: a.drinking || '—', keyB: b.drinking || '—' },
  ];

  const commonInterests = a.interests?.filter(i => b.interests?.includes(i)) || [];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Shortlist
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-display flex items-center gap-3">
          <GitCompareArrows className="w-8 h-8 text-primary-500" />
          Compare Profiles
        </h1>
        <p className="text-gray-500 mt-1">Side-by-side comparison to help you decide</p>
      </div>

      <div className="card overflow-hidden">
        {/* Profile headers */}
        <div className="grid grid-cols-[1fr_1fr] sm:grid-cols-[200px_1fr_1fr]">
          <div className="hidden sm:block" />
          {[a, b].map((p) => (
            <div
              key={p.userId}
              className="p-6 text-center border-b border-gray-100 cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => navigate(`/profile/${p.userId}`)}
            >
              {p.photoUrl ? (
                <img
                  src={p.photoUrl}
                  alt={p.firstName}
                  className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-md">
                  {p.firstName[0]}{p.lastName?.[0]}
                </div>
              )}
              <h3 className="font-bold text-gray-900 text-lg">{p.firstName} {p.lastName}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{p.profession}</p>
              <button
                onClick={(e) => { e.stopPropagation(); onSendInterest(p.userId, e.currentTarget); }}
                className="btn-primary text-sm mt-3 py-1.5 px-4 inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Send Interest
              </button>
            </div>
          ))}
        </div>

        {/* Comparison rows */}
        {rows.map((row, idx) => {
          const match = row.keyA === row.keyB && row.keyA !== '—';
          return (
            <div
              key={row.label}
              className={`grid grid-cols-[1fr_1fr] sm:grid-cols-[200px_1fr_1fr] ${
                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              }`}
            >
              <div className="hidden sm:flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-600">
                <span className="text-gray-400">{row.icon}</span>
                {row.label}
              </div>
              {[row.keyA, row.keyB].map((val, i) => (
                <div
                  key={i}
                  className={`px-6 py-3 text-sm text-center ${
                    match ? 'text-green-700 font-medium bg-green-50/50' : 'text-gray-700'
                  }`}
                >
                  <span className="sm:hidden text-xs text-gray-400 block mb-0.5">
                    {row.label}
                  </span>
                  {val || '—'}
                </div>
              ))}
            </div>
          );
        })}

        {/* Interests comparison */}
        <div className="grid grid-cols-[1fr_1fr] sm:grid-cols-[200px_1fr_1fr] border-t border-gray-100">
          <div className="hidden sm:flex items-center gap-2 px-6 py-4 text-sm font-medium text-gray-600">
            <Heart className="w-4 h-4 text-gray-400" />
            Interests
          </div>
          {[a, b].map((p) => (
            <div key={p.userId} className="px-6 py-4">
              <span className="sm:hidden text-xs text-gray-400 block mb-1.5">Interests</span>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {p.interests?.map(interest => (
                  <span
                    key={interest}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      commonInterests.includes(interest)
                        ? 'bg-green-100 text-green-700 ring-1 ring-green-200'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Common interests summary */}
        {commonInterests.length > 0 && (
          <div className="bg-green-50 border-t border-green-100 px-6 py-4 text-center">
            <span className="text-sm text-green-700 font-medium">
              {commonInterests.length} common interest{commonInterests.length !== 1 ? 's' : ''}:
            </span>
            <span className="text-sm text-green-600 ml-2">
              {commonInterests.join(', ')}
            </span>
          </div>
        )}

        {/* Bio comparison */}
        <div className="grid grid-cols-[1fr_1fr] sm:grid-cols-[200px_1fr_1fr] border-t border-gray-100">
          <div className="hidden sm:flex items-center gap-2 px-6 py-4 text-sm font-medium text-gray-600">
            About
          </div>
          {[a, b].map((p) => (
            <div key={p.userId} className="px-6 py-4">
              <span className="sm:hidden text-xs text-gray-400 block mb-1.5">About</span>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                {p.bio || '—'}
              </p>
            </div>
          ))}
        </div>

        {/* Looking for comparison */}
        <div className="grid grid-cols-[1fr_1fr] sm:grid-cols-[200px_1fr_1fr] bg-gray-50/50 border-t border-gray-100">
          <div className="hidden sm:flex items-center gap-2 px-6 py-4 text-sm font-medium text-gray-600">
            Looking For
          </div>
          {[a, b].map((p) => (
            <div key={p.userId} className="px-6 py-4">
              <span className="sm:hidden text-xs text-gray-400 block mb-1.5">Looking For</span>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                {p.lookingFor || '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
