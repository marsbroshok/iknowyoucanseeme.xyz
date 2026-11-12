import './webAudio.js';
import { Offline, type BaseContext } from 'tone';
import { ToneSoundEngine, type AudioClock, type ToneSoundEngineOptions } from '../../../src/sound/engine/ToneSoundEngine.js';
import { SeededRandom } from '../../../src/world/core/SeededRandom.js';

/** Sample rate of the offline renders (enough for every recipe, quick to render). */
export const SAMPLE_RATE = 22050;

/**
 * The clock of an offline render: offline contexts render on demand, so
 * resuming, suspending and closing have nothing to do (test double).
 */
export const offlineClock: AudioClock = {
  state: 'suspended',
  resume: async () => undefined,
  suspend: async () => undefined,
  close: async () => undefined,
};

/**
 * Renders the engine offline (`Tone.Offline`), mono.
 *
 * @param seconds - Length.
 * @param script - Drives the engine (called before rendering; schedule later steps with `context.setTimeout`).
 * @param recordings - Recordings factory, or `null`.
 * @returns The samples.
 */
export async function render(
  seconds: number,
  script: (engine: ToneSoundEngine, context: BaseContext) => void | Promise<void>,
  recordings: ToneSoundEngineOptions['recordings'],
): Promise<Float32Array> {
  // Tone.js draws its noise buffers and start offsets from Math.random: seed it for the render so every render is reproducible.
  const unseeded = Math.random;
  const noise = new SeededRandom('tone-noise');
  Math.random = () => noise.next();
  const buffer = await Offline(
    async (context) => {
      const random = new SeededRandom('sound-offline');
      const engine = new ToneSoundEngine(context, { clock: offlineClock, random: () => random.next(), recordings });
      await script(engine, context);
    },
    seconds,
    1,
    SAMPLE_RATE,
  ).finally(() => {
    Math.random = unseeded;
  });
  // Copied at once: node-web-audio-api's channel data is a view on native memory that later renders reuse.
  return Float32Array.from(buffer.getChannelData(0));
}

/** Index of a time in the render. */
const at = (seconds: number) => Math.round(seconds * SAMPLE_RATE);

/**
 * Root mean square level between two times.
 *
 * @param x - Samples.
 * @param from - Start (s).
 * @param to - End (s).
 * @returns RMS.
 */
export function rms(x: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = at(from); i < at(to); i++) sum += x[i] * x[i];
  return Math.sqrt(sum / (at(to) - at(from)));
}

/**
 * Highest absolute sample between two times.
 *
 * @param x - Samples.
 * @param from - Start (s).
 * @param to - End (s).
 * @returns Peak.
 */
export function peak(x: Float32Array, from: number, to: number): number {
  let max = 0;
  for (let i = at(from); i < at(to); i++) max = Math.max(max, Math.abs(x[i]));
  return max;
}

/**
 * Largest jump between two consecutive samples between two times (a click
 * or discontinuity shows as a jump far above the signal's own).
 *
 * @param x - Samples.
 * @param from - Start (s).
 * @param to - End (s).
 * @returns Largest |x[n] − x[n−1]|.
 */
export function maxStep(x: Float32Array, from: number, to: number): number {
  let max = 0;
  for (let i = at(from) + 1; i < at(to); i++) max = Math.max(max, Math.abs(x[i] - x[i - 1]));
  return max;
}

/**
 * Largest jump (dB) between consecutive short-window RMS levels between two
 * times: a level discontinuity (a click from an instant gain change) shows
 * as a jump far above the signal's own.
 *
 * @param x - Samples.
 * @param from - Start (s).
 * @param to - End (s).
 * @param window - Window length (s).
 * @returns Largest |20·log10(rms[i+1] / rms[i])|.
 */
export function maxLevelJump(x: Float32Array, from: number, to: number, window: number): number {
  const levels: number[] = [];
  for (let t = from; t + window <= to + 1e-9; t += window) levels.push(Math.max(rms(x, t, t + window), 1e-9));
  let max = 0;
  for (let i = 1; i < levels.length; i++) max = Math.max(max, Math.abs(20 * Math.log10(levels[i] / levels[i - 1])));
  return max;
}

/**
 * An instant switch from one render to another at a time (the control for
 * the crossfade tests: what a zone change without a ramp sounds like).
 *
 * @param a - Before.
 * @param b - After.
 * @param time - Switch time (s).
 * @returns The spliced samples.
 */
export function splice(a: Float32Array, b: Float32Array, time: number): Float32Array {
  const out = Float32Array.from(a);
  out.set(b.subarray(at(time)), at(time));
  return out;
}
