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

// 0. Colour filter / gel: the gel passes its own colour and holds back the
// others; exposure is partly compensated, as a photographer would.
vec3 lensGelFilter(vec3 base) {
  vec3 gel = lensGel / max(max(lensGel.r, max(lensGel.g, lensGel.b)), 1e-3);
  vec3 filtered = base * gel;
  float gain = mix(1.0, lensLuma(base) / max(lensLuma(filtered), 1e-3), 0.6);
  return clamp(filtered * gain, 0.0, 1.0);
}

// 1. Mirror fold: a kaleidoscope of 2-6 segments around the pointer,
// symmetric across the horizontal line through it.
vec3 lensMirror(vec2 uv) {
  vec2 p = lensToLocal(uv);
  float seg = 6.28318530718 / lensSegments;
  float a = mod(atan(p.y, p.x), seg);
  a = min(a, seg - a);
  return lensSample(lensFromLocal(length(p) * vec2(cos(a), sin(a))));
}

// 2. Multiple exposure: screen blend with a second work of the same zone
// (or, until one is loaded, the work itself turned around).
vec3 lensExposure(vec2 uv, vec3 base) {
  vec3 second = lensHasPartner > 0.5 ? texture2D(lensPartner, uv).rgb : lensSample(vec2(1.0) - uv);
  return 1.0 - (1.0 - base) * (1.0 - second * 0.85);
}

#ifdef LENS_FRACTURE
// Hash without sine (stable across GPUs).
vec2 lensHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx + lensSeed * 13.7) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

// 3. Fracture & re-collage: Voronoi shards, each shifted and turned a little.
vec3 lensFracture(vec2 uv) {
  vec2 p = lensToLocal(uv) / lensRadius * 3.0;
  vec2 cell = floor(p);
  float best = 1e9;
  vec2 bestId = cell;
  vec2 bestPt = cell;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = cell + vec2(float(i), float(j));
      vec2 pt = id + lensHash(id);
      float d = dot(p - pt, p - pt);
      if (d < best) { best = d; bestId = id; bestPt = pt; }
    }
  }
  vec2 h = lensHash(bestId + 7.0) - 0.5;
  float ang = h.x * 0.35;
  vec2 q = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * (p - bestPt);
  vec2 moved = bestPt + q + h * 0.45;
  return lensSample(lensFromLocal(moved / 3.0 * lensRadius)) * (0.9 + 0.2 * fract(h.y * 7.0 + 0.5));
}
#endif

// 4. Light leak / flare: a warm anamorphic streak and glow at the pointer,
// and chromatic ghosts along the line to the centre of the frame.
vec3 lensFlare(vec2 uv, vec3 base) {
  vec2 p = lensToLocal(uv);
  float r = length(p) / lensRadius;
  float streak = exp(-abs(p.y) * 60.0) * exp(-abs(p.x) * 3.0);
  float glow = exp(-r * r * 4.0);
  vec2 axis = vec2(0.5) - lensCenter;
  vec3 ghost = vec3(0.0);
  for (int i = 1; i <= LENS_GHOSTS; i++) {
    float k = float(i) * 0.06 + 0.04;
    ghost += vec3(lensSample(uv + axis * k).r, lensSample(uv + axis * k * 1.15).g, lensSample(uv + axis * k * 1.3).b);
  }
  ghost /= float(LENS_GHOSTS);
  return base + vec3(1.0, 0.62, 0.28) * (streak * 0.9 + glow * 0.35) + ghost * 0.25;
}

// 5. Motion blur / ICM: samples along the pointer's streak.
vec3 lensIcm(vec2 uv) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < LENS_SAMPLES; i++) {
    acc += lensSample(uv + lensBlur * (float(i) / float(LENS_SAMPLES - 1) - 0.5));
  }
  return acc / float(LENS_SAMPLES);
}

vec3 lensMode(int mode, vec2 uv, vec3 base) {
  if (mode == 0) return lensGelFilter(base);
  if (mode == 1) return lensMirror(uv);
  if (mode == 2) return lensExposure(uv, base);
#ifdef LENS_FRACTURE
  if (mode == 3) return lensFracture(uv);
#endif
  if (mode == 4) return lensFlare(uv, base);
  if (mode == 5) return lensIcm(uv);
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
