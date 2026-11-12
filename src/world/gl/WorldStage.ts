import { Color, FogExp2, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import type { QualityTier } from '../core/DeviceProfile.js';
import type { ViewPose } from '../core/DriftController.js';
import { CAMERA, EYE_HEIGHT, FOG_DENSITY, NIGHT_BLUE, STAGE_SETTINGS, pixelRatioFor } from '../core/StageSettings.js';

/** Called once per animation frame with the frame time in seconds. */
export type FrameCallback = (dt: number) => void;

/**
 * The WebGL side of the drift: renderer, scene with night-blue exponential
 * fog, eye-level perspective camera, resize handling and the frame loop.
 * Pixel ratio and anti-aliasing follow the quality tier.
 *
 * Verified in the browser (Playwright, SwiftShader); see ADR 0006.
 */
export class WorldStage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  readonly fog = new FogExp2(NIGHT_BLUE, FOG_DENSITY);
  private readonly background = new Color(NIGHT_BLUE);
  private readonly observer: ResizeObserver;
  private last = 0;

  /**
   * @param canvas - Canvas to draw into (sized by CSS).
   * @param tier - Quality tier.
   * @param devicePixelRatio - `window.devicePixelRatio`.
   * @throws Error when no WebGL2 context can be created.
   */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    tier: QualityTier,
    devicePixelRatio: number,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: STAGE_SETTINGS[tier].antialias, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(pixelRatioFor(devicePixelRatio, tier));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.scene.background = this.background;
    this.scene.fog = this.fog;
    this.camera.position.y = EYE_HEIGHT;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }

  /** Matches the drawing buffer and camera aspect to the canvas' CSS size. */
  resize(): void {
    const width = Math.max(this.canvas.clientWidth, 1);
    const height = Math.max(this.canvas.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Places the camera at a pose (eye level).
   *
   * @param pose - Ground position and heading.
   */
  setPose(pose: ViewPose): void {
    this.camera.position.set(pose.x, EYE_HEIGHT, pose.z);
    this.camera.rotation.set(0, pose.yaw, 0);
  }

  /**
   * Sets the colour of sky and fog together (they must match, or works
   * would show a halo against the background).
   *
   * @param color - CSS hex colour.
   */
  setSkyColor(color: string): void {
    this.background.set(color);
    this.fog.color.set(color);
  }

  /**
   * Starts the frame loop.
   *
   * @param onFrame - Per-frame update, called before rendering.
   */
  start(onFrame: FrameCallback): void {
    this.last = performance.now();
    this.renderer.setAnimationLoop((now: number) => {
      const dt = (now - this.last) / 1000;
      this.last = now;
      onFrame(dt);
      this.renderer.render(this.scene, this.camera);
    });
  }

  /** Stops the loop and frees GPU resources of the renderer. */
  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.observer.disconnect();
    this.renderer.dispose();
  }
}
