// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { probeCapabilities, type ProbeHost } from '../../../src/world/island/CapabilityProbe.js';
import { afterFirstPaint, type PaintHost } from '../../../src/world/island/FirstPaint.js';

/** A browser host with configurable answers. */
function host(over: { webgl2?: boolean; queries?: string[]; nav?: ProbeHost['navigator'] } = {}): ProbeHost & { lost: number } {
  const state = { lost: 0 };
  const gl = { getExtension: (name: string) => (name === 'WEBGL_lose_context' ? { loseContext: () => state.lost++ } : null) };
  return Object.assign(state, {
    document: { createElement: () => ({ getContext: (kind: string) => (kind === 'webgl2' && over.webgl2 !== false ? gl : null) }) },
    matchMedia: (q: string) => ({ matches: (over.queries ?? []).includes(q) }),
    navigator: over.nav ?? { hardwareConcurrency: 8, deviceMemory: 8, connection: { saveData: false } },
  }) as unknown as ProbeHost & { lost: number };
}

describe('probeCapabilities', () => {
  it('reads WebGL2, media preferences and the hardware hints', () => {
    const h = host();
    expect(probeCapabilities(h)).toEqual({ webgl2: true, reducedMotion: false, saveData: false, deviceMemory: 8, hardwareConcurrency: 8, coarsePointer: false });
    expect(h.lost).toBe(1);
  });

  it('notices reduced motion, a coarse pointer, Save-Data and a missing WebGL2', () => {
    const caps = probeCapabilities(
      host({ webgl2: false, queries: ['(prefers-reduced-motion: reduce)', '(pointer: coarse)'], nav: { hardwareConcurrency: 2, connection: { saveData: true } } }),
    );
    expect(caps).toEqual({ webgl2: false, reducedMotion: true, saveData: true, deviceMemory: undefined, hardwareConcurrency: 2, coarsePointer: true });
  });

  it('treats a context without the lose-context extension as fine, and missing hints as unknown', () => {
    const h = host({ nav: {} });
    h.document.createElement = (() => ({ getContext: () => ({ getExtension: () => null }) })) as unknown as ProbeHost['document']['createElement'];
    expect(probeCapabilities(h)).toMatchObject({ webgl2: true, saveData: false, deviceMemory: undefined, hardwareConcurrency: undefined });
  });
});

describe('afterFirstPaint', () => {
  function paintHost(readyState: DocumentReadyState, idle: boolean): PaintHost & { fire: () => void; calls: string[] } {
    const calls: string[] = [];
    let onLoad: (() => void) | null = null;
    const h = {
      calls,
      document: { readyState },
      addEventListener: (_type: 'load', cb: () => void) => {
        calls.push('wait-load');
        onLoad = cb;
      },
      requestAnimationFrame: (cb: () => void) => {
        calls.push('raf');
        cb();
        return 1;
      },
      setTimeout: (cb: () => void) => {
        calls.push('timeout');
        cb();
        return 1;
      },
      requestIdleCallback: idle
        ? (cb: () => void) => {
            calls.push('idle');
            cb();
            return 1;
          }
        : undefined,
      fire: () => onLoad?.(),
    };
    return h as unknown as PaintHost & { fire: () => void; calls: string[] };
  }

  it('waits for load, then a frame, then an idle moment', () => {
    const h = paintHost('loading', true);
    const cb = vi.fn();
    afterFirstPaint(h, cb);
    expect(cb).not.toHaveBeenCalled();
    h.fire();
    expect(cb).toHaveBeenCalledOnce();
    expect(h.calls).toEqual(['wait-load', 'raf', 'idle']);
  });

  it('starts at once after load, with a timeout where idle callbacks do not exist (Safari)', () => {
    const h = paintHost('complete', false);
    const cb = vi.fn();
    afterFirstPaint(h, cb);
    expect(cb).toHaveBeenCalledOnce();
    expect(h.calls).toEqual(['raf', 'timeout']);
  });
});
