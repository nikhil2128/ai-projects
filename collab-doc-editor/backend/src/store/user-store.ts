import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verify;
}

class UserStore {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map();

  async init(): Promise<void> {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const users: User[] = JSON.parse(raw);
      users.forEach((user) => {
        this.users.set(user.id, user);
        this.emailIndex.set(user.email.toLowerCase(), user.id);
      });
    }
  }

  private persist(): void {
    const users = Array.from(this.users.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  }

  findByEmail(email: string): User | undefined {
    const id = this.emailIndex.get(email.toLowerCase());
    return id ? this.users.get(id) : undefined;
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  createUser(email: string, name: string, password: string): SafeUser {
    if (this.emailIndex.has(email.toLowerCase())) {
      throw new Error('Email already registered');
    }

    const user: User = {
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    this.users.set(user.id, user);
    this.emailIndex.set(user.email, user.id);
    this.persist();

    return this.toSafeUser(user);
  }

  validateCredentials(email: string, password: string): SafeUser | null {
    const user = this.findByEmail(email);
    if (!user) return null;
    if (!verifyPassword(password, user.passwordHash)) return null;
    return this.toSafeUser(user);
  }

  searchUsers(query: string, excludeIds: string[] = []): SafeUser[] {
    const q = query.toLowerCase();
    const results: SafeUser[] = [];
    this.users.forEach((user) => {
      if (excludeIds.includes(user.id)) return;
      if (user.email.toLowerCase().includes(q) || user.name.toLowerCase().includes(q)) {
        results.push(this.toSafeUser(user));
      }
    });
    return results.slice(0, 10);
  }

  getUsersByIds(ids: string[]): SafeUser[] {
    return ids
      .map((id) => this.users.get(id))
      .filter((u): u is User => !!u)
      .map((u) => this.toSafeUser(u));
  }

  private toSafeUser(user: User): SafeUser {
    const { passwordHash: _, ...safe } = user;
    return safe;
  }
}

export const userStore = new UserStore();
