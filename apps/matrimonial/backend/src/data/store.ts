import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { sampleFamilies, sampleUsers } from './sampleData.js';

export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface Profile {
  userId: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  age: number;
  religion: string;
  motherTongue: string;
  height: number;
  education: string;
  profession: string;
  company: string;
  salaryRange: string;
  location: string;
  state: string;
  country: string;
  bio: string;
  interests: string[];
  photoUrl: string;
  maritalStatus: string;
  familyType: string;
  diet: string;
  smoking: string;
  drinking: string;
  lookingFor: string;
  createdAt: string;
  updatedAt: string;
}

export interface Interest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface FamilyProfile {
  userId: string;
  fatherName: string;
  fatherOccupation: string;
  motherName: string;
  motherOccupation: string;
  siblings: string;
  familyIncome: string;
  familyValues: string;
  aboutFamily: string;
  contactPerson: string;
  contactPhone: string;
  familyLocation: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedProfile {
  id: string;
  fromUserId: string;
  toUserId: string;
  sharedProfileUserId: string;
  message: string;
  status: 'pending' | 'viewed' | 'interested' | 'declined';
  createdAt: string;
}

export interface Shortlist {
  id: string;
  userId: string;
  shortlistedUserId: string;
  note: string;
  createdAt: string;
}

export interface Recommendation {
  recommendedUserId: string;
  score: number;
  matchPercentage: number;
  reasons: string[];
  generatedAt: string;
}

export interface RecommendationBatch {
  generatedAt: string;
  basedOnHistory: boolean;
  shortlistedSignals: number;
  interestSignals: number;
  recommendations: Recommendation[];
}

export interface BrowseFilters {
  gender?: string;
  minAge?: number;
  maxAge?: number;
  religion?: string;
  profession?: string;
  salaryRange?: string;
  location?: string;
  education?: string;
  maritalStatus?: string;
  diet?: string;
  motherTongue?: string;
  search?: string;
}

export interface BrowseResult {
  profiles: Array<Profile & { matchPercentage: number }>;
  total: number;
  page: number;
  pageSize: number;
}

type WeightMaps = {
  religionWeights: Map<string, number>;
  motherTongueWeights: Map<string, number>;
  stateWeights: Map<string, number>;
  locationWeights: Map<string, number>;
  educationWeights: Map<string, number>;
  professionWeights: Map<string, number>;
  salaryWeights: Map<string, number>;
  dietWeights: Map<string, number>;
  familyTypeWeights: Map<string, number>;
  maritalStatusWeights: Map<string, number>;
  interestWeights: Map<string, number>;
  preferredAge: number | null;
  preferredHeight: number | null;
};

type UserRow = QueryResultRow & {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  last_active_at: string;
};

type ProfileRow = QueryResultRow & {
  user_id: string;
  first_name: string;
  last_name: string;
  gender: Profile['gender'];
  date_of_birth: string;
  age: number;
  religion: string;
  mother_tongue: string;
  height: number;
  education: string;
  profession: string;
  company: string;
  salary_range: string;
  location: string;
  state: string;
  country: string;
  bio: string;
  interests: string[] | null;
  photo_url: string;
  marital_status: string;
  family_type: string;
  diet: string;
  smoking: string;
  drinking: string;
  looking_for: string;
  created_at: string;
  updated_at: string;
};

type FamilyProfileRow = QueryResultRow & {
  user_id: string;
  father_name: string;
  father_occupation: string;
  mother_name: string;
  mother_occupation: string;
  siblings: string;
  family_income: string;
  family_values: string;
  about_family: string;
  contact_person: string;
  contact_phone: string;
  family_location: string;
  created_at: string;
  updated_at: string;
};

type InterestRow = QueryResultRow & {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: Interest['status'];
  created_at: string;
};

type SharedProfileRow = QueryResultRow & {
  id: string;
  from_user_id: string;
  to_user_id: string;
  shared_profile_user_id: string;
  message: string;
  status: SharedProfile['status'];
  created_at: string;
};

type ShortlistRow = QueryResultRow & {
  id: string;
  user_id: string;
  shortlisted_user_id: string;
  note: string;
  created_at: string;
};

type RecommendationBatchRow = QueryResultRow & {
  user_id: string;
  generated_at: string;
  based_on_history: boolean;
  shortlisted_signals: number;
  interest_signals: number;
  recommendations: Recommendation[];
};

const DEFAULT_DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/matrimonial';
const DEFAULT_BROWSE_PAGE_SIZE = 24;
const MAX_BROWSE_PAGE_SIZE = 48;
const SEARCH_VECTOR_SQL = `profile_search_vector(p.first_name, p.last_name, p.profession, p.location, p.bio)`;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users ((lower(email)));

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT 'other',
  date_of_birth date NOT NULL DEFAULT '1970-01-01',
  age integer NOT NULL DEFAULT 0,
  religion text NOT NULL DEFAULT '',
  mother_tongue text NOT NULL DEFAULT '',
  height integer NOT NULL DEFAULT 0,
  education text NOT NULL DEFAULT '',
  profession text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  salary_range text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  interests text[] NOT NULL DEFAULT ARRAY[]::text[],
  photo_url text NOT NULL DEFAULT '',
  marital_status text NOT NULL DEFAULT '',
  family_type text NOT NULL DEFAULT '',
  diet text NOT NULL DEFAULT '',
  smoking text NOT NULL DEFAULT '',
  drinking text NOT NULL DEFAULT '',
  looking_for text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_gender_age ON profiles (gender, age);
CREATE INDEX IF NOT EXISTS idx_profiles_religion ON profiles (religion);
CREATE INDEX IF NOT EXISTS idx_profiles_mother_tongue ON profiles (mother_tongue);
CREATE INDEX IF NOT EXISTS idx_profiles_salary_range ON profiles (salary_range);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles (location);
CREATE INDEX IF NOT EXISTS idx_profiles_state ON profiles (state);
CREATE INDEX IF NOT EXISTS idx_profiles_education ON profiles (education);
CREATE INDEX IF NOT EXISTS idx_profiles_marital_status ON profiles (marital_status);
CREATE INDEX IF NOT EXISTS idx_profiles_diet ON profiles (diet);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_interests_gin ON profiles USING GIN (interests);

CREATE OR REPLACE FUNCTION profile_search_vector(fname text, lname text, prof text, loc text, bio_text text)
RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$SELECT to_tsvector('simple', coalesce(fname,'') || ' ' || coalesce(lname,'') || ' ' || coalesce(prof,'') || ' ' || coalesce(loc,'') || ' ' || coalesce(bio_text,''))$$;

CREATE INDEX IF NOT EXISTS idx_profiles_search_vector ON profiles USING GIN (profile_search_vector(first_name, last_name, profession, location, bio));

CREATE TABLE IF NOT EXISTS family_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  father_name text NOT NULL DEFAULT '',
  father_occupation text NOT NULL DEFAULT '',
  mother_name text NOT NULL DEFAULT '',
  mother_occupation text NOT NULL DEFAULT '',
  siblings text NOT NULL DEFAULT '',
  family_income text NOT NULL DEFAULT '',
  family_values text NOT NULL DEFAULT '',
  about_family text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  family_location text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY,
  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_interests_from_user ON interests (from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interests_to_user ON interests (to_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shared_profiles (
  id uuid PRIMARY KEY,
  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_profile_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id, shared_profile_user_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_profiles_from_user ON shared_profiles (from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_profiles_to_user ON shared_profiles (to_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shortlists (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shortlisted_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, shortlisted_user_id)
);

CREATE INDEX IF NOT EXISTS idx_shortlists_user ON shortlists (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS recommendation_batches (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL,
  based_on_history boolean NOT NULL,
  shortlisted_signals integer NOT NULL,
  interest_signals integer NOT NULL,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb
);
`;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  ssl: process.env.DATABASE_SSL === 'disable'
    ? false
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
});

let initialized = false;

function computeAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function normalizeValue(value?: string): string {
  return value?.trim().toLowerCase() ?? '';
}

function incrementValueCount(map: Map<string, number>, value?: string) {
  const key = normalizeValue(value);
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function incrementInterestCounts(map: Map<string, number>, values?: string[]) {
  if (!values?.length) return;
  const seen = new Set<string>();
  for (const value of values) {
    const key = normalizeValue(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
}

function addReason(reasons: Map<string, number>, reason: string, points: number) {
  if (points <= 0) return;
  reasons.set(reason, (reasons.get(reason) ?? 0) + points);
}

function scoreValuePreference(
  candidateValue: string | undefined,
  weights: Map<string, number>,
  multiplier: number,
  reason: string,
  reasons: Map<string, number>,
): number {
  const key = normalizeValue(candidateValue);
  const weight = key ? (weights.get(key) ?? 0) : 0;
  if (!weight) return 0;
  const points = weight * multiplier;
  addReason(reasons, reason, points);
  return points;
}

function average(numbers: number[]): number | null {
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function getDayKey(value: string): string {
  return value.slice(0, 10);
}

function isActiveWithinWindow(lastActiveAt: string, now: Date, hours: number): boolean {
  const activeAt = new Date(lastActiveAt).getTime();
  return Number.isFinite(activeAt) && (now.getTime() - activeAt) <= hours * 60 * 60 * 1000;
}

function calculateMatchPercentage(myProfile: Profile | undefined, profile: Profile): number {
  if (!myProfile) return 50;

  let matchScore = 0;
  let factors = 0;

  if (myProfile.religion) {
    factors += 15;
    if (profile.religion === myProfile.religion) matchScore += 15;
  }
  if (myProfile.motherTongue) {
    factors += 10;
    if (profile.motherTongue === myProfile.motherTongue) matchScore += 10;
  }
  if (myProfile.location || myProfile.state) {
    factors += 10;
    if (myProfile.location && profile.location === myProfile.location) matchScore += 10;
    else if (myProfile.state && profile.state === myProfile.state) matchScore += 5;
  }
  if (myProfile.education) {
    factors += 10;
    if (profile.education === myProfile.education) matchScore += 10;
  }
  if (myProfile.diet) {
    factors += 5;
    if (profile.diet === myProfile.diet) matchScore += 5;
  }
  if (myProfile.interests?.length) {
    factors += 20;
    const common = myProfile.interests.filter((interest) => profile.interests.includes(interest));
    matchScore += Math.min(common.length * 5, 20);
  }
  if (myProfile.familyType) {
    factors += 5;
    if (profile.familyType === myProfile.familyType) matchScore += 5;
  }

  factors += 25;
  matchScore += 25;

  return factors > 0 ? Math.min(Math.round((matchScore / factors) * 100), 99) : 50;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    password: row.password_hash,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at,
  };
}

function toProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    age: row.age,
    religion: row.religion,
    motherTongue: row.mother_tongue,
    height: row.height,
    education: row.education,
    profession: row.profession,
    company: row.company,
    salaryRange: row.salary_range,
    location: row.location,
    state: row.state,
    country: row.country,
    bio: row.bio,
    interests: row.interests ?? [],
    photoUrl: row.photo_url,
    maritalStatus: row.marital_status,
    familyType: row.family_type,
    diet: row.diet,
    smoking: row.smoking,
    drinking: row.drinking,
    lookingFor: row.looking_for,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toFamilyProfile(row: FamilyProfileRow): FamilyProfile {
  return {
    userId: row.user_id,
    fatherName: row.father_name,
    fatherOccupation: row.father_occupation,
    motherName: row.mother_name,
    motherOccupation: row.mother_occupation,
    siblings: row.siblings,
    familyIncome: row.family_income,
    familyValues: row.family_values,
    aboutFamily: row.about_family,
    contactPerson: row.contact_person,
    contactPhone: row.contact_phone,
    familyLocation: row.family_location,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInterest(row: InterestRow): Interest {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

function toSharedProfile(row: SharedProfileRow): SharedProfile {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    sharedProfileUserId: row.shared_profile_user_id,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

function toShortlist(row: ShortlistRow): Shortlist {
  return {
    id: row.id,
    userId: row.user_id,
    shortlistedUserId: row.shortlisted_user_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

function getRecommendationPreferences(preferenceProfiles: Profile[]): WeightMaps {
  const religionWeights = new Map<string, number>();
  const motherTongueWeights = new Map<string, number>();
  const stateWeights = new Map<string, number>();
  const locationWeights = new Map<string, number>();
  const educationWeights = new Map<string, number>();
  const professionWeights = new Map<string, number>();
  const salaryWeights = new Map<string, number>();
  const dietWeights = new Map<string, number>();
  const familyTypeWeights = new Map<string, number>();
  const maritalStatusWeights = new Map<string, number>();
  const interestWeights = new Map<string, number>();
  const agePreferences: number[] = [];
  const heightPreferences: number[] = [];

  for (const profile of preferenceProfiles) {
    incrementValueCount(religionWeights, profile.religion);
    incrementValueCount(motherTongueWeights, profile.motherTongue);
    incrementValueCount(stateWeights, profile.state);
    incrementValueCount(locationWeights, profile.location);
    incrementValueCount(educationWeights, profile.education);
    incrementValueCount(professionWeights, profile.profession);
    incrementValueCount(salaryWeights, profile.salaryRange);
    incrementValueCount(dietWeights, profile.diet);
    incrementValueCount(familyTypeWeights, profile.familyType);
    incrementValueCount(maritalStatusWeights, profile.maritalStatus);
    incrementInterestCounts(interestWeights, profile.interests);

    if (profile.age > 0) agePreferences.push(profile.age);
    if (profile.height > 0) heightPreferences.push(profile.height);
  }

  return {
    religionWeights,
    motherTongueWeights,
    stateWeights,
    locationWeights,
    educationWeights,
    professionWeights,
    salaryWeights,
    dietWeights,
    familyTypeWeights,
    maritalStatusWeights,
    interestWeights,
    preferredAge: average(agePreferences),
    preferredHeight: average(heightPreferences),
  };
}

function buildRecommendationReasons(candidate: Profile, preferences: WeightMaps) {
  const reasons = new Map<string, number>();
  let score = 0;

  score += scoreValuePreference(candidate.religion, preferences.religionWeights, 7, 'Matches preferred religion', reasons);
  score += scoreValuePreference(candidate.motherTongue, preferences.motherTongueWeights, 6, 'Matches preferred mother tongue', reasons);
  score += scoreValuePreference(candidate.state, preferences.stateWeights, 5, 'Comes from a preferred state', reasons);
  score += scoreValuePreference(candidate.location, preferences.locationWeights, 5, 'Lives in a location you engage with', reasons);
  score += scoreValuePreference(candidate.education, preferences.educationWeights, 5, 'Fits the education patterns in your activity', reasons);
  score += scoreValuePreference(candidate.profession, preferences.professionWeights, 4, 'Matches professions you respond to', reasons);
  score += scoreValuePreference(candidate.salaryRange, preferences.salaryWeights, 4, 'Aligns with salary ranges in your activity', reasons);
  score += scoreValuePreference(candidate.diet, preferences.dietWeights, 3, 'Has a familiar lifestyle preference', reasons);
  score += scoreValuePreference(candidate.familyType, preferences.familyTypeWeights, 3, 'Matches family setup you prefer', reasons);
  score += scoreValuePreference(candidate.maritalStatus, preferences.maritalStatusWeights, 3, 'Shares a preferred marital status', reasons);

  if (preferences.interestWeights.size > 0 && candidate.interests.length > 0) {
    const matchedInterests = candidate.interests.filter((interest) => preferences.interestWeights.has(normalizeValue(interest)));
    if (matchedInterests.length > 0) {
      const interestPoints = Math.min(
        matchedInterests.reduce(
          (sum, interest) => sum + Math.min((preferences.interestWeights.get(normalizeValue(interest)) ?? 0) * 3, 6),
          0,
        ),
        18,
      );
      score += interestPoints;
      addReason(reasons, 'Shares interests with profiles you liked', interestPoints);
    }
  }

  if (preferences.preferredAge != null && candidate.age > 0) {
    const ageDifference = Math.abs(candidate.age - preferences.preferredAge);
    if (ageDifference <= 2) {
      score += 10;
      addReason(reasons, 'Falls within your recent age preference', 10);
    } else if (ageDifference <= 4) {
      score += 6;
      addReason(reasons, 'Close to the age range you engage with', 6);
    } else if (ageDifference <= 7) {
      score += 3;
      addReason(reasons, 'Near your usual age range', 3);
    }
  }

  if (preferences.preferredHeight != null && candidate.height > 0) {
    const heightDifference = Math.abs(candidate.height - preferences.preferredHeight);
    if (heightDifference <= 4) {
      score += 4;
      addReason(reasons, 'Close to your recent height preference', 4);
    } else if (heightDifference <= 8) {
      score += 2;
      addReason(reasons, 'Within the height range you engage with', 2);
    }
  }

  const topReasons = [...reasons.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason]) => reason);

  return { score, reasons: topReasons };
}

function buildWeightedCaseExpression(
  columnRef: string,
  weights: Map<string, number>,
  multiplier: number,
  params: unknown[],
): string {
  if (weights.size === 0) return '0';

  const clauses = [...weights.entries()].map(([value, weight]) => {
    params.push(value);
    return `WHEN lower(coalesce(${columnRef}, '')) = $${params.length} THEN ${weight * multiplier}`;
  });

  return `(CASE ${clauses.join(' ')} ELSE 0 END)`;
}

function buildInterestScoreExpression(weights: Map<string, number>, params: unknown[]): string {
  if (weights.size === 0) return '0';

  const clauses = [...weights.entries()].map(([value, weight]) => {
    params.push(value);
    return `WHEN lower(interest) = $${params.length} THEN ${Math.min(weight * 3, 6)}`;
  });

  return `LEAST(COALESCE((SELECT SUM(CASE ${clauses.join(' ')} ELSE 0 END) FROM unnest(coalesce(p.interests, ARRAY[]::text[])) AS interest), 0), 18)`;
}

function buildRecommendationScoreExpression(preferences: WeightMaps, params: unknown[]): string {
  const parts = [
    buildWeightedCaseExpression('p.religion', preferences.religionWeights, 7, params),
    buildWeightedCaseExpression('p.mother_tongue', preferences.motherTongueWeights, 6, params),
    buildWeightedCaseExpression('p.state', preferences.stateWeights, 5, params),
    buildWeightedCaseExpression('p.location', preferences.locationWeights, 5, params),
    buildWeightedCaseExpression('p.education', preferences.educationWeights, 5, params),
    buildWeightedCaseExpression('p.profession', preferences.professionWeights, 4, params),
    buildWeightedCaseExpression('p.salary_range', preferences.salaryWeights, 4, params),
    buildWeightedCaseExpression('p.diet', preferences.dietWeights, 3, params),
    buildWeightedCaseExpression('p.family_type', preferences.familyTypeWeights, 3, params),
    buildWeightedCaseExpression('p.marital_status', preferences.maritalStatusWeights, 3, params),
    buildInterestScoreExpression(preferences.interestWeights, params),
  ];

  if (preferences.preferredAge != null) {
    params.push(preferences.preferredAge);
    const preferredAgeParam = `$${params.length}`;
    parts.push(`CASE
      WHEN p.age > 0 AND abs(p.age - ${preferredAgeParam}) <= 2 THEN 10
      WHEN p.age > 0 AND abs(p.age - ${preferredAgeParam}) <= 4 THEN 6
      WHEN p.age > 0 AND abs(p.age - ${preferredAgeParam}) <= 7 THEN 3
      ELSE 0
    END`);
  }

  if (preferences.preferredHeight != null) {
    params.push(preferences.preferredHeight);
    const preferredHeightParam = `$${params.length}`;
    parts.push(`CASE
      WHEN p.height > 0 AND abs(p.height - ${preferredHeightParam}) <= 4 THEN 4
      WHEN p.height > 0 AND abs(p.height - ${preferredHeightParam}) <= 8 THEN 2
      ELSE 0
    END`);
  }

  return parts.join(' + ');
}

function buildBrowseWhere(filters: BrowseFilters, params: unknown[]): string {
  const conditions = ['p.user_id <> $1'];

  if (filters.gender) {
    params.push(filters.gender);
    conditions.push(`p.gender = $${params.length}`);
  }
  if (filters.minAge != null) {
    params.push(filters.minAge);
    conditions.push(`p.age >= $${params.length}`);
  }
  if (filters.maxAge != null) {
    params.push(filters.maxAge);
    conditions.push(`p.age <= $${params.length}`);
  }
  if (filters.religion) {
    params.push(filters.religion.toLowerCase());
    conditions.push(`lower(p.religion) = $${params.length}`);
  }
  if (filters.profession) {
    params.push(`%${filters.profession.toLowerCase()}%`);
    conditions.push(`lower(p.profession) LIKE $${params.length}`);
  }
  if (filters.salaryRange) {
    params.push(filters.salaryRange);
    conditions.push(`p.salary_range = $${params.length}`);
  }
  if (filters.location) {
    params.push(`%${filters.location.toLowerCase()}%`);
    conditions.push(`lower(p.location) LIKE $${params.length}`);
  }
  if (filters.education) {
    params.push(`%${filters.education.toLowerCase()}%`);
    conditions.push(`lower(p.education) LIKE $${params.length}`);
  }
  if (filters.maritalStatus) {
    params.push(filters.maritalStatus.toLowerCase());
    conditions.push(`lower(p.marital_status) = $${params.length}`);
  }
  if (filters.diet) {
    params.push(filters.diet.toLowerCase());
    conditions.push(`lower(p.diet) = $${params.length}`);
  }
  if (filters.motherTongue) {
    params.push(filters.motherTongue.toLowerCase());
    conditions.push(`lower(p.mother_tongue) = $${params.length}`);
  }
  if (filters.search?.trim()) {
    params.push(filters.search.trim());
    conditions.push(`${SEARCH_VECTOR_SQL} @@ plainto_tsquery('simple', $${params.length})`);
  }

  return conditions.join(' AND ');
}

function buildMatchPercentageSql(): string {
  const sharedInterestScore = `
    COALESCE(
      (
        SELECT LEAST(COUNT(*) * 5, 20)
        FROM unnest(coalesce(mp.interests, ARRAY[]::text[])) AS my_interest
        INNER JOIN unnest(coalesce(p.interests, ARRAY[]::text[])) AS candidate_interest
          ON my_interest = candidate_interest
      ),
      0
    )
  `;

  return `CASE
    WHEN mp.user_id IS NULL THEN 50
    ELSE LEAST(
      99,
      ROUND(
        (
          (
            CASE WHEN coalesce(mp.religion, '') <> '' AND p.religion = mp.religion THEN 15 ELSE 0 END +
            CASE WHEN coalesce(mp.mother_tongue, '') <> '' AND p.mother_tongue = mp.mother_tongue THEN 10 ELSE 0 END +
            CASE
              WHEN (coalesce(mp.location, '') <> '' OR coalesce(mp.state, '') <> '') AND coalesce(mp.location, '') <> '' AND p.location = mp.location THEN 10
              WHEN (coalesce(mp.location, '') <> '' OR coalesce(mp.state, '') <> '') AND coalesce(mp.state, '') <> '' AND p.state = mp.state THEN 5
              ELSE 0
            END +
            CASE WHEN coalesce(mp.education, '') <> '' AND p.education = mp.education THEN 10 ELSE 0 END +
            CASE WHEN coalesce(mp.diet, '') <> '' AND p.diet = mp.diet THEN 5 ELSE 0 END +
            ${sharedInterestScore} +
            CASE WHEN coalesce(mp.family_type, '') <> '' AND p.family_type = mp.family_type THEN 5 ELSE 0 END +
            25
          )::numeric /
          NULLIF(
            (
              CASE WHEN coalesce(mp.religion, '') <> '' THEN 15 ELSE 0 END +
              CASE WHEN coalesce(mp.mother_tongue, '') <> '' THEN 10 ELSE 0 END +
              CASE WHEN coalesce(mp.location, '') <> '' OR coalesce(mp.state, '') <> '' THEN 10 ELSE 0 END +
              CASE WHEN coalesce(mp.education, '') <> '' THEN 10 ELSE 0 END +
              CASE WHEN coalesce(mp.diet, '') <> '' THEN 5 ELSE 0 END +
              CASE WHEN cardinality(coalesce(mp.interests, ARRAY[]::text[])) > 0 THEN 20 ELSE 0 END +
              CASE WHEN coalesce(mp.family_type, '') <> '' THEN 5 ELSE 0 END +
              25
            ),
            0
          )
        ) * 100
      )
    )
  END::int`;
}

function normalizeProfileInput(existing: Profile | undefined, data: Partial<Omit<Profile, 'userId' | 'createdAt' | 'updatedAt'>>): Omit<Profile, 'userId'> {
  const now = new Date().toISOString();
  const nextDateOfBirth = data.dateOfBirth ?? existing?.dateOfBirth ?? '1970-01-01';
  const nextAge = data.dateOfBirth ? computeAge(data.dateOfBirth) : data.age ?? existing?.age ?? 0;

  return {
    firstName: data.firstName ?? existing?.firstName ?? '',
    lastName: data.lastName ?? existing?.lastName ?? '',
    gender: data.gender ?? existing?.gender ?? 'other',
    dateOfBirth: nextDateOfBirth,
    age: nextAge,
    religion: data.religion ?? existing?.religion ?? '',
    motherTongue: data.motherTongue ?? existing?.motherTongue ?? '',
    height: data.height ?? existing?.height ?? 0,
    education: data.education ?? existing?.education ?? '',
    profession: data.profession ?? existing?.profession ?? '',
    company: data.company ?? existing?.company ?? '',
    salaryRange: data.salaryRange ?? existing?.salaryRange ?? '',
    location: data.location ?? existing?.location ?? '',
    state: data.state ?? existing?.state ?? '',
    country: data.country ?? existing?.country ?? '',
    bio: data.bio ?? existing?.bio ?? '',
    interests: data.interests ?? existing?.interests ?? [],
    photoUrl: data.photoUrl ?? existing?.photoUrl ?? '',
    maritalStatus: data.maritalStatus ?? existing?.maritalStatus ?? '',
    familyType: data.familyType ?? existing?.familyType ?? '',
    diet: data.diet ?? existing?.diet ?? '',
    smoking: data.smoking ?? existing?.smoking ?? '',
    drinking: data.drinking ?? existing?.drinking ?? '',
    lookingFor: data.lookingFor ?? existing?.lookingFor ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function normalizeFamilyProfileInput(
  existing: FamilyProfile | undefined,
  data: Partial<Omit<FamilyProfile, 'userId' | 'createdAt' | 'updatedAt'>>,
): Omit<FamilyProfile, 'userId'> {
  const now = new Date().toISOString();
  return {
    fatherName: data.fatherName ?? existing?.fatherName ?? '',
    fatherOccupation: data.fatherOccupation ?? existing?.fatherOccupation ?? '',
    motherName: data.motherName ?? existing?.motherName ?? '',
    motherOccupation: data.motherOccupation ?? existing?.motherOccupation ?? '',
    siblings: data.siblings ?? existing?.siblings ?? '',
    familyIncome: data.familyIncome ?? existing?.familyIncome ?? '',
    familyValues: data.familyValues ?? existing?.familyValues ?? '',
    aboutFamily: data.aboutFamily ?? existing?.aboutFamily ?? '',
    contactPerson: data.contactPerson ?? existing?.contactPerson ?? '',
    contactPhone: data.contactPhone ?? existing?.contactPhone ?? '',
    familyLocation: data.familyLocation ?? existing?.familyLocation ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

async function query<T extends QueryResultRow>(text: string, params?: unknown[]) {
  return pool.query<T>(text, params);
}

async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function seedData() {
  const existingUsers = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
  if (Number(existingUsers.rows[0]?.count ?? '0') > 0) return;

  await withTransaction(async (client) => {
    const userIds: string[] = [];

    for (const user of sampleUsers) {
      const id = uuid();
      const now = new Date().toISOString();
      const hashedPassword = bcrypt.hashSync(user.password, 10);
      userIds.push(id);

      await client.query(
        `INSERT INTO users (id, email, password_hash, created_at, last_active_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, user.email, hashedPassword, now, now],
      );

      await client.query(
        `INSERT INTO profiles (
          user_id, first_name, last_name, gender, date_of_birth, age, religion, mother_tongue,
          height, education, profession, company, salary_range, location, state, country, bio,
          interests, photo_url, marital_status, family_type, diet, smoking, drinking, looking_for,
          created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25,
          $26, $27
        )`,
        [
          id,
          user.firstName,
          user.lastName,
          user.gender,
          user.dob,
          computeAge(user.dob),
          user.religion,
          user.motherTongue,
          user.height,
          user.education,
          user.profession,
          user.company,
          user.salaryRange,
          user.location,
          user.state,
          user.country,
          user.bio,
          user.interests,
          user.photoUrl,
          user.maritalStatus,
          user.familyType,
          user.diet,
          user.smoking,
          user.drinking,
          user.lookingFor,
          now,
          now,
        ],
      );
    }

    const now = new Date().toISOString();
    for (let i = 0; i < sampleFamilies.length; i++) {
      const family = sampleFamilies[i];
      await client.query(
        `INSERT INTO family_profiles (
          user_id, father_name, father_occupation, mother_name, mother_occupation, siblings,
          family_income, family_values, about_family, contact_person, contact_phone, family_location,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          userIds[i],
          family.fatherName,
          family.fatherOccupation,
          family.motherName,
          family.motherOccupation,
          family.siblings,
          family.familyIncome,
          family.familyValues,
          family.aboutFamily,
          family.contactPerson,
          family.contactPhone,
          family.familyLocation,
          now,
          now,
        ],
      );
    }
  });
}

async function saveRecommendationBatch(userId: string, batch: RecommendationBatch) {
  await query(
    `INSERT INTO recommendation_batches (
      user_id, generated_at, based_on_history, shortlisted_signals, interest_signals, recommendations
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    ON CONFLICT (user_id) DO UPDATE SET
      generated_at = EXCLUDED.generated_at,
      based_on_history = EXCLUDED.based_on_history,
      shortlisted_signals = EXCLUDED.shortlisted_signals,
      interest_signals = EXCLUDED.interest_signals,
      recommendations = EXCLUDED.recommendations`,
    [
      userId,
      batch.generatedAt,
      batch.basedOnHistory,
      batch.shortlistedSignals,
      batch.interestSignals,
      JSON.stringify(batch.recommendations),
    ],
  );
}

async function buildRecommendationBatch(userId: string, now: Date = new Date()): Promise<RecommendationBatch> {
  const myProfile = await store.getProfile(userId);
  const [shortlistProfiles, interestProfiles] = await Promise.all([
    query<ProfileRow>(
      `SELECT p.* FROM shortlists s
       INNER JOIN profiles p ON p.user_id = s.shortlisted_user_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [userId],
    ),
    query<ProfileRow>(
      `SELECT p.* FROM interests i
       INNER JOIN profiles p ON p.user_id = i.to_user_id
       WHERE i.from_user_id = $1
       ORDER BY i.created_at DESC`,
      [userId],
    ),
  ]);

  const shortlistedProfiles = shortlistProfiles.rows.map(toProfile);
  const interestedProfiles = interestProfiles.rows.map(toProfile);
  const historyProfiles = [...shortlistedProfiles, ...interestedProfiles];
  const preferenceProfiles = historyProfiles.length > 0 ? historyProfiles : (myProfile ? [myProfile] : []);

  if (preferenceProfiles.length === 0) {
    return {
      generatedAt: now.toISOString(),
      basedOnHistory: false,
      shortlistedSignals: shortlistedProfiles.length,
      interestSignals: interestedProfiles.length,
      recommendations: [],
    };
  }

  const preferences = getRecommendationPreferences(preferenceProfiles);
  const excludedUserIds = Array.from(new Set([
    userId,
    ...shortlistedProfiles.map((profile) => profile.userId),
    ...interestedProfiles.map((profile) => profile.userId),
  ]));

  const params: unknown[] = [excludedUserIds];
  const scoreExpression = buildRecommendationScoreExpression(preferences, params);
  params.push(18);

  const candidateRows = await query<ProfileRow & { recommendation_score: number }>(
    `SELECT p.*, (${scoreExpression})::int AS recommendation_score
     FROM profiles p
     WHERE NOT (p.user_id = ANY($1::uuid[]))
     ORDER BY recommendation_score DESC, p.updated_at DESC
     LIMIT $${params.length}`,
    params,
  );

  const generatedAt = now.toISOString();
  const recommendations = candidateRows.rows
    .map((row) => {
      const profile = toProfile(row);
      const scored = buildRecommendationReasons(profile, preferences);
      return {
        recommendedUserId: profile.userId,
        score: scored.score,
        matchPercentage: calculateMatchPercentage(myProfile ?? undefined, profile),
        reasons: scored.reasons,
        generatedAt,
      };
    })
    .filter((recommendation) => recommendation.score > 0 || recommendation.matchPercentage >= 60)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.matchPercentage - a.matchPercentage;
    })
    .slice(0, 6);

  return {
    generatedAt,
    basedOnHistory: historyProfiles.length > 0,
    shortlistedSignals: shortlistedProfiles.length,
    interestSignals: interestedProfiles.length,
    recommendations,
  };
}

export const store = {
  async initialize() {
    if (initialized) return;
    await pool.query(SCHEMA_SQL);
    await seedData();
    initialized = true;
  },

  async findUserByEmail(email: string): Promise<User | undefined> {
    const result = await query<UserRow>(
      'SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1',
      [email],
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  },

  async createUser(email: string, password: string): Promise<User> {
    const id = uuid();
    const hashedPassword = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const result = await query<UserRow>(
      `INSERT INTO users (id, email, password_hash, created_at, last_active_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, email, hashedPassword, now, now],
    );

    return toUser(result.rows[0]);
  },

  async getUser(id: string): Promise<User | undefined> {
    const result = await query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  },

  async markUserActive(userId: string): Promise<User | undefined> {
    const result = await query<UserRow>(
      `UPDATE users
       SET last_active_at = now()
       WHERE id = $1
       RETURNING *`,
      [userId],
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  },

  async getProfile(userId: string): Promise<Profile | undefined> {
    const result = await query<ProfileRow>('SELECT * FROM profiles WHERE user_id = $1 LIMIT 1', [userId]);
    return result.rows[0] ? toProfile(result.rows[0]) : undefined;
  },

  async upsertProfile(
    userId: string,
    data: Partial<Omit<Profile, 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Profile> {
    const existing = await store.getProfile(userId);
    const profile = normalizeProfileInput(existing, data);

    const result = await query<ProfileRow>(
      `INSERT INTO profiles (
        user_id, first_name, last_name, gender, date_of_birth, age, religion, mother_tongue,
        height, education, profession, company, salary_range, location, state, country, bio,
        interests, photo_url, marital_status, family_type, diet, smoking, drinking, looking_for,
        created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25,
        $26, $27
      )
      ON CONFLICT (user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        gender = EXCLUDED.gender,
        date_of_birth = EXCLUDED.date_of_birth,
        age = EXCLUDED.age,
        religion = EXCLUDED.religion,
        mother_tongue = EXCLUDED.mother_tongue,
        height = EXCLUDED.height,
        education = EXCLUDED.education,
        profession = EXCLUDED.profession,
        company = EXCLUDED.company,
        salary_range = EXCLUDED.salary_range,
        location = EXCLUDED.location,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        bio = EXCLUDED.bio,
        interests = EXCLUDED.interests,
        photo_url = EXCLUDED.photo_url,
        marital_status = EXCLUDED.marital_status,
        family_type = EXCLUDED.family_type,
        diet = EXCLUDED.diet,
        smoking = EXCLUDED.smoking,
        drinking = EXCLUDED.drinking,
        looking_for = EXCLUDED.looking_for,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      [
        userId,
        profile.firstName,
        profile.lastName,
        profile.gender,
        profile.dateOfBirth,
        profile.age,
        profile.religion,
        profile.motherTongue,
        profile.height,
        profile.education,
        profile.profession,
        profile.company,
        profile.salaryRange,
        profile.location,
        profile.state,
        profile.country,
        profile.bio,
        profile.interests,
        profile.photoUrl,
        profile.maritalStatus,
        profile.familyType,
        profile.diet,
        profile.smoking,
        profile.drinking,
        profile.lookingFor,
        profile.createdAt,
        profile.updatedAt,
      ],
    );

    return toProfile(result.rows[0]);
  },

  async getAllProfiles(excludeUserId?: string): Promise<Profile[]> {
    const result = excludeUserId
      ? await query<ProfileRow>('SELECT * FROM profiles WHERE user_id <> $1 ORDER BY updated_at DESC', [excludeUserId])
      : await query<ProfileRow>('SELECT * FROM profiles ORDER BY updated_at DESC');
    return result.rows.map(toProfile);
  },

  async browseProfiles(
    userId: string,
    filters: BrowseFilters,
    page = 1,
    pageSize = DEFAULT_BROWSE_PAGE_SIZE,
  ): Promise<BrowseResult> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), MAX_BROWSE_PAGE_SIZE);
    const offset = (safePage - 1) * safePageSize;

    const params: unknown[] = [userId];
    const whereSql = buildBrowseWhere(filters, params);
    const matchPercentageSql = buildMatchPercentageSql();

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM profiles p
       WHERE ${whereSql}`,
      params,
    );

    params.push(safePageSize, offset);
    const pageSizeParam = `$${params.length - 1}`;
    const offsetParam = `$${params.length}`;

    const results = await query<ProfileRow & { match_percentage: number }>(
      `WITH my_profile AS (
        SELECT * FROM profiles WHERE user_id = $1 LIMIT 1
      )
      SELECT p.*, ${matchPercentageSql} AS match_percentage
      FROM profiles p
      LEFT JOIN my_profile mp ON TRUE
      WHERE ${whereSql}
      ORDER BY match_percentage DESC, p.updated_at DESC
      LIMIT ${pageSizeParam} OFFSET ${offsetParam}`,
      params,
    );

    return {
      profiles: results.rows.map((row) => ({ ...toProfile(row), matchPercentage: row.match_percentage })),
      total: Number(countResult.rows[0]?.count ?? '0'),
      page: safePage,
      pageSize: safePageSize,
    };
  },

  async sendInterest(fromUserId: string, toUserId: string): Promise<Interest> {
    const existing = await query<InterestRow>(
      'SELECT * FROM interests WHERE from_user_id = $1 AND to_user_id = $2 LIMIT 1',
      [fromUserId, toUserId],
    );
    if (existing.rows[0]) return toInterest(existing.rows[0]);

    const result = await query<InterestRow>(
      `INSERT INTO interests (id, from_user_id, to_user_id, status, created_at)
       VALUES ($1, $2, $3, 'pending', $4)
       RETURNING *`,
      [uuid(), fromUserId, toUserId, new Date().toISOString()],
    );
    return toInterest(result.rows[0]);
  },

  async getInterests(userId: string): Promise<{ sent: Interest[]; received: Interest[] }> {
    const [sent, received] = await Promise.all([
      query<InterestRow>('SELECT * FROM interests WHERE from_user_id = $1 ORDER BY created_at DESC', [userId]),
      query<InterestRow>('SELECT * FROM interests WHERE to_user_id = $1 ORDER BY created_at DESC', [userId]),
    ]);
    return {
      sent: sent.rows.map(toInterest),
      received: received.rows.map(toInterest),
    };
  },

  async updateInterestStatus(interestId: string, status: 'accepted' | 'declined'): Promise<Interest | undefined> {
    const result = await query<InterestRow>(
      `UPDATE interests
       SET status = $2
       WHERE id = $1
       RETURNING *`,
      [interestId, status],
    );
    return result.rows[0] ? toInterest(result.rows[0]) : undefined;
  },

  async getFamilyProfile(userId: string): Promise<FamilyProfile | undefined> {
    const result = await query<FamilyProfileRow>('SELECT * FROM family_profiles WHERE user_id = $1 LIMIT 1', [userId]);
    return result.rows[0] ? toFamilyProfile(result.rows[0]) : undefined;
  },

  async upsertFamilyProfile(
    userId: string,
    data: Partial<Omit<FamilyProfile, 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<FamilyProfile> {
    const existing = await store.getFamilyProfile(userId);
    const familyProfile = normalizeFamilyProfileInput(existing, data);

    const result = await query<FamilyProfileRow>(
      `INSERT INTO family_profiles (
        user_id, father_name, father_occupation, mother_name, mother_occupation, siblings,
        family_income, family_values, about_family, contact_person, contact_phone, family_location,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (user_id) DO UPDATE SET
        father_name = EXCLUDED.father_name,
        father_occupation = EXCLUDED.father_occupation,
        mother_name = EXCLUDED.mother_name,
        mother_occupation = EXCLUDED.mother_occupation,
        siblings = EXCLUDED.siblings,
        family_income = EXCLUDED.family_income,
        family_values = EXCLUDED.family_values,
        about_family = EXCLUDED.about_family,
        contact_person = EXCLUDED.contact_person,
        contact_phone = EXCLUDED.contact_phone,
        family_location = EXCLUDED.family_location,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      [
        userId,
        familyProfile.fatherName,
        familyProfile.fatherOccupation,
        familyProfile.motherName,
        familyProfile.motherOccupation,
        familyProfile.siblings,
        familyProfile.familyIncome,
        familyProfile.familyValues,
        familyProfile.aboutFamily,
        familyProfile.contactPerson,
        familyProfile.contactPhone,
        familyProfile.familyLocation,
        familyProfile.createdAt,
        familyProfile.updatedAt,
      ],
    );

    return toFamilyProfile(result.rows[0]);
  },

  async shareProfile(fromUserId: string, toUserId: string, sharedProfileUserId: string, message: string): Promise<SharedProfile> {
    const existing = await query<SharedProfileRow>(
      `SELECT * FROM shared_profiles
       WHERE from_user_id = $1 AND to_user_id = $2 AND shared_profile_user_id = $3
       LIMIT 1`,
      [fromUserId, toUserId, sharedProfileUserId],
    );
    if (existing.rows[0]) return toSharedProfile(existing.rows[0]);

    const result = await query<SharedProfileRow>(
      `INSERT INTO shared_profiles (
        id, from_user_id, to_user_id, shared_profile_user_id, message, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, 'pending', $6)
      RETURNING *`,
      [uuid(), fromUserId, toUserId, sharedProfileUserId, message || '', new Date().toISOString()],
    );
    return toSharedProfile(result.rows[0]);
  },

  async getSharedProfiles(userId: string): Promise<{ sent: SharedProfile[]; received: SharedProfile[] }> {
    const [sent, received] = await Promise.all([
      query<SharedProfileRow>('SELECT * FROM shared_profiles WHERE from_user_id = $1 ORDER BY created_at DESC', [userId]),
      query<SharedProfileRow>('SELECT * FROM shared_profiles WHERE to_user_id = $1 ORDER BY created_at DESC', [userId]),
    ]);
    return {
      sent: sent.rows.map(toSharedProfile),
      received: received.rows.map(toSharedProfile),
    };
  },

  async updateSharedProfileStatus(id: string, status: SharedProfile['status']): Promise<SharedProfile | undefined> {
    const result = await query<SharedProfileRow>(
      `UPDATE shared_profiles
       SET status = $2
       WHERE id = $1
       RETURNING *`,
      [id, status],
    );
    return result.rows[0] ? toSharedProfile(result.rows[0]) : undefined;
  },

  async addShortlist(userId: string, shortlistedUserId: string, note: string): Promise<Shortlist> {
    const existing = await query<ShortlistRow>(
      `SELECT * FROM shortlists
       WHERE user_id = $1 AND shortlisted_user_id = $2
       LIMIT 1`,
      [userId, shortlistedUserId],
    );

    if (existing.rows[0]) {
      const updated = await query<ShortlistRow>(
        `UPDATE shortlists
         SET note = $3
         WHERE user_id = $1 AND shortlisted_user_id = $2
         RETURNING *`,
        [userId, shortlistedUserId, note || ''],
      );
      return toShortlist(updated.rows[0]);
    }

    const result = await query<ShortlistRow>(
      `INSERT INTO shortlists (id, user_id, shortlisted_user_id, note, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuid(), userId, shortlistedUserId, note || '', new Date().toISOString()],
    );
    return toShortlist(result.rows[0]);
  },

  async removeShortlist(userId: string, shortlistedUserId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM shortlists
       WHERE user_id = $1 AND shortlisted_user_id = $2`,
      [userId, shortlistedUserId],
    );
    return (result.rowCount ?? 0) > 0;
  },

  async getShortlist(userId: string): Promise<Shortlist[]> {
    const result = await query<ShortlistRow>(
      'SELECT * FROM shortlists WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return result.rows.map(toShortlist);
  },

  async isShortlisted(userId: string, shortlistedUserId: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM shortlists WHERE user_id = $1 AND shortlisted_user_id = $2
      ) AS exists`,
      [userId, shortlistedUserId],
    );
    return Boolean(result.rows[0]?.exists);
  },

  async getShortlistedUserIds(userId: string): Promise<Set<string>> {
    const result = await query<{ shortlisted_user_id: string }>(
      'SELECT shortlisted_user_id FROM shortlists WHERE user_id = $1',
      [userId],
    );
    return new Set(result.rows.map((row) => row.shortlisted_user_id));
  },

  async refreshRecommendationsForActiveUsers(): Promise<number> {
    const activeUsers = await query<UserRow>('SELECT * FROM users');
    const now = new Date();
    let refreshed = 0;

    for (const user of activeUsers.rows.map(toUser)) {
      if (!isActiveWithinWindow(user.lastActiveAt, now, 24)) continue;
      const batch = await buildRecommendationBatch(user.id, now);
      await saveRecommendationBatch(user.id, batch);
      refreshed++;
    }

    return refreshed;
  },

  async getRecommendationsForUser(userId: string): Promise<RecommendationBatch> {
    const result = await query<RecommendationBatchRow>(
      'SELECT * FROM recommendation_batches WHERE user_id = $1 LIMIT 1',
      [userId],
    );

    const existing = result.rows[0];
    const today = getDayKey(new Date().toISOString());
    if (existing && getDayKey(existing.generated_at) === today) {
      return {
        generatedAt: existing.generated_at,
        basedOnHistory: existing.based_on_history,
        shortlistedSignals: existing.shortlisted_signals,
        interestSignals: existing.interest_signals,
        recommendations: existing.recommendations ?? [],
      };
    }

    const batch = await buildRecommendationBatch(userId, new Date());
    await saveRecommendationBatch(userId, batch);
    return batch;
  },
};
