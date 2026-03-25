export interface User {
  id: string;
  email: string;
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
  matchPercentage?: number;
}

export interface Interest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  profile?: Profile;
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
  fromProfile?: Profile;
  fromFamily?: FamilyProfile;
  toProfile?: Profile;
  toFamily?: FamilyProfile;
  sharedProfile?: Profile;
}

export interface Shortlist {
  id: string;
  userId: string;
  shortlistedUserId: string;
  note: string;
  createdAt: string;
  profile?: Profile;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface BrowseFilters {
  gender: string;
  minAge: string;
  maxAge: string;
  religion: string;
  profession: string;
  salaryRange: string;
  location: string;
  education: string;
  maritalStatus: string;
  diet: string;
  motherTongue: string;
  search: string;
}

export const SALARY_RANGES = [
  '5-10 LPA',
  '10-20 LPA',
  '15-25 LPA',
  '20-35 LPA',
  '25-50 LPA',
  '30-50 LPA',
  '40-60 LPA',
  '50+ LPA',
];

export const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];

export const EDUCATION_LEVELS = [
  'High School', 'Diploma', 'B.Tech', 'B.Sc', 'B.Com', 'BA', 'BFA', 'BBA',
  'MBBS', 'BDS', 'LLB', 'CA', 'M.Tech', 'M.Sc', 'MBA', 'MD', 'Ph.D', 'Other',
];

export const PROFESSIONS = [
  'Software Engineer', 'Doctor', 'Lawyer', 'Chartered Accountant', 'Business Analyst',
  'Product Manager', 'Data Scientist', 'Research Scientist', 'Fashion Designer',
  'Teacher', 'Professor', 'Civil Engineer', 'Architect', 'Banker', 'Consultant',
  'Startup Founder', 'Government Employee', 'Defence', 'Other',
];

export const MOTHER_TONGUES = [
  'Hindi', 'English', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu',
  'Gujarati', 'Malayalam', 'Kannada', 'Punjabi', 'Odia', 'Other',
];

export const FAMILY_VALUES_LIST = ['Traditional', 'Moderate', 'Liberal'];

export const FAMILY_INCOME_RANGES = [
  '5-10 LPA', '10-20 LPA', '20-30 LPA', '25-40 LPA', '30-50 LPA',
  '40-60 LPA', '50-80 LPA', '80+ LPA', '1 Cr+',
];

export const INTERESTS_LIST = [
  'Travel', 'Reading', 'Music', 'Cooking', 'Fitness', 'Yoga', 'Photography',
  'Painting', 'Dancing', 'Movies', 'Cricket', 'Hiking', 'Gaming', 'Writing',
  'Volunteering', 'Fashion', 'Art', 'Food', 'Coding', 'Startups', 'AI/ML',
  'Astronomy', 'Board Games', 'Trekking', 'Running', 'Classical Music',
  'Coffee', 'Philosophy', 'Baking', 'Strategy Games', 'EdTech', 'Finance',
  'Law', 'Space', 'Swimming', 'Cycling',
];
