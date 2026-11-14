export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type CakeToppingType =
  | 'matcha_drizzle'
  | 'almond_cream'
  | 'strawberry'
  | 'chestnut_swirl'
  | 'warabi_cube'
  | 'peach_blush'
  | 'black_sesame'
  | 'gold_yuzu';

export interface CakeStyle {
  id: string;
  name: string;
  subtitle: string;
  unlockFloor: number;
  spongeColor: string;
  spongeShadow: string;
  spongeSpeckle: string;
  fillingColor: string;
  glazeColor: string;
  glazeHighlight: string;
  topping: CakeToppingType;
  accentColor: string;
}

export interface CakeTier {
  id: number;
  x: number; // Horizontal center in world coordinates (0 = plate center)
  y: number; // Bottom edge Y in world coordinates (0 = ground plate surface)
  width: number;
  height: number;
  style: CakeStyle;
  squash: number; // 0..1 landing squash-and-stretch factor
  squashVel: number;
  isPerfect: boolean;
  widenGlow: number; // 0..1 glow timer when widened
}

export interface FallingSlice {
  x: number;
  y: number; // Center Y in world coordinates
  width: number;
  height: number;
  vx: number;
  vy: number;
  angle: number;
  angularVel: number;
  style: CakeStyle;
  opacity: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  color: string;
  shape: 'circle' | 'petal' | 'flake' | 'crumb';
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface CreamDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  highlightColor: string;
  life: number;
  maxLife: number;
}

export interface CreamOoze {
  x: number;
  y: number;
  width: number;
  creamColor: string;
  glazeColor: string;
  life: number;
  maxLife: number;
}

export interface ScreenSplat {
  nx: number; // Normalized viewport X (0..1)
  ny: number; // Normalized viewport Y (0..1)
  radius: number; // Base px radius
  color: string;
  highlightColor: string;
  seed: number;
  dripOffset: number;
  dripSpeed: number;
  life: number;
  maxLife: number;
}

export type AchievementRank = 'matcha' | 'sakura' | 'gold';

export type AchievementIconType =
  | 'sprout'
  | 'whisk'
  | 'craft'
  | 'star'
  | 'moon'
  | 'torii'
  | 'crown'
  | 'needle'
  | 'seal';

export interface AchievementEvalContext {
  floors: number;
  combo: number;
  maxComboInRun: number;
  score: number;
  landedWidthRatio: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  subtitle: string;
  conditionLabel: string;
  rank: AchievementRank;
  icon: AchievementIconType;
  priority: number;
  check: (ctx: AchievementEvalContext) => boolean;
}

export type SpeedMode = 'relaxed' | 'normal' | 'turbo';
export type TimeMode = 'endless' | '30s' | '60s';
export type EndReason = 'MISS' | 'TIME_UP';

export interface ModeRecord {
  bestScore: number;
  bestFloors: number;
}

export interface GameHudSnapshot {
  score: number;
  floors: number;
  combo: number;
  maxComboInRun: number;
  currentWidthRatio: number; // 0..1 relative to INITIAL_CAKE_WIDTH
  activeStyle: CakeStyle;
  newlyUnlockedIds: string[];
  runAchievementIds: string[];
  newlyUnlockedAchievementIds: string[];
  isNewRecord: boolean;
  perfectCount: number;
  remainingTimeSec: number | null;
  endReason: EndReason;
}

export interface PersistentProgress {
  bestScore: number;
  bestFloors: number;
  bestCombo: number;
  unlockedIds: string[];
  unlockedAchievementIds: string[];
  isMuted: boolean;
  isMusicMuted: boolean;
  lastSpeedMode: SpeedMode;
  lastTimeMode: TimeMode;
  modeRecords: Record<string, ModeRecord>;
}
