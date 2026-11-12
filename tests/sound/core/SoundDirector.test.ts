import { describe, it, expect, vi, afterEach } from 'vitest';
import { DIRECTOR, SoundDirector } from '../../../src/sound/core/SoundDirector.js';
import { SoundPreference } from '../../../src/sound/core/SoundPreference.js';
import { SoundZones, type ZoneWeights } from '../../../src/sound/core/SoundZones.js';
import type { SoundCues } from '../../../src/sound/core/SoundCues.js';
import type { SoundEngine } from '../../../src/sound/SoundEngine.js';
import { MemoryStorage } from '../../world/memoryStorage.js';

/** An engine that logs what it is asked (test double). */
class LoggedEngine implements SoundEngine {
  readonly calls: string[] = [];
  mix: ZoneWeights | null = null;
  cues: SoundCues | null = null;
  failStart = false;
  async start(): Promise<void> {
    this.calls.push('start');
    if (this.failStart) throw new Error('NotAllowedError');
  }
  async stop(): Promise<void> {
    this.calls.push('stop');
  }
  setMix(weights: ZoneWeights): void {
    this.calls.push('mix');
    this.mix = weights;
  }
  setCues(cues: SoundCues): void {
    this.calls.push('cues');
    this.cues = cues;
  }
  setMuted(muted: boolean): void {
    this.calls.push(`muted:${muted}`);
  }
  async dispose(): Promise<void> {
    this.calls.push('dispose');
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const gesture = { gesture: true, returning: false };
const automatic = { gesture: false, returning: true };

function setup(stored: 'on' | 'off' | null = null) {
  const storage = new MemoryStorage();
  if (stored) storage.setItem(SoundPreference.KEY, stored);
  const engine = new LoggedEngine();
  const load = vi.fn(async () => engine);
  const director = new SoundDirector(new SoundPreference(storage), load);
  return { storage, engine, load, director };
}

afterEach(() => vi.restoreAllMocks());

describe('SoundDirector', () => {
  it('never loads audio before a gesture: an automatic entry (short threshold) leaves it off', async () => {
    const { director, load } = setup();
    director.entered(automatic);
    director.setHidden(false);
    director.frame({ weights: SoundZones.only('lens'), cues: { approach: 1, eclipse: 0 } }, 1);
    await flush();
    expect(load).not.toHaveBeenCalled();
    expect(director.state).toBe('off');
  });

  it('a gesture entry (Enter, or Drift on the awake page) loads the engine once and starts it with the current mix, cues and mute', async () => {
    const { director, load, engine } = setup();
    director.frame({ weights: SoundZones.only('arrival'), cues: { approach: 0.5, eclipse: 0 } }, 0.016);
    director.entered(gesture);
    expect(director.state).toBe('loading');
    director.entered(gesture);
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(engine.calls).toEqual(['mix', 'cues', 'muted:false', 'start']);
    expect(engine.cues).toEqual({ approach: 0.5, eclipse: 0 });
    expect(director.state).toBe('playing');
  });

  it('stays silent when muted at entry; unmuting (a click) loads and starts it, even after an automatic entry', async () => {
    const { director, load, engine, storage } = setup('off');
    expect(director.muted).toBe(true);
    director.entered(gesture);
    await flush();
    expect(load).not.toHaveBeenCalled();
    const second = setup('off');
    second.director.entered(automatic);
    second.director.setMuted(false);
    await flush();
    expect(second.load).toHaveBeenCalledTimes(1);
    expect(second.engine.calls.at(-1)).toBe('start');
    expect(second.storage.getItem(SoundPreference.KEY)).toBe('on');
    expect(engine.calls).toEqual([]);
    expect(storage.getItem(SoundPreference.KEY)).toBe('off');
  });

  it('unmuting before entering unlocks audio but plays nothing until the visitor is in the world', async () => {
    const { director, load } = setup('off');
    director.setMuted(false);
    await flush();
    expect(load).not.toHaveBeenCalled();
    director.entered(automatic);
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(director.state).toBe('playing');
  });

  it('exhibition mode: an automatic entry stays silent until the first tap, which is the gesture', async () => {
    const { director, load, engine } = setup();
    director.entered(automatic);
    director.setHidden(false);
    await flush();
    expect(load).not.toHaveBeenCalled();
    director.gesture();
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(engine.calls.at(-1)).toBe('start');
    expect(director.state).toBe('playing');
  });

  it('a gesture does not override mute', async () => {
    const { director, load } = setup('off');
    director.entered(automatic);
    director.gesture();
    await flush();
    expect(load).not.toHaveBeenCalled();
  });

  it('mute fades the engine to silence and stops it, and is remembered', async () => {
    const { director, engine, storage } = setup();
    director.entered(gesture);
    await flush();
    director.setMuted(true);
    expect(engine.calls.slice(-2)).toEqual(['muted:true', 'stop']);
    expect(storage.getItem(SoundPreference.KEY)).toBe('off');
    expect(director.state).toBe('paused');
    director.setMuted(false);
    expect(engine.calls.slice(-2)).toEqual(['muted:false', 'start']);
  });

  it('a hidden tab stops (suspends) the sound and a visible one resumes it', async () => {
    const { director, engine } = setup();
    director.entered(gesture);
    await flush();
    director.setHidden(true);
    expect(engine.calls.at(-1)).toBe('stop');
    expect(director.state).toBe('paused');
    director.setHidden(false);
    expect(engine.calls.at(-1)).toBe('start');
  });

  it('does not start while hidden even after a gesture, and starts once visible', async () => {
    const { director, load } = setup();
    director.setHidden(true);
    director.entered(gesture);
    await flush();
    expect(load).not.toHaveBeenCalled();
    director.setHidden(false);
    await flush();
    expect(director.state).toBe('playing');
  });

  it('leaving for the awake page stops it; entering again resumes the same engine', async () => {
    const { director, engine, load } = setup();
    director.entered(gesture);
    await flush();
    director.leave();
    expect(engine.calls.at(-1)).toBe('stop');
    director.entered(automatic);
    expect(engine.calls.at(-1)).toBe('start');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('applies what changed while loading once the engine is there', async () => {
    const { director, engine } = setup();
    director.entered(gesture);
    director.setMuted(true);
    await flush();
    expect(engine.calls).toEqual(['mix', 'cues', 'muted:true', 'stop']);
  });

  it('reports a failed load and stays silent for good', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const director = new SoundDirector(new SoundPreference(null), vi.fn(async () => Promise.reject(new Error('chunk failed'))));
    director.entered(gesture);
    await flush();
    expect(director.state).toBe('failed');
    expect(error).toHaveBeenCalledWith('[sound] The sound could not start; the world stays silent.', expect.any(Error));
    director.setMuted(false);
    director.frame({ weights: SoundZones.only('lens'), cues: { approach: 0, eclipse: 0 } }, 1);
    expect(director.state).toBe('failed');
  });

  it('reports an engine that cannot resume', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { director, engine } = setup();
    engine.failStart = true;
    director.entered(gesture);
    await flush();
    await flush();
    expect(error).toHaveBeenCalledWith('[sound] The audio could not be resumed or suspended.', expect.any(Error));
  });

  it('starts the mix where the camera is on the first frame (no ramp from a made-up start)', () => {
    const { director } = setup();
    director.frame({ weights: SoundZones.only('border'), cues: { approach: 0, eclipse: 0 } }, 1 / 60);
    expect(director.debug.weights).toEqual(SoundZones.only('border'));
  });

  it('ramps the mix with ZoneMixer and sends it to the engine every 0.1 s, not every frame', async () => {
    const { director, engine } = setup();
    director.entered(gesture);
    await flush();
    director.frame({ weights: SoundZones.only('arrival'), cues: { approach: 0, eclipse: 0 } }, 1 / 60);
    engine.calls.length = 0;
    const lens = { weights: SoundZones.only('lens'), cues: { approach: 1, eclipse: 0 } };
    for (let i = 0; i < 60; i++) director.frame(lens, 1 / 60);
    const mixes = engine.calls.filter((c) => c === 'mix').length;
    // A send every 0.1 s, at most one frame late: between 1 / (0.1 + 1/60) and 1 / 0.1 + 1 sends, not 60.
    expect(mixes).toBeGreaterThanOrEqual(Math.floor(1 / (DIRECTOR.mixEvery + 1 / 60)));
    expect(mixes).toBeLessThanOrEqual(Math.ceil(1 / DIRECTOR.mixEvery) + 1);
    // After 1 s of a 2 s ramp the lens is about half way, not there yet.
    expect(director.debug.weights.lens).toBeGreaterThan(0.4);
    expect(director.debug.weights.lens).toBeLessThan(0.6);
    expect(engine.cues).toEqual({ approach: 1, eclipse: 0 });
    expect(director.debug).toMatchObject({ state: 'playing', muted: false });
  });
});
