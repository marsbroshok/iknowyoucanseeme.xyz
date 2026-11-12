import type { SoundCues } from './core/SoundCues.js';
import type { ZoneWeights } from './core/SoundZones.js';

/**
 * The generative ambience as the rest of the site sees it (spec FR1). The
 * world and the boot talk only to this interface; the Tone.js
 * implementation (`src/sound/engine/`) is loaded by dynamic import after
 * the visitor's gesture, and could be swapped for another (docs/adr/0011).
 *
 * Every method may be called in any order and more than once; calls after
 * {@link SoundEngine.dispose} do nothing.
 */
export interface SoundEngine {
  /**
   * Resumes the audio context and fades the ambience in. Call only after a
   * user gesture (browsers block audio before one).
   *
   * @returns Settles once audio runs.
   * @throws Error (rejects) when the browser refuses to resume audio.
   */
  start(): Promise<void>;
  /**
   * Fades the ambience out and suspends the audio context (no CPU used);
   * {@link SoundEngine.start} resumes it.
   *
   * @returns Settles once audio is suspended.
   */
  stop(): Promise<void>;
  /**
   * Sets how much each zone's recipe is heard (a mix: weights in [0, 1]
   * summing to 1). Applied with a short ramp; the long crossfade between
   * zones comes from `ZoneMixer`.
   *
   * @param weights - The zone mix.
   */
  setMix(weights: ZoneWeights): void;
  /**
   * Sets what is near the visitor (works approaching, eclipse works).
   *
   * @param cues - Closeness cues.
   */
  setCues(cues: SoundCues): void;
  /**
   * Mutes (fast fade to silence) or unmutes. Never louder than the ceiling.
   *
   * @param muted - `true` for silence.
   */
  setMuted(muted: boolean): void;
  /**
   * Stops for good and frees the audio context.
   *
   * @returns Settles once freed.
   */
  dispose(): Promise<void>;
}

/** The part of `window` the engine module uses. */
export type SoundWindow = Pick<Window & typeof globalThis, 'AudioContext' | 'fetch' | 'document'>;

/** The lazily loaded engine module (`src/sound/engine/createSoundEngine.ts`). */
export interface SoundEngineModule {
  /**
   * Creates the engine in a window (its audio context, recordings manifest, …).
   *
   * @param win - The window.
   * @returns The engine, stopped.
   */
  createSoundEngine(win: SoundWindow): Promise<SoundEngine>;
}
