import { FatOscillator, Filter, Gain, LFO, Noise, Panner } from 'tone';
import type { VoiceParams } from '../../core/SoundRecipes.js';
import { VoiceGraph, type VoiceKit } from '../VoiceGraph.js';

/**
 * Arrival (spec FR2): a wide, filtered pink-noise "sea" whose waves swell
 * and drift across the stereo field, under slow detuned pad drones, all in
 * a long reverb. The recipe's `cutoff` sets the sea's filter.
 */
export class ArrivalVoice extends VoiceGraph {
  private readonly sea: Filter;

  /**
   * @param kit - Context and randomness.
   */
  constructor(kit: VoiceKit) {
    super(kit);
    const context = kit.context;
    const reverb = this.reverb({ decay: 9, wet: 0.55, preDelay: 0.05 });

    // The sea: pink noise → low-pass → wave swell → slow pan.
    this.sea = this.own(new Filter({ context, type: 'lowpass', frequency: 650, Q: 0.4, rolloff: -24 }));
    const waves = this.own(new Gain({ context, gain: 0 }));
    const pan = this.own(new Panner({ context, pan: 0 }));
    this.source(new Noise({ context, type: 'pink', volume: 10 })).chain(this.sea, waves, pan, reverb.input);
    this.source(new LFO({ context, frequency: 0.07, min: 0.35, max: 1 })).connect(waves.gain);
    this.source(new LFO({ context, frequency: 0.023, min: -0.7, max: 0.7 })).connect(pan.pan);

    // The pads: two detuned drones (A1, E2) through a soft low-pass.
    const padFilter = this.own(new Filter({ context, type: 'lowpass', frequency: 480, Q: 0.3 }));
    const pads = this.own(new Gain({ context, gain: 0.5 }));
    padFilter.chain(pads, reverb.input);
    this.source(new FatOscillator({ context, frequency: 55, type: 'triangle', count: 3, spread: 16 })).connect(padFilter);
    this.source(new FatOscillator({ context, frequency: 82.41, type: 'triangle', count: 3, spread: 22, volume: -4 })).connect(padFilter);
    this.source(new LFO({ context, frequency: 0.031, min: 260, max: 620 })).connect(padFilter.frequency);
  }

  /** @inheritdoc */
  protected shape(params: VoiceParams, time: number, ramp: number): void {
    this.sea.frequency.rampTo(params.cutoff, ramp, time);
  }
}
