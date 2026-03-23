import { describe, it, expect } from 'vitest';
import {
  createAnnotationSchema,
  updateAnnotationSchema,
} from '../services/annotation.service';

describe('Annotation Schemas', () => {
  describe('createAnnotationSchema', () => {
    it('should validate a correct annotation', () => {
      const input = {
        centerX: 50,
        centerY: 30,
        radius: 10,
        color: '#FF0000',
        label: 'Scratch detected',
      };

      const result = createAnnotationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should apply default color when not provided', () => {
      const input = {
        centerX: 50,
        centerY: 30,
        radius: 10,
      };

      const result = createAnnotationSchema.parse(input);
      expect(result.color).toBe('#FF0000');
    });

    it('should reject centerX > 100', () => {
      const result = createAnnotationSchema.safeParse({
        centerX: 150,
        centerY: 30,
        radius: 10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject centerY < 0', () => {
      const result = createAnnotationSchema.safeParse({
        centerX: 50,
        centerY: -5,
        radius: 10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject radius too small', () => {
      const result = createAnnotationSchema.safeParse({
        centerX: 50,
        centerY: 50,
        radius: 0.1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject radius too large', () => {
      const result = createAnnotationSchema.safeParse({
        centerX: 50,
        centerY: 50,
        radius: 60,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid hex color', () => {
      const result = createAnnotationSchema.safeParse({
        centerX: 50,
        centerY: 50,
        radius: 10,
        color: 'red',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid hex colors', () => {
      const colors = ['#000000', '#FFFFFF', '#ff00ff', '#123456'];
      for (const color of colors) {
        const result = createAnnotationSchema.safeParse({
          centerX: 50,
          centerY: 50,
          radius: 10,
          color,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('updateAnnotationSchema', () => {
    it('should allow partial updates', () => {
      const result = updateAnnotationSchema.safeParse({ status: 'RESOLVED' });
      expect(result.success).toBe(true);
    });

    it('should allow updating position', () => {
      const result = updateAnnotationSchema.safeParse({
        centerX: 60,
        centerY: 40,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = updateAnnotationSchema.safeParse({ status: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('should accept all valid statuses', () => {
      const statuses = ['OPEN', 'RESOLVED', 'DISMISSED'];
      for (const status of statuses) {
        const result = updateAnnotationSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });
  });
});
