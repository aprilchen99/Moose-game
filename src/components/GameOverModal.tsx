import { Award, Home, RotateCcw } from 'lucide-react';
import { getAchievementById, getTopAchievement } from '../game/achievements';
import { CAKE_STYLES } from '../game/cakeStyles';
import { getModeDisplayName, getModeRecord } from '../game/modes';
import type { GameHudSnapshot, PersistentProgress, SpeedMode, TimeMode } from '../game/types';
import { AchievementMedal } from './AchievementMedal';
import { CakePreview } from './CakePreview';

interface GameOverModalProps {
  finalSnapshot: GameHudSnapshot;
  progress: PersistentProgress;
  speedMode: SpeedMode;
  timeMode: TimeMode;
  onPlayAgain: () => void;
  onExitToTitle: () => void;
}

export function GameOverModal({
  finalSnapshot,
  progress,
  speedMode,
  timeMode,
  onPlayAgain,
  onExitToTitle,
}: GameOverModalProps) {
  const unlockedThisRun = CAKE_STYLES.filter((style) =>
    finalSnapshot.newlyUnlockedIds.includes(style.id)
  );

  const modeBest = getModeRecord(progress, speedMode, timeMode);
  const topAchievement = getTopAchievement(finalSnapshot.runAchievementIds);
  const earnedRunAchievements = finalSnapshot.runAchievementIds
    .map((id) => getAchievementById(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .sort((a, b) => b.priority - a.priority);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#1F150E]/45 p-4 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
    >
      <div className="max-h-[90dvh] w-full max-w-[368px] overflow-y-auto rounded-3xl border border-[#8CAE77]/55 bg-gradient-to-b from-[#FBF8F2] via-[#E9F1DE] to-[#C6DCB0] text-[#2B3624] shadow-2xl">
        {/* Top Matcha Frosting Gradient Glaze Band */}
        <div className="h-3 w-full bg-gradient-to-r from-[#2F5C30] via-[#5B8A47] to-[#87B36E]" />

        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="text-center">
            {finalSnapshot.isNewRecord && (
              <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-bold tracking-wider text-[#B45309]">
                <Award className="h-4 w-4" />
                <span>刷新此模式最高紀錄</span>
              </div>
            )}
            <h2 id="gameover-title" className="text-2xl font-black tracking-wide text-[#2A3A22]">
              {finalSnapshot.endReason === 'TIME_UP' ? '時間到 · 挑戰完成' : '今日茶席圓滿'}
            </h2>
            <p className="mt-1 text-xs font-medium text-[#536449] tabular-nums">
              {getModeDisplayName(speedMode, timeMode)} · 模式最佳 {modeBest.bestFloors} 層 · {modeBest.bestScore.toLocaleString()} 分
            </p>
          </div>

          {/* Clean Unboxed Stats Grid */}
          <div className="mt-4 grid grid-cols-3 divide-x divide-[#9FB88D]/50 border-y border-[#9FB88D]/50 py-3 text-center tabular-nums">
            <div className="px-2">
              <div className="text-xs font-medium text-[#536449]">堆疊層數</div>
              <div className="font-display-serif mt-0.5 text-2xl font-bold text-[#2F5C30]">
                {finalSnapshot.floors}
              </div>
            </div>
            <div className="px-2">
              <div className="text-xs font-medium text-[#536449]">本次總分</div>
              <div className="font-display-serif mt-0.5 text-2xl font-bold text-[#3B281B]">
                {finalSnapshot.score.toLocaleString()}
              </div>
            </div>
            <div className="px-2">
              <div className="text-xs font-medium text-[#536449]">最高連擊</div>
              <div className="font-display-serif mt-0.5 text-2xl font-bold text-[#B45309]">
                {finalSnapshot.maxComboInRun}
              </div>
            </div>
          </div>

          {/* Wagashi Master Title & Medals Section */}
          <div className="mt-4 border-b border-[#9FB88D]/50 pb-4">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#536449]">
              <span>本局甜點大師頭銜</span>
              {earnedRunAchievements.length > 0 && (
                <span className="tabular-nums text-[#2F5C30]">
                  獲得 {earnedRunAchievements.length} 枚勳章
                </span>
              )}
            </div>

            {topAchievement ? (
              <div className="flex items-center gap-3">
                <AchievementMedal
                  rank={topAchievement.rank}
                  icon={topAchievement.icon}
                  size={48}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-base font-black text-[#24351F]">
                      {topAchievement.title}
                    </span>
                    {finalSnapshot.newlyUnlockedAchievementIds.includes(topAchievement.id) && (
                      <span className="shrink-0 text-xs font-bold text-[#B45309]">
                        · 首次解鎖
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#536449]">{topAchievement.conditionLabel}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <AchievementMedal rank="matcha" icon="sprout" locked size={44} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#425539]">茶屋見習生</div>
                  <p className="mt-0.5 text-xs text-[#536449]">
                    堆疊達 5 層或連續 3 次完美對齊即可獲頒首枚勳章
                  </p>
                </div>
              </div>
            )}

            {/* Additional earned medals in this run */}
            {earnedRunAchievements.length > 1 && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 pt-2 border-t border-[#9FB88D]/30">
                {earnedRunAchievements.slice(1).map((ach) => {
                  const isNew = finalSnapshot.newlyUnlockedAchievementIds.includes(ach.id);
                  return (
                    <div key={ach.id} className="flex items-center gap-1.5">
                      <AchievementMedal rank={ach.rank} icon={ach.icon} size={28} />
                      <span className="text-xs font-bold text-[#2A3A22]">{ach.title}</span>
                      {isNew && (
                        <span className="text-[11px] font-bold text-[#B45309]">新</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Newly Unlocked Wagashi Cake Showcase (if any) */}
          {unlockedThisRun.length > 0 && (
            <div className="mt-3.5 border-b border-[#9FB88D]/50 pb-3.5">
              <div className="mb-2 text-xs font-bold text-[#B45309]">
                本局新解鎖和菓子造型
              </div>
              <div className="flex flex-col gap-2">
                {unlockedThisRun.map((style) => (
                  <div key={style.id} className="flex items-center gap-3">
                    <CakePreview style={style} width={82} height={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-[#2A3A22]">{style.name}</div>
                      <div className="truncate text-xs text-[#536449]">{style.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={onPlayAgain}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#346130] to-[#528240] px-5 py-3 text-base font-bold text-[#FBF8F2] shadow-md transition-transform duration-150 hover:from-[#2C5429] hover:to-[#477336] active:scale-[0.98] whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              <span>再疊一次</span>
            </button>

            <button
              type="button"
              onClick={onExitToTitle}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-2 text-sm font-bold text-[#425539] transition-colors duration-150 hover:text-[#23321D] whitespace-nowrap"
            >
              <Home className="h-4 w-4" />
              <span>返回主畫面</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
