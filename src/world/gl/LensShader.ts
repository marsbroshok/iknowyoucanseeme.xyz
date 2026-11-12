/**
 * GLSL of the lens (FR1), included in the apparition fragment shader after
 * its `map` sampler. Six camera techniques act inside a soft circle around
 * the pointer; two of them can be drawn at once and mixed (crossfade). The
 * uniforms are filled from `LensUniforms`, `LensDirector` and
 * `LensCrossfade` (src/world/core); tier variants come from `LensQuality`
 * as defines (`LENS_SAMPLES`, `LENS_GHOSTS`, `LENS_FRACTURE`).
 *
 * Purity (FR4): the lens only changes the colour drawn; the texture is
 * never written.
 *
 * Verified in the browser (tests/e2e/lens.visual.spec.ts, ADR 0006).
 */
export const LENS_PARS = /* glsl */ `
uniform float lensStrength;
uniform vec2 lensCenter;
uniform float lensRadius;
uniform float lensAspect;
uniform int lensModeA;
uniform int lensModeB;
uniform float lensMix;
uniform vec2 lensBlur;
uniform vec3 lensGel;
uniform float lensSegments;
uniform float lensSeed;
uniform sampler2D lensPartner;
uniform float lensHasPartner;

// Texture space <-> lens space (aspect-corrected, origin at the pointer).
vec2 lensToLocal(vec2 uv) { return (uv - lensCenter) * vec2(lensAspect, 1.0); }
vec2 lensFromLocal(vec2 p) { return lensCenter + p / vec2(lensAspect, 1.0); }

// Soft circular region: full inside 60 % of the radius, gone at the radius.
float lensMask(vec2 uv) {
  return 1.0 - smoothstep(lensRadius * 0.6, lensRadius, length(lensToLocal(uv)));
}

vec3 lensSample(vec2 uv) { return texture2D(map, clamp(uv, 0.0, 1.0)).rgb; }
float lensLuma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 lensMode(int mode, vec2 uv, vec3 base) {
  return base;
}

vec3 lensApply(vec2 uv, vec3 base) {
  if (lensStrength <= 0.0) return base;
  float m = lensMask(uv) * lensStrength;
  if (m <= 0.0) return base;
  vec3 a = lensMix < 1.0 ? lensMode(lensModeA, uv, base) : base;
  vec3 b = lensMix > 0.0 ? lensMode(lensModeB, uv, base) : base;
  return mix(base, mix(a, b, lensMix), m);
}
`;
