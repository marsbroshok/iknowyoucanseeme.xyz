import { Context, setContext, type Gain } from 'tone';
import type { SoundEngine, SoundWindow } from '../SoundEngine.js';
import { AudioManifest } from '../core/AudioManifest.js';
import { MediaElementLoop } from './MediaElementLoop.js';
import { RecordingLayer } from './RecordingLayer.js';
import { ToneSoundEngine } from './ToneSoundEngine.js';

export type { SoundWindow };

/**
 * Entry of the lazily loaded sound chunk (`SoundEngineModule`): creates the
 * audio context (only now, after the visitor's gesture), makes it Tone's
 * context (freeing the one Tone made on import), reads the optional
 * field-recordings manifest and builds the engine, stopped. Recordings are
 * streamed through `<audio>` elements only when their zone is heard.
 *
 * @param win - The window (its `AudioContext`).
 * @returns The engine.
 */
export async function createSoundEngine(win: SoundWindow): Promise<SoundEngine> {
  const raw = new win.AudioContext({ latencyHint: 'playback' });
  const context = new Context({ context: raw });
  setContext(context, true);
  const loops = await AudioManifest.load((url) => win.fetch(url));
  const recordings = loops.length === 0 ? null : (input: Gain) => new RecordingLayer(context, loops, (src) => new MediaElementLoop(win.document, raw, src), input);
  return new ToneSoundEngine(context, { clock: raw, random: Math.random, recordings });
}
