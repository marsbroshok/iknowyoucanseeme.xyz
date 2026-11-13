import { AdditiveBlending, Color, DoubleSide, LinearSRGBColorSpace, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import type { QualityTier } from '../core/DeviceProfile.js';
import { FOG_DENSITY } from '../core/StageSettings.js';
import { borealDefines } from '../core/ThresholdPalette.js';
import { GATE, type ZoneGate } from '../core/ZoneGates.js';

/** Shared horizontally subdivided unit plane so 3D curtains undulate smoothly across the path. */
const GATE_PLANE = new PlaneGeometry(1, 1, 32, 1);

/** Beyond this ground distance the exponential fog hides the portal completely. */
const MAX_VISIBLE_DISTANCE = 72;

const VERTEX = /* glsl */ `
precision highp float;

uniform float uTime;
varying vec2 vUv;
varying vec3 vWorldPos;
varying float vFogDepth;

void main() {
  vUv = uv;
  float sway = 0.035 * sin(uv.x * 9.424778 + uTime * 0.36) + 0.018 * cos(uv.x * 18.849556 - uTime * 0.52);
  vec3 displaced = vec3(position.x, position.y, position.z + sway * (0.35 + 0.65 * uv.y));
  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;
  vec4 mvPosition = viewMatrix * worldPos;
  vFogDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uTertiary;
uniform vec3 uCameraPos;
uniform float uTime;
uniform float uPartRadius;
uniform float uFogDensity;

varying vec2 vUv;
varying vec3 vWorldPos;
varying float vFogDepth;

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
    p = vec2(p.x * 2.07 + 11.3, p.y * 1.28 + 5.7);
    amp *= 0.5;
  }
  return smoothstep(0.22, 0.78, sum / norm);
}

void main() {
  float t = uTime;
  float x = vUv.x;

  // Soft lateral taper so the 16m curtain dissolves into the fog at its left/right edges.
  float sideMask = smoothstep(0.0, 0.13, min(x, 1.0 - x));

  // Crisp lower curtain hem rising into upward-fading boreal rays.
  float wave0 = 0.055 * sin(x * 12.5 + t * 0.28);
  float h0 = vUv.y - (0.08 + wave0);
  float vert0 = smoothstep(-0.05, 0.04, h0) * exp(-max(h0, 0.0) * 2.05) * smoothstep(1.0, 0.86, vUv.y);
  float rays0 = rayFbm(vec2((x + wave0 * 0.4) * 44.0 + t * 0.24, vUv.y * 0.62 - t * 0.06));
  float env0 = 0.03 + 0.97 * pow(0.5 + 0.5 * cos(x * 6.2831853 * 3.0 - 0.4 + 0.35 * sin(t * 0.22)), 2.2);
  float band0 = vert0 * (0.28 + 1.45 * rays0) * env0;

  float wave1 = 0.06 * cos(x * 10.8 - t * 0.24 + 1.4);
  float h1 = vUv.y - (0.12 + wave1);
  float vert1 = smoothstep(-0.06, 0.04, h1) * exp(-max(h1, 0.0) * 1.95) * smoothstep(1.0, 0.84, vUv.y);
  float rays1 = rayFbm(vec2((x + wave1 * 0.4) * 38.0 - t * 0.20 + 29.1, vUv.y * 0.58 + t * 0.05));
  float env1 = 0.03 + 0.97 * pow(0.5 + 0.5 * cos(x * 6.2831853 * 3.0 - 2.49 + 0.35 * cos(t * 0.19)), 2.2);
  float band1 = vert1 * (0.30 + 1.45 * rays1) * env1;

  float wave2 = 0.05 * sin(x * 14.0 - t * 0.30 + 2.8);
  float h2 = vUv.y - (0.06 + wave2);
  float vert2 = smoothstep(-0.05, 0.04, h2) * exp(-max(h2, 0.0) * 2.0) * smoothstep(1.0, 0.86, vUv.y);
  float rays2 = rayFbm(vec2((x + wave2 * 0.4) * 48.0 + t * 0.27 + 61.8, vUv.y * 0.65 - t * 0.07));
  float env2 = 0.03 + 0.97 * pow(0.5 + 0.5 * cos(x * 6.2831853 * 3.0 - 4.59 + 0.35 * sin(t * 0.25 + 0.8)), 2.2);
  float band2 = vert2 * (0.32 + 1.50 * rays2) * env2;

  vec3 c0 = mix(uPrimary, vec3(0.05, 0.92, 0.38), 0.38);
  vec3 c1 = mix(uSecondary, vec3(0.46, 0.14, 0.94), 0.42);
  vec3 c2 = mix(uTertiary, vec3(0.98, 0.14, 0.50), 0.46);

  vec3 aurora = c0 * band0 + c1 * band1 + c2 * band2;

  // Smoothly part the curtain within uPartRadius (~2.5m) of the camera so crossing feels fluid.
  float camDist = length(vWorldPos.xz - uCameraPos.xz);
  float part = 0.08 + 0.92 * smoothstep(0.35, uPartRadius, camDist);

  // Exponential-squared fog attenuation matching WorldStage's FogExp2 without additive haloing.
  float fogAtten = exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
  float alpha = clamp(sideMask * part * fogAtten * 0.78, 0.0, 1.0);

  gl_FragColor = vec4(clamp(aurora, 0.0, 1.0), alpha);
}
`;

/**
 * Translucent, double-sided 3D aurora borealis curtain hanging across a zone
 * gap or territory border (FR3). Placement and parting radius come from
 * {@link ZoneGates}; FBM octave count follows {@link borealDefines}. Verified
 * in the browser (ADR 0006).
 */
export class BorealGateMesh {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly material: ShaderMaterial;

  /**
   * @param gate - Pure portal placement and boreal ribbon colours.
   * @param tier - Quality tier (`high` or `low`).
   */
  constructor(
    readonly gate: ZoneGate,
    tier: QualityTier,
  ) {
    this.material = new ShaderMaterial({
      uniforms: {
        uPrimary: { value: BorealGateMesh.raw(gate.ribbons.primary) },
        uSecondary: { value: BorealGateMesh.raw(gate.ribbons.secondary) },
        uTertiary: { value: BorealGateMesh.raw(gate.ribbons.tertiary) },
        uCameraPos: { value: new Vector3(0, 0, 0) },
        uTime: { value: 0 },
        uPartRadius: { value: GATE.partRadius },
        uFogDensity: { value: FOG_DENSITY },
      },
      defines: borealDefines(tier),
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    this.mesh = new Mesh(GATE_PLANE, this.material);
    this.mesh.scale.set(gate.width, gate.height, 1);
    this.mesh.position.set(gate.x, gate.y, gate.z);
    this.mesh.rotation.y = gate.yaw;
    // Picking hits artworks behind the curtain, never the curtain itself.
    this.mesh.raycast = () => undefined;
  }

  /**
   * Updates camera coordinates (for proximity parting and distance culling) and
   * curtain animation time.
   *
   * @param camX - Camera world x.
   * @param camY - Camera world y.
   * @param camZ - Camera world z.
   * @param time - Elapsed seconds.
   */
  update(camX: number, camY: number, camZ: number, time: number): void {
    const dist = Math.hypot(camX - this.gate.x, camZ - this.gate.z);
    this.mesh.visible = dist < MAX_VISIBLE_DISTANCE;
    if (!this.mesh.visible) return;
    (this.material.uniforms.uCameraPos.value as Vector3).set(camX, camY, camZ);
    this.material.uniforms.uTime.value = time;
  }

  /** Frees this portal's shader material (shared unit plane remains). */
  dispose(): void {
    this.material.dispose();
  }

  private static raw(hex: string): Color {
    return new Color().setStyle(hex, LinearSRGBColorSpace);
  }
}
