import { z } from 'zod';

export const RoomTypeEnum = z.enum([
  'bedroom',
  'living_room',
  'kitchen',
  'bathroom',
  'balcony',
  'dining',
  'hall',
  'utility',
  'other',
]);

export const RoomSchema = z.object({
  name: z.string(),
  type: RoomTypeEnum,
  width: z.number().positive(),
  length: z.number().positive(),
  x: z.number(),
  y: z.number(),
});

export const FloorPlanSchema = z.object({
  unit: z.enum(['feet', 'meters']),
  totalWidth: z.number().positive(),
  totalLength: z.number().positive(),
  rooms: z.array(RoomSchema).min(1),
});

export type RoomType = z.infer<typeof RoomTypeEnum>;
export type Room = z.infer<typeof RoomSchema>;
export type FloorPlan = z.infer<typeof FloorPlanSchema>;
