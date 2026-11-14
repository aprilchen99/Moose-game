import { useEffect, useState } from 'react';
import { Award, Gauge, Music, Timer, Volume2, VolumeX } from 'lucide-react';
import tearoomBackdrop from '../assets/images/matcha_tearoom_backdrop_1794634875201.jpg';
import { ACHIEVEMENTS } from '../game/achievements';
import { CAKE_STYLES } from '../game/cakeStyles';
import {
  SPEED_MODE_OPTIONS,
  TIME_MODE_OPTIONS,
  getModeRecord,
} from '../game/modes';
import type { PersistentProgress, SpeedMode, TimeMode } from '../game/types';

interface TitleScreenProps {
  progress: PersistentProgress;
  speedMode: SpeedMode;
  timeMode: TimeMode;
  onSelectSpeedMode: (mode: SpeedMode) => void;
  onSelectTimeMode: (mode: TimeMode) => void;
  onStart: () => void;
  onOpenGallery: () => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
}

export function TitleScreen({
  progress,
  speedMode,
  timeMode,
  onSelectSpeedMode,
  onSelectTimeMode,
  onStart,
  onOpenGallery,
  onToggleMute,
  onToggleMusic,
}: TitleScreenProps) {
  const [imgError, setImgError] = useState(false);
  const activeModeRecord = getModeRecord(progress, speedMode, timeMode);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement instanceof HTMLButtonElement) return;
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#F4EFE6] text-[#3B281B]">
      {/* Illustrated Key-Art Backdrop with fallback */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {!imgError ? (
          <img
            src={tearoomBackdrop}
            alt="日系和風抹茶甜點屋場景"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="animate-slow-pan h-full w-full object-cover object-center"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-[#F4EFE6] via-[#EAE0CE] to-[#D4B892]" />
        )}
        {/* Gentle contrast scrims preserving calm upper-center negative space & bottom CTA legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FBF8F2]/65 via-transparent to-[#2D1E13]/60" />
      </div>

      {/* Top-right Audio & Music Controls (>=44px touch targets) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 sm:top-4 sm:right-4">
        <button
          type="button"
          onClick={onToggleMusic}
          aria-label={progress.isMusicMuted || progress.isMuted ? '開啟背景音樂' : '關閉背景音樂'}
          title="背景音樂"
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#4A3525]/15 bg-[#FBF8F2]/90 shadow-sm transition-transform duration-150 hover:bg-[#FBF8F2] active:scale-95 focus-visible:outline-2 focus-visible:outline-[#3D6B35] ${
            progress.isMusicMuted || progress.isMuted ? 'text-[#9C8B7A]' : 'text-[#3D6B35]'
          }`}
        >
          <Music className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={progress.isMuted ? '開啟音效' : '靜音'}
          title="所有聲音"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#4A3525]/15 bg-[#FBF8F2]/90 text-[#4A3525] shadow-sm transition-transform duration-150 hover:bg-[#FBF8F2] active:scale-95 focus-visible:outline-2 focus-visible:outline-[#3D6B35]"
        >
          {progress.isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {/* Foreground Layout */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-between px-4 pt-9 pb-4 sm:px-6 sm:pt-12 sm:pb-8">
        {/* Bespoke Inline SVG Title Lockup over calm negative space */}
        <div className="flex flex-col items-center text-center">
          <svg
            viewBox="0 0 360 170"
            className="w-full max-w-[276px] sm:max-w-[350px] drop-shadow-[0_2px_10px_rgba(74,53,37,0.14)]"
            role="img"
            aria-label="抹茶屋疊疊樂"
          >
            {/* Hanging Matcha Noren & Wooden Signboard Frame */}
            <rect
              x="28"
              y="18"
              width="304"
              height="126"
              rx="14"
              fill="#FBF8F2"
              fillOpacity="0.93"
              stroke="#6B4930"
              strokeWidth="2.5"
            />
            <rect
              x="36"
              y="26"
              width="288"
              height="110"
              rx="9"
              fill="none"
              stroke="#C5B091"
              strokeWidth="1"
            />
            {/* Red/Matcha Hanko Seal */}
            <rect x="278" y="42" width="30" height="30" rx="5" fill="#B84A39" />
            <text
              x="293"
              y="62"
              textAnchor="middle"
              fill="#FBF8F2"
              fontSize="13"
              fontWeight="700"
              fontFamily="'Zen Maru Gothic', 'Noto Sans TC', sans-serif"
            >
              宇治
            </text>

            {/* Layered Cake Emblem */}
            <g transform="translate(54, 48)">
              <rect x="0" y="18" width="38" height="10" rx="3" fill="#5B8A47" />
              <rect x="2" y="12" width="34" height="6" rx="2" fill="#FAF5EB" />
              <rect x="4" y="3" width="30" height="9" rx="3" fill="#3D6B35" />
              <circle cx="19" cy="1" r="3.5" fill="#D94D5D" />
            </g>

            {/* Main Title Typography */}
            <text
              x="182"
              y="76"
              textAnchor="middle"
              fill="#3B281B"
              fontSize="34"
              fontWeight="900"
              letterSpacing="3"
              fontFamily="'Zen Maru Gothic', 'Noto Sans TC', sans-serif"
            >
              抹茶屋疊疊樂
            </text>
            <line x1="92" y1="94" x2="268" y2="94" stroke="#C5B091" strokeWidth="1" />
            <text
              x="180"
              y="116"
              textAnchor="middle"
              fill="#5D4634"
              fontSize="13"
              fontWeight="700"
              letterSpacing="2.5"
              fontFamily="'Zen Maru Gothic', 'Noto Sans TC', sans-serif"
            >
              京都和菓子手藝高塔挑戰
            </text>
          </svg>

          {/* Unboxed Metadata Strip (Zero-Pill Discipline) */}
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 rounded-lg bg-[#FBF8F2]/85 px-3.5 py-1 text-xs font-medium text-[#3B281B] tabular-nums sm:mt-2.5 sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm">
            <span>總紀錄</span>
            <span aria-hidden="true" className="text-[#8E735B]">·</span>
            <span>{progress.bestFloors} 層</span>
            <span aria-hidden="true" className="text-[#8E735B]">·</span>
            <span>{progress.bestScore.toLocaleString()} 分</span>
            <span aria-hidden="true" className="text-[#8E735B]">·</span>
            <span>勳章 {progress.unlockedAchievementIds.length}/{ACHIEVEMENTS.length}</span>
          </div>
        </div>

        {/* Challenge Mode Selection + Primary Action Zone in Mobile Natural Thumb Zone */}
        <div className="flex w-full max-w-[356px] flex-col items-center gap-2 sm:gap-2.5">
          {/* Speed & Time Challenge Selectors */}
          <div className="w-full rounded-2xl border border-[#4A3525]/15 bg-[#FBF8F2]/94 p-2.5 shadow-sm sm:p-3">
            {/* Speed Mode Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#4A3525]">
                <Gauge className="h-3.5 w-3.5 text-[#3D6B35]" />
                <span>速度挑戰</span>
              </div>
              <div
                role="group"
                aria-label="速度挑戰模式"
                className="grid flex-1 grid-cols-3 gap-1 rounded-xl bg-[#EFE7D8] p-1"
              >
                {SPEED_MODE_OPTIONS.map((opt) => {
                  const selected = speedMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectSpeedMode(opt.id)}
                      aria-pressed={selected}
                      className={`min-h-[34px] rounded-lg px-2 py-1 text-xs font-bold whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#3D6B35] ${
                        selected
                          ? 'bg-[#3D6B35] text-[#FBF8F2] shadow-xs'
                          : 'text-[#5D4634] hover:text-[#3B281B]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Mode Row */}
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#4A3525]">
                <Timer className="h-3.5 w-3.5 text-[#3D6B35]" />
                <span>時間挑戰</span>
              </div>
              <div
                role="group"
                aria-label="時間挑戰模式"
                className="grid flex-1 grid-cols-3 gap-1 rounded-xl bg-[#EFE7D8] p-1"
              >
                {TIME_MODE_OPTIONS.map((opt) => {
                  const selected = timeMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectTimeMode(opt.id)}
                      aria-pressed={selected}
                      className={`min-h-[34px] rounded-lg px-2 py-1 text-xs font-bold whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#3D6B35] ${
                        selected
                          ? 'bg-[#3D6B35] text-[#FBF8F2] shadow-xs'
                          : 'text-[#5D4634] hover:text-[#3B281B]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode Personal Best Metadata Line */}
            <div className="mt-2 flex items-center justify-between border-t border-[#4A3525]/10 pt-1.5 text-[11px] font-medium text-[#5D4634] tabular-nums">
              <span>此模式最佳紀錄</span>
              <span className="font-bold text-[#3B281B]">
                {activeModeRecord.bestFloors} 層 · {activeModeRecord.bestScore.toLocaleString()} 分
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-[#3D6B35] px-6 py-3 text-base font-bold tracking-wide text-[#FBF8F2] shadow-lg transition-transform duration-150 hover:bg-[#335C2C] active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FBF8F2] sm:min-h-[52px] sm:text-lg"
          >
            開始疊蛋糕
          </button>

          <button
            type="button"
            onClick={onOpenGallery}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-[#FBF8F2]/50 bg-[#FBF8F2]/90 px-5 py-2 text-sm font-bold text-[#4A3525] shadow-sm transition-transform duration-150 hover:bg-[#FBF8F2] active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#3D6B35]"
          >
            <Award className="h-4 w-4 text-[#3D6B35]" />
            <span>
              圖鑑與成就 ({progress.unlockedIds.length}/{CAKE_STYLES.length} · {progress.unlockedAchievementIds.length}/{ACHIEVEMENTS.length})
            </span>
          </button>

          {/* Single Flat Control-Hint Line */}
          <p className="text-center text-xs font-medium tracking-wide text-[#FBF8F2] drop-shadow-[0_1px_3px_rgba(20,12,6,0.85)]">
            點擊畫面或空白鍵放開繩索 · Esc 暫停
          </p>
        </div>
      </div>
    </div>
  );
}
