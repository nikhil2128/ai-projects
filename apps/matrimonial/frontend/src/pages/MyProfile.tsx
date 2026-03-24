import { useNavigate } from 'react-router-dom';
import {
  MapPin, GraduationCap, Briefcase, IndianRupee, Heart, Edit,
  Calendar, Ruler, Users, UtensilsCrossed, Cigarette, Wine, Phone, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MyProfile() {
  const { profile, familyProfile, user } = useAuth();
  const navigate = useNavigate();

  if (!profile?.firstName) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <Heart className="w-16 h-16 text-primary-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Profile Not Set Up</h2>
        <p className="text-gray-500 mb-6">Complete your profile to start finding matches</p>
        <button onClick={() => navigate('/build-profile')} className="btn-primary">
          Build Profile
        </button>
      </div>
    );
  }

  const age = profile.age || '—';
  const heightFt = profile.height ? `${Math.floor(profile.height / 30.48)}'${Math.round((profile.height % 30.48) / 2.54)}"` : '—';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 h-40 relative">
          <button
            onClick={() => navigate('/build-profile')}
            className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl
                       flex items-center gap-2 hover:bg-white/30 transition-all"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </button>
        </div>

        <div className="px-8 pb-8">
          <div className="flex flex-col sm:flex-row gap-6 -mt-16">
            <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-gray-200 flex-shrink-0">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.firstName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-400 to-accent-400 text-white text-3xl font-bold">
                  {profile.firstName[0]}{profile.lastName[0]}
                </div>
              )}
            </div>

            <div className="pt-2 sm:pt-16">
              <h1 className="text-3xl font-bold text-gray-900">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-gray-500 mt-1">{user?.email}</p>
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
              <h3 className="text-lg font-semibold text-gray-800 mb-3">About Me</h3>
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

      <div className="mt-6 card overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Users className="w-6 h-6" />
            <h2 className="text-xl font-bold">Family Profile</h2>
          </div>
          <button
            onClick={() => navigate('/family-profile')}
            className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl
                       flex items-center gap-2 hover:bg-white/30 transition-all text-sm font-medium"
          >
            {familyProfile?.fatherName || familyProfile?.motherName ? (
              <><Edit className="w-4 h-4" /> Edit</>
            ) : (
              <>Add <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
        <div className="px-8 py-6">
          {familyProfile?.fatherName || familyProfile?.motherName ? (
            <div>
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
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {familyProfile.siblings && <Detail label="Siblings" value={familyProfile.siblings} />}
                {familyProfile.familyLocation && <Detail icon={<MapPin className="w-4 h-4" />} label="Location" value={familyProfile.familyLocation} />}
                {familyProfile.familyValues && <Detail label="Values" value={familyProfile.familyValues} />}
                {familyProfile.contactPerson && (
                  <Detail icon={<Phone className="w-4 h-4" />} label="Contact" value={
                    `${familyProfile.contactPerson}${familyProfile.contactPhone ? ` (${familyProfile.contactPhone})` : ''}`
                  } />
                )}
              </div>
              {familyProfile.aboutFamily && (
                <p className="mt-4 text-sm text-gray-600 leading-relaxed bg-amber-50 rounded-xl p-4 border border-amber-100">
                  {familyProfile.aboutFamily}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="w-10 h-10 text-amber-300 mx-auto mb-3" />
              <p className="text-gray-500">No family profile added yet</p>
              <p className="text-sm text-gray-400 mt-1">Adding family details helps other families learn about yours</p>
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
