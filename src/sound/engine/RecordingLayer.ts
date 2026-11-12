import { Gain, connect, type BaseContext, type InputNode } from 'tone';
import type { RecordingLoop } from '../core/AudioManifest.js';
import { SoundZones, type ZoneWeights } from '../core/SoundZones.js';
import type { SoundLayer } from './ToneSoundEngine.js';

/** A looping, streamed field recording (see `MediaElementLoop`). */
export interface LoopSource {
  /** The Web Audio node the recording plays into. */
  readonly node: AudioNode;
  /** Starts or resumes streaming and playing. */
  play(): void;
  /** Pauses (the stream stays where it is). */
  pause(): void;
  /** Stops for good and frees the stream. */
  dispose(): void;
}

/** Creates the source of one recording file. */
export type LoopFactory = (src: string) => LoopSource;

/** When a zone's recordings start and stop streaming (weight hysteresis). */
export const RECORDING = {
  /** A recording starts streaming when its zone weighs more than this… */
  on: 0.05,
  /** …and pauses when it weighs less than this. */
  off: 0.01,
} as const;

/** One recording and its level. */
interface Layer {
  loop: RecordingLoop;
  gain: Gain;
  source: LoopSource | null;
  playing: boolean;
}

/**
 * The optional field recordings (spec FR4), layered under the generative
 * voices: each manifest loop gets a level node (`gain × √weight` of its
 * zone, like the recipes' equal-power crossfade). Nothing is fetched until
 * the zone is heard: the source (an `<audio>` stream) is created the first
 * time its zone weighs more than {@link RECORDING.on}, and paused again
 * below {@link RECORDING.off}, so files are streamed only after the
 * visitor entered and only where they are.
 */
export class RecordingLayer implements SoundLayer {
  private readonly layers: Layer[];
  private weights: ZoneWeights = SoundZones.only('arrival');
  private running = false;

  /**
   * @param context - The Tone context.
   * @param loops - Recordings from the manifest.
   * @param create - Creates a recording's source.
   * @param destination - Where the recordings play (the engine's master).
   */
  constructor(
    private readonly context: BaseContext,
    loops: readonly RecordingLoop[],
    private readonly create: LoopFactory,
    destination: InputNode,
  ) {
    this.layers = loops.map((loop) => {
      const gain = new Gain({ context, gain: 0 });
      gain.connect(destination);
      return { loop, gain, source: null, playing: false };
    });
  }

  /** How many recordings are streaming now. */
  get streaming(): number {
    return this.layers.filter((l) => l.playing).length;
  }

  /**
   * Follows the zone mix.
   *
   * @param weights - The zone mix.
   * @param ramp - Level ramp (s).
   */
  setMix(weights: ZoneWeights, ramp: number): void {
    this.weights = weights;
    const now = this.context.currentTime;
    for (const layer of this.layers) layer.gain.gain.rampTo(layer.loop.gain * Math.sqrt(weights[layer.loop.zone]), ramp, now);
    this.sync();
  }

  /** Plays the recordings of the zones heard (the engine started). */
  resume(): void {
    this.running = true;
    this.sync();
  }

  /** Pauses every recording (the engine stopped). */
  pause(): void {
    this.running = false;
    this.sync();
  }

  /** Stops and frees every recording. */
  dispose(): void {
    this.running = false;
    for (const layer of this.layers) {
      layer.source?.dispose();
      layer.gain.dispose();
    }
  }

  /** Starts or pauses each recording to match the mix and the engine's state. */
  private sync(): void {
    for (const layer of this.layers) {
      const weight = this.weights[layer.loop.zone];
      const wanted = this.running && (layer.playing ? weight >= RECORDING.off : weight > RECORDING.on);
      if (wanted === layer.playing) continue;
      layer.playing = wanted;
      if (wanted) this.sourceOf(layer).play();
      else (layer.source as LoopSource).pause();
    }
  }

  /**
   * A layer's source, created on first use.
   *
   * @param layer - The layer.
   * @returns Its source.
   */
  private sourceOf(layer: Layer): LoopSource {
    if (!layer.source) {
      layer.source = this.create(layer.loop.src);
      connect(layer.source.node, layer.gain);
    }
    return layer.source;
  }
}
