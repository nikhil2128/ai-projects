import type { ComponentType } from 'react';

export interface AppRewards {
  score: number;
  streak: number;
  highScore: number;
  lastPlayed: string | null;
}

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  component: ComponentType;
}
