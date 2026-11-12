import { Context, setContext } from 'tone';
import type { SoundEngine, SoundWindow } from '../SoundEngine.js';
import { ToneSoundEngine } from './ToneSoundEngine.js';

export type { SoundWindow };

/**
 * Entry of the lazily loaded sound chunk (`SoundEngineModule`): creates the
 * audio context (only now, after the visitor's gesture), makes it Tone's
 * context (freeing the one Tone made on import) and builds the engine,
 * stopped.
 *
 * @param win - The window (its `AudioContext`).
 * @returns The engine.
 */
export async function createSoundEngine(win: SoundWindow): Promise<SoundEngine> {
  const raw = new win.AudioContext({ latencyHint: 'playback' });
  const context = new Context({ context: raw });
  setContext(context, true);
  return new ToneSoundEngine(context, { clock: raw, random: Math.random, recordings: null });
}
