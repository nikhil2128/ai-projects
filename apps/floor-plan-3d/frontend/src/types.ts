export type RoomType =
  | 'bedroom'
  | 'living_room'
  | 'kitchen'
  | 'bathroom'
  | 'balcony'
  | 'dining'
  | 'hall'
  | 'utility'
  | 'other';

export interface Room {
  name: string;
  type: RoomType;
  width: number;
  length: number;
  x: number;
  y: number;
}

export interface FloorPlan {
  unit: 'feet' | 'meters';
  totalWidth: number;
  totalLength: number;
  rooms: Room[];
}

export const ROOM_COLORS: Record<RoomType, string> = {
  bedroom: '#818cf8',
  living_room: '#34d399',
  kitchen: '#fbbf24',
  bathroom: '#22d3ee',
  balcony: '#a3e635',
  dining: '#f472b6',
  hall: '#c084fc',
  utility: '#a8a29e',
  other: '#94a3b8',
};

export interface HistoryEntry {
  id: string;
  imageDataUrl: string;
  floorPlan: FloorPlan;
  createdAt: string;
}

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  bedroom: 'Bedroom',
  living_room: 'Living Room',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  balcony: 'Balcony',
  dining: 'Dining',
  hall: 'Hall / Passage',
  utility: 'Utility',
  other: 'Other',
};
