import type { AppConfig } from '../types';
import { AlphabetTracer } from './alphabet-tracer/AlphabetTracer';
import { CVCReader } from './cvc-reader/CVCReader';
import { ComingSoonApp } from './ComingSoonApp';

export const apps: AppConfig[] = [
  {
    id: 'alphabet-tracer',
    name: 'ABC Tracer',
    description: 'Trace lowercase letters and learn to write the alphabet!',
    icon: '✏️',
    color: '#FF6B6B',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    component: AlphabetTracer,
  },
  {
    id: 'cvc-reader',
    name: 'Word Reader',
    description: 'Read CVC words aloud and practice phonics!',
    icon: '📖',
    color: '#6BCB77',
    gradient: 'linear-gradient(135deg, #6BCB77 0%, #4ECDC4 100%)',
    component: CVCReader,
  },
  {
    id: 'number-counting',
    name: 'Number Fun',
    description: 'Count objects and learn numbers from 1 to 20!',
    icon: '🔢',
    color: '#4ECDC4',
    gradient: 'linear-gradient(135deg, #4ECDC4 0%, #44B09E 100%)',
    component: ComingSoonApp,
  },
  {
    id: 'color-match',
    name: 'Color Match',
    description: 'Match colors and learn their names with fun games!',
    icon: '🎨',
    color: '#9B59B6',
    gradient: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)',
    component: ComingSoonApp,
  },
  {
    id: 'shape-sorter',
    name: 'Shape Sorter',
    description: 'Identify and sort circles, squares, triangles & more!',
    icon: '🔷',
    color: '#4D96FF',
    gradient: 'linear-gradient(135deg, #4D96FF 0%, #3B7DD8 100%)',
    component: ComingSoonApp,
  },
];

export function getAppById(id: string): AppConfig | undefined {
  return apps.find((app) => app.id === id);
}
