import { ThresholdLeak } from '../../../src/world/gl/ThresholdLeak.js';
import { ThresholdPalette } from '../../../src/world/core/ThresholdPalette.js';
import type { QualityTier } from '../../../src/world/core/DeviceProfile.js';

/**
 * Browser shader harness for `ThresholdLeak` (served via `page.route` in
 * `tests/e2e/boreal.visual.spec.ts`, never shipped in the production build).
 */
export const SIZE = 256;

export interface BorealThresholdResult {
  pixels: number[];
}

export interface BorealHarness {
  drawThreshold(tier: QualityTier, seconds: number): BorealThresholdResult;
}

const host = document.createElement('div');
document.body.style.margin = '0';
document.body.append(host);

function drawThreshold(tier: QualityTier, seconds: number): BorealThresholdResult {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.style.cssText = `width:${SIZE}px;height:${SIZE}px;display:block`;
  host.replaceChildren(canvas);

  let clockMs = 1000;
  const fakeWin = {
    performance: { now: () => clockMs },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => undefined,
  } as unknown as Window;

  const colours = ThresholdPalette.pick([{ zone: 'arrival', palette: ['#4060e0', '#0b1030'] }], () => 0);
  // Advance clock after construction if seconds > 0 by re-rendering on next tick via controlled clock:
  let rafCb: FrameRequestCallback | null = null;
  const timedWin = {
    performance: { now: () => clockMs },
    requestAnimationFrame: (cb: FrameRequestCallback) => {
      rafCb = cb;
      return 1;
    },
    cancelAnimationFrame: () => {
      rafCb = null;
    },
  } as unknown as Window;
  void fakeWin;

  const leak = new ThresholdLeak(canvas, colours, timedWin, tier);
  if (seconds > 0 && rafCb) {
    clockMs += seconds * 1000;
    (rafCb as FrameRequestCallback)(clockMs);
  }
  const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
  const out = new Uint8Array(SIZE * SIZE * 4);
  gl.readPixels(0, 0, SIZE, SIZE, gl.RGBA, gl.UNSIGNED_BYTE, out);
  leak.dispose();
  return { pixels: Array.from(out) };
}

(window as unknown as { __boreal: BorealHarness }).__boreal = { drawThreshold };
