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

const users: Map<string, User> = new Map();
const profiles: Map<string, Profile> = new Map();
const interests: Map<string, Interest> = new Map();

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

  for (const u of sampleUsers) {
    const id = uuid();
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
};
