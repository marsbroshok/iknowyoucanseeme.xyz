import './webAudio.js';
import { describe, it, expect } from 'vitest';
import { SilentAudioContext } from './webAudio.js';
import { createSoundEngine, type SoundWindow } from '../../../src/sound/engine/createSoundEngine.js';
import { SoundZones } from '../../../src/sound/core/SoundZones.js';

/** A window whose AudioContext records every context created. */
function soundWindow() {
  const created: SilentAudioContext[] = [];
  class RecordedAudioContext extends SilentAudioContext {
    constructor(options?: AudioContextOptions) {
      super(options);
      created.push(this);
    }
  }
  const win = { AudioContext: RecordedAudioContext } as unknown as SoundWindow;
  return { win, created };
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
