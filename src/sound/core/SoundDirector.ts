import type { EnteredDetail } from '../../world/core/ThresholdState.js';
import type { SoundEngine } from '../SoundEngine.js';
import { QUIET_CUES, type SoundCues } from './SoundCues.js';
import type { SoundReading } from './SoundScene.js';
import type { ZoneWeights } from './SoundZones.js';
import { ZoneMixer } from './ZoneMixer.js';
import type { SoundPreference } from './SoundPreference.js';

/** Director timing. */
export const DIRECTOR = {
  /** Seconds between two mix updates sent to the engine. */
  mixEvery: 0.1,
} as const;

/** Where the sound is: not loaded, loading, heard, held (stopped), or failed to load. */
export type SoundState = 'off' | 'loading' | 'playing' | 'paused' | 'failed';

/** What the world hands the sound each frame, and reads back for the e2e debug state. */
export interface SoundFeed {
  /**
   * One frame of the drift.
   *
   * @param reading - Target zone weights and cues at the camera (`SoundScene`).
   * @param dt - Frame time (s).
   */
  frame(reading: SoundReading, dt: number): void;
  /** Read-only state, for the e2e debug hook. */
  readonly debug: { state: SoundState; muted: boolean; weights: ZoneWeights };
}

/**
 * Every decision about the sound, without audio ("consent for the senses"):
 *
 * - Audio may start only after a user gesture: an `entered` event with
 *   `gesture: true` (Enter on the threshold, or "Drift" on the awake page),
 *   or the visitor unmuting (a click). An `entered` without a gesture (the
 *   short threshold fading by itself) never starts it.
 * - The engine is loaded (dynamic import of Tone.js) only then, once.
 * - It plays while the world is shown, the tab is visible and the visitor
 *   has not muted it; otherwise it is stopped (suspended).
 * - The zone mix starts where the camera is, then follows it through
 *   {@link ZoneMixer} and is sent to the engine every {@link DIRECTOR.mixEvery} s.
 *
 * Engine failures are reported in the console; the world stays silent.
 */
export class SoundDirector implements SoundFeed {
  private engine: SoundEngine | null = null;
  private loading = false;
  private failed = false;
  private unlocked = false;
  private inWorld = false;
  private hidden = false;
  private mixer = new ZoneMixer();
  /** The first frame places the mix where the camera is (no ramp from a made-up start). */
  private placed = false;
  private cues: SoundCues = QUIET_CUES;
  private sinceMix = Number.POSITIVE_INFINITY;

  /**
   * @param preference - The stored mute choice.
   * @param load - Loads and creates the engine (the dynamic import).
   */
  constructor(
    private readonly preference: SoundPreference,
    private readonly load: () => Promise<SoundEngine>,
  ) {}

  /** Whether the visitor muted the sound. */
  get muted(): boolean {
    return this.preference.muted;
  }

  /** Where the sound is. */
  get state(): SoundState {
    if (this.failed) return 'failed';
    if (this.loading) return 'loading';
    if (!this.engine) return 'off';
    return this.wanted ? 'playing' : 'paused';
  }

  /** @inheritdoc */
  get debug(): SoundFeed['debug'] {
    return { state: this.state, muted: this.muted, weights: this.mixer.current };
  }

  /**
   * The visitor entered the world.
   *
   * @param detail - The `entered` event's detail; only `gesture: true` may unlock audio.
   */
  entered(detail: EnteredDetail): void {
    this.inWorld = true;
    if (detail.gesture) this.unlocked = true;
    this.sync();
  }

  /** The visitor went back to the awake page. */
  leave(): void {
    this.inWorld = false;
    this.sync();
  }

  /**
   * The visitor pressed the mute toggle (a click: unmuting is a gesture that may unlock audio).
   *
   * @param muted - The new choice.
   */
  setMuted(muted: boolean): void {
    this.preference.write(muted);
    if (!muted) this.unlocked = true;
    this.engine?.setMuted(muted);
    this.sync();
  }

  /**
   * The tab was hidden or shown again.
   *
   * @param hidden - `document.visibilityState === 'hidden'`.
   */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.sync();
  }

  /** @inheritdoc */
  frame(reading: SoundReading, dt: number): void {
    if (this.placed) this.mixer.step(reading.weights, dt);
    else this.mixer = new ZoneMixer(reading.weights);
    this.placed = true;
    this.cues = reading.cues;
    this.sinceMix += dt;
    if (!this.engine || this.sinceMix < DIRECTOR.mixEvery) return;
    this.sinceMix = 0;
    this.engine.setMix(this.mixer.current);
    this.engine.setCues(this.cues);
  }

  /** Audio is allowed and asked for. */
  private get wanted(): boolean {
    return this.unlocked && this.inWorld && !this.hidden && !this.muted;
  }

  /** Loads, starts or stops the engine to match the state. */
  private sync(): void {
    if (this.failed || this.loading) return;
    if (!this.engine) {
      if (this.wanted) this.loadEngine();
      return;
    }
    const step = this.wanted ? this.engine.start() : this.engine.stop();
    step.catch((error: unknown) => console.error('[sound] The audio could not be resumed or suspended.', error));
  }

  /** Loads the engine once, then brings it to the current state. */
  private loadEngine(): void {
    this.loading = true;
    this.load().then(
      (engine) => {
        this.loading = false;
        this.engine = engine;
        engine.setMix(this.mixer.current);
        engine.setCues(this.cues);
        engine.setMuted(this.muted);
        this.sync();
      },
      (error: unknown) => {
        this.loading = false;
        this.failed = true;
        console.error('[sound] The sound could not start; the world stays silent.', error);
      },
    );
  }
}
