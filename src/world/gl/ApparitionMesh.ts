import { Color, Mesh, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, type Texture } from 'three';
import type { QualityTier } from '../core/DeviceProfile.js';
import { lensDefines } from '../core/LensQuality.js';
import { LENS } from '../core/LensUniforms.js';
import { LENS_PARS } from './LensShader.js';

/** Shared unit plane; every apparition scales it to its image's aspect. */
const PLANE = new PlaneGeometry(1, 1);

/** Lens uniforms of one apparition for a frame (see `LensShader`). */
export interface LensMaterialState {
  /** How much of the lens shows, in [0, 1]. */
  strength: number;
  /** Lens centre (texture space). */
  center: { x: number; y: number };
  /** Motion-blur streak (texture space). */
  blur: { x: number; y: number };
  /** Shader numbers of the two lenses mixed (`modeIndex`). */
  modeA: number;
  modeB: number;
  /** Weight of `modeB`. */
  mix: number;
  /** Gel colour (CSS hex). */
  gel: string;
  /** Mirror segments (2–6). */
  segments: number;
  /** Per-work number in [0, 1) (fracture layout). */
  seed: number;
  /** Second picture of a multiple exposure, or `null`. */
  partner: Texture | null;
}

/** Long edge of a work in the field (world units). */
export const APPARITION_LONG_EDGE = 2.6;

const VERTEX = /* glsl */ `
#include <fog_pars_vertex>
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

/*
 * Soft-edged alpha mask: the image fades out towards its borders (no hard
 * frame), and the whole plane fades with the apparition curve. Before its
 * texture arrives a work shows as a veil of its dominant colour. The lens
 * (LensShader) only changes the colour drawn, never the texture.
 */
const FRAGMENT = /* glsl */ `
#include <fog_pars_fragment>
uniform sampler2D map;
uniform float hasMap;
uniform vec3 tint;
uniform float opacity;
uniform float softness;
varying vec2 vUv;
${LENS_PARS}
void main() {
  vec2 edge = min(vUv, 1.0 - vUv);
  float mask = smoothstep(0.0, softness, min(edge.x, edge.y));
  vec3 color = hasMap > 0.5 ? lensApply(vUv, texture2D(map, vUv).rgb) : tint;
  float veil = hasMap > 0.5 ? 1.0 : 0.35;
  gl_FragColor = vec4(color, opacity * mask * veil);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/**
 * One work in the field: a plane with the work's image, a soft alpha-mask
 * edge, the scene's fog, and an opacity driven by the apparition curve. It
 * turns about the vertical axis to face the camera. The lens draws over it
 * when the pointer is on it (`setLens`), in the tier's shader variant.
 *
 * Verified in the browser (ADR 0006).
 */
export class ApparitionMesh {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly material: ShaderMaterial;

  /**
   * @param slug - Work slug (kept on the mesh for picking).
   * @param position - Centre of the work.
   * @param aspect - Image width / height.
   * @param tint - Dominant colour shown until the texture arrives (CSS hex).
   * @param tier - Quality tier (lens shader variant).
   */
  constructor(
    readonly slug: string,
    position: { x: number; y: number; z: number },
    aspect: number,
    tint: string,
    tier: QualityTier,
  ) {
    this.material = new ShaderMaterial({
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        { map: { value: null }, hasMap: { value: 0 }, tint: { value: new Color(tint) }, opacity: { value: 0 }, softness: { value: 0.08 } },
        {
          lensStrength: { value: 0 },
          lensCenter: { value: new Vector2(0.5, 0.5) },
          lensRadius: { value: LENS.radius },
          lensAspect: { value: aspect },
          lensModeA: { value: 0 },
          lensModeB: { value: 0 },
          lensMix: { value: 0 },
          lensBlur: { value: new Vector2(0, 0) },
          lensGel: { value: new Color(1, 1, 1) },
          lensSegments: { value: 4 },
          lensSeed: { value: 0 },
          lensPartner: { value: null },
          lensHasPartner: { value: 0 },
        },
      ]),
      defines: lensDefines(tier),
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    this.mesh = new Mesh(PLANE, this.material);
    const [w, h] = aspect >= 1 ? [APPARITION_LONG_EDGE, APPARITION_LONG_EDGE / aspect] : [APPARITION_LONG_EDGE * aspect, APPARITION_LONG_EDGE];
    this.mesh.scale.set(w, h, 1);
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.userData.slug = slug;
    this.mesh.visible = false;
  }

  /**
   * Shows a texture, or the colour veil when `null`.
   *
   * @param texture - Loaded texture or `null`.
   */
  setTexture(texture: Texture | null): void {
    this.material.uniforms.map.value = texture;
    this.material.uniforms.hasMap.value = texture ? 1 : 0;
  }

  /** The work's texture, or `null` while it shows as a colour veil. */
  get texture(): Texture | null {
    return this.material.uniforms.map.value as Texture | null;
  }

  /**
   * Draws the lens over this work, or removes it (`null`).
   *
   * @param lens - Lens uniforms for this frame, or `null`.
   */
  setLens(lens: LensMaterialState | null): void {
    const u = this.material.uniforms;
    u.lensStrength.value = lens ? lens.strength : 0;
    if (!lens) {
      u.lensPartner.value = null;
      return;
    }
    (u.lensCenter.value as Vector2).set(lens.center.x, lens.center.y);
    (u.lensBlur.value as Vector2).set(lens.blur.x, lens.blur.y);
    u.lensModeA.value = lens.modeA;
    u.lensModeB.value = lens.modeB;
    u.lensMix.value = lens.mix;
    (u.lensGel.value as Color).set(lens.gel);
    u.lensSegments.value = lens.segments;
    u.lensSeed.value = lens.seed;
    u.lensPartner.value = lens.partner;
    u.lensHasPartner.value = lens.partner ? 1 : 0;
  }

  /**
   * Sets the apparition opacity; fully transparent works are not drawn.
   *
   * @param opacity - In [0, 1].
   */
  setOpacity(opacity: number): void {
    this.material.uniforms.opacity.value = opacity;
    this.mesh.visible = opacity > 0.002;
  }

  /**
   * Turns the plane to face a camera position (about the vertical axis).
   *
   * @param x - Camera x.
   * @param z - Camera z.
   */
  face(x: number, z: number): void {
    this.mesh.rotation.y = Math.atan2(x - this.mesh.position.x, z - this.mesh.position.z);
  }

  /** Frees the material (the shared geometry stays). */
  dispose(): void {
    this.material.dispose();
  }
}
