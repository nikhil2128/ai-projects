import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AppRewards } from '../types';

const STORAGE_KEY = 'kids-hub-rewards';

const DEFAULT_REWARDS: AppRewards = {
  score: 0,
  streak: 0,
  highScore: 0,
  lastPlayed: null,
};

interface RewardsContextValue {
  getRewards: (appId: string) => AppRewards;
  incrementScore: (appId: string) => void;
  incrementStreak: (appId: string) => void;
  resetStreak: (appId: string) => void;
  getAllRewards: () => Record<string, AppRewards>;
}

const RewardsContext = createContext<RewardsContextValue | null>(null);

function loadRewards(): Record<string, AppRewards> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRewards(rewards: Record<string, AppRewards>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rewards));
  } catch { /* quota exceeded, silently fail */ }
}

export function RewardsProvider({ children }: { children: ReactNode }) {
  const [rewards, setRewards] = useState<Record<string, AppRewards>>(loadRewards);

  useEffect(() => {
    saveRewards(rewards);
  }, [rewards]);

  const getRewards = useCallback(
    (appId: string): AppRewards => rewards[appId] ?? { ...DEFAULT_REWARDS },
    [rewards],
  );

  const getAllRewards = useCallback(() => rewards, [rewards]);

  const updateApp = useCallback((appId: string, updater: (prev: AppRewards) => AppRewards) => {
    setRewards((prev) => {
      const current = prev[appId] ?? { ...DEFAULT_REWARDS };
      const updated = updater(current);
      return { ...prev, [appId]: updated };
    });
  }, []);

  const incrementScore = useCallback(
    (appId: string) =>
      updateApp(appId, (r) => {
        const newScore = r.score + 1;
        return {
          ...r,
          score: newScore,
          highScore: Math.max(r.highScore, newScore),
          lastPlayed: new Date().toISOString(),
        };
      }),
    [updateApp],
  );

  const incrementStreak = useCallback(
    (appId: string) =>
      updateApp(appId, (r) => ({
        ...r,
        streak: r.streak + 1,
        lastPlayed: new Date().toISOString(),
      })),
    [updateApp],
  );

  const resetStreak = useCallback(
    (appId: string) =>
      updateApp(appId, (r) => ({ ...r, streak: 0 })),
    [updateApp],
  );

  return (
    <RewardsContext value={{
      getRewards,
      incrementScore,
      incrementStreak,
      resetStreak,
      getAllRewards,
    }}>
      {children}
    </RewardsContext>
  );
}

export function useRewards() {
  const ctx = useContext(RewardsContext);
  if (!ctx) throw new Error('useRewards must be used within RewardsProvider');
  return ctx;
}
