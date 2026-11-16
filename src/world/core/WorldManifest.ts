import { ZONE_ORDER, type ZoneSlug } from './FieldLayout.js';

/** One size of a work image (built by astro:assets). */
export interface ManifestImage {
  url: string;
  width: number;
  height: number;
}

/** A work as the world needs it, in the page language. */
export interface ManifestWork {
  slug: string;
  territory: string;
  zone: ZoneSlug | null;
  /** Display title (French original, + English subtitle on the EN site). */
  title: string;
  /** Poetic fragment, when written. */
  fragment: string | null;
  /** Localized curatorial specifications (`size · year · medium · techniques`). */
  metaLine: string;
  /** Localized non-commercial availability status (strictly non-commercial). */
  availabilityLabel: string;
  /** Localized exhibition context (`Territory · Zone` or `Territory`). */
  contextLabel: string;
  /** 1-based ordinal stop position along the Drift exhibition path (`1..positionTotal`). */
  positionIndex: number;
  /** Total works along the Drift exhibition path (`>= 1`). */
  positionTotal: number;
  /** Awake work page. */
  href: string;
  /** Contact page about this work, when it can be asked about. */
  contactHref: string | null;
  /** Dominant colour (first palette entry). */
  color: string;
  /** Palette of the first image (CSS hex, dominant first; may be empty), for the lens gels. */
  palette: string[];
  /** Technique keys named in the work's texts (`mirror`, `filter`, `icm`, `multiple-exposure`), for the default lens. */
  techniques: string[];
  /** Museum-tag label of a Leak-zone specimen (`specimen 03 · Venise · 2025`), or `null`. */
  specimen: string | null;
  /** QR code of the work page (site-relative SVG), shown in exhibition mode. */
  qr: string;
  /** Low (~480 px), mid (~1200 px) and high (≤ 2400 px) images. */
  images: { low: ManifestImage; mid: ManifestImage; high: ManifestImage };
}

/** A territory or zone name in the page language. */
export interface ManifestName {
  slug: string;
  title: string;
}

/** A territory in the page language, with its statement split into sentences (fragments, FR3). */
export interface ManifestTerritory extends ManifestName {
  sentences: string[];
}

/** A zone in the page language, with its opening statement sentence for crossing banners (FR4). */
export interface ManifestZone extends ManifestName {
  excerpt: string | null;
}

/** Everything the world reads from the page (`<script type="application/json" id="drift-manifest">`). */
export interface WorldManifest {
  lang: 'en' | 'fr';
  /** Territories in layout order (the first holds the start). */
  territories: ManifestTerritory[];
  zones: ManifestZone[];
  works: ManifestWork[];
}

type Json = Record<string, unknown>;

/**
 * Validates the world manifest embedded in the home page. The page builds
 * it at build time, so a failure here means the build and the world are out
 * of sync; it is reported, never silently patched.
 *
 * @param input - Parsed JSON.
 * @returns The manifest, typed.
 * @throws Error naming the first invalid field.
 */
export function parseManifest(input: unknown): WorldManifest {
  const m = object(input, 'manifest');
  if (m.lang !== 'en' && m.lang !== 'fr') throw new Error('[manifest] lang must be "en" or "fr"');
  const territories = array(m.territories, 'territories').map((t, i) => territory(t, `territories[${i}]`));
  const zones = array(m.zones, 'zones').map((z, i) => zone(z, `zones[${i}]`));
  const known = new Set(territories.map((t) => t.slug));
  const works = array(m.works, 'works').map((w, i) => work(w, `works[${i}]`, known));
  return { lang: m.lang, territories, zones, works };
}

function work(input: unknown, path: string, territories: ReadonlySet<string>): ManifestWork {
  const w = object(input, path);
  const territory = text(w.territory, `${path}.territory`);
  if (!territories.has(territory)) throw new Error(`[manifest] ${path}.territory "${territory}" is not in territories`);
  if (w.zone !== null && !ZONE_ORDER.includes(w.zone as ZoneSlug)) throw new Error(`[manifest] ${path}.zone must be one of ${ZONE_ORDER.join(', ')} or null`);
  const positionTotal = positiveInt(w.positionTotal, `${path}.positionTotal`);
  const positionIndex = positiveInt(w.positionIndex, `${path}.positionIndex`);
  if (positionIndex > positionTotal) {
    throw new Error(`[manifest] ${path}.positionIndex (${positionIndex}) must not exceed positionTotal (${positionTotal})`);
  }
  const color = hex(w.color, `${path}.color`);
  const images = object(w.images, `${path}.images`);
  return {
    slug: text(w.slug, `${path}.slug`),
    territory,
    zone: w.zone as ZoneSlug | null,
    title: text(w.title, `${path}.title`),
    fragment: w.fragment === null ? null : text(w.fragment, `${path}.fragment`),
    metaLine: text(w.metaLine, `${path}.metaLine`),
    availabilityLabel: text(w.availabilityLabel, `${path}.availabilityLabel`),
    contextLabel: text(w.contextLabel, `${path}.contextLabel`),
    positionIndex,
    positionTotal,
    href: link(w.href, `${path}.href`),
    contactHref: w.contactHref === null ? null : link(w.contactHref, `${path}.contactHref`),
    color,
    palette: array(w.palette, `${path}.palette`).map((c, i) => hex(c, `${path}.palette[${i}]`)),
    techniques: array(w.techniques, `${path}.techniques`).map((t, i) => text(t, `${path}.techniques[${i}]`)),
    specimen: w.specimen === null ? null : text(w.specimen, `${path}.specimen`),
    qr: link(w.qr, `${path}.qr`),
    images: {
      low: picture(images.low, `${path}.images.low`),
      mid: picture(images.mid, `${path}.images.mid`),
      high: picture(images.high, `${path}.images.high`),
    },
  };
}

function picture(input: unknown, path: string): ManifestImage {
  const p = object(input, path);
  const ok = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0;
  if (!ok(p.width) || !ok(p.height)) throw new Error(`[manifest] ${path} needs a positive width and height`);
  return { url: link(p.url, `${path}.url`), width: p.width as number, height: p.height as number };
}

function territory(input: unknown, path: string): ManifestTerritory {
  const t = object(input, path);
  return { ...name(t, path), sentences: array(t.sentences, `${path}.sentences`).map((s, i) => text(s, `${path}.sentences[${i}]`)) };
}

function zone(input: unknown, path: string): ManifestZone {
  const z = object(input, path);
  const excerpt = z.excerpt === undefined || z.excerpt === null ? null : text(z.excerpt, `${path}.excerpt`);
  return { ...name(z, path), excerpt };
}

function name(input: unknown, path: string): ManifestName {
  const n = object(input, path);
  return { slug: text(n.slug, `${path}.slug`), title: text(n.title, `${path}.title`) };
}

function link(input: unknown, path: string): string {
  const value = text(input, path);
  if (!value.startsWith('/') || value.startsWith('//')) throw new Error(`[manifest] ${path} must be a site-relative path`);
  return value;
}

function hex(input: unknown, path: string): string {
  if (typeof input !== 'string' || !/^#[0-9a-f]{6}$/i.test(input)) throw new Error(`[manifest] ${path} must be #rrggbb`);
  return input;
}

function positiveInt(input: unknown, path: string): number {
  if (typeof input !== 'number' || !Number.isInteger(input) || input < 1) {
    throw new Error(`[manifest] ${path} must be a positive integer`);
  }
  return input;
}

function text(input: unknown, path: string): string {
  if (typeof input !== 'string' || input.length === 0) throw new Error(`[manifest] ${path} must be a non-empty string`);
  return input;
}

function array(input: unknown, path: string): unknown[] {
  if (!Array.isArray(input)) throw new Error(`[manifest] ${path} must be an array`);
  return input;
}

function object(input: unknown, path: string): Json {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new Error(`[manifest] ${path} must be an object`);
  return input as Json;
}
