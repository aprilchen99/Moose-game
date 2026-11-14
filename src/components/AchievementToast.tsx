import type { AchievementDef } from '../game/types';
import { AchievementMedal } from './AchievementMedal';

interface AchievementToastProps {
  achievement: AchievementDef | null;
  isFirstEver: boolean;
}

export function AchievementToast({ achievement, isFirstEver }: AchievementToastProps) {
  if (!achievement) return null;

  return (
    <div className="pointer-events-none fixed top-[92px] right-0 left-0 z-20 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-2xl border border-[#8CAE77]/70 bg-gradient-to-r from-[#FBF8F2]/95 via-[#EFF5E5]/95 to-[#DAE8C8]/95 px-4 py-2 text-[#2A3A22] shadow-lg transition-all duration-200">
        <AchievementMedal rank={achievement.rank} icon={achievement.icon} size={36} />
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-wider text-[#B45309]">
            {isFirstEver ? '解鎖甜點大師頭銜' : '本局達成稱號'}
          </div>
          <div className="truncate text-sm font-black text-[#2A3A22]">{achievement.title}</div>
        </div>
      </div>
    </div>
  );
}
