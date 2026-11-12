import { DataTexture, OrthographicCamera, RGBAFormat, SRGBColorSpace, Scene, UnsignedByteType, WebGLRenderer, LinearFilter } from 'three';
import { ApparitionMesh, APPARITION_LONG_EDGE, type LensMaterialState } from '../../../src/world/gl/ApparitionMesh.js';
import { LENS_MODES, modeIndex, type LensMode } from '../../../src/world/core/LensMode.js';
import type { QualityTier } from '../../../src/world/core/DeviceProfile.js';

/**
 * Lens shader harness for Playwright (tests/e2e/lens.visual.spec.ts): draws
 * one square apparition with a fixed, computed test texture (no image file,
 * no font: identical on every machine) and the real lens shader, and hands
 * back the pixels. Served by the spec through `page.route`, never built
 * into the site.
 */

/** Size of the test texture and of the canvas (px). */
export const SIZE = 256;

/** What a draw call asks for. */
export interface HarnessLens {
  mode: LensMode;
  /** Second lens of a crossfade (defaults to `mode`). */
  modeB?: LensMode;
  mix?: number;
  center?: [number, number];
  strength?: number;
  blur?: [number, number];
  segments?: number;
  partner?: boolean;
}

/** The page API. */
export interface LensHarness {
  modes: readonly LensMode[];
  /** Shader compile / link errors seen so far. */
  errors: string[];
  /** Draws with a lens (or none) and returns RGBA pixels, bottom row first. */
  draw(lens: HarnessLens | null, tier: QualityTier): number[];
  /** Sum of the test texture's bytes (to prove the lens never changes it). */
  textureChecksum(): number;
}

/** A smooth colour field with a sharp checker and diagonal bars: hue, edges and texture. */
function testPixels(seedShift: number): Uint8Array {
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const u = x / (SIZE - 1);
      const v = y / (SIZE - 1);
      const checker = (Math.floor((x + seedShift) / 16) + Math.floor(y / 16)) % 2 === 0 ? 1 : 0.55;
      const bar = Math.floor((x + y + seedShift) / 24) % 3 === 0 ? 0.65 : 1;
      data[i] = Math.round(255 * (0.15 + 0.8 * u) * checker * bar);
      data[i + 1] = Math.round(255 * (0.2 + 0.6 * v) * checker);
      data[i + 2] = Math.round(255 * (0.85 - 0.6 * u) * bar);
      data[i + 3] = 255;
    }
  }
  return data;
}

function texture(data: Uint8Array): DataTexture {
  const t = new DataTexture(data, SIZE, SIZE, RGBAFormat, UnsignedByteType);
  t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

const canvas = document.createElement('canvas');
canvas.width = SIZE;
canvas.height = SIZE;
canvas.dataset.lensCanvas = '';
canvas.style.cssText = `width:${SIZE}px;height:${SIZE}px;display:block`;
document.body.style.margin = '0';
document.body.append(canvas);

const renderer = new WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(SIZE, SIZE, false);
const errors: string[] = [];
renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
  errors.push(`${gl.getProgramInfoLog(program) ?? ''} ${gl.getShaderInfoLog(vertex) ?? ''} ${gl.getShaderInfoLog(fragment) ?? ''}`.trim() || 'shader error');
};

const half = APPARITION_LONG_EDGE / 2;
const camera = new OrthographicCamera(-half, half, half, -half, 0.1, 10);
camera.position.z = 5;
const scene = new Scene();
const pixels = testPixels(0);
const image = texture(pixels);
const partner = texture(testPixels(37).map((b, i) => (i % 4 === 3 ? b : 255 - b)));

const meshes: Record<QualityTier, ApparitionMesh> = {
  high: new ApparitionMesh('test', { x: 0, y: 0, z: 0 }, 1, '#000000', 'high'),
  low: new ApparitionMesh('test', { x: 0, y: 0, z: 0 }, 1, '#000000', 'low'),
};
for (const m of Object.values(meshes)) {
  m.setTexture(image);
  m.setOpacity(1);
  m.face(0, 5);
  scene.add(m.mesh);
}

const harness: LensHarness = {
  modes: LENS_MODES,
  errors,
  draw(lens, tier) {
    for (const [t, m] of Object.entries(meshes)) m.mesh.visible = t === tier;
    const state: LensMaterialState | null = lens && {
      strength: lens.strength ?? 1,
      center: { x: lens.center?.[0] ?? 0.5, y: lens.center?.[1] ?? 0.5 },
      blur: { x: lens.blur?.[0] ?? 0, y: lens.blur?.[1] ?? 0.04 },
      modeA: modeIndex(lens.mode),
      modeB: modeIndex(lens.modeB ?? lens.mode),
      mix: lens.mix ?? 0,
      gel: '#e03a20',
      segments: lens.segments ?? 4,
      seed: 0.37,
      partner: lens.partner === false ? null : partner,
    };
    meshes[tier].setLens(state);
    renderer.render(scene, camera);
    const gl = renderer.getContext();
    const out = new Uint8Array(SIZE * SIZE * 4);
    gl.readPixels(0, 0, SIZE, SIZE, gl.RGBA, gl.UNSIGNED_BYTE, out);
    return Array.from(out);
  },
  textureChecksum() {
    return pixels.reduce((a, b) => a + b, 0);
  },
};

(window as unknown as { __lens: LensHarness }).__lens = harness;
