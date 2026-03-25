import { useNavigate } from 'react-router-dom';
import {
  Heart, Edit, Users, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  FamilyProfileContent,
  ProfileAttributeSections,
  ProfileAvatar,
  ProfileHighlights,
  ProfileNarrativeSections,
  getProfileFullName,
  getProfileSubtitle,
  hasFamilyProfileContent,
} from '../components/profile/ProfileSections';
import { EmptyState } from '../components/shared';

export default function MyProfile() {
  const { profile, familyProfile, user } = useAuth();
  const navigate = useNavigate();

  if (!profile?.firstName) {
    return (
      <EmptyState
        icon={<Heart className="w-16 h-16 text-primary-300" />}
        title="Profile Not Set Up"
        subtitle="Complete your profile to start finding matches"
        action={
          <button onClick={() => navigate('/build-profile')} className="btn-primary">
            Build Profile
          </button>
        }
        className="min-h-[60vh] flex flex-col items-center justify-center p-8"
      />
    );
  }

  const subtitle = getProfileSubtitle(profile, user?.email);
  const hasFamilyContent = hasFamilyProfileContent(familyProfile);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 h-32 sm:h-40" />

        <div className="px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="flex flex-col gap-6 -mt-16 sm:flex-row sm:items-end">
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

                <div className="flex justify-center sm:justify-end">
                  <button
                    onClick={() => navigate('/build-profile')}
                    className="btn-primary flex items-center gap-2 whitespace-nowrap"
                  >
                    <Edit className="w-4 h-4" /> Edit Profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          <ProfileHighlights profile={profile} />

          <ProfileAttributeSections profile={profile} />
          <ProfileNarrativeSections profile={profile} />
        </div>
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-5 sm:px-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-white">
            <Users className="w-6 h-6" />
            <h2 className="text-xl font-bold">Family Profile</h2>
          </div>
          <button
            onClick={() => navigate('/family-profile')}
            className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl
                       flex items-center justify-center gap-2 hover:bg-white/30 transition-all text-sm font-medium self-start sm:self-auto"
          >
            {familyProfile?.fatherName || familyProfile?.motherName ? (
              <><Edit className="w-4 h-4" /> Edit</>
            ) : (
              <>Add <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
        <div className="px-4 py-6 sm:px-8">
          {familyProfile && hasFamilyContent ? (
            <FamilyProfileContent familyProfile={familyProfile} />
          ) : (
            <EmptyState
              icon={<Users className="w-10 h-10 text-amber-300" />}
              title="No family profile added yet"
              subtitle="Adding family details helps other families learn about yours"
              className="py-6"
            />
          )}
        </div>
      </div>
    </div>
  );
}
