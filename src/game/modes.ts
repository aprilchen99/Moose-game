import type { ModeRecord, PersistentProgress, SpeedMode, TimeMode } from './types';
import { getModeKey } from './storage';

export interface ModeOption<T extends string> {
  id: T;
  label: string;
  hint: string;
}

export const SPEED_MODE_OPTIONS: ModeOption<SpeedMode>[] = [
  { id: 'relaxed', label: '悠閒', hint: '0.7x 慢速' },
  { id: 'normal', label: '標準', hint: '1.0x 常速' },
  { id: 'turbo', label: '極速', hint: '1.5x 高速' },
];

export const TIME_MODE_OPTIONS: ModeOption<TimeMode>[] = [
  { id: 'endless', label: '無限制', hint: '自由堆疊' },
  { id: '30s', label: '30 秒', hint: '極限衝刺' },
  { id: '60s', label: '60 秒', hint: '限時挑戰' },
];

export function getSpeedLabel(mode: SpeedMode): string {
  switch (mode) {
    case 'relaxed':
      return '悠閒';
    case 'normal':
      return '標準';
    case 'turbo':
      return '極速';
  }
}

export function getTimeLabel(mode: TimeMode): string {
  switch (mode) {
    case 'endless':
      return '無限制';
    case '30s':
      return '30 秒';
    case '60s':
      return '60 秒';
  }
}

export function getModeDisplayName(speed: SpeedMode, time: TimeMode): string {
  return `${getSpeedLabel(speed)}速度 · ${getTimeLabel(time)}`;
}

export function getInitialTimeForMode(mode: TimeMode): number | null {
  switch (mode) {
    case '30s':
      return 30;
    case '60s':
      return 60;
    case 'endless':
      return null;
  }
}

export function getModeRecord(
  progress: PersistentProgress,
  speed: SpeedMode,
  time: TimeMode
): ModeRecord {
  const key = getModeKey(speed, time);
  const stored = progress.modeRecords[key];
  if (stored) {
    return stored;
  }
  if (speed === 'normal' && time === 'endless') {
    return {
      bestScore: progress.bestScore,
      bestFloors: progress.bestFloors,
    };
  }
  return { bestScore: 0, bestFloors: 0 };
}
