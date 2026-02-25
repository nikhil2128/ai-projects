import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import {
  User,
  UserRegistrationInput,
  UserLoginInput,
  AuthToken,
  ServiceResult,
} from "../../../shared/types";
import { AuthStore } from "./store";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export class AuthService {
  constructor(private store: AuthStore) {}

  async register(
    input: UserRegistrationInput
  ): Promise<ServiceResult<Omit<User, "passwordHash">>> {
    if (!input.name.trim()) {
      return { success: false, error: "Name is required" };
    }

    if (!EMAIL_REGEX.test(input.email)) {
      return { success: false, error: "Invalid email format" };
    }

    if (input.password.length < MIN_PASSWORD_LENGTH) {
      return {
        success: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      };
    }

    if (await this.store.findUserByEmail(input.email)) {
      return { success: false, error: "Email is already registered" };
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user: User = {
      id: uuidv4(),
      email: input.email,
      name: input.name,
      passwordHash,
      createdAt: new Date(),
    };

    await this.store.addUser(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _hash, ...userWithoutPassword } = user;
    return { success: true, data: userWithoutPassword };
  }

  async login(input: UserLoginInput): Promise<ServiceResult<AuthToken>> {
    const user = await this.store.findUserByEmail(input.email);
    if (!user) {
      return { success: false, error: "Invalid credentials" };
    }

    const isPasswordValid = await bcrypt.compare(
      input.password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      return { success: false, error: "Invalid credentials" };
    }

    const token = uuidv4();
    await this.store.storeToken(token, user.id);

    return {
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        token,
      },
    };
  }

  async validateToken(token: string): Promise<string | null> {
    return (await this.store.getUserIdByToken(token)) ?? null;
  }
}
