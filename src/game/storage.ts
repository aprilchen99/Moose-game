import type { PersistentProgress, SpeedMode, TimeMode } from './types';

const STORAGE_KEY = 'matcha_cake_stacker_v1';

const DEFAULT_PROGRESS: PersistentProgress = {
  bestScore: 0,
  bestFloors: 0,
  bestCombo: 0,
  unlockedIds: ['uji_matcha'],
  unlockedAchievementIds: [],
  isMuted: false,
  isMusicMuted: false,
  lastSpeedMode: 'normal',
  lastTimeMode: 'endless',
  modeRecords: {},
};

export function getModeKey(speed: SpeedMode, time: TimeMode): string {
  return `${speed}_${time}`;
}

export function loadProgress(): PersistentProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<PersistentProgress>;
    const unlockedSet = new Set<string>(['uji_matcha', ...(parsed.unlockedIds ?? [])]);
    const achievementSet = new Set<string>(parsed.unlockedAchievementIds ?? []);
    const validSpeed: SpeedMode =
      parsed.lastSpeedMode === 'relaxed' ||
      parsed.lastSpeedMode === 'normal' ||
      parsed.lastSpeedMode === 'turbo'
        ? parsed.lastSpeedMode
        : 'normal';
    const validTime: TimeMode =
      parsed.lastTimeMode === 'endless' ||
      parsed.lastTimeMode === '30s' ||
      parsed.lastTimeMode === '60s'
        ? parsed.lastTimeMode
        : 'endless';

    return {
      bestScore: typeof parsed.bestScore === 'number' ? Math.max(0, parsed.bestScore) : 0,
      bestFloors: typeof parsed.bestFloors === 'number' ? Math.max(0, parsed.bestFloors) : 0,
      bestCombo: typeof parsed.bestCombo === 'number' ? Math.max(0, parsed.bestCombo) : 0,
      unlockedIds: Array.from(unlockedSet),
      unlockedAchievementIds: Array.from(achievementSet),
      isMuted: Boolean(parsed.isMuted),
      isMusicMuted: Boolean(parsed.isMusicMuted),
      lastSpeedMode: validSpeed,
      lastTimeMode: validTime,
      modeRecords: parsed.modeRecords && typeof parsed.modeRecords === 'object' ? parsed.modeRecords : {},
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: PersistentProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}
