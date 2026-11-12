import type { FieldLayoutResult, GroundPoint } from '../../world/core/FieldLayout.js';
import { CueReader, type CueWork } from './CueReader.js';
import type { SoundCues } from './SoundCues.js';
import type { ZoneWeights } from './SoundZones.js';
import { ZoneField } from './ZoneField.js';

/** What the sound should be at a camera position (before ZoneMixer's ramp). */
export interface SoundReading {
  weights: ZoneWeights;
  cues: SoundCues;
}

/**
 * The field as the sound hears it: the zone weights ({@link ZoneField}) and
 * the closeness cues ({@link CueReader}) at the camera, for the world to
 * hand to the sound each frame.
 */
export class SoundScene {
  /**
   * @param field - Zone weights of the field.
   * @param cues - Closeness cues of the field.
   */
  constructor(
    private readonly field: ZoneField,
    private readonly cues: CueReader,
  ) {}

  /**
   * The scene of a laid-out field.
   *
   * @param layout - `FieldLayout` result (e.g. `DriftSession.layout`).
   * @param works - The works (slug, title).
   * @returns The scene.
   */
  static of(layout: FieldLayoutResult, works: readonly CueWork[]): SoundScene {
    return new SoundScene(new ZoneField(layout.regions), new CueReader(layout.placements, works));
  }

  /**
   * Reads the scene at the camera.
   *
   * @param point - Camera position.
   * @returns Target zone weights and cues.
   */
  read(point: GroundPoint): SoundReading {
    return { weights: this.field.weightsAt(point), cues: this.cues.read(point) };
  }
}
