import { useCallback, useEffect, useRef } from 'react';
import { evaluateAchievements } from '../game/achievements';
import { audioEngine } from '../game/audio';
import {
  CAKE_HEIGHT,
  CAKE_STYLES,
  COMBO_WIDEN_THRESHOLD,
  INITIAL_CAKE_WIDTH,
  PLATE_WIDTH,
  WIDEN_AMOUNT,
  getCakeStyleForFloor,
  getNewlyUnlockedStyleAtFloor,
} from '../game/cakeStyles';
import {
  drawAlignmentGuides,
  drawBackdrop,
  drawCounterAndPlate,
  drawCreamSplashes,
  drawFallingSlices,
  drawFloatingTexts,
  drawParticles,
  drawPendulum,
  drawScreenSplats,
  drawStackedTiers,
  type WorldTransform,
} from '../game/renderer';
import type {
  AchievementDef,
  CakeStyle,
  CakeTier,
  CreamDrop,
  CreamOoze,
  EndReason,
  FallingSlice,
  FloatingText,
  GameHudSnapshot,
  GameState,
  Particle,
  ScreenSplat,
  SpeedMode,
  TimeMode,
} from '../game/types';

interface GameCanvasProps {
  gameState: GameState;
  runId: number;
  speedMode: SpeedMode;
  timeMode: TimeMode;
  bestFloors: number;
  bestScore: number;
  alreadyUnlockedIds: string[];
  alreadyUnlockedAchievementIds: string[];
  onHudUpdate: (snapshot: GameHudSnapshot) => void;
  onGameOver: (finalSnapshot: GameHudSnapshot) => void;
  onAchievementEarned: (achievement: AchievementDef, isFirstEver: boolean) => void;
  onAutoPause: () => void;
}

function getSpeedMultiplier(mode: SpeedMode): number {
  switch (mode) {
    case 'relaxed':
      return 0.5;
    case 'normal':
      return 1.0;
    case 'turbo':
      return 1.5;
  }
}

function getInitialTimeSec(mode: TimeMode): number | null {
  switch (mode) {
    case '30s':
      return 30;
    case '60s':
      return 60;
    case 'endless':
      return null;
  }
}

const PARTICLE_POOL_SIZE = 160;
const GRAVITY = 3600;
const SWING_AMPLITUDE = 138;
const SWING_OFFSET_ABOVE_CAMERA = 385;

interface SimState {
  phase: 'SWINGING' | 'FALLING' | 'MISS_FALLING';
  tiers: CakeTier[];
  slices: FallingSlice[];
  particles: Particle[];
  texts: FloatingText[];
  creamDrops: CreamDrop[];
  creamOozes: CreamOoze[];
  screenSplats: ScreenSplat[];
  missSplatted: boolean;
  swingPhase: number;
  currentWidth: number;
  activeX: number;
  activeY: number;
  activeVy: number;
  activeAngle: number;
  activeStyle: CakeStyle;
  cameraY: number;
  targetCameraY: number;
  shakeTime: number;
  shakeIntensity: number;
  hitstopTimer: number;
  missTimer: number;
  score: number;
  combo: number;
  maxComboInRun: number;
  perfectCount: number;
  newlyUnlockedIds: string[];
  runAchievementIds: string[];
  newlyUnlockedAchievementIds: string[];
  timeSec: number;
  remainingTimeSec: number | null;
  lastHudTimeDeci: number;
  lastCountdownBeepSec: number;
  endReason: EndReason;
  dropQueued: boolean;
  gameOverEmitted: boolean;
}

function createParticlePool(): Particle[] {
  return Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 3,
    rotation: 0,
    vRot: 0,
    life: 0,
    maxLife: 1,
    color: '#5B8A47',
    shape: 'circle',
  }));
}

function createInitialSimState(initialTimeSec: number | null = null): SimState {
  return {
    phase: 'SWINGING',
    tiers: [],
    slices: [],
    particles: createParticlePool(),
    texts: [],
    creamDrops: [],
    creamOozes: [],
    screenSplats: [],
    missSplatted: false,
    swingPhase: -Math.PI * 0.35,
    currentWidth: INITIAL_CAKE_WIDTH,
    activeX: 0,
    activeY: SWING_OFFSET_ABOVE_CAMERA,
    activeVy: 0,
    activeAngle: 0,
    activeStyle: CAKE_STYLES[0],
    cameraY: 0,
    targetCameraY: 0,
    shakeTime: 0,
    shakeIntensity: 0,
    hitstopTimer: 0,
    missTimer: 0,
    score: 0,
    combo: 0,
    maxComboInRun: 0,
    perfectCount: 0,
    newlyUnlockedIds: [],
    runAchievementIds: [],
    newlyUnlockedAchievementIds: [],
    timeSec: 0,
    remainingTimeSec: initialTimeSec,
    lastHudTimeDeci: initialTimeSec !== null ? initialTimeSec * 10 : -1,
    lastCountdownBeepSec: initialTimeSec !== null ? initialTimeSec + 1 : -1,
    endReason: 'MISS',
    dropQueued: false,
    gameOverEmitted: false,
  };
}

export function GameCanvas({
  gameState,
  runId,
  speedMode,
  timeMode,
  bestFloors,
  bestScore,
  alreadyUnlockedIds,
  alreadyUnlockedAchievementIds,
  onHudUpdate,
  onGameOver,
  onAchievementEarned,
  onAutoPause,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<SimState>(createInitialSimState(getInitialTimeSec(timeMode)));
  const sizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 390,
    height: 844,
    dpr: 1,
  });

  // Keep latest props accessible inside rAF without restarting loop
  const propsRef = useRef({
    gameState,
    speedMode,
    timeMode,
    bestFloors,
    bestScore,
    alreadyUnlockedIds,
    alreadyUnlockedAchievementIds,
    onHudUpdate,
    onGameOver,
    onAchievementEarned,
    onAutoPause,
  });
  propsRef.current = {
    gameState,
    speedMode,
    timeMode,
    bestFloors,
    bestScore,
    alreadyUnlockedIds,
    alreadyUnlockedAchievementIds,
    onHudUpdate,
    onGameOver,
    onAchievementEarned,
    onAutoPause,
  };

  const emitSnapshot = useCallback((isFinal = false) => {
    const s = simRef.current;
    const { bestScore: prevBestScore, onHudUpdate: hudCb, onGameOver: overCb } = propsRef.current;
    const snapshot: GameHudSnapshot = {
      score: s.score,
      floors: s.tiers.length,
      combo: s.combo,
      maxComboInRun: s.maxComboInRun,
      currentWidthRatio: Math.max(0.05, s.currentWidth / INITIAL_CAKE_WIDTH),
      activeStyle: s.activeStyle,
      newlyUnlockedIds: [...s.newlyUnlockedIds],
      runAchievementIds: [...s.runAchievementIds],
      newlyUnlockedAchievementIds: [...s.newlyUnlockedAchievementIds],
      isNewRecord: s.score > prevBestScore && s.score > 0,
      perfectCount: s.perfectCount,
      remainingTimeSec: s.remainingTimeSec,
      endReason: s.endReason,
    };
    if (isFinal) {
      overCb(snapshot);
    } else {
      hudCb(snapshot);
    }
  }, []);

  const checkRunAchievements = useCallback((landedWidthRatio: number) => {
    const s = simRef.current;
    const earned = evaluateAchievements({
      floors: s.tiers.length,
      combo: s.combo,
      maxComboInRun: s.maxComboInRun,
      score: s.score,
      landedWidthRatio,
    });

    for (const ach of earned) {
      if (!s.runAchievementIds.includes(ach.id)) {
        s.runAchievementIds.push(ach.id);
        const isFirstEver =
          !propsRef.current.alreadyUnlockedAchievementIds.includes(ach.id) &&
          !s.newlyUnlockedAchievementIds.includes(ach.id);
        if (isFirstEver) {
          s.newlyUnlockedAchievementIds.push(ach.id);
        }
        audioEngine.playUnlock();
        propsRef.current.onAchievementEarned(ach, isFirstEver);
      }
    }
  }, []);

  // Reset simulation cleanly whenever runId changes
  useEffect(() => {
    simRef.current = createInitialSimState(getInitialTimeSec(propsRef.current.timeMode));
    emitSnapshot(false);
  }, [runId, emitSnapshot]);

  // Spawn helpers
  const spawnParticles = useCallback(
    (
      x: number,
      y: number,
      count: number,
      colors: string[],
      shape: Particle['shape'],
      speedMin: number,
      speedMax: number,
      spreadUp = true
    ) => {
      const pool = simRef.current.particles;
      let spawned = 0;
      for (let i = 0; i < pool.length && spawned < count; i++) {
        const p = pool[i];
        if (p.active) continue;
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 16;
        p.y = y + (Math.random() - 0.5) * 6;
        const angle = spreadUp
          ? Math.PI * (0.12 + Math.random() * 0.76)
          : Math.random() * Math.PI * 2;
        const speed = speedMin + Math.random() * (speedMax - speedMin);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.size = shape === 'flake' ? 3.5 + Math.random() * 2.5 : 2.5 + Math.random() * 2.5;
        p.rotation = Math.random() * Math.PI * 2;
        p.vRot = (Math.random() - 0.5) * 8;
        p.maxLife = 0.55 + Math.random() * 0.45;
        p.life = p.maxLife;
        p.color = colors[spawned % colors.length];
        p.shape = shape;
        spawned++;
      }
    },
    []
  );

  const pushFloatingText = useCallback(
    (x: number, y: number, text: string, color: string, subtext?: string, scale = 1) => {
      simRef.current.texts.push({
        x,
        y,
        text,
        subtext,
        color,
        life: 0.95,
        maxLife: 0.95,
        scale,
      });
    },
    []
  );

  const spawnCreamSplash = useCallback(
    (x: number, y: number, width: number, style: CakeStyle, isHeavy: boolean) => {
      const s = simRef.current;

      // Seam whipped-cream & cake-glaze squish wave
      s.creamOozes.push({
        x,
        y,
        width: width + 10,
        creamColor: style.fillingColor,
        glazeColor: style.glazeColor,
        life: 0.52,
        maxLife: 0.52,
      });

      // Rich flying viscous cream, glaze, and cake-sponge droplets bursting outward on every stack
      const count = isHeavy ? 30 : 24;
      for (let i = 0; i < count; i++) {
        const dir = i % 2 === 0 ? -1 : 1;
        const edgeOffset = dir * (width * (0.28 + Math.random() * 0.24));
        const speedX = dir * (110 + Math.random() * (isHeavy ? 210 : 165));
        const speedY = 110 + Math.random() * (isHeavy ? 230 : 180);
        const kind = i % 4;
        const color =
          kind === 0 || kind === 1
            ? style.fillingColor
            : kind === 2
              ? style.glazeColor
              : style.spongeColor;
        const highlight = kind === 2 ? style.glazeHighlight : '#FFFFFF';
        const maxLife = 0.5 + Math.random() * 0.35;
        s.creamDrops.push({
          x: x + edgeOffset,
          y: y + 4,
          vx: speedX,
          vy: speedY,
          radius: kind <= 1 ? 4.4 + Math.random() * 3.8 : 3.6 + Math.random() * 3.0,
          color,
          highlightColor: highlight,
          life: maxLife,
          maxLife,
        });
      }

      // Cap active screen splats to keep gameplay crisp while delivering a lively cake-splatter scene on every stack
      if (s.screenSplats.length > 14) {
        s.screenSplats.splice(0, s.screenSplats.length - 14);
      }

      // Perimeter foreground cake-cream splatters on every stack landing (keeping center 30%-70% lane clear)
      const splatCount = isHeavy ? 4 : 3;
      for (let k = 0; k < splatCount; k++) {
        const onLeft = k % 2 === 0;
        const nx = onLeft ? 0.05 + Math.random() * 0.16 : 0.79 + Math.random() * 0.16;
        const ny = 0.36 + Math.random() * 0.5;
        const useGlaze = k === 1;
        const useSponge = k === 3;
        s.screenSplats.push({
          nx,
          ny,
          radius: isHeavy ? 18 + Math.random() * 14 : 15 + Math.random() * 11,
          color: useGlaze
            ? style.glazeColor
            : useSponge
              ? style.spongeColor
              : style.fillingColor,
          highlightColor: useGlaze ? style.glazeHighlight : '#FFFFFF',
          seed: Math.random() * 12,
          dripOffset: 0,
          dripSpeed: 20 + Math.random() * 16,
          life: 1.35,
          maxLife: 1.35,
        });
      }
    },
    []
  );

  const spawnMissScreenSplats = useCallback((style: CakeStyle) => {
    const s = simRef.current;
    const spots = [
      { nx: 0.22, ny: 0.74, r: 34, useGlaze: false },
      { nx: 0.78, ny: 0.7, r: 30, useGlaze: true },
      { nx: 0.46, ny: 0.82, r: 38, useGlaze: false },
      { nx: 0.14, ny: 0.56, r: 22, useGlaze: true },
      { nx: 0.85, ny: 0.52, r: 24, useGlaze: false },
      { nx: 0.62, ny: 0.78, r: 26, useGlaze: true },
    ];
    for (const spot of spots) {
      s.screenSplats.push({
        nx: spot.nx + (Math.random() - 0.5) * 0.05,
        ny: spot.ny + (Math.random() - 0.5) * 0.05,
        radius: spot.r,
        color: spot.useGlaze ? style.glazeColor : style.fillingColor,
        highlightColor: spot.useGlaze ? style.glazeHighlight : '#FFFFFF',
        seed: Math.random() * 12,
        dripOffset: 0,
        dripSpeed: 28 + Math.random() * 20,
        life: 2.1,
        maxLife: 2.1,
      });
    }
  }, []);

  // Trigger drop action (edge-triggered)
  const triggerDrop = useCallback(() => {
    if (propsRef.current.gameState !== 'PLAYING') return;
    const s = simRef.current;
    if (s.phase !== 'SWINGING') return;
    audioEngine.unlock();
    s.dropQueued = true;
  }, []);

  // Keyboard & window blur handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (propsRef.current.gameState !== 'PLAYING') return;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown') {
        e.preventDefault();
        triggerDrop();
      }
    };

    const handleBlur = () => {
      simRef.current.dropQueued = false;
      if (propsRef.current.gameState === 'PLAYING') {
        propsRef.current.onAutoPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    };
  }, [triggerDrop]);

  // ResizeObserver for crisp Retina canvas scaling
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(300, Math.floor(rect.width));
      const h = Math.max(400, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      sizeRef.current = { width: w, height: h, dpr };
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Isolated 60fps simulation & render loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      const { width, height, dpr } = sizeRef.current;
      const scale = Math.min(width / 400, height / 690);
      const baseScreenY = height * 0.84;
      const s = simRef.current;
      const state = propsRef.current.gameState;

      // Ambient time continues smoothly except when paused
      if (state !== 'PAUSED') {
        s.timeSec += dt;
      }

      // Compute camera-relative pendulum anchor so it always fits cleanly on any screen
      const topVisibleWorldY = s.cameraY + baseScreenY / scale;
      const pivotY = Math.max(s.cameraY + 530, topVisibleWorldY - 12);
      const swingTargetY = s.cameraY + SWING_OFFSET_ABOVE_CAMERA;
      const ropeLength = Math.max(135, pivotY - swingTargetY);

      if (state === 'PLAYING') {
        // Time-limit challenge countdown (pauses cleanly on hitstop/pause/miss)
        if (s.remainingTimeSec !== null && s.phase !== 'MISS_FALLING' && !s.gameOverEmitted) {
          s.remainingTimeSec = Math.max(0, s.remainingTimeSec - dt);
          const ceilSec = Math.ceil(s.remainingTimeSec);
          if (ceilSec >= 1 && ceilSec <= 5 && ceilSec !== s.lastCountdownBeepSec) {
            s.lastCountdownBeepSec = ceilSec;
            audioEngine.playCountdownTick(ceilSec <= 3);
          }
          if (s.remainingTimeSec <= 0 && s.phase === 'SWINGING') {
            s.endReason = 'TIME_UP';
            s.gameOverEmitted = true;
            audioEngine.playTimeUp();
            emitSnapshot(true);
          } else {
            const deci = Math.ceil(s.remainingTimeSec * 10);
            if (deci !== s.lastHudTimeDeci) {
              s.lastHudTimeDeci = deci;
              emitSnapshot(false);
            }
          }
        }

        // Handle hitstop pause for heavy/perfect impacts
        if (s.hitstopTimer > 0) {
          s.hitstopTimer = Math.max(0, s.hitstopTimer - dt);
        } else if (!s.gameOverEmitted) {
          // Camera follow
          const camLerp = 1 - Math.exp(-6.5 * dt);
          s.cameraY += (s.targetCameraY - s.cameraY) * camLerp;

          // Angular frequency: relaxed mode maintains a steady calm pace regardless of height;
          // normal and turbo modes accelerate progressively as the tower grows.
          const n = s.tiers.length;
          const activeSpeedMode = propsRef.current.speedMode;
          const speedMult = getSpeedMultiplier(activeSpeedMode);
          const baseOmega =
            activeSpeedMode === 'relaxed'
              ? 2.15
              : 2.15 + 1.85 * (1 - Math.exp(-n / 18)) + Math.min(0.85, n * 0.02);
          const omega = baseOmega * speedMult;

          if (s.phase === 'SWINGING') {
            s.swingPhase += omega * dt;
            const sinTheta = Math.max(
              -0.92,
              Math.min(0.92, (SWING_AMPLITUDE * Math.sin(s.swingPhase)) / ropeLength)
            );
            const theta = Math.asin(sinTheta);
            s.activeX = Math.sin(theta) * ropeLength;
            s.activeY = pivotY - Math.cos(theta) * ropeLength;
            s.activeAngle = theta * 0.42;

            if (s.dropQueued) {
              s.dropQueued = false;
              s.phase = 'FALLING';
              s.activeVy = -140;
              audioEngine.playDrop();
            }
          } else if (s.phase === 'FALLING') {
            s.dropQueued = false;
            s.activeVy -= GRAVITY * dt;
            s.activeY += s.activeVy * dt;
            s.activeAngle *= Math.exp(-15 * dt);

            const targetTopY =
              s.tiers.length === 0 ? 0 : s.tiers[s.tiers.length - 1].y + CAKE_HEIGHT;

            if (s.activeY - CAKE_HEIGHT / 2 <= targetTopY) {
              // Collision evaluation
              const currLeft = s.activeX - s.currentWidth / 2;
              const currRight = s.activeX + s.currentWidth / 2;

              if (s.tiers.length === 0) {
                // Landing on the ground Hinoki plate
                const plateLeft = -PLATE_WIDTH / 2;
                const plateRight = PLATE_WIDTH / 2;
                const overlapLeft = Math.max(plateLeft, currLeft);
                const overlapRight = Math.min(plateRight, currRight);
                const overlapWidth = overlapRight - overlapLeft;

                if (overlapWidth <= 2) {
                  // Missed the plate completely!
                  s.phase = 'MISS_FALLING';
                  s.missTimer = 0;
                  s.shakeTime = 0.24;
                  s.shakeIntensity = 5;
                  audioEngine.playGameOver();
                } else {
                  const isCenterBullseye = Math.abs(s.activeX) <= 8;
                  const newWidth = isCenterBullseye ? s.currentWidth : overlapWidth;
                  const newX = isCenterBullseye
                    ? 0
                    : overlapWidth < s.currentWidth
                      ? (overlapLeft + overlapRight) / 2
                      : s.activeX;

                  if (overlapWidth < s.currentWidth && !isCenterBullseye) {
                    const isLeftHang = currLeft < plateLeft;
                    const sliceW = isLeftHang ? plateLeft - currLeft : currRight - plateRight;
                    const sliceX = isLeftHang ? currLeft + sliceW / 2 : plateRight + sliceW / 2;
                    s.slices.push({
                      x: sliceX,
                      y: targetTopY + CAKE_HEIGHT / 2,
                      width: sliceW,
                      height: CAKE_HEIGHT,
                      vx: isLeftHang ? -75 : 75,
                      vy: 40,
                      angle: 0,
                      angularVel: isLeftHang ? -3.0 : 3.0,
                      style: s.activeStyle,
                      opacity: 1,
                    });
                  }

                  s.tiers.push({
                    id: 1,
                    x: newX,
                    y: 0,
                    width: newWidth,
                    height: CAKE_HEIGHT,
                    style: s.activeStyle,
                    squash: 0.85,
                    squashVel: 0,
                    isPerfect: isCenterBullseye,
                    widenGlow: 0,
                  });

                  s.currentWidth = newWidth;
                  spawnCreamSplash(newX, 0, newWidth, s.activeStyle, isCenterBullseye);
                  if (isCenterBullseye) {
                    s.combo = 1;
                    s.maxComboInRun = 1;
                    s.perfectCount = 1;
                    s.score += 15;
                    s.hitstopTimer = 0.035;
                    s.shakeTime = 0.12;
                    s.shakeIntensity = 2.6;
                    audioEngine.playLand(true, 1, false);
                    spawnParticles(
                      newX,
                      CAKE_HEIGHT,
                      14,
                      ['#6BA353', '#FAF5EB', '#E4B15B'],
                      'circle',
                      80,
                      190
                    );
                    pushFloatingText(newX, CAKE_HEIGHT + 24, '正中紅心！', '#3D6B35', '+15', 1.05);
                  } else {
                    s.score += 10;
                    s.shakeTime = 0.08;
                    s.shakeIntensity = 1.8;
                    audioEngine.playLand(false, 0, overlapWidth < INITIAL_CAKE_WIDTH);
                    spawnParticles(newX, CAKE_HEIGHT, 8, ['#D8B98E', '#5B8A47'], 'crumb', 50, 130);
                    pushFloatingText(newX, CAKE_HEIGHT + 20, '+10', '#4A3525');
                  }

                  // Prepare next cake or finish if time expired mid-drop
                  checkRunAchievements(newWidth / INITIAL_CAKE_WIDTH);
                  if (s.remainingTimeSec !== null && s.remainingTimeSec <= 0 && !s.gameOverEmitted) {
                    s.endReason = 'TIME_UP';
                    s.gameOverEmitted = true;
                    audioEngine.playTimeUp();
                    emitSnapshot(true);
                  } else {
                    const nextFloor = s.tiers.length;
                    s.activeStyle = getCakeStyleForFloor(nextFloor);
                    s.phase = 'SWINGING';
                    s.swingPhase = (s.tiers.length % 2 === 0 ? -1 : 1) * Math.PI * 0.42;
                    emitSnapshot(false);
                  }
                }
              } else {
                // Landing on top of existing stack
                const prevTier = s.tiers[s.tiers.length - 1];
                const prevLeft = prevTier.x - prevTier.width / 2;
                const prevRight = prevTier.x + prevTier.width / 2;
                const delta = s.activeX - prevTier.x;
                const perfectThreshold = Math.max(5, Math.min(8.5, prevTier.width * 0.055));

                if (Math.abs(delta) <= perfectThreshold) {
                  // PERFECT ALIGNMENT
                  s.combo += 1;
                  s.perfectCount += 1;
                  s.maxComboInRun = Math.max(s.maxComboInRun, s.combo);

                  let newWidth = s.currentWidth;
                  let widenedGain = 0;
                  let glow = 0;

                  if (
                    s.combo > 0 &&
                    s.combo % COMBO_WIDEN_THRESHOLD === 0 &&
                    newWidth < INITIAL_CAKE_WIDTH
                  ) {
                    const widened = Math.min(INITIAL_CAKE_WIDTH, newWidth + WIDEN_AMOUNT);
                    widenedGain = Math.round(widened - newWidth);
                    newWidth = widened;
                    glow = 1;
                  }

                  const newTierY = prevTier.y + CAKE_HEIGHT;
                  s.tiers.push({
                    id: s.tiers.length + 1,
                    x: prevTier.x,
                    y: newTierY,
                    width: newWidth,
                    height: CAKE_HEIGHT,
                    style: s.activeStyle,
                    squash: 0.95,
                    squashVel: 0,
                    isPerfect: true,
                    widenGlow: glow,
                  });

                  s.currentWidth = newWidth;
                  spawnCreamSplash(prevTier.x, newTierY, newWidth, s.activeStyle, true);
                  const points = 10 + s.combo * 5;
                  s.score += points;
                  s.hitstopTimer = 0.04;
                  s.shakeTime = 0.15;
                  s.shakeIntensity = widenedGain > 0 ? 4.2 : 3.0;

                  if (widenedGain > 0) {
                    audioEngine.playWiden();
                    spawnParticles(
                      prevTier.x,
                      newTierY + CAKE_HEIGHT,
                      26,
                      ['#F6C445', '#FFE599', '#6BA353', '#F3C1C6'],
                      'flake',
                      110,
                      260
                    );
                    pushFloatingText(
                      prevTier.x,
                      newTierY + CAKE_HEIGHT + 28,
                      `完美連擊 x${s.combo}`,
                      '#B45309',
                      `蛋糕加寬 +${widenedGain} · +${points}`,
                      1.15
                    );
                  } else {
                    audioEngine.playLand(true, s.combo, false);
                    spawnParticles(
                      prevTier.x,
                      newTierY + CAKE_HEIGHT,
                      16,
                      [s.activeStyle.spongeColor, s.activeStyle.accentColor, '#F6C445'],
                      s.combo >= 2 ? 'flake' : 'circle',
                      80,
                      200
                    );
                    pushFloatingText(
                      prevTier.x,
                      newTierY + CAKE_HEIGHT + 24,
                      s.combo > 1 ? `完美！ x${s.combo}` : '完美對齊！',
                      '#3D6B35',
                      `+${points}`,
                      1.08
                    );
                  }

                  // Check new cake style unlock
                  const nextFloor = s.tiers.length;
                  const unlockedNow = getNewlyUnlockedStyleAtFloor(nextFloor);
                  if (unlockedNow && !propsRef.current.alreadyUnlockedIds.includes(unlockedNow.id) && !s.newlyUnlockedIds.includes(unlockedNow.id)) {
                    s.newlyUnlockedIds.push(unlockedNow.id);
                    audioEngine.playUnlock();
                    pushFloatingText(
                      0,
                      newTierY + CAKE_HEIGHT + 66,
                      `解鎖新甜點：${unlockedNow.name}`,
                      '#C97A16',
                      undefined,
                      0.96
                    );
                  }

                  // Camera rise
                  const stackTop = newTierY + CAKE_HEIGHT;
                  if (stackTop > 180) {
                    s.targetCameraY = stackTop - 180;
                  }

                  checkRunAchievements(newWidth / INITIAL_CAKE_WIDTH);
                  if (s.remainingTimeSec !== null && s.remainingTimeSec <= 0 && !s.gameOverEmitted) {
                    s.endReason = 'TIME_UP';
                    s.gameOverEmitted = true;
                    audioEngine.playTimeUp();
                    emitSnapshot(true);
                  } else {
                    s.activeStyle = getCakeStyleForFloor(nextFloor);
                    s.phase = 'SWINGING';
                    s.swingPhase = (s.tiers.length % 2 === 0 ? -1 : 1) * Math.PI * 0.42;
                    emitSnapshot(false);
                  }
                } else {
                  // Check overlap
                  const overlapLeft = Math.max(prevLeft, currLeft);
                  const overlapRight = Math.min(prevRight, currRight);
                  const overlapWidth = overlapRight - overlapLeft;

                  if (overlapWidth <= 1.5) {
                    // Complete miss! Let cake tumble past the edge
                    s.phase = 'MISS_FALLING';
                    s.missTimer = 0;
                    s.shakeTime = 0.25;
                    s.shakeIntensity = 5.5;
                    s.activeVy = Math.min(-180, s.activeVy * 0.55);
                    audioEngine.playGameOver();
                    pushFloatingText(
                      s.activeX,
                      targetTopY + 32,
                      '沒對到！',
                      '#B91C1C',
                      undefined,
                      1.05
                    );
                  } else {
                    // Partial overlap -> slice off excess!
                    s.combo = 0;
                    const newX = (overlapLeft + overlapRight) / 2;
                    const newTierY = prevTier.y + CAKE_HEIGHT;
                    const isLeftHang = delta < 0;
                    const sliceW = isLeftHang ? prevLeft - currLeft : currRight - prevRight;
                    const sliceX = isLeftHang ? currLeft + sliceW / 2 : prevRight + sliceW / 2;
                    const cutLineX = isLeftHang ? prevLeft : prevRight;

                    s.slices.push({
                      x: sliceX,
                      y: newTierY + CAKE_HEIGHT / 2,
                      width: sliceW,
                      height: CAKE_HEIGHT,
                      vx: isLeftHang ? -85 : 85,
                      vy: 45,
                      angle: 0,
                      angularVel: isLeftHang ? -3.6 : 3.6,
                      style: s.activeStyle,
                      opacity: 1,
                    });

                    spawnParticles(
                      cutLineX,
                      newTierY + CAKE_HEIGHT * 0.6,
                      10,
                      [s.activeStyle.spongeColor, s.activeStyle.fillingColor],
                      'crumb',
                      60,
                      160
                    );

                    s.tiers.push({
                      id: s.tiers.length + 1,
                      x: newX,
                      y: newTierY,
                      width: overlapWidth,
                      height: CAKE_HEIGHT,
                      style: s.activeStyle,
                      squash: 0.72,
                      squashVel: 0,
                      isPerfect: false,
                      widenGlow: 0,
                    });

                    s.currentWidth = overlapWidth;
                    spawnCreamSplash(newX, newTierY, overlapWidth, s.activeStyle, false);
                    s.score += 10;
                    s.shakeTime = 0.1;
                    s.shakeIntensity = 2.0;
                    audioEngine.playLand(false, 0, true);
                    pushFloatingText(newX, newTierY + CAKE_HEIGHT + 20, '+10', '#4A3525');

                    const nextFloor = s.tiers.length;
                    const unlockedNow = getNewlyUnlockedStyleAtFloor(nextFloor);
                    if (
                      unlockedNow &&
                      !propsRef.current.alreadyUnlockedIds.includes(unlockedNow.id) &&
                      !s.newlyUnlockedIds.includes(unlockedNow.id)
                    ) {
                      s.newlyUnlockedIds.push(unlockedNow.id);
                      audioEngine.playUnlock();
                      pushFloatingText(
                        0,
                        newTierY + CAKE_HEIGHT + 62,
                        `解鎖新甜點：${unlockedNow.name}`,
                        '#C97A16',
                        undefined,
                        0.96
                      );
                    }

                    const stackTop = newTierY + CAKE_HEIGHT;
                    if (stackTop > 180) {
                      s.targetCameraY = stackTop - 180;
                    }

                    checkRunAchievements(overlapWidth / INITIAL_CAKE_WIDTH);
                    if (s.remainingTimeSec !== null && s.remainingTimeSec <= 0 && !s.gameOverEmitted) {
                      s.endReason = 'TIME_UP';
                      s.gameOverEmitted = true;
                      audioEngine.playTimeUp();
                      emitSnapshot(true);
                    } else {
                      s.activeStyle = getCakeStyleForFloor(nextFloor);
                      s.phase = 'SWINGING';
                      s.swingPhase = (s.tiers.length % 2 === 0 ? -1 : 1) * Math.PI * 0.42;
                      emitSnapshot(false);
                    }
                  }
                }
              }
            }
          } else if (s.phase === 'MISS_FALLING') {
            s.dropQueued = false;
            s.activeVy -= GRAVITY * 0.75 * dt;
            s.activeY += s.activeVy * dt;
            const prevX = s.tiers.length > 0 ? s.tiers[s.tiers.length - 1].x : 0;
            const missDir = s.activeX >= prevX ? 1 : -1;
            s.activeX += missDir * 55 * dt;
            s.activeAngle += missDir * 2.8 * dt;
            s.missTimer += dt;

            if (!s.missSplatted && (s.missTimer >= 0.22 || s.activeY <= s.cameraY + 25)) {
              s.missSplatted = true;
              spawnCreamSplash(s.activeX, Math.max(s.cameraY + 10, s.activeY), s.currentWidth, s.activeStyle, true);
              spawnMissScreenSplats(s.activeStyle);
            }

            if (s.missTimer >= 0.62 && !s.gameOverEmitted) {
              s.gameOverEmitted = true;
              emitSnapshot(true);
            }
          }
        }
      } else if (state === 'GAME_OVER') {
        // Gentle tower overview pan on Game Over
        const stackTop = s.tiers.length * CAKE_HEIGHT;
        const overviewCam = Math.max(0, stackTop - 260);
        s.cameraY += (overviewCam - s.cameraY) * (1 - Math.exp(-3.5 * dt));

        // Ambient sakura drift on Game Over
        if (Math.random() < dt * 2.5) {
          spawnParticles(
            (Math.random() - 0.5) * 340,
            s.cameraY + 520,
            1,
            ['#F3C1C6', '#FADADD'],
            'petal',
            20,
            45,
            false
          );
        }
      }

      // Animate tier squash-and-stretch + widen glow + falling slices + particles + texts
      if (state !== 'PAUSED') {
        for (const tier of s.tiers) {
          if (tier.squash > 0.001 || Math.abs(tier.squashVel) > 0.001) {
            // Damped spring back to 0
            const force = -190 * tier.squash - 16 * tier.squashVel;
            tier.squashVel += force * dt;
            tier.squash += tier.squashVel * dt;
            if (Math.abs(tier.squash) < 0.003 && Math.abs(tier.squashVel) < 0.01) {
              tier.squash = 0;
              tier.squashVel = 0;
            }
          }
          if (tier.widenGlow > 0) {
            tier.widenGlow = Math.max(0, tier.widenGlow - dt * 1.1);
          }
        }

        for (let i = s.slices.length - 1; i >= 0; i--) {
          const sl = s.slices[i];
          sl.vy -= GRAVITY * 0.62 * dt;
          sl.x += sl.vx * dt;
          sl.y += sl.vy * dt;
          sl.angle += sl.angularVel * dt;
          if (sl.y < s.cameraY - 200) {
            sl.opacity -= dt * 3;
          }
          if (sl.opacity <= 0 || sl.y < s.cameraY - 400) {
            s.slices.splice(i, 1);
          }
        }

        for (const p of s.particles) {
          if (!p.active) continue;
          p.vy -= (p.shape === 'petal' ? 40 : 480) * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rotation += p.vRot * dt;
          p.life -= dt;
          if (p.life <= 0) {
            p.active = false;
          }
        }

        for (let i = s.texts.length - 1; i >= 0; i--) {
          const ft = s.texts[i];
          ft.y += 42 * dt;
          ft.life -= dt;
          if (ft.life <= 0) {
            s.texts.splice(i, 1);
          }
        }

        for (let i = s.creamOozes.length - 1; i >= 0; i--) {
          const ooze = s.creamOozes[i];
          ooze.life -= dt;
          if (ooze.life <= 0) {
            s.creamOozes.splice(i, 1);
          }
        }

        for (let i = s.creamDrops.length - 1; i >= 0; i--) {
          const drop = s.creamDrops[i];
          drop.vy -= 1150 * dt;
          drop.vx *= Math.exp(-2.2 * dt);
          drop.x += drop.vx * dt;
          drop.y += drop.vy * dt;
          drop.life -= dt;
          if (drop.life <= 0) {
            s.creamDrops.splice(i, 1);
          }
        }

        for (let i = s.screenSplats.length - 1; i >= 0; i--) {
          const sp = s.screenSplats[i];
          sp.dripOffset += sp.dripSpeed * dt;
          sp.life -= dt;
          if (sp.life <= 0) {
            s.screenSplats.splice(i, 1);
          }
        }

        if (s.shakeTime > 0) {
          s.shakeTime = Math.max(0, s.shakeTime - dt);
        }
      }

      // Render Frame
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        let shakeX = 0;
        let shakeY = 0;
        if (s.shakeTime > 0) {
          const mag = s.shakeIntensity * (s.shakeTime / 0.2);
          shakeX = (Math.random() - 0.5) * mag * 2;
          shakeY = (Math.random() - 0.5) * mag * 2;
        }

        const tf: WorldTransform = {
          width,
          height,
          centerX: width / 2 + shakeX,
          baseScreenY: baseScreenY + shakeY,
          scale,
          cameraY: s.cameraY,
        };

        drawBackdrop(ctx, tf, s.timeSec, s.tiers.length);
        drawCounterAndPlate(ctx, tf);
        drawStackedTiers(ctx, tf, s.tiers);
        drawCreamSplashes(ctx, tf, s.creamOozes, s.creamDrops);
        drawFallingSlices(ctx, tf, s.slices);

        if (state === 'PLAYING' || (state === 'PAUSED' && !s.gameOverEmitted)) {
          if (s.phase === 'SWINGING' || s.phase === 'FALLING') {
            const targetX = s.tiers.length === 0 ? 0 : s.tiers[s.tiers.length - 1].x;
            const targetWidth =
              s.tiers.length === 0 ? INITIAL_CAKE_WIDTH : s.tiers[s.tiers.length - 1].width;
            const targetTopY =
              s.tiers.length === 0 ? 0 : s.tiers[s.tiers.length - 1].y + CAKE_HEIGHT;
            const perfectThreshold =
              s.tiers.length === 0 ? 8 : Math.max(5, Math.min(8.5, targetWidth * 0.055));
            const isAligned = Math.abs(s.activeX - targetX) <= perfectThreshold;

            drawAlignmentGuides(
              ctx,
              tf,
              s.activeX,
              s.activeY,
              s.currentWidth,
              targetX,
              targetWidth,
              targetTopY,
              CAKE_HEIGHT,
              isAligned,
              s.tiers.length >= 18
            );
          }

          drawPendulum(
            ctx,
            tf,
            0,
            pivotY,
            s.activeX,
            s.activeY,
            s.currentWidth,
            CAKE_HEIGHT,
            s.activeAngle,
            s.activeStyle,
            s.phase === 'SWINGING'
          );
        }

        drawParticles(ctx, tf, s.particles);
        drawFloatingTexts(ctx, tf, s.texts);
        drawScreenSplats(ctx, width, height, s.screenSplats);
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [emitSnapshot, pushFloatingText, spawnCreamSplash, spawnMissScreenSplats, spawnParticles, checkRunAchievements]);

  return (
    <div
      ref={containerRef}
      onPointerDown={(e) => {
        if (gameState !== 'PLAYING') return;
        e.preventDefault();
        triggerDrop();
      }}
      className="relative h-full w-full overflow-hidden select-none touch-none"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
