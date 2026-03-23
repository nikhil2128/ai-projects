import { describe, it, expect } from 'vitest';
import { createCommentSchema } from '../services/comment.service';

describe('Comment Schemas', () => {
  describe('createCommentSchema', () => {
    it('should validate a correct comment', () => {
      const result = createCommentSchema.safeParse({
        body: 'Is this scratch acceptable?',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty body', () => {
      const result = createCommentSchema.safeParse({ body: '' });
      expect(result.success).toBe(false);
    });

    it('should reject body exceeding max length', () => {
      const result = createCommentSchema.safeParse({
        body: 'x'.repeat(5001),
      });
      expect(result.success).toBe(false);
    });

    it('should accept body at max length', () => {
      const result = createCommentSchema.safeParse({
        body: 'x'.repeat(5000),
      });
      expect(result.success).toBe(true);
    });

    it('should trim body correctly', () => {
      const result = createCommentSchema.safeParse({
        body: 'Valid comment with content',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).toBe('Valid comment with content');
      }
    });
  });
});
