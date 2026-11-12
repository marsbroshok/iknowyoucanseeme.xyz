import { Gain, Reverb, type BaseContext, type ReverbOptions } from 'tone';
import type { VoiceParams } from '../core/SoundRecipes.js';

/** What every voice is built with. */
export interface VoiceKit {
  /** The Tone context every node is created in (realtime, or offline in tests). */
  context: BaseContext;
  /** Random numbers in [0, 1) (`Math.random`; seeded in tests). */
  random: () => number;
}

/** Anything with a `dispose()`. */
interface Disposable {
  dispose(): unknown;
}

/** A source that starts at a time. */
interface Startable {
  start(time?: number): unknown;
}

/**
 * Base of the four zone voices (`src/sound/engine/voices/`): a level node
 * (`output`) the engine routes to the master, the nodes the voice owns (all
 * freed on dispose) and the sources started together on first start. The
 * voice turns the recipe's {@link VoiceParams} into ramps on its nodes.
 */
export abstract class VoiceGraph {
  /** The voice's level (the recipe's `level`), routed to the master by the engine. */
  readonly output: Gain;
  private readonly owned: Disposable[] = [];
  private readonly sources: Startable[] = [];
  private readonly reverbs: Reverb[] = [];

  /**
   * @param kit - Context and randomness.
   */
  protected constructor(protected readonly kit: VoiceKit) {
    this.output = this.own(new Gain({ context: kit.context, gain: 0 }));
  }

  /** Settles when the voice's reverbs have generated their impulse responses. */
  get ready(): Promise<void> {
    return Promise.all(this.reverbs.map((r) => r.ready)).then(() => undefined);
  }

  /**
   * Starts the voice's sources (once, on the engine's first start).
   *
   * @param time - Context time.
   */
  start(time: number): void {
    for (const s of this.sources) s.start(time);
  }

  /**
   * Applies new parameters with a ramp.
   *
   * @param params - From `SoundRecipes`.
   * @param time - Context time the ramp starts.
   * @param ramp - Ramp length (s).
   */
  apply(params: VoiceParams, time: number, ramp: number): void {
    this.output.gain.rampTo(params.level, ramp, time);
    this.shape(params, time, ramp);
  }

  /** Frees every node of the voice. */
  dispose(): void {
    for (const node of this.owned.splice(0).reverse()) node.dispose();
  }

  /**
   * Applies the voice-specific parameters (filters, events, swell).
   *
   * @param params - From `SoundRecipes`.
   * @param time - Context time the ramp starts.
   * @param ramp - Ramp length (s).
   */
  protected abstract shape(params: VoiceParams, time: number, ramp: number): void;

  /**
   * Registers a node to free on dispose.
   *
   * @param node - The node.
   * @returns The node.
   */
  protected own<T extends Disposable>(node: T): T {
    this.owned.push(node);
    return node;
  }

  /**
   * Registers a source (oscillator, noise, LFO) to start with the voice and free on dispose.
   *
   * @param node - The source.
   * @returns The source.
   */
  protected source<T extends Disposable & Startable>(node: T): T {
    this.sources.push(node);
    return this.own(node);
  }

  /**
   * A reverb owned by the voice (its impulse response is generated asynchronously; see {@link VoiceGraph.ready}).
   *
   * @param options - Decay and wet mix.
   * @returns The reverb.
   */
  protected reverb(options: Pick<ReverbOptions, 'decay' | 'wet' | 'preDelay'>): Reverb {
    const reverb = this.own(new Reverb({ context: this.kit.context, ...options }));
    this.reverbs.push(reverb);
    return reverb;
  }
}
