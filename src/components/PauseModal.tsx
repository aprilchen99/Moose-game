import { Home, Music, Play, RotateCcw } from 'lucide-react';

interface PauseModalProps {
  floors: number;
  score: number;
  isMusicOn: boolean;
  onToggleMusic: () => void;
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export function PauseModal({
  floors,
  score,
  isMusicOn,
  onToggleMusic,
  onResume,
  onRestart,
  onExitToTitle,
}: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#2A1C12]/45 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="w-full max-w-[340px] overflow-hidden rounded-3xl border border-[#8CAE77]/55 bg-gradient-to-b from-[#FBF8F2] via-[#EBF2DF] to-[#CEE0BA] text-[#2A3A22] shadow-xl">
        <div className="h-2.5 w-full bg-gradient-to-r from-[#2F5C30] via-[#5B8A47] to-[#87B36E]" />

        <div className="p-6">
          <h2 id="pause-title" className="text-center text-2xl font-black tracking-wide">
            茶歇暫停
          </h2>
          <p className="mt-1.5 text-center text-sm font-medium text-[#536449] tabular-nums">
            目前進度 · {floors} 層 · {score.toLocaleString()} 分
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onResume}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#346130] to-[#528240] px-5 py-3 text-base font-bold text-[#FBF8F2] transition-transform duration-150 hover:from-[#2C5429] hover:to-[#477336] active:scale-[0.98] whitespace-nowrap"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>繼續疊蛋糕</span>
            </button>

            <button
              type="button"
              onClick={onToggleMusic}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-[#9FB88D]/60 bg-[#FBF8F2]/80 px-5 py-2.5 text-sm font-bold text-[#35482C] transition-transform duration-150 hover:bg-[#FBF8F2] active:scale-[0.98] whitespace-nowrap"
            >
              <Music className="h-4 w-4" />
              <span>背景音樂：{isMusicOn ? '開啟中' : '已關閉'}</span>
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-[#9FB88D]/60 bg-[#FBF8F2]/80 px-5 py-2.5 text-sm font-bold text-[#35482C] transition-transform duration-150 hover:bg-[#FBF8F2] active:scale-[0.98] whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              <span>重新開始</span>
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
