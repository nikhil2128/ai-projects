import type { ReactNode } from 'react';
import {
  Briefcase,
  Calendar,
  Cigarette,
  GraduationCap,
  Heart,
  IndianRupee,
  MapPin,
  Phone,
  Ruler,
  Users,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import type { FamilyProfile, Profile } from '../../types';

const EMPTY_VALUE = '—';

type ProfileIdentity = Pick<Profile, 'firstName' | 'lastName' | 'profession' | 'company'>;
type ProfileLocation = Pick<Profile, 'location' | 'state'>;
type DetailConfig = {
  label: string;
  value?: string | null;
  icon?: LucideIcon;
};

interface ProfileAvatarProps {
  profile: Pick<Profile, 'firstName' | 'lastName' | 'photoUrl'>;
  className?: string;
  initialsClassName?: string;
}

interface ProfileNarrativeSectionsProps {
  profile: Pick<Profile, 'bio' | 'lookingFor' | 'interests'>;
  aboutTitle?: string;
}

interface FamilyProfileContentProps {
  familyProfile: FamilyProfile;
  showIncome?: boolean;
  locationLabel?: string;
  valuesLabel?: string;
  detailGridClassName?: string;
  aboutFamilyClassName?: string;
}

export function formatHeight(height?: number | null) {
  if (!height) {
    return EMPTY_VALUE;
  }

  const feet = Math.floor(height / 30.48);
  const inches = Math.round((height % 30.48) / 2.54);

  return `${feet}'${inches}"`;
}

export function getProfileInitials(profile: Pick<Profile, 'firstName' | 'lastName'>) {
  return `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}` || '?';
}

export function getProfileFullName(profile: Pick<Profile, 'firstName' | 'lastName'>) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ');
}

export function getProfileSubtitle(profile: ProfileIdentity, fallback?: string | null) {
  if (profile.profession && profile.company) {
    return `${profile.profession} at ${profile.company}`;
  }

  return profile.profession || profile.company || fallback || EMPTY_VALUE;
}

export function getProfileLocation({ location, state }: ProfileLocation) {
  return [location, state].filter(Boolean).join(', ') || EMPTY_VALUE;
}

export function hasFamilyProfileContent(familyProfile?: FamilyProfile | null) {
  return Boolean(familyProfile?.fatherName || familyProfile?.motherName);
}

export function ProfileAvatar({
  profile,
  className = 'w-32 h-32 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-gray-200 flex-shrink-0',
  initialsClassName = 'text-3xl',
}: ProfileAvatarProps) {
  const fullName = getProfileFullName(profile);

  return (
    <div className={className}>
      {profile.photoUrl ? (
        <img src={profile.photoUrl} alt={fullName} className="w-full h-full object-cover" />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-400 to-accent-400 text-white font-bold ${initialsClassName}`}
        >
          {getProfileInitials(profile)}
        </div>
      )}
    </div>
  );
}

export function ProfileHighlights({ profile }: { profile: Profile }) {
  const stats = [
    { label: 'Age', value: profile.age ? `${profile.age} years` : EMPTY_VALUE, icon: Calendar },
    { label: 'Height', value: formatHeight(profile.height), icon: Ruler },
    { label: 'Location', value: getProfileLocation(profile), icon: MapPin },
    { label: 'Status', value: profile.maritalStatus || EMPTY_VALUE, icon: Heart },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mt-8 sm:grid-cols-4">
      {stats.map(({ label, value, icon }) => (
        <InfoCard key={label} icon={icon} label={label} value={value} />
      ))}
    </div>
  );
}

export function ProfileAttributeSections({ profile }: { profile: Profile }) {
  const sections = [
    {
      title: 'Education & Career',
      items: [
        { label: 'Education', value: profile.education, icon: GraduationCap },
        { label: 'Profession', value: profile.profession, icon: Briefcase },
        { label: 'Company', value: profile.company },
        { label: 'Salary', value: profile.salaryRange, icon: IndianRupee },
      ],
    },
    {
      title: 'Personal Details',
      items: [
        { label: 'Religion', value: profile.religion },
        { label: 'Mother Tongue', value: profile.motherTongue },
        { label: 'Family Type', value: profile.familyType, icon: Users },
        { label: 'Diet', value: profile.diet, icon: UtensilsCrossed },
        { label: 'Smoking', value: profile.smoking, icon: Cigarette },
        { label: 'Drinking', value: profile.drinking, icon: Wine },
      ],
    },
  ];

  return (
    <div className="grid gap-8 mt-8 sm:grid-cols-2">
      {sections.map(section => (
        <Section key={section.title} title={section.title}>
          {section.items.map(item => (
            <Detail key={item.label} {...item} />
          ))}
        </Section>
      ))}
    </div>
  );
}

export function ProfileNarrativeSections({
  profile,
  aboutTitle = 'About Me',
}: ProfileNarrativeSectionsProps) {
  const contentSections = [
    {
      title: aboutTitle,
      value: profile.bio,
      className: 'bg-gray-50 rounded-xl p-4',
    },
    {
      title: 'Looking For',
      value: profile.lookingFor,
      className: 'bg-primary-50 rounded-xl border border-primary-100 p-4',
    },
  ];

  return (
    <>
      {contentSections.map(section =>
        section.value ? (
          <div key={section.title} className="mt-6 first:mt-8">
            <h3 className="mb-3 text-lg font-semibold text-gray-800">{section.title}</h3>
            <p className={`text-gray-600 leading-relaxed ${section.className}`}>{section.value}</p>
          </div>
        ) : null,
      )}

      {profile.interests?.length ? (
        <div className="mt-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-800">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map(interest => (
              <span
                key={interest}
                className="rounded-full bg-primary-100 px-3 py-1.5 text-sm font-medium text-primary-700"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function FamilyProfileContent({
  familyProfile,
  showIncome = false,
  locationLabel = 'Location',
  valuesLabel = 'Values',
  detailGridClassName = 'grid gap-3 mt-4 sm:grid-cols-2',
  aboutFamilyClassName = 'mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-relaxed text-gray-600',
}: FamilyProfileContentProps) {
  const familyMembers = [
    {
      label: 'Father',
      name: familyProfile.fatherName,
      occupation: familyProfile.fatherOccupation,
    },
    {
      label: 'Mother',
      name: familyProfile.motherName,
      occupation: familyProfile.motherOccupation,
    },
  ].filter(member => member.name);

  const details: DetailConfig[] = [
    { label: 'Siblings', value: familyProfile.siblings },
    { label: locationLabel, value: familyProfile.familyLocation, icon: MapPin },
    ...(showIncome
      ? [{ label: 'Family Income', value: familyProfile.familyIncome, icon: IndianRupee }]
      : []),
    { label: valuesLabel, value: familyProfile.familyValues },
    {
      label: 'Contact',
      value: familyProfile.contactPerson
        ? `${familyProfile.contactPerson}${familyProfile.contactPhone ? ` (${familyProfile.contactPhone})` : ''}`
        : '',
      icon: Phone,
    },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {familyMembers.map(member => (
          <div key={member.label} className="rounded-xl bg-amber-50 p-4">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-600">
              {member.label}
            </div>
            <div className="font-semibold text-gray-800">{member.name}</div>
            {member.occupation ? (
              <div className="mt-0.5 text-sm text-gray-500">{member.occupation}</div>
            ) : null}
          </div>
        ))}
      </div>

      <div className={detailGridClassName}>
        {details.map(detail => (
          <Detail key={detail.label} {...detail} />
        ))}
      </div>

      {familyProfile.aboutFamily ? (
        <p className={aboutFamilyClassName}>{familyProfile.aboutFamily}</p>
      ) : null}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 text-center">
      <div className="mb-2 flex justify-center text-primary-500">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-800">{value || EMPTY_VALUE}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-gray-800">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: DetailConfig) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 w-4 shrink-0 text-gray-400">
        {Icon ? <Icon className="h-4 w-4" /> : null}
      </span>
      <span className="min-w-[100px] shrink-0 text-gray-500">{label}:</span>
      <span className="min-w-0 font-medium text-gray-800">{value}</span>
    </div>
  );
}
