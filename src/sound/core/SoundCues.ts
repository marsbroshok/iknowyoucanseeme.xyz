/**
 * What the sound hears of the visitor's surroundings besides the zone mix,
 * each in [0, 1] (0: nothing near, 1: right there).
 */
export interface SoundCues {
  /** Closeness of the nearest work (the lens zone's glints quicken as works approach). */
  approach: number;
  /** Closeness of the nearest eclipse work (the border's low swell). */
  eclipse: number;
}

/** No work nearby. */
export const QUIET_CUES: SoundCues = Object.freeze({ approach: 0, eclipse: 0 });
