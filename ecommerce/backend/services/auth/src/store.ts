import { User } from "../../../shared/types";

export class AuthStore {
  private users: Map<string, User> = new Map();
  private tokens: Map<string, string> = new Map();

  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  findUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  findUserByEmail(email: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  storeToken(token: string, userId: string): void {
    this.tokens.set(token, userId);
  }

  getUserIdByToken(token: string): string | undefined {
    return this.tokens.get(token);
  }
}
