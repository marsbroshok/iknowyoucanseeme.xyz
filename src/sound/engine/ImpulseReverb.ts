import { Convolver, Gain, type BaseContext } from 'tone';

/** Shape of an {@link ImpulseReverb}. */
export interface ImpulseReverbOptions {
  /** Time (s) for the tail to fall by 60 dB. */
  decay: number;
  /** Silence (s) before the tail starts. */
  preDelay: number;
  /** Share of the reverberated signal, in [0, 1]. */
  wet: number;
}

/**
 * A convolution reverb whose impulse response (stereo noise decaying
 * exponentially to −60 dB over `decay`) is computed synchronously from the
 * kit's random numbers. Unlike `Tone.Reverb`, nothing is rendered in a
 * separate offline context, so the reverb is ready at once and the same
 * seed gives the same tail (deterministic offline tests).
 */
export class ImpulseReverb {
  /** Where the signal goes in. */
  readonly input: Gain;
  /** Dry + wet out. */
  readonly output: Gain;
  private readonly dry: Gain;
  private readonly wet: Gain;
  private readonly convolver: Convolver;

  /**
   * @param context - The Tone context.
   * @param options - Decay, pre-delay, wet share.
   * @param random - Random numbers in [0, 1).
   */
  constructor(context: BaseContext, options: ImpulseReverbOptions, random: () => number) {
    this.input = new Gain({ context });
    this.output = new Gain({ context });
    this.dry = new Gain({ context, gain: 1 - options.wet });
    this.wet = new Gain({ context, gain: options.wet });
    this.convolver = new Convolver({ context, url: ImpulseReverb.impulse(context, options, random) });
    this.input.chain(this.dry, this.output);
    this.input.chain(this.convolver, this.wet, this.output);
  }

  /**
   * The impulse response.
   *
   * @param context - The Tone context (sample rate, buffer).
   * @param options - Decay and pre-delay.
   * @param random - Random numbers in [0, 1).
   * @returns A stereo buffer.
   */
  static impulse(context: BaseContext, options: Pick<ImpulseReverbOptions, 'decay' | 'preDelay'>, random: () => number): AudioBuffer {
    const rate = context.sampleRate;
    const start = Math.round(options.preDelay * rate);
    const length = start + Math.round(options.decay * rate);
    const buffer = context.createBuffer(2, length, rate);
    const k = Math.log(1000) / options.decay;
    for (let channel = 0; channel < 2; channel++) {
      const data = new Float32Array(length);
      for (let i = start; i < length; i++) data[i] = (random() * 2 - 1) * Math.exp((-k * (i - start)) / rate);
      buffer.copyToChannel(data, channel);
    }
    return buffer;
  }

  /** Frees the reverb's nodes. */
  dispose(): void {
    for (const node of [this.convolver, this.wet, this.dry, this.input, this.output]) node.dispose();
  }
}
