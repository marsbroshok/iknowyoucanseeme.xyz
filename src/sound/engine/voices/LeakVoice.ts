import { Filter, Gain, LFO, Oscillator } from 'tone';
import type { VoiceParams } from '../../core/SoundRecipes.js';
import { VoiceGraph, type VoiceKit } from '../VoiceGraph.js';

/**
 * Leak (spec FR2): a low pulse, close and dry (no reverb), like a slow
 * heartbeat, with a faint human-like hum: a sawtooth through a vowel-like
 * band-pass with a little vibrato, under a low-pass at the recipe's `cutoff`.
 */
export class LeakVoice extends VoiceGraph {
  private readonly close: Filter;

  /**
   * @param kit - Context and randomness.
   */
  constructor(kit: VoiceKit) {
    super(kit);
    const context = kit.context;

    // The pulse: a 46 Hz sine whose level beats a little under once a second.
    const beat = this.own(new Gain({ context, gain: 0 }));
    beat.connect(this.output);
    this.source(new Oscillator({ context, frequency: 46, type: 'sine' })).connect(beat);
    this.source(new LFO({ context, frequency: 0.85, min: 0.3, max: 0.8 })).connect(beat.gain);

    // The hum: G2 sawtooth → vowel band-pass → low-pass → quiet.
    this.close = this.own(new Filter({ context, type: 'lowpass', frequency: 420, Q: 0.3 }));
    const vowel = this.own(new Filter({ context, type: 'bandpass', frequency: 460, Q: 4 }));
    const hum = this.own(new Gain({ context, gain: 0.18 }));
    vowel.chain(this.close, hum, this.output);
    const voice = this.source(new Oscillator({ context, frequency: 98, type: 'sawtooth', volume: -6 }));
    voice.connect(vowel);
    this.source(new LFO({ context, frequency: 4.8, min: -9, max: 9 })).connect(voice.detune);
  }

  /** @inheritdoc */
  protected shape(params: VoiceParams, time: number, ramp: number): void {
    this.close.frequency.rampTo(params.cutoff, ramp, time);
  }
}
