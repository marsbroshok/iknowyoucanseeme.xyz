/** Levels and fades of the whole ambience (guidelines: "consent for the senses"). */
export const VOLUME = {
  /** Highest master level (dBFS): the ambience is never louder than this. */
  ceilingDb: -12,
  /** Threshold of the limiter after the master (dBFS), against peaks of summed voices. */
  limiterDb: -6,
  /** Fade in after start (s). */
  fadeInSeconds: 2.5,
  /** Fade out before suspending (s). */
  fadeOutSeconds: 0.25,
  /** Fade to and from mute (s). */
  muteSeconds: 0.3,
  /** Ramp of each mix or cue update (s), short enough to follow ZoneMixer, long enough to avoid zipper noise. */
  applySeconds: 0.08,
} as const;

/**
 * The master level, without audio.
 */
export class SoundLevel {
  /**
   * The ceiling as a linear gain.
   *
   * @returns Gain for {@link VOLUME.ceilingDb}.
   */
  static ceiling(): number {
    return 10 ** (VOLUME.ceilingDb / 20);
  }

  /**
   * The master gain to aim for.
   *
   * @param state - Muted by the visitor; engine running (started, not stopped).
   * @returns The ceiling when heard, otherwise 0.
   */
  static master(state: { muted: boolean; running: boolean }): number {
    return state.running && !state.muted ? SoundLevel.ceiling() : 0;
  }
}
