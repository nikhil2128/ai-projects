import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { generateToken } from '../src/middleware/auth.js';
import {
  mockStore,
  resetMockStore,
  sampleFamilyProfile,
  sampleInterest,
  sampleProfile,
  sampleShare,
  sampleShortlistEntry,
  sampleUser,
} from './helpers/storeMock';

vi.mock('../src/data/store.js', async () => {
  const mod = await import('./helpers/storeMock');
  return { store: mod.mockStore };
});

vi.mock('bcryptjs', () => ({
  default: {
    compareSync: vi.fn(),
  },
}));

describe('API routes', () => {
  const authHeader = {
    Authorization: `Bearer ${generateToken(sampleUser.id)}`,
  };

  beforeEach(() => {
    resetMockStore();
    vi.mocked(bcrypt.compareSync).mockReset();
    mockStore.getUser.mockResolvedValue(sampleUser);
    mockStore.markUserActive.mockResolvedValue(undefined);
  });

  it('serves the health endpoint', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeTruthy();
  });

  it('supports auth register, login, and me flows', async () => {
    mockStore.findUserByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce(sampleUser);
    mockStore.createUser.mockResolvedValue(sampleUser);
    mockStore.upsertProfile.mockResolvedValue(sampleProfile);
    vi.mocked(bcrypt.compareSync).mockReturnValue(true);
    mockStore.getProfile.mockResolvedValue(sampleProfile);
    mockStore.getFamilyProfile.mockResolvedValue(sampleFamilyProfile);

    const registerResponse = await request(createApp())
      .post('/api/auth/register')
      .send({ email: sampleUser.email, password: 'password123', firstName: 'Asha', lastName: 'Verma' });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user).toEqual({ id: sampleUser.id, email: sampleUser.email });
    expect(mockStore.upsertProfile).toHaveBeenCalledWith(sampleUser.id, { firstName: 'Asha', lastName: 'Verma' });

    const loginResponse = await request(createApp())
      .post('/api/auth/login')
      .send({ email: sampleUser.email, password: 'password123' });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBe(generateToken(sampleUser.id));
    expect(mockStore.markUserActive).toHaveBeenCalledWith(sampleUser.id);

    const meResponse = await request(createApp())
      .get('/api/auth/me')
      .set(authHeader);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.hasProfile).toBe(true);
    expect(meResponse.body.hasFamilyProfile).toBe(true);
  });

  it('validates auth failures and protected route failures', async () => {
    mockStore.findUserByEmail.mockResolvedValue(sampleUser);
    vi.mocked(bcrypt.compareSync).mockReturnValue(false);

    const missingFields = await request(createApp())
      .post('/api/auth/register')
      .send({ email: '', password: '' });
    expect(missingFields.status).toBe(400);

    const shortPassword = await request(createApp())
      .post('/api/auth/register')
      .send({ email: sampleUser.email, password: '123' });
    expect(shortPassword.status).toBe(400);

    const duplicateEmail = await request(createApp())
      .post('/api/auth/register')
      .send({ email: sampleUser.email, password: 'password123' });
    expect(duplicateEmail.status).toBe(409);

    const badLogin = await request(createApp())
      .post('/api/auth/login')
      .send({ email: sampleUser.email, password: 'wrongpass' });
    expect(badLogin.status).toBe(401);

    const unauthenticated = await request(createApp()).get('/api/profiles/me');
    expect(unauthenticated.status).toBe(401);

    mockStore.getProfile.mockRejectedValueOnce(new Error('boom'));
    const serverError = await request(createApp()).get('/api/profiles/me').set(authHeader);
    expect(serverError.status).toBe(500);
    expect(serverError.body).toEqual({ error: 'Internal server error' });
  });

  it('covers profile browse, recommendations, profile lookup, interests, and updates', async () => {
    mockStore.getProfile
      .mockResolvedValueOnce(sampleProfile)
      .mockResolvedValueOnce({ ...sampleProfile, userId: 'user-2', firstName: 'Riya' })
      .mockResolvedValueOnce({ ...sampleProfile, userId: 'user-2', firstName: 'Riya' })
      .mockResolvedValueOnce({ ...sampleProfile, userId: 'user-2', firstName: 'Riya' })
      .mockResolvedValueOnce(sampleProfile);
    mockStore.browseProfiles.mockResolvedValue({ profiles: [sampleProfile], total: 1, page: 2, pageSize: 10 });
    mockStore.getRecommendationsForUser.mockResolvedValue({
      generatedAt: '2026-01-02T00:00:00.000Z',
      basedOnHistory: true,
      shortlistedSignals: 3,
      interestSignals: 1,
      recommendations: [
        {
          recommendedUserId: 'user-2',
          matchPercentage: 80,
          score: 91,
          reasons: ['Shared values'],
          generatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    });
    mockStore.sendInterest.mockResolvedValue(sampleInterest);
    mockStore.getInterests.mockResolvedValue({
      sent: [sampleInterest],
      received: [{ ...sampleInterest, id: 'interest-2', fromUserId: 'user-3', toUserId: 'user-1' }],
    });
    mockStore.updateInterestStatus.mockResolvedValue({ ...sampleInterest, status: 'accepted' });

    const getMine = await request(createApp()).get('/api/profiles/me').set(authHeader);
    expect(getMine.status).toBe(200);

    const browseResponse = await request(createApp())
      .get('/api/profiles/browse?gender=female&religion=all&search=asha&page=2&pageSize=10')
      .set(authHeader);
    expect(browseResponse.status).toBe(200);
    expect(mockStore.browseProfiles).toHaveBeenCalledWith(
      sampleUser.id,
      expect.objectContaining({ gender: 'female', religion: undefined, search: 'asha' }),
      2,
      10,
    );

    const recommendations = await request(createApp())
      .get('/api/profiles/recommendations/daily')
      .set(authHeader);
    expect(recommendations.status).toBe(200);
    expect(recommendations.body.recommendations[0].matchPercentage).toBe(80);

    const lookup = await request(createApp()).get('/api/profiles/user-2').set(authHeader);
    expect(lookup.status).toBe(200);

    const sendInterest = await request(createApp()).post('/api/profiles/user-2/interest').set(authHeader);
    expect(sendInterest.status).toBe(201);

    const interestList = await request(createApp()).get('/api/profiles/interests/list').set(authHeader);
    expect(interestList.status).toBe(200);
    expect(interestList.body.sent).toHaveLength(1);

    const invalidStatus = await request(createApp())
      .patch('/api/profiles/interests/interest-1')
      .set(authHeader)
      .send({ status: 'maybe' });
    expect(invalidStatus.status).toBe(400);

    const updateInterest = await request(createApp())
      .patch('/api/profiles/interests/interest-1')
      .set(authHeader)
      .send({ status: 'accepted' });
    expect(updateInterest.status).toBe(200);
  });

  it('covers family profile retrieval, sharing, list enrichment, and status updates', async () => {
    mockStore.getFamilyProfile
      .mockResolvedValueOnce(sampleFamilyProfile)
      .mockResolvedValueOnce(sampleFamilyProfile)
      .mockResolvedValueOnce(sampleFamilyProfile)
      .mockResolvedValueOnce(sampleFamilyProfile)
      .mockResolvedValueOnce(sampleFamilyProfile)
      .mockResolvedValueOnce(sampleFamilyProfile)
      .mockResolvedValueOnce(sampleFamilyProfile);
    mockStore.upsertFamilyProfile.mockResolvedValue(sampleFamilyProfile);
    mockStore.getProfile
      .mockResolvedValueOnce({ ...sampleProfile, userId: 'user-2' })
      .mockResolvedValueOnce({ ...sampleProfile, userId: 'user-3', firstName: 'Neha' })
      .mockResolvedValueOnce({ ...sampleProfile, userId: 'user-2' })
      .mockResolvedValueOnce(sampleProfile)
      .mockResolvedValueOnce({ ...sampleProfile, userId: 'user-3', firstName: 'Neha' })
      .mockResolvedValueOnce({ ...sampleProfile, userId: 'user-2' })
      .mockResolvedValueOnce(sampleProfile);
    mockStore.shareProfile.mockResolvedValue(sampleShare);
    mockStore.getSharedProfiles.mockResolvedValue({ sent: [sampleShare], received: [sampleShare] });
    mockStore.updateSharedProfileStatus.mockResolvedValue({ ...sampleShare, status: 'viewed' });

    const getMine = await request(createApp()).get('/api/family/me').set(authHeader);
    expect(getMine.status).toBe(200);

    const updateMine = await request(createApp())
      .put('/api/family/me')
      .set(authHeader)
      .send({ fatherName: 'Rajesh Verma' });
    expect(updateMine.status).toBe(200);

    const lookup = await request(createApp()).get('/api/family/user/user-2').set(authHeader);
    expect(lookup.status).toBe(200);

    const missingShareFields = await request(createApp()).post('/api/family/share').set(authHeader).send({});
    expect(missingShareFields.status).toBe(400);

    const share = await request(createApp())
      .post('/api/family/share')
      .set(authHeader)
      .send({ toUserId: 'user-2', sharedProfileUserId: 'user-3', message: 'Take a look' });
    expect(share.status).toBe(201);

    const shared = await request(createApp()).get('/api/family/shared').set(authHeader);
    expect(shared.status).toBe(200);
    expect(shared.body.sent[0].sharedProfile).toBeTruthy();

    const invalidStatus = await request(createApp())
      .patch('/api/family/shared/share-1')
      .set(authHeader)
      .send({ status: 'pending' });
    expect(invalidStatus.status).toBe(400);

    const updatedStatus = await request(createApp())
      .patch('/api/family/shared/share-1')
      .set(authHeader)
      .send({ status: 'viewed' });
    expect(updatedStatus.status).toBe(200);
  });

  it('covers shortlist listing, ids, creation, and deletion', async () => {
    mockStore.getShortlist.mockResolvedValue([sampleShortlistEntry]);
    mockStore.getProfile
      .mockResolvedValueOnce({ ...sampleProfile, userId: 'user-2' })
      .mockResolvedValueOnce({ ...sampleProfile, userId: 'user-2' });
    mockStore.getShortlistedUserIds.mockResolvedValue(new Set(['user-2', 'user-3']));
    mockStore.addShortlist.mockResolvedValue(sampleShortlistEntry);
    mockStore.removeShortlist.mockResolvedValue(true);

    const list = await request(createApp()).get('/api/shortlist').set(authHeader);
    expect(list.status).toBe(200);
    expect(list.body.shortlist[0].profile.userId).toBe('user-2');

    const ids = await request(createApp()).get('/api/shortlist/ids').set(authHeader);
    expect(ids.status).toBe(200);
    expect(ids.body.shortlistedUserIds).toEqual(['user-2', 'user-3']);

    const ownProfile = await request(createApp()).post(`/api/shortlist/${sampleUser.id}`).set(authHeader);
    expect(ownProfile.status).toBe(400);

    const add = await request(createApp())
      .post('/api/shortlist/user-2')
      .set(authHeader)
      .send({ note: 'Promising match' });
    expect(add.status).toBe(201);

    const remove = await request(createApp()).delete('/api/shortlist/user-2').set(authHeader);
    expect(remove.status).toBe(200);
    expect(remove.body).toEqual({ success: true });
  });

  it('returns missing-resource responses across the remaining route branches', async () => {
    const app = createApp();

    const missingLogin = await request(app).post('/api/auth/login').send({ email: '', password: '' });
    expect(missingLogin.status).toBe(400);

    mockStore.getProfile.mockResolvedValueOnce(null);
    const missingOwnProfile = await request(app).get('/api/profiles/me').set(authHeader);
    expect(missingOwnProfile.status).toBe(404);

    mockStore.getProfile.mockResolvedValueOnce(null);
    const missingProfile = await request(app).get('/api/profiles/user-404').set(authHeader);
    expect(missingProfile.status).toBe(404);

    mockStore.getProfile.mockResolvedValueOnce(null);
    const missingInterestTarget = await request(app).post('/api/profiles/user-404/interest').set(authHeader);
    expect(missingInterestTarget.status).toBe(404);

    mockStore.updateInterestStatus.mockResolvedValueOnce(null);
    const missingInterest = await request(app)
      .patch('/api/profiles/interests/interest-404')
      .set(authHeader)
      .send({ status: 'accepted' });
    expect(missingInterest.status).toBe(404);

    mockStore.getFamilyProfile.mockResolvedValueOnce(null);
    const missingOwnFamily = await request(app).get('/api/family/me').set(authHeader);
    expect(missingOwnFamily.status).toBe(404);

    mockStore.getFamilyProfile.mockResolvedValueOnce(null);
    const missingFamilyUser = await request(app).get('/api/family/user/user-404').set(authHeader);
    expect(missingFamilyUser.status).toBe(404);

    mockStore.getProfile.mockResolvedValueOnce(null);
    const missingRecipient = await request(app)
      .post('/api/family/share')
      .set(authHeader)
      .send({ toUserId: 'user-404', sharedProfileUserId: 'user-3' });
    expect(missingRecipient.status).toBe(404);

    mockStore.getProfile.mockResolvedValueOnce(sampleProfile).mockResolvedValueOnce(null);
    const missingSharedProfile = await request(app)
      .post('/api/family/share')
      .set(authHeader)
      .send({ toUserId: 'user-2', sharedProfileUserId: 'user-404' });
    expect(missingSharedProfile.status).toBe(404);

    mockStore.updateSharedProfileStatus.mockResolvedValueOnce(null);
    const missingShare = await request(app)
      .patch('/api/family/shared/share-404')
      .set(authHeader)
      .send({ status: 'viewed' });
    expect(missingShare.status).toBe(404);

    mockStore.getProfile.mockResolvedValueOnce(null);
    const missingShortlistTarget = await request(app).post('/api/shortlist/user-404').set(authHeader);
    expect(missingShortlistTarget.status).toBe(404);

    mockStore.removeShortlist.mockResolvedValueOnce(false);
    const missingShortlistEntry = await request(app).delete('/api/shortlist/user-404').set(authHeader);
    expect(missingShortlistEntry.status).toBe(404);
  });
});
