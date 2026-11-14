// Procedural Web Audio API sound & tempo-adaptive Japanese tearoom BGM engine

const PENTATONIC_HZ = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];

// 64-step Japanese Yo/Pentatonic Koto Melody (0 = rest)
const BGM_MELODY_STEPS: number[] = [
  // Phrase A (Gmaj7 -> Em7)
  587.33, 0, 659.25, 783.99, 659.25, 0, 587.33, 493.88,
  440.0, 0, 493.88, 587.33, 493.88, 0, 392.0, 0,
  // Phrase B (Cmaj7 -> D6)
  523.25, 0, 587.33, 659.25, 783.99, 0, 659.25, 587.33,
  659.25, 0, 587.33, 493.88, 440.0, 0, 392.0, 0,
  // Phrase C (Bm7 -> Em7)
  783.99, 0, 659.25, 587.33, 493.88, 0, 587.33, 659.25,
  783.99, 0, 880.0, 783.99, 659.25, 0, 587.33, 0,
  // Phrase D (Am7 -> D7sus4)
  523.25, 0, 587.33, 659.25, 587.33, 0, 493.88, 440.0,
  392.0, 440.0, 493.88, 587.33, 440.0, 0, 392.0, 0,
];

// 8-bar warm tearoom chord & bass progression (every 8 eighth-note steps)
const BGM_BARS: { bass: number; chord: number[] }[] = [
  { bass: 98.0, chord: [196.0, 246.94, 293.66, 369.99] }, // Gmaj7
  { bass: 82.41, chord: [164.81, 196.0, 246.94, 293.66] }, // Em7
  { bass: 130.81, chord: [196.0, 246.94, 329.63] }, // Cmaj7
  { bass: 146.83, chord: [220.0, 246.94, 293.66] }, // D6
  { bass: 123.47, chord: [196.0, 246.94, 293.66, 369.99] }, // Bm7
  { bass: 82.41, chord: [164.81, 196.0, 246.94, 329.63] }, // Em7
  { bass: 110.0, chord: [196.0, 261.63, 329.63] }, // Am7
  { bass: 146.83, chord: [196.0, 220.0, 293.66] }, // D7sus4
];

export type MusicMode = 'title' | 'playing' | 'paused' | 'gameover';

class MatchaAudioEngine {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private muted = false;
  private musicMuted = false;
  private musicMode: MusicMode = 'title';
  private floorCount = 0;
  private bgmTimer: number | null = null;
  private bgmRunning = false;
  private bgmStep = 0;

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.syncBgmGain();
  }

  public setMusicMuted(musicMuted: boolean): void {
    this.musicMuted = musicMuted;
    this.syncBgmGain();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isMusicMuted(): boolean {
    return this.musicMuted;
  }

  public setFloorCount(floors: number): void {
    this.floorCount = Math.max(0, floors);
  }

  private getCurrentStepMs(): number {
    const BASE_STEP_MS = 360;
    if (this.musicMode !== 'playing') {
      return BASE_STEP_MS;
    }
    // Accelerate tempo smoothly as tower climbs (up to ~1.9x faster at 28+ floors)
    const speedFactor = 1 + Math.min(0.9, this.floorCount * 0.032);
    return Math.round(BASE_STEP_MS / speedFactor);
  }

  private syncBgmGain(): void {
    if (!this.ctx || !this.bgmGain) return;
    const silent = this.muted || this.musicMuted;
    const target = silent ? 0 : this.getTargetBgmVolume();
    this.bgmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  public setMusicMode(mode: MusicMode): void {
    this.musicMode = mode;
    if (mode === 'title') {
      this.floorCount = 0;
    }
    this.syncBgmGain();
  }

  private getTargetBgmVolume(): number {
    switch (this.musicMode) {
      case 'playing':
        return 0.42;
      case 'title':
        return 0.34;
      case 'paused':
        return 0.16;
      case 'gameover':
        return 0.24;
    }
  }

  private ensureContext(allowWhenMuted = false): AudioContext | null {
    if (this.muted && !allowWhenMuted) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (!this.bgmGain && this.ctx) {
      this.bgmGain = this.ctx.createGain();
      const silent = this.muted || this.musicMuted;
      this.bgmGain.gain.value = silent ? 0 : this.getTargetBgmVolume();
      this.bgmGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx
        .resume()
        .then(() => {
          this.startBgmLoop(true);
        })
        .catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    const ctx = this.ensureContext(true);
    if (ctx) {
      this.startBgmLoop(ctx.state === 'running');
    }
  }

  private startBgmLoop(triggerImmediately: boolean): void {
    if (typeof window === 'undefined') return;
    if (!this.bgmRunning) {
      this.bgmRunning = true;
      if (triggerImmediately) {
        this.tickBgm();
      }
      this.scheduleNextTick();
    }
  }

  private scheduleNextTick(): void {
    if (!this.bgmRunning || typeof window === 'undefined') return;
    if (this.bgmTimer !== null) {
      window.clearTimeout(this.bgmTimer);
    }
    const stepMs = this.getCurrentStepMs();
    this.bgmTimer = window.setTimeout(() => {
      this.tickBgm();
      this.scheduleNextTick();
    }, stepMs);
  }

  private tickBgm(): void {
    if (this.muted || this.musicMuted || !this.ctx || !this.bgmGain) return;
    if (this.ctx.state !== 'running') return;

    const ctx = this.ctx;
    const dest = this.bgmGain;
    const now = ctx.currentTime;
    const step = this.bgmStep % BGM_MELODY_STEPS.length;
    const tempoScale = this.getCurrentStepMs() / 360;

    // Play warm bass + tearoom chord pad at the start of each 8-step bar
    if (step % 8 === 0) {
      const barIdx = Math.floor(step / 8) % BGM_BARS.length;
      const bar = BGM_BARS[barIdx];
      const padDuration = Math.max(1.2, 2.6 * tempoScale);

      // Deep warm bass tone
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bar.bass, now);
      bassGain.gain.setValueAtTime(0.0001, now);
      bassGain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + padDuration);
      bassOsc.connect(bassGain);
      bassGain.connect(dest);
      bassOsc.start(now);
      bassOsc.stop(now + padDuration + 0.05);

      // Gentle koto chord arpeggio pad
      bar.chord.forEach((freq, i) => {
        const start = now + i * 0.035 * tempoScale;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(0.11, start + 0.1 * tempoScale);
        g.gain.exponentialRampToValueAtTime(0.0008, start + padDuration);

        osc.connect(g);
        g.connect(dest);
        osc.start(start);
        osc.stop(start + padDuration + 0.05);
      });
    }

    // Play koto / bamboo melody pluck
    const melodyFreq = BGM_MELODY_STEPS[step];
    if (melodyFreq > 0 && this.musicMode !== 'gameover') {
      const pluck = ctx.createOscillator();
      const pluckFilter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      const noteLen = Math.max(0.28, 0.62 * tempoScale);

      pluck.type = 'triangle';
      pluck.frequency.setValueAtTime(melodyFreq, now);

      pluckFilter.type = 'lowpass';
      pluckFilter.frequency.setValueAtTime(2400, now);
      pluckFilter.frequency.exponentialRampToValueAtTime(750, now + noteLen * 0.85);

      const amp = this.musicMode === 'playing' ? 0.24 : 0.18;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(amp, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, now + noteLen);

      pluck.connect(pluckFilter);
      pluckFilter.connect(g);
      g.connect(dest);
      pluck.start(now);
      pluck.stop(now + noteLen + 0.03);
    }

    // Soft wooden temple block pulse on beats during active play
    if (this.musicMode === 'playing' && step % 2 === 0) {
      const isStrong = step % 4 === 0;
      const wood = ctx.createOscillator();
      const wg = ctx.createGain();
      wood.type = 'sine';
      wood.frequency.setValueAtTime(isStrong ? 560 : 420, now);
      wood.frequency.exponentialRampToValueAtTime(230, now + 0.045);

      wg.gain.setValueAtTime(isStrong ? 0.065 : 0.03, now);
      wg.gain.exponentialRampToValueAtTime(0.0005, now + 0.05);

      wood.connect(wg);
      wg.connect(dest);
      wood.start(now);
      wood.stop(now + 0.055);
    }

    this.bgmStep = (this.bgmStep + 1) % BGM_MELODY_STEPS.length;
  }

  public playDrop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(175, now + 0.085);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playLand(isPerfect: boolean, combo: number, wasSliced: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'triangle';
    thumpOsc.frequency.setValueAtTime(isPerfect ? 185 : 145, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(68, now + 0.09);
    thumpGain.gain.setValueAtTime(0.16, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    thumpOsc.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.1);

    if (isPerfect) {
      const noteIdx = Math.min(combo - 1, PENTATONIC_HZ.length - 1);
      const freq = PENTATONIC_HZ[Math.max(0, noteIdx)];

      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(freq, now);

      chimeGain.gain.setValueAtTime(0.001, now);
      chimeGain.gain.linearRampToValueAtTime(0.16, now + 0.012);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

      chime.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chime.start(now);
      chime.stop(now + 0.36);

      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2, now);
      overtoneGain.gain.setValueAtTime(0.045, now);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      overtone.connect(overtoneGain);
      overtoneGain.connect(ctx.destination);
      overtone.start(now);
      overtone.stop(now + 0.19);
    } else if (wasSliced) {
      const snip = ctx.createOscillator();
      const snipGain = ctx.createGain();
      snip.type = 'sawtooth';
      snip.frequency.setValueAtTime(420, now + 0.015);
      snip.frequency.exponentialRampToValueAtTime(190, now + 0.075);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);

      snipGain.gain.setValueAtTime(0.08, now + 0.015);
      snipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      snip.connect(filter);
      filter.connect(snipGain);
      snipGain.connect(ctx.destination);
      snip.start(now + 0.015);
      snip.stop(now + 0.085);
    }
  }

  public playWiden(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.11, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  public playUnlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [659.25, 880.0, 1174.66];
    notes.forEach((freq, idx) => {
      const start = now + 0.08 + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.09, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.34);
    });
  }

  public playGameOver(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [392.0, 329.63, 261.63];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.94, start + 0.24);
      gain.gain.setValueAtTime(0.11, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  public playCountdownTick(urgent = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(urgent ? 987.77 : 783.99, now);
    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playTimeUp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.11, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  }
}

export const audioEngine = new MatchaAudioEngine();
