import { Color, Mesh, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, type Texture } from 'three';

/** Shared unit plane; every apparition scales it to its image's aspect. */
const PLANE = new PlaneGeometry(1, 1);

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
 * texture arrives a work shows as a veil of its dominant colour.
 */
const FRAGMENT = /* glsl */ `
#include <fog_pars_fragment>
uniform sampler2D map;
uniform float hasMap;
uniform vec3 tint;
uniform float opacity;
uniform float softness;
varying vec2 vUv;
void main() {
  vec2 edge = min(vUv, 1.0 - vUv);
  float mask = smoothstep(0.0, softness, min(edge.x, edge.y));
  vec3 color = hasMap > 0.5 ? texture2D(map, vUv).rgb : tint;
  float veil = hasMap > 0.5 ? 1.0 : 0.35;
  gl_FragColor = vec4(color, opacity * mask * veil);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/**
 * One work in the field: a plane with the work's image, a soft alpha-mask
 * edge, the scene's fog, and an opacity driven by the apparition curve. It
 * turns about the vertical axis to face the camera.
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
   */
  constructor(
    readonly slug: string,
    position: { x: number; y: number; z: number },
    aspect: number,
    tint: string,
  ) {
    this.material = new ShaderMaterial({
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        { map: { value: null }, hasMap: { value: 0 }, tint: { value: new Color(tint) }, opacity: { value: 0 }, softness: { value: 0.08 } },
      ]),
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
