import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Share2, Inbox, Send, Eye, ThumbsUp, ThumbsDown,
  Loader2, Users, MapPin, Briefcase, Clock, ChevronDown, ChevronUp,
} from 'lucide-react';
import { api } from '../api';
import type { SharedProfile } from '../types';

export default function SharedProfiles() {
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [received, setReceived] = useState<SharedProfile[]>([]);
  const [sent, setSent] = useState<SharedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.family.getSharedProfiles()
      .then(data => {
        setReceived(data.received);
        setSent(data.sent);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStatusUpdate = async (id: string, status: 'viewed' | 'interested' | 'declined') => {
    try {
      await api.family.updateSharedProfileStatus(id, status);
      setReceived(prev => prev.map(sp => sp.id === id ? { ...sp, status } : sp));
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Share2 className="w-8 h-8 text-primary-500" />
          Shared Profiles
        </h1>
        <p className="text-gray-500 mt-2">Profiles shared between families</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('received')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'received'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Received ({received.length})
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'sent'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Send className="w-4 h-4" />
          Sent ({sent.length})
        </button>
      </div>

      {tab === 'received' && (
        <div className="space-y-4">
          {received.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-12 h-12 text-gray-300" />}
              title="No profiles received yet"
              subtitle="When another family shares a profile with you, it will appear here"
            />
          ) : (
            received.map(sp => (
              <SharedProfileCard
                key={sp.id}
                sp={sp}
                direction="received"
                onViewProfile={(userId) => navigate(`/profile/${userId}`)}
                onStatusUpdate={handleStatusUpdate}
              />
            ))
          )}
        </div>
      )}

      {tab === 'sent' && (
        <div className="space-y-4">
          {sent.length === 0 ? (
            <EmptyState
              icon={<Send className="w-12 h-12 text-gray-300" />}
              title="No profiles shared yet"
              subtitle="Share interesting profiles with other families from the profile detail page"
            />
          ) : (
            sent.map(sp => (
              <SharedProfileCard
                key={sp.id}
                sp={sp}
                direction="sent"
                onViewProfile={(userId) => navigate(`/profile/${userId}`)}
                onStatusUpdate={handleStatusUpdate}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SharedProfileCard({
  sp,
  direction,
  onViewProfile,
  onStatusUpdate,
}: {
  sp: SharedProfile;
  direction: 'sent' | 'received';
  onViewProfile: (userId: string) => void;
  onStatusUpdate: (id: string, status: 'viewed' | 'interested' | 'declined') => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sharedProfile = sp.sharedProfile;
  const otherParty = direction === 'received' ? sp.fromProfile : sp.toProfile;
  const otherFamily = direction === 'received' ? sp.fromFamily : sp.toFamily;

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    viewed: 'bg-blue-100 text-blue-700',
    interested: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
  };

  return (
    <div className="card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {sharedProfile?.photoUrl ? (
            <img
              src={sharedProfile.photoUrl}
              alt={sharedProfile.firstName}
              className="w-16 h-16 rounded-xl object-cover cursor-pointer hover:ring-2 ring-primary-300 transition-all"
              onClick={() => onViewProfile(sp.sharedProfileUserId)}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xl font-bold cursor-pointer hover:ring-2 ring-primary-300 transition-all"
              onClick={() => onViewProfile(sp.sharedProfileUserId)}
            >
              {sharedProfile?.firstName?.[0]}{sharedProfile?.lastName?.[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => onViewProfile(sp.sharedProfileUserId)}
                >
                  {sharedProfile?.firstName} {sharedProfile?.lastName}
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  {sharedProfile?.profession}{sharedProfile?.company ? ` at ${sharedProfile.company}` : ''}
                </p>
                {sharedProfile?.location && (
                  <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" /> {sharedProfile.location}, {sharedProfile.state}
                  </p>
                )}
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[sp.status]}`}>
                {sp.status}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              {direction === 'received' ? 'Shared by' : 'Shared with'}{' '}
              <span className="font-medium text-gray-600">
                {otherParty?.firstName} {otherParty?.lastName}'s family
              </span>
              <span>&middot;</span>
              {new Date(sp.createdAt).toLocaleDateString()}
            </div>

            {sp.message && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">
                "{sp.message}"
              </div>
            )}
          </div>
        </div>

        {otherFamily && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 mt-3 font-medium transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            {direction === 'received' ? "Sender's" : "Recipient's"} family details
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}

        {expanded && otherFamily && (
          <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {otherFamily.fatherName && (
                <div>
                  <span className="text-amber-600 text-xs font-medium">Father:</span>
                  <span className="ml-2 text-gray-800">{otherFamily.fatherName}</span>
                  {otherFamily.fatherOccupation && (
                    <span className="text-gray-500"> ({otherFamily.fatherOccupation})</span>
                  )}
                </div>
              )}
              {otherFamily.motherName && (
                <div>
                  <span className="text-amber-600 text-xs font-medium">Mother:</span>
                  <span className="ml-2 text-gray-800">{otherFamily.motherName}</span>
                  {otherFamily.motherOccupation && (
                    <span className="text-gray-500"> ({otherFamily.motherOccupation})</span>
                  )}
                </div>
              )}
              {otherFamily.familyLocation && (
                <div>
                  <span className="text-amber-600 text-xs font-medium">Location:</span>
                  <span className="ml-2 text-gray-800">{otherFamily.familyLocation}</span>
                </div>
              )}
              {otherFamily.familyValues && (
                <div>
                  <span className="text-amber-600 text-xs font-medium">Values:</span>
                  <span className="ml-2 text-gray-800">{otherFamily.familyValues}</span>
                </div>
              )}
            </div>
            {otherFamily.aboutFamily && (
              <p className="mt-2 text-sm text-gray-600 italic">{otherFamily.aboutFamily}</p>
            )}
          </div>
        )}

        {direction === 'received' && sp.status === 'pending' && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => onViewProfile(sp.sharedProfileUserId)}
              className="btn-secondary text-sm flex items-center gap-1.5 flex-1"
            >
              <Eye className="w-4 h-4" /> View Profile
            </button>
            <button
              onClick={() => onStatusUpdate(sp.id, 'interested')}
              className="btn-primary text-sm flex items-center gap-1.5 flex-1"
            >
              <ThumbsUp className="w-4 h-4" /> Interested
            </button>
            <button
              onClick={() => onStatusUpdate(sp.id, 'declined')}
              className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 flex-1 justify-center transition-colors"
            >
              <ThumbsDown className="w-4 h-4" /> Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="text-center py-16">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
