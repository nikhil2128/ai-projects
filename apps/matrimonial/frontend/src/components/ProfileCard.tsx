import { useNavigate } from 'react-router-dom';
import { MapPin, Briefcase, GraduationCap, Heart } from 'lucide-react';
import type { Profile } from '../types';

interface Props {
  profile: Profile;
}

export default function ProfileCard({ profile }: Props) {
  const navigate = useNavigate();

  const heightFt = profile.height
    ? `${Math.floor(profile.height / 30.48)}'${Math.round((profile.height % 30.48) / 2.54)}"`
    : null;

  return (
    <div
      onClick={() => navigate(`/profile/${profile.userId}`)}
      className="card cursor-pointer group overflow-hidden hover:-translate-y-1"
    >
      <div className="relative h-56 overflow-hidden">
        {profile.photoUrl ? (
          <img
            src={profile.photoUrl}
            alt={profile.firstName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-400 to-accent-400 text-white text-5xl font-bold">
            {profile.firstName[0]}{profile.lastName?.[0]}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {profile.matchPercentage != null && (
          <div className="absolute top-3 right-3">
            <div className={`
              px-3 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm
              ${profile.matchPercentage >= 70
                ? 'bg-green-500/80 text-white'
                : profile.matchPercentage >= 50
                ? 'bg-yellow-500/80 text-white'
                : 'bg-gray-500/80 text-white'
              }
            `}>
              <Heart className="w-3.5 h-3.5 inline mr-1 -mt-0.5" fill="currentColor" />
              {profile.matchPercentage}%
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-4 right-4 text-white">
          <h3 className="text-xl font-bold">
            {profile.firstName} {profile.lastName}
            <span className="text-lg font-normal opacity-80">, {profile.age}</span>
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">{profile.profession} {profile.company ? `at ${profile.company}` : ''}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <GraduationCap className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{profile.education}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{profile.location}{profile.state ? `, ${profile.state}` : ''}</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
          {heightFt && <span>{heightFt}</span>}
          <span>{profile.religion}</span>
          <span>{profile.motherTongue}</span>
          {profile.salaryRange && <span>{profile.salaryRange}</span>}
        </div>

        {profile.interests?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {profile.interests.slice(0, 3).map(interest => (
              <span key={interest} className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs font-medium">
                {interest}
              </span>
            ))}
            {profile.interests.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                +{profile.interests.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
