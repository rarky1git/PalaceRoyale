/**
 * Sound Engine for Palace Royale
 *
 * Synthesized sounds via the Web Audio API — no external audio files required.
 * A singleton AudioContext is lazy-initialized on first user interaction to
 * comply with browser autoplay policies.
 */

import type { GameSettings } from '@/contexts/SettingsContext';

type OscType = OscillatorType;

// ---------------------------------------------------------------------------
// Singleton AudioContext
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!_ctx || _ctx.state === 'closed') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctor) return null;
      _ctx = new Ctor() as AudioContext;
    }
    return _ctx;
  } catch {
    return null;
  }
}

// Resume context if it was suspended (autoplay policy)
async function resumeCtx(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

interface OscConfig {
  type: OscType;
  /** [[time, frequency], ...] */
  freqEnv: [number, number][];
  /** [[time, gain], ...] final value should be ~0 */
  gainEnv: [number, number][];
  /** total duration in seconds */
  duration: number;
}

function playOsc(ctx: AudioContext, cfg: OscConfig): void {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = cfg.type;

  const [firstFreq] = cfg.freqEnv[0];
  osc.frequency.setValueAtTime(firstFreq, t);
  for (let i = 1; i < cfg.freqEnv.length; i++) {
    const [dt, freq] = cfg.freqEnv[i];
    osc.frequency.exponentialRampToValueAtTime(Math.max(freq, 0.001), t + dt);
  }

  gain.gain.setValueAtTime(0, t);
  for (const [dt, g] of cfg.gainEnv) {
    if (g <= 0) {
      gain.gain.linearRampToValueAtTime(0.0001, t + dt);
    } else {
      gain.gain.linearRampToValueAtTime(g, t + dt);
    }
  }

  osc.start(t);
  osc.stop(t + cfg.duration);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

// Play multiple oscillators in parallel (for chords / layered tones)
function playChord(ctx: AudioContext, cfgs: OscConfig[]): void {
  for (const cfg of cfgs) playOsc(ctx, cfg);
}

// ---------------------------------------------------------------------------
// Guard: check soundEnabled before playing
// ---------------------------------------------------------------------------

function guard(settings: GameSettings): AudioContext | null {
  if (!settings.soundEnabled) return null;
  const ctx = getAudioContext();
  if (!ctx) return null;
  // Fire-and-forget resume; if still suspended sounds will just not play
  void resumeCtx(ctx);
  return ctx;
}

// ---------------------------------------------------------------------------
// Sound definitions
// ---------------------------------------------------------------------------

/**
 * cardPlay — short satisfying card-snap click (~100ms)
 * High-pitched tick with fast decay.
 */
export function playCardPlay(settings: GameSettings): void {
  const ctx = guard(settings);
  if (!ctx) return;
  playOsc(ctx, {
    type: 'square',
    freqEnv: [[0, 1200], [0.005, 900], [0.1, 600]],
    gainEnv: [[0.005, 0.35], [0.05, 0.1], [0.1, 0]],
    duration: 0.12,
  });
}

/**
 * cardPickup — swish/shuffle sound (~300ms)
 * Downward pitch sweep using a sawtooth.
 */
export function playCardPickup(settings: GameSettings): void {
  const ctx = guard(settings);
  if (!ctx) return;
  playOsc(ctx, {
    type: 'sawtooth',
    freqEnv: [[0, 600], [0.08, 350], [0.2, 180], [0.3, 100]],
    gainEnv: [[0.01, 0.22], [0.12, 0.18], [0.25, 0.08], [0.3, 0]],
    duration: 0.32,
  });
}

/**
 * wipeout — boom/explosion (~500ms)
 * Deep low rumble with a fast attack and long tail.
 */
export function playWipeout(settings: GameSettings): void {
  const ctx = guard(settings);
  if (!ctx) return;
  playChord(ctx, [
    {
      type: 'sawtooth',
      freqEnv: [[0, 120], [0.05, 60], [0.3, 30], [0.5, 20]],
      gainEnv: [[0.01, 0.4], [0.1, 0.3], [0.35, 0.1], [0.5, 0]],
      duration: 0.52,
    },
    {
      type: 'square',
      freqEnv: [[0, 80], [0.05, 40], [0.5, 20]],
      gainEnv: [[0.01, 0.25], [0.2, 0.15], [0.5, 0]],
      duration: 0.52,
    },
  ]);
}

/**
 * sparkle — twinkle/shimmer (~400ms)
 * Rapidly ascending high-pitched sine tones.
 */
export function playSparkle(settings: GameSettings): void {
  const ctx = guard(settings);
  if (!ctx) return;
  const base = ctx.currentTime;
  const freqs = [880, 1108, 1320, 1760, 2093];
  freqs.forEach((freq, i) => {
    const t = base + i * 0.06;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.08);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t);
    osc.stop(t + 0.2);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  });
}

/**
 * slamDown — crisp snap (~200ms)
 * Sharp mid-frequency punch.
 */
export function playSlamDown(settings: GameSettings): void {
  const ctx = guard(settings);
  if (!ctx) return;
  playChord(ctx, [
    {
      type: 'square',
      freqEnv: [[0, 300], [0.02, 180], [0.12, 80], [0.2, 50]],
      gainEnv: [[0.005, 0.45], [0.05, 0.2], [0.15, 0.05], [0.2, 0]],
      duration: 0.22,
    },
    {
      type: 'sawtooth',
      freqEnv: [[0, 200], [0.02, 120], [0.2, 40]],
      gainEnv: [[0.005, 0.3], [0.08, 0.1], [0.2, 0]],
      duration: 0.22,
    },
  ]);
}

/**
 * bonusTurn — positive chime (~300ms)
 * Bright ascending two-note chord.
 */
export function playBonusTurn(settings: GameSettings): void {
  const ctx = guard(settings);
  if (!ctx) return;
  playChord(ctx, [
    {
      type: 'sine',
      freqEnv: [[0, 660], [0.05, 660], [0.3, 880]],
      gainEnv: [[0.01, 0.25], [0.15, 0.2], [0.3, 0]],
      duration: 0.32,
    },
    {
      type: 'sine',
      freqEnv: [[0, 880], [0.05, 880], [0.3, 1100]],
      gainEnv: [[0.01, 0.18], [0.15, 0.15], [0.3, 0]],
      duration: 0.32,
    },
  ]);
}

/**
 * gameWin — short fanfare (~600ms)
 * Three ascending notes with a final chord resolution.
 */
export function playGameWin(settings: GameSettings): void {
  const ctx = guard(settings);
  if (!ctx) return;
  const base = ctx.currentTime;

  interface NoteSpec { freq: number; start: number; dur: number; vol: number; }
  const notes: NoteSpec[] = [
    { freq: 523, start: 0,    dur: 0.15, vol: 0.25 },  // C5
    { freq: 659, start: 0.13, dur: 0.15, vol: 0.25 },  // E5
    { freq: 784, start: 0.26, dur: 0.15, vol: 0.25 },  // G5
    { freq: 1047, start: 0.39, dur: 0.22, vol: 0.28 }, // C6 (chord top)
    { freq: 784,  start: 0.39, dur: 0.22, vol: 0.2  }, // G5 (chord mid)
    { freq: 659,  start: 0.39, dur: 0.22, vol: 0.18 }, // E5 (chord low)
  ];

  for (const n of notes) {
    const t = base + n.start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(n.freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(n.vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);
    osc.start(t);
    osc.stop(t + n.dur + 0.01);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
}

/**
 * gameLose — low sad tone (~400ms)
 * Descending minor interval, slow and mournful.
 */
export function playGameLose(settings: GameSettings): void {
  const ctx = guard(settings);
  if (!ctx) return;
  playChord(ctx, [
    {
      type: 'sine',
      freqEnv: [[0, 392], [0.15, 370], [0.4, 311]],  // G4 → F#4 → Eb4
      gainEnv: [[0.02, 0.28], [0.25, 0.22], [0.4, 0]],
      duration: 0.42,
    },
    {
      type: 'sine',
      freqEnv: [[0, 294], [0.15, 277], [0.4, 233]],  // D4 → C#4 → Bb3
      gainEnv: [[0.02, 0.2], [0.25, 0.16], [0.4, 0]],
      duration: 0.42,
    },
  ]);
}

/**
 * invalidPlay — error buzz (~200ms)
 * Harsh low buzz to signal an illegal move.
 */
export function playInvalidPlay(settings: GameSettings): void {
  const ctx = guard(settings);
  if (!ctx) return;
  playOsc(ctx, {
    type: 'sawtooth',
    freqEnv: [[0, 150], [0.05, 140], [0.15, 120], [0.2, 100]],
    gainEnv: [[0.005, 0.35], [0.08, 0.3], [0.15, 0.2], [0.2, 0]],
    duration: 0.22,
  });
}
