import { Music, Pause, Timer, Volume2, VolumeX } from 'lucide-react';
import { COMBO_WIDEN_THRESHOLD } from '../game/cakeStyles';
import { getModeDisplayName } from '../game/modes';
import type { GameHudSnapshot, SpeedMode, TimeMode } from '../game/types';

interface GameHUDProps {
  snapshot: GameHudSnapshot;
  speedMode: SpeedMode;
  timeMode: TimeMode;
  isMuted: boolean;
  isMusicMuted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
}

export function GameHUD({
  snapshot,
  speedMode,
  timeMode,
  isMuted,
  isMusicMuted,
  onPause,
  onToggleMute,
  onToggleMusic,
}: GameHUDProps) {
  const isNightSky = snapshot.floors >= 18;
  const comboProgress = snapshot.combo % COMBO_WIDEN_THRESHOLD;
  const remainingForWiden =
    snapshot.combo > 0 && comboProgress === 0 ? 0 : COMBO_WIDEN_THRESHOLD - comboProgress;

  const hasTimer = snapshot.remainingTimeSec !== null;
  const remainingSec = snapshot.remainingTimeSec ?? 0;
  const isUrgent = hasTimer && remainingSec <= 5.0;

  return (
    <header
      className={`pointer-events-none absolute top-0 right-0 left-0 z-20 flex items-start justify-between px-4 pt-3 pb-4 transition-colors duration-300 ${
        isNightSky
          ? 'bg-gradient-to-b from-[#14221D]/70 via-[#14221D]/30 to-transparent text-[#FAF5EB]'
          : 'bg-gradient-to-b from-[#F4EFE6]/85 via-[#F4EFE6]/45 to-transparent text-[#3B281B]'
      }`}
    >
      {/* Left Perimeter Cluster: Floor, Score, Timer & Active Cake Flavor */}
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 tabular-nums">
          <div className="flex items-baseline gap-1">
            <span className="font-display-serif text-3xl leading-none font-bold">
              {snapshot.floors}
            </span>
            <span className="text-xs font-bold opacity-80">層</span>
          </div>
          <span aria-hidden="true" className="opacity-35">/</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl leading-none font-bold">{snapshot.score.toLocaleString()}</span>
            <span className="text-xs font-medium opacity-80">分</span>
          </div>
          {hasTimer && (
            <>
              <span aria-hidden="true" className="opacity-35">/</span>
              <div
                className={`flex items-center gap-1 font-bold transition-colors ${
                  isUrgent
                    ? isNightSky
                      ? 'text-[#FCA5A5]'
                      : 'text-[#C2410C]'
                    : isNightSky
                      ? 'text-[#A6D68E]'
                      : 'text-[#3D6B35]'
                }`}
              >
                <Timer className="h-3.5 w-3.5 shrink-0" />
                <span className="text-lg leading-none">{remainingSec.toFixed(1)}s</span>
              </div>
            </>
          )}
        </div>

        {/* Current Cake Name, Width & Active Challenge Mode */}
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium opacity-90">
          <span className="max-w-[140px] truncate">{snapshot.activeStyle.name}</span>
          <span aria-hidden="true" className="opacity-45">·</span>
          <span className="tabular-nums">寬度 {Math.round(snapshot.currentWidthRatio * 100)}%</span>
          <span aria-hidden="true" className="opacity-45">·</span>
          <span className="opacity-85">{getModeDisplayName(speedMode, timeMode)}</span>
        </div>

        {/* Hairline Width Indicator */}
        <div
          className={`mt-1 h-1 w-32 overflow-hidden rounded-full ${
            isNightSky ? 'bg-white/20' : 'bg-[#4A3525]/15'
          }`}
        >
          <div
            className="h-full rounded-full bg-[#5B8A47] transition-[width] duration-150"
            style={{ width: `${Math.max(5, Math.min(100, snapshot.currentWidthRatio * 100))}%` }}
          />
        </div>

        {/* Combo & Widen Progress Readout */}
        {snapshot.combo > 0 && (
          <div
            className={`mt-1.5 flex items-center gap-1.5 text-xs font-bold tabular-nums ${
              isNightSky ? 'text-[#F6C445]' : 'text-[#B45309]'
            }`}
          >
            <span>完美連擊 x{snapshot.combo}</span>
            <span aria-hidden="true" className="opacity-50">·</span>
            <span>
              {remainingForWiden === 0 ? '寬度已回復！' : `再 ${remainingForWiden} 次加寬`}
            </span>
          </div>
        )}
      </div>

      {/* Right Perimeter Controls (>=44px touch targets, no backdrop-filter) */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMusic}
          aria-label={isMusicMuted || isMuted ? '開啟背景音樂' : '關閉背景音樂'}
          title="背景音樂"
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#3D6B35] ${
            isNightSky
              ? `border-white/20 bg-[#1F312A]/85 ${isMusicMuted || isMuted ? 'text-[#FAF5EB]/45' : 'text-[#A6D68E]'}`
              : `border-[#4A3525]/15 bg-[#FBF8F2]/90 ${isMusicMuted || isMuted ? 'text-[#9C8B7A]' : 'text-[#3D6B35]'}`
          }`}
        >
          <Music className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? '開啟音效' : '靜音'}
          title="所有聲音"
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#3D6B35] ${
            isNightSky
              ? 'border-white/20 bg-[#1F312A]/85 text-[#FAF5EB]'
              : 'border-[#4A3525]/15 bg-[#FBF8F2]/90 text-[#4A3525]'
          }`}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={onPause}
          aria-label="暫停遊戲"
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#3D6B35] ${
            isNightSky
              ? 'border-white/20 bg-[#1F312A]/85 text-[#FAF5EB]'
              : 'border-[#4A3525]/15 bg-[#FBF8F2]/90 text-[#4A3525]'
          }`}
        >
          <Pause className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
