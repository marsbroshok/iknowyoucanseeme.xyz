import './webAudio.js';
import { describe, it, expect } from 'vitest';
import { getContext, type BaseContext } from 'tone';
import { RECORDING, RecordingLayer, type LoopSource } from '../../../src/sound/engine/RecordingLayer.js';
import { SoundZones } from '../../../src/sound/core/SoundZones.js';
import type { RecordingLoop } from '../../../src/sound/core/AudioManifest.js';
import { peak, render, rms } from './offline.js';

/** A looping 220 Hz tone standing in for a streamed recording (test double), with a log of calls. */
class ToneLoop implements LoopSource {
  readonly node: AudioBufferSourceNode;
  readonly calls: string[] = [];
  private started = false;

  constructor(context: BaseContext, readonly src: string) {
    const rate = context.sampleRate;
    const buffer = context.createBuffer(1, rate, rate);
    const data = new Float32Array(rate);
    for (let i = 0; i < rate; i++) data[i] = 0.5 * Math.sin((2 * Math.PI * 220 * i) / rate);
    buffer.copyToChannel(data, 0);
    this.node = context.createBufferSource();
    this.node.buffer = buffer;
    this.node.loop = true;
  }

  play(): void {
    this.calls.push('play');
    if (!this.started) this.node.start();
    this.started = true;
  }

  pause(): void {
    this.calls.push('pause');
  }

  dispose(): void {
    this.calls.push('dispose');
  }
}

const loops: RecordingLoop[] = [
  { zone: 'arrival', src: '/audio/sea.ogg', gain: 1 },
  { zone: 'lens', src: '/audio/glass.ogg', gain: 0.5 },
];

describe('RecordingLayer', () => {
  it('streams nothing until the engine runs and a zone is heard, then only that zone, and follows the mix with hysteresis', async () => {
    const created: ToneLoop[] = [];
    await render(
      0.5,
      () => {
        const context = getContext();
        const out = context.destination;
        const layer = new RecordingLayer(context, loops, (src) => {
          const loop = new ToneLoop(context, src);
          created.push(loop);
          return loop;
        }, out);
        layer.setMix(SoundZones.only('arrival'), 0.05);
        expect(created).toHaveLength(0);
        layer.resume();
        expect(created.map((l) => l.src)).toEqual(['/audio/sea.ogg']);
        expect(layer.streaming).toBe(1);
        // The lens rises past "on": its recording starts; the arrival stays above "off".
        layer.setMix({ arrival: 0.9, lens: RECORDING.on + 0.01, leak: 0.1 - RECORDING.on - 0.01, border: 0 }, 0.05);
        expect(created.map((l) => l.src)).toEqual(['/audio/sea.ogg', '/audio/glass.ogg']);
        // Between off and on the lens keeps playing; below off it pauses.
        layer.setMix({ arrival: 1 - (RECORDING.on + RECORDING.off) / 2, lens: (RECORDING.on + RECORDING.off) / 2, leak: 0, border: 0 }, 0.05);
        expect(layer.streaming).toBe(2);
        layer.setMix(SoundZones.only('arrival'), 0.05);
        expect(created[1].calls).toEqual(['play', 'pause']);
        expect(layer.streaming).toBe(1);
        // Back past "on": the same source plays again (created once).
        layer.setMix({ arrival: 0.5, lens: 0.5, leak: 0, border: 0 }, 0.05);
        expect(created).toHaveLength(2);
        expect(created[1].calls).toEqual(['play', 'pause', 'play']);
        layer.pause();
        expect(layer.streaming).toBe(0);
        expect(created.map((l) => l.calls.at(-1))).toEqual(['pause', 'pause']);
        layer.resume();
        expect(layer.streaming).toBe(2);
        layer.dispose();
        expect(created.map((l) => l.calls.at(-1))).toEqual(['dispose', 'dispose']);
      },
      null,
    );
  }, 30_000);

  it('is heard through the engine where its zone is heard, and never created elsewhere', async () => {
    const created: string[] = [];
    const withLoops = (zone: 'arrival' | 'leak') =>
      render(
        4,
        async (engine) => {
          engine.setMix(SoundZones.only(zone));
          await engine.start();
        },
        (input) =>
          new RecordingLayer(getContext(), [{ zone: 'leak', src: '/audio/hum.ogg', gain: 1 }], (src) => {
            created.push(`${zone}:${src}`);
            return new ToneLoop(getContext(), src);
          }, input),
      );
    const without = await render(
      4,
      async (engine) => {
        engine.setMix(SoundZones.only('leak'));
        await engine.start();
      },
      null,
    );
    const heard = await withLoops('leak');
    expect(rms(heard, 3, 4)).toBeGreaterThan(rms(without, 3, 4) * 1.2);
    expect(peak(heard, 0, 4)).toBeLessThanOrEqual(0.5);
    // In the arrival the leak's recording is never even created (nothing streamed).
    await withLoops('arrival');
    expect(created).toEqual(['leak:/audio/hum.ogg']);
  }, 60_000);
});
