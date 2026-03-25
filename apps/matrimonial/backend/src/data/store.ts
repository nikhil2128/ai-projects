import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: string;
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
  height: number; // in cm
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

const users: Map<string, User> = new Map();
const profiles: Map<string, Profile> = new Map();
const interests: Map<string, Interest> = new Map();
const familyProfiles: Map<string, FamilyProfile> = new Map();
const sharedProfiles: Map<string, SharedProfile> = new Map();
const shortlists: Map<string, Shortlist> = new Map();

function computeAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function seedData() {
  const sampleUsers = [
    { email: 'priya@example.com', password: 'password123', firstName: 'Priya', lastName: 'Sharma', gender: 'female' as const, dob: '1996-03-15', religion: 'Hindu', motherTongue: 'Hindi', height: 163, education: 'MBA', profession: 'Product Manager', company: 'Google', salaryRange: '25-50 LPA', location: 'Bangalore', state: 'Karnataka', country: 'India', bio: 'Passionate about technology and traveling. Love exploring new cultures and cuisines. Looking for someone who shares my enthusiasm for life.', interests: ['Travel', 'Reading', 'Yoga', 'Cooking'], photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', maritalStatus: 'Never Married', familyType: 'Nuclear', diet: 'Vegetarian', smoking: 'No', drinking: 'Occasionally', lookingFor: 'Life partner who values family and ambition equally' },
    { email: 'rahul@example.com', password: 'password123', firstName: 'Rahul', lastName: 'Mehta', gender: 'male' as const, dob: '1994-07-22', religion: 'Hindu', motherTongue: 'Gujarati', height: 178, education: 'B.Tech', profession: 'Software Engineer', company: 'Microsoft', salaryRange: '30-50 LPA', location: 'Hyderabad', state: 'Telangana', country: 'India', bio: 'Software engineer with a passion for open source. Weekend guitarist and avid cricket fan. Believe in keeping things simple and meaningful.', interests: ['Music', 'Cricket', 'Coding', 'Photography'], photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', maritalStatus: 'Never Married', familyType: 'Joint', diet: 'Non-Vegetarian', smoking: 'No', drinking: 'No', lookingFor: 'Someone kind, intelligent and with a good sense of humor' },
    { email: 'ananya@example.com', password: 'password123', firstName: 'Ananya', lastName: 'Reddy', gender: 'female' as const, dob: '1997-11-08', religion: 'Hindu', motherTongue: 'Telugu', height: 160, education: 'MBBS', profession: 'Doctor', company: 'Apollo Hospitals', salaryRange: '15-25 LPA', location: 'Chennai', state: 'Tamil Nadu', country: 'India', bio: 'Doctor by profession, artist by heart. I paint during weekends and volunteer at local shelters. Looking for a compassionate partner.', interests: ['Painting', 'Volunteering', 'Movies', 'Dancing'], photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', maritalStatus: 'Never Married', familyType: 'Nuclear', diet: 'Vegetarian', smoking: 'No', drinking: 'No', lookingFor: 'A caring and understanding life partner' },
    { email: 'arjun@example.com', password: 'password123', firstName: 'Arjun', lastName: 'Singh', gender: 'male' as const, dob: '1993-01-30', religion: 'Sikh', motherTongue: 'Punjabi', height: 182, education: 'CA', profession: 'Chartered Accountant', company: 'Deloitte', salaryRange: '20-35 LPA', location: 'Delhi', state: 'Delhi', country: 'India', bio: 'Finance professional who loves to travel and explore offbeat places. Fitness enthusiast and amateur chef. Family-oriented with modern values.', interests: ['Fitness', 'Travel', 'Cooking', 'Finance'], photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', maritalStatus: 'Never Married', familyType: 'Joint', diet: 'Non-Vegetarian', smoking: 'No', drinking: 'Occasionally', lookingFor: 'Someone who is family-oriented yet independent' },
    { email: 'sneha@example.com', password: 'password123', firstName: 'Sneha', lastName: 'Patel', gender: 'female' as const, dob: '1995-06-12', religion: 'Hindu', motherTongue: 'Gujarati', height: 158, education: 'M.Tech', profession: 'Data Scientist', company: 'Amazon', salaryRange: '30-50 LPA', location: 'Pune', state: 'Maharashtra', country: 'India', bio: 'Data scientist who loves crunching numbers by day and stargazing by night. Passionate about AI and its potential to change the world.', interests: ['AI/ML', 'Astronomy', 'Hiking', 'Board Games'], photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', maritalStatus: 'Never Married', familyType: 'Nuclear', diet: 'Vegetarian', smoking: 'No', drinking: 'No', lookingFor: 'An intellectual partner who loves deep conversations' },
    { email: 'vikram@example.com', password: 'password123', firstName: 'Vikram', lastName: 'Iyer', gender: 'male' as const, dob: '1992-09-05', religion: 'Hindu', motherTongue: 'Tamil', height: 175, education: 'MBA', profession: 'Business Analyst', company: 'McKinsey', salaryRange: '40-60 LPA', location: 'Mumbai', state: 'Maharashtra', country: 'India', bio: 'Strategy consultant who enjoys solving complex problems. Marathon runner and classical music lover. Looking for a partner to build a beautiful life with.', interests: ['Running', 'Classical Music', 'Strategy Games', 'Reading'], photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', maritalStatus: 'Never Married', familyType: 'Nuclear', diet: 'Vegetarian', smoking: 'No', drinking: 'Socially', lookingFor: 'Someone ambitious with a warm heart' },
    { email: 'meera@example.com', password: 'password123', firstName: 'Meera', lastName: 'Krishnan', gender: 'female' as const, dob: '1996-12-20', religion: 'Hindu', motherTongue: 'Malayalam', height: 165, education: 'LLB', profession: 'Lawyer', company: 'Cyril Amarchand', salaryRange: '20-35 LPA', location: 'Kochi', state: 'Kerala', country: 'India', bio: 'Corporate lawyer with a love for Kathakali and classical dance. Avid reader and weekend baker. Value honesty and kindness above all.', interests: ['Dance', 'Baking', 'Reading', 'Law'], photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', maritalStatus: 'Never Married', familyType: 'Nuclear', diet: 'Non-Vegetarian', smoking: 'No', drinking: 'Occasionally', lookingFor: 'A respectful and supportive partner' },
    { email: 'karthik@example.com', password: 'password123', firstName: 'Karthik', lastName: 'Nair', gender: 'male' as const, dob: '1991-04-18', religion: 'Hindu', motherTongue: 'Malayalam', height: 180, education: 'Ph.D', profession: 'Research Scientist', company: 'ISRO', salaryRange: '15-25 LPA', location: 'Thiruvananthapuram', state: 'Kerala', country: 'India', bio: 'Space researcher with dreams beyond the sky. Love philosophical discussions and South Indian filter coffee. Simple living, high thinking.', interests: ['Space', 'Philosophy', 'Coffee', 'Writing'], photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', maritalStatus: 'Never Married', familyType: 'Joint', diet: 'Vegetarian', smoking: 'No', drinking: 'No', lookingFor: 'An intellectually curious partner who appreciates simplicity' },
    { email: 'zara@example.com', password: 'password123', firstName: 'Zara', lastName: 'Khan', gender: 'female' as const, dob: '1998-02-14', religion: 'Muslim', motherTongue: 'Urdu', height: 167, education: 'BFA', profession: 'Fashion Designer', company: 'Sabyasachi', salaryRange: '10-20 LPA', location: 'Mumbai', state: 'Maharashtra', country: 'India', bio: 'Fashion designer who believes every outfit tells a story. Love art galleries, street food, and long conversations over chai. Creative soul seeking a creative connection.', interests: ['Fashion', 'Art', 'Food', 'Travel'], photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', maritalStatus: 'Never Married', familyType: 'Nuclear', diet: 'Non-Vegetarian', smoking: 'No', drinking: 'No', lookingFor: 'Someone who appreciates creativity and tradition equally' },
    { email: 'aditya@example.com', password: 'password123', firstName: 'Aditya', lastName: 'Joshi', gender: 'male' as const, dob: '1995-08-25', religion: 'Hindu', motherTongue: 'Marathi', height: 176, education: 'B.Tech', profession: 'Startup Founder', company: 'Self-employed', salaryRange: '50+ LPA', location: 'Bangalore', state: 'Karnataka', country: 'India', bio: 'Building my second startup in the EdTech space. Believe in making education accessible. Weekend trekker and amateur photographer.', interests: ['Startups', 'Trekking', 'Photography', 'EdTech'], photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', maritalStatus: 'Never Married', familyType: 'Nuclear', diet: 'Vegetarian', smoking: 'No', drinking: 'Socially', lookingFor: 'A driven and compassionate partner to share the journey' },
  ];

  const sampleFamilies = [
    { fatherName: 'Rajesh Sharma', fatherOccupation: 'Retired Bank Manager', motherName: 'Sunita Sharma', motherOccupation: 'Homemaker', siblings: '1 elder brother (married)', familyIncome: '20-30 LPA', familyValues: 'Moderate', aboutFamily: 'Close-knit family with strong values. Father retired from SBI. Brother works in IT in Pune.', contactPerson: 'Father', contactPhone: '+91 98765 43210', familyLocation: 'Jaipur, Rajasthan' },
    { fatherName: 'Suresh Mehta', fatherOccupation: 'Business Owner', motherName: 'Kavita Mehta', motherOccupation: 'School Principal', siblings: '1 younger sister', familyIncome: '40-60 LPA', familyValues: 'Moderate', aboutFamily: 'Business family from Ahmedabad. Father runs a textile business. Mother is a school principal. Very education-oriented family.', contactPerson: 'Mother', contactPhone: '+91 99887 76655', familyLocation: 'Ahmedabad, Gujarat' },
    { fatherName: 'Venkat Reddy', fatherOccupation: 'Doctor (Cardiologist)', motherName: 'Lakshmi Reddy', motherOccupation: 'Homemaker', siblings: '1 younger brother (studying MBBS)', familyIncome: '30-50 LPA', familyValues: 'Traditional', aboutFamily: 'Medical family. Father is a well-known cardiologist. Younger brother following in father\'s footsteps.', contactPerson: 'Father', contactPhone: '+91 98765 11111', familyLocation: 'Hyderabad, Telangana' },
    { fatherName: 'Harbinder Singh', fatherOccupation: 'Retired Army Colonel', motherName: 'Jaspreet Kaur', motherOccupation: 'Homemaker', siblings: '2 elder sisters (both married)', familyIncome: '25-40 LPA', familyValues: 'Traditional', aboutFamily: 'Army background family. Father served 30 years in Indian Army. Strong discipline and values.', contactPerson: 'Father', contactPhone: '+91 98888 22222', familyLocation: 'Chandigarh, Punjab' },
    { fatherName: 'Nilesh Patel', fatherOccupation: 'Chartered Accountant', motherName: 'Hema Patel', motherOccupation: 'CA (Practicing)', siblings: 'Only child', familyIncome: '50-80 LPA', familyValues: 'Moderate', aboutFamily: 'Both parents are CAs running their own practice in Pune. Very supportive of daughter\'s career choices.', contactPerson: 'Mother', contactPhone: '+91 97777 33333', familyLocation: 'Pune, Maharashtra' },
    { fatherName: 'Ramesh Iyer', fatherOccupation: 'IAS Officer (Retd)', motherName: 'Padma Iyer', motherOccupation: 'Professor', siblings: '1 younger sister (studying abroad)', familyIncome: '35-50 LPA', familyValues: 'Liberal', aboutFamily: 'Civil services family. Father was an IAS officer. Mother teaches Tamil literature at university. Very progressive outlook.', contactPerson: 'Self', contactPhone: '+91 96666 44444', familyLocation: 'Chennai, Tamil Nadu' },
    { fatherName: 'Gopal Krishnan', fatherOccupation: 'Advocate (High Court)', motherName: 'Radha Krishnan', motherOccupation: 'Homemaker', siblings: '1 elder brother (advocate)', familyIncome: '30-45 LPA', familyValues: 'Moderate', aboutFamily: 'Legal family from Kerala. Father and brother are both practicing advocates. Family values education and justice.', contactPerson: 'Father', contactPhone: '+91 95555 55555', familyLocation: 'Kochi, Kerala' },
    { fatherName: 'Unnikrishnan Nair', fatherOccupation: 'Professor (IIT)', motherName: 'Devika Nair', motherOccupation: 'Bank Manager', siblings: '1 younger sister', familyIncome: '30-45 LPA', familyValues: 'Liberal', aboutFamily: 'Academic family. Father is a professor at IIT Madras. Mother works at Federal Bank. Encourage intellectual pursuits.', contactPerson: 'Mother', contactPhone: '+91 94444 66666', familyLocation: 'Trivandrum, Kerala' },
    { fatherName: 'Irfan Khan', fatherOccupation: 'Film Producer', motherName: 'Nasreen Khan', motherOccupation: 'Interior Designer', siblings: '1 elder brother (director)', familyIncome: '80+ LPA', familyValues: 'Liberal', aboutFamily: 'Creative family from Mumbai film industry. Father produces independent films. Very open-minded and artistic household.', contactPerson: 'Mother', contactPhone: '+91 93333 77777', familyLocation: 'Mumbai, Maharashtra' },
    { fatherName: 'Mohan Joshi', fatherOccupation: 'Startup Investor', motherName: 'Anita Joshi', motherOccupation: 'HR Director', siblings: '1 elder sister (married, lives in US)', familyIncome: '1 Cr+', familyValues: 'Moderate', aboutFamily: 'Entrepreneurial family. Father is an angel investor. Mother is an HR director at an MNC. Very supportive of son\'s ventures.', contactPerson: 'Self', contactPhone: '+91 92222 88888', familyLocation: 'Bangalore, Karnataka' },
  ];

  const userIds: string[] = [];
  for (const u of sampleUsers) {
    const id = uuid();
    userIds.push(id);
    const hashedPassword = bcrypt.hashSync(u.password, 10);
    users.set(id, { id, email: u.email, password: hashedPassword, createdAt: new Date().toISOString() });
    const age = computeAge(u.dob);
    profiles.set(id, {
      userId: id,
      firstName: u.firstName,
      lastName: u.lastName,
      gender: u.gender,
      dateOfBirth: u.dob,
      age,
      religion: u.religion,
      motherTongue: u.motherTongue,
      height: u.height,
      education: u.education,
      profession: u.profession,
      company: u.company,
      salaryRange: u.salaryRange,
      location: u.location,
      state: u.state,
      country: u.country,
      bio: u.bio,
      interests: u.interests,
      photoUrl: u.photoUrl,
      maritalStatus: u.maritalStatus,
      familyType: u.familyType,
      diet: u.diet,
      smoking: u.smoking,
      drinking: u.drinking,
      lookingFor: u.lookingFor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const now = new Date().toISOString();
  for (let i = 0; i < userIds.length; i++) {
    const f = sampleFamilies[i];
    familyProfiles.set(userIds[i], {
      userId: userIds[i],
      fatherName: f.fatherName,
      fatherOccupation: f.fatherOccupation,
      motherName: f.motherName,
      motherOccupation: f.motherOccupation,
      siblings: f.siblings,
      familyIncome: f.familyIncome,
      familyValues: f.familyValues,
      aboutFamily: f.aboutFamily,
      contactPerson: f.contactPerson,
      contactPhone: f.contactPhone,
      familyLocation: f.familyLocation,
      createdAt: now,
      updatedAt: now,
    });
  }
}

seedData();

export const store = {
  findUserByEmail(email: string): User | undefined {
    for (const u of users.values()) {
      if (u.email === email) return u;
    }
    return undefined;
  },

  createUser(email: string, password: string): User {
    const id = uuid();
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user: User = { id, email, password: hashedPassword, createdAt: new Date().toISOString() };
    users.set(id, user);
    return user;
  },

  getUser(id: string): User | undefined {
    return users.get(id);
  },

  getProfile(userId: string): Profile | undefined {
    return profiles.get(userId);
  },

  upsertProfile(userId: string, data: Partial<Omit<Profile, 'userId' | 'createdAt' | 'updatedAt'>>): Profile {
    const existing = profiles.get(userId);
    const now = new Date().toISOString();

    if (data.dateOfBirth) {
      data.age = computeAge(data.dateOfBirth);
    }

    const profile: Profile = {
      userId,
      firstName: data.firstName ?? existing?.firstName ?? '',
      lastName: data.lastName ?? existing?.lastName ?? '',
      gender: data.gender ?? existing?.gender ?? 'other',
      dateOfBirth: data.dateOfBirth ?? existing?.dateOfBirth ?? '',
      age: data.age ?? existing?.age ?? 0,
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

    profiles.set(userId, profile);
    return profile;
  },

  getAllProfiles(excludeUserId?: string): Profile[] {
    const result: Profile[] = [];
    for (const [userId, profile] of profiles.entries()) {
      if (userId !== excludeUserId) result.push(profile);
    }
    return result;
  },

  sendInterest(fromUserId: string, toUserId: string): Interest {
    for (const interest of interests.values()) {
      if (interest.fromUserId === fromUserId && interest.toUserId === toUserId) {
        return interest;
      }
    }
    const id = uuid();
    const interest: Interest = { id, fromUserId, toUserId, status: 'pending', createdAt: new Date().toISOString() };
    interests.set(id, interest);
    return interest;
  },

  getInterests(userId: string): { sent: Interest[]; received: Interest[] } {
    const sent: Interest[] = [];
    const received: Interest[] = [];
    for (const interest of interests.values()) {
      if (interest.fromUserId === userId) sent.push(interest);
      if (interest.toUserId === userId) received.push(interest);
    }
    return { sent, received };
  },

  updateInterestStatus(interestId: string, status: 'accepted' | 'declined'): Interest | undefined {
    const interest = interests.get(interestId);
    if (interest) {
      interest.status = status;
      return interest;
    }
    return undefined;
  },

  getFamilyProfile(userId: string): FamilyProfile | undefined {
    return familyProfiles.get(userId);
  },

  upsertFamilyProfile(userId: string, data: Partial<Omit<FamilyProfile, 'userId' | 'createdAt' | 'updatedAt'>>): FamilyProfile {
    const existing = familyProfiles.get(userId);
    const now = new Date().toISOString();

    const fp: FamilyProfile = {
      userId,
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

    familyProfiles.set(userId, fp);
    return fp;
  },

  shareProfile(fromUserId: string, toUserId: string, sharedProfileUserId: string, message: string): SharedProfile {
    for (const sp of sharedProfiles.values()) {
      if (sp.fromUserId === fromUserId && sp.toUserId === toUserId && sp.sharedProfileUserId === sharedProfileUserId) {
        return sp;
      }
    }
    const id = uuid();
    const sp: SharedProfile = {
      id,
      fromUserId,
      toUserId,
      sharedProfileUserId,
      message: message || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    sharedProfiles.set(id, sp);
    return sp;
  },

  getSharedProfiles(userId: string): { sent: SharedProfile[]; received: SharedProfile[] } {
    const sent: SharedProfile[] = [];
    const received: SharedProfile[] = [];
    for (const sp of sharedProfiles.values()) {
      if (sp.fromUserId === userId) sent.push(sp);
      if (sp.toUserId === userId) received.push(sp);
    }
    return { sent, received };
  },

  updateSharedProfileStatus(id: string, status: SharedProfile['status']): SharedProfile | undefined {
    const sp = sharedProfiles.get(id);
    if (sp) {
      sp.status = status;
      return sp;
    }
    return undefined;
  },

  addShortlist(userId: string, shortlistedUserId: string, note: string): Shortlist {
    for (const s of shortlists.values()) {
      if (s.userId === userId && s.shortlistedUserId === shortlistedUserId) {
        s.note = note;
        return s;
      }
    }
    const id = uuid();
    const entry: Shortlist = { id, userId, shortlistedUserId, note: note || '', createdAt: new Date().toISOString() };
    shortlists.set(id, entry);
    return entry;
  },

  removeShortlist(userId: string, shortlistedUserId: string): boolean {
    for (const [id, s] of shortlists.entries()) {
      if (s.userId === userId && s.shortlistedUserId === shortlistedUserId) {
        shortlists.delete(id);
        return true;
      }
    }
    return false;
  },

  getShortlist(userId: string): Shortlist[] {
    const result: Shortlist[] = [];
    for (const s of shortlists.values()) {
      if (s.userId === userId) result.push(s);
    }
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  },

  isShortlisted(userId: string, shortlistedUserId: string): boolean {
    for (const s of shortlists.values()) {
      if (s.userId === userId && s.shortlistedUserId === shortlistedUserId) return true;
    }
    return false;
  },

  getShortlistedUserIds(userId: string): Set<string> {
    const ids = new Set<string>();
    for (const s of shortlists.values()) {
      if (s.userId === userId) ids.add(s.shortlistedUserId);
    }
    return ids;
  },
};
