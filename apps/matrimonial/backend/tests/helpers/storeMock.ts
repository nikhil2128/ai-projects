export const mockStore = {
  initialize: vi.fn(),
  refreshRecommendationsForActiveUsers: vi.fn(),
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
  upsertProfile: vi.fn(),
  markUserActive: vi.fn(),
  getUser: vi.fn(),
  getProfile: vi.fn(),
  getFamilyProfile: vi.fn(),
  browseProfiles: vi.fn(),
  getRecommendationsForUser: vi.fn(),
  sendInterest: vi.fn(),
  getInterests: vi.fn(),
  updateInterestStatus: vi.fn(),
  upsertFamilyProfile: vi.fn(),
  shareProfile: vi.fn(),
  getSharedProfiles: vi.fn(),
  updateSharedProfileStatus: vi.fn(),
  getShortlist: vi.fn(),
  getShortlistedUserIds: vi.fn(),
  addShortlist: vi.fn(),
  removeShortlist: vi.fn(),
};

export const sampleUser = {
  id: 'user-1',
  email: 'asha@example.com',
  password: '$2a$10$5Q7A7pD5D93q7Y7CUJ4QbuBO3T/5Y7W7vRrM1dBqJr2dZ2D5SgG7m',
};

export const sampleProfile = {
  userId: 'user-1',
  firstName: 'Asha',
  lastName: 'Verma',
  gender: 'female',
  dateOfBirth: '1997-05-12',
  age: 28,
  religion: 'Hindu',
  motherTongue: 'Hindi',
  height: 165,
  education: 'MBA',
  profession: 'Product Manager',
  company: 'Acme',
  salaryRange: '20-35 LPA',
  location: 'Bengaluru',
  state: 'Karnataka',
  country: 'India',
  bio: 'Curious and family-oriented.',
  interests: ['Travel', 'Music'],
  photoUrl: '',
  maritalStatus: 'Never Married',
  familyType: 'Nuclear',
  diet: 'Vegetarian',
  smoking: 'No',
  drinking: 'Socially',
  lookingFor: 'Kindness and ambition.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

export const sampleFamilyProfile = {
  userId: 'user-1',
  fatherName: 'Rajesh Verma',
  fatherOccupation: 'Business Owner',
  motherName: 'Sunita Verma',
  motherOccupation: 'Teacher',
  siblings: '1 younger brother',
  familyIncome: '25-40 LPA',
  familyValues: 'Moderate',
  aboutFamily: 'Close-knit family.',
  contactPerson: 'Rajesh Verma',
  contactPhone: '9999999999',
  familyLocation: 'Bengaluru',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

export const sampleInterest = {
  id: 'interest-1',
  fromUserId: 'user-1',
  toUserId: 'user-2',
  status: 'pending',
  createdAt: '2026-01-02T00:00:00.000Z',
};

export const sampleShare = {
  id: 'share-1',
  fromUserId: 'user-1',
  toUserId: 'user-2',
  sharedProfileUserId: 'user-3',
  message: 'Take a look',
  status: 'pending',
  createdAt: '2026-01-02T00:00:00.000Z',
};

export const sampleShortlistEntry = {
  id: 'shortlist-1',
  userId: 'user-1',
  shortlistedUserId: 'user-2',
  note: 'Promising match',
  createdAt: '2026-01-02T00:00:00.000Z',
};

export function resetMockStore() {
  Object.values(mockStore).forEach((method) => method.mockReset());
}
