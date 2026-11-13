import { Color, LinearSRGBColorSpace, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer } from 'three';
import type { QualityTier } from '../core/DeviceProfile.js';
import { borealDefines, type ThresholdColours } from '../core/ThresholdPalette.js';

/** Seconds of one slow breath of the boreal curtain. */
const BREATH_SECONDS = 9;

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Multi-ribbon Aurora Borealis wall over deep night indigo: undulating vertical
 * curtain folds with sharp lower hems, upward-fading magnetic-field rays,
 * interwoven emerald-green, boreal-violet, and rose-pink ribbons, and subtle
 * film grain.
 */
const FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3 base;
uniform vec3 green;
uniform vec3 violet;
uniform vec3 pink;
uniform vec3 leak;
uniform float time;
uniform vec2 aspect;
varying vec2 vUv;

float hash21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float rayFbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.55;
  float norm = 0.0;
  for (int i = 0; i < BOREAL_OCTAVES; i++) {
    sum += amp * vnoise(p);
    norm += amp;
    p = vec2(p.x * 2.07 + 13.7, p.y * 1.28 + 7.1);
    amp *= 0.5;
  }
  return smoothstep(0.24, 0.78, sum / norm);
}

void main() {
  float t = time;
  float breath = 0.88 + 0.12 * sin(t * 6.2831853 / ${BREATH_SECONDS.toFixed(1)});
  float x = vUv.x;

  // Sheet 0: emerald / oxygen-green boreal arc
  float wave0 = 0.07 * sin(x * 6.4 + t * 0.24) + 0.03 * cos(x * 13.2 - t * 0.31);
  float h0 = vUv.y - (0.20 + wave0);
  float vert0 = smoothstep(-0.045, 0.025, h0) * exp(-max(h0, 0.0) * 2.15);
  float rays0 = rayFbm(vec2((x + wave0 * 0.6) * 26.0 * aspect.x + t * 0.22, vUv.y * 0.55 - t * 0.05));
  float env0 = 0.03 + 0.97 * pow(0.5 + 0.5 * cos(x * 6.2831853 * 1.5 - 0.55 + 0.4 * sin(t * 0.21)), 2.35);
  float band0 = vert0 * (0.26 + 1.38 * rays0) * env0;

  // Sheet 1: deep boreal violet curtain
  float wave1 = 0.08 * cos(x * 5.8 - t * 0.21 + 1.2) + 0.03 * sin(x * 11.8 + t * 0.27);
  float h1 = vUv.y - (0.26 + wave1);
  float vert1 = smoothstep(-0.05, 0.025, h1) * exp(-max(h1, 0.0) * 2.05);
  float rays1 = rayFbm(vec2((x + wave1 * 0.6) * 22.0 * aspect.x - t * 0.19 + 31.4, vUv.y * 0.52 + t * 0.04));
  float env1 = 0.03 + 0.97 * pow(0.5 + 0.5 * cos(x * 6.2831853 * 1.5 - 2.64 + 0.4 * cos(t * 0.18)), 2.35);
  float band1 = vert1 * (0.28 + 1.38 * rays1) * env1;

  // Sheet 2: rose-magenta boreal curtain & lower hem
  float wave2 = 0.07 * sin(x * 7.1 - t * 0.26 + 2.7) + 0.03 * cos(x * 14.4 + t * 0.29);
  float h2 = vUv.y - (0.18 + wave2);
  float vert2 = smoothstep(-0.045, 0.025, h2) * exp(-max(h2, 0.0) * 1.85);
  float rays2 = rayFbm(vec2((x + wave2 * 0.6) * 28.0 * aspect.x + t * 0.25 + 67.2, vUv.y * 0.58 - t * 0.06));
  float env2 = 0.03 + 0.97 * pow(0.5 + 0.5 * cos(x * 6.2831853 * 1.5 - 4.74 + 0.4 * sin(t * 0.23 + 1.0)), 2.2);
  float band2 = vert2 * (0.34 + 1.52 * rays2) * env2;

  vec3 emeraldStop = mix(green, vec3(0.06, 0.90, 0.40), 0.44);
  vec3 violetStop = mix(violet, vec3(0.45, 0.20, 0.92), 0.34);
  vec3 pinkStop = mix(pink, vec3(0.98, 0.20, 0.50), 0.48);

  vec3 aurora = emeraldStop * (band0 * 0.92) + violetStop * (band1 * 0.94) + pinkStop * (band2 * 1.06);
  float hemShimmer = smoothstep(0.06, 0.0, abs(h0)) * rays0 * 0.08;
  aurora += leak * hemShimmer;

  vec3 colour = base + aurora * breath;
  colour = colour / (1.0 + max(vec3(0.0), colour - 0.62) * 0.55);
  colour += (hash21(gl_FragCoord.xy + fract(t) * 100.0) - 0.5) * 0.014;
  gl_FragColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`;

/**
 * The threshold's multi-ribbon boreal light curtain (FR1), drawn on the
 * threshold's own canvas with its own render loop, so it shimmers as soon as
 * the world module loads and is freed as soon as the threshold is gone.
 * Colours and tier defines come from {@link ThresholdPalette}. Verified in the
 * browser (ADR 0006).
 */
export class ThresholdLeak {
  private readonly renderer: WebGLRenderer;
  private readonly material: ShaderMaterial;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly plane = new PlaneGeometry(2, 2);
  private frame = 0;
  private readonly started: number;

  /**
   * @param canvas - The threshold's `[data-threshold-leak]` canvas.
   * @param colours - Night-indigo base and boreal ribbon stops.
   * @param win - The window (animation frames, clock).
   * @param tier - Quality tier (`high` uses 4 FBM octaves, `low` uses 2).
   * @throws Error when WebGL2 cannot be created.
   */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    colours: ThresholdColours,
    private readonly win: Window,
    tier: QualityTier = 'high',
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(1);
    this.material = new ShaderMaterial({
      uniforms: {
        base: { value: ThresholdLeak.raw(colours.base) },
        green: { value: ThresholdLeak.raw(colours.green) },
        violet: { value: ThresholdLeak.raw(colours.violet) },
        pink: { value: ThresholdLeak.raw(colours.pink) },
        leak: { value: ThresholdLeak.raw(colours.leak) },
        time: { value: 0 },
        aspect: { value: new Vector2(1, 1) },
      },
      defines: borealDefines(tier),
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    this.scene.add(new Mesh(this.plane, this.material));
    this.started = win.performance.now();
    canvas.dataset.leak = 'on';
    this.loop();
  }

  /**
   * A CSS colour passed through unchanged into linear uniform space so the
   * shader writes exact 0–1 channel values matching the hex stops.
   *
   * @param hex - `#rrggbb`.
   * @returns The colour.
   */
  private static raw(hex: string): Color {
    return new Color().setStyle(hex, LinearSRGBColorSpace);
  }

  /** Stops the loop and frees the GPU geometry, material, and context. */
  dispose(): void {
    this.win.cancelAnimationFrame(this.frame);
    this.plane.dispose();
    this.material.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    delete this.canvas.dataset.leak;
  }

  /** Draws one frame and asks for the next. */
  private loop = (): void => {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (w > 0 && h > 0 && (this.canvas.width !== w || this.canvas.height !== h)) this.renderer.setSize(w, h, false);
    const aspect = this.material.uniforms.aspect.value as Vector2;
    aspect.set(Math.max(w / Math.max(h, 1), 1), Math.max(h / Math.max(w, 1), 1));
    this.material.uniforms.time.value = (this.win.performance.now() - this.started) / 1000;
    this.renderer.render(this.scene, this.camera);
    this.frame = this.win.requestAnimationFrame(this.loop);
  };
}
