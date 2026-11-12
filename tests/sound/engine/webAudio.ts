/**
 * Web Audio for the engine tests in Node (test harness only): installs the
 * `node-web-audio-api` implementation as browser globals before Tone.js is
 * imported. Realtime contexts render to no device (`sinkId: { type: 'none' }`),
 * so tests run silently on machines and CI runners without sound cards.
 *
 * Import this module first in a test file (ES modules evaluate imports in order).
 */
import * as webAudio from 'node-web-audio-api';

const globals = globalThis as unknown as Record<string, unknown>;
for (const [name, value] of Object.entries(webAudio)) {
  if (name !== 'default' && name !== 'mediaDevices') globals[name] = value;
}

/** A realtime AudioContext that renders to no output device. */
export class SilentAudioContext extends webAudio.AudioContext {
  /**
   * @param options - Context options (the sink is always "none").
   */
  constructor(options?: AudioContextOptions) {
    super({ ...options, sinkId: { type: 'none' } } as AudioContextOptions);
  }
}

globals.AudioContext = SilentAudioContext;
// Tone.js looks for the Web Audio constructors on `window` and frees its draw loop with cancelAnimationFrame.
globals.window = globalThis;
globals.cancelAnimationFrame = (id: ReturnType<typeof setTimeout>) => clearTimeout(id);
