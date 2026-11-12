import { Gain, Limiter, type BaseContext } from 'tone';
import { QUIET_CUES, type SoundCues } from '../core/SoundCues.js';
import { SoundLevel, VOLUME } from '../core/SoundLevel.js';
import { SoundRecipes } from '../core/SoundRecipes.js';
import { SOUND_ZONES, SoundZones, type SoundZone, type ZoneWeights } from '../core/SoundZones.js';
import type { SoundEngine } from '../SoundEngine.js';
import type { VoiceGraph, VoiceKit } from './VoiceGraph.js';
import { ArrivalVoice } from './voices/ArrivalVoice.js';
import { BorderVoice } from './voices/BorderVoice.js';
import { LeakVoice } from './voices/LeakVoice.js';
import { LensVoice } from './voices/LensVoice.js';

/** The raw audio context's lifecycle (a native `AudioContext` satisfies it). */
export interface AudioClock {
  readonly state: string;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  close(): Promise<void>;
}

/** A layer under the voices that follows the mix and the engine's state (the field recordings). */
export interface SoundLayer {
  /**
   * Follows the zone mix.
   *
   * @param weights - The zone mix.
   * @param ramp - Level ramp (s).
   */
  setMix(weights: ZoneWeights, ramp: number): void;
  /** The engine started. */
  resume(): void;
  /** The engine stopped. */
  pause(): void;
  /** The engine is disposed. */
  dispose(): void;
}

/** What the engine is built with besides its Tone context. */
export interface ToneSoundEngineOptions {
  /** Resumes, suspends and closes the audio context. */
  clock: AudioClock;
  /** Random numbers in [0, 1) for the generative events. */
  random: () => number;
  /** Field recordings (connected to {@link ToneSoundEngine.input}), or `null` without any. */
  recordings: ((input: Gain) => SoundLayer) | null;
}

/**
 * The Tone.js implementation of {@link SoundEngine} (spec FR2): the four
 * zone voices, each at the level and with the parameters `SoundRecipes`
 * gives for the current mix and cues, summed into a master gain that never
 * exceeds the ceiling (`SoundLevel`), then a limiter. Starting fades in;
 * stopping fades out and suspends the audio context; muting fades to 0.
 *
 * Built on any Tone context, so tests render it offline (`Tone.Offline`).
 */
export class ToneSoundEngine implements SoundEngine {
  /** Master input (voices and recordings). */
  readonly input: Gain;
  private readonly limiter: Limiter;
  private readonly voices: Record<SoundZone, VoiceGraph>;
  private readonly recordings: SoundLayer | null;
  private weights: ZoneWeights = SoundZones.only('arrival');
  private cues: SoundCues = QUIET_CUES;
  private muted = false;
  private running = false;
  private sourcesStarted = false;
  private disposed = false;
  /** Ends a pending fade-out wait early (dispose closes the context, whose clock then stops). */
  private endFade: (() => void) | null = null;

  /**
   * @param context - The Tone context (realtime, or offline in tests).
   * @param options - Clock, randomness, recordings.
   */
  constructor(
    private readonly context: BaseContext,
    private readonly options: ToneSoundEngineOptions,
  ) {
    this.input = new Gain({ context, gain: 0 });
    this.limiter = new Limiter({ context, threshold: VOLUME.limiterDb });
    this.input.chain(this.limiter, context.destination);
    const kit: VoiceKit = { context, random: options.random };
    this.voices = { arrival: new ArrivalVoice(kit), lens: new LensVoice(kit), leak: new LeakVoice(kit), border: new BorderVoice(kit) };
    for (const z of SOUND_ZONES) this.voices[z].output.connect(this.input);
    this.recordings = options.recordings ? options.recordings(this.input) : null;
    this.apply(0);
  }

  /** @inheritdoc */
  async start(): Promise<void> {
    if (this.disposed) return;
    this.running = true;
    if (this.options.clock.state !== 'running') await this.options.clock.resume();
    if (!this.running) return; // stopped or disposed while resuming
    if (!this.sourcesStarted) {
      this.sourcesStarted = true;
      for (const z of SOUND_ZONES) this.voices[z].start(this.context.currentTime);
    }
    this.recordings?.resume();
    this.level(VOLUME.fadeInSeconds);
  }

  /** @inheritdoc */
  async stop(): Promise<void> {
    if (this.disposed || !this.running) return;
    this.running = false;
    this.level(VOLUME.fadeOutSeconds);
    this.recordings?.pause();
    await new Promise<void>((resolve) => {
      this.endFade = resolve;
      this.context.setTimeout(resolve, VOLUME.fadeOutSeconds);
    });
    this.endFade = null;
    if (!this.running && !this.disposed) await this.options.clock.suspend();
  }

  /** @inheritdoc */
  setMix(weights: ZoneWeights): void {
    if (this.disposed) return;
    this.weights = weights;
    this.apply(VOLUME.applySeconds);
    this.recordings?.setMix(weights, VOLUME.applySeconds);
  }

  /** @inheritdoc */
  setCues(cues: SoundCues): void {
    if (this.disposed) return;
    this.cues = cues;
    this.apply(VOLUME.applySeconds);
  }

  /** @inheritdoc */
  setMuted(muted: boolean): void {
    if (this.disposed) return;
    this.muted = muted;
    this.level(VOLUME.muteSeconds);
  }

  /** @inheritdoc */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;
    this.endFade?.();
    this.recordings?.dispose();
    for (const z of SOUND_ZONES) this.voices[z].dispose();
    this.input.dispose();
    this.limiter.dispose();
    await this.options.clock.close();
  }

  /**
   * Ramps every voice to the recipe's parameters for the current mix and cues.
   *
   * @param ramp - Ramp length (s).
   */
  private apply(ramp: number): void {
    const params = SoundRecipes.mix(this.weights, this.cues);
    const now = this.context.currentTime;
    for (const z of SOUND_ZONES) this.voices[z].apply(params[z], now, ramp);
  }

  /**
   * Ramps the master to its level (the ceiling, or 0 when muted or stopped).
   *
   * @param ramp - Ramp length (s).
   */
  private level(ramp: number): void {
    this.input.gain.rampTo(SoundLevel.master({ muted: this.muted, running: this.running }), ramp, this.context.currentTime);
  }
}
