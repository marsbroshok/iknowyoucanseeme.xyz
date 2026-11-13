import { Color, FogExp2, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import { ThresholdLeak } from '../../../src/world/gl/ThresholdLeak.js';
import { BorealGateMesh } from '../../../src/world/gl/BorealGateMesh.js';
import { ThresholdPalette } from '../../../src/world/core/ThresholdPalette.js';
import { ZoneGates } from '../../../src/world/core/ZoneGates.js';
import { FieldLayout } from '../../../src/world/core/FieldLayout.js';
import { CAMERA, EYE_HEIGHT, FOG_DENSITY } from '../../../src/world/core/StageSettings.js';
import { ZoneAtmosphere } from '../../../src/world/core/ZoneAtmosphere.js';
import type { QualityTier } from '../../../src/world/core/DeviceProfile.js';

/**
 * Browser shader harness for `ThresholdLeak` and `BorealGateMesh` (served via
 * `page.route` in `tests/e2e/boreal.visual.spec.ts`, never shipped in the site build).
 */
export const SIZE = 256;

export interface BorealPixelsResult {
  pixels: number[];
}

export interface BorealHarness {
  errors: string[];
  drawThreshold(tier: QualityTier, seconds: number): BorealPixelsResult;
  drawGate(cameraZ: number, tier: QualityTier, seconds?: number): BorealPixelsResult;
}

const host = document.createElement('div');
document.body.style.margin = '0';
document.body.append(host);
const errors: string[] = [];

function drawThreshold(tier: QualityTier, seconds: number): BorealPixelsResult {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.style.cssText = `width:${SIZE}px;height:${SIZE}px;display:block`;
  host.replaceChildren(canvas);

  let clockMs = 1000;
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

  const colours = ThresholdPalette.pick([{ zone: 'arrival', palette: ['#4060e0', '#0b1030'] }], () => 0);
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

function drawGate(cameraZ: number, tier: QualityTier, seconds = 1.2): BorealPixelsResult {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.style.cssText = `width:${SIZE}px;height:${SIZE}px;display:block`;
  host.replaceChildren(canvas);

  const renderer = new WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
    errors.push(`${gl.getProgramInfoLog(program) ?? ''} ${gl.getShaderInfoLog(vertex) ?? ''} ${gl.getShaderInfoLog(fragment) ?? ''}`.trim() || 'shader error');
  };

  const layout = FieldLayout.compute(
    [
      { slug: 'arr-1', territory: 'dreamland', zone: 'arrival' },
      { slug: 'lens-1', territory: 'dreamland', zone: 'lens' },
    ],
    ['dreamland'],
  );
  const rawGate = ZoneGates.compute(layout)[0];
  // Re-center the gate at the origin facing +z so cameraZ measures exact perpendicular distance.
  const gate = { ...rawGate, x: 0, z: 0, yaw: 0 };
  const baseHex = ZoneAtmosphere.forRegion(gate.into).base;

  const scene = new Scene();
  scene.background = new Color(baseHex);
  scene.fog = new FogExp2(baseHex, FOG_DENSITY);

  const camera = new PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  camera.position.set(0, EYE_HEIGHT, cameraZ);
  camera.rotation.set(0, 0, 0);

  const gateMesh = new BorealGateMesh(gate, tier);
  scene.add(gateMesh.mesh);
  gateMesh.update(0, EYE_HEIGHT, cameraZ, seconds);

  renderer.render(scene, camera);
  const gl = renderer.getContext();
  const out = new Uint8Array(SIZE * SIZE * 4);
  gl.readPixels(0, 0, SIZE, SIZE, gl.RGBA, gl.UNSIGNED_BYTE, out);

  gateMesh.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return { pixels: Array.from(out) };
}

(window as unknown as { __boreal: BorealHarness }).__boreal = { errors, drawThreshold, drawGate };
