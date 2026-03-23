import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService, registerSchema, loginSchema } from '../services/auth.service';

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    it('should validate a correct registration input', () => {
      const input = {
        email: 'test@example.com',
        password: 'securepass123',
        name: 'John Doe',
        role: 'ENGINEER' as const,
        department: 'Mechanical',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const input = {
        email: 'not-an-email',
        password: 'securepass123',
        name: 'John Doe',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const input = {
        email: 'test@example.com',
        password: 'short',
        name: 'John Doe',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const input = {
        email: 'test@example.com',
        password: 'securepass123',
        name: '',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should default role to FACTORY_WORKER', () => {
      const input = {
        email: 'test@example.com',
        password: 'securepass123',
        name: 'John Doe',
      };

      const result = registerSchema.parse(input);
      expect(result.role).toBe('FACTORY_WORKER');
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login input', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'securepass123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Auth Validation', () => {
  describe('registerSchema edge cases', () => {
    it('should reject invalid role', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'securepass123',
        name: 'Test',
        role: 'INVALID_ROLE',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid roles', () => {
      const roles = ['ADMIN', 'ENGINEER', 'PROCUREMENT', 'FACTORY_WORKER'] as const;
      for (const role of roles) {
        const result = registerSchema.safeParse({
          email: 'test@example.com',
          password: 'securepass123',
          name: 'Test',
          role,
        });
        expect(result.success).toBe(true);
      }
    });
  });
});
