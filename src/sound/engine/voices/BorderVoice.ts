import { Filter, Gain, LFO, Noise, Oscillator } from 'tone';
import type { VoiceParams } from '../../core/SoundRecipes.js';
import { VoiceGraph, type VoiceKit } from '../VoiceGraph.js';

/** Level of the low swell at full eclipse closeness. */
const SWELL_GAIN = 0.5;

/**
 * The border is thin (spec FR2): wind-like noise (a band-pass sweeping
 * slowly, gusting), a faint tone bending slowly up and down like an
 * intentional camera movement (ICM), and a low swell that rises near
 * eclipse works (the recipe's `swell`). The recipe's `cutoff` sets the
 * wind's low-pass.
 */
export class BorderVoice extends VoiceGraph {
  private readonly wind: Filter;
  private readonly swell: Gain;

  /**
   * @param kit - Context and randomness.
   */
  constructor(kit: VoiceKit) {
    super(kit);
    const context = kit.context;
    const reverb = this.reverb({ decay: 5, wet: 0.35, preDelay: 0.03 });
    reverb.connect(this.output);

    // The wind: noise → sweeping band-pass → low-pass → gusts.
    const sweep = this.own(new Filter({ context, type: 'bandpass', frequency: 600, Q: 1.2 }));
    this.wind = this.own(new Filter({ context, type: 'lowpass', frequency: 900, Q: 0.3 }));
    const gusts = this.own(new Gain({ context, gain: 0 }));
    this.source(new Noise({ context, type: 'pink' })).chain(sweep, this.wind, gusts, reverb);
    this.source(new LFO({ context, frequency: 0.05, min: 280, max: 1200 })).connect(sweep.frequency);
    this.source(new LFO({ context, frequency: 0.11, min: 0.25, max: 0.9 })).connect(gusts.gain);

    // The bends: A3 triangle drifting ±3 semitones, very slowly.
    const bend = this.source(new Oscillator({ context, frequency: 220, type: 'triangle', volume: -26 }));
    bend.connect(reverb);
    this.source(new LFO({ context, frequency: 0.04, min: -300, max: 300 })).connect(bend.detune);

    // The swell: A1 sine, silent until an eclipse work is near.
    this.swell = this.own(new Gain({ context, gain: 0 }));
    this.swell.connect(reverb);
    this.source(new Oscillator({ context, frequency: 55, type: 'sine' })).connect(this.swell);
  }

  /** @inheritdoc */
  protected shape(params: VoiceParams, time: number, ramp: number): void {
    this.wind.frequency.rampTo(params.cutoff, ramp, time);
    this.swell.gain.rampTo(params.swell * SWELL_GAIN, ramp, time);
  }
}
