import { SOUND_ZONES, type SoundZone } from './SoundZones.js';

/** One field recording, looped under a zone's generative recipe. */
export interface RecordingLoop {
  zone: SoundZone;
  /** Site path of the file, under `/audio/`. */
  src: string;
  /** Level relative to the zone, in (0, 1]. */
  gain: number;
}

/** A path under /audio/ (letters, digits, `-`, `_`, `.`, sub-folders), with an audio extension. */
const SRC = /^\/audio\/(?:[\w-]+\/)*[\w-][\w.-]*\.(?:ogg|opus|mp3|m4a|webm|wav|flac)$/;

/** The expected shape, for error messages. */
const SHAPE = 'must be an object with "zones": { <zone>: [ { "src": … } ] }';

/**
 * The optional field-recordings manifest (spec FR4), `public/audio/manifest.json`:
 *
 * ```json
 * { "zones": { "arrival": [{ "src": "/audio/sea.ogg", "gain": 0.6 }] } }
 * ```
 *
 * The site ships it empty (`{ "zones": {} }`) and works on generative sound
 * alone. Files are only fetched (streamed) after the visitor has entered
 * and while their zone is heard. Anything malformed is rejected loudly,
 * with the path of the bad entry.
 */
export class AudioManifest {
  /** Where the engine fetches the manifest. */
  static readonly URL = '/audio/manifest.json';

  /**
   * Fetches and validates the manifest. The site works without recordings,
   * so a missing manifest (HTTP error) gives none with a warning, and a
   * manifest that cannot be read or is malformed gives none with an error
   * naming the problem (the generative sound carries on).
   *
   * @param fetcher - `fetch` (only called after the visitor entered).
   * @returns The loops, possibly none.
   */
  static async load(fetcher: (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>): Promise<RecordingLoop[]> {
    try {
      const response = await fetcher(AudioManifest.URL);
      if (!response.ok) {
        console.warn(`[audio manifest] ${AudioManifest.URL} answered ${response.status}; no field recordings.`);
        return [];
      }
      return AudioManifest.parse(await response.json());
    } catch (error) {
      console.error(`[audio manifest] ${AudioManifest.URL} could not be used; no field recordings, the generative sound carries on.`, error);
      return [];
    }
  }

  /**
   * Validates a parsed manifest.
   *
   * @param input - Parsed JSON.
   * @returns The loops, zone by zone in file order.
   * @throws Error naming the first bad entry.
   */
  static parse(input: unknown): RecordingLoop[] {
    if (!isObject(input) || !isObject(input.zones)) throw new Error(`[audio manifest] ${SHAPE}`);
    const loops: RecordingLoop[] = [];
    for (const [zone, entries] of Object.entries(input.zones)) {
      const path = `zones.${zone}`;
      if (!SOUND_ZONES.includes(zone as SoundZone)) throw new Error(`[audio manifest] ${path}: unknown zone (${SOUND_ZONES.join(', ')})`);
      if (!Array.isArray(entries)) throw new Error(`[audio manifest] ${path} must be a list`);
      entries.forEach((entry: unknown, i) => loops.push(AudioManifest.loop(zone as SoundZone, entry, `${path}[${i}]`)));
    }
    return loops;
  }

  /**
   * Validates one loop.
   *
   * @param zone - Its zone.
   * @param entry - The entry.
   * @param path - Its path in the manifest.
   * @returns The loop.
   * @throws Error when the entry is malformed.
   */
  private static loop(zone: SoundZone, entry: unknown, path: string): RecordingLoop {
    if (!isObject(entry)) throw new Error(`[audio manifest] ${path} must be an object`);
    const { src, gain = 1 } = entry;
    if (typeof src !== 'string' || !SRC.test(src)) {
      throw new Error(`[audio manifest] ${path}.src must be a path under /audio/ ending in .ogg, .opus, .mp3, .m4a, .webm, .wav or .flac`);
    }
    if (typeof gain !== 'number' || !(gain > 0 && gain <= 1)) throw new Error(`[audio manifest] ${path}.gain must be a number in (0, 1]`);
    return { zone, src, gain };
  }
}

/**
 * A plain JSON object (not an array, not `null`).
 *
 * @param value - Any value.
 * @returns Whether it is one.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
