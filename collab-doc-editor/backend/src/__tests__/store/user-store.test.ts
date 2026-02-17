import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';

let uuidCounter = 0;

vi.mock('fs');
vi.mock('uuid', () => ({
  v4: vi.fn(() => `test-uuid-${++uuidCounter}`),
}));

import { v4 as uuidv4 } from 'uuid';

const mockedFs = vi.mocked(fs);
const mockedUuid = vi.mocked(uuidv4);

describe('UserStore', () => {
  let userStore: typeof import('../../store/user-store').userStore;

  beforeEach(async () => {
    vi.resetModules();
    uuidCounter = 0;

    // Re-mock after resetModules
    vi.mock('fs');
    vi.mock('uuid', () => ({
      v4: vi.fn(() => `test-uuid-${++uuidCounter}`),
    }));

    const freshFs = (await import('fs')).default;
    const mockedFreshFs = vi.mocked(freshFs);
    mockedFreshFs.existsSync.mockReturnValue(false);
    mockedFreshFs.mkdirSync.mockReturnValue(undefined as any);
    mockedFreshFs.writeFileSync.mockReturnValue(undefined);
    mockedFreshFs.readFileSync.mockReturnValue('[]');

    const mod = await import('../../store/user-store');
    userStore = mod.userStore;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('init()', () => {
    it('should create data directory if it does not exist', async () => {
      const freshFs = vi.mocked((await import('fs')).default);
      freshFs.existsSync.mockReturnValue(false);
      await userStore.init();
      expect(freshFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('data'),
        { recursive: true }
      );
    });

    it('should load existing users from file', async () => {
      vi.resetModules();
      vi.mock('fs');
      vi.mock('uuid', () => ({
        v4: vi.fn(() => `test-uuid-${++uuidCounter}`),
      }));

      const freshFs = vi.mocked((await import('fs')).default);
      const users = [
        {
          id: 'user-1',
          email: 'alice@test.com',
          name: 'Alice',
          passwordHash: 'salt:hash',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      freshFs.existsSync
        .mockReturnValueOnce(true) // DATA_DIR
        .mockReturnValueOnce(true); // USERS_FILE
      freshFs.readFileSync.mockReturnValue(JSON.stringify(users));

      const mod = await import('../../store/user-store');
      await mod.userStore.init();

      const found = mod.userStore.findById('user-1');
      expect(found).toBeDefined();
      expect(found!.email).toBe('alice@test.com');
    });

    it('should handle no existing users file', async () => {
      vi.resetModules();
      vi.mock('fs');
      vi.mock('uuid', () => ({
        v4: vi.fn(() => `test-uuid-${++uuidCounter}`),
      }));

      const freshFs = vi.mocked((await import('fs')).default);
      freshFs.existsSync
        .mockReturnValueOnce(true) // DATA_DIR exists
        .mockReturnValueOnce(false); // USERS_FILE does not exist
      freshFs.mkdirSync.mockReturnValue(undefined as any);

      const mod = await import('../../store/user-store');
      await mod.userStore.init();

      const found = mod.userStore.findById('nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('createUser()', () => {
    beforeEach(async () => {
      await userStore.init();
    });

    it('should create a new user and return safe user without passwordHash', () => {
      const user = userStore.createUser('bob@test.com', 'Bob', 'password123');
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email', 'bob@test.com');
      expect(user).toHaveProperty('name', 'Bob');
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('should lowercase and trim the email', () => {
      const user = userStore.createUser('  BOB@Test.Com  ', 'Bob', 'password123');
      expect(user.email).toBe('bob@test.com');
    });

    it('should trim the name', () => {
      const user = userStore.createUser('bob@test.com', '  Bob  ', 'password123');
      expect(user.name).toBe('Bob');
    });

    it('should throw error if email already registered', () => {
      userStore.createUser('bob@test.com', 'Bob', 'password123');

      expect(() =>
        userStore.createUser('bob@test.com', 'Bob2', 'password456')
      ).toThrow('Email already registered');
    });

    it('should persist to file after creation', async () => {
      const freshFs = vi.mocked((await import('fs')).default);
      userStore.createUser('bob@test.com', 'Bob', 'password123');
      expect(freshFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('users.json'),
        expect.any(String),
        'utf-8'
      );
    });
  });

  describe('findByEmail()', () => {
    beforeEach(async () => {
      await userStore.init();
      userStore.createUser('alice@test.com', 'Alice', 'password123');
    });

    it('should find user by email (case insensitive)', () => {
      const user = userStore.findByEmail('ALICE@Test.Com');
      expect(user).toBeDefined();
      expect(user!.name).toBe('Alice');
    });

    it('should return undefined for non-existent email', () => {
      const user = userStore.findByEmail('notfound@test.com');
      expect(user).toBeUndefined();
    });
  });

  describe('findById()', () => {
    let createdId: string;

    beforeEach(async () => {
      await userStore.init();
      const user = userStore.createUser('alice@test.com', 'Alice', 'password123');
      createdId = user.id;
    });

    it('should find user by id', () => {
      const user = userStore.findById(createdId);
      expect(user).toBeDefined();
      expect(user!.email).toBe('alice@test.com');
    });

    it('should return undefined for non-existent id', () => {
      const user = userStore.findById('non-existent-id');
      expect(user).toBeUndefined();
    });
  });

  describe('validateCredentials()', () => {
    beforeEach(async () => {
      await userStore.init();
      userStore.createUser('alice@test.com', 'Alice', 'password123');
    });

    it('should return safe user for valid credentials', () => {
      const user = userStore.validateCredentials('alice@test.com', 'password123');
      expect(user).toBeDefined();
      expect(user!.email).toBe('alice@test.com');
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('should return null for wrong password', () => {
      const user = userStore.validateCredentials('alice@test.com', 'wrongpassword');
      expect(user).toBeNull();
    });

    it('should return null for non-existent email', () => {
      const user = userStore.validateCredentials('nobody@test.com', 'password123');
      expect(user).toBeNull();
    });
  });

  describe('searchUsers()', () => {
    beforeEach(async () => {
      await userStore.init();
      userStore.createUser('alice@test.com', 'Alice Smith', 'pass123');
      userStore.createUser('bob@test.com', 'Bob Jones', 'pass123');
      userStore.createUser('charlie@test.com', 'Charlie Brown', 'pass123');
    });

    it('should find users by name (case insensitive)', () => {
      const results = userStore.searchUsers('alice');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Alice Smith');
    });

    it('should find users by email', () => {
      const results = userStore.searchUsers('bob@test');
      expect(results.length).toBe(1);
      expect(results[0].email).toBe('bob@test.com');
    });

    it('should exclude specified user ids', () => {
      const allUsers = userStore.searchUsers('');
      const firstId = allUsers[0].id;
      const results = userStore.searchUsers('', [firstId]);
      expect(results.every((u) => u.id !== firstId)).toBe(true);
    });

    it('should limit results to 10', () => {
      const results = userStore.searchUsers('');
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should return empty array for no matches', () => {
      const results = userStore.searchUsers('zzzzz');
      expect(results).toHaveLength(0);
    });
  });

  describe('getUsersByIds()', () => {
    let user1Id: string;
    let user2Id: string;

    beforeEach(async () => {
      await userStore.init();
      const u1 = userStore.createUser('alice@test.com', 'Alice', 'pass123');
      const u2 = userStore.createUser('bob@test.com', 'Bob', 'pass123');
      user1Id = u1.id;
      user2Id = u2.id;
    });

    it('should return safe users for valid ids', () => {
      const users = userStore.getUsersByIds([user1Id, user2Id]);
      expect(users).toHaveLength(2);
      expect(users[0]).not.toHaveProperty('passwordHash');
    });

    it('should filter out non-existent ids', () => {
      const users = userStore.getUsersByIds([user1Id, 'non-existent']);
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe(user1Id);
    });

    it('should return empty array for all non-existent ids', () => {
      const users = userStore.getUsersByIds(['fake1', 'fake2']);
      expect(users).toHaveLength(0);
    });
  });
});
