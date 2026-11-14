import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { ACHIEVEMENTS } from '../game/achievements';
import { CAKE_STYLES } from '../game/cakeStyles';
import { AchievementMedal } from './AchievementMedal';
import { CakePreview } from './CakePreview';

interface CakeGalleryModalProps {
  unlockedIds: string[];
  unlockedAchievementIds: string[];
  onClose: () => void;
}

export function CakeGalleryModal({
  unlockedIds,
  unlockedAchievementIds,
  onClose,
}: CakeGalleryModalProps) {
  const [activeTab, setActiveTab] = useState<'cakes' | 'achievements'>('cakes');

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A1C12]/50 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-title"
    >
      <div className="flex max-h-[86dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-3xl border border-[#8CAE77]/55 bg-gradient-to-b from-[#FBF8F2] via-[#F2F6EA] to-[#DFECD0] text-[#2A3A22] shadow-2xl">
        {/* Top Matcha Glaze Accent */}
        <div className="h-2.5 w-full shrink-0 bg-gradient-to-r from-[#2F5C30] via-[#5B8A47] to-[#87B36E]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#D6E0CA] px-5 py-3.5">
          <div>
            <h2 id="gallery-title" className="text-xl font-black tracking-wide">
              茶屋圖鑑與成就
            </h2>
            <p className="mt-0.5 text-xs font-medium text-[#536449] tabular-nums">
              和菓子 {unlockedIds.length}/{CAKE_STYLES.length} · 頭銜勳章 {unlockedAchievementIds.length}/{ACHIEVEMENTS.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉視窗"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#536449] transition-colors hover:bg-[#E1ECDA] hover:text-[#2A3A22]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Clean Two-Tab Segmented Switch */}
        <div className="px-5 pt-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#E1ECDA]/75 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('cakes')}
              className={`min-h-[40px] rounded-lg px-3 py-1.5 text-sm font-bold transition-colors whitespace-nowrap ${
                activeTab === 'cakes'
                  ? 'bg-[#FBF8F2] text-[#2F5C30] shadow-sm'
                  : 'text-[#536449] hover:text-[#2A3A22]'
              }`}
            >
              和菓子造型 ({unlockedIds.length}/{CAKE_STYLES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('achievements')}
              className={`min-h-[40px] rounded-lg px-3 py-1.5 text-sm font-bold transition-colors whitespace-nowrap ${
                activeTab === 'achievements'
                  ? 'bg-[#FBF8F2] text-[#2F5C30] shadow-sm'
                  : 'text-[#536449] hover:text-[#2A3A22]'
              }`}
            >
              大師成就 ({unlockedAchievementIds.length}/{ACHIEVEMENTS.length})
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        {activeTab === 'cakes' ? (
          <div className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-[#D6E0CA]">
            {CAKE_STYLES.map((style) => {
              const isUnlocked = unlockedIds.includes(style.id);
              return (
                <div key={style.id} className="flex items-center gap-4 py-3.5">
                  <CakePreview style={style} locked={!isUnlocked} width={104} height={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`truncate text-sm font-bold ${
                          isUnlocked ? 'text-[#2A3A22]' : 'text-[#7B8773]'
                        }`}
                      >
                        {isUnlocked ? style.name : '未解鎖甜點'}
                      </h3>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-[#536449] tabular-nums">
                        {!isUnlocked && <Lock className="h-3.5 w-3.5" />}
                        {style.unlockFloor === 0 ? '初始款式' : `第 ${style.unlockFloor} 層解鎖`}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#536449]">
                      {isUnlocked
                        ? style.subtitle
                        : `堆疊達到第 ${style.unlockFloor} 層即可解鎖此款造型蛋糕。`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-[#D6E0CA]">
            {ACHIEVEMENTS.map((ach) => {
              const isUnlocked = unlockedAchievementIds.includes(ach.id);
              return (
                <div key={ach.id} className="flex items-center gap-4 py-3.5">
                  <AchievementMedal
                    rank={ach.rank}
                    icon={ach.icon}
                    locked={!isUnlocked}
                    size={50}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`truncate text-sm font-black ${
                          isUnlocked ? 'text-[#24351F]' : 'text-[#73806B]'
                        }`}
                      >
                        {ach.title}
                      </h3>
                      <span
                        className={`flex shrink-0 items-center gap-1 text-xs font-bold tabular-nums ${
                          isUnlocked ? 'text-[#2F5C30]' : 'text-[#73806B]'
                        }`}
                      >
                        {!isUnlocked && <Lock className="h-3.5 w-3.5" />}
                        {isUnlocked ? '已獲得' : '未解鎖'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-[#B45309]/90">
                      {ach.conditionLabel}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#536449]">
                      {ach.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Action */}
        <div className="border-t border-[#D6E0CA] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#346130] to-[#528240] px-5 py-2.5 text-sm font-bold text-[#FBF8F2] transition-transform duration-150 hover:from-[#2C5429] hover:to-[#477336] active:scale-[0.98]"
          >
            回到主畫面
          </button>
        </div>
      </div>
    </div>
  );
}
