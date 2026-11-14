import { useCallback, useEffect, useRef, useState } from 'react';
import { AchievementToast } from './components/AchievementToast';
import { CakeGalleryModal } from './components/CakeGalleryModal';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { TitleScreen } from './components/TitleScreen';
import { audioEngine } from './game/audio';
import { CAKE_STYLES } from './game/cakeStyles';
import { getInitialTimeForMode, getModeRecord } from './game/modes';
import { getModeKey, loadProgress, saveProgress } from './game/storage';
import type {
  AchievementDef,
  GameHudSnapshot,
  GameState,
  PersistentProgress,
  SpeedMode,
  TimeMode,
} from './game/types';

function createInitialHud(timeMode: TimeMode): GameHudSnapshot {
  return {
    score: 0,
    floors: 0,
    combo: 0,
    maxComboInRun: 0,
    currentWidthRatio: 1,
    activeStyle: CAKE_STYLES[0],
    newlyUnlockedIds: [],
    runAchievementIds: [],
    newlyUnlockedAchievementIds: [],
    isNewRecord: false,
    perfectCount: 0,
    remainingTimeSec: getInitialTimeForMode(timeMode),
    endReason: 'MISS',
  };
}

export default function App() {
  const [progress, setProgress] = useState<PersistentProgress>(() => {
    const loaded = loadProgress();
    audioEngine.setMuted(loaded.isMuted);
    audioEngine.setMusicMuted(loaded.isMusicMuted);
    return loaded;
  });

  const [speedMode, setSpeedMode] = useState<SpeedMode>(() => progress.lastSpeedMode);
  const [timeMode, setTimeMode] = useState<TimeMode>(() => progress.lastTimeMode);
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [runId, setRunId] = useState(1);
  const [showGallery, setShowGallery] = useState(false);
  const [hudSnapshot, setHudSnapshot] = useState<GameHudSnapshot>(() =>
    createInitialHud(progress.lastTimeMode)
  );
  const [finalSnapshot, setFinalSnapshot] = useState<GameHudSnapshot | null>(null);
  const [toastData, setToastData] = useState<{
    achievement: AchievementDef;
    isFirstEver: boolean;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const activeModeRecord = getModeRecord(progress, speedMode, timeMode);

  const clearToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToastData(null);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleSelectSpeedMode = useCallback((nextSpeed: SpeedMode) => {
    setSpeedMode(nextSpeed);
    setProgress((prev) => {
      const next: PersistentProgress = { ...prev, lastSpeedMode: nextSpeed };
      saveProgress(next);
      return next;
    });
  }, []);

  const handleSelectTimeMode = useCallback((nextTime: TimeMode) => {
    setTimeMode(nextTime);
    setProgress((prev) => {
      const next: PersistentProgress = { ...prev, lastTimeMode: nextTime };
      saveProgress(next);
      return next;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setProgress((prev) => {
      const nextMuted = !prev.isMuted;
      audioEngine.setMuted(nextMuted);
      if (!nextMuted) {
        audioEngine.unlock();
      }
      const next = { ...prev, isMuted: nextMuted };
      saveProgress(next);
      return next;
    });
  }, []);

  const handleToggleMusic = useCallback(() => {
    setProgress((prev) => {
      const nextMusicMuted = prev.isMuted ? false : !prev.isMusicMuted;
      const nextMuted = nextMusicMuted ? prev.isMuted : false;
      audioEngine.setMuted(nextMuted);
      audioEngine.setMusicMuted(nextMusicMuted);
      if (!nextMusicMuted && !nextMuted) {
        audioEngine.unlock();
      }
      const next = { ...prev, isMuted: nextMuted, isMusicMuted: nextMusicMuted };
      saveProgress(next);
      return next;
    });
  }, []);

  const handleStartGame = useCallback(() => {
    audioEngine.unlock();
    clearToast();
    setShowGallery(false);
    setFinalSnapshot(null);
    setHudSnapshot(createInitialHud(timeMode));
    setRunId((id) => id + 1);
    setGameState('PLAYING');
  }, [clearToast, timeMode]);

  const handlePause = useCallback(() => {
    setGameState((curr) => (curr === 'PLAYING' ? 'PAUSED' : curr));
  }, []);

  const handleResume = useCallback(() => {
    audioEngine.unlock();
    setGameState((curr) => (curr === 'PAUSED' ? 'PLAYING' : curr));
  }, []);

  const handleExitToTitle = useCallback(() => {
    clearToast();
    setFinalSnapshot(null);
    setGameState('TITLE_MENU');
  }, [clearToast]);

  const handleAchievementEarned = useCallback(
    (achievement: AchievementDef, isFirstEver: boolean) => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToastData({ achievement, isFirstEver });
      toastTimerRef.current = window.setTimeout(() => {
        setToastData(null);
        toastTimerRef.current = null;
      }, 2400);
    },
    []
  );

  const handleGameOver = useCallback(
    (snapshot: GameHudSnapshot) => {
      clearToast();
      setFinalSnapshot(snapshot);
      setGameState('GAME_OVER');

      setProgress((prev) => {
        const unlockedSet = new Set([...prev.unlockedIds, ...snapshot.newlyUnlockedIds]);
        const achievementSet = new Set([
          ...prev.unlockedAchievementIds,
          ...snapshot.runAchievementIds,
        ]);
        const modeKey = getModeKey(speedMode, timeMode);
        const prevModeRecord = getModeRecord(prev, speedMode, timeMode);
        const nextModeRecords = {
          ...prev.modeRecords,
          [modeKey]: {
            bestScore: Math.max(prevModeRecord.bestScore, snapshot.score),
            bestFloors: Math.max(prevModeRecord.bestFloors, snapshot.floors),
          },
        };
        const next: PersistentProgress = {
          bestScore: Math.max(prev.bestScore, snapshot.score),
          bestFloors: Math.max(prev.bestFloors, snapshot.floors),
          bestCombo: Math.max(prev.bestCombo, snapshot.maxComboInRun),
          unlockedIds: Array.from(unlockedSet),
          unlockedAchievementIds: Array.from(achievementSet),
          isMuted: prev.isMuted,
          isMusicMuted: prev.isMusicMuted,
          lastSpeedMode: speedMode,
          lastTimeMode: timeMode,
          modeRecords: nextModeRecords,
        };
        saveProgress(next);
        return next;
      });
    },
    [clearToast, speedMode, timeMode]
  );

  useEffect(() => {
    const modeMap = {
      TITLE_MENU: 'title',
      PLAYING: 'playing',
      PAUSED: 'paused',
      GAME_OVER: 'gameover',
    } as const;
    audioEngine.setMusicMode(modeMap[gameState]);
  }, [gameState]);

  useEffect(() => {
    audioEngine.setFloorCount(hudSnapshot.floors);
  }, [hudSnapshot.floors]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showGallery) {
        setShowGallery(false);
        return;
      }
      if (gameState === 'PLAYING') {
        setGameState('PAUSED');
      } else if (gameState === 'PAUSED') {
        setGameState('PLAYING');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, showGallery]);

  return (
    <main
      onPointerDown={() => {
        if (!progress.isMuted) {
          audioEngine.unlock();
        }
      }}
      className="relative h-dvh w-screen overflow-hidden bg-[#F4EFE6] select-none"
    >
      {gameState === 'TITLE_MENU' ? (
        <>
          <TitleScreen
            progress={progress}
            speedMode={speedMode}
            timeMode={timeMode}
            onSelectSpeedMode={handleSelectSpeedMode}
            onSelectTimeMode={handleSelectTimeMode}
            onStart={handleStartGame}
            onOpenGallery={() => setShowGallery(true)}
            onToggleMute={handleToggleMute}
            onToggleMusic={handleToggleMusic}
          />
          {showGallery && (
            <CakeGalleryModal
              unlockedIds={progress.unlockedIds}
              unlockedAchievementIds={progress.unlockedAchievementIds}
              onClose={() => setShowGallery(false)}
            />
          )}
        </>
      ) : (
        <div className="relative h-full w-full">
          <GameCanvas
            gameState={gameState}
            runId={runId}
            speedMode={speedMode}
            timeMode={timeMode}
            bestFloors={activeModeRecord.bestFloors}
            bestScore={activeModeRecord.bestScore}
            alreadyUnlockedIds={progress.unlockedIds}
            alreadyUnlockedAchievementIds={progress.unlockedAchievementIds}
            onHudUpdate={setHudSnapshot}
            onGameOver={handleGameOver}
            onAchievementEarned={handleAchievementEarned}
            onAutoPause={handlePause}
          />

          <GameHUD
            snapshot={hudSnapshot}
            speedMode={speedMode}
            timeMode={timeMode}
            isMuted={progress.isMuted}
            isMusicMuted={progress.isMusicMuted}
            onPause={handlePause}
            onToggleMute={handleToggleMute}
            onToggleMusic={handleToggleMusic}
          />

          {gameState === 'PLAYING' && toastData && (
            <AchievementToast
              achievement={toastData.achievement}
              isFirstEver={toastData.isFirstEver}
            />
          )}

          {/* First-drop subtle bottom hint (vanishes after placing floor 1) */}
          {gameState === 'PLAYING' && hudSnapshot.floors === 0 && (
            <div className="pointer-events-none absolute right-0 bottom-7 left-0 z-10 flex justify-center px-4">
              <p className="text-center text-sm font-bold tracking-wide text-[#4A3525]/85">
                輕觸畫面或按空白鍵放下第一層蛋糕
              </p>
            </div>
          )}

          {gameState === 'PAUSED' && (
            <PauseModal
              floors={hudSnapshot.floors}
              score={hudSnapshot.score}
              isMusicOn={!progress.isMuted && !progress.isMusicMuted}
              onToggleMusic={handleToggleMusic}
              onResume={handleResume}
              onRestart={handleStartGame}
              onExitToTitle={handleExitToTitle}
            />
          )}

          {gameState === 'GAME_OVER' && finalSnapshot && (
            <GameOverModal
              finalSnapshot={finalSnapshot}
              progress={progress}
              speedMode={speedMode}
              timeMode={timeMode}
              onPlayAgain={handleStartGame}
              onExitToTitle={handleExitToTitle}
            />
          )}
        </div>
      )}
    </main>
  );
}
