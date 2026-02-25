import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { AuthService } from "./service";
import { AuthStore } from "./store";
import { getTestPool, cleanTables, closeTestPool } from "../../../shared/test-db";

describe("AuthService", () => {
  let authService: AuthService;
  let store: AuthStore;
  let pool: Pool;

  beforeAll(async () => {
    pool = await getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await cleanTables(pool);
    store = new AuthStore(pool);
    authService = new AuthService(store);
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const result = await authService.register({
        email: "alice@example.com",
        name: "Alice",
        password: "securePass123",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.email).toBe("alice@example.com");
      expect(result.data!.name).toBe("Alice");
      expect(result.data!.id).toBeDefined();
    });

    it("should not store plaintext password", async () => {
      const result = await authService.register({
        email: "alice@example.com",
        name: "Alice",
        password: "securePass123",
      });

      expect(result.success).toBe(true);
      const user = await store.findUserByEmail("alice@example.com");
      expect(user).toBeDefined();
      expect(user!.passwordHash).not.toBe("securePass123");
    });

    it("should reject duplicate email registration", async () => {
      await authService.register({
        email: "alice@example.com",
        name: "Alice",
        password: "securePass123",
      });

      const result = await authService.register({
        email: "alice@example.com",
        name: "Alice Again",
        password: "anotherPass",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already registered");
    });

    it("should reject registration with invalid email", async () => {
      const result = await authService.register({
        email: "not-an-email",
        name: "Bob",
        password: "securePass123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid email");
    });

    it("should reject registration with short password", async () => {
      const result = await authService.register({
        email: "bob@example.com",
        name: "Bob",
        password: "123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least 8 characters");
    });

    it("should reject registration with empty name", async () => {
      const result = await authService.register({
        email: "bob@example.com",
        name: "",
        password: "securePass123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Name is required");
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      await authService.register({
        email: "alice@example.com",
        name: "Alice",
        password: "securePass123",
      });
    });

    it("should login with correct credentials", async () => {
      const result = await authService.login({
        email: "alice@example.com",
        password: "securePass123",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.token).toBeDefined();
      expect(result.data!.userId).toBeDefined();
      expect(result.data!.email).toBe("alice@example.com");
    });

    it("should reject login with wrong password", async () => {
      const result = await authService.login({
        email: "alice@example.com",
        password: "wrongPassword",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid credentials");
    });

    it("should reject login with non-existent email", async () => {
      const result = await authService.login({
        email: "nobody@example.com",
        password: "securePass123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid credentials");
    });
  });

  describe("validateToken", () => {
    it("should validate a valid token", async () => {
      await authService.register({
        email: "alice@example.com",
        name: "Alice",
        password: "securePass123",
      });

      const loginResult = await authService.login({
        email: "alice@example.com",
        password: "securePass123",
      });

      const userId = await authService.validateToken(loginResult.data!.token);
      expect(userId).toBe(loginResult.data!.userId);
    });

    it("should return null for an invalid token", async () => {
      const userId = await authService.validateToken("invalid-token");
      expect(userId).toBeNull();
    });
  });
});
