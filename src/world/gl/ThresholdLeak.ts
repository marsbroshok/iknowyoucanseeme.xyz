import { Color, LinearSRGBColorSpace, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer } from 'three';
import type { ThresholdColours } from '../core/ThresholdPalette.js';

/** Seconds of one breath of the leak. */
const BREATH_SECONDS = 9;

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** The void, one soft colour leak that breathes and slowly wanders, and a faint grain. */
const FRAGMENT = /* glsl */ `
uniform vec3 base;
uniform vec3 leak;
uniform float time;
uniform vec2 aspect;
varying vec2 vUv;

float grain(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  float breath = 0.5 + 0.5 * sin(time * 6.2831853 / ${BREATH_SECONDS.toFixed(1)});
  vec2 centre = vec2(0.68 + 0.05 * sin(time * 0.05), 0.36 + 0.04 * cos(time * 0.037));
  vec2 d = (vUv - centre) * aspect;
  float glow = exp(-dot(d, d) / (0.05 + 0.03 * breath));
  vec3 colour = mix(base, leak, glow * (0.35 + 0.35 * breath));
  colour += (grain(gl_FragCoord.xy + time) - 0.5) * 0.015;
  gl_FragColor = vec4(colour, 1.0);
}
`;

/**
 * The threshold's single, slowly breathing colour leak (FR1), drawn on the
 * threshold's own small canvas with its own render loop, so it shows as
 * soon as the world module loads and is freed as soon as the threshold is
 * gone. Colours come from {@link ThresholdPalette}. Verified in the browser
 * (ADR 0006).
 */
export class ThresholdLeak {
  private readonly renderer: WebGLRenderer;
  private readonly material: ShaderMaterial;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private frame = 0;
  private readonly started: number;

  /**
   * @param canvas - The threshold's `[data-threshold-leak]` canvas.
   * @param colours - Void and leak colours.
   * @param win - The window (animation frames, clock).
   * @throws Error when WebGL2 cannot be created.
   */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    colours: ThresholdColours,
    private readonly win: Window,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(1);
    this.material = new ShaderMaterial({
      uniforms: { base: { value: ThresholdLeak.raw(colours.base) }, leak: { value: ThresholdLeak.raw(colours.leak) }, time: { value: 0 }, aspect: { value: new Vector2(1, 1) } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    this.scene.add(new Mesh(new PlaneGeometry(2, 2), this.material));
    this.started = win.performance.now();
    canvas.dataset.leak = 'on';
    this.loop();
  }

  /**
   * A CSS colour passed through unchanged (the shader writes it as is, so
   * the void matches the page's night blue).
   *
   * @param hex - `#rrggbb`.
   * @returns The colour.
   */
  private static raw(hex: string): Color {
    return new Color().setStyle(hex, LinearSRGBColorSpace);
  }

  /** Stops the loop and frees the GPU context. */
  dispose(): void {
    this.win.cancelAnimationFrame(this.frame);
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
