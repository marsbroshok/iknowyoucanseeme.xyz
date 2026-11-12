import { Filter, Gain, LFO, Oscillator, Synth } from 'tone';
import type { VoiceParams } from '../../core/SoundRecipes.js';
import { VoiceGraph, type VoiceKit } from '../VoiceGraph.js';

/** Pitches of the glints (Hz): a high pentatonic. */
const GLINTS = [1760, 2093, 2349, 2637, 3136] as const;
/** How often the glint scheduler draws (s). */
const TICK = 0.1;

/**
 * Lens (spec FR2): sparser and brighter, a faint high shimmer through a
 * low-pass whose cutoff rises as works approach, and short granular glints
 * drawn at random at the recipe's `activity` rate (quickening near works),
 * in a medium reverb.
 */
export class LensVoice extends VoiceGraph {
  private readonly tone: Filter;
  private readonly glint: Synth;
  private activity = 0;
  private interval: number | null = null;

  /**
   * @param kit - Context and randomness.
   */
  constructor(kit: VoiceKit) {
    super(kit);
    const context = kit.context;
    const reverb = this.reverb({ decay: 4, wet: 0.45, preDelay: 0.02 });
    this.tone = this.own(new Filter({ context, type: 'lowpass', frequency: 1800, Q: 0.5 }));
    this.tone.connect(reverb.input);

    // The shimmer: two quiet high partials (E6, B6) with a slow tremolo.
    const shimmer = this.own(new Gain({ context, gain: 0 }));
    shimmer.connect(this.tone);
    this.source(new Oscillator({ context, frequency: 1318.5, type: 'sine', volume: -4 })).connect(shimmer);
    this.source(new Oscillator({ context, frequency: 1975.5, type: 'sine', volume: -10 })).connect(shimmer);
    this.source(new LFO({ context, frequency: 0.19, min: 0.2, max: 0.8 })).connect(shimmer.gain);

    // The glints.
    this.glint = this.own(new Synth({ context, volume: -2, oscillator: { type: 'sine' }, envelope: { attack: 0.004, decay: 0.22, sustain: 0, release: 0.3 } }));
    this.glint.connect(this.tone);
  }

  /** @inheritdoc (the engine starts a voice once) */
  override start(time: number): void {
    super.start(time);
    this.interval = this.kit.context.setInterval(() => this.maybeGlint(), TICK);
  }

  /** @inheritdoc */
  override dispose(): void {
    if (this.interval !== null) this.kit.context.clearInterval(this.interval);
    this.interval = null;
    super.dispose();
  }

  /** @inheritdoc */
  protected shape(params: VoiceParams, time: number, ramp: number): void {
    this.tone.frequency.rampTo(params.cutoff, ramp, time);
    this.activity = params.activity;
  }

  /** Draws whether a glint sounds in this tick, and which. */
  private maybeGlint(): void {
    if (this.kit.random() >= this.activity * TICK) return;
    const pitch = GLINTS[Math.floor(this.kit.random() * GLINTS.length)];
    this.glint.triggerAttackRelease(pitch, 0.05, this.kit.context.currentTime + 0.02);
  }
}
