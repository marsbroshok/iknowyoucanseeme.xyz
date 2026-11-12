import './webAudio.js';
import { describe, it, expect } from 'vitest';
import { SilentAudioContext } from './webAudio.js';
import { createSoundEngine, type SoundWindow } from '../../../src/sound/engine/createSoundEngine.js';
import { SoundZones } from '../../../src/sound/core/SoundZones.js';

/** An `<audio>` element standing in for the browser's (test double; Node has no DOM). */
class FakeAudio {
  preload = '';
  loop = false;
  crossOrigin: string | null = null;
  src = '';
  readonly calls: string[] = [];
  async play(): Promise<void> {
    this.calls.push('play');
  }
  pause(): void {
    this.calls.push('pause');
  }
  removeAttribute(): void {
    this.calls.push('removeAttribute');
  }
  load(): void {
    this.calls.push('load');
  }
}

/**
 * A window whose AudioContext records every context created and (Node's
 * Web Audio has no media elements) plays media element sources through a
 * gain, with a manifest served by `fetch`.
 */
function soundWindow(manifest: unknown = { zones: {} }) {
  const created: SilentAudioContext[] = [];
  const audios: FakeAudio[] = [];
  const fetched: string[] = [];
  class RecordedAudioContext extends SilentAudioContext {
    constructor(options?: AudioContextOptions) {
      super(options);
      created.push(this);
    }
    createMediaElementSource(): AudioNode {
      return this.createGain();
    }
  }
  const win = {
    AudioContext: RecordedAudioContext,
    fetch: async (url: string) => {
      fetched.push(url);
      return { ok: true, status: 200, json: async () => manifest };
    },
    document: {
      createElement: () => {
        const audio = new FakeAudio();
        audios.push(audio);
        return audio;
      },
    },
  } as unknown as SoundWindow;
  return { win, created, audios, fetched };
}

describe('createSoundEngine (realtime, silent sink)', () => {
  it('creates one audio context only when called, and drives it: start runs, stop suspends, start resumes, dispose closes', async () => {
    const { win, created } = soundWindow();
    expect(created).toHaveLength(0);
    const engine = await createSoundEngine(win);
    expect(created).toHaveLength(1);
    const context = created[0];

    engine.setMix(SoundZones.only('lens'));
    engine.setCues({ approach: 1, eclipse: 0 });
    await engine.start();
    expect(context.state).toBe('running');
    await engine.stop();
    expect(context.state).toBe('suspended');
    await engine.start();
    expect(context.state).toBe('running');
    engine.setMuted(true);
    engine.setMuted(false);
    await engine.dispose();
    expect(context.state).toBe('closed');
    // After dispose everything is a no-op.
    await engine.start();
    await engine.stop();
    engine.setMix(SoundZones.only('arrival'));
    engine.setCues({ approach: 0, eclipse: 0 });
    engine.setMuted(true);
    await engine.dispose();
    expect(context.state).toBe('closed');
  }, 30_000);

  it('reads the recordings manifest and streams a zone\'s recording only while the zone is heard', async () => {
    const { win, audios, fetched } = soundWindow({ zones: { lens: [{ src: '/audio/glass.ogg', gain: 0.5 }] } });
    const engine = await createSoundEngine(win);
    expect(fetched).toEqual(['/audio/manifest.json']);
    await engine.start();
    expect(audios).toHaveLength(0);
    engine.setMix(SoundZones.only('lens'));
    expect(audios).toHaveLength(1);
    expect(audios[0]).toMatchObject({ preload: 'none', loop: true, src: '/audio/glass.ogg' });
    expect(audios[0].calls).toEqual(['play']);
    engine.setMix(SoundZones.only('arrival'));
    expect(audios[0].calls).toEqual(['play', 'pause']);
    engine.setMix(SoundZones.only('lens'));
    await engine.stop();
    expect(audios[0].calls).toEqual(['play', 'pause', 'play', 'pause']);
    await engine.dispose();
    expect(audios[0].calls.slice(4)).toEqual(['pause', 'removeAttribute', 'load']);
  }, 30_000);

  it('a stop while starting wins: the context ends suspended', async () => {
    const { win, created } = soundWindow();
    const engine = await createSoundEngine(win);
    const starting = engine.start();
    const stopping = engine.stop();
    await Promise.all([starting, stopping]);
    expect(created[0].state).toBe('suspended');
    await engine.dispose();
  }, 30_000);

  it('a dispose during the fade-out does not suspend a closed context; stopping a stopped engine does nothing', async () => {
    const { win, created } = soundWindow();
    const engine = await createSoundEngine(win);
    await engine.stop();
    expect(created[0].state).toBe('running');
    await engine.start();
    const stopping = engine.stop();
    await engine.dispose();
    await stopping;
    expect(created[0].state).toBe('closed');
  }, 30_000);
});
